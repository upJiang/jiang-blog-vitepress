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

逻辑层修改 data 后，视图不是共享同一个 JavaScript 对象。小程序运行环境通常隔离逻辑与渲染，setData 要序列化并跨边界传输，再由视图层更新。频繁发送大对象会增加通信和渲染成本。

## 启动与路由

冷启动创建应用并触发 App 生命周期，页面按路由创建；从后台返回可能只触发 show，不重新 launch。页面栈的 navigateTo、redirectTo、switchTab、reLaunch 和 navigateBack 对实例保留不同，资源所有者必须按真实卸载时机清理。

Page 的 load 接收初始参数，show 可多次发生，ready 表示首次渲染完成，hide 只是暂时不可见，unload 才销毁。组件还有 created/attached/ready/moved/detached，组件与页面顺序通过官方版本和实验核对。

## setData 数据通道

只发送视图需要且发生变化的路径，合并同一轮更新，避免高频大数组深拷贝。逻辑层直接修改 `this.data` 不会可靠更新视图；setData callback 或下一阶段用于观察提交，但不能当任意异步任务完成。

列表使用稳定 wx:key 保持节点身份。把不可序列化函数、循环结构或过大数据放 data 会失败或成本过高，业务缓存与视图状态应分开。

## 资源生命周期

网络、定时器、定位、监听器和播放器在 hide 是暂停还是继续取决于业务；unload/detached 必须释放。后台恢复检查数据时效和登录状态，不默认重新请求全部内容。

## 验证

为 App/Page/Component 每个 Hook 打关联 ID 和时间，执行冷启动、前后台、普通导航、Tab 切换和返回。记录 setData payload 大小、频率和视图更新时间，建立性能基线。

面试回答双线程时，应说明逻辑与视图隔离、数据桥、生命周期和性能含义，不断言所有平台内部实现永远相同。

## 小程序一次 setData 的执行链

页面逻辑线程修改 data 后调用 `setData`，框架对数据做可序列化校验和 diff/合并，再通过逻辑到视图的数据通道更新渲染层；视图层应用更新后，用户才看到结果。频繁大对象 setData 会增加序列化、传输和渲染成本，即使 JavaScript 计算很快也会卡。

```text
事件 -> Page handler -> local state
     -> setData(payload) -> bridge serialization
     -> view layer patch -> layout/paint -> callback
```

App、Page、Component 生命周期由实例和导航栈决定。冷启动创建 App，进入页面触发 onLoad/onShow；返回后台通常只触发 show，页面是否销毁取决于栈和内存回收。Tab、redirect、reLaunch 和 navigateBack 的实例保留不同，资源释放必须按真实 Hook 和平台文档验证。

组件 properties、data、observers 和 lifetimes 形成独立边界；跨组件事件与页面状态不要依赖全局可变对象。自定义组件 detached 可能晚于页面隐藏，播放器/监听器要同时处理暂停与销毁。

## 官方依据

- [微信小程序生命周期](https://developers.weixin.qq.com/miniprogram/dev/framework/app-service/page-life-cycle.html)
- [setData 性能](https://developers.weixin.qq.com/miniprogram/dev/framework/performance/tips.html)
- [自定义组件生命周期](https://developers.weixin.qq.com/miniprogram/dev/framework/custom-component/lifetimes.html)
