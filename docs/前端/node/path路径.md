> Node.js 内置了一个 path 模块，专门用于处理文件路径和目录路径。

## path.join

将多个路径拼接成一个相对路径 (或绝对路径，取决于第一个路径是否为根路径)。

```
import path from 'path'

console.log(path.join('a', 'b', 'c'))
console.log(path.join(process.cwd(), '/hello', 'world'))
```

<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d8ad16cf30f744918e8292a5506d0860~tplv-k3u1fbpfcp-jj-mark:1512:0:0:0:q75.awebp#?w=682&h=134&s=150164&e=png&b=221431">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d8ad16cf30f744918e8292a5506d0860~tplv-k3u1fbpfcp-jj-mark:1512:0:0:0:q75.awebp#?w=682&h=134&s=150164&e=png&b=221431)</a>

## path.resolve

将多个路径拼接成一个绝对路径，返回一个解析后的绝对路径。

即如果传入相对路径，会以当前工作目录为基准，计算出绝对路径，如果传入了绝对路径，
则以传入的绝对路径为基准。

```
import path from 'path'

console.log('=== path.resolve ===')
console.log(path.resolve('a', 'b', 'c'))
console.log(path.resolve('/hello', 'world', './a', 'b'))
```

<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e80e308b79364872855b77355ac6d1d3~tplv-k3u1fbpfcp-jj-mark:1512:0:0:0:q75.awebp#?w=617&h=157&s=182013&e=png&b=041b33">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e80e308b79364872855b77355ac6d1d3~tplv-k3u1fbpfcp-jj-mark:1512:0:0:0:q75.awebp#?w=617&h=157&s=182013&e=png&b=041b33)</a>

## path.dirname

返回路径中的目录名。

```
console.log('=== path.dirname ===')
console.log(path.dirname(process.cwd()))
console.log(path.dirname('/a/b/c'))
```

<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d75ec135b2e34f8aa0d3eeb7dc15a988~tplv-k3u1fbpfcp-jj-mark:1512:0:0:0:q75.awebp#?w=489&h=137&s=114490&e=png&b=23142e">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d75ec135b2e34f8aa0d3eeb7dc15a988~tplv-k3u1fbpfcp-jj-mark:1512:0:0:0:q75.awebp#?w=489&h=137&s=114490&e=png&b=23142e)</a>

## path.basename

返回路径中的文件名，并可选地去除给定的文件扩展名。

```
console.log('=== path.basename ===')
console.log(path.basename('a/b/c.js'))
console.log(path.basename('a/b/c.js', '.js'))
console.log(path.basename('a/b/c.js', 'js'))
console.log(path.basename('a/b/c.js', 's'))
```

<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a26becdf613742acb33baaaddbb8ba2f~tplv-k3u1fbpfcp-jj-mark:1512:0:0:0:q75.awebp#?w=345&h=167&s=91524&e=png&b=190b2e">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a26becdf613742acb33baaaddbb8ba2f~tplv-k3u1fbpfcp-jj-mark:1512:0:0:0:q75.awebp#?w=345&h=167&s=91524&e=png&b=190b2e)</a>

## path.extname

获取路径中的文件扩展名。

```
console.log('=== path.extname ===')
console.log(path.extname('a/b/c.js'))
console.log(path.extname('a/b/c'))
console.log(path.extname('a/b/c.d.ts'))
console.log(path.extname('a/b/.npmrc'))
```

<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/62c19793bee14d8e87bb8af3ea5c5466~tplv-k3u1fbpfcp-jj-mark:1512:0:0:0:q75.awebp#?w=276&h=190&s=86730&e=png&b=1f1227">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/62c19793bee14d8e87bb8af3ea5c5466~tplv-k3u1fbpfcp-jj-mark:1512:0:0:0:q75.awebp#?w=276&h=190&s=86730&e=png&b=1f1227)</a>

## path.normalize

主要用于规范化路径，将路径中的不规范部分调整为标准格式，可以用于处理以下问题：

- 路径中的斜杠数量过多的情况。
- 路径中存在的 `./` 或 `../`，即相对路径的情况。

```
console.log('=== path.normalize ===')
console.log(path.normalize('a//b//c/d/e/..'))
```

<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/476273d481cf4cdf926db7098c7e47f0~tplv-k3u1fbpfcp-jj-mark:1512:0:0:0:q75.awebp#?w=288&h=136&s=65230&e=png&b=1f1227">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/476273d481cf4cdf926db7098c7e47f0~tplv-k3u1fbpfcp-jj-mark:1512:0:0:0:q75.awebp#?w=288&h=136&s=65230&e=png&b=1f1227)</a>
