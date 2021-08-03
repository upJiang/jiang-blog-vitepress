## vue3.0的提升与改变（完全自述）
1. 性能优化上，静态标记，热更新click，vite打包速度，摇树优化（打包时会把一些没有用到的nextnick,observable等方法抽离出来，排除掉）
2. 语法上，采用最新的script setup语法糖，比如defineEmit,defineProps,useContext(里面有expose，用于暴露组件的方法，真正意义上的组件封装），vue3.2开始使用defineExpose替代
3. 定义全局变量的方式，以前可以使用vue.proto,,定义原型链去挂载全局变量，现在使用app.config.globalProperties
4. v-modal的使用，移除.async，实现父子组件双向数据绑定
5. 插槽slot使用的变化，增加了name的属性（具名插槽），便于排版吧
6. teleport，就是一个任意插入到div中的工具，但是需要变量去动态控制，首次加载就算是true也不显示
7. 本来在template中必须有一层div包裹并导出，现在不需要了，fragmate
8. css中，v-bind使用变量
9. 新增了watchEffect可以监控这个方法内写过的变量发生改变后就会触发，以及一些red,reactive这些的用法就不用详细说了
10. 移除掉了created方法，setup是在beforeCreated后才能使用的，没有this，只能使用getCurrentInstance去获取实例，而且使用proxy导出使用
11. 组件的传值除了使用vuex，还可以使用provide/reject进行深层传递
12. 函数式编程，可以轻易暴露公共方法，取消了mixin的使用
13. 新增一些获取env环境变量的方法import.meta.env.VITE_BASE_URL，便于定义打包方式使用不同变量这些
14. 在vite中不能使用require，比如遍历文件夹，以前使用require.context,,, 现在提供了新方法import.meta.globEager 或者import.meta.glob
15. 注册自定义组件的方法变化，以前需要install，，，然后use什么的，现在直接app.component(key, componentArray[key])
16. dom中ref的使用，因为跟语法ref可能有冲突啥的，现在必须定义const a = ref(null)，否则在服务器环境中会报错
17. 以前基本不怎么支持ts，现在是全方位支持
18. 新增Suspens异步组件，可以用于封装loading结束后显示下一个组件
19. 新增了一个createdRender 自定义渲染器，函数式组件（但不建议使用，性能提升不高）
20. vue2中h渲染方法以及其中的on方法的变化，h直接导入使用，on方法直接前面是on，，，就可以使用，以及插槽的变化
21. defineAsyncCompont 定义异步组件，用于区分函数式组件
22. 自定义指令的语法变了，比如inserted=>mounted , bind->beforeMount
23. 过渡动画transition现在卸载router-view内部，v-enter =>v-enter-from , v-leave => v-leave-from
24. $on,$off,$once，filters被移除，使用必须使用第三方库
25. 修改vite.config.ts不需要重新启动项目
26. vite用的esm不支持node的require

## vue3.0在响应式方面上做了哪些提升？
>vue2.0使用object.defineProperty，vue3.0使用prpxy

vue3 ==> 基于Proxy的数据响应式<br/>
     ==> 依赖收集: 添加副作用efferc() => 依赖收集track() -> 触发副作用trigger()

1. vue2.0 初始化需要递归，速度慢，而vue3不需要初始化，它是在运行时初始化的，当遇到响应式对象时才去遍历，采取获取依赖，添加副作用函数等。
2. vue2.0依赖关系占用资源较多，为了实现响应式数据需要添加很多依赖，以及watcher，而vue3.0没有watcher，依靠的effect副作用函数以及proxy去做到响应式
3. vue2.0数组支持需要特殊实现，动态属性的增加删除需要额外的api(如$set.$delete),而vue3.0直接使用proxy搞定了
4. vue2.0不支持MAp,Set，vue3支持

## 虚拟dom是什么？
虚拟dom就是一个js对象，一个对于真实dom的一个抽象，可以表示一个真实dom的基本结构

## 为什么需要虚拟dom？
1. 虚拟dom可以做到定点更新，可以对于两次虚拟dom进行对比，只更新变化的节点
2. 通过虚拟dom可以更好做跨平台，数据驱动可以直接驱动虚拟dom,渲染层可以更好写出跨平台的代码
3. 虚拟dom可以在真实dom生成之前做一些兼容性处理或优化工作，减少人为犯错的可能

## vue3编译器优化策略
1. 静态节点提升
2. 补丁标记和动态属性记录
3. 缓存事件处理程序
4. 块block，把静态的内容剔除，将需要更新的节点取出来作为块