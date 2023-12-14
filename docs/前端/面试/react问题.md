[35 道咱们必须要清楚的 React 面试题](https://juejin.cn/post/6844903988073070606)

## react 的常用 hook 钩子

1. useState；定义一个 hook 数组，数组第一个传入的是 state 数据的名字，数组第二位
   是方法用来更新这个 hook 的数据；useState 传入的是该 hook 的默认值。
2. useContext：类似 redux 和 mobx 全局 store 的功能
3. useReducer：类似 redux 通过发布 dispatch 触发数据更新
4. useCallback：在数据更新之后执行的方法 5.useMemo 在 count 改变时触发可以避免非
   必要渲染(类似 vue 的计算属性)
5. useRef，useImperativeHandle：这两个放到一起来说，主要是 hook 进行父子组件间的
   通信
6. useEffect： 这个 api 主要是在更新这个 hook 的数据的方法执行后的一个回调方法可
   以传入两个参数，第一个参数是一个 callback 回调函数；第二个参数是对应哪写 hook
   更新后才执行不传为所有 hook 更新都执行，形式为数组。useEffect 有点类似 vue 中
   的 watch 监听。
