> 在改动代码后，想要进行模块级别的`局部更新`该怎么做呢？业界一般使用 HMR 技术来
> 解决这个问题，像 Webpack、Parcel 这些传统的打包工具底层都实现了一套 HMR API，
> 而我们今天要讲的就是 Vite 自己所实现的 HMR API，相比于传统的打包工具，Vite 的
> HMR API 基于 `ESM 模块`规范来实现，可以达到`毫秒级别`的更新速度，性能非常强悍
> 。

## HMR 简介

HMR 的全称叫做`Hot Module Replacement`，即模块`热替换`或者`模块热更新`。在计算机
领域当中也有一个类似的概念叫热插拔，我们经常使用的 USB 设备就是一个典型的代表，
当我们插入 U 盘的时候，系统驱动会加载在新增的 U 盘内容，不会重启系统，也不会修改
系统其它模块的内容。HMR 的作用其实一样，就是在页面模块更新的时候
，`直接把页面中发生变化的模块替换为新的模块，同时不会影响其它模块的正常运作`。通
过 HMR 的技术我们就可以实现**局部刷新**和**状态保存**。

## import.meta

`import.meta` 是**一个给 JavaScript 模块暴露特定上下文的元数据属性的对象，它包含
了这个模块的信息**。

import.meta 对象是由 ECMAScript 实现的，它带有一个 null 的原型对象。这个对象**可
以扩展**，并且它的属性都是`可写，可配置和可枚举`的。

示例：

```
<script type="module" src="my-module.mjs"></script>

// 通过 import.meta 对象获取这个模块的元数据信息.
console.log(import.meta); // { url: "file:///home/user/my-module.mjs" }
```

## 深入 HMR API

Vite 作为一个完整的构建工具，本身实现了一套 HMR 系统，值得注意的是，这套 HMR 系
统基于原生的 ESM 模块规范来实现，在**文件发生改变时 Vite 会侦测到相应 ES 模块的
变化，从而触发相应的 API，实现局部的更新**。

Vite 的 HMR API 设计也并非空穴来风，它基于一套完整的
[ESM HMR 规范](https://github.com/withastro/esm-hmr)来实现，这个规范由同时期的
no-bundle 构建工具 Snowpack、WMR 与 Vite 一起制定，是一个比较通用的规范。

HMR API 的类型定义:

```
interface ImportMeta {
  readonly hot?: {
    readonly data: any
    accept(): void
    accept(cb: (mod: any) => void): void
    accept(dep: string, cb: (mod: any) => void): void
    accept(deps: string[], cb: (mods: any[]) => void): void
    prune(cb: () => void): void
    dispose(cb: (data: any) => void): void
    decline(): void
    invalidate(): void
    on(event: string, cb: (...args: any[]) => void): void
  }
}
```

`import.meta` 对象为现代浏览器原生的一个内置对象，Vite 所做的事情就是**在这个对
象上的 hot 属性中定义了一套完整的属性和方法**。因此，在 Vite 当中，你就可以通过
`import.meta.hot` 来访问关于 HMR 的这些属性和方法，比如
`import.meta.hot.accept()`。

#### 模块更新时逻辑: hot.accept

在 `import.meta.hot` 对象上有一个非常关键的方法 `accept`，因为它决定了 Vite 进
行**热更新的边界**，那么如何来理解这个 accept 的含义呢？

从字面上来看，它表示接受的意思。没错，它就是用来**接受模块更新**的。 一旦 Vite
接受了这个更新，当前模块就会被认为是 HMR 的边界。那么，Vite 接受谁的更新呢？这里
会有三种情况：

- 接受自身模块的更新
- 接受某个子模块的更新
- 接受多个子模块的更新

#### 其它方法

- 模块销毁时逻辑: hot.dispose：代表在模块更新、旧模块需要销毁时需要做的一些事情
- 共享数据: hot.data 属性
- 其它方法
  - import.meta.hot.decline()
    - 这个方法调用之后，相当于表示此模块不可热更新，当模块更新时会强制进行页面刷
      新。感兴趣的同学可以继续拿上面的例子来尝试一下。
  - import.meta.hot.invalidate()
    - 强制刷新页面
  3. 自定义事件
     - 你还可以通过 import.meta.hot.on 来监听 HMR 的自定义事件，内部有这么几个事
       件会自动触发:
       - vite:beforeUpdate 当模块更新时触发；
       - vite:beforeFullReload 当即将重新刷新页面时触发；
       - vite:beforePrune 当不再需要的模块即将被剔除时触发；
       - vite:error 当发生错误时（例如，语法错误）触发。

如果你想自定义事件可以通过上节中提到的 handleHotUpdate 这个插件 Hook 来进行触发:

```
// 插件 Hook
handleHotUpdate({ server }) {
  server.ws.send({
    type: 'custom',
    event: 'custom-update',
    data: {}
  })
  return []
}
// 前端代码
import.meta.hot.on('custom-update', (data) => {
  // 自定义更新逻辑
})
```

## 总结

我们首先认识了 HMR 这个概念，了解它相比于传统的 live reload 所解决的问题
：`模块局部更新`和`状态保存`。然后我带你熟悉了 Vite HMR 中的各种 API，尤其是
accept 方法，根据 accept 的不同用法，我们分了三种情况来讨论 Vite 接受更新的策略:
`接受自身更新`、`接受依赖模块的更新`和`接受多个子模块的更新`，并通过具体的示例来
进行这三种情况的代码演示，可以看到**在代码发生变动的时候，Vite 会定位到发生变化
的局部模块，也就是找到对应的 HMR 边界，然后基于这个边界进行更新，其他的模块并没
有受到影响**，这也是 Vite 中的热更新的时间也到达毫秒级别的重要原因。
