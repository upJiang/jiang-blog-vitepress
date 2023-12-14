长列表一直往下翻，一直加载数据，上万条如何优化?

> 造成卡顿的原因是因为 dom 节点太多，使用虚拟列表，只渲染一定高度的 dom 节点便可
> 解决

## 虚拟列表

虚假设 10000 条数据，每个 item30px,列表容器装载 10 个数据即 300px，总高度
30px\*10000

这些在 mounted 定义<br/> item 容器高度:30px<br/> 数据列表总高度:30px*10000<br/>
数据容器高度:30px * 10<br/> 使用父容器相对定位，子容器列表绝对定位，设置父容器可
滚动，<br/> 高度为数据列表总高度 30px\*10000<br/> 使用 computed 动态计算当前十条
数据，start 初始 0，end 初始 10，<br/>

```
showList(){ return this.list.slice(this.start, this.end); }
```

监听 scroll 事件 scrollListener

```
scrollListener(){
                //获取滚动高度
                let scrollTop = this.$refs.listWrap.scrollTop;
                //开始的数组索引
                this.start = Math.floor(scrollTop / this.itemHeight);
                //结束索引
                this.end = this.start + this.showNum;
                //绝对定位对相对定位的偏移量
                this.$refs.list.style.top = this.start * this.itemHeight + 'px';
}
```

当滚动的时候会自动设置当前数据，以及滚动 top 值

除了这种虚拟列表，其实很多组件已经实现了这种功能
