---
title: php多进程编程
date: 2021-09-13
categories:
 - php
tags:
 - php
sidebar: 'auto'
---
> 有些业务场景可能需要同时调用三方接口50次甚至更多
>
> 对于这样的业务可以异步编程，但是对于哪些密集型计算啥的同步耗时更短

## 安装扩展包 composer require spatie/async
> 先看效果 减少了47秒的响应时间，这样就能满足业务需求

![img.png](/php-async/99次并发调用.png)

![img.png](/php-async/99次循环调用.png)

> 运行过程中的php进程，是以php-cli命令行模式运行，处理完会自动回收

![img.png](/php-async/进程.png)

![img.png](/php-async/运行完的进程.png)

> 代码如下

```php
<?php
require './vendor/autoload.php';

use Spatie\Async\Pool;
use GuzzleHttp\Client;

$stime = microtime(true); //获取程序开始执行的时间
echo "初始: " . round(memory_get_usage() / 1024 / 1024, 2) . ' MB' . "\n";

// 业务逻辑
$d = []; //存储数据使用

//100次curl 请求
$pool = Pool::create();
$client = new Client();
foreach (range(1, 99) as $i) {
    $pool[] = async(function () use ($i, $client) {

        $response = $client->get('https://www.xxx.cn/api/getTemplateLogInfo', [
        ]);
        $output = $response->getBody()->getContents();
        $d[] = $output;
        return $output;
    })->then(function ($output) use (&$d) {
        $d[] = $output;
    });
}
await($pool);



//foreach (range(1, 99) as $i) {
//
//        $j = curlGet();
//
//        $d[] = $j;
//
//}


$etime = microtime(true);//获取程序执行结束的时间
$total = $etime - $stime;   //计算差值
echo "[页面执行时间：{$total} ]秒" . "\n";
echo "使用: " . round(memory_get_usage() / 1024 / 1024, 2) . ' MB' . "\n";// 获取运行时间 和 占用内存
var_dump($d);
function curlGet()
{
    $client = new Client();
    $response = $client->get('https://www.xxx.cn/api/getTemplateLogInfo', [
    ]);
    $content = $response->getBody()->getContents();
    return $content;
}

```
### 使用Guzzle并发请求

![img.png](/php-async/使用Guzzle并发请求.png)

> 代码如下
```php
<?php
require './vendor/autoload.php';

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use GuzzleHttp\Pool;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;

$srart_time = microtime(TRUE);
$client = new Client();

$requests = function ($total) {
    $uri = 'xxx.com/api/getCity';
    for ($i = 0; $i < $total; $i++) {
        yield new Request('GET', $uri);
    }
};

$d = [];
$pool = new Pool($client, $requests(100), [
    'concurrency' => 5,
    'fulfilled' => function (Response $response, $index) use (&$d) {
        // 这是每次成功的响应传递的
        $d[] = $response->getBody()->getContents();
    },
    'rejected' => function (RequestException $reason, $index) use (&$d) {
        // 这是每个失败的请求传递的
        $d[] = $reason->getMessage();
    },
]);

// 启动传输并创建一个promise
$promise = $pool->promise();

// 强制完成请求池。
$promise->wait();
$end_time = microtime(TRUE);
echo sprintf("use time:%.3f s", $end_time - $srart_time);
print_r($d);
```