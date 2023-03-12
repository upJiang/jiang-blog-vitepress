## animation 属性和 transition 属性
了解一下 animation 属性的基本用法:
```
@keyframes mykf
{
  from {background: red;}
  to {background: yellow;}
}

div
{
    animation:mykf 5s infinite;
}
```
这里展示了 animation 的基本用法，实际上 animation 分成六个部分：
- animation-name 动画的名称，这是一个 keyframes 类型的值
- animation-duration 动画的时长；
- animation-timing-function 动画的时间曲线；
- animation-delay 动画开始前的延迟；
- animation-iteration-count 动画的播放次数；
- animation-direction 动画的方向。

transition 与 animation 相比来说，是简单得多的一个属性。它有四个部分：
- transition-property 要变换的属性；
- transition-duration 变换的时长；
- transition-timing-function 时间曲线；
- transition-delay 延迟。

这里的四个部分，可以重复多次，指定多个属性的变换规则。

实际上，有时候我们会把 transition 和 animation 组合，抛弃 animation 的 timing-function，以编排不同段用不同的曲线。
```
@keyframes mykf {
  from { top: 0; transition:top ease}
  50% { top: 30px;transition:top ease-in }
  75% { top: 10px;transition:top ease-out }
  to { top: 0; transition:top linear}
}
```

