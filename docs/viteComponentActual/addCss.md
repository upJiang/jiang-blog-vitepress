使用 [UnoCSS](https://github.com/unocss/unocss) 实现 AtomicCSS(可复用的行内样式，原子样式)

## 引入UnoCSS

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
>注意: 这个地方文件名已经从 index.ts变为 index.tsx
/src/button/index.tsx
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

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e03b40ea6a534252afa17c4ec61f0515~tplv-k3u1fbpfcp-watermark.image?)
到此为止，说明 UnoCSS 已经正常引入了。

## 实现组件属性定制按钮样式
