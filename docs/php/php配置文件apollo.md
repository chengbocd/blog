---
title: php配置文件apollo
date: 2022-03-13
categories:
 - php
tags:
 - php
sidebar: 'auto'
---
## php配置文件apollo——协程配置中心

### 部署代码 laravel版本
```shell
#检测进程
ps -ef |grep "apollo:smart-hr" |grep -v grep  |grep -v "PID" | awk '{print $2}' | xargs kill -9
nohup php artisan apollo:smart-hr  >> storage/logs/apollo.log 2>&1 &

```

###  代码如下
```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class Apollo extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'apollo:smart-hr';


    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = '阿波罗配置同步';


    public $app_id;

    //链接
    public $server;

    //集群
    public $cluster;

    //密钥
    public $secret;

    //空间
    public $namespaces;

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $this->doSync(true);
        while (1) {
            $this->doSync();
            sleep(1);
        }
    }

    protected function sign($pathWithQuery, $secret, $time)
    {
        $data = join("\n", [$time, $pathWithQuery]);
        $sign = base64_encode(hash_hmac('sha1', $data, $secret, true));
        return $sign;
    }

    protected function doSync($full = false)
    {
        $this->app_id = Cache::get('apollo:main:APOLLO_APPID') ? Cache::get('apollo:main:APOLLO_APPID') : env('APOLLO_APPID');
        $this->server = Cache::get('apollo:main:APOLLO_CONFIG_SERVER') ? Cache::get('apollo:main:APOLLO_CONFIG_SERVER') : env('APOLLO_CONFIG_SERVER');
        $this->cluster = Cache::get('apollo:main:APOLLO_CLUSTER') ? Cache::get('apollo:main:APOLLO_CLUSTER') : env('APOLLO_CLUSTER');
        $this->secret = Cache::get('apollo:main:APOLLO_ACCESS_KEY_SECRET') ? Cache::get('apollo:main:APOLLO_ACCESS_KEY_SECRET') : env('APOLLO_ACCESS_KEY_SECRET');
        $this->namespaces = Cache::get('apollo:main:APOLLO_NAMESPACES') ? Cache::get('apollo:main:APOLLO_NAMESPACES') : env('APOLLO_NAMESPACES');
        $client = new \GuzzleHttp\Client();
        try {
            //获取毫秒级时间戳
            $time = (string)sprintf('%.0f', microtime('string') * 1000);
            $cfgs = [];
            $namespaces = explode(',', $this->namespaces);
            foreach ($namespaces as $namespace) {
                $pathWithQuery = '/configs/' . $this->app_id . '/' . $this->cluster . '/';
                $url = $this->server . $pathWithQuery;
                $label = $_SERVER['HOSTNAME'] ?? '';
                $releaseKey = Cache::get('apollo:' . $pathWithQuery . $namespace . $label);
                if (empty($releaseKey) || is_array($releaseKey)) $releaseKey = '';
                $full && $releaseKey = '';//用于全量拉取数据
                $url = $url . $namespace . '?releaseKey=' . $releaseKey;
                $query = $pathWithQuery . $namespace . '?releaseKey=' . $releaseKey;

                $sign = $this->sign($query, $this->secret, $time);
                $header = [
                    'Authorization' => 'Apollo ' . $this->app_id . ':' . $sign,
                    'Timestamp' => $time,
                    'Content-Type' => 'application/json',
                ];
                //请求参数
                $putData = [
                    'timeout' => 60,
                    'verify' => false,
                    'http_errors' => false,//可以获取到 401 404返回数据
                    'headers' => $header,//设置请求头为json
                ];
                $response = $client->request('GET', $url, $putData);
                $body = json_decode($response->getBody()->getContents(), true);
                if ($body) {
                    if ($response->getStatusCode() == 304) {
                        continue;
                    }
                    //上一次的 key如果没变就不会有返回结果
                    $releaseKey = $body['releaseKey'] ?? '';
                    (!is_array($releaseKey) && $releaseKey) && Cache::put('apollo:' . $pathWithQuery . $namespace . $label, $releaseKey);
                    $cfg = $body['configurations'] ?? [];
                    if (!$cfg) {
                        continue;
                    }
                    $cfgs = array_merge($cfgs, $cfg);
                }

            }

            if ($cfgs) {
                foreach ($_ENV as $key => $value) {
                    if (isset($cfgs[$key])) {
                        $cfgs[$key] = $cfgs[$key] ?? $_ENV[$key];
                    }
                }
                $items = [];
                foreach ($cfgs as $key => $value) {
                    data_set($items, $key, $value);
                }
                //修改.env文件
                $cfgs && $this->modify($cfgs);
            }

        } catch (\Exception $ex) {
            log::info('apollo请求异常:' . $ex->getMessage());


        }
    }

    public function modify($data)
    {
        $contentArray = collect(file(base_path('.env'), FILE_IGNORE_NEW_LINES));

        //所有keys
        $allKey = [];
        $contentArray->transform(function ($item) use (&$allKey) {
            $itemArr = explode('=', $item);
            $key = $itemArr[0] ?? '';
            $key && $allKey[] = $key;
            return $item;
        });

        //修改数据
        $contentArray->transform(function ($item) use ($data) {
            foreach ($data as $key => $value) {
                $itemArr = explode('=', $item);
                if ($itemArr[0] == $key) {
                    return $key . '=' . $this->format($value);
                }
            }
            return $item;
        });
        $allEnv = $contentArray->toArray();
        //新增数据
        foreach ($data as $dk => $dv) {
            //涉及apollo配置的修改
            if (!in_array($dk, $allKey)) array_push($allEnv, $dk . '=' . $dv);
        }
        //修改主要变量 如果这些变了 主进程读取不到最新变量  \Artisan::call('config:cache');这个 命令执行次数太多又会爆内存 故这样做
        isset($data['APOLLO_APPID']) && Cache::put('apollo:main:APOLLO_APPID', $data['APOLLO_APPID']);
        isset($data['APOLLO_CONFIG_SERVER']) && Cache::put('apollo:main:APOLLO_CONFIG_SERVER', $data['APOLLO_CONFIG_SERVER']);
        isset($data['APOLLO_CLUSTER']) && Cache::put('apollo:main:APOLLO_CLUSTER', $data['APOLLO_CLUSTER']);
        isset($data['APOLLO_ACCESS_KEY_SECRET']) && Cache::put('apollo:main:APOLLO_ACCESS_KEY_SECRET', $data['APOLLO_ACCESS_KEY_SECRET']);
        isset($data['APOLLO_NAMESPACES']) && Cache::put('apollo:main:APOLLO_NAMESPACES', $data['APOLLO_NAMESPACES']);

        //修改文件
        \File::put(base_path('.env'), implode(PHP_EOL, $allEnv));
        //刷新缓存不然不生效
        unset($contentArray);
        unset($allEnv);
        //unset只是标记 gc_collect_cycles();这个函数才是回收 因为php cli一直在运行
        \gc_collect_cycles();

//        //下面面代码防止 php cli爆内存
//        $pid = pcntl_fork();
//        if ($pid > 0) {
//
//        } elseif ($pid == 0) {
//            \Artisan::call('config:cache');
//            //修改主要变量 如果这些变了 主进程读取不到最新变量  \Artisan::call('config:cache');这个 命令执行次数太多又会爆内存 故这样做
//            Cache::put('apollo:main:APOLLO_APPID', env('APOLLO_APPID'));
//            Cache::put('apollo:main:APOLLO_CONFIG_SERVER', env('APOLLO_CONFIG_SERVER'));
//            Cache::put('apollo:main:APOLLO_CLUSTER', env('APOLLO_CLUSTER'));
//            Cache::put('apollo:main:APOLLO_ACCESS_KEY_SECRET', env('APOLLO_ACCESS_KEY_SECRET'));
//            Cache::put('apollo:main:APOLLO_NAMESPACES', env('APOLLO_NAMESPACES'));
////            子进程退出
//            exit();
//        }

    }

    private function format($value)
    {
        if (str_contains($value, ' ') || str_contains($value, '$')) {
            $value = "\"$value\"";
        }
        return $value;
    }

}


```