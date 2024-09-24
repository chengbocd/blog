---
title: go批量替换文件名
date: 2020-07-01
categories:
 - go
tags:
 - go
sidebar: auto
---
---
# 批量替换文件名
```go
package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"strings"
)

func main() {
	path := "D:\\mp4"
	listFiles(path)
}

func listFiles(dirname string) {
	fileInfos, err := ioutil.ReadDir(dirname)
	if err != nil {
		log.Fatal(err)
	}
	//处理map
	nameJson := `{
    "golan-study.mp4":"go语言学习.mp4",
}`
	map1 := make(map[string]string, 300)
	json.Unmarshal([]byte(nameJson), &map1)
	//fmt.Println(map1)
	for _, f := range fileInfos {
		filename := dirname + "\\" + f.Name() //记录当前文件夹下的文件名
		//如果文件名包含如下字段，则将其文件名更改
		//if strings.Contains(f.Name(), "(更多资源访问：www.xxx.cn)") {
		//	os.Rename(filename, dirname+"\\"+strings.Replace(f.Name(), "(更多资源访问：www.xxx.cn)", "", -1))
		//}
		rname, _ := map1[f.Name()]
		if rname != "" {
			err := os.Rename(filename, dirname+"\\"+strings.Replace(f.Name(), f.Name(), rname, -1))
			//break
			//fmt.Println(filename)
			//fmt.Println(f.Name())
			//fmt.Println(rname)
			if err != nil {
				fmt.Println(err)
			}

		}

		if f.IsDir() { //判断是否是文件夹 如果是文件夹则继续递归调用
			listFiles(filename)
		}
	}
}
func listFiles2(dirname string) {
	fileInfos, err := ioutil.ReadDir(dirname)
	if err != nil {
		log.Fatal(err)
	}
	for _, f := range fileInfos {
		filename := dirname + "\\" + f.Name() //记录当前文件夹下的文件名
		//如果文件名包含如下字段，则将其文件名更改
		if strings.Contains(f.Name(), "(更多资源访问：www.xxx.cn)") {
			os.Rename(filename, dirname+"\\"+strings.Replace(f.Name(), "(更多资源访问：www.xxx.cn)", "", -1))
		}
		fmt.Println(filename) //打印文件地址
		break
		if f.IsDir() { //判断是否是文件夹 如果是文件夹则继续递归调用
			listFiles(filename)
		}
	}
}

```
