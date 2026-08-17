---
title: 什么是 Agent 循环
description: 不用框架实现一次有限循环，观察模型决策、工具执行、状态更新、终止和异常传播。
category: ai-agent
part: 模型与 Agent 基础
stageKey: foundations
chapter: 6
sequence: 6
slug: python-agent-loop-from-scratch
tags:
  - Agent Loop
  - Python
  - Tool Calling
sourceKey: ai-python-agent-loop-from-scratch
dependsOn:
  - agent-essence-autonomy-boundaries
  - structured-output-model-boundaries
updated: '2026-08-14'
lastUpdated: false
---
# 什么是 Agent 循环

Agent 循环把一次模型输出变成多步任务：模型先提出工具调用，程序执行后返回观察，模型再决定回答或继续。循环的难点不在 `while`，而在每一步由谁负责、状态怎样保存、什么时候必须停。

## Agent 循环的定义与作用

循环每次读取相同类型的状态，并产生两类结果：`ToolCall` 或 `FinalAnswer`。联合类型让运行时必须显式处理两条路径，避免用一段模糊字符串同时表示动作和答案。

模型只看到工具名和参数 Schema。程序收到候选后检查工具是否注册、参数是否有效、当前用户能否调用，再执行工具。工具输出作为观察进入下一轮，不直接成为系统指令。

## 从用户输入到最终回答的执行链路

以“远程访问需要什么权限”为例，一次正常轨迹可以写成：

```text
step 0  question = 远程访问需要什么权限？
step 1  decision = search_notes(query=问题, limit=2)
step 1  observation = 找到 2 条已授权记录
step 2  decision = final_answer(根据检索结果...)
terminal status = completed
```

状态里的 `steps` 在每次模型决策后增加。`observations` 只追加已经执行过的结果。最终回答到达后，运行时设置终态并返回，不能再执行工具。

## 执行链路的 Python 实现

下面的示例没有框架依赖。`ScriptedModel` 按固定脚本返回动作，只用于测试运行时；它不是 LLM，也不能证明真实模型会选择同样步骤。

<<< ../../examples/ai-agent/agent_loop.py

`run_agent` 持有状态和工具注册表。模型拿到观察副本，不能直接修改运行时状态。未知工具立即失败，工具超时和参数错误被转换为观察，让模型有一次生成安全答复的机会。

运行测试：

```bash
yarn ai-agent:examples
```

测试断言循环经过两次决策后完成，并且最终答案包含工具返回。这个结果证明示例控制流可运行，没有证明模型回答质量。

## 循环终止与异常处理

正常终止是 `FinalAnswer`。异常路径至少要区分未知工具、参数错误、工具超时、步数耗尽和外部取消。未知工具通常是模型候选不符合当前能力，继续重试没有意义；临时超时可以在预算内重试，或者给出无法核对的答复。

步数上限应在循环条件里执行，而不是写进 Prompt 请求模型自觉遵守。Deadline 也要在每次模型和工具调用前检查，并把剩余时间传给下游。用户取消后，新的工具调用不再开始；已经产生副作用的动作要依靠幂等与补偿处理。

工具结果也可能不可信。网页内容中出现“忽略之前规则”时，它仍然只是数据。装配下一轮上下文前要标记来源和信任级别，不能与开发者指令拼成同一段。

## 状态复杂化后的框架选择

普通函数适合动作少、状态小、单进程即可完成的循环。出现条件分支、并行检索、人工暂停和持久化恢复后，状态图能让节点、边和终态更清楚。任务跨越数小时、需要可靠定时和外部 Signal 时，再评估工作流引擎。

框架不会替应用决定权限、幂等和证据边界。迁移前先把当前循环的状态类型、动作契约和停止条件写清，框架只负责调度这些已经明确的职责。
