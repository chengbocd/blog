---
title: php一些帮组函数
date: 2018-07-23
categories:
 - php
tags:
 - php
sidebar: 'auto'
---
---
### 代码如下
```php
/**
 * 匹配手机号码
 */
function phoneMatching($phone)
{
    if (preg_match("/^1\d{10}$/", $phone)) {
        return true;
    }
    return false;
}
/**
 * 获取用户真实 ip
 * @return array|false|mixed|string
 */
function getClientIp()
{
    if (getenv('HTTP_CLIENT_IP')) {
        $ip = getenv('HTTP_CLIENT_IP');
    }
    if (getenv('HTTP_X_REAL_IP')) {
        $ip = getenv('HTTP_X_REAL_IP');
    } elseif (getenv('HTTP_X_FORWARDED_FOR')) {
        $ip = getenv('HTTP_X_FORWARDED_FOR');
        $ips = explode(',', $ip);
        $ip = $ips[0];
    } elseif (getenv('REMOTE_ADDR')) {
        $ip = getenv('REMOTE_ADDR');
    } else {
        $ip = '0.0.0.0';
    }
    return $ip;
}
//生成验证码
function code()
{
    $str = '0123456789';
    return substr(str_shuffle($str), 0, 6);
}

```