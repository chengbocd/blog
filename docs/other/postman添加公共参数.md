---
title: postman添加公共参数
date: 2022-11-04
categories:
 - 其他
tags:
 - 其他
sidebar: 'auto'
---
---
### postman添加公共参数,如header 和 域名等，提高效率

> 设置 eidt 选择Pre-request Script
![img.png](/other/postman.png)


> 代码如下,这里用的端口，也可以用.com .top等判断域名判断
```js
//只有在请求里没有token时才用全局的。   
//单个请求里 单个请求的token优先级别高
var token = pm.request.headers.get("token");
if(!token){
    pm.request.headers.add({
        key: 'token',
        value: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjbGllbnRJZCI6IlhldmVJSURyNWZmbmVtTHpYRUg3ZGtHYiIsInQiOiI2YzViNTJjYi02ZGFlLTQ4NzAtODQ4Yy1lNjI0YzE3M2IxY2UiLCJhcHBJZCI6IjE2MjMxMzc4Nzc5MDkiLCJlbmNyeXB0S2V5IjoiamlMUW5RVmZzUnRFVWEyS2hPbVFhZz09In0.Y02WDuBsUUUFsYAQAGzxlWnjwYSrzKcDG8Mqt3lDfUE-628e84b7c529b3e2248deef662f31d43"
    }
    );
}
//添加新 header
pm.request.headers.add({
    key: 'cookie',
    value: 'XDEBUG_SESSION=PHPSTORM'
}
);
var url = pm.request.url.toString();
var host = pm.request.url.host.toString();
var port = pm.request.url.port

if(!port){
  pm.request.url = "127.0.0.1:8087/"+url
}

// 添加或修改已存在 header
// pm.request.headers.upsert({
//     key: 'Connection',
//     value: 'close'
// });

// 移除 header
// pm.request.headers.remove('User-Agent')
```