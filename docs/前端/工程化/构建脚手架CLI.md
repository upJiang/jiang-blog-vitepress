## 基础用法尝试 CLI

### 在命令行中尝试 cli

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

然后，在控制台直接执行 `jiang-cli`，就会打印出来了，`windows` 请使用
`cmd`，`powershell` 好像不会打印

### 询问用户信息

实现与询问用户信息的功能需要引入 inquirer.js 👉
[文档看这里](https://github.com/SBoudrias/Inquirer.js/)

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

### 通过 `cjs` 生成文件

- 新建模版文件夹

```
$ mkdir templates # 创建模版文件夹
```

- 新建 `index.html` 和 `common.css` 两个简单的示例文件

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
  > 这里借助 ejs 模版引擎将用户输入的数据渲染到模版文件上

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

同样，在控制台执行一下 `jiang-cli` ，此时 `index.html`、`common.css` 已经成功创
建 ✔

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

## 搭建自己的脚手架，使用 commander

需要实现哪些基本功能：

- 通过 `jiang create <name>` 命令启动项目
- 询问用户需要选择需要下载的模板
- 远程拉取模板文件

搭建步骤拆解：

- 创建项目
- 创建脚手架启动命令（使用 `commander`）
- 询问用户问题获取创建所需信息（使用 `inquirer`）
- 下载远程模板（使用 `download-git-repo`）
- 发布项目

### 创建项目

#### 参照前面的例子，先创建一个简单的 `jiang-Cli` 结构

```
jiang-cli
├─ bin
│  └─ cli.js  # 启动文件
├─ README.md
└─ package.json
```

#### 配置脚手架启动文件

```
{
  "name": "jiang-cli",
  "version": "1.0.0",
  "description": "jiang脚手架",
  "main": "cli.js",
  "bin": {
    "jiang": "./bin/cli.js"
  },
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "jiang",
  "license": "ISC",
  "dependencies": {
    "ejs": "^3.1.9"
  },
  "devDependencies": {
    "inquirer": "^8.2.0"
  }
}
```

#### 同样编写一下 cli.js ，然后 `npm link`

```
#! /usr/bin/env node

console.log('jiang working ~')
```

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/687a3e63690f42259562916c96a8d1b6~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=631&h=244&s=19542&e=png&b=181818">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/687a3e63690f42259562916c96a8d1b6~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=631&h=244&s=19542&e=png&b=181818)</a>

### 创建脚手架启动命令

分析一下我们要怎么做？

- 首先我们要借助 commander 依赖去实现这个需求
- 参照 vue-cli 常用的命令有 create、config 等等，在最新版本中可以使用 vue ui 进
  行可视化创建
- 如果创建的存在，需要提示是否覆盖

#### 安装依赖

```
$ yarn add commander
```

#### 创建命令

打开 cli.js 进行编辑

```
#! /usr/bin/env node

const program = require('commander')

program
  // 定义命令和参数
  .command('create <app-name>')
  .description('create a new project')
  // -f or --force 为强制创建，如果创建的目录存在则直接覆盖
  .option('-f, --force', 'overwrite target directory if it exist')
  .action((name, options) => {
    // 打印执行结果
    console.log('name:',name,'options:',options)
  })

program
   // 配置版本号信息
  .version(`v${require('../package.json').version}`)
  .usage('<command> [option]')

// 解析用户执行命令传入参数
program.parse(process.argv);
```

执行输入：

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b951d31e10f04b17a3f1309e0c5675b1~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=447&h=174&s=11021&e=png&b=181818">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b951d31e10f04b17a3f1309e0c5675b1~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=447&h=174&s=11021&e=png&b=181818)</a>

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e4c751c94f8f4676860e556a5addc5f9~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=467&h=67&s=7858&e=png&b=181818">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e4c751c94f8f4676860e556a5addc5f9~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=467&h=67&s=7858&e=png&b=181818)</a>

至此已成功获取用户输入结果

### 执行命令，拆分创建任务

- 创建 `lib` 文件夹并在文件夹下创建 `create.js`

```
// lib/create.js

module.exports = async function (name, options) {
  // 验证是否正常取到值
  console.log('>>> create.js', name, options)
}
```

- 在 `cli.js` 中使用 `create.js`

```
// bin/cli.js

......
program
  .command('create <app-name>')
  .description('create a new project')
  .option('-f, --force', 'overwrite target directory if it exist') // 是否强制创建，当文件夹已经存在
  .action((name, options) => {
    // 在 create.js 中执行创建任务
    require('../lib/create.js')(name, options)
  })
......
```

执行一下 `jiang create my-project`，此时在 `create.js` 正常打印了我们出入的信息

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e38f2309b46a4f5cac3f8724012c0988~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=482&h=30&s=4143&e=png&b=181818">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e38f2309b46a4f5cac3f8724012c0988~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=482&h=30&s=4143&e=png&b=181818)</a>

这个时候拿到了 `{ force: true }` 的参数，需要思考一个问题：目录是否已经存在？

- 如果存在
  - 当 { force: true } 时，直接移除原来的目录，直接创建
  - 当 { force: false } 时 询问用户是否需要覆盖
- 如果不存在，直接创建

这里用到了 `fs` 的扩展工具 `fs-extra`，先来安装一下

```
# fs-extra 是对 fs 模块的扩展，支持 promise
$ yarn add fs-extra
```

### 我们接着完善一下 create.js 内部的实现逻辑

```
// lib/create.js

const path = require('path')
const fs = require('fs-extra')

module.exports = async function (name, options) {
  // 执行创建命令

  // 当前命令行选择的目录
  const cwd  = process.cwd();
  // 需要创建的目录地址
  const targetAir  = path.join(cwd, name)

  // 目录是否已经存在？
  if (fs.existsSync(targetAir)) {

    // 是否为强制创建？
    if (options.force) {
      await fs.remove(targetAir)
    } else {
      // TODO：询问用户是否确定要覆盖
    }
  }
}
```

其它命令扩展

```
// bin/cli.js

// 配置 config 命令
program
  .command('config [value]')
  .description('inspect and modify the config')
  .option('-g, --get <path>', 'get value from option')
  .option('-s, --set <path> <value>')
  .option('-d, --delete <path>', 'delete option from config')
  .action((value, options) => {
    console.log(value, options)
  })

// 配置 ui 命令
program
  .command('ui')
  .description('start add open roc-cli ui')
  .option('-p, --port <port>', 'Port used for the UI Server')
  .action((option) => {
    console.log(option)
  })
```

### 命令行美化工具

#### `chalk` 对重点信息添加颜色

`chalk`（粉笔）可以`美化我们在命令行中输出内容的样式`，例如对重点信息添加颜色

- 安装依赖

```
# 高于4版本会报错
yarn add chalk@4
```

- 在 `lib/create.js` 打印试试

```
const chalk = require('chalk')

// 文本样式
console.log("project name is " + chalk.green(name))
```

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/84d2df4761b14d3c9a4c4c04b58eb0ca~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=351&h=39&s=3440&e=png&b=181818">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/84d2df4761b14d3c9a4c4c04b58eb0ca~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=351&h=39&s=3440&e=png&b=181818)</a>

- 增加说明样式

```
// bin/cli.js

program
  // 监听 --help 执行
  .on('--help', () => {
    // 新增说明信息
    console.log(`\r\nRun ${chalk.cyan(`zr <command> --help`)} for detailed usage of given command\r\n`)
  })
```

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/960bc0f441e54e28a899736105c2cfd8~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=494&h=220&s=14249&e=png&b=181818">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/960bc0f441e54e28a899736105c2cfd8~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=494&h=220&s=14249&e=png&b=181818)</a>

#### `figlet` 打印个 Logo

如果此时我们想给脚手架整个 `Logo`，工具库里的
[figlet](https://www.npmjs.com/package/figlet) 就是干这个的

- 安装依赖

```
yarn add figlet
```

- 使用打印 `logo`

```
// bin/cli.js

#! /usr/bin/env node

const program = require('commander')
const chalk = require('chalk')
const figlet = require('figlet')

program
  // 定义命令和参数
  .command('create <app-name>')
  .description('create a new project')
  // -f or --force 为强制创建，如果创建的目录存在则直接覆盖
  .option('-f, --force', 'overwrite target directory if it exist')
  .action((name, options) => {
    // 在 create.js 中执行创建任务，并传参
    require('../lib/create.js')(name, options)
  })

program
   // 配置版本号信息
  .version(`v${require('../package.json').version}`)
  .usage('<command> [option]')
  .on('--help', () => {
    // 使用 figlet 绘制 Logo
    console.log('\r\n' + figlet.textSync('jiang', {
      font: 'Ghost',
      horizontalLayout: 'default',
      verticalLayout: 'default',
      width: 80,
      whitespaceBreak: true
    }));
    // 新增说明信息
    console.log(`\r\nRun ${chalk.cyan(`roc <command> --help`)} show details\r\n`)
   })

// 解析用户执行命令传入参数
program.parse(process.argv);
```

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9e169b7291f24cb7bcbf79ee1095beb6~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=466&h=391&s=21204&e=png&b=181818">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9e169b7291f24cb7bcbf79ee1095beb6~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=466&h=391&s=21204&e=png&b=181818)</a>

### 询问用户问题获取创建所需信息

使用 [inquirer](https://www.npmjs.com/package/inquirer)，让他来帮我们解决命令行
交互的问题，前面基础创建那里也有用到

接下来我们要做的：

- 上一步遗留：询问用户是否覆盖已存在的目录
- 用户选择模板
- 用户选择版本
- 获取下载模板的链接

- 安装依赖

```
# 8 版本以上的会报错
yarn add inquirer@8
```

- 编写 `lib/create.js`,通过拿到的 `{ force: false }` 判断是否覆盖已存在的目录

```
// lib/create.js

const path = require('path')
const fs = require('fs-extra')
const chalk = require('chalk')
const inquirer = require('inquirer')

module.exports = async function (name, options) {
  // 文本样式
  console.log("project name is " + chalk.green(name))
  // 执行创建命令

  // 当前命令行选择的目录
  const cwd  = process.cwd();
  // 需要创建的目录地址
  const targetAir  = path.join(cwd, name)

  // 目录是否已经存在？
  if (fs.existsSync(targetAir)) {

    // 是否为强制创建？
    if (options.force) {
      await fs.remove(targetAir)
    } else {
       // 使用 inquirer，询问用户是否确定要覆盖
       let { action } = await inquirer.prompt([
        {
          name: 'action',
          type: 'list',
          message: 'Target directory already exists Pick an action:',
          choices: [
            {
              name: 'Overwrite',
              value: 'overwrite'
            },{
              name: 'Cancel',
              value: false
            }
          ]
        }
      ])
      if (!action) {
        return;
      } else if (action === 'overwrite') {
        // 移除已存在的目录
        console.log(`\r\nRemoving...`)
        await fs.remove(targetAir)
      }
    }
  }
}
```

### 获取模板

- 安装 `axios`

```
yarn add axios
```

- 在 lib 目录下创建一个 http.js 专门处理模板和版本信息的获取

```
// lib/http.js

// 通过 axios 处理请求
const axios = require('axios')

axios.interceptors.response.use(res => {
  return res.data;
})


/**
 * 获取模板列表
 * @returns Promise
 */
async function getRepoList() {
  return axios.get('https://api.github.com/users/upJiang/repos')
}

/**
 * 获取版本信息
 * @param {string} repo 模板名称
 * @returns Promise
 */
async function  getTagList(repo) {
  return axios.get(`https://api.github.com/repos/upJiang/${repo}/tags`)
}

module.exports = {
  getRepoList,
  getTagList
}
```

### 用户选择模板

- 新建一个 `Generator.js` 来处理项目创建逻辑

```
// lib/Generator.js

class Generator {
  constructor (name, targetDir){
    // 目录名称
    this.name = name;
    // 创建位置
    this.targetDir = targetDir;
  }

  // 核心创建逻辑
  create(){

  }
}

module.exports = Generator;
```

- 在 `create.js` 中引入 `Generator` 类

```
// lib/create.js

...
const Generator = require('./Generator')

module.exports = async function (name, options) {
  // 执行创建命令

  // 当前命令行选择的目录
  const cwd  = process.cwd();
  // 需要创建的目录地址
  const targetAir  = path.join(cwd, name)

  // 目录是否已经存在？
  if (fs.existsSync(targetAir)) {
    ...
  }

  // 创建项目
  const generator = new Generator(name, targetAir);

  // 开始创建项目
  generator.create()
}
```

- 接着来写询问用户选择模版都逻辑

安装依赖 `ora`，高版本报错

```
yarn add ora@4
```

```
// lib/Generator.js

const { getRepoList } = require('./http')
const ora = require('ora')
const inquirer = require('inquirer')

// 添加加载动画
async function wrapLoading(fn, message, ...args) {
  // 使用 ora 初始化，传入提示信息 message
  const spinner = ora(message);
  // 开始加载动画
  spinner.start();

  try {
    // 执行传入方法 fn
    const result = await fn(...args);
    // 状态为修改为成功
    spinner.succeed();
    return result;
  } catch (error) {
    // 状态为修改为失败
    spinner.fail('Request failed, refetch ...')
  }
}

class Generator {
  constructor (name, targetDir){
    // 目录名称
    this.name = name;
    // 创建位置
    this.targetDir = targetDir;
  }

  // 获取用户选择的模板
  // 1）从远程拉取模板数据
  // 2）用户选择自己新下载的模板名称
  // 3）return 用户选择的名称

  async getRepo() {
    // 1）从远程拉取模板数据
    const repoList = await wrapLoading(getRepoList, 'waiting fetch template');
    if (!repoList) return;

    // 过滤我们需要的模板名称
    const repos = repoList.map(item => item.name);

    // 2）用户选择自己新下载的模板名称
    const { repo } = await inquirer.prompt({
      name: 'repo',
      type: 'list',
      choices: repos,
      message: 'Please choose a template to create project'
    })

    // 3）return 用户选择的名称
    return repo;
  }

  // 核心创建逻辑
  // 1）获取模板名称
  // 2）获取 tag 名称
  // 3）下载模板到模板目录
  async create(){

    // 1）获取模板名称
    const repo = await this.getRepo()

    console.log('用户选择了，repo=' + repo)
  }
}

module.exports = Generator;
```

执行 `jiang create my-project`

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ab225afcd30d435da5aa5db58e2ade8e~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=453&h=124&s=10329&e=png&b=181818">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ab225afcd30d435da5aa5db58e2ade8e~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=453&h=124&s=10329&e=png&b=181818)</a>

### 下载远程模板

> 下载远程模版需要使用 download-git-repo 工具包，实际上它也在我们上面列的工具菜
> 单上，但是在使用它的时候，需要注意一个问题，就是它是不支持 promise 的，所以我
> 们这里需要使用 使用 util 模块中的 promisify 方法对其进行 promise 化

- 安装依赖与 promise 化

```
$ yarn add download-git-repo

```

- 进行 `promise` 化处理

```
// lib/Generator.js

...
const util = require('util')
const downloadGitRepo = require('download-git-repo') // 不支持 Promise

class Generator {
  constructor (name, targetDir){
    ...

    // 对 download-git-repo 进行 promise 化改造
    this.downloadGitRepo = util.promisify(downloadGitRepo);
  }

  ...
}
```

- 核心下载功能最终 `Generator.js` 代码

```
// lib/Generator.js

const ora = require('ora')
const inquirer = require('inquirer')
const util = require('util')
const path = require('path')
const chalk = require('chalk')
const downloadGitRepo = require('download-git-repo') // 不支持 Promise

const { getRepoList, getTagList } = require('./http')

// 添加加载动画
async function wrapLoading(fn, message, ...args) {
  // 使用 ora 初始化，传入提示信息 message
  const spinner = ora(message);
  // 开始加载动画
  spinner.start();

  try {
    // 执行传入方法 fn
    const result = await fn(...args);
    // 状态为修改为成功
    spinner.succeed();
    return result;
  } catch (error) {
    // 状态为修改为失败
    spinner.fail('Request failed, refetch ...')
  }
}

class Generator {
  constructor (name, targetDir){
    // 目录名称
    this.name = name;
    // 创建位置
    this.targetDir = targetDir;

    // 对 download-git-repo 进行 promise 化改造
    this.downloadGitRepo = util.promisify(downloadGitRepo);
  }

  // 获取用户选择的模板
  // 1）从远程拉取模板数据
  // 2）用户选择自己新下载的模板名称
  // 3）return 用户选择的名称

  async getRepo() {
    // 1）从远程拉取模板数据
    const repoList = await wrapLoading(getRepoList, 'waiting fetch template');
    if (!repoList) return;

    // 过滤我们需要的模板名称
    const repos = repoList.map(item => item.name);

    // 2）用户选择自己新下载的模板名称
    const { repo } = await inquirer.prompt({
      name: 'repo',
      type: 'list',
      choices: repos,
      message: 'Please choose a template to create project'
    })

    // 3）return 用户选择的名称
    return repo;
  }

  // 获取用户选择的版本
  // 1）基于 repo 结果，远程拉取对应的 tag 列表
  // 2）用户选择自己需要下载的 tag
  // 3）return 用户选择的 tag

  async getTag(repo) {
    // 1）基于 repo 结果，远程拉取对应的 tag 列表
    const tags = await wrapLoading(getTagList, 'waiting fetch tag', repo);

    if (!tags || !tags.length) return;

    // 过滤我们需要的 tag 名称
    const tagsList = tags.map(item => item.name);

    // 2）用户选择自己需要下载的 tag
    const { tag } = await inquirer.prompt({
      name: 'tag',
      type: 'list',
      choices: tagsList,
      message: 'Place choose a tag to create project'
    })

    // 3）return 用户选择的 tag
    return tag
  }

  // 核心创建逻辑
  // 1）获取模板名称
  // 2）获取 tag 名称
  // 3）下载模板到模板目录
  async create(){

    // 1）获取模板名称
    const repo = await this.getRepo()

    console.log('用户选择了，repo=' + repo)

     // 2) 获取 tag 名称
     const tag = await this.getTag(repo)

     // 3）下载模板到模板目录
     await this.download(repo, tag)

     // 4）模板使用提示
     console.log(`\r\nSuccessfully created project ${chalk.cyan(this.name)}`)
     console.log(`\r\n  cd ${chalk.cyan(this.name)}`)
     console.log('  npm run dev\r\n')
  }

    // 下载远程模板
  // 1）拼接下载地址
  // 2）调用下载方法
  async download(repo, tag){

    // 1）拼接下载地址
    const requestUrl = `upJiang/${repo}${tag?'#'+tag:''}`;

    // 2）调用下载方法
    await wrapLoading(
      this.downloadGitRepo, // 远程下载方法
      'waiting download template', // 加载提示信息
      requestUrl, // 参数1: 下载地址
      path.resolve(process.cwd(), this.targetDir)) // 参数2: 创建位置
  }
}

module.exports = Generator;
```

至此项目基本完成了。执行 `jiang create my-project`

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a2c1946e2a3c46b09cefb0c5358ca525~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=499&h=264&s=19799&e=png&b=181818">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a2c1946e2a3c46b09cefb0c5358ca525~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=499&h=264&s=19799&e=png&b=181818)</a>

## 发布

- 登录 `npm`，现在 `npm` 也需要一次性验证，手机下载 `Authenticator`，或者使用华
  为云等，都可以弄，百度自行解决

```
npm login
```

- 发布，注意不要发布市场已有的

```
npm publish
```

- 测试我发布了个 `junfeng-cli`，在本地下载依赖

```
# 先取消关联之前的
$ npm unlink jiang-cli

# 删除，node 里面已经安装的 jiang模块

# 全局安装 junfeng-cli
$ npm install junfeng-cli -g

# 使用
$ jiang create jiang-project
```

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/75b6d6e3e9e2402588eca87278249d6d~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=694&h=238&s=18816&e=png&b=fefefe">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/75b6d6e3e9e2402588eca87278249d6d~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=694&h=238&s=18816&e=png&b=fefefe)</a>

至此，已经可以完成了脚手架的构建。只需要修改仓库地址，对项目修修补补，就能变成自
己的脚手架专属。

> 有时候下载不到可能是网络问题
