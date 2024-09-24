---
title: redis的分布式锁
date: 2020-07-22
tags: 
 - Redis
categories:
 - Redis
---

### 分布式锁
```php
$rs = $redis->set($key, $value, array('nx', 'ex' => $ttl));
if ($rs) {
    //处理更新缓存逻辑
    // ......
    //删除锁
    $redis->del($key);
}
```
### 避免删除其他key,可以赋予值或者直接整不同的key
```php
$rs = $redis->set($key, $random, array('nx', 'ex' => $ttl));
if ($rs) {
    //处理更新缓存逻辑
    // ......
    //先判断随机数，是同一个则删除锁
    if ($redis->get($key) == $random) {
        $redis->del($key);
    }
}
```

