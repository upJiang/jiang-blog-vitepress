>一个页面至少一次回流，回流大于重绘，回流必定重绘，重绘不一定回流

回流：DOM 结构的修改引发 DOM 几何尺寸变化

重绘：DOM 结构的修改没有引发 DOM 几何尺寸变化，只是导致了样式的改变

## 减少重绘回流的方式

* 避免频繁使用 style，而是采用修改class的方式。
* 将动画效果应用到position属性为absolute或fixed的元素上。
* 也可以先为元素设置display: none，操作结束后再把它显示出来。为在display属性为none的元素上进行的DOM操作不会引发回流和重绘
* 使用createDocumentFragment进行批量的 DOM 操作。
* 对于 resize、scroll 等进行防抖/节流处理。
* 避免频繁读取会引发回流/重绘的属性，如果确实需要多次使用，就用一个变量缓存起来。
* 利用 CSS3 的transform、opacity、filter这些属性可以实现合成的效果，也就是GPU加速。



