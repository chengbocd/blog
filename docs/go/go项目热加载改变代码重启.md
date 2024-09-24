---
title: go项目热加载改变代码重启air
date: 2020-07-01
categories:
 - go
tags:
 - go
sidebar: auto
---

> 避免反复的去编译代码，提高效率(对于一些php转过来的，可能刚开始比较烦这个每次修改要去编译也很友好)

## 下载包  
> With go 1.16 or higher:
```go
go install github.com/cosmtrek/air@latest
```
## 使用在项目目录下 air
![air](./assets/air.png)


## 文件变动后
![air2](./assets/air2.png)