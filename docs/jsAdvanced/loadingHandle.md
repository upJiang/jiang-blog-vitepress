>页面在请求接口时，我们通常会加一个loading状态。如果有多个请求，当所有请求都结束才结束loading状态，这个时候你会怎么做？是在页面级上一个个加promise，await，promise.all去处理吗？这种方式确实可以，但是太繁琐了。这里我将教大家在axios的配置文件中去全局封装可以控制多个请求loading的开始与结束，以及接口是否需要loading。

在这里我以vue3项目为例，其它框架也是一样的，方法思路都一样，最核心的思想就是在接口封装文件中，通过请求数的增减来控制loading的展示与关闭，通过接口传参控制是否需要loading以及是否需要延迟合并串行的下一个请求。

## 设置全局变量loading
我们首先需要一个全局变量，这个变量可以控制loading的开始与结束，这里我使用vuex

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
## loading动画
在App.vue中做一个loading动画，这个loading动画应该是绝对定位的，如果是有骨架的页面，则需要在layout那些页面中写，应该都懂。这里我是用ant-design的spin组件做的loading动画效果，通过vuex的loading变量控制显示
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
  width: 100%;
  height: 100%;
  
  display: flex;
  align-items: center;
  justify-content: center;
  
  z-index: 999;
  
  background-color: rgba(255, 255, 255, 0.4);
}
</style>
```
## request.ts封装
思路：设置一个请求数reqNum，每有一个请求开始则+1，开始loading状态，请求结束则-1，当请求数reqNum为0时，结束loading状态。

通过传入的loading变量，判断是否要开始loading<br/>
如果是串行请求需要增加delay变量，判断是否需要添加延迟，合并下一个串行请求（同步请求），如果是异步的并行请求则不需要传，否则loading会出现一闪一闪的情况。因为项目中串行的情况还是比较少的，所以这里选择增加一个变量控制，延迟设置为150ms，emmmmmm，感觉应该还可以更小一些

/src/config/request.ts
```
//每个人的requst封装可能不同，但思路都是一样的

import { store } from "@/store/index";
let reqNum = 0;
const startLoading = () => {
  if (reqNum === 0) {
    //loading开始
    store.commit("common/setLoading", true);
  }
  reqNum++;
};
const endLoading = () => {
  if (reqNum <= 0) return;
  reqNum--;
  if (reqNum === 0) {
    //loading结束
    store.commit("common/setLoading", false);
  }
};

const request = (options: AxiosRequestConfig = {}, loading = false , delay = false) => {
  //请求开始的时候，判断是否有传loading，为true则开始loading
  loading && startLoading();
  return new Promise<ApiResult>((resolve, reject) => {
    instance(options)
      .then((response: AxiosResponse) => {
          //结束loading，如果传了delay为true，则延迟150ms用于合并下一个串行请求
          setTimeout(
          () => {
            endLoading();
          },
          delay ? 150 : 0
        );
      })
      .catch((result) => {
       //结束loading
       endLoading();
      });
  });
};
```
## api文件封装与传参
其它都不重要，注意loading的参数位置，后面调用方法的时候，传loading参数进来判断是否loading，loading默认为false

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
## 运行
/src/views/Home.vue
```
<template>
<a-button @click="clickAllLoading">点击测试多个请求实现loading</a-button>
</template>

import { requestTest1, requestTest2 } from "@/api/apiTest";
const clickAllLoading = () => {
 // 模拟串行,如果是串行请求，需要在所有非最后一个请求中加delay为true，传两个true，下面跟使用await是一样的
  requestTest1({}, true, true).then((res) => {
    console.log("请求1完成", res);
    //模拟增加延迟，因为我这个是假的请求，使用的mock
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

## 总结
通过全局变量控制loading的显示隐藏，设置全局loading动画，在请求封装文件中通过控制请求数去实现多个请求的loading控制，在api文件中通过传参控制控制是否需要loading，以及是否需要延迟合并串行的下一个请求。这个弄好之后，以后需要页面loading的接口，只需要传参到api文件的接口接收即可，再也不用在页面级上一个个去写了，最关键的就是通过请求数去合并请求以及串行的延迟合并处理，其它都没啥~觉得可以点个赞

[项目代码地址](https://github.com/upJiang/jiangVue3Test)





