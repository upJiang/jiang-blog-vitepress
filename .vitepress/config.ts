
export default{
  head: [
    [
      'meta',
      {
        name: 'viewport',
        content:
          'width=device-width,initial-scale=1,minimum-scale=1.0,maximum-scale=1.0,user-scalable=no'
      }
    ],
    ['meta', { name: 'keywords', content: 'Jiang的个人博客' }],
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    // 引入 Gitalk
    // [
    //   'link',
    //   { rel: 'stylesheet', href: 'https://unpkg.com/gitalk/dist/gitalk.css' }
    // ],
    // ['script', { src: 'https://unpkg.com/gitalk/dist/gitalk.min.js' }],
    [
      'script',
      {
        src: '/jquery.min.js'
      }
    ],
    [
      'script',
      {
        src: '/jquery.fancybox.min.js'
      }
    ],
    [
      'link',
      {
        rel: 'stylesheet',
        type: 'text/css',
        href: '/jquery.fancybox.min.css'
      }
    ]
  ],
  title: "Jiang's Blog",

  themeConfig: {
    lang: 'zh-CH',
    returnToTopLabel:'回到顶部',
    author: 'Jiang',
    algolia: {
      appId: '6O9LAT3AQ0',
      apiKey: 'b190dd5932dd6b365be5d1dcf87257ec',
      indexName: 'junfeng530'
    },
    docFooter: { 
      prev: '上一篇',
      next: '下一篇'
    },
    search: true,
    nav: [
      { text: '🏡首页', link: '/' },
      { text: '📚前端', link: '/docs/前端/start' },
      {
        text: '📑进阶学习',
        items: [
          { text: '😘 重学前端', link: '/docs/进阶学习/重学前端/start' },
          { text: '🤣 前端算法', link: '/docs/进阶学习/前端算法/dataStructures' },
          { text: '😊 babel通关秘籍', link: '/docs/进阶学习/babel通关秘籍/start' },
          { text: '😇 前端面试之道', link: '/docs/进阶学习/前端面试之道/jsBase' },
          { text: '😲 深入浅出vite', link: '/docs/进阶学习/深入浅出vite/start' },
          { text: '🧑🏻 玩转vue3', link: '/docs/进阶学习/玩转vue3/start' },
          { text: '🤖 落地前端工程化', link: '/docs/进阶学习/落地前端工程化/start' },
          { text: '😾 基于 Vite 的组件库工程化实战', link: '/docs/进阶学习/基于Vite的组件库工程化实战/start' },
          { text: '😤 前端调试通关秘籍', link: '/docs/进阶学习/前端调试通关秘籍/start' },
          { text: '😮 nextJs 官网 SSR 实战', link: '/docs/进阶学习/nextJs官网SSR实战/start' },
          { text: '⛳ 前端大师课笔记', link: '/docs/进阶学习/前端大师课笔记/start' },
        ]
      },
      { text: '🍉工作问题', link: '/docs/工作问题/h5' },
      { text: '🤭学习资源', link: '/docs/学习资源/learning' },
      { text: '🧾github', link: 'https://github.com/upJiang' },
      { text: '👍掘金', link: 'https://juejin.cn/user/862487522314366' }
    ],
    sidebar: {
      '/docs/前端/': [
        { text: '🕮 知识结构', link: '/docs/前端/start' },
        { 
          text: '📓 前端基础', 
          collapsed: true,
          items:[
            { 
              text: '🚩 html', 
              link: '/docs/前端/前端基础/html/start',
              items:[
                { text: '🏴 开篇', link: '/docs/前端/前端基础/html/开篇' },
              ]

            },
            { 
              text: '🚩 css', 
              collapsed: true,
              items:[
                { text: '🏴 开篇', link: '/docs/前端/前端基础/css/开篇' },
                { text: '🏴 浮动与BFC', link: '/docs/前端/前端基础/css/浮动与BFC' },
                { text: '🏴 垂直居中', link: '/docs/前端/前端基础/css/垂直居中' },
                { text: '🏴 块盒', link: '/docs/前端/前端基础/css/块盒' },
                { text: '🏴 常见问题', link: '/docs/前端/前端基础/css/常见问题' },
              ]
            },
            { 
              text: '🚩 js', 
              collapsed: true,
              items:[
                { text: '🏴 开篇', link: '/docs/前端/前端基础/js/开篇' },
                { text: '🏴 变量类型', link: '/docs/前端/前端基础/js/变量类型' },
                { text: '🏴 词法分析-预编译-作用域-执行上下文-闭包', link: '/docs/前端/前端基础/js/词法分析-预编译-作用域-执行上下文-闭包' },
                { text: '🏴 原型/原型链', link: '/docs/前端/前端基础/js/原型' },
                { text: '🏴 js中的五种绑定', link: '/docs/前端/前端基础/js/js中的五种绑定' },
                { text: '🏴 es6', link: '/docs/前端/前端基础/js/es6' },
                { text: '🏴 jquery', link: '/docs/前端/前端基础/js/jquery' },
                { text: '🏴 this指向', link: '/docs/前端/前端基础/js/this' },
                { text: '🏴 垃圾回收机制方式', link: '/docs/前端/前端基础/js/垃圾回收机制方式' },
                { text: '🏴 内存管理', link: '/docs/前端/前端基础/js/内存管理' },
                { text: '🏴 event loop', link: '/docs/前端/前端基础/js/eventLoop' },
                { text: '🏴 深拷贝与浅拷贝', link: '/docs/前端/前端基础/js/深拷贝与浅拷贝' },
                { text: '🏴 前端模块化', link: '/docs/前端/前端基础/js/前端模块化' },
                { text: '🏴 前端模块化', link: '/docs/前端/前端基础/js/常见问题' },
              ]
            },
            { text: '🚩 git', link: '/docs/前端/前端基础/git/start' },
          ]
        },
        { 
          text: '📒 浏览器', 
          collapsed: true,
          items:[
            { text: '🚩 开篇', link: '/docs/前端/浏览器/start' },
            { text: '🚩 dns域名解析做了什么', link: '/docs/前端/浏览器/dns域名解析' },
            { text: '🚩 输入URL', link: '/docs/前端/浏览器/输入URL' },
            { text: '🚩 http', link: '/docs/前端/浏览器/http' },
            { text: '🚩 浏览器缓存', link: '/docs/前端/浏览器/浏览器缓存' },
            { text: '🚩 浏览器安全', link: '/docs/前端/浏览器/浏览器安全' },
            { text: '🚩 websocket', link: '/docs/前端/浏览器/websocket' },
          ]
        },
        { 
          text: '📒 计算机网络', 
          collapsed: true,
          items:[
            { text: '🚩 开篇', link: '/docs/前端/计算机网络/start' },
          ]
        },
        { 
          text: '📘 构建工具', 
          collapsed: true,
          items:[
            { 
              text: '🚩 vite', 
              collapsed: true, 
              items:[
                { text: '🏴 开篇', link: '/docs/前端/构建工具/vite/start' },
                { text: 'mini-vite', link: '/docs/前端/构建工具/vite/mini-vite' },
              ]
            },
            { 
              text: '🚩 webpack', 
              collapsed: true, 
              items:[
                { text: '🏴 开篇', link: '/docs/前端/构建工具/webpack/start' },
              ]
            },
            { 
              text: '🚩 gulp', 
              collapsed: true, 
              items:[
                { text: '🏴 开篇', link: '/docs/前端/构建工具/gulp/start' },
              ]
            },
          ]
        },
        { 
          text: '📗 算法', 
          collapsed: true, 
          items:[
            { text: '🚩 开篇', link: '/docs/前端/算法/开篇' },
          ]
        },
        { 
          text: '📙 工程化', 
          collapsed: true,
          items:[
            {
              text: '🚩 前端规范',
              link: '/docs/前端/工程化/standard'
            },
           
            { text: '🚩 组件库开发', link: '/docs/前端/工程化/组件库开发' },
            {
              text: '🚩 服务器搭建',
              link: '/docs/前端/工程化/服务器搭建'
            },
            {
              text: '🚩 changelog',
              link: '/docs/前端/工程化/changelog'
            },
            {
              text: '🚩 chatGPT微信机器人搭建',
              link: '/docs/前端/工程化/chatGPT'
            },
            { text: '🚩 cURL', link: '/docs/前端/工程化/cURL' }, 
            { text: '🚩 mock', link: '/docs/前端/工程化/mock' },
          ]
        },
        { 
          text: '📕 性能监控', 
          collapsed: true,
          items:[
            { text: '🚩 sentry', link: '/docs/前端/性能监控/sentry' },
            {
              text: '🚩 监控与埋点',
              link: '/docs/前端/性能监控/monitor'
            },
          ]
        },
        { 
          text: '📔 性能优化', 
          collapsed: true,
          items:[
            {
              text: '🚩 性能优化',
              link: '/docs/前端/性能优化/performance'
            },
            { text: '🚩 长列表的优化', link: '/docs/前端/性能优化/longList' },
          ]
        },
        { 
          text: '🗒️ node', 
          collapsed: true,
          items:[
            { text: '🚩 nvm管理node', link: '/docs/前端/node/nvm' },
          ]
        },
        { 
          text: '📋 框架', 
          collapsed: true,
          items:[
            { 
              text: '🚩 Vue',  
              collapsed: true, 
              items:[
                {
                  text: '🏴 vue3',
                  link: '/docs/前端/框架/Vue/vue3'
                },
                {
                  text: '🏴 vue3的三种组件封装',
                  link: '/docs/前端/框架/Vue/vueComponent'
                },
                {
                  text: '🏴 请求loading封装',
                  link: '/docs/前端/框架/Vue/loadingHandle'
                },
                {
                  text: '🏴 vue中的hash跟history',
                  link: '/docs/前端/框架/Vue/hashMode'
                },
              ]
            },
            { text: '🚩 React', link: '/docs/前端/框架/React/start' },
          ]
          
        },
        { 
          text: '🛢️ TypeScript', 
          collapsed: true,
          items:[
            { text: '🚩 TS', link: '/docs/前端/TypeScript/ts' },
          ]
        },
        { 
          text: '📇 面试', 
          collapsed: true,
          items: [
            { text: '🚩 手写面试题', link: '/docs/前端/面试/手写面试题' },
            { text: '🚩 js问题', link: '/docs/前端/面试/js问题' },
            { text: '🚩 vue问题', link: '/docs/前端/面试/vue问题' },
            { text: '🚩 react问题', link: '/docs/前端/面试/react问题' },
            {
              text: '🚩 计算机网络问题',
              link: '/docs/前端/面试/计算机网络问题'
            },
          ] 
        },
        { 
          text: '🐂 web3', 
          collapsed: true,
          items: [
            { text: '🚩 开篇', link: '/docs/前端/web3/开篇' },
            { text: '🚩 Solidity', link: '/docs/前端/web3/Solidity' },
          ] 
        },
      ],
      '/docs/学习资源/': [
        {
          text: '学习资源',
          items: [
            { text: '🍎 前端学习', link: '/docs/学习资源/learning' },
            { text: '🍏 在线工具', link: '/docs/学习资源/tool' }
          ]
        }
      ],
      '/docs/工作问题/': [
        {
          text: '工作问题',
          items: [
            { text: '🍅 h5', link: '/docs/工作问题/h5' },
            { text: '🥝 vue', link: '/docs/工作问题/vue' },
            { text: '🍐 构建', link: '/docs/工作问题/init' },
            { text: '🍌 git', link: '/docs/工作问题/git' }
          ]
        }
      ],
      '/docs/进阶学习/前端算法/': [
        {
          text: '算法',
          items: [
            { text: '数据结构', link: '/docs/进阶学习/前端算法/dataStructures' },
            { text: '遍历二叉树', link: '/docs/进阶学习/前端算法/ergodicTree' },
            { text: '复杂度', link: '/docs/进阶学习/前端算法/complexity' },
            { text: '数组解题', link: '/docs/进阶学习/前端算法/array' },
            { text: '字符串解题', link: '/docs/进阶学习/前端算法/string' },
            { text: '链表解题', link: '/docs/进阶学习/前端算法/chain' },
            {
              text: '链表解题-快慢指针与多指针',
              link: '/docs/进阶学习/前端算法/chainHead'
            },
            { text: '链表解题-环形链表', link: '/docs/进阶学习/前端算法/chainCicle' },
            { text: '栈解题', link: '/docs/进阶学习/前端算法/stack' },
            { text: '队列解题', link: '/docs/进阶学习/前端算法/queue' },
            { text: '深度优先&广度优先', link: '/docs/进阶学习/前端算法/DFS' },
            { text: '递归与回溯思想', link: '/docs/进阶学习/前端算法/thinking' },
            { text: '二叉树', link: '/docs/进阶学习/前端算法/tree' },
            { text: '二叉搜索树', link: '/docs/进阶学习/前端算法/bstTree' },
            { text: '排序算法', link: '/docs/进阶学习/前端算法/sort' },
            { text: '动态规划', link: '/docs/进阶学习/前端算法/dynamic' }
          ]
        }
      ],
      '/docs/进阶学习/babel通关秘籍/': [
        {
          text: 'babel 通关秘籍',
          items: [{ text: '介绍', link: '/docs/进阶学习/babel通关秘籍/start' }]
        }
      ],
      '/docs/进阶学习/前端面试之道/': [
        {
          text: '前端面试之道',
          items: [
            { text: 'js基础', link: '/docs/进阶学习/前端面试之道/jsBase' },
            { text: 'es6', link: '/docs/进阶学习/前端面试之道/es6' },
            { text: '异步编程', link: '/docs/进阶学习/前端面试之道/async' },
            { text: '浏览器知识', link: '/docs/进阶学习/前端面试之道/brower' },
            { text: '安全防范知识', link: '/docs/进阶学习/前端面试之道/secure' },
            { text: '性能优化', link: '/docs/进阶学习/前端面试之道/performance' },
            { text: '网络协议', link: '/docs/进阶学习/前端面试之道/internet' }
          ]
        }
      ],
      '/docs/进阶学习/深入浅出vite/': [
        {
          text: '深入浅出vite',
          items: [
            { text: '开篇', link: '/docs/进阶学习/深入浅出vite/start' },
            { text: '前端模块化', link: '/docs/进阶学习/深入浅出vite/module' },
            { text: '搭建vite项目', link: '/docs/进阶学习/深入浅出vite/init' },
            { text: '处理静态资源', link: '/docs/进阶学习/深入浅出vite/handleStatic' },
            { text: '预构建', link: '/docs/进阶学习/深入浅出vite/construction' },
            { text: 'vite 的实现', link: '/docs/进阶学习/深入浅出vite/achieve' },
            { text: 'Esbuild', link: '/docs/进阶学习/深入浅出vite/esbuild' },
            { text: 'Rollup', link: '/docs/进阶学习/深入浅出vite/rollup' },
            { text: '开发 vite 插件', link: '/docs/进阶学习/深入浅出vite/vitePlugin' },
            { text: 'HMR 热更新', link: '/docs/进阶学习/深入浅出vite/hmr' },
            {
              text: 'Code Splitting 代码分割',
              link: '/docs/进阶学习/深入浅出vite/codeSplitting'
            },
            {
              text: 'polyfill语法降级',
              link: '/docs/进阶学习/深入浅出vite/polyfill'
            }
          ]
        }
      ],
      '/docs/进阶学习/玩转vue3/': [
        {
          text: '玩转vue3',
          items: [
            { text: '开篇', link: '/docs/进阶学习/玩转vue3/start' },
            { text: '渲染器', link: '/docs/进阶学习/玩转vue3/渲染器' }
          ]
        }
      ],
      '/docs/进阶学习/落地前端工程化/': [
        {
          text: '落地前端工程化',
          items: [
            { text: '开篇', link: '/docs/进阶学习/落地前端工程化/start' },
            { text: '模块化', link: '/docs/进阶学习/落地前端工程化/modularity' }
          ]
        }
      ],
      '/docs/进阶学习/基于Vite的组件库工程化实战/': [
        {
          text: '基于 vite 的组件库工程化实战',
          items: [
            { text: '开篇', link: '/docs/进阶学习/基于Vite的组件库工程化实战/start' },
            { text: '创建项目', link: '/docs/进阶学习/基于Vite的组件库工程化实战/create' },
            { text: '添加样式', link: '/docs/进阶学习/基于Vite的组件库工程化实战/addCss' },
            { text: '添加文档', link: '/docs/进阶学习/基于Vite的组件库工程化实战/addDoc' }
          ]
        }
      ],
      '/docs/进阶学习/前端调试通关秘籍/': [
        {
          text: '前端调试通关秘籍',
          items: [
            { text: '开篇', link: '/docs/进阶学习/前端调试通关秘籍/start' },
          ]
        }
      ],
      '/docs/进阶学习/nextJs官网SSR实战/': [
        {
          text: 'nextJs SSR 实战',
          items: [
            { text: '开篇', link: '/docs/进阶学习/nextJs官网SSR实战/start' },
            { text: '项目init', link: '/docs/进阶学习/nextJs官网SSR实战/init' },
            { text: '规范搭建', link: '/docs/进阶学习/nextJs官网SSR实战/standard' },
            { text: '架构搭建', link: '/docs/进阶学习/nextJs官网SSR实战/architecture' },
          ]
        }
      ],
      '/docs/进阶学习/前端大师课笔记/': [
        {
          text: '前端大师课笔记',
          items: [
            { text: '开篇', link: '/docs/进阶学习/前端大师课笔记/start' },
            { text: '事件循环', link: '/docs/进阶学习/前端大师课笔记/eventLoop' },
            { text: '渲染原理', link: '/docs/进阶学习/前端大师课笔记/rendering' },
            { text: '实战', link: '/docs/进阶学习/前端大师课笔记/projectStudy' },
            { text: '属性描述符', link: '/docs/进阶学习/前端大师课笔记/property' },
            { text: '手撕vue', link: '/docs/进阶学习/前端大师课笔记/miniVue' }
          ]
        }
      ],
      '/docs/进阶学习/重学前端/': [
        {
          text: '重学前端',
          items: [
            { text: '开始', link: '/docs/进阶学习/重学前端/start' },
            { text: 'js_类型', link: '/docs/进阶学习/重学前端/js_type' },
            { text: 'js_对象', link: '/docs/进阶学习/重学前端/js_object' },
            { text: 'js_原型', link: '/docs/进阶学习/重学前端/js_prototype' },
            { text: 'js_事件循环', link: '/docs/进阶学习/重学前端/js_eventLoop' },
            { text: 'js_闭包&执行上下文', link: '/docs/进阶学习/重学前端/js_closure' },
            { text: 'js_函数', link: '/docs/进阶学习/重学前端/js_function' },
            { text: 'js_语句', link: '/docs/进阶学习/重学前端/js_completion' },
            { text: 'js_词法', link: '/docs/进阶学习/重学前端/js_token' },
            { text: 'js_分号', link: '/docs/进阶学习/重学前端/js_semicolon' },
            { text: 'js_语法', link: '/docs/进阶学习/重学前端/js_grammar' },
            { text: 'html_标签', link: '/docs/进阶学习/重学前端/html_tag' },
            { text: 'html_元信息标签', link: '/docs/进阶学习/重学前端/html_head' },
            { text: 'html_替换型元素', link: '/docs/进阶学习/重学前端/html_tramslate' },
            { text: 'html_标准', link: '/docs/进阶学习/重学前端/html_standard' },
            { text: 'html_DTD', link: '/docs/进阶学习/重学前端/html_DTD' },
            { text: 'html_ARIA', link: '/docs/进阶学习/重学前端/html_ARIA' },
            { text: 'css_规则', link: '/docs/进阶学习/重学前端/css_rule' },
            { text: 'css_选择器', link: '/docs/进阶学习/重学前端/css_select' },
            { text: 'css_链接', link: '/docs/进阶学习/重学前端/css_link' },
            { text: 'css_排版', link: '/docs/进阶学习/重学前端/css_compose' },
            { text: 'css_动画', link: '/docs/进阶学习/重学前端/css_animation' },
            { text: 'css_颜色', link: '/docs/进阶学习/重学前端/css_color' },
            { text: 'browser_http', link: '/docs/进阶学习/重学前端/browser_http' },
            { text: 'browser_Dom构建', link: '/docs/进阶学习/重学前端/browser_dom' },
            { text: 'browser_CSS计算', link: '/docs/进阶学习/重学前端/browser_css' },
            { text: 'browser_排版', link: '/docs/进阶学习/重学前端/browser_maker' },
            { text: 'browser_渲染', link: '/docs/进阶学习/重学前端/browser_print' },
            { text: 'browser_DOM_API', link: '/docs/进阶学习/重学前端/browser_domApi' },
            { text: 'browser_CSSDOM', link: '/docs/进阶学习/重学前端/browser_cssdom' },
            { text: 'browser_事件', link: '/docs/进阶学习/重学前端/browser_event' },
            { text: 'sum_性能', link: '/docs/进阶学习/重学前端/sum_performance' },
            { text: 'sum_工具链', link: '/docs/进阶学习/重学前端/sum_tool' },
            { text: 'sum_持续集成', link: '/docs/进阶学习/重学前端/sum_continue' },
            { text: 'sum_搭建系统', link: '/docs/进阶学习/重学前端/sum_system' },
            { text: 'sum_架构', link: '/docs/进阶学习/重学前端/sum_architecture' },
            { text: 'other_问题', link: '/docs/进阶学习/重学前端/other_question' }
          ]
        }
      ],
    }
  },
  dest: 'public'
}
  
 

