[中文教程](https://liiked.github.io/VS-Code-Extension-Doc-ZH/#/)

## init项目
- 安装官方脚手架

```
npm install -g yo generator-code
```
- 执行，生成项目
```
yo code
```
 
- 直接f5即可运行插件

## 发布插件
###  下载发布插件
```
npm install -g vsce
```

### 项目打包
```
vsce package
```

### 创建 `Azure Personal Access Token`，用于发布
- 打开 [Azure官网](https://aex.dev.azure.com) ，注册好账号后，在这里创建 token，设置期限最长为一年，`Scopes` 直接选择 `Full access`。保存好创建的 `token`

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7c9d1e2d1abb4b31a4444f134a6e8af0~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=415&h=431&s=25374&e=png&b=fbfbfb">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7c9d1e2d1abb4b31a4444f134a6e8af0~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=415&h=431&s=25374&e=png&b=fbfbfb)</a>

### 创建发行方
打开 [创建发行方地址](https://aka.ms/vscode-create-publisher )，填一个与项目 `publisher` 一致的名字，直接创建即可

## 开始发布
```
# 登录
vsce login (publisher name)

# 发布
vsce publish 2.0.1

# 直接登录然后立即发布插件：
vsce publish -p <token>
```

然后过几分钟，再搜索一下自己的插件名称，就能搜到啦

## 本地打包并安装
```
vsce package
```
会在根目录生成一个 `.vsix` 文件，然后直接在扩展那里选择 `从 VSLX 安装` 即可

## 常规配置
[参考文章](https://juejin.cn/post/7051512232374435847#heading-0)，配置一下 `eslint` 跟 `prettier`

## 插件入手编辑
- 每个命令都要在 `package.json` 中添加 `command`
```
"contributes": {
    "commands": [
      {
        "command": "jiangvscodeplugin.helloWorld",
        "title": "Hello World"
      },
      {
        "command": "catCoding.start",
        "title": "Start new cat coding session",
        "category": "Cat Coding"
      }
    ]
  },
```
- 然后在 `extension.ts` 中写入
```
import * as vscode from "vscode";

// 一旦你的插件激活，vscode会立刻调用下述方法
export function activate(context: vscode.ExtensionContext) {
  // 命令中输入弹出信息
  let disposable = vscode.commands.registerCommand(
    "jiangvscodeplugin.helloWorld",
    () => {
      // 给用户显示一个消息提示
      vscode.window.showInformationMessage(
        "Hello World from jiangVsCodePlugin!!!!>>>>",
      );
    },
  );

  const webviewTest = vscode.commands.registerCommand("catCoding.start", () => {
    // 创建并显示新的webview
    const panel = vscode.window.createWebviewPanel(
      "catCoding", // 只供内部使用，这个webview的标识
      "Cat Coding", // 给用户显示的面板标题
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

  context.subscriptions.push(disposable);
  context.subscriptions.push(webviewTest);
}

// 插件关闭前执行清理工作
export function deactivate() {}
```
重新运行，然后在新窗口输入 `Hello World` 或者 `Cat Coding`，就能看到效果

在 `​​VSCode​​​` 命令面板中，输入​ `​Open Webview Developer Tools​​` ​后可以打开 `​​Webview` ​​的控制台

## 接入本地项目作为webview
- 在根目录下创建 `vue` 项目，并运行
```
# 安装自己构建的脚手架，拉取 github 项目，或者自行创建项目
npm install jiang-cli -g

jiang create webview // 选择 vue项目模板下载
```
- 添加命令，`package.json`，并执行
```
 "dev": "yarn --cwd \"webview\" dev",

 yarn dev
```
- 在 `src`下新建 `commands` 文件夹，新增 `runWenview.ts`，写入
```
import { ExtensionContext } from "vscode";
import * as vscode from "vscode";

const path = require("path");

export const registerRunWebView = (context: ExtensionContext) => {
  context.subscriptions.push(
    vscode.commands.registerCommand("CodeToolBox.webview", () => {
      const panel = vscode.window.createWebviewPanel(
        "webview",
        "webview app",
        vscode.ViewColumn.One,
        {
          retainContextWhenHidden: true, // 保证 Webview 所在页面进入后台时不被释放
          enableScripts: true, // 运行 JS 执行
        },
      );

      const isProduction =
        context.extensionMode === vscode.ExtensionMode.Production;
      let srcUrl: string | vscode.Uri = "";
      if (isProduction) {
        const mainScriptPathOnDisk = vscode.Uri.file(
          path.join(context.extensionPath, "webview-dist", "main.js"),
        );
        srcUrl = panel.webview.asWebviewUri(mainScriptPathOnDisk);
      } else {
        srcUrl = "http://127.0.0.1:7979/src/main.ts";
      }
      panel.webview.html = getWebviewContent(srcUrl);
    }),
  );
};

function getWebviewContent(srcUri: string | vscode.Uri) {
  return `<!doctype html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>webview-react</title>
      
    </head>
    <body>
      <div id="app"></div>
      <script  type="module" src="${srcUri}"></script>
    </body>
    </html>`;
}

```
- 在 `extension.ts` 中要引入并执行
```
import { registerRunWebView } from "./commands/runWenview";
export function activate(context: vscode.ExtensionContext) {
  registerRunWebView(context);
}
```
- 本地项目，将打包路径设置到外层，vscode 部分只引用打包好的文件
如果是 `vite` 可添加如下设置，`vite.config.ts`
```
base: './',
build: {
    rollupOptions: {
      output: {
        entryFileNames: 'main.js',
      },
    },
    outDir: '../webview-dist',
  },
```
- 配置打包，修改 `package.json`
```
"dev": "yarn --cwd \"webview\" dev",
"build": "yarn --cwd \"webview\" build",
"vscode:prepublish": "webpack --mode production && yarn --cwd \"webview\" build",
```
- 添加 `vscode` 忽略文件，将 `webview` 忽略掉
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
webview/**
```
- 弄好后，直接发布 `npm publish`，就会自动打包 `webview` 项目，根据不同环境选择不同的 `webview` 资源


## 写一个复制文件夹内容的小功能，以便开发时快速创建自己想要的模板内容
### 拆分命令目录，优化结构
- 在 `src` 目录下新建 `commands` 文件夹，之后将所有的命令都写到该文件夹中
### 新建代码片段目录，用于读取
- 在根目录下新建 `materials` 文件夹，之后将要自动生成的代码片段放到这里
- 在 `materials` 下新建 `block` 文件夹，写入四个文件

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

### 配置文件夹右键菜单，选中文件夹后，将 `materials/blocks` 的内容复制进去
编辑 `package.json`
```
"contributes": {
    "commands": [
      {
        "command": "webview.start",
        "title": "打开webview"
      },
      {
        "command": "jiang.createScript",
        "title": "创建区块"
      }
    ],
    "menus": {
      "explorer/context": [
        {
          "submenu": "jiang/explorer/context",
          "when": "explorerResourceIsFolder"
        }
      ],
      "jiang/explorer/context": [
        {
          "command": "jiang.createScript"
        }
      ]
    },
    "submenus": [
      {
        "id": "jiang/explorer/context",
        "label": "Jiang",
        "icon": "$(octoface)"
      }
    ]
  },
```
### 新增 `src/commands/createScript.ts`，并写入
以下代码大部分都是 `chatGPT` 帮写的，提问方式
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
    commands.registerCommand("jiang.createScript", async (args) => {
      const rootPath = vscode.workspace.rootPath || ""; // 获取当前右键文件夹位置作为目标源
      // 规定复制源位置
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
### f5重新启动后，在扩展宿主页面中，新建一个空项目，新增 `materials/blocks` 文件夹，写入前面的四个文件，新建 `src` 文件夹，然后在 `src` 中中右键，选中 `jiang`-> `创建区块`，就能复制过去啦

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3a0d1d04b73b4bc794c21b0e96e9abfd~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=297&h=241&s=8501&e=png&b=181818">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3a0d1d04b73b4bc794c21b0e96e9abfd~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=297&h=241&s=8501&e=png&b=181818)</a>

## 开发一个新增代码片段与使用的功能
