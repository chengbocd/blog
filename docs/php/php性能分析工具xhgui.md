---
title: php性能分析工具xhgui
date: 2022-05-22
categories:
 - php
tags:
 - php
sidebar: 'auto'
---
---
# php项目接入 xhgui性能分析

###  背景
        对于php项目优化不应该发现问题再去优化，可以再部署测试的时候就开始，xhgui能收集php运
    行时的数据。能收集php项目运行时的数据，多少条sql，sql占用时间，当前代码占用内存，函数等
    使用建议：项目测试完第一轮，可以去看看分析，对于api返回时间长，占用内存大的优化一波先。
    线上使用：将采集率调底些5%左右，收集执行时间在1s以上的数据等




### xhgui介绍

        Facebook 推出了一个被动分析器——XHProf。XHProf 是为了在生产环境中使用而打造的。它对
    性能的影响最小，同时收集足够的信息用于诊断性能问题。最初扩展是xhprof（Facebook），后来用
    HHVM抛弃了zend引擎，所以后期切了个分支，有人继续维护建议用tideways，这个4.7.1支持记录
    sql，其他过高的版本不支持sql收集。



### 图形web粗略的截图介绍
> 记录接口请求以及请求时间，到时候优先维护耗时长的，xhgui支持时间倒序搜索

![img.png](/xhgui/img.png)

> 先看sql记录 像这种前后端不分离的，一个列表就有 17条sql。 对于前后端分离的会少很多，看着优化

![img_1.png](/xhgui/img_1.png)

> 下图是代码运行耗时，到底消耗在哪里，比如这个光curl就5次，看看能不能将相关数据缓存redis啥的，减少curl

![img_2.png](/xhgui/img_2.png)

> 像这种耗时长的导出，有的人处理，喜欢各种foreach, 数据量大，就会占用很多内存减少foreach 可以用& 地址传递，这样占用内存少
       比如多个数据集，直接index获取值，别各种循环

![img_3.png](/xhgui/img_3.png)

> 火焰图 咋眼一看，估计是越高的地方越耗性能

![img_4.png](/xhgui/img_4.png)

### 搭建xhgui的web项目。修改下mongodb 链接开箱即用
>   项目地址 https://github.com/laynefyc/xhgui-branch
``` 
   也可以自己去下载自己搭建一个
   nginx配置：
   
   server {
    listen 80;

    root   /opt/www/xhgui/webroot;
    server_name xhgui.top;
    index index.php;


    location / {
        index index.php;
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \.php$ {
        try_files $uri =404;
        include fastcgi_params;
        fastcgi_pass    127.0.0.1:9000;
        fastcgi_index   index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
}
mongo加索引
$ mongo
> use xhprof
> db.results.ensureIndex( { 'meta.SERVER.REQUEST_TIME' : -1 } )
> db.results.ensureIndex( { 'profile.main().wt' : -1 } )
> db.results.ensureIndex( { 'profile.main().mu' : -1 } )
> db.results.ensureIndex( { 'profile.main().cpu' : -1 } )
> db.results.ensureIndex( { 'meta.url' : 1 } )
```
### 可以通过修改nginx文件,收集数据
> fastcgi_param PHP_VALUE “auto_prepend_file=/home/admin/xhgui-branch/external/header.php”;
     //代码的含义：在执行主程序前都运行我们指定的PHP脚本

### 相关扩展和配置
```
   sudo pecl install mongodb
   PHP 配置文件中添加
   extension=mongodb.so
   tideways建议4.1.7 能记录sql
   下载
   git clone https://github.com/tideways/php-xhprof-extension/tree/v4.1.7 
   cd /path/php-xhprof-extension
   phpize
   ./configure
   make
   sudo make install
   PHP 配置文件中添加、
   [tideways]
   extension=tideways.so
   ; 不需要自动加载，在程序中控制就行
   tideways.auto_prepend_library=0
   ; 频率设置为100，在程序调用时可以修改
   tideways.sample_rate=100
   记得重启php-fpm

   启动 mongodb 并设置 xhgui 索引
   use xhprof
   db.results.ensureIndex( { 'meta.SERVER.REQUEST_TIME' : -1 } )
   db.results.ensureIndex( { 'profile.main().wt' : -1 } )
   db.results.ensureIndex( { 'profile.main().mu' : -1 } )
   db.results.ensureIndex( { 'profile.main().cpu' : -1 } )
   db.results.ensureIndex( { 'meta.url' : 1 } )
```

### 集成在项目中
> 单个项目直接部署个服务省事，项目过多可以，集成在项目中，数据写入mongo然后本地启web界面分析优化代码   
#### 已laravel为例
> https://github.com/perftools/php-profiler 参考文章
```
   安装扩展：
   composer require guangzhonghedd01/xhgui-collector  //收集数据
   composer require alcaeus/mongo-php-adapter //链接mongodb 扩展
   1 .env 添加配置  
        XHGUI_MONGO_URI=127.0.0.1:27017
        XHGUI_MONGO_DB=xhprof
        XHGUI_PROFILING_RATIO=100
        XHGUI_EXECUTE_SECOND=0.5
        XHGUI_PROFILING=enabled
        XHGUI_FILTER_VAR="env"
        APP_NAME=cms
   2  config 下添加
        xhgui.php配置文件
   3  Middleware
        添加 Xhprof.php中间件 ImportXhgui.php重写的导入类 代码在后面
   4  可以放路由控制指定接口，这里直接全部使用 Kernel.php 中添加
         \App\Http\Middleware\Xhprof::class,//添加这一行
```
Xhprof.php
```php
<?php

namespace App\Http\Middleware;

use Closure;

class Xhprof
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request $request
     * @param  \Closure                 $next
     *
     * @return mixed
     */
    public function handle($request, Closure $next)
    {
        ImportXhgui::laravel();
        return $next($request);
    }
}
```
ImportXhgui.php
```php
<?php

namespace App\Http\Middleware;

use Closure;
use Guangzhong\Xhgui\Config;
use Guangzhong\Xhgui\Import;
use Guangzhong\Xhgui\Saver;
use Guangzhong\Xhgui\Util;

class ImportXhgui extends Import
{
    public function __construct()
    {
        if (!\extension_loaded('xhprof')
            && !\extension_loaded('uprofiler')
            && !\extension_loaded('tideways')
            && !\extension_loaded('tideways_xhprof')
        ) {
            error_log('xhgui - either extension xhprof, uprofiler, tideways or tideways_xhprof must be loaded');

            return;
        }
    }

    /**
     * laravel 接入
     */
    public static function laravel()
    {
        Config::load(config('xhgui'));
        if ((!\extension_loaded('mongo')
                && !\extension_loaded('mongodb'))
            && Config::read('save.handler') === 'mongodb') {
            error_log('xhgui - extension mongo not loaded');

            return;
        }

        if (!Config::shouldRun()) {
            return;
        }

        if (!isset($_SERVER['REQUEST_TIME_FLOAT'])) {
            $_SERVER['REQUEST_TIME_FLOAT'] = microtime(true);
        }
        $options = Config::read('profiler.options');

        if (\extension_loaded('uprofiler')) {
            uprofiler_enable(UPROFILER_FLAGS_CPU | UPROFILER_FLAGS_MEMORY, $options);
        } else if (\extension_loaded('tideways')) {
            tideways_enable(TIDEWAYS_FLAGS_CPU | TIDEWAYS_FLAGS_MEMORY);
            tideways_span_create('sql');
        } elseif (\extension_loaded('tideways_xhprof')) {
            tideways_xhprof_enable(TIDEWAYS_XHPROF_FLAGS_CPU | TIDEWAYS_XHPROF_FLAGS_MEMORY);
        } else {
            if (PHP_MAJOR_VERSION === 5 && PHP_MINOR_VERSION > 4) {
                xhprof_enable(XHPROF_FLAGS_CPU | XHPROF_FLAGS_MEMORY | XHPROF_FLAGS_NO_BUILTINS, $options);
            } else {
                xhprof_enable(XHPROF_FLAGS_CPU | XHPROF_FLAGS_MEMORY, $options);
            }
        }

        register_shutdown_function(
            function () {
                if (\extension_loaded('uprofiler')) {
                    $data['profile'] = uprofiler_disable();
                } else if (\extension_loaded('tideways_xhprof')) {
                    $data['profile'] = tideways_xhprof_disable();
                } else if (\extension_loaded('tideways')) {
                    $data['profile'] = tideways_disable();
                    $sqlData = tideways_get_spans();
                    $data['sql'] = array();
                    if (isset($sqlData[1])) {
                        foreach ($sqlData as $val) {
                            if (isset($val['n']) && $val['n'] === 'sql' && isset($val['a']) && isset($val['a']['sql'])) {
                                $_time_tmp = (isset($val['b'][0]) && isset($val['e'][0])) ? ($val['e'][0] - $val['b'][0]) : 0;
                                if (!empty($val['a']['sql'])) {
                                    $data['sql'][] = array(
                                        'time' => $_time_tmp,
                                        'sql' => $val['a']['sql']
                                    );
                                }
                            }
                        }
                    }
                } else {
                    $data['profile'] = xhprof_disable();
                }

                if (!empty($data['profile'])){
                    $profile = [];
                    foreach($data['profile'] as $key => $value) {
                        $profile[strtr($key, ['.' => '_'])] = $value;
                    }

                    $data['profile'] = $profile;
                }

                // ignore_user_abort(true) allows your PHP script to continue executing, even if the user has terminated their request.
                // Further Reading: http://blog.preinheimer.com/index.php?/archives/248-When-does-a-user-abort.html
                // flush() asks PHP to send any data remaining in the output buffers. This is normally done when the script completes, but
                // since we're delaying that a bit by dealing with the xhprof stuff, we'll do it now to avoid making the user wait.
                ignore_user_abort(true);
                flush();

                $uri = array_key_exists('REQUEST_URI', $_SERVER)
                    ? $_SERVER['REQUEST_URI']
                    : null;
                if (empty($uri) && isset($_SERVER['argv'])) {
                    $cmd = basename($_SERVER['argv'][0]);
                    $uri = $cmd . ' ' . implode(' ', array_slice($_SERVER['argv'], 1));
                }

                $time = array_key_exists('REQUEST_TIME', $_SERVER)
                    ? $_SERVER['REQUEST_TIME']
                    : time();

                // In some cases there is comma instead of dot
                $delimiter = (strpos($_SERVER['REQUEST_TIME_FLOAT'], ',') !== false) ? ',' : '.';
                $requestTimeFloat = explode($delimiter, $_SERVER['REQUEST_TIME_FLOAT']);
                if (!isset($requestTimeFloat[1])) {
                    $requestTimeFloat[1] = 0;
                }

                $requestTs = ['sec' => $time, 'usec' => 0];
                $requestTsMicro = ['sec' => $requestTimeFloat[0], 'usec' => $requestTimeFloat[1]];

                // 执行时间 转换成 有待测试
                $sec = round((microtime(true)-$_SERVER['REQUEST_TIME_FLOAT'])*1000,2)/1000;
                // $sec = $main = $data['profile']['main()']['wt']/1000;dd();
                $set_time = Config::read('profiler.second');
                if ($sec < $set_time) {
                    return;
                }
                // if (isset($requestTsMicro['usec'])) {
                //     //执行时间转换成秒
                //     $sec = $requestTsMicro['usec'] / 1000000;
                //     $set_time = Config::read('profiler.second');
                //     if ($sec < $set_time) {
                //         return;
                //     }
                // }

                //过滤敏感数据信息，比如密码之类的
                $filterVar = Config::read('filter_var');
                foreach ($filterVar as $v) {
                    if (isset($_SERVER[$v])) {
                        unset($_SERVER[$v]);
                    }
                }

                $data['meta'] = [
                    'url' => $uri,
                    'SERVER' => $_SERVER,
                    'get' => $_GET,
                    // 'env'              => '', //去掉env信息
                    'simple_url' => Util::simpleUrl($uri),
                    'request_ts' => $requestTs,
                    'request_ts_micro' => $requestTsMicro,
                    'request_date' => date('Y-m-d', $time),
                ];

                $data['project'] = Config::read('mode');

                try {
                    $config = Config::all();
                    $config += ['db.options' => []];

                    $saver = Saver::factory($config);
                    $saver->save($data);

                } catch (\Exception $e) {
                    error_log('xhgui - ' . $e->getMessage());
                }
            }
        );
    }
}

```