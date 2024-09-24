---
title: go提取图片中的中文
date: 2020-07-01
categories:
 - go
tags:
 - go
sidebar: auto
---
---
# 代码如下
```go
package main

import (
	"fmt"
	"image"
	"log"

	"github.com/disintegration/imaging"

	"github.com/otiai10/gosseract"
)

func main() {
	// 加载图片
	img, err := imaging.Open("image.png")
	if err != nil {
		log.Fatalf("failed to open image: %v", err)
	}

	// 对图片进行预处理，包括裁剪、去除干扰等操作，提高识别准确性
	img = imaging.Crop(img, image.Rect(0, 0, img.Bounds().Dx(), img.Bounds().Dy()*5/6))
	img = imaging.Grayscale(img)
	img = imaging.AdjustContrast(img, 50)
	img = imaging.Sharpen(img, 10)

	// 保存优化后的图片
	err = imaging.Save(img, "image_optimized.png")
	if err != nil {
		log.Fatalf("failed to save image: %v", err)
	}

	// 创建gosseract客户端
	client := gosseract.NewClient()
	defer client.Close()

	// 设置要识别的图片路径
	client.SetImage("image_optimized.png")

	// 使用多个OCR算法或模型进行识别，将多个结果进行整合，提高识别准确率
	var results []string

	// 尝试使用基于Tesseract的OCR模型进行识别
	client.SetLanguage("chi_sim")
	client.SetPageSegMode(7)
	text, err := client.Text()
	if err == nil && len(text) > 0 {
		results = append(results, text)
	}

	// 输出最终结果
	if len(results) == 0 {
		fmt.Println("OCR failed to recognize text")
	} else {
		fmt.Println(results[0])
	}
}

```