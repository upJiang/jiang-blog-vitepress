---
title: Linux 服务运行：进程、资源、信号与证据化排障
description: 从模型服务无法启动出发，检查进程、线程、文件描述符、端口、权限、内存、磁盘和退出信号。
category: devops
part: 第一部分：认识 AI Infra 与运行底座
chapter: 2
tags:
  - Linux
  - Troubleshooting
prerequisites:
  - 会使用终端
outcomes:
  - 按层读取 Linux 运行证据
  - 区分资源不足、权限错误和进程退出
practice:
  type: diagnosis
  result: 完成一份 Linux 服务排障表
  verify:
    - 每个结论能对应命令字段
    - 不会用 kill -9 掩盖根因
evidence: official-guided-operation
updated: 2026-08-17T00:00:00.000Z
---
# Linux 服务运行：进程、资源、信号与证据化排障

你执行了启动命令，终端没有报错，健康检查却一直失败。重试几次后偶尔能起来，于是大家把问题归结为“机器不稳定”。真正有用的问题不是“进程在不在”，而是它已经走到生命周期的哪一步：`execve` 是否成功、配置能否读取、日志能否打开、端口能否绑定、监听队列是否建立，以及退出信号有没有被处理。



## 沿 execve 到 SIGTERM 逐步找证据

```mermaid
flowchart LR
  S0["装载"]
  S1["初始化"]
  S2["绑定"]
  S3["服务"]
  S4["退出"]
  S0 --> S1
  S1 --> S2
  S2 --> S3
  S3 --> S4
```

先看完整路径，再进入局部配置。这样即使组件名字变化，也能知道失败发生在交接之前还是之后。

### 装载：Linux 内核

`execve` 校验路径、格式和执行权限，装载解释器与动态库。

这里不靠猜测，优先读取 `journalctl`、退出码、`file`、`ldd`。

### 初始化：应用进程

读取环境变量和配置，打开模型、证书与日志文件。

决定下一步前需要看到 启动日志、`namei -l`、`strace -e openat`。

### 绑定：内核网络栈

把 socket 绑定到地址与端口，再创建监听队列。

这一动作的可观察结果是 `ss -ltnp`、`EADDRINUSE`、绑定地址。处理动作应晚于取证，否则重启或重试可能覆盖最早的失败现场。

### 服务：线程或事件循环

接受连接、读取请求并受 CPU、内存与 fd 上限约束。

可以从这些位置确认结果：`top`、`pidstat`、`/proc/<pid>/limits`。若完全没有证据，先判断请求是否到达本阶段；若记录冲突，则对齐 request_id、实例和时间窗口。

### 退出：进程与服务管理器

收到 SIGTERM 后停止接流量、等待在途请求并释放资源。

这里不靠猜测，优先读取 `systemctl stop`、终止日志、退出码。

## 一个命令怎样变成可接收请求的服务

这里先暂停操作，把容易混用的概念拆开。定义的价值在于划清责任，而不是增加名词数量。

| 概念 | 在这条链路中的含义 |
| --- | --- |
| 进程 | 内核正在管理的一次程序执行，拥有 PID、虚拟地址空间、文件描述符表和安全身份。二进制文件只是磁盘内容，不等于正在运行的进程。 |
| 文件描述符 | 进程引用文件、socket、pipe 等内核对象的整数句柄。日志、监听端口和客户端连接都会消耗它，并非只在读写普通文件时出现。 |
| socket | 内核中的通信端点。服务端先创建 socket，再 `bind` 本地地址和端口，最后 `listen` 才能接收连接。 |
| 信号 | 内核向进程传递异步事件的机制。SIGTERM 表示请求有序结束，SIGKILL 则直接终止，应用没有清理机会。 |

::: tip 判断原则
不要从产品名推断能力。把可观察输入、持久状态、失败终态和下游交接点写出来。
:::

## 进程退出码之外还要看启动阶段

| 表面现象 | 实际可能发生的事 | 下一步证据 |
| --- | --- | --- |
| Connection refused | 目标主机明确回绝，常见于没有监听或防火墙主动 reject | 先核对绑定地址、端口和 network namespace |
| Permission denied | 可能来自文件、父目录、只读挂载、SELinux/AppArmor 或特权端口 | 从执行 UID/GID 沿路径和安全策略逐层检查 |
| 服务被 OOM Kill | 内核在内存压力下杀死进程，不等于应用主动抛出 MemoryError | 看内核日志、cgroup memory.events 与峰值分配 |
| 只能 kill -9 才能停 | 应用可能没有处理 SIGTERM、子进程未转发信号或退出超时过短 | 先发送 TERM 并观察在途请求、子进程和终止日志 |

::: warning 先保留现场
如果先重启、扩容或删除对象，最早失败可能被覆盖。先确认对象身份、版本和时间线，再决定处理动作。
:::

## 端口冲突和权限错误怎样留下不同证据

以下命令适用于 Linux 主机。输入是服务 PID、监听端口和目标路径；输出不是“修复命令”，而是用来确认状态所有者。示例中的 PID 和路径需要替换。

```bash
systemctl status ai-api --no-pager
journalctl -u ai-api -b -n 80 --no-pager
ss -ltnp "sport = :8000"
namei -l /srv/ai/config/app.yaml
cat /proc/1234/limits | grep "open files"
cat /proc/1234/status | grep -E "VmRSS|Threads"
```

`ss` 若显示另一个健康实例占用 8000，问题是部署重复而非“端口坏了”；`namei -l` 会逐级显示目录搜索权限，能解释为什么文件本身可读但父目录不可进入；`limits` 与进程 fd 使用量要一起看，单看系统总上限无法证明该进程没有耗尽。命令因进程已退出而没有输出时，应回到服务日志和 coredump，而不是把空输出当成正常。

## 端口冲突发生在 bind，不是在浏览器访问时

服务启动时先创建 socket，再请求内核把它绑定到本地地址和端口。如果相同 network namespace 中已有不允许复用的 socket 占住同一组合，`bind` 返回 `EADDRINUSE`。这时应用通常还没有进入 `listen`，更不可能处理健康检查。`0.0.0.0:8000` 覆盖所有本机 IPv4 地址，因此会与绑定某个具体地址的实例产生冲突；IPv6 双栈行为还受系统设置影响。

~~~bash
ss -ltnp "sport = :8000"
ps -o pid,ppid,user,lstart,cmd -p 1234
systemctl status ai-api --no-pager
~~~

第一条找到 socket 所有者，第二条确认 PID 的用户、启动时间和命令，第三条把它与服务管理器登记关联起来。只有确认它是残留实例后才能结束；如果它是健康正式实例，正确动作可能是取消重复部署或改端口，而不是抢占。

## 权限判断要沿路径逐级进行

Linux 文件访问同时依赖进程的有效 UID/GID、文件 mode、ACL、父目录的 execute/search 权限、挂载只读标记和 LSM 策略。读取 `/srv/ai/config/app.yaml` 不只检查文件本身：进程必须能搜索 `/srv`、`/srv/ai` 和 `config` 每一级目录。日志写入又需要目标目录写权限；能够读配置不代表能够创建日志。

~~~bash
namei -l /srv/ai/config/app.yaml
id ai-service
getfacl -p /srv/ai/config/app.yaml
findmnt -T /srv/ai/config/app.yaml -o TARGET,SOURCE,FSTYPE,OPTIONS
sudo -u ai-service test -r /srv/ai/config/app.yaml
sudo -u ai-service test -w /srv/ai/logs
~~~

`namei -l` 展开每级目录，`findmnt` 能发现只读挂载，`sudo -u` 用真实服务身份验证能力。绑定低于 1024 的传统特权端口还涉及 capability；把整个进程改为 root 会同时获得远超绑定端口所需的权限。更好的做法通常是让入口代理监听特权端口，应用监听高端口，或只授予受控 capability。

## 文件描述符耗尽为何会伪装成网络异常

监听 socket、每条客户端连接、上游连接、日志文件和 pipe 都使用 fd。达到进程 `RLIMIT_NOFILE` 后，`accept`、`open` 或创建上游 socket 会返回 `EMFILE`；此时端口仍在监听，现有连接可能正常，新请求却失败。应比较 `/proc/PID/fd` 数量、进程 limits 和连接状态，修复泄漏或容量模型，而不是只增大系统总上限。

SIGTERM 收尾也遵循同一资源链：服务先停止接收新连接，等待或取消在途工作，flush 必须持久化的状态，关闭连接池后退出。SIGKILL 跳过所有应用清理，因此只应作为超过明确退出期限后的最后手段。

## 把结论限制在证据范围内

不要为了消除权限错误把服务改成 root，也不要为了释放端口直接结束未知 PID。前者扩大攻击面并掩盖所有权设计，后者可能中断另一个正式实例。故障处理必须先确认对象身份，再改变状态。

主机内的进程状态清楚后，请求仍可能在到达它之前失败。下一篇把视角移到 URL 之外，逐层拆开 DNS、TCP、TLS、HTTP 与代理连接。
