---
title: go常见小题
date: 2020-07-01
categories:
 - go
tags:
 - go
sidebar: auto
---
---
# 判断2单链表是否相交
```go
/**
 * Definition for singly-linked list.
 * type ListNode struct {
 *     Val int
 *     Next *ListNode
 * }
 */
func getIntersectionNode(headA, headB *ListNode) *ListNode {
    p1 , p2 := headA, headB
    cnt := 0
    for p1 != nil && p2 != nil {
        if p1 == p2{
            return p1
        }
        p1 = p1.Next
        p2 = p2.Next
        if cnt < 2 && p1 == nil{
            p1 = headB
            cnt++
        }
        if cnt < 2 && p2 == nil{
            p2 = headA
            cnt++
        }
    }
    return nil
}
```
