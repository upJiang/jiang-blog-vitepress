在我看来，vue3 的开发中应该有三种组件封装形式，分别是<br/>

1. 最普通的导入式组件<br/>
2. 全局组件（就类似于组件库 antd 的全局导入）<br/>
3. 函数式组件（也就是能够在 js 代码中使用的组件，类似于 this.$message({})）<br/>

现在我来分别介绍这三种组件该如何封装

组件目录结构<br/>
<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/110a543422174c5b872ec95c63e31b6b~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/110a543422174c5b872ec95c63e31b6b~tplv-k3u1fbpfcp-watermark.image?)</a>

## 导入式组件

组件代码：/src/components/import/BButton.vue

```
<template>
  <a-button @click="clickBack" type="primary" plain> {{ text }} </a-button>
</template>

<script setup>
import { useRouter } from "vue-router";
const props = defineProps({
  text: { type: String, default: "返回" },
  backLevel: {
    type: Number,
    default: 1,
  },
});

const router = useRouter();
const clickBack = () => {
  router.go(-props.backLevel);
};
</script>
```

在页面导入使用：/src/views/Home.vue

```
import BButton from '@/components/import/BButton.vue'
<b-button text="最简单的导入组件"></b-button>
```

## 全局组件

组件代码：/src/components/common/BackButton.vue

```
<template>
  <a-button @click="clickBack" type="primary" plain> {{text}} </a-button>
</template>

<script setup>
import { useRouter } from "vue-router";
const props = defineProps({
  text: { type: String, default: "返回" },
  backLevel: {
    type: Number,
    default: 1,
  },
});

const router = useRouter();
const clickBack = () => {
  router.go(-props.backLevel);
};
</script>
```

全局导入：/src//config/d.ts

```
//通过vite提供的import.meta.globEager读取common目录下的所有vue组件，并且以 D+文件名 作为组件名。
//在使用时使用 d-组件名的形式
const componentList = import.meta.globEager('../components/common/**');
let componentArray = new Object()
Object.keys(componentList).forEach((key) => {
    let keyArray = key.split('/')
    let name = 'D' + keyArray[keyArray.length - 1].split('.')[0]
    componentArray[name] = componentList[key].default
})

export default function (app) {
    Object.keys(componentArray).forEach((key) => {
        app.component(key, componentArray[key])
    })
}
```

在 main.ts 中的 use 这个 d.ts

```
import d from "@/config/d";
app.use(d)
```

在页面中直接使用，不需要导入：/src/views/Home.vue

```
<d-back-button text="这是全局导入的自定义组件，不需要在页面中单独导入"></d-back-button>
```

## 函数式组件

> 这里我将会介绍如何在 vue 文件中使用，以及在 ts/js 文件中使用。<br/> 我们可能会
> 遇到一个场景，比如说需要在接口报错或者成功时弹出一个全局自定义的组件，要求不能
> 在 vue 文件中去写，也不能使用组件库的组件，而是需要在 axios 这种 js/ts 文件中
> 去写，这样才能做到通用。那么我们该如何在 js 中使用并封装一个函数式组件？

组件代码：/src/components/function/components/tipsDialog.vue

```
<template>
  <Modal
    v-model:visible="pageVisible"
    title="自定义全局函数组件"
    @ok="_sure"
    @cancel="pageVisible = false"
    :okText="okText"
  >
    {{content}}
  </Modal>
</template>

<script setup>
import { ref, watch } from "vue";
//自定义函数组件无法使用全局组件，需要单独引入
import { Modal } from "ant-design-vue";
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  okText: {
    type: String,
    default: "确定",
  },
  handleOk: {
    type: Function, //成功回调
    default: null,
  },
  remove: {
    type: Function, //传入移除节点方法,这里是createApp中的方法
    default: null,
  },
  content:{
    type: String,
    default: "自定义全局函数组件......",
  }
});

const pageVisible = ref(false);
pageVisible.value = props.visible;
// 监听显示的消失，需要移除dom
watch(
  () => pageVisible.value,
  (val) => {
    !val && props.remove();
  }
);

// 确认
const _sure = () => {
  typeof props.handleOk === "function" && props.handleOk("组件参数");
  pageVisible.value = false;
};
</script>
```

组件代码：/src/components/function/components/tipsDialog.ts

```
import { createApp } from 'vue';
import FunTipsDialog from './tipsDialog.vue'
// 使用vue3的createApp,以及mount,unmount方法创建挂载实例

export default function TipsDialog(options) {
    // 创建一个节点，并将组件挂载上去
    const mountNode = document.createElement('div')
    document.body.appendChild(mountNode)
    const app = createApp(FunTipsDialog, {
        ...options, visible: true, remove() {
            app.unmount(mountNode) //创建完后要进行销毁
            document.body.removeChild(mountNode)
        }
    })
    return app.mount(mountNode)
}
```

组件代码：/src/components/function/index.ts

```
//使用import.meta.globEager读取components文件夹的文件，以后缀名ts区分
const componentsList = import.meta.globEager("./components/**");

let List = {};
export default function (app) {
  Object.keys(componentsList).forEach((key) => {
    // 筛选出ts后缀
    if (key.split(".")[2] === "ts") {
        //赋值函数组件，后面抛出，js/ts中导入使用
        List[`$${componentsList[key].default.name}`] =
        componentsList[key].default;

      //将函数组件定义到全局变量中，在vue中的script中通过proxy使用
      app.config.globalProperties[`$${componentsList[key].default.name}`] =
        componentsList[key].default;
    }
  });
}

//抛出函数组件，用于js/ts中使用
export const funComponentList = List;
```

在 main.ts 中的 use 这个 index.ts

```
import fc from "@/components/function/index"
app.use(fc)
```

在 vue 中使用 /src/views/Home.vue

```
<a-button @click="clickOpenFunComponent">这是自定义全局函数组件，点击打开</a-button>

import { getCurrentInstance } from "vue";
const { proxy } = getCurrentInstance();
const clickOpenFunComponent = () => {
  proxy.$TipsDialog({
    handleOk: (str) => {
      console.log("点击成功，可以在此处做回调操作。"+str);
    },
  });
};
```

在 request.ts 中使用，当调用接口成功或报错时弹出 /src/config/request.ts

```
import { funComponentList } from "@/components/function/index";

if (response?.status === 200) {
    funComponentList.$TipsDialog({
        content:"在request.ts触发的函数式组件",
        handleOk: (str) => {
            console.log("点击成功，可以在此处做回调操作。"+str);
        }
    });
}
```

项目截图：<br/>
<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4bd304c5249d4a9db4c79bd5ef1293e9~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4bd304c5249d4a9db4c79bd5ef1293e9~tplv-k3u1fbpfcp-watermark.image?)</a>

[项目地址](https://github.com/upJiang/jiangVue3Test) 项目目前引入了: i18n vuex
v-router less mock axios 封装 ant-design（按需加载） srntry 构建分包 env ts 的支
持 三种封装组件的形式。赏个 star~
