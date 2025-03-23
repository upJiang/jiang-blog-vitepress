续上一篇[vscode 插件开发入门](https://juejin.cn/post/7303451052598083622)，这里默认大家已经入门了，如果没入门的赶紧学习我的上一篇文章哦。

我们应该都在 `vscode` 中使用过有关 `chatGPT` 的插件吧，比如说打开一个 `chatGPT`的对话框，选中文案后让 `chatGPT` 解释这段文案。学完这篇文章后，你也可以做一个这样的插件！！！

本次要实现的功能

- 在侧边栏添加插件图标，点击图标后打开一个插件视图，视图中有两个按钮
  - 打开 `chatGPT 对话框`：可以与 `chatGPT` 进行问答
  - 设置：可以设置用户的 `chatGPT` 信息，这里需要你去购买一个 `openAi` 的转发 `apikey` ,毕竟调用 `chatGPT` 是需要付费的。推荐一个[网站](https://peiqi.shop/)购买，我也是在这里买的，注：本人无任何收益。
- 选中一段文案后，可以右键找到 `CodeToolBox => 解释这段文案`，自动唤起 `chatGPT 对话框`，自动提问

直接上视频看效果吧~，[视频地址](https://junfeng530.xyz/chatGPT.mp4)，ps: 掘金说我视频连接格式不对，没法上传。。。

[代码仓库地址](https://github.com/upJiang/jiang-vscode-plugin)，创作不易，觉得可以赏个 `star` 吧 🙏

## 在侧边栏添加插件图标

[vscode 内置图标库](https://microsoft.github.io/vscode-codicons/dist/codicon.html)

### `package.json` 添加设置

```
"contributes": {
    // 左侧侧边栏的容器设置，唯一标识 id 需要下方设置对应的 views，这里设置其名称、图标
    "viewsContainers": {
      "activitybar": [
        {
          "id": "CodeToolBox",
          "title": "CodeToolBox",
          "icon": "images/tool.png" // 自定义图标，请手动添加图片
        }
      ]
    },
    // 对应上方设置的唯一 id，设置这个标签点击打开后的视图，name是视图上方的名称
    "views": {
      "CodeToolBox": [
        {
          "id": "CodeToolBox.welcome",
          "name": "welcome",
        }
      ]
    },
    // 设置这个视图里面的内容，
    // 目前添加两个按钮（打开chatGPT对话框、设置）
    "viewsWelcome": [
      {
        "view": "CodeToolBox.welcome",
        "contents": "[打开chatGPT对话框](command:CodeToolBox.chatGPTView)\n[设置](command:CodeToolBox.openSetting)"
      }
    ],
}
```

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c743b26a1a554bb598d02e41326718ec~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=475&h=573&s=20705&e=png&b=181818">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c743b26a1a554bb598d02e41326718ec~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=475&h=573&s=20705&e=png&b=181818)</a>

下面把图示位置称为插件视图

### 添加插件设置

- `package.json` 添加设置按钮命令

```
"contributes": {
  "commands": [
    {
      "command": "CodeToolBox.openSetting",
      "title": "设置"
    },
  ],
}
```

- 新建 `/src/commands/createSetting.ts`

```
import { commands, ExtensionContext } from "vscode";

export const registerCreateSetting = (context: ExtensionContext) => {
  context.subscriptions.push(
    commands.registerCommand("CodeToolBox.openSetting", () => {
      // 打开插件设置
      commands.executeCommand("workbench.action.openSettings", "CodeToolBox");
    }),
  );
};
```

- 在 `src/extension.ts` 添加命令

```
import { registerCreateSetting } from "./commands/createSetting";
export function activate(context: vscode.ExtensionContext) {
  registerCreateSetting(context);
}
```

- `package.json` 添加插件的设置项

```
"contributes": {
  "configuration": {
        "type": "object",
        "title": "CodeToolBox",
        "properties": {
          "CodeToolBox.hostname": {
            "type": "string",
            "default": "api.openai.com",
            "description": "第三方代理地址"
          },
          "CodeToolBox.apiKey": {
            "type": "string",
            "default": "api.openai.com",
            "description": "第三方代理提供的apiKey"
          },
          "CodeToolBox.model": {
            "type": "string",
            "default": "gpt-3.5-turbo",
            "description": "chatGPT模型（默认：gpt-3.5-turbo）"
          }
        }
      }
  }
```

这样当点击设置时，插件的设置就会自动打开，这里必须设置两个值，一个是你购买的 `apiKey`，还有一个 `houtname`,如果你也是在我上面那个地址购买的应该是 `api.chatanywhere.com.cn`，这些设置后面需要获取然后传给 `webview` 去调 `openAI` 的接口

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/915d5402d236440d9be951c212d3a5b1~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=1525&h=665&s=81625&e=png&b=1e1e1e">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/915d5402d236440d9be951c212d3a5b1~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=1525&h=665&s=81625&e=png&b=1e1e1e)</a>

## 添加 chatGPT 对话框

需要实现：

- 点击 `打开chatGPT对话框` 按钮后在当前插件视图中切换到 `chatGPT对话框`
- 打开后当然需要关闭吧，所以我们要在视图上方添加设置按钮以及关闭按钮
- 后面再去编写这个 `chatGPT对话框` 的页面

### 实现切换 `chatGPT对话框`

- 在 `package.json` 添加配置

新增命令，我们需要下面三个命令，对应的 `title` 都很清楚了

```
"contributes": {
   {
        "command": "CodeToolBox.chatGPTView",
        "title": "chatGPT对话框"
    },
    {
        "command": "CodeToolBox.openChatGPTView",
        "title": "打开chatGPT对话框"
    },
    {
        "command": "CodeToolBox.hideChatGPTView",
        "title": "关闭chatGPT对话框",
        "icon": "$(close)"
    }
}
```

- 设置 `chatGPT对话框` 出现的时机

1. 当 `CodeToolBox.chatGPTView` 为 `false` 时就是那两个按钮的视图
2. 当 `CodeToolBox.chatGPTView` 为 `true` 时就是 `chatGPT对话框` 的视图

在 `package.json` 添加配置

```
"views": {
    "CodeToolBox": [
      {
        "id": "CodeToolBox.welcome",
        "name": "welcome",
        "when": "!CodeToolBox.chatGPTView"
      },
      {
        "type": "webview",
        "id": "CodeToolBox.chatGPTView",
        "name": "chatGPT",
        "when": "CodeToolBox.chatGPTView"
      }
    ]
  },
```

- 当插件视图为 `chatGPT对话框` 时，我们在其顶部添加两个按钮，设置与关闭

在 `package.json` 添加配置， 配置插件视图顶部，即 title

```
 "menus": {
   "view/title": [
        {
          "command": "CodeToolBox.hideChatGPTView",
          "when": "view == CodeToolBox.chatGPTView", // 当插件视图为 `chatGPT对话框` 时才出现
          "group": "navigation@4" // 分组是为了不让他两在同一个 `...` 出现
        },
        {
          "command": "CodeToolBox.openSetting",
          "when": "view == CodeToolBox.chatGPTView",
          "group": "navigation@3"
        }
      ]
 }
```

### 编写命令代码

- 配置完了，我们来编写命令的代码了，新建 `/src/commands/createChatGPTView.ts`

`CodeToolBox.chatGPTView`、`CodeToolBox.openChatGPTView`、`CodeToolBox.hideChatGPTView`，现在这里处理这三个命令

```
import {
  commands,
  ExtensionContext,
  WebviewView,
  WebviewViewProvider,
  window,
  workspace,
} from "vscode";
import { getHtmlForWebview } from "../utils/webviewUtils";

// 创建一个 webview 视图
let webviewViewProvider: MyWebviewViewProvider | undefined;

// 实现 Webview 视图提供者接口，以下内容都是 chatGPT 提供
class MyWebviewViewProvider implements WebviewViewProvider {
  public webview?: WebviewView["webview"];

  constructor(private context: ExtensionContext) {
    this.context = context;
  }
  resolveWebviewView(webviewView: WebviewView): void {
    this.webview = webviewView.webview;
    // 设置 enableScripts 选项为 true
    webviewView.webview.options = {
      enableScripts: true,
    };
    // 设置 Webview 的内容
    webviewView.webview.html = getHtmlForWebview(
      this.context,
      webviewView.webview,
    );

    webviewView.webview.onDidReceiveMessage(
      (message: {
        cmd: string;
        cbid: string;
        data: any;
        skipError?: boolean;
      }) => {
        // 监听webview反馈回来加载完成，初始化主动推送消息
        if (message.cmd === "webviewLoaded") {
          console.log("反馈消息:", message);
        }
      },
    );
  }

  // 销毁
  removeWebView() {
    this.webview = undefined;
  }
}

const openChatGPTView = (selectedText?: string) => {
  // 唤醒 chatGPT 视图
  commands.executeCommand("workbench.view.extension.CodeToolBox").then(() => {
    commands
      .executeCommand("setContext", "CodeToolBox.chatGPTView", true)
      .then(() => {
        const config = workspace.getConfiguration("CodeToolBox");
        const hostname = config.get("hostname");
        const apiKey = config.get("apiKey");
        const model = config.get("model");
        setTimeout(() => {
          // 发送任务,并传递参数
          if (!webviewViewProvider || !webviewViewProvider?.webview) {
            return;
          }
          webviewViewProvider.webview.postMessage({
            cmd: "vscodePushTask",
            task: "route",
            data: {
              path: "/chat-gpt-view",
              query: {
                hostname,
                apiKey,
                selectedText,
                model,
              },
            },
          });
        }, 500);
      });
  });
};

export const registerCreateChatGPTView = (context: ExtensionContext) => {
  // 注册 webview 视图
  webviewViewProvider = new MyWebviewViewProvider(context);
  context.subscriptions.push(
    window.registerWebviewViewProvider(
      "CodeToolBox.chatGPTView",
      webviewViewProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    ),
  );

  context.subscriptions.push(
    // 添加打开视图
    commands.registerCommand("CodeToolBox.openChatGPTView", () => {
      openChatGPTView();
    }),

    // 添加关闭视图
    commands.registerCommand("CodeToolBox.hideChatGPTView", () => {
      commands
        .executeCommand("setContext", "CodeToolBox.chatGPTView", false)
        .then(() => {
          webviewViewProvider?.removeWebView();
        });
    }),
  );
};
```

- 解释代码

  - 我们定一个 `MyWebviewViewProvider` 类，这个是 `webview` 视图的类型，初始化一个 `webviewViewProvider` 的实例，在 `resolveWebviewView` 这个方法中去设置 webview 里面的内容，有一些封装的方法在上一篇文章有，如果实在看不懂就下载我的代码下来研究吧。
  - 并且给 `webview` 发送消息，让它打开 `chat-gpt-view` 页面，传入 `hostname`、`apiKey`、`model`、`selectedText` 参数，其中 `selectedText` 这个参数是用户选中的文案，下面会介绍这个功能
  - 打开 `chatGPT聊天框` 其实就是下面代码，其实就是让 `vscode` 打开 `CodeToolBox` 插件后再设置 `CodeToolBox.chatGPTView` 为 `true`，前面我们在 `package.json` 设置的条件就会生效,就能切换到 `chatGPT聊天框` 了，然后再打开 `webview` 项目的页面

    ```
    commands.executeCommand("workbench.view.extension.CodeToolBox").then(() => {
    commands
      .executeCommand("setContext", "CodeToolBox.chatGPTView", true).then(()=>{

      })
    })
    ```

- 在 `src/extension.ts` 添加命令

```
import { registerCreateChatGPTView } from "./commands/createChatGPTView";
export function activate(context: vscode.ExtensionContext) {
  registerCreateChatGPTView(context);
}
```

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d17bdd13c4f24f6dbe3a8c5709bda099~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=573&h=994&s=44286&e=png&b=1a1a1a">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d17bdd13c4f24f6dbe3a8c5709bda099~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=573&h=994&s=44286&e=png&b=1a1a1a)</a>

## 编写 `chatGPT对话框` 页面

这里就是自己写一个 `chatGPT对话框` 的页面，我上一篇文章有提到 `webview` 项目的创建，这里我使用的 `vue2+vite`，打包的时候必须要要打包成一个 `js` 才能在 `vscode` 中使用，所以这里建议大家跟我使用一样的，可以直接拉代码看我的项目吧，避免踩坑。

- 一个聊天对话框的页面相信大家都会写，这里有个关键点就是 `openAI` 返回的数据其实一段字符串，我们需要去解析它，并让它以 `markdown` 的格式输出，并且要逐字输出
- 因为 `openAI` 自带的流式输出我不知道如何监听获取，所以我这里是直接获取整个答案文本，使用 `requestAnimationFrame` 逐字输出
- 这里我使用的 `markdown-it`、 `markdown-it-code-copy`、`markdown-it-highlightjs` 这三个插件，封装了一个渲染返回数据的组件，可供大家参考一下

需要安装四个依赖

```
yarn add highlightjs markdown-it markdown-it-code-copy markdown-it-highlightjs
```

组件代码：`CodeDisplay.vue`

```
<template>
  <div class="code-container">
    <div v-html="markdown.render(answer)"></div>
  </div>
</template>

<script lang="ts" setup>
import MarkdownIt from "markdown-it";
import markdownItCodeCopy from "markdown-it-code-copy";
import markdownItHighlightjs from "markdown-it-highlightjs";

const markdown = new MarkdownIt()
  .use(markdownItHighlightjs)
  .use(markdownItCodeCopy);

defineProps({
  answer: {
    type: String,
    required: true,
  },
});
</script>

<style>
@import url("highlightjs/styles/default.css");
</style>

```

- 贴一下自己的页面代码、关键方法以及样式吧

页面模板文件：`index.vue`

```
<template>
  <div class="chat-container">
    <div class="messages-container" ref="scrollContainer">
      <div class="empty-item"></div>
      <div
        :class="['message-item', item.role]"
        v-for="item in model.messageList.value"
        :key="item.content"
      >
        <CodeDisplay :answer="item.content" />
        <span class="time">{{ item.time }}</span>
      </div>
      <div class="loading-container" v-if="model.loading.value">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    </div>
    <div class="input-container">
      <a-input
        v-model:value="model.userInput.value"
        class="user-input"
        placeholder="请输入您的问题"
        @keyup.enter="presenter.sendMessageEnter"
      />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { nextTick, ref, watch } from "vue";

import CodeDisplay from "../components/CodeDisplay.vue";
import { usePresenter } from "./presenter";

const presenter = usePresenter();
const { model } = presenter;

const scrollContainer = ref();

watch(
  () => [model.messageList.value, model.loading.value],
  () => {
    nextTick(() => {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    });
  },
  {
    deep: true,
  },
);
</script>
<style scoped lang="scss">
@import url("./index.scss");
</style>
<style>
.dot {
  width: 12px;
  height: 12px;
  margin: 0 5px;

  opacity: 0;
  background-color: #fff;
  border-radius: 50%;

  animation: fadeIn 1.6s forwards infinite;
}

@import url("./index.scss");
</style>

```

页面数据：`model.ts`

```
import { ref } from "vue";
import { useRoute } from "vue-router";

import type { Message } from "./api";

export const useModel = () => {
  // 当前调用的域名
  const hostname = (useRoute().query.hostname as string) || "";
  const apiKey = (useRoute().query.apiKey as string) || "";
  const model = (useRoute().query.model as string) || "";

  // 消息列表
  const messageList = ref<Message[]>([]);

  // 用户输入
  const userInput = ref("");

  // 是否在加载
  const loading = ref(false);

  // 是否能重新提交,在加载已经流式输出时不能重新提交
  const canSubmit = ref(true);

  return {
    messageList,
    userInput,
    hostname,
    apiKey,
    loading,
    canSubmit,
    model,
  };
};

export type Model = ReturnType<typeof useModel>;
```

方法文件：`service.ts`

```
import { fetchChatGPTQuestion } from "./api";
import { Model } from "./model";

export default class Service {
  private model: Model;

  constructor(model: Model) {
    this.model = model;
  }

  async askQuestion() {
    try {
      this.model.loading.value = true;
      this.model.canSubmit.value = false;
      const res = await fetchChatGPTQuestion({
        houseName: this.model.hostname,
        apiKey: this.model.apiKey,
        messages: this.model.messageList.value,
        model: this.model.model,
      });

      if (res?.choices && res?.choices.length) {
        this.model.messageList.value.push({
          content: "",
          role: "system",
          time: new Date().toLocaleString(),
        });
        this.showText(res.choices[0].message.content);
      }
    } catch (error) {
      this.model.messageList.value.push({
        content: "",
        role: "system",
        time: new Date().toLocaleString(),
      });
      this.showText("sorry，未搜索到答案");
      this.model.canSubmit.value = true;
    } finally {
      this.model.loading.value = false;
    }
  }

  showText(orginText: string) {
    let currentIndex = 0;
    const animate = () => {
      this.model.messageList.value[
        this.model.messageList.value.length - 1
      ].content += orginText[currentIndex];
      currentIndex++;

      if (currentIndex < orginText.length) {
        const timeout = setTimeout(() => {
          requestAnimationFrame(animate);
          // requestAnimationFrame 感觉太快了，延迟一下
          if (currentIndex === orginText.length - 1) {
            this.model.canSubmit.value = true;
          }
          clearTimeout(timeout);
        }, 30);
      }
    };
    animate();
  }
}
```

接口文件：`api.ts`

```
import { request } from "@/utils/request";

interface IFetchChatGPTQuestionResult {
  choices: {
    finish_reason: string;
    index: number;
    message: {
      content: string;
      role: string;
    };
  }[];
}
interface IFetchChatGPTQuestionParams {
  houseName: string;
  apiKey: string;
  model: string;
  messages: Message[];
}

export interface Message {
  content: string;
  role: "user" | "system";
  time: string;
}
// POST 请求示例
export function fetchChatGPTQuestion(data: IFetchChatGPTQuestionParams) {
  return request<IFetchChatGPTQuestionResult>({
    url: `https://${data.houseName}/v1/chat/completions`,
    method: "POST",
    data: {
      model: data.model,
      messages: data.messages,
    },
    headers: {
      Authorization: `Bearer ${data.apiKey}`,
    },
  });
}
```

方法驱动文件：`presenter.tsx`

```
import { watch } from "vue";
import { useRoute } from "vue-router";

import { useModel } from "./model";
import Service from "./service";

export const usePresenter = () => {
  const model = useModel();
  const service = new Service(model);
  const route = useRoute();

  // 发送消息
  const sendMessage = (content: string) => {
    model.messageList.value.push({
      content,
      role: "user",
      time: new Date().toLocaleString(),
    });
    service.askQuestion();
    model.userInput.value = "";
  };

  // 回车发送
  const sendMessageEnter = () => {
    if (model.userInput.value && model.canSubmit.value) {
      sendMessage(model.userInput.value);
    }
  };

  watch(
    () => route.query?.selectedText,
    () => {
      if (route.query?.selectedText && model.canSubmit.value) {
        sendMessage(`${route.query.selectedText}, 请帮我解释这段文案`);
      }
    },
    {
      immediate: true,
    },
  );

  return {
    model,
    service,
    sendMessageEnter,
    sendMessage,
  };
};
```

ps：总感觉这样贴代码很罗嗦，但也怕大家看不懂，下面看看效果图：

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/70de60299e8943d6b714091067886e7c~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=449&h=336&s=13002&e=png&b=1d1d1d">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/70de60299e8943d6b714091067886e7c~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=449&h=336&s=13002&e=png&b=1d1d1d)</a>

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2bebdc49d4094739a88a7b03b11f7c4f~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=395&h=959&s=32878&e=png&b=f0f0f0">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2bebdc49d4094739a88a7b03b11f7c4f~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=395&h=959&s=32878&e=png&b=f0f0f0)</a>

至此，`chatGPT 对话框` 的动能就算完成了~

## 实现选中文案自动打开 `chatGPT 对话框`

这里要实现的功能：用户选中编辑器的一段文案后，右键找到 `CodeToolBox => 解释这段文案`，自动唤起 `chatGPT 对话框`，并自动提问

- 在 `package.json` 添加命令 `explainByChatGPT` 命令

```
"contributes": {
    "commands": [
      {
        "command": "CodeToolBox.explainByChatGPT",
        "title": "解释这段文案"
      }
    ],
    // 添加右键菜单
    "editor/context": [
      {
        "submenu": "CodeToolBox/editor/context" // 设置编辑视图中的右键菜单
      }
    ],
    "submenus": [
      {
        "id": "CodeToolBox/editor/context", // 定义id便于今后添加更多的右键菜单
        "label": "CodeToolBox",
        "icon": "$(octoface)"
      }
    ],
    "CodeToolBox/editor/context": [
        {
          "command": "CodeToolBox.explainByChatGPT" // 添加解释这段文案右键菜单
        }
    ]
}
```

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/94f3a6dca4f14033b0990d92b1e19775~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=500&h=81&s=5021&e=png&b=202020">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/94f3a6dca4f14033b0990d92b1e19775~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=500&h=81&s=5021&e=png&b=202020)</a>

- 编辑 `/src/commands/createChatGPTView.ts`，添加命令代码

```
export const registerCreateChatGPTView = (context: ExtensionContext) => {
    context.subscriptions.push(
        // 添加解释这段文案
        commands.registerCommand("CodeToolBox.explainByChatGPT", () => {
        // 获取当前活动的文本编辑器
        const editor = window.activeTextEditor;

        if (editor) {
            // 获取用户选中的文本
            const selectedText = editor.document.getText(editor.selection);
            if (!selectedText) {
            window.showInformationMessage("没有选中的文本");
            return;
            }

            // 获取本插件的设置
            const config = workspace.getConfiguration("CodeToolBox");
            const hostname = config.get("hostname");
            const apiKey = config.get("apiKey");
            if (!hostname) {
            window.showInformationMessage(
                "请先设置插件 CodeToolBox 的 hostname，点击左侧标签栏 CodeToolBox 的图标进行设置",
            );
            return;
            }
            if (!apiKey) {
            window.showInformationMessage(
                "请先设置插件 CodeToolBox 的 apiKey，点击左侧标签栏 CodeToolBox 的图标进行设置",
            );
            return;
            }
            // 打开左侧的 chatGPT 对话框,并传入问题
            openChatGPTView(selectedText);
        } else {
            window.showInformationMessage("没有活动的文本编辑器");
        }
        }),
    )
};
```

这里会获取用户选中的文本，若没有选中文本则会提示，调用 `openChatGPTView`方法，传递 `hostname、apiKey、model、selectedText` 参数给 webview 进行处理，接收到 `selectedText` 的值就会自动提问。

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e1f4408964ac4e72bef9212284a827a9~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=1162&h=994&s=170903&e=png&b=1f1f1f">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e1f4408964ac4e72bef9212284a827a9~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=1162&h=994&s=170903&e=png&b=1f1f1f)</a>

至此，功能就算做完拉
