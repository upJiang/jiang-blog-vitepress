
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
- 对于希望以最大并发来运行的任务（tasks），可以使用 `parallel()` 方法将它们组合起来。

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

当使用 `series()` 组合多个任务（task）时，任何一个任务（task）的错误将导致整个任务组合结束，并且不会进一步执行其他任务。当使用 `parallel()` 组合多个任务（task）时，一个任务的错误将结束整个任务组合的结束，但是其他并行的任务（task）可能会执行完，也可能没有执行完。

gulp `不再支持同步任务`（Synchronous tasks）。因为同步任务常常会导致难以调试的细微错误，例如忘记从任务（task）中返回 stream。
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

    如果任务（task）不返回任何内容，则必须使用 callback 来指示任务已完成。在如下示例中，callback 将作为唯一一个名为 cb() 的参数传递给你的任务（task）。
    ```
    function callbackTask(cb) {
          // `cb()` should be called by some async work
         cb();
    }

    exports.default = callbackTask;
    ```
    如需通过 callback 把任务（task）中的错误告知 gulp，请将 Error 作为 callback 的唯一参数。
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

    如果不使用前面提供到几种方式，你还可以将任务（task）定义为一个 async 函数，它将利用 promise 对你的任务（task）进行包装。这将允许你使用 await 处理 promise，并使用其他同步代码。
    ```
    const fs = require('fs');

    async function asyncAwaitTask() {
        const { version } = fs.readFileSync('package.json');
        console.log(version);
        await Promise.resolve('some result');
    }

    exports.default = asyncAwaitTask;
    ```

当你看到 *"Did you forget to signal async completion?"* 警告时，说明你并未使用前面提到的返回方式。你需要**使用 callback 或返回 stream、promise、event emitter、child process、observable**来解决此问题。

## gulp 实战
### 创建任务
gulp.task(任务名，[先执行的任务],执行任务的函数)
```
```
