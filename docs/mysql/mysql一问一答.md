---
title: mysql一问一答
date: 2019-03-15
categories:
 - mysql
tags:
 - mysql
sidebar: 'auto'
---
---
## MySQL的binlog有有几种录入格式？分别有什么区别？
> 有三种格式，statement，row和mixed。
> 
> *此外，新版的MySQL中对row级别也做了一些优化，当表结构发生变化的时候，会记录语句而不是逐行记录。
1. Statement（语句复制）：每一条会修改数据的 SQL 都会记录在 binlog 中。
2. Row（行复制）：不记录 SQL 语句上下文信息，仅保存哪条记录被修改。
3. Mixed（混合复制）：Statement 和 Row 的混合体。
## MyISAM索引与InnoDB索引的区别？
* InnoDB索引是聚簇索引，MyISAM索引是非聚簇索引。
* InnoDB的主键索引的叶子节点存储着行数据，因此主键索引非常高效。
* MyISAM索引的叶子节点存储的是行数据地址，需要再寻址一次才能得到数据。
* InnoDB非主键索引的叶子节点存储的是主键和其他带索引的列数据，因此查询时做到覆盖索引会非常高效。
## InnoDB引擎的4大特性
* 插入缓冲（insert buffer)
* 二次写(double write)
* 自适应哈希索引(ahi)
## 什么是索引？
* 索引是一种特殊的文件(InnoDB数据表上的索引是表空间的一个组成部分)，它们包含着对数据表里所有记录的引用指针。
* 索引是一种数据结构。数据库索引，是数据库管理系统中一个排序的数据结构，以协助快速查询、更新数据库表中数据。索引的实现通常使用B树及其变种B+树。
* 更通俗的说，索引就相当于目录。为了方便查找书中的内容，通过对内容建立索引形成目录。索引是一个文件，它是要占据物理空间的。
## B树与B+树的区别
* B树的中间节点保存节点和数据，B+树的中间节点不保存数据，数据保存在叶子节点中；所以磁盘页能容纳更多的节点元素，更“矮胖”；
* B树的查找要只要匹配到元素，就不用管在什么位置，B+树查找必须匹配到叶子节点，所以B+树查找更稳定；
* 对于范围查找到说，B树要从头到尾查找，而B+树只需要在一定的范围内的叶子节点中查找就可以；
* B+树的叶子节点通过指针连接，从左到右顺序排列；
* B+树的非叶子节点与叶子节点冗余；
## 四个隔离级别：
* READ-UNCOMMITTED(读取未提交)： 最低的隔离级别，允许读取尚未提交的数据变更，可能会导致脏读、幻读或不可重复读。
* READ-COMMITTED(读取已提交)： 允许读取并发事务已经提交的数据，可以阻止脏读，但是幻读或不可重复读仍有可能发生。
* REPEATABLE-READ(可重复读)： 对同一字段的多次读取结果都是一致的，除非数据是被本身事务自己所修改，可以阻止脏读和不可重复读，但幻读仍有可能发生。
* SERIALIZABLE(可串行化)： 最高的隔离级别，完全服从ACID的隔离级别。所有的事务依次逐个执行，这样事务之间就完全不可能产生干扰，也就是说，该级别可以防止脏读、不可重复读以及幻读。
## SQL的生命周期？
1. 应用服务器与数据库服务器建立一个连接
2. 数据库进程拿到请求sql
3. 解析并生成执行计划，执行
4. 读取数据到内存并进行逻辑处理
5. 通过步骤一的连接，发送结果到客户端
6. 关掉连接，释放资源
## mvcc
MVCC就是由于事务的并发与隔离级别的存在，导致脏读，不可重复度，幻读等问题的一种解决策略，通俗点讲，就是在操作一条数据时，mysql会在日志文件中生成一条对应的版本记录（即使事务未提交，也会生成记录）。该条记录除了含有当前的最新数据外，还会有trx_id与db_roll_ptr，前者用来记录当前操作该数据的事务id,后者用来指向前一条记录（旧数据）。当对同一数据有多次修改时，这些日志记录就会形成一条版本链、而隔离级别的实现原理就是根据条件读取某个对应的版本。
## 主从同步流程（异步同步）
* 主库把数据变更写入binlog文件
* 从库I/O线程发起dump请求
* 主库I/O线程推送binlog至从库
* 从库I/O线程写入本地的relay log文件（与binlog格式一样）
* 从库SQL线程读取relay log并重新串行执行一遍，得到与主库相同的数据
## 发生死锁的原因以及如何解决
1）不同的应用访问同一组表时，应尽量约定以相同的顺序访问各组表。对一个表而言，应尽量以固定的顺序存取表中的信息。这点真的很重要,它可以明显的减少死锁的发生。

> 举例：好比有a,b两张表，如果事务1先a后b,事务2先b后a,那就可能存在相互等待产生死锁。那如果事务1和事务2都先a后b，那事务1先拿到a的锁，事务2再去拿a的锁，如果
  锁冲突那就会等待事务1释放锁，那自然事务2就不会拿到b的锁，那就不会堵塞事务1拿到b的锁，这样就避免死锁了。

2）在主键等值更新的时候，尽量先查询看数据库中有没有满足条件的数据，如果不存在就不用更新，存在才更新。为什么要这么做呢，因为如果去更新一条数据库不存在的数据，

一样会产生间隙锁。

> 举例：如果表中只有id=1和id=5的数据，那么如果你更新id=3的sql，因为这条记录表中不存在，那就会产生一个(1,5)的间隙锁，但其实这个锁就是多余的，因为你去更新一个
  数据都不存在的数据没有任何意义。

3）尽量使用主键更新数据,因为主键是唯一索引，在等值查询能查到数据的情况下只会产生行锁，不会产生间隙锁，这样产生死锁的概率就减少了。当然如果是范围查询，

一样会产生间隙锁。

4）避免长事务，小事务发送锁冲突的几率也小。这点应该很好理解。

5）在允许幻读和不可重复度的情况下，尽量使用RC的隔离级别，避免gap lock造成的死锁，因为产生死锁经常都跟间隙锁有关，间隙锁的存在本身也是在RR隔离级别来

解决幻读的一种措施。