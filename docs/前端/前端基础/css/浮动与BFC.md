## 浮动
>让元素脱离标准流，以达到灵活布局的效果（类似fixed）

float
- none：不浮动，默认值
- left：向左浮动
- right：向右浮动

### 规则
- 向左浮动或者向右浮动
    - 向左或向右方向移动，直到自己的边界紧贴着包含块（一般是父元素）或者其他浮动元素的边界为止
    - 定位元素会层叠在浮动元素上面
- 不能超出包含块
    - 如果元素是向左（右）浮动，浮动元素的左（右）边界不能超出包含块的左（右）边界
- 浮动元素不能层叠
    - 如果一个元素浮动，另一个浮动元素已经在那个位置了，后浮动的元素将紧贴着前一个浮动元素（左浮找左浮，右浮找右浮）
    - 如果水平方向剩余的空间不够显示浮动元素，浮动元素将向下移动，直到有充足的空间为止
- 浮动元素会将行内级元素内容推出
    - 浮动元素不能与行内级内容层叠，行内级内容将会被浮动元素推出
    - 比如行内级元素、inline-block元素、块级元素的文字内容
    - 图文环绕效果

<a data-fancybox title="img" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a6625614ad3941a18a8e5b918479f040~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?">![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a6625614ad3941a18a8e5b918479f040~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?)</a>

- 浮动只能左右浮动, 不能超出本行的高度
    - 行内级元素、inline-block元素浮动后，其顶部将与所在行的顶部对齐

#### **清楚行内块的间距**，比如 两个 span 之间会有一点间距
- 删除换行符(不推荐)
- 将父级元素的font-size设置为0, 但是需要子元素设置回来
- 通过子元素(span)统一向一个方向浮动即可
- flex布局 

### 清除浮动
- 给父元素设置固定高度
    -扩展性不好（不推荐）
- 在父元素最后增加一个空的块级子元素，并且让它设置clear: both
    - 会增加很多无意义的空标签，维护麻烦
    - 违反了结构与样式分离的原则（不推荐）
- 给父元素添加一个伪元素 
    - 给父元素增加::after伪元素，纯CSS样式解决，结构与样式分离（推荐）
    - ```
        .clear_fix::after {
            content: "";
            clear: both;
            display: block;

            /* 浏览器兼容 */
            visibility: hidden;
            height: 0;
        }

        .clear_fix {
            /* IE6/7 */
            *zoom: 1;
        }
      ```
- `BFC` 的区域不会与浮动容器发生重叠（BFC 下面有解释）

<a data-fancybox title="img" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/865dcb03ee6748109c552cae7e72c8e5~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?">![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/865dcb03ee6748109c552cae7e72c8e5~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?)</a>

<a data-fancybox title="img" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f0e77ef7ec584fc9989aad9aaef70047~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?">![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f0e77ef7ec584fc9989aad9aaef70047~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?)</a>

解决浮动重叠，实现自适应两栏效果，使 .right 成为 BFC区域即可

<a data-fancybox title="img" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3dadad93b69244598a508861846928aa~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?">![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3dadad93b69244598a508861846928aa~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?)</a>

<a data-fancybox title="img" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/97dda03cceba4631b10b230346054cae~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?">![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/97dda03cceba4631b10b230346054cae~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?)</a>

## BFC
#### BFC：（Block Formatting Context） 块级格式化上下文

### 特性
- 属于同一个 `BFC` 的两个相邻容器的上下margin可能会重叠 (那把它弄成两个BFC不就行了)
- 计算 `BFC` 高度时浮动元素也会被计算
- BFC的区域不会与浮动容器发生重叠
- 所有属于BFC中的盒子默认左对齐，并且它们的左边距可以触及到容器的左边线。最后一个盒子，尽管是浮动的，但依然遵循这个原则
- BFC是独立容器，容器内部元素不会影响容器外部元素

### 如何生成 BFC
- 根元素（html）,或包含body的元素
- 设置浮动（float），且值不为none（为 left、right），
- 设置定位（position）, 不为static或relative（为 absolute 、 fixed）
- 设置 display 为这些值 inline-block、flex、grid、table、table-cell、table-caption
- **设置 overflow**(常用)，且值不为visible (为 auto、scroll、hidden)

### 使用 BFC 特性解决问题
#### 解决外边距的塌陷问题
当两个盒子设置100的外边距，会发现应该200px的外边距发生了塌陷，margin重叠只有100px

![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1446cbe47e9d41409d37d51b127c5be8~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?)

![img](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/655c9ca5369e47d99956d066ef691fc4~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?)

将两个盒子放在不同的BFC中即可解决
- 使用 `overflow：hidden` 或 `display：inline-block` 让其成为 BFC

![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5ba7af999bbc42ff9893c02ebc8946fd~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?)

![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8a1839d8ee4a4069b2c8575c56407d94~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?)

![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b8d047f6c7a34caebb4166d5f7693469~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?)
#### 解决浮动重叠问题
.left设置了浮动，导致 .right 与之重叠

![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/865dcb03ee6748109c552cae7e72c8e5~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?)

![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f0e77ef7ec584fc9989aad9aaef70047~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?)

解决浮动重叠，实现自适应两栏效果，使 .right 成为 BFC区域即可

![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3dadad93b69244598a508861846928aa~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?)

![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/97dda03cceba4631b10b230346054cae~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?)

#### 前面写到的清除浮动