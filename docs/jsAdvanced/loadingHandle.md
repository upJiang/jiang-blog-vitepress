>页面在请求接口时，我们通常会加一个 loading 状态。如果有多个请求，当所有请求都结束才结束 loading 状态，这个时候你会怎么做？是在页面级上一个个加 promise，await，promise.all 去处理吗？这种方式确实可以，但是太繁琐了。这里我将教大家在 axios 的配置文件中去全局封装可以控制多个请求 loading 的开始与结束，以及接口是否需要 loading。

在这里我以 vue3 项目为例，其它框架也是一样的，方法思路都一样，最核心的思想就是在接口封装文件中，通过请求数的增减来控制 loading 的展示与关闭，通过接口传参控制是否需要 loading 以及是否需要延迟合并串行的下一个请求。

## 设置全局变量 loading
我们首先需要一个全局变量，这个变量可以控制 loading 的开始与结束，这里我使用 vuex

/src/store/modules/common.ts
```
import { Module } from "vuex";
import { State as RootState } from "../index";

export interface State {
  loading: boolean;
}

const state = {
  loading: false
};

const mutations = {
  setLoading(state, flag: boolean) {
    state.loading = flag;
  },
};

export default {
  namespaced: true,
  state,
  mutations,
} as Module<State, RootState>;

```
## 在 App.vue 中做一个全局 loading 动画
在 App.vue 中做一个 loading 动画，这个 loading 动画应该是绝对定位的，如果是有骨架的页面，则需要在 layout 那些页面中写，应该都懂。这里我是用 ant-design 的 spin 组件做的 loading 动画效果，通过 vuex 的 loading 变量控制显示
```
<template>
  <div class="spin-loading-container" v-if="$store.state.common.loading">
    <a-spin></a-spin>
  </div>
  <router-view />
</template>

<style lang="less">
.spin-loading-container {
  position: absolute;

  display: flex;
  align-items: center;
  justify-content: center;
  
  width: 100%;
  height: 100%;
  
  z-index: 999;
  
  background-color: rgba(255, 255, 255, 0.4);
}
</style>
```
## 在 request.ts 中通过请求开始与结束状态控制 loading 的开始与结束
思路：设置一个请求数 reqNum，每有一个请求开始则+1，开始 loading 状态，请求结束则-1，当请求数 reqNum 为0时，结束 loading 状态。

通过传入的 loading 变量，判断是否要开始 loading <br/>
如果是串行请求需要增加 delay 变量，判断是否需要添加延迟，合并下一个串行请求（同步请求），如果是异步的并行请求则不需要传，否则 loading 会出现一闪一闪的情况。因为项目中串行的情况还是比较少的，所以这里选择增加一个变量控制，延迟设置为150ms，emmmmmm，感觉应该还可以更小一些

/src/config/request.ts
```
//每个人的 requst 封装可能不同，但思路都是一样的

import { store } from "@/store/index";
let reqNum = 0;
const startLoading = () => {
  if (reqNum === 0) {
    //loading 开始
    store.commit("common/setLoading", true);
  }
  reqNum++;
};
const endLoading = () => {
  if (reqNum <= 0) return;
  reqNum--;
  if (reqNum === 0) {
    //loading 结束
    store.commit("common/setLoading", false);
  }
};

const request = (options: AxiosRequestConfig = {}, loading = false , delay = false) => {
  //请求开始的时候，判断是否有传 loading，为 true 则开始 loading
  loading && startLoading();
  return new Promise<ApiResult>((resolve, reject) => {
    instance(options)
      .then((response: AxiosResponse) => {
          //结束 loading，如果传了 delay 为 true，则延迟150ms用于合并下一个串行请求
          loading && setTimeout(
          () => {
            endLoading();
          },
          delay ? 150 : 0
        );
      })
      .catch((result) => {
       //结束 loading
       endLoading();
      });
  });
};
```
## 在 api 文件中设置请求接口，以及传参方式
其它都不重要，注意loading的参数位置，后面调用方法的时候，传 loading 参数进来判断是否 loading， loading 默认为 false

/src/api/apiTest.ts
```
export const requestTest1 = (data: object, loading = false, delay = false) => {
  return request(
    {
      url: "/mock/getUser",
      method: "GET",
      data,
    },
    loading,
    delay
  );
};

export const requestTest2 = (data: object, loading = false) => {
  return request(
    {
      url: "/mock/getUser",
      method: "GET",
      data,
    },
    loading
  );
};
```
## 在页面中使用看看
/src/views/Home.vue
```
<template>
<a-button @click="clickAllLoading">点击测试多个请求实现loading</a-button>
</template>

import { requestTest1, requestTest2 } from "@/api/apiTest";
const clickAllLoading = () => {
 // 模拟串行,如果是串行请求，需要在所有非最后一个请求中加 delay 为 true，传两个 true，下面跟使用 await 是一样的
  requestTest1({}, true, true).then((res) => {
    console.log("请求1完成", res);
    //模拟增加延迟，因为我这个是假的请求，使用的 mock
    setTimeout(() => {
      requestTest2({}, true).then((res) => {
        console.log("请求2完成", res);
      });
    }, 50);
  });

  // 模拟并行
  requestTest1({}, true).then((res) => {
    console.log("请求1完成", res);
  });
  requestTest2({}, true).then((res) => {
    console.log("请求2完成", res);
  });
};
```
点击运行结果


![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6e6899cb3a82467aa4ea0db3c3b438ec~tplv-k3u1fbpfcp-watermark.image?)

总结：通过全局变量控制 loading 的显示隐藏，设置全局 loading 动画，在请求封装文件中通过控制请求数去实现多个请求的 loading 控制，在 api 文件中通过传参控制控制是否需要 loading，以及是否需要延迟合并串行的下一个请求。这个弄好之后，以后需要页面 loading 的接口，只需要传参到 api 文件的接口接收即可，再也不用在页面级上一个个去写了，最关键的就是通过请求数去合并请求以及串行的延迟合并处理，其它都没啥~觉得可以点个赞

[项目代码地址](https://github.com/upJiang/jiangVue3Test)





