## object.definePropert
vue2.0 使用object.definePropert,监听对象的属性,无法监听对象增删，以及数组的变化（vue2.0自己写了许多hack把数据的一些操作方法给改写掉），需要深度遍历对象
```
Object.defineProperty(data, key, 
    { 
        enumerable: true, 
        configurable: true, 
        get: function() { 
            console.log('get'); 
        },
        set: function(newVal) { 
            // 当属性值发生变化时我们可以进行额外操作 
            console.log(`大家好,我系${newVal}`); 
            say(newVal); 
        }
    });
```

vue3.0 使用es6的proxy ，代理对象，直接监听整个对象的变化target，但是无法兼容ie，也无法被folyfill磨平
