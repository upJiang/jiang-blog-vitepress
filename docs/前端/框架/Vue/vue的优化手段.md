## 常见优化手段

- 使用 key：对于通过循环生成的列表，应给每个列表项一个稳定且唯一的 key，这有利于
  在列表变动时，尽量少的删除、新增、改动元素
- 使用冻结的的对象：冻结的对象不会被响应化，判断是否时冻结对象
  ：`Object.isFrozen(obj)`，冻结对象：`Object.freeze(obj)`
- 使用函数式组件，`vue2`中使用 `functional`，`vue3`中使用 `h`函数

```
import { h } from 'vue'

const DynamicHeading = (props, context) => {
  return h(`h${props.level}`, context.attrs, context.slots)
}

DynamicHeading.props = ['level']

export default DynamicHeading
```

- 使用计算属性：如果模板中某个会使用多次，并且该数据是通过计算得到的，使用计算属
  性以缓存它们
- 非实时绑定的表单项：
  - 当使用 `v-model` 绑定一个表单项时，当用户改变表单项的状态时，也会随之改变数
    据，从而导致 `vue` 发生重渲染，这会带来一些性能的开销。我们可以通过使用
    `lazy` 或不使用 `v-model` 的方式解决该问题，但要注意，这样可能会导致在某一个
    时间内数据和表单项的值是不一致的。
- 延迟装载，`defer`
