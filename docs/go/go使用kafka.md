---
title: go使用kafka
date: 2020-07-01
categories:
 - go
tags:
 - go
sidebar: auto
---
---
## 生产者
```go
package main

import (
	"fmt"

	"github.com/Shopify/sarama"
)

func main() {
	config := sarama.NewConfig()
	config.Producer.RequiredAcks = sarama.WaitForAll          // 发送完数据需要leader和follow都确认
	config.Producer.Partitioner = sarama.NewRandomPartitioner // 新选出一个partition
	config.Producer.Return.Successes = true                   // 成功交付的消息将在success channel返回

	// 连接kafka
	client, err := sarama.NewSyncProducer([]string{"127.0.0.1:9092"}, config)
	if err != nil {
		fmt.Println("producer closed, err:", err)
		return
	}
	defer func(client sarama.SyncProducer) {
		err := client.Close()
		if err != nil {
			fmt.Println(err)
		}
	}(client)
	var s string
	// 发送消息
	for s != "exit" {
		//从控制台输入字符
		_, err := fmt.Scanln(&s)
		//fmt.Println(s)
		if err != nil {
			fmt.Println(err)
		}
		// 构造一个消息
		msg := &sarama.ProducerMessage{}
		msg.Topic = "web_log"
		msg.Value = sarama.StringEncoder(s)
		pid, offset, err := client.SendMessage(msg)
		if err != nil {
			fmt.Println("send msg failed, err:", err)
		}
		fmt.Printf("pid:%v offset:%v\n", pid, offset)
	}
}

```
##  普通的消费者
```go
package main

import (
	"fmt"
	"sync"

	"github.com/Shopify/sarama"
)

var (
	wg sync.WaitGroup
)

func main() {
	consumer, err := sarama.NewConsumer([]string{"localhost:9092"}, nil)
	if err != nil {
		panic(err)
	}
	partitionList, err := consumer.Partitions("web_log")
	if err != nil {
		panic(err)
	}
	for partition := range partitionList {
		pc, err := consumer.ConsumePartition("web_log", int32(partition), sarama.OffsetOldest)
		if err != nil {
			panic(err)
		}
		defer pc.AsyncClose()
		wg.Add(1)

		go func(sarama.PartitionConsumer) {
			defer wg.Done()
			for msg := range pc.Messages() {
				fmt.Printf("Partition:%d, Offset:%d, Key:%s, Value:%s\n", msg.Partition, msg.Offset, string(msg.Key), string(msg.Value))
			}
		}(pc)
		wg.Wait()
		consumer.Close()
	}

}

```

## 分组消费
```go
package main

import (
	"context"
	"os"
	"os/signal"
	"sync"
	"syscall"

	"github.com/Shopify/sarama"
	log "github.com/sirupsen/logrus"
)

type Kafka struct {
	brokers           []string
	topics            []string
	startOffset       int64
	version           string
	ready             chan bool
	group             string
	channelBufferSize int
	assignor          string
}

var brokers = []string{"127.0.0.1:9092"}
var topics = []string{"web_log"}
var group = "grp13"
var assignor = "range"
var startOffset = sarama.OffsetOldest //重头开始消费

func NewKafka() *Kafka {
	return &Kafka{
		brokers:           brokers,
		topics:            topics,
		group:             group,
		channelBufferSize: 1000,
		ready:             make(chan bool),
		version:           "2.8.0",
		assignor:          assignor,
	}
}

func (k *Kafka) Connect() func() {
	log.Infoln("kafka init...")

	version, err := sarama.ParseKafkaVersion(k.version)
	if err != nil {
		log.Fatalf("Error parsing Kafka version: %v", err)
	}

	config := sarama.NewConfig()
	config.Version = version
	// 分区分配策略
	switch assignor {
	case "sticky":
		config.Consumer.Group.Rebalance.Strategy = sarama.BalanceStrategySticky
	case "roundrobin":
		config.Consumer.Group.Rebalance.Strategy = sarama.BalanceStrategyRoundRobin
	case "range":
		config.Consumer.Group.Rebalance.Strategy = sarama.BalanceStrategyRange
	default:
		log.Panicf("Unrecognized consumer group partition assignor: %s", assignor)
	}
	config.Consumer.Offsets.Initial = startOffset
	config.ChannelBufferSize = k.channelBufferSize // channel长度

	// 创建client
	newClient, err := sarama.NewClient(brokers, config)
	if err != nil {
		log.Fatal(err)
	}
	// 获取所有的topic
	topics, err := newClient.Topics()
	if err != nil {
		log.Fatal(err)
	}
	log.Info("topics: ", topics)

	// 根据client创建consumerGroup
	client, err := sarama.NewConsumerGroupFromClient(k.group, newClient)
	if err != nil {
		log.Fatalf("Error creating consumer group client: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	wg := &sync.WaitGroup{}
	wg.Add(1)
	go func() {
		defer wg.Done()
		for {
			if err := client.Consume(ctx, k.topics, k); err != nil {
				// 当setup失败的时候，error会返回到这里
				log.Errorf("Error from consumer: %v", err)
				return
			}
			// check if context was cancelled, signaling that the consumer should stop
			if ctx.Err() != nil {
				log.Println(ctx.Err())
				return
			}
			k.ready = make(chan bool)
		}
	}()
	<-k.ready
	log.Infoln("Sarama consumer up and running!...")
	// 保证在系统退出时，通道里面的消息被消费
	return func() {
		log.Info("kafka close")
		cancel()
		wg.Wait()
		if err = client.Close(); err != nil {
			log.Errorf("Error closing client: %v", err)
		}
	}
}

// Setup is run at the beginning of a new session, before ConsumeClaim
func (k *Kafka) Setup(session sarama.ConsumerGroupSession) error {
	log.Info("监听开始")
	session.ResetOffset("t2p4", 0, 0, "")
	log.Info(session.Claims())
	// Mark the consumer as ready
	close(k.ready)
	return nil
}

// Cleanup is run at the end of a session, once all ConsumeClaim goroutines have exited
func (k *Kafka) Cleanup(sarama.ConsumerGroupSession) error {
	log.Info("退出")
	return nil
}

// ConsumeClaim must start a consumer loop of ConsumerGroupClaim's Messages().
func (k *Kafka) ConsumeClaim(session sarama.ConsumerGroupSession, claim sarama.ConsumerGroupClaim) error {

	// NOTE:
	// Do not move the code below to a goroutine.
	// The `ConsumeClaim` itself is called within a goroutine, see:
	// <https://github.com/Shopify/sarama/blob/master/consumer_group.go#L27-L29>
	// 具体消费消息
	for message := range claim.Messages() {
		log.Infof("监听到[topic:%s] [partiton:%d] [offset:%d] [value:%s] [time:%v]",
			message.Topic, message.Partition, message.Offset, string(message.Value), message.Timestamp)
		// 更新位移 提交
		//fmt.Println()
		//session.MarkMessage(message, "")
	}
	return nil
}

func main() {
	k := NewKafka()
	c := k.Connect()

	sigterm := make(chan os.Signal, 1)
	signal.Notify(sigterm, syscall.SIGINT, syscall.SIGTERM)
	select {
	case <-sigterm:
		log.Warnln("terminating: via signal")
	}
	c()
}

```