---
title: go动态配置apollo
date: 2020-07-01
categories:
 - go
tags:
 - go
sidebar: auto
---
---
## 配置文件 app.properties
```json
   {
    "appId": "smart-hr",
    "cluster": "dev",
    "namespaceName": "application",
    "ip": "http://127.0.0.1:18080",
    "backupConfigPath":"",
    "secret":"49a856b4f45446fdbe20355e592e8439"
}

```
## 代码demo
```go
package main

import (
	"fmt"
	"log"
	"strings"

	"github.com/apolloconfig/agollo/v4"

	apollolog "github.com/apolloconfig/agollo/v4/component/log"
	"github.com/apolloconfig/agollo/v4/env"
	"github.com/apolloconfig/agollo/v4/env/config"
	"github.com/apolloconfig/agollo/v4/storage"
)

type ChangeListener struct {
}

func main() {
	//读取环境中apollo配置
	appcfg := env.InitFileConfig()
	if appcfg == nil {
		return
	}
	//初始化apollo中日志
	agollo.SetLogger(&apollolog.DefaultLogger{})

	//根据apollo配置，得到apollo client
	client, _ := agollo.StartWithConfig(func() (*config.AppConfig, error) {
		return appcfg, nil
	})

	//设置监听对象
	c := &ChangeListener{}

	//添加监听
	client.AddChangeListener(c)
	log.Println("init  success")

	//初次读取配置
	FromApoloSet(client, appcfg)
	select {}
}

func FromApoloSet(client agollo.Client, c *config.AppConfig) {
	namespaces := strings.Split(c.NamespaceName, ",")
	for _, namespace := range namespaces {
		cache := client.GetConfigCache(namespace)

		//日志设置
		level, _ := cache.Get("log.level")
		fmt.Println(level)

		path, _ := cache.Get("log.path")
		fmt.Println(path)

		//设置kafka
		addrs, _ := cache.Get("kafka.addrs")
		fmt.Println(addrs)

		topic, _ := cache.Get("kafka.topic")
		fmt.Println(topic)

		num, _ := cache.Get("kafka.producernum")
		fmt.Println(num)
	}
}

func (c *ChangeListener) OnChange(changeEvent *storage.ChangeEvent) {

}

func (c *ChangeListener) OnNewestChange(event *storage.FullChangeEvent) {
	//write your code here
	appcfg := env.InitFileConfig()
	if appcfg == nil {
		return
	}
	namespaces := strings.Split(appcfg.NamespaceName, ",")
	namespacemap := make(map[string]bool)
	for _, namespace := range namespaces {
		namespacemap[namespace] = true
	}
	//检查想监听的配置
	if _, ok := namespacemap[event.Namespace]; ok {
		newlogleve, ok := event.Changes["log.level"]
		if ok {
			newloglevel, _ := newlogleve.(string)
			fmt.Println(newloglevel)
		}
	}
	if _, ok := namespacemap[event.Namespace]; ok {
		newlogleve, ok := event.Changes["kafka.topic"]
		if ok {
			newloglevel, _ := newlogleve.(string)
			fmt.Println(newloglevel)
		}
	}
}

```