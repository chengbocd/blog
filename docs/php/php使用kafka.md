---
title: php使用kafka
date: 2019-07-10
categories:
 - php
tags:
 - php
sidebar: 'auto'
---
--- 
## 生产者
```php
<?php
use Rdkafka\Conf;
use Rdkafka\Producer;
use Rdkafka\TopicConf;
//配置
$conf = new Conf();
$conf->set('bootstrap.servers', '127.0.0.1:9092');//才不会报错误No bootstrap.servers configured: client will not be able to connect to Kafka cluster
$message = rand(1,10);
//生成者
$rk = new Producer($conf);
$rk->addBrokers('127.0.0.1:9092');

$cf = new TopicConf();
// -1必须等所有brokers同步完成的确认 1当前服务器确认 0不确认，这里如果是0回调里的offset无返回，如果是1和-1会返回offset
// 我们可以利用该机制做消息生产的确认，不过还不是100%，因为有可能会中途kafka服务器挂掉
$cf->set('request.required.acks', 1);//1 消息发送成功会返回 offset
$cf->set('message.timeout.ms', 5 * 1000);//设置消息发送超时时间 5s 设置 message.timeout 避免 produce 阻

//创建主题实例
$topic = $rk->newTopic('web_log', $cf);

//发送消息
$message = is_array($message) ? json_encode($message, JSON_UNESCAPED_UNICODE) : $message;
$topic->produce(RD_KAFKA_PARTITION_UA, 0, $message);
// 阻塞时间(毫秒)， 0为非阻塞
$rk->poll(0);

// 推送消息，如果不调用此函数，消息不会被发送且会丢失
$result = $rk->flush(5000);
//            dump(RD_KAFKA_RESP_ERR_NO_ERROR,$result);
if (RD_KAFKA_RESP_ERR_NO_ERROR !== $result) {
    $re = [
        'push_ok' => 0,
        'push_log' => 'kafka推送消息失败',
    ];
} else {
    $re = [
        'push_ok' => 1,
        'push_log' => 'kafka推送消息成功',
    ];
}
var_dump($message);
var_dump($re);
```

## 消费者
```php
<?php
$conf = new \RdKafka\Conf();

// 绑定消费者组

$conf->set('group.id', 'test0007');

// 绑定服务节点，多个用,分隔

$conf->set('metadata.broker.list', '127.0.0.1:9092');

// 设置自动提交为false

$conf->set('enable.auto.commit', 'false');

// 设置当前消费者拉取数据时的偏移量， 可选参数：

// earliest: 如果消费者组是新创建的，从头开始消费，否则从消费者组当前消费位移开始。

// latest:如果消费者组是新创建的，从最新偏移量开始，否则从消费者组当前消费位移开始。

$conf->set('auto.offset.reset', 'earliest');


// 创建消费者实例

$consumer = new \RdKafka\KafkaConsumer($conf);

// 消费者订阅主题，数组形式

$consumer->subscribe(['web_log']);

while (true) {

    // 消费数据，阻塞5秒(5秒内有数据就消费，没有数据等待5秒进入下一轮循环) 500ms

    $message = $consumer->consume(500);

    switch ($message->err) {

        case RD_KAFKA_RESP_ERR_NO_ERROR:
            // 业务逻辑
            var_dump("offset:".$message->offset);
            var_dump("v:".$message->payload);
            // 提交位移
            $consumer->commit($message);
            break;

        case RD_KAFKA_RESP_ERR__PARTITION_EOF:
            echo "No more messages; will wait for more\n";
            break;
        case RD_KAFKA_RESP_ERR__TIMED_OUT:
            // echo "Timed out\n";
            break;
        default:
            throw new \Exception($message->errstr(), $message->err);
            break;
    }
}

// 关闭消费者(一般用在脚本中，不需要关闭)

$conumser->close();

```