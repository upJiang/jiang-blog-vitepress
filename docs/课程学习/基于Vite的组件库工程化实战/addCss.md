使用 [UnoCSS](https://github.com/unocss/unocss) 实现 AtomicCSS(可复用的行内样式
，原子样式)

## 引入 UnoCSS

#### 安装 UnoCSS 库

```
pnpm i -D unocss@"0.45.6"
pnpm i -D @iconify-json/ic@"1.1.4"
```

#### 在 Vite 中添加 UnoCSS 插件

```
import { presetUno, presetAttributify, presetIcons } from "unocss";
import Unocss from "unocss/vite";
export default defineConfig({
  plugins: [
    ...
    // 添加UnoCSS插件
    Unocss({
        presets: [presetUno(), presetAttributify(), presetIcons()],
    })
  ],
});
```

#### 在 Button 组件中引入 UnoCSS

> 注意: 这个地方文件名已经从 index.ts 变为 index.tsx /src/button/index.tsx

```
import { defineComponent,PropType,toRefs} from "vue";
import "uno.css";
export default defineComponent({
  name: "SButton",
  setup(props, {slots}) {
    return () => <button
      class={`
      py-2
      px-4
      font-semibold
      rounded-lg
      shadow-md
      text-white
      bg-green-500
      hover:bg-green-700
      border-none
      cursor-pointer
      `}
        >
        {slots.default ? slots.default() : ''}
     </button>
  }
});
```

#### 修改 src/index.ts

```
import { createApp } from "vue/dist/vue.esm-browser";
import SmartyUI from './entry'

createApp({
    template:`
        <div>
            <SButton>普通按钮</SButton>
        </div>
    `
})
.use(SmartyUI)
.mount("#app");
```

跑起来后：

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e03b40ea6a534252afa17c4ec61f0515~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e03b40ea6a534252afa17c4ec61f0515~tplv-k3u1fbpfcp-watermark.image?)</a>
到此为止，说明 UnoCSS 已经正常引入了。

## 实现组件属性定制按钮样式

通过 color 属性定制颜色，src/index.ts

```
import { createApp } from "vue/dist/vue.esm-browser";
import SmartyUI from './entry'
// import SButton from "./button";
// createApp(SButton).mount("#app");
// import SFCButton from "./button/SFCButton.vue";

// createApp(SFCButton)
// .mount("#app");

createApp({
    template:`
     <div>
      <SButton color="blue">蓝色按钮</SButton>
      <SButton color="green">绿色按钮</SButton>
      <SButton color="gray">灰色按钮</SButton>
      <SButton color="yellow">黄色按钮</SButton>
      <SButton color="red">红色按钮</SButton>
    </div>
    `
})
.use(SmartyUI)
.mount("#app");
```

#### 改造一下组件代码

src/button/index.tsx

```
import { defineComponent,PropType,toRefs} from "vue";
import "uno.css";

export type IColor = 'black' | 'gray' | 'red' | 'yellow' | 'green'|'blue'|'indigo'|'purple'|'pink'
export const props = {
  color: {
    type: String as PropType<IColor>,
    default: 'blue'  // 设定默认颜色
  },
}
export default defineComponent({
  name: "SButton",
  props,
  setup(props, {slots}) {
    return () => <button
        class={`
          py-2
          px-4
          font-semibold
          rounded-lg
          shadow-md
          text-white
          bg-${props.color}-500
          hover:bg-${props.color}-700
          border-none
          cursor-pointer
          m-1
          `}
        >
        {slots.default ? slots.default() : ''}
     </button>
  }
});
```

#### 封装 UnoCSS 安全列表

UnoCSS 提供了安全列表选项。也就是说，把样式定义中变量的取值添加到 Safelist 中去
。这样 UnoCSS 就会根据 Safelist 生成样式了。

新建 config/unocss.ts

```
import { presetUno, presetAttributify, presetIcons } from "unocss";
import Unocss from "unocss/vite";

const colors = [
  "white",
  "black",
  "gray",
  "red",
  "yellow",
  "green",
  "blue",
  "indigo",
  "purple",
  "pink",
];

const safelist = [

  ...colors.map((v) => `bg-${v}-500`),
  ...colors.map((v) => `hover:bg-${v}-700`),
];

export default () =>
  Unocss({
    safelist,
    presets: [presetUno(), presetAttributify(), presetIcons()],
  });
```

#### vite.config.ts 加入配置

```
import Unocss from "./config/unocss";

export default defineConfig({

  plugins: [

    Unocss(),
  ],

})
```

效果图<br>
<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2a00fc62202c42babe71dc4cf9e4bbcd~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2a00fc62202c42babe71dc4cf9e4bbcd~tplv-k3u1fbpfcp-watermark.image?)</a>

## 【 Icon 图标按钮】实现

在 UnoCSS 中引入图标，直接使用 [iconfy 网站](https://icones.js.org/)的图标代码即
可，跟 iconFont 使用方法类似
<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1b3c1022116a48a78ca902a78cf3b774~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1b3c1022116a48a78ca902a78cf3b774~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp)</a>

例子：Uno 中使用 class="i-ic-baseline-search"，系统就会自动引用这个图标

#### 在 Unocss 插件中添加 presetIcons 预设

config/unocss.ts

```
import { presetUno, presetAttributify, presetIcons } from "unocss";
import Unocss from "unocss/vite";

const colors = [
  "white",
  "black",
  "gray",
  "red",
  "yellow",
  "green",
  "blue",
  "indigo",
  "purple",
  "pink",
];

// 安全列表
const safelist = [
  ...colors.map((v) => `bg-${v}-500`),
  ...colors.map((v) => `hover:bg-${v}-700`),
  // icon 的安全列表
  ...[
      "search",
      "edit",
      "check",
      "message",
      "star-off",
      "delete",
      "add",
      "share",
    ].map((v) => `i-ic-baseline-${v}`)

];

export default () =>
  Unocss({
    safelist,
    presets: [presetUno(), presetAttributify(), presetIcons()],
  });
```

#### 在 Button 中添加字体图标

src/button/index.tsx

```
import { defineComponent,PropType,toRefs} from "vue";
import "uno.css";

export type IColor = 'black' | 'gray' | 'red' | 'yellow' | 'green'|'blue'|'indigo'|'purple'|'pink'
export const props = {
  color: {
    type: String as PropType<IColor>,
    default: 'blue'  // 设定默认颜色
  },
  // 新增 icon
  icon: {
    type: String,
    default: "",
  },
}
export default defineComponent({
  name: "SButton",
  props,
  setup(props, {slots}) {
    return () => <button
        class={`
          py-2
          px-4
          font-semibold
          rounded-lg
          shadow-md
          text-white
          bg-${props.color}-500
          hover:bg-${props.color}-700
          border-none
          cursor-pointer
          m-1
          `}
        >
        {/* 新增icon */}
        { props.icon !== "" ? <i class={`i-ic-baseline-${props.icon} p-3`}></i> : ""}

        {slots.default ? slots.default() : ''}
     </button>
  }
});
```

#### 测试代码实验一下效果

src/index.ts

```
import { createApp } from "vue/dist/vue.esm-browser";
import SmartyUI from './entry'
// import SButton from "./button";
// createApp(SButton).mount("#app");
// import SFCButton from "./button/SFCButton.vue";

// createApp(SFCButton)
// .mount("#app");

createApp({
    template:`
    <div>
        <SButton color="blue" round plain icon="search" ></SButton>
        <SButton color="green" round plain icon="edit" ></SButton>
        <SButton color="gray" round plain icon="check" ></SButton>
        <SButton color="yellow" round plain icon="message" ></SButton>
        <SButton color="red" round plain icon="delete" ></SButton>
    </div>
    `
})
.use(SmartyUI)
.mount("#app");
```

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c29ea56522dd493b8d8277e7789766ff~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c29ea56522dd493b8d8277e7789766ff~tplv-k3u1fbpfcp-watermark.image?)</a>

## Build 时单独导出 CSS

使用 unocss 后，如果运行 pnpm build 的时候会报错。<br>
<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/13c2a76382fc4517ba4023db0b45ae6c~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/13c2a76382fc4517ba4023db0b45ae6c~tplv-k3u1fbpfcp-watermark.image?)</a>

解决办法是根据提示增加编译选项 cssCodeSplit vite.config.ts

```
  build: {
    ...
    cssCodeSplit: true,   // 独立导出 css
    ...
  },
```

#### 在调用组件库的时候需要引入 style.css 才可以让样式生效

<a data-fancybox title="img" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c5122a914a764fbd87940c24aa77374f~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?">![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c5122a914a764fbd87940c24aa77374f~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?)</a>

<a data-fancybox title="img" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2ef0a151099545f897f47e005a507d62~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?">![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2ef0a151099545f897f47e005a507d62~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?)</a>

在使用打包文件时，注意将 css 引入进来
