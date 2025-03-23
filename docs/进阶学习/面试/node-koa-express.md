## Express 最小实现

```javascript
const express = require('express')
const app = express()

// 中间件1：请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  next() // 必须调用next传递控制权
})

// 中间件2：身份验证
app.use((req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send('Unauthorized')
  }
  next()
})

// 中间件3：路由处理
app.get('/api/data', (req, res) => {
  res.json({ data: '敏感数据' })
})

app.listen(3000, () => {
  console.log('Express运行在 http://localhost:3000')
})
```

## KOA 最小实现

```javascript
const Koa = require('koa')
const app = new Koa()

// 中间件1：响应计时
app.use(async (ctx, next) => {
  const start = Date.now()
  await next() // await等待后续中间件完成const ms = Date.now() - start;
  ctx.set('X-Response-Time', `${ms}ms`)
})

// 中间件2：错误处理
app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    ctx.status = 500
    ctx.body = { error: err.message }
  }
})

// 中间件3：业务逻辑
app.use(async (ctx) => {
  ctx.body = { message: 'Hello Koa' }
})

app.listen(3001, () => {
  console.log('Koa运行在 http://localhost:3001')
})
```

## KOA Express 核心差异对比表

|                |                        |                        |
| -------------- | ---------------------- | ---------------------- |
| 特性           | Express                | Koa                    |
| 中间件执行顺序 | 线性执行（流水线模式） | 洋葱圈模型（先进后出） |
| 异步处理       | 需手动处理回调         | 原生支持 async/await   |
| 上下文对象     | 分离的 req/res 对象    | 合并的 ctx 上下文      |
| 错误处理       | 需中间件最后处理       | 可通过 try-catch 捕获  |
| 代码风格       | 回调函数式             | 更现代的异步语法       |
| 基础路由       | 内置路由系统           | 需要 koa-router 中间件 |

### 简述洋葱模型

Koa 的洋葱模型指**中间件双向处理流程**：请求先逐层向内传递，响应再反向向外返回。
每个中间件在`await next()`前后分别处理请求和响应，形成类似洋葱的层次结构，实现更
精细的流程控制。
