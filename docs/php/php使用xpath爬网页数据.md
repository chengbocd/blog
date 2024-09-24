---
title: php使用xpath爬网页数据
date: 2021-07-10
categories:
 - php
tags:
 - php
sidebar: 'auto'
---
--- 
### 谷歌浏览器安装插件
> XPath Helper
> 
> 使用方法按住shift 就可以获取想要的数据，对于要做处理的可以使用代码再做相应处理

### demo
```php 
<?php

$html = file_get_contents('对应网址');
$dom = new DOMDocument();
// 从一个字符串加载HTML
@$dom->loadHTML($html);
// 使该HTML规范化
$dom->normalize();
// 用DOMXpath加载DOM，用于查询
$xpath = new DOMXPath($dom);
// 获取对应的xpath数据
$hrefs = $xpath->query("/html/body/div[@id='main']/div[@class='content autoheight first last']/table[@class='svcatable']/tbody/tr[*]/td[1]");
$mp4 = $xpath->query("/html/body/div[@id='main']/div[@class='content autoheight first last']/table[@class='svcatable']/tbody/tr[*]/td[6]/a[2]/@href");
$data = [];
for ($i = 0; $i < $hrefs->length; $i++) {
    $m = $mp4->item($i);
    $src = $m->nodeValue;
    if(strpos($src,'.mp4') !== false){
        $href = $hrefs->item($i);
        $name = $href->nodeValue;
        $src = explode('/', $src);
        $index = $src[2];
        $name = explode('-', $index)[0].'-'.$name.'.mp4';
        $data[$index]=$name;
    }
}
// print_r(count($data));
echo json_encode($data,512);
```