## 概念

```
{
    configurable: false,
    enumberable: false,
    value: 'value',
    writable: false,
    get: function() {
        console.log('get')
    },
    set: function(val) {
        console.log('set')
    }
}
```

- `configurable`：当且仅当该属性的 configurable 为 true 时，
  该`属性描述符才能够被改变`，同时该属性也能从对应的对象上被删除。
- `enumerable`：当且仅当该属性的 enumerable 为 true 时，该属
  性`才能够出现在对象的枚举属性中`。
- `value`：该属性对应的值。可以是任何有效的 JavaScript 值（数值，对象，函数等）
  。
- `writable`：当且仅当该属性的 writable 为 true 时，value 才能被赋值运算
  符`改变`。
- `get`：一个给属性提供 getter 的方法，如果没有 getter 则为 undefined。当访问该
  属性时，该方法会被执行，方法执行时没有参数传入，但是会传入 this 对象（由于继承
  关系，这里的 this 并不一定是定义该属性的对象）。
- `set`：一个给属性提供 setter 的方法，如果没有 setter 则为 undefined。当属性值
  修改时，触发执行该方法。该方法将接受唯一参数，即该属性新的参数值。

## 获取属性描述符

```
const obj = {
    a:1
}
Object.getOwnPropertyDescriptor(obj,'a')
```

## 获取属性描述符

```
const obj = {
    a:1
}

Object.defineProperty(obj,'a',{
    value:10,
    writable:false, // 不可重写
    enumerable:false, // 不可遍历
    configurable:false, // 属性描述符不可更改
})
```

## 巧用 get、set

可以使用 get、set 控制变量的读写，在 set 中抛出异常提示

```
class UIGodds {
    constructor(g) {
        this.num = 1
        this.price = 5
        this.data = g
    }
}
===========> 改成

class UIGodds {
    constructor(g) {
       Object.defineProperty(this,'data',{
            get:function(){
                return g;
            }
            set:function(){
                throw new error("data 属性只读，不能被重新赋值")
            }
       })

       // 在 set 中控制变量的赋值
       let internalNum = 1
        Object.defineProperty(this,'num',{
            get:function(){
                return internalNum;
            }
            set:function(val){
                if(val < 10){
                    throw new error("num 变量不能小于10")
                }
                let temp = parseInt(val)
                if(temp !== val){
                    throw new error("num 变量必须是整数")
                }
                internalNum = val
            }
       })

       // 在 get 中控制输出，或者计算输出
       Object.defineProperty(this,'total',{
            get:function(){
                return this.num * this.price;
            }
       })

       const agood = {
        a:1
       }
       const goods = new UIgoods(agood)
       console.log(goods.total) // 5
    }
}
```
