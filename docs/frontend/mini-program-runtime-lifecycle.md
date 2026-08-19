---
title: 小程序运行时、双线程模型与生命周期
description: 从页面首次打开进入逻辑层、视图层、数据序列化、路由、应用/页面/组件生命周期和 setData 成本。
category: frontend
part: 跨端开发
chapter: 66
tags:
  - Mini Program
  - Runtime
  - Lifecycle
prerequisites:
  - JavaScript 与组件生命周期
outcomes:
  - 推演小程序启动和更新链路
  - 按生命周期管理资源
practice:
  type: implementation
  result: 记录页面进入、切换和销毁时序
  verify:
    - 后台恢复与冷启动被区分
    - 频繁 setData 的数据量可观察
evidence: official-guided-operation
updated: 2026-08-11
---

# 小程序运行时、双线程模型与生命周期

小程序运行时是宿主应用为页面逻辑、组件和视图渲染提供的执行环境。以微信小程序为例，逻辑层运行 JavaScript，视图层负责 WXML/WXSS 渲染，两层通过数据通道同步状态。它位于业务代码和手机系统能力之间，负责页面栈、生命周期、组件通信和宿主 API 调用。

因此，逻辑层修改 `data` 后，视图并不是在读取同一个 JavaScript 对象。`setData` 需要把可序列化数据跨边界传给视图层，再触发更新；频繁发送大对象会增加通信和渲染成本。本文以微信小程序官方模型为准，其他平台或基础库版本需要按各自文档和真实设备复核。

## 启动与路由

冷启动创建应用并触发 App 生命周期，页面按路由创建；从后台返回可能只触发 show，不重新 launch。页面栈的 navigateTo、redirectTo、switchTab、reLaunch 和 navigateBack 对实例保留不同，资源所有者必须按真实卸载时机清理。

Page 的 load 接收初始参数，show 可多次发生，ready 表示首次渲染完成，hide 只是暂时不可见，unload 才销毁。组件还有 created/attached/ready/moved/detached，组件与页面顺序通过官方版本和实验核对。
## setData 数据通道

只发送视图需要且发生变化的路径，合并同一轮更新，避免高频大数组深拷贝。逻辑层直接修改 `this.data` 不会可靠更新视图；setData callback 或下一阶段用于观察提交，但不能当任意异步任务完成。

列表使用稳定 wx:key 保持节点身份。把不可序列化函数、循环结构或过大数据放 data 会失败或成本过高，业务缓存与视图状态应分开。

一次更新可以只发送发生变化的路径，并顺手记录数据量和耗时。下面的日志用于本地诊断，真实项目还要限制采样率，避免把业务数据写入线上日志：

```js
function updateVisibleRows(nextRows) {
  const payload = { visibleRows: nextRows }
  const bytes = new TextEncoder().encode(JSON.stringify(payload)).byteLength
  const startedAt = Date.now()

  this.setData(payload, () => {
    console.info('setData committed', {
      bytes,
      durationMs: Date.now() - startedAt
    })
  })
}
```

`setData` 回调表示这次视图更新已完成，不代表网络、图片解码或后续动画也结束。老旧基础库若没有 `TextEncoder`，诊断工具可以用开发环境提供的字节统计方式替代；不要为了计数把大型对象再序列化一遍并长期留在线上热路径。
## 资源生命周期

网络、定时器、定位、监听器和播放器在 hide 是暂停还是继续取决于业务；unload/detached 必须释放。后台恢复检查数据时效和登录状态，不默认重新请求全部内容。
## 验证

为 App/Page/Component 每个 Hook 打关联 ID 和时间，执行冷启动、前后台、普通导航、Tab 切换和返回。记录 setData payload 大小、频率和视图更新时间，建立性能基线。

解释双线程模型时，要同时说明逻辑与视图隔离、数据桥、生命周期和性能含义，不把一个平台当前版本的内部实现写成所有小程序的永久保证。
## 一次 setData 的执行链

页面事件先在逻辑层更新本地状态，`setData` 再把 payload 交给数据通道，视图应用更新后用户才看到结果。JavaScript 计算很快，并不能抵消大型 payload 的序列化、传输和渲染成本。

```text
事件 -> Page handler -> local state
     -> setData(payload) -> bridge serialization
     -> view layer patch -> layout/paint -> callback
```

组件的 `properties`、`data`、`observers` 和 `lifetimes` 形成独立边界。跨组件事件与页面状态不应依赖无所有者的全局可变对象；自定义组件 `detached` 可能晚于页面隐藏，因此播放器和监听器需要分别处理暂停与销毁。
## 官方依据

- [微信小程序生命周期](https://developers.weixin.qq.com/miniprogram/dev/framework/app-service/page-life-cycle.html)
- [setData 性能](https://developers.weixin.qq.com/miniprogram/dev/framework/performance/tips.html)
- [自定义组件生命周期](https://developers.weixin.qq.com/miniprogram/dev/framework/custom-component/lifetimes.html)
