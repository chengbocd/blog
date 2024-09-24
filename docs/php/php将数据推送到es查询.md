---
title: php将数据推送到es查询
date: 2021-07-01
categories:
 - php
tags:
 - php
sidebar: 'auto'
---
---
### 参考文章
> https://learnku.com/articles/25179
``` 使用的扩展
"laravel/scout": "^8.6.1",
"tamayo/laravel-scout-elastic": "^8.0.3",
composer require laravel/scout
composer require tamayo/laravel-scout-elastic
```       
### 索引mapping
```php
<?php

namespace App\Es;

use ScoutElastic\IndexConfigurator;
use ScoutElastic\Migratable;

class WorkOrderIndexConfigurator extends IndexConfigurator
{
    use Migratable;

    protected $name = 'php_work_order_index';

    // You can specify any settings you want, for example, analyzers.
    protected $settings = [
        'number_of_shards' => 1,//主分片数量
        'number_of_replicas' => 1,// 备份分片数量
        'max_result_window' => 1000000,
        'analysis' => [
            'analyzer' => [
                'ik_pinyin_analyzer' => [
                    "type" => "custom",
                    "tokenizer" => "ik_max_word",
                    "filter" => ['rfpinyin', 'pinyin_first_letter_and_full_pinyin_filter']
                ],
            ],
            'filter' => [
//                'acronym_pinyin_analyzer' => [
//                    'type' => 'pinyin',
//                    'keep_first_letter' => true,
//                    'keep_full_pinyin' => false,
//                    'keep_none_chinese' => false,
//                    'keep_none_chinese_in_first_letter' => true,
//                    'none_chinese_pinyin_tokenize' => false,
//                ],
                'rfpinyin' => [
                    'type' => "pinyin",
                    'keep_separate_first_letter' => true,
                    'keep_full_pinyin' => true,
                    'keep_original' => true,
                    'limit_first_letter_length' => 16,
                    'lowercase' => true,
                    'remove_duplicated_term' => false
                ],
                'pinyin_first_letter_and_full_pinyin_filter' => [
                    'type' => 'pinyin',
                    'keep_first_letter' => true,
                    'keep_full_pinyin' => false,
                    'keep_none_chinese' => true,
                    'keep_original' => false,
                    'limit_first_letter_length' => 16,
                    'lowercase' => true,
                    'trim_whitespace' => true,
                    'keep_none_chinese_in_first_letter' => true
                ]
            ],
        ]
    ];

    protected $defaultMapping = [
        'properties' => [
            'id' => [
                'type' => 'integer',
            ],
            'user_id' => [
                'type' => 'integer',//用户id
            ],
            'urgency' => [
                'type' => 'integer',//紧急程度
            ],
            'category_id' => [
                'type' => 'integer',//分类
            ],
            'engineer_id' => [
                'type' => 'integer',//责任工程师
            ],
            'follow_id' => [
                'type' => 'text',//关注管理员
            ],
            'follow_engineer_id' => [
                'type' => 'text',//关注工程师
            ],
            'status' => [
                'type' => 'integer',//工单状态:0=已提交,1=已分派,2=正在处理,3=待反馈,4=待评价,5=已结单
            ],
            'lasturgingtime' => [
                'type' => 'integer',//上次催办时间
            ],
            'updatetime' => [
                'type' => 'date',//修改时间
                'format' => 'yyyy-MM-dd HH:mm:ss||yyyy-MM-dd||epoch_millis'
            ],
            'createtime' => [
                'type' => 'date',//创建时间
                'format' => 'yyyy-MM-dd HH:mm:ss||yyyy-MM-dd||epoch_millis'
            ],
            'deletetime' => [
                'type' => 'date',//删除时间
                'format' => 'yyyy-MM-dd HH:mm:ss||yyyy-MM-dd||epoch_millis'
            ],
            'title' => [
                'type' => 'text',// 字段类型为全⽂文检索,如果需要关键字,则修改为keyword,注意keyword字段为整体查询,不不能作为模糊搜索
                "analyzer" => "ik_pinyin_analyzer",//使用自定义的分词
                'fields' => [
                    'ik_pinyin_analyzer' => [
                        'type' => 'text',
                        'analyzer' => 'ik_pinyin_analyzer',
                    ],
                ],
//                'fields' => [
//                    'cn' => [
//                        'type' => 'text',
//                        'analyzer' => 'ik_max_word',
//                    ],
//                    'fullPinyin' => [
//                        'type' => 'text',
//                        'analyzer' => 'full_pinyin_analyzer',
//                    ],
//                    'acronymPinyin' => [
//                        'type' => 'text',
//                        'analyzer' => 'acronym_pinyin_analyzer',
//                    ],
//                ],
            ],
            'describe' => [
                'type' => 'text',// 字段类型为全⽂文检索,如果需要关键字,则修改为keyword,注意keyword字段为整体查询,不不能作为模糊搜索
                "index" => true,
                "analyzer" => "ik_pinyin_analyzer",
                'fields' => [
                    'ik_pinyin_analyzer' => [
                        'type' => 'text',
                        'analyzer' => 'ik_pinyin_analyzer',
                    ],
                ],
//                'fields' => [
//                    'cn' => [
//                        'type' => 'text',
//                        'analyzer' => 'ik_max_word',
//                    ],
//                    'fullPinyin' => [
//                        'type' => 'text',
//                        'analyzer' => 'full_pinyin_analyzer',
//                    ],
//                    'acronymPinyin' => [
//                        'type' => 'text',
//                        'analyzer' => 'acronym_pinyin_analyzer',
//                    ],
//                ],
            ],
            'confidential' => [
                'type' => 'text',//机密信息
                'analyzer' => 'ik_max_word',
            ],
            'attachment' => [
                'type' => 'text',//附件
                'analyzer' => 'ik_max_word',
            ],
            'mobile' => [
                'type' => 'text',//手机
                'analyzer' => 'ik_max_word',
            ],
            'remind' => [
                'type' => 'integer',//接受提醒:0=不接受,1=手机短信,2=邮件
            ],
            'public' => [
                'type' => 'integer',//是否公开:0=否,1=是
            ],
            'bp_id' => [
                'type' => 'long',//企业组织id
            ],
            'msm_time' => [
                'type' => 'integer',//发送短信时间(秒) 0表示同步
            ],
            'is_send_msm' => [
                'type' => 'integer',//是否发送短信 0否 1是
            ],
            'latertime' => [
                'type' => 'date',//最迟完成时间
                'format' => 'yyyy-MM-dd HH:mm:ss||yyyy-MM-dd||epoch_millis'
            ],
        ],
    ];
}
```
### 查询service
```php
 //前提商户和 权限判断
        $bpId = $params['bpId'] ?? null;
        $userId = $params['userId'] ?? null;
        if (empty($bpId)) throw new \Exception('商户id必传');
        if (empty($userId)) throw new \Exception('用户id必传');

        $query = $params['param']['searchText'] ?? null;//搜索条件
        if (empty($query)) return [];

        //es的搜索
        $model = EsWorkOrder::search('*')
            // specify columns to select
            ->select(['*'])
            ->whereNotExists('deletetime')//没有删除的数据
            ->where('bp_id', $bpId)//搜索当前商户
            ->whereMatch('title', $query)//搜索标题
            ->whereMatch('describe', $query)//搜索内容
            ->orderBy('updatetime', 'desc');//态变更时间倒叙

        return $model->paginate($params['param']['pageSize'] ?? 20, $params['page_name'] ?? 'page', $params['param']['pageNum'] ?? null);
```