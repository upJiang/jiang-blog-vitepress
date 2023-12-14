[gulp 官网](https://www.gulpjs.com.cn/)

## 安装依赖

```
// 全局安装 gulp-cli
npm install --global gulp-cli

// 在项目下安装 gulp，目前最新是4.0版本
// 语法跟3.0会有所不同，但3.0版本需要低版本的node，所以这里直接使用最新的
yarn add gulp -D
```

## 组合任务

gulp 组合任务，可以任意嵌套任何深度

- 如果需要让任务（task）按顺序执行，请使用 `series()` 方法。
- 对于希望以最大并发来运行的任务（tasks），可以使用 `parallel()` 方法将它们组合
  起来。

```
const { series, parallel } = require('gulp');

function clean(cb) {
  // body omitted
  cb();
}

function css(cb) {
  // body omitted
  cb();
}

function javascript(cb) {
  // body omitted
  cb();
}

exports.build = series(clean, parallel(css, javascript));
```

当使用 `series()` 组合多个任务（task）时，任何一个任务（task）的错误将导致整个任
务组合结束，并且不会进一步执行其他任务。当使用 `parallel()` 组合多个任务（task）
时，一个任务的错误将结束整个任务组合的结束，但是其他并行的任务（task）可能会执行
完，也可能没有执行完。

gulp `不再支持同步任务`（Synchronous tasks）。因为同步任务常常会导致难以调试的细
微错误，例如忘记从任务（task）中返回 stream。

## gulp 返回

gulp 任务必须要有 return，返回方式有如下几种:

- stream
  ```
  const { src, dest } = require('gulp');
  function streamTask() {
      return src('*.js')
          .pipe(dest('output'));
      }
  exports.default = streamTask;
  ```
- promise
  ```
  function promiseTask() {
       return Promise.resolve('the value is ignored');
  }
  exports.default = promiseTask;
  ```
- event emitter

  ```
  const { EventEmitter } = require('events');
  function eventEmitterTask() {
      const emitter = new EventEmitter();
      // Emit has to happen async otherwise gulp isn't listening yet
      setTimeout(() => emitter.emit('finish'), 250);
      return emitter;
  }

  exports.default = eventEmitterTask;
  ```

- child process

  ```
  const { exec } = require('child_process');

  function childProcessTask() {
      return exec('date');
  }

  exports.default = childProcessTask;
  ```

- observable

  ```
  const { Observable } = require('rxjs');

  function observableTask() {
      return Observable.of(1, 2, 3);
  }

  exports.default = observableTask;
  ```

- callback

  如果任务（task）不返回任何内容，则必须使用 callback 来指示任务已完成。在如下示
  例中，callback 将作为唯一一个名为 cb() 的参数传递给你的任务（task）。

  ```
  function callbackTask(cb) {
        // `cb()` should be called by some async work
       cb();
  }

  exports.default = callbackTask;
  ```

  如需通过 callback 把任务（task）中的错误告知 gulp，请将 Error 作为 callback 的
  唯一参数。

  ```
  function callbackError(cb) {
      // `cb()` should be called by some async work
       cb(new Error('kaboom'));
  }

  exports.default = callbackError;
  ```

  然而，你通常会将此 callback 函数传递给另一个 API ，而不是自己调用它。

  ```
  const fs = require('fs');

  function passingCallback(cb) {
      fs.access('gulpfile.js', cb);
  }

  exports.default = passingCallback;
  ```

- async/await

  如果不使用前面提供到几种方式，你还可以将任务（task）定义为一个 async 函数，它
  将利用 promise 对你的任务（task）进行包装。这将允许你使用 await 处理 promise，
  并使用其他同步代码。

  ```
  const fs = require('fs');

  async function asyncAwaitTask() {
      const { version } = fs.readFileSync('package.json');
      console.log(version);
      await Promise.resolve('some result');
  }

  exports.default = asyncAwaitTask;
  ```

当你看到 _"Did you forget to signal async completion?"_ 警告时，说明你并未使用前
面提到的返回方式。你需要**使用 callback 或返回 stream、promise、event
emitter、child process、observable**来解决此问题。

## gulp 实战

### 创建任务

在项目根目录创建个 `gulpfile.js` 文件,执行 `gulp` 命令后，`gulp` 会去读取
`gulpfile.js` 文件，这是 `gulp` 的入口文件，所有的指令逻辑处理都在此文件中进行。

当项目体量过大时，可以在根目录内创建个 `gulpfile.js` 文件夹，文件夹内部创建
`index.js`，可以在 `index.js` 中引入不同的处理模块.

在以前的版本中都是通过 `gulp.task` 来创建不同的任务，新版本主要通过
`exports.xxx` 来导出任务

```
function test(cb) {
 cb()
}

exports.test = test;
```

在控制台输入指令 gulp test

```
[16:41:29] Using gulpfile F:\gulp\gulpfile.js
[16:41:29] Starting 'test'...
[16:41:29] Finished 'test' after 1.95 ms
```

如果将 `exports.test = test`改为 `exports.default=test`,在控制台直接输入 `gulp`
就可以直接构建了。

### 处理 js

压缩 js、创建 sourcemap、重命名 js

```
const {
  src, //gulp的内置方法
  dest
} = require('gulp');
//重命名js文件
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');

function javascript() {
  return src(['src/js/*.js', '!src/js/*.min.js']) //1.创建一个流，从src读取
    //2.创建sourcemap
    .pipe(sourcemaps.init())
    //pipe为gulp内的一个方法
    //用于流之间的链接
    // 3. 压缩文件
    .pipe(uglify())
    //4.重命名，名称后加min.js
    .pipe(rename({
      extname: '.min.js'
    }))
    //5.将sourcemap写入
    .pipe(sourcemaps.write('./'))
    // 6.将文件写入build/js目录下
    .pipe(dest('build/js'))
}

exports.javascript = javascript;
```

控制台输入指令 gulp javascript

在 build/js 下会生成两个文件 index.min.js 以及 index.min.js.map

### 处理 css

压缩 css、创建 sourcemap、重命名 css

```
const {
  src,
  dest
} = require('gulp');
const minifyCSS = require('gulp-clean-css');
const sourcemaps = require('gulp-sourcemaps');
const autoprefixer = require('gulp-autoprefixer');

function css() {
  return src('src/css/*.css') //1.流入口文件
    //2.创建sourcemap
    .pipe(sourcemaps.init())
    //3.自动添加浏览器前缀
    .pipe(autoprefixer())
    // 4.压缩css
    .pipe(minifyCSS())
    //5.写入sourcemap
    .pipe(sourcemaps.write('./'))
    //6.写入文件
    .pipe(dest('build/css'))
}

exports.css = css;
```

控制台输入指令 gulp css

在 build/js 下会生成两个文件 index.min.css 以及 index.min.css.map

### 处理图片

```
const {
  src,
  dest
} = require('gulp');
const imagemin = require('gulp-imagemin')

function image() {
  return src('src/images/*.*') // 1. 创建输入流
    // 2. 压缩图片
    .pipe(imagemin({
      progressive: true
    }))
    // 3. 写入文件
    .pipe(dest('build/images'))
}

exports.image = image;
```

控制台输入指令 gulp image,可以看到图片的压缩比例

```
[17:00:07] Using gulpfile F:\gulp-demo\gulpfile.js
[17:00:07] Starting 'image'...
[17:00:19] gulp-imagemin: Minified 3 images (saved 449 kB - 35.5%)
[17:00:19] Finished 'image' after 12 s
```

### 处理 less

```
const {
  src,
  dest
} = require('gulp');
const gulpLess = require('gulp-less');
const minifyCss = require('gulp-clean-css')
const sourcemaps = require('gulp-sourcemaps');
const rename = require('gulp-rename');

function less() {
  return src('src/less/**.less') //1.创建输入流
    //2.创建sourcemap
    .pipe(sourcemaps.init())
    //3.less转为css
    .pipe(gulpLess())
    //4.压缩css
    .pipe(minifyCss())
    //5.修改名称
    .pipe(rename({extname: '.min.css'}))
    //6.写入sourcemap
    .pipe(sourcemaps.write('./'))
    //7.写入文件
    .pipe(dest('build/less'))
}

exports.less = less;
```

控制台输入指令 gulp less 在 build/less 下会生成两个文件 index.min.css 以及
index.min.css.map

[项目地址](https://github.com/upJiang/gulp-study)
