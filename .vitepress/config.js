const getPages = require('./utils/pages')

async function getConfig() {
  const config = {
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
      [
        'link',
        { rel: 'stylesheet', href: 'https://unpkg.com/gitalk/dist/gitalk.css' }
      ],
      ['script', { src: 'https://unpkg.com/gitalk/dist/gitalk.min.js' }]
    ],
    title: "Jiang's Blog",
    themeConfig: {
      pages: await getPages(),
      author: 'Jiang',
      algolia: {
        apiKey: '20a5e8ceef472b845b59bc164e9fae87',
        indexName: 'jiang'
      },
      search: true,
      nav: [
        { text: '🏡首页', link: '/' },
        { text: '📚基础', link: '/docs/jsBase/git' },
        { text: '🤵面试', link: '/docs/interview/center' },
        { text: '🙇进阶', link: '/docs/jsAdvanced/vue3' },
        { text: '🤭资源&工具', link: '/docs/resources/learning' },
        { text: '🧾github', link: 'https://github.com/upJiang' }
        // { text: '🧾文章', link: '/docs/article/index' }
        // { text: "归档", link: "/docs" },
        // { text: "分类", link: "/tags" },
      ],
      sidebar: {
        '/': [],
        // 侧边栏
        '/docs/jsBase/': [
          {
            text: '基础',
            children: [
              { text: 'git', link: '/docs/jsBase/git' },
              { text: 'es6', link: '/docs/jsBase/es6' },
              { text: 'jquery', link: '/docs/jsBase/jquery' },
              { text: 'css', link: '/docs/jsBase/css' },
              { text: 'this指向', link: '/docs/jsBase/this' },
              { text: 'JavaScript上下文', link: '/docs/jsBase/context' },
              { text: '垃圾回收机制方式', link: '/docs/jsBase/garbage' },
              { text: '内存管理', link: '/docs/jsBase/memory' },
              { text: '原型/原型链', link: '/docs/jsBase/prototype' },
              { text: 'js中的new', link: '/docs/jsBase/new' },
              { text: 'js中的五种绑定', link: '/docs/jsBase/bind' },
              { text: 'https', link: '/docs/jsBase/https' },
              { text: '浏览器缓存', link: '/docs/jsBase/storage' },
              { text: 'event loop', link: '/docs/jsBase/eventLoop' },
              { text: '深拷贝与浅拷贝', link: '/docs/jsBase/copy' },
              { text: '前端模块化', link: '/docs/jsBase/module' },
              { text: '跨域', link: '/docs/jsBase/cors' },
              { text: 'CSRF/XSS', link: '/docs/jsBase/CSRF' },
              { text: 'websocket', link: '/docs/jsBase/websocket' },
              { text: 'http缓存', link: '/docs/jsBase/Cache' },
              { text: '闭包', link: '/docs/jsBase/closure' }
            ]
          }
        ],
        '/docs/interview/': [
          {
            text: '面试',
            children: [
              { text: '面试指南', link: '/docs/interview/target' },
              { text: 'js问题', link: '/docs/interview/jsBaseQuestion' },
              { text: 'vue问题', link: '/docs/interview/vueBaseQuestion' },
              { text: 'react问题', link: '/docs/interview/reactBaseQuestion' },
              {
                text: '计算机网络问题',
                link: '/docs/interview/networkBaseQuestion'
              },
              { text: '垂直居中', link: '/docs/interview/center' },
              { text: '进程、线程', link: '/docs/interview/process' },
              { text: '判断数据类型', link: '/docs/interview/dataType' },
              { text: '盒模型及如何转换', link: '/docs/interview/boxsizing' },
              { text: '回流、重绘', link: '/docs/interview/repaint' },
              { text: '节流防抖', link: '/docs/interview/debounce' },
              { text: 'HTTP状态码', link: '/docs/interview/httpCode' },
              {
                text: 'vue中的hash跟history',
                link: '/docs/interview/hashMode'
              },
              {
                text: 'promise链式无限回调',
                link: '/docs/interview/promiseCicle'
              },
              { text: 'async', link: '/docs/interview/async' },
              {
                text: 'proxy/defineProperty',
                link: '/docs/interview/defineProperty'
              },
              { text: 'dns域名解析做了什么', link: '/docs/interview/dns' },
              { text: '长列表的优化', link: '/docs/interview/longList' }
            ]
          }
        ],
        '/docs/jsAdvanced/': [
          {
            text: '进阶',
            children: [
              { text: 'vue3', link: '/docs/jsAdvanced/vue3' },
              { text: 'vite', link: '/docs/jsAdvanced/vite' },
              { text: '纯函数', link: '/docs/jsAdvanced/pureFuntion' },
              { text: 'nvm管理node', link: '/docs/jsAdvanced/nvm' },
              { text: 'cURL', link: '/docs/jsAdvanced/cURL' },
              { text: 'husky', link: '/docs/jsAdvanced/husky' },
              { text: 'js原理学习路线', link: '/docs/jsAdvanced/jsAdvanced' },
              { text: 'sentry', link: '/docs/jsAdvanced/sentry' },
              { text: 'vueComponent', link: '/docs/jsAdvanced/vueComponent' }
            ]
          }
        ],
        '/docs/resources/': [
          {
            text: '资源&工具',
            children: [
              { text: '前端学习', link: '/docs/resources/learning' },
              { text: '在线工具', link: '/docs/resources/tool' }
            ]
          }
        ]
      }
    },
    dest: 'public'
  }

  return config
}
module.exports = getConfig()
