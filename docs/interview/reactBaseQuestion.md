[35 道咱们必须要清楚的 React 面试题](https://juejin.cn/post/6844903988073070606)

## react的常用hook钩子
1. useState；定义一个hook数组，数组第一个传入的是state数据的名字，数组第二位是方法用来更新这个hook的数据；useState传入的是该hook的默认值。
2. useContext：类似redux和mobx全局store的功能
3. useReducer：类似redux通过发布dispatch触发数据更新
4. useCallback：在数据更新之后执行的方法
5.useMemo在count改变时触发可以避免非必要渲染(类似vue的计算属性)
6. useRef，useImperativeHandle：这两个放到一起来说，主要是hook进行父子组件间的通信
7. useEffect： 这个api主要是在更新这个hook的数据的方法执行后的一个回调方法可以传入两个参数，第一个参数是一个callback回调函数；第二个参数是对应哪写hook更新后才执行不传为所有hook更新都执行，形式为数组。useEffect有点类似vue中的watch监听。