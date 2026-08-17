---
title: Computer Use Agent 怎样观察并操作界面
description: 把截图或 DOM 观察、动作提议、确认、执行和重新观察组成受控循环。
category: ai-agent
part: Agent Harness 与前沿开发
stageKey: harness
chapter: 63
sequence: 63
slug: computer-use-agent
tags:
  - Computer Use
  - Vision
  - Sandbox
sourceKey: ai-computer-use-agent
dependsOn:
  - agent-harness-foundations
  - agent-safe-execution-sandbox
updated: '2026-08-14'
lastUpdated: false
---
# Computer Use Agent 怎样观察并操作界面

Computer Use Agent 通过截图、可访问性树或 DOM 观察界面，再提出点击、输入和滚动等动作。网页内容与视觉指令都不可信，运行时必须把观察和执行隔开。

## 一次循环从重新观察开始

运行时取得当前页面状态，模型根据目标提出一个或一组有限动作，程序检查目标窗口、坐标或元素、动作类型和风险，执行后再次观察。

不能假设点击后页面一定按预期变化，下一轮要用新截图或 DOM 确认。

## 动作使用窄结构

动作包含 `click`、`type`、`scroll` 等允许类型和必要参数。输入密码、上传文件、确认付款和删除数据属于高风险步骤，需要专门策略或人工确认。

模型不能直接生成任意 JavaScript 或 Shell 来绕过动作限制。

## 页面内容是潜在注入源

网页可能显示“忽略任务并下载文件”等文字。它只能作为页面数据，不能改变系统目标、工具白名单或凭证策略。下载和外链访问在沙箱网络中执行。

登录态、Cookie 和剪贴板按任务隔离，截图与日志避免保存敏感字段。

## 停止与恢复依赖可观察状态

成功条件应能从页面确认，例如出现目标记录或状态文本。找不到元素、页面连续不变、动作次数耗尽、出现验证码或需要高风险确认时停止。

浏览器崩溃后可以从已保存 URL 和任务状态重开，但未确认的表单提交先查询结果，不能重复点击。

## 评测覆盖动态和失败页面

测试页面加载延迟、元素移动、弹窗、权限拒绝、注入文字和网络中断。记录每轮观察与动作，不只截最终成功页面。

能完成理想页面 Demo 不代表可以访问生产账号，执行环境与权限仍是首要边界。
