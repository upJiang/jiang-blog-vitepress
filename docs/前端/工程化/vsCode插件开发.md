>vscode 是前端开发的利器，大家平时会使用很多插件，但有没有想过自己开发一个插件来满足自己特定的开发需求。比如很多重复的代码，可以直接用插件一键生成。现在我们一起从 0 - 1 做一个你自己的 vscode 插件~~~

**该文章能够让你入门 `vscode` 插件开发，发布插件，学会 `vscode` 与 `webview` 之间的通信，在 vscode 中添加各种操作菜单，生成代码等。**

插件实现两个功能：
- **能够在文件夹上右键自动生成配置好的代码文件**
- **能够在 webview 上填写代码片段内容，并在 vscode 中应用。**

[中文教程参考](https://liiked.github.io/VS-Code-Extension-Doc-ZH/#/)

有不懂的地方可以直接下载代码，[插件项目地址](https://github.com/upJiang/jiang-vscode-plugin)


**先学习创建插件项目，调试，以及发布的完整过程。**
## 创建项目
- 安装官方脚手架

```
npm install -g yo generator-code
```
- 执行，生成项目
```
yo code
```

在 `package.json` 中设置插件图标，在根目录下添加文件与图片
```
"icon": "images/title.jpg"
```
 
- `f5` 运行插件，会自动打开一个扩展开发宿主

## 发布插件
- 全局安装插件发布工具
```
npm install -g vsce
```
- 项目打包
```
vsce package
```

- 创建 `Azure Personal Access Token`，用于发布
- 打开 [Azure官网](https://aex.dev.azure.com) ，注册好账号后，在这里创建 token，设置期限最长为一年，`Scopes` 直接选择 `Full access`。保存好创建的 `token`

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7c9d1e2d1abb4b31a4444f134a6e8af0~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=415&h=431&s=25374&e=png&b=fbfbfb">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7c9d1e2d1abb4b31a4444f134a6e8af0~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=415&h=431&s=25374&e=png&b=fbfbfb)</a>

- 创建发行方
打开 [创建发行方地址](https://aka.ms/vscode-create-publisher )，填一个与项目 `publisher` 一致的名字，直接创建即可

- 开始发布
```
# 登录
vsce login (publisher name)

# 发布
vsce publish 2.0.1

# 直接登录然后立即发布插件：
vsce publish -p <token>
```

然后过几分钟，再搜索一下自己的插件名称，就能搜到啦

- 本地打包并安装
```
vsce package
```
会在根目录生成一个 `.vsix` 文件，然后直接在扩展那里选择 `从 VSLX 安装` 即可

插件项目的常规配置，比如 `eslint` `prettier`
[参考我的文章](https://juejin.cn/post/7051512232374435847)

## Hello World 初尝试
**插件的开发过程：**
- 在 `package.json` 中注册 `command`，设置 `command` 出现的位置、`title`，菜单、子菜单 等
- 在生成的插件项目中，`src` 下的 `extension.ts` 是插件的入口文件，所有的 `command`，都要在这里注册，并且命令 (`command`) 必须与`package.json` 中注册的 `command`一致。

实践一下：
- 在 `package.json` 中添加 `command`，这里实现两个小功能。<br/>
1. 弹出一个消息提示 <br/>
2. 打开一个 `webview`
```
"contributes": {
    "commands": [
      {
        "command": "CodeToolBox.helloWorld",
        "title": "Hello World"
      },
      {
        "command": "CodeToolBox.webview",
        "title": "打开webview",
      }
    ]
  },
```
- 然后在 `extension.ts` 注册这两个 `command`
```
import * as vscode from "vscode";

// 一旦你的插件激活，vscode会立刻调用下述方法
export function activate(context: vscode.ExtensionContext) {
  // 命令中输入弹出信息
  let disposable = vscode.commands.registerCommand(
    "CodeToolBox.helloWorld",
    () => {
      // 给用户显示一个消息提示
      vscode.window.showInformationMessage(
        "Hello World from CodeToolBox!!!!>>>>",
      );
    },
  );

  const webviewTest = vscode.commands.registerCommand("CodeToolBox.webview", () => {
    // 创建并显示新的webview
    const panel = vscode.window.createWebviewPanel(
      "webview", // 只供内部使用，这个webview的标识
      "打开webview", // 给用户显示的面板标题，webview 的title
      vscode.ViewColumn.One, // 给新的webview面板一个编辑器视图
      {}, // Webview选项。我们稍后会用上
    );
    // 设置HTML内容
    panel.webview.html = getWebviewContent();
  });

  function getWebviewContent() {
    return `
	<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Cat Coding</title>
	</head>
	<body>
		<img src="https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" width="300" />
	</body>
	</html>
	`;
  }

  // 注册
  context.subscriptions.push(disposable);
  context.subscriptions.push(webviewTest);
}

// 插件关闭前执行清理工作
export function deactivate() {}
```
重新运行，然后在新窗口输入 `Hello World` 或者 `打开webview`，就能看到效果

在 `​​VSCode​​​` 命令面板中，输入​ `​Open Webview Developer Tools​​` ​后可以打开 `​​Webview` ​​的控制台

## 开发功能：在文件夹上右键生成代码文件
在做之前先优化一下项目目录
- 在 `src` 目录下新建 `commands` 文件夹，用于存放所有的命令
- 在根目录下新建 `materials` 文件夹，用于存放要生成的代码文件模板
- 在 `materials` 下新建 `block` 文件夹，写入四个模板文件

1. `index.vue`
```
<template>
  <div>{{ model.name.value }}</div>
</template>
<script lang="ts" setup>
import { usePresenter } from './presenter'

const presenter = usePresenter()
const { model } = presenter
</script>
```
2. `model.ts`
```
import { reactive, ref } from 'vue'

export const useModel = () => {
  const name = ref('vue-mvp')
  return { name }
}

export type Model = ReturnType<typeof useModel>
```
3. `presenter.tsx`
```
import Service from './service'
import { useModel } from './model'

export const usePresenter = () => {
  const model = useModel()
  const service = new Service(model)

  return {
    model,
    service,
  }
}
```
4. `service.ts`
```
import { Model } from './model'

export default class Service {
  private model: Model

  constructor(model: Model) {
    this.model = model
  }
}
```
此时的项目的目录结构应该为：

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/06ca417f440743f49c9cce1d28f1a2eb~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=355&h=517&s=23440&e=png&b=191919">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/06ca417f440743f49c9cce1d28f1a2eb~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=355&h=517&s=23440&e=png&b=191919)</a>

### 在 `package.json` 中注册 `command`
要实现的目标是：选中文件夹后右键出现 `CodeToolBox` 菜单，点击 `创建区块`，将 `materials/blocks` 的内容自动生成到该文件夹中

`package.json`
```
"contributes": {
    "commands": [
      {
        "command": "CodeToolBox.createScript",
        "title": "创建区块"
      }
    ],
    "menus": {
      "explorer/context": [
        {
          "submenu": "CodeToolBox/explorer/context", // 设置一个子菜单组，必须在 submenus 同时声明
          "when": "explorerResourceIsFolder" // 当在文件资源管理器右键时出现
        }
      ],
      "CodeToolBox/explorer/context": [
        {
          "command": "CodeToolBox.createScript" // 声明右键时出现该命令
        }
      ]
    },
    "submenus": [
      {
        "id": "CodeToolBox/explorer/context",
        "label": "CodeToolBox",
        "icon": "$(octoface)"
      }
    ]
  },
```
实现的效果：

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/432e38c5aa13415c927e101f9a6b6bfd~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=600&h=645&s=70767&e=png&b=1f1f1f">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/432e38c5aa13415c927e101f9a6b6bfd~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=600&h=645&s=70767&e=png&b=1f1f1f)</a>

### 新增 `src/commands/createScript.ts`
以下代码大部分都是 `chatGPT` 帮写的，提问内容
```
请帮我写个vscode插件项目，使用ts帮我写个方法，以当前右键文件夹位置作为目标源，指定某个目录的文件夹内容为来源，复制来源的所有内容到目标源中
```

```
yarn add fs-extra

解决ts报错，在根目录下添加 fs.d.ts，写入 declare module "fs-extra";
```

```
import * as vscode from "vscode";
import * as path from "path";
import { commands, ExtensionContext } from "vscode";
import * as fs from "fs-extra";

export const registerCreateScript = (context: ExtensionContext) => {
  context.subscriptions.push(
    commands.registerCommand("CodeToolBox.createScript", async (args) => {
      const rootPath = vscode.workspace.rootPath || ""; // 获取当前右键文件夹位置作为目标源
      // 指定复制源位置
      const sourceFolderPath = path.join(rootPath, "materials", "blocks");
      const targetFolderPath = args._fsPath;

      if (!sourceFolderPath) {
        vscode.window.showErrorMessage("请选择来源文件夹");
        return;
      }

      if (!targetFolderPath) {
        vscode.window.showErrorMessage("请选择目标文件夹");
        return;
      }

      try {
        await copyDirectoryContents(sourceFolderPath, targetFolderPath);
        vscode.window.showInformationMessage("复制文件夹内容成功");
      } catch (error) {
        vscode.window.showErrorMessage(`复制文件夹内容失败`);
      }
    }),
  );
};

async function copyDirectoryContents(sourcePath: string, targetPath: string) {
  // 确保目标目录存在，如果不存在则创建
  await fs.ensureDir(targetPath);

  // 获取源目录的内容列表
  const sourceItems = await fs.readdir(sourcePath);

  // 遍历源目录的内容
  for (const sourceItem of sourceItems) {
    const sourceItemPath = path.join(sourcePath, sourceItem);
    const targetItemPath = path.join(targetPath, sourceItem);

    // 判断是文件还是文件夹
    const isDirectory = (await fs.stat(sourceItemPath)).isDirectory();

    if (isDirectory) {
      // 如果是文件夹，递归复制子文件夹
      await copyDirectoryContents(sourceItemPath, targetItemPath);
    } else {
      // 如果是文件，直接复制
      await fs.copyFile(sourceItemPath, targetItemPath);
    }
  }
}
```
### 在 extension.ts 中注册 registerCreateScript
```
import * as vscode from "vscode";
import { registerCreateScript } from "./commands/createScript";

export function activate(context: vscode.ExtensionContext) {
  registerCreateScript(context);
}

export function deactivate() {}
```

f5 重新启动后，在扩展宿主页面中，新建一个空项目，新增 `materials/blocks` 文件夹，写入前面的四个文件，新建 `src` 文件夹，然后在 `src` 中右键，选中 `CodeToolBox`-> `创建区块`，就能在该文件夹下自动生成文件啦。今后如果有很多代码可以重复使用的，都可以添加到 `materials` 中，然后添加多个不同的 `command` 去自动生成文件内容。

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3a0d1d04b73b4bc794c21b0e96e9abfd~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=297&h=241&s=8501&e=png&b=181818">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3a0d1d04b73b4bc794c21b0e96e9abfd~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=297&h=241&s=8501&e=png&b=181818)</a>


## 功能开发：在webview 上填写代码片段内容，并在 vscode 中应用
- 在根目录下创建 `webview-vue` 项目，要求使用 `vue3 + vite` 创建新项目，因为下面只介绍 `vite` 的打包处理过程
- 创建项目，创建后项目配置这里不做介绍，自行编写页面，引入路由，引入组件库，[加入规范参考文章](https://juejin.cn/post/7051512232374435847) 等
```
## 安装 Vue CLI
npm install -g @vue/cli

## 创建项目
vue create my-vue3-project
```
- 在插件项目中的 `package.json` 添加命令，用于执行 `webview-vue` 项目
```
"dev": "yarn --cwd \"webview-vue\" dev",
```
### 在 `package.json` 添加 `command`
```
"contributes": {
  "commands": [
    {
      "command": "CodeToolBox.createSnippets", // 添加创建代码片段命令
      "title": "创建代码片段"
    }
  ],
  "menus": {
    "editor/context": [
      {
        "submenu": "CodeToolBox/editor/context" // 此处是直接在 vscode 中开发视图中右键中打开，同样设置子菜单
      }
    ],
    "CodeToolBox/editor/context": [
      {
        "command": "CodeToolBox.createSnippets" 
      }
    ]
  },
  "submenus": [
    {
      "id": "CodeToolBox/editor/context", // 注册子菜单
      "label": "CodeToolBox",
      "icon": "$(octoface)"
    }
  ],
},

```
### 在 `src\commands` 下新增 `createSnippets.ts`，
```
import { commands, ExtensionContext } from "vscode";
import { showWebView } from "../utils/webviewUtils";

export const registerCreateSnippets = (context: ExtensionContext) => {
  context.subscriptions.push(
    commands.registerCommand("CodeToolBox.createSnippets", async () => {
      showWebView(context, {
        key: "main",
        title: "添加代码片段",
        viewColumn: 1,
        task: {
          task: "route",
          data: {
            path: "/add-snippets",
          },
        },
      });
    }),
  );
};
```
### 在 `extension.ts` 注册 `command`
```
import { registerCreateSnippets } from "./commands/createSnippets";
export function activate(context: vscode.ExtensionContext) {
  registerCreateSnippets(context);
}
```
### 封装打开 webview 的通用方法
- 在 `src` 下新建 `utils/webviewUtils.ts`，此处用于封装打开 webview 的方法，发送信息，接收 `webview` 返回的信息，然后去派发任务。
代码中都有详尽的说明，此处只封装了一个路由跳转的任务派发，往后可以添加更多的任务，甚至将文件拆分的更细，学会后自己扩展即可。
```
import * as vscode from "vscode";
import * as snippet from "../webview/controllers/addSnippets";

const path = require("path");

// webview key，后期用于区分任务
type WebViewKeys = "main";
// webview 任务的类型
type Tasks = "addSnippets" | "route";

// 当前的webview列表
let webviewPanelList: {
  key: WebViewKeys; // key
  panel: vscode.WebviewPanel; // 视图
  disposables: vscode.Disposable[]; // 管理资源，比如销毁
}[] = [];

// 创建webview
export const showWebView = (
  context: vscode.ExtensionContext,
  options: {
    key: WebViewKeys; // webview key
    title?: string; // webview 标题
    viewColumn?: vscode.ViewColumn; // 视图数量
    task?: { task: Tasks; data?: any }; // webview 打开后执行命令，比如转到指定路由
  },
) => {
  // 先判断，webview是否存在了，存在了则不新增，传递消息给webview处理后续
  const webview = webviewPanelList.find((s) => s.key === options.key);

  if (webview) {
    webview.panel.reveal(); // 显示webview
    // 传递任务
    if (options.task) {
      webview.panel.webview.postMessage({
        cmd: "vscodePushTask",
        task: options.task.task,
        data: options.task.data,
      });
    }
  } else {
    const panel = vscode.window.createWebviewPanel(
      "CodeToolBox",
      options.title || "CodeToolBox",
      {
        viewColumn: options.viewColumn || vscode.ViewColumn.Two,
      },
      {
        enableScripts: true,
        retainContextWhenHidden: true, // webview被隐藏时保持状态，避免被重置
      },
    );
    // 设置icon
    panel.iconPath = vscode.Uri.file(
      path.join(context.extensionPath, "images", "title.jpg"),
    );
    panel.webview.html = getHtmlForWebview(context, panel);

    // 创建监听器，监听 webview 返回信息，
    // 在webview中会通过 vscode.postMessage{command: 'someCommand',data: { /* 你的数据 */ },} 发送信息

    // 创建资源管理列表
    const disposables: vscode.Disposable[] = [];
    panel.webview.onDidReceiveMessage(
      async (message: {
        cmd: string;
        cbid: string;
        data: any;
        skipError?: boolean;
      }) => {
        // 监听webview反馈回来加载完成，初始化主动推送消息
        if (message.cmd === "webviewLoaded") {
          if (options.task) {
            panel.webview.postMessage({
              cmd: "vscodePushTask",
              task: options?.task?.task,
              data: options?.task?.data,
            });
          }
        }
        // 分发别的任务
        if (taskMap[message.cmd]) {
          // 将回调消息传递到分发任务中
          taskMap[message.cmd](context, message);
        }
      },
      null,
      disposables,
    );
    // 关闭时销毁
    panel.onDidDispose(
      () => {
        panel.dispose();
        while (disposables.length) {
          const x = disposables.pop();
          if (x) {
            x.dispose();
          }
        }
        // 去掉该 panel
        webviewPanelList = webviewPanelList.filter(
          (s) => s.key !== options.key,
        );
      },
      null,
      disposables,
    );
    // 添加
    webviewPanelList.push({
      key: options.key,
      panel,
      disposables,
    });
  }
};

// 获取 webview html
export const getHtmlForWebview = (
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
) => {
  const isProduction =
    context.extensionMode === vscode.ExtensionMode.Production;
  let srcUrl: string | vscode.Uri = "";
  if (isProduction) {
    const mainScriptPathOnDisk = vscode.Uri.file(
      path.join(context.extensionPath, "webview-dist", "main.es.js"),
    );
    srcUrl = panel.webview.asWebviewUri(mainScriptPathOnDisk);
  } else {
    srcUrl = "http://127.0.0.1:7979/src/main.ts";
  }

  return getWebviewContent(srcUrl);
};

// webview html 容器
const getWebviewContent = (srcUri: string | vscode.Uri) => {
  return `<!doctype html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>webview-react</title>
      <script>
         window.vscode = acquireVsCodeApi();
      </script>
    </head>
    <body>
      <div id="app"></div>
      <script  type="module" src="${srcUri}"></script>
    </body>
    </html>`;
};

// 任务列表，在此处分发任务
const taskMap: Record<string, any> = {
  addSnippets: snippet.addSnippets,
};
```
### 解读代码
在平时开发时，需要先执行 `yarn dev`，此时会直接运行 `webview-vue` 项目，在 webview-vue 项目中需要指定运行端口号为 `7979`。因为在上面设置中，我们在开发环境中是直接打开 `http://127.0.0.1:7979/src/main.ts`，而生产发布插件后，我们先自动打包一次，这个打包的文件必须是将所有的文件都打包到一个 `js` 中，包括 css 这些。下面先介绍如何在 `webview-vue` 项目设置打包.

我们使用 `vite-plugin-css-injected-by-js` 将所有文件都打包一个文件中，[打包参考文章](https://juejin.cn/post/7277804250024902693)
```
yarn add -D vite-plugin-css-injected-by-js
```
修改 `vite.config.ts`
```
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import path from 'path'
// https://juejin.cn/post/7277804250024902693 打包配置参考
export default defineConfig({
  base: './',
  plugins: [vue(), vueJsx(), cssInjectedByJsPlugin()],
  // 配置别名
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 7979,
  },
  // 打包配置
  build: {
    lib: {
      entry: path.resolve(__dirname, './src/main.ts'), // 设置入口文件
      name: 'main', // 起个名字，安装、引入用
      fileName: `main`, // 打包后的文件名【可以自定义】
    },
    sourcemap: false, // 输出.map文件
    outDir: '../webview-dist', // 将打包文件拉出来，直接给插件项目使用
  },
})
```
- 在插件项目中配置发布自动打包命令，`package.json`，这样在我们发布插件时，就会自动打包一次
```
"build": "yarn --cwd \"webview-vue\" build",
"vscode:prepublish": "webpack --mode production && yarn --cwd \"webview-vue\" build",
```
- 执行 build 后会在根目录下生成打包文件
<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ad970e6b36784220bd3faee172740316~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=301&h=90&s=3822&e=png&b=191919">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ad970e6b36784220bd3faee172740316~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=301&h=90&s=3822&e=png&b=191919)</a>

- 添加 `.vscodeignore` 忽略文件，将 `webview-vue` 忽略掉，避免被上传到插件，导致文件过大
.vscodeignore
```
.vscode/**
.vscode-test/**
out/**
node_modules/**
src/**
.gitignore
.yarnrc
webpack.config.js
vsc-extension-quickstart.md
**/tsconfig.json
**/.eslintrc.json
**/*.map
**/*.ts
webview-vue/**
```

### 在 webview 项目中，接收来自 vscode 的信息
<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/510cc9e1214e4d77a93f408a9ca7dad9~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=303&h=505&s=17887&e=png&b=191919">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/510cc9e1214e4d77a93f408a9ca7dad9~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=303&h=505&s=17887&e=png&b=191919)</a>

在 `webview-vue` 项目中，封装跟 `vscode` 交互的方法：
- 声明 `vscode` 全局变量，在前面封装的 打开 `webview` 方法中，我们在 `html`容器中写入了一段，可直接搜索文章查找一下
```
<script>
  window.vscode = acquireVsCodeApi();
</script>
```
- 使用 `window.addEventListener('message')`，监听 `vscode` 传入的消息
- 根据 `vscode` 传入消息的 `cmd`去派发任务执行。

`src/utils/vscodeUtils.ts` 
```
/* eslint-disable @typescript-eslint/no-explicit-any */
import router from '@/router'

const callbacks: { [propName: string]: (data: any) => void } = {}
const errorCallbacks: { [propName: string]: (data: any) => void } = {}

export function callVscode(
  data: { cmd: string; data?: any; skipError?: boolean },
  cb?: (data: any) => void,
  errorCb?: (data: any) => void
) {
  if (cb) {
    const cbid = `${Date.now()}${Math.round(Math.random() * 100000)}`
    callbacks[cbid] = cb
    vscode.postMessage({
      ...data,
      cbid,
    })
    if (errorCb) {
      errorCallbacks[cbid] = errorCb
    }
  } else {
    vscode.postMessage(data)
  }
}

// 初始化
export const initMessageListener = () => {
  window.addEventListener('message', event => {
    const message = event.data
    switch (message.cmd) {
      case 'vscodePushTask':
        if (taskHandler[message.task]) {
          taskHandler[message.task](message.data)
        } else {
          message.error(`未找到名为 ${message.task} 回调方法!`)
        }
        break
    }
  })
}

// 分发任务
export const taskHandler: {
  [propName: string]: (data: any) => void
} = {
  // 跳转路由
  route: (data: { path: string }) => {
    router.push(data.path)
  },
}
```
- 在 `main.ts` 中执行该监听方法，并告诉 `vscode`，`webview` 项目已经加载完成，这样是为了避免出现 `webview` 项目还没加载完成就发送了信息过来，在前面封装的方法也是监听到这个方法后才开始发送 `msssage`
```
import { createApp } from 'vue'
import router from './router'
import Antd from 'ant-design-vue'
import App from './App.vue'

import { initMessageListener } from '@/utils/vscodeUtils'

const app = createApp(App)

app.use(router)
app.use(Antd)
app.mount('#app')

initMessageListener() // 执行监听

// 初始化完毕，通知 vscode 已经加载完了
vscode.postMessage({ cmd: 'webviewLoaded' })
```

- 写一个代码片段的 form 表单页面，然后将输入的内容传给 vscode，vscode 那边接收到后在当前项目中新增 `.vscode\test.code-snippets` 文件，并写入表单信息，一次完整的通讯就完成了。
- 自行在 `webview-vue` 项目中创建页面，添加路由，可以直接参考开头贴的项目地址代码。
- 这里只贴上填写完表单后的提交方法
```
onSubmit() {
  // 向 vscode 发送信息
  callVscode({
    cmd: 'addSnippets',
    data: {
      ...this.model.formState, // 表单信息
    },
  })
}
```
- `vscode` 在 `panel.webview.onDidReceiveMessage` 方法中，会监听 `webview` 发送的信息，然后分发任务
- 这里封装接收信息后的任务分发，在插件项目中新增 `src\webview\controllers\addSnippets.ts`，往后所有接收 `webview` 消息需要处理的任务在添加到 `controllers` 文件夹中

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/12d16c8cf67845efb94c834623eaf765~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=314&h=258&s=9776&e=png&b=1a1a1a">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/12d16c8cf67845efb94c834623eaf765~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=314&h=258&s=9776&e=png&b=1a1a1a)</a>

`src\webview\controllers\addSnippets.ts`
```
import * as vscode from "vscode";
import * as path from "path";

export const addSnippets = (
  context: vscode.ExtensionContext,
  message: {
    data: {
      tips: string;
      prefix: string;
      body: string;
      description: string;
    };
  },
) => {
  // 获取当前项目下的路径
  const rootPath = vscode.workspace.rootPath;
  const extensionPath = path.join(rootPath!, ".vscode/test.code-snippets");
  const snippetFilePath = vscode.Uri.file(extensionPath);

  // 创建代码片段
  const newSnippet = {
    [message.data.tips]: {
      prefix: message.data?.prefix,
      body: [message.data?.body],
      description: message.data?.description,
    },
  };

  // 将代码片段写入文件并添加到扩展程序
  const writesnippetFilePath = async () => {
    try {
      let existingSnippets = {};

      // 保证一定有该文件
      try {
        const folderStat = await vscode.workspace.fs.stat(snippetFilePath);

        if (folderStat.type !== vscode.FileType.File) {
          await vscode.workspace.fs.writeFile(
            snippetFilePath,
            Buffer.from("", "utf8"),
          );
        }
      } catch (error) {
        await vscode.workspace.fs.writeFile(
          snippetFilePath,
          Buffer.from("", "utf8"),
        );
      }

      // 读取原有文件内容
      const snippetsFileContent =
        await vscode.workspace.fs.readFile(snippetFilePath);
      if (snippetsFileContent && snippetsFileContent.toString())
        existingSnippets = JSON.parse(snippetsFileContent.toString());

      // 如果不存在重复代码片段则拼接
      if (!existingSnippets[newSnippet[message.data.tips].prefix]) {
        existingSnippets = { ...existingSnippets, ...newSnippet };
      } else {
        existingSnippets = newSnippet;
      }
      const updatedSnippetsContent = JSON.stringify(existingSnippets, null, 2);

      // 写入
      await vscode.workspace.fs.writeFile(
        snippetFilePath,
        Buffer.from(updatedSnippetsContent, "utf-8"),
      );
      vscode.window.showInformationMessage("代码片段添加成功!");
    } catch (error) {
      vscode.window.showErrorMessage(`代码片段添加失败: ${error}`);
    }
  };
  writesnippetFilePath();
};
```

至此这个功能就算完成了，`vscode` 与 `webview` 的通讯应该也弄明白了。

此时，F5 后，在打开的新窗口中右键，会直接打开一个 `webview` 页面，填写完表单后会提交，会在当前项目中新增 `.vscode\test.code-snippets` 文件，并写入表单信息，这个文件写入后，就能直接在该项目中使用文件内的代码片段了。

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3713b220464748f490a7bdc2bb14e955~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=625&h=506&s=31942&e=png&b=202020">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3713b220464748f490a7bdc2bb14e955~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=625&h=506&s=31942&e=png&b=202020)</a>

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/68f85a64914d4c8fbf91ed4ab12c81e6~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=809&h=502&s=20470&e=png&b=fefefe">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/68f85a64914d4c8fbf91ed4ab12c81e6~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=809&h=502&s=20470&e=png&b=fefefe)</a>

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/515b9f3de79646f6b23b2217f7b13d39~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=765&h=454&s=36843&e=png&b=1c1c1c">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/515b9f3de79646f6b23b2217f7b13d39~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=765&h=454&s=36843&e=png&b=1c1c1c)</a>

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ae2cf308f4814b81b98c6d8090f08ba2~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=861&h=322&s=18914&e=png&b=202020">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ae2cf308f4814b81b98c6d8090f08ba2~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=861&h=322&s=18914&e=png&b=202020)</a>

打包发布前记得修改一下 `package.json` 的版本号

大家可以在 `vscode` 中下载安装我的插件 `CodeToolBox` 体验一下，往后会持续添加更多功能，谢谢~

[插件项目地址](https://github.com/upJiang/jiang-vscode-plugin)，觉得还行的赏个 `star`

至此，已经完成插件开发的入门内容，相信大家也能够去写一个自己的 vscode 插件了~

