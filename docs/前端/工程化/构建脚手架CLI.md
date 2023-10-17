## 在命令行中尝试 cli
- `init` 项目 
```
$ mkdir jiang-cli 
$ cd jiang-cli 

# 生成 package.json 文件
$ npm init 
```

- 新建程序入口文件 `cli.js`
```
$ touch cli.js # 新建 cli.js 文件
```

- 在 `package.json` 文件中指定入口文件为 `cli.js` 👇
```
{
  "name": "my-node-cli",
  "version": "1.0.0",
  "description": "",
  "main": "cli.js",
  "bin": "cli.js", // 手动添加入口文件为 cli.js
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "",
  "license": "ISC"
}
```

- 编辑 `cli.js`
```
#! /usr/bin/env node

// #! 符号的名称叫 Shebang，用于指定脚本的解释程序
// Node CLI 应用入口文件必须要有这样的文件头
// 如果是Linux 或者 macOS 系统下还需要修改此文件的读写权限为 755
// 具体就是通过 chmod 755 cli.js 实现修改

// 用于检查入口文件是否正常执行
console.log('my-node-cli working~')
```

- `npm link` 链接到全局
```
$ npm link # or yarn link
```
然后，在控制台直接执行 `jiang-cli`，就会打印出来了，`windows` 请使用 `cmd`，`powershell` 好像不会打印

## 询问用户信息
实现与询问用户信息的功能需要引入 inquirer.js 👉  [文档看这里](https://github.com/SBoudrias/Inquirer.js/)

```
$ npm install inquirer --dev # yarn add inquirer --dev
```

- 修改 `cli.js`，询问用户示例
```
#! /usr/bin/env node

inquirer.prompt([
  {
    type: 'input', //type：input,confirm,list,rawlist,checkbox,password...
    name: 'name', // key 名
    message: 'Your name', // 提示信息
    default: 'my-node-cli' // 默认值
  }
]).then(answers => {
})
```

## 通过 `cjs` 生成文件
- 新建模版文件夹
```
$ mkdir templates # 创建模版文件夹 
```
-  新建 `index.html` 和 `common.css` 两个简单的示例文件

```
/* index.html */
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>
    <!-- ejs 语法 -->
    <%= name %>
  </title>
</head>
<body>
  <h1><%= name %></h1>
</body>

</html>
```
```
/* common.css */
body {
  margin: 20px auto;
  background-color: azure;
}

```
此时的目录结构
```
jiang-cli           
├─ templates          
│  ├─ common.css      
│  └─ index.html      
├─ cli.js             
├─ package-lock.json  
└─ package.json       
```
- 接着完善文件生成逻辑
>这里借助 ejs 模版引擎将用户输入的数据渲染到模版文件上
```
npm install ejs --save # yarn add ejs --save
```

- 完善后到 cli.js 👇
```
#! /usr/bin/env node

const inquirer = require('inquirer')
const path = require('path')
const fs = require('fs')
const ejs = require('ejs')

inquirer.prompt([
  {
    type: 'input', //type：input,confirm,list,rawlist,checkbox,password...
    name: 'name', // key 名
    message: 'Your name', // 提示信息
    default: 'my-node-cli' // 默认值
  }
]).then(answers => {
  // 模版文件目录
  const destUrl = path.join(__dirname, 'templates'); 
  // 生成文件目录
  // process.cwd() 对应控制台所在目录
  const cwdUrl = process.cwd();
  // 从模版目录中读取文件
  fs.readdir(destUrl, (err, files) => {
    if (err) throw err;
    files.forEach((file) => {
      // 使用 ejs 渲染对应的模版文件
      // renderFile（模版文件地址，传入渲染数据）
      ejs.renderFile(path.join(destUrl, file), answers).then(data => {
        // 生成 ejs 处理后的模版文件
        fs.writeFileSync(path.join(cwdUrl, file) , data)
      })
    })
  })
})
```

同样，在控制台执行一下 `jiang-cli` ，此时 `index.html`、`common.css` 已经成功创建 ✔

当前的目录结构 👇
```
jiang-cli           
├─ templates          
│  ├─ common.css      
│  └─ index.html      
├─ cli.js             
├─ common.css .................... 生成对应的 common.css 文件        
├─ index.html .................... 生成对应的 index.html 文件        
├─ package-lock.json  
└─ package.json       

```

