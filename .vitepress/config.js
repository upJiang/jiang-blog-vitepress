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
      ['script', { src: 'https://unpkg.com/gitalk/dist/gitalk.min.js' }],
      [
        'script',
        {
          src: 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.slim.min.js'
        }
      ],
      [
        'script',
        {
          src: 'https://cdnjs.cloudflare.com/ajax/libs/fancybox/3.5.2/jquery.fancybox.min.js'
        }
      ],
      [
        'link',
        {
          rel: 'stylesheet',
          type: 'text/css',
          href: 'https://cdnjs.cloudflare.com/ajax/libs/fancybox/3.5.2/jquery.fancybox.min.css'
        }
      ]
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
        { text: '📑重学前端', link: '/docs/reStudy/start' },
        { text: '📚基础', link: '/docs/jsBase/git' },
        { text: '🤵面试', link: '/docs/interview/center' },
        { text: '🙇进阶', link: '/docs/jsAdvanced/vue3' },
        { text: '🤭资源&工具', link: '/docs/resources/learning' },
        { text: '🧾github', link: 'https://github.com/upJiang' },
        { text: '👍掘金', link: 'https://juejin.cn/user/862487522314366' },
        { text: '🍉工作问题', link: '/docs/work/h5' }
        // { text: '🧾文章', link: '/docs/article/index' }
        // { text: "归档", link: "/docs" },
        // { text: "分类", link: "/tags" },
      ],
      sidebar: {
        '/': [],
        // 侧边栏
        '/docs/reStudy/': [
          {
            text: '重学前端',
            children: [
              { text: '开始', link: '/docs/reStudy/start' },
              { text: 'js_类型', link: '/docs/reStudy/js_type' },
              { text: 'js_对象', link: '/docs/reStudy/js_object' },
              { text: 'js_原型', link: '/docs/reStudy/js_prototype' },
              { text: 'js_事件循环', link: '/docs/reStudy/js_eventLoop' },
              { text: 'js_闭包&执行上下文', link: '/docs/reStudy/js_closure' },
              { text: 'js_函数', link: '/docs/reStudy/js_function' },
              { text: 'js_语句', link: '/docs/reStudy/js_completion' },
              { text: 'js_词法', link: '/docs/reStudy/js_token' },
              { text: 'js_分号', link: '/docs/reStudy/js_semicolon' },
              { text: 'js_语法', link: '/docs/reStudy/js_grammar' },
              { text: 'html_标签', link: '/docs/reStudy/html_tag' },
              { text: 'html_元信息标签', link: '/docs/reStudy/html_head' },
              { text: 'html_替换型元素', link: '/docs/reStudy/html_tramslate' },
              { text: 'html_标准', link: '/docs/reStudy/html_standard' },
              { text: 'html_DTD', link: '/docs/reStudy/html_DTD' },
              { text: 'html_ARIA', link: '/docs/reStudy/html_ARIA' },
              { text: 'css_规则', link: '/docs/reStudy/css_rule' },
              { text: 'css_选择器', link: '/docs/reStudy/css_select' },
              { text: 'css_链接', link: '/docs/reStudy/css_link' },
              { text: 'css_排版', link: '/docs/reStudy/css_compose' },
              { text: 'css_动画', link: '/docs/reStudy/css_animation' },
              { text: 'css_颜色', link: '/docs/reStudy/css_color' },
              { text: 'browser_http', link: '/docs/reStudy/browser_http' },
              { text: 'browser_Dom构建', link: '/docs/reStudy/browser_dom' },
              { text: 'browser_CSS计算', link: '/docs/reStudy/browser_css' },
              { text: 'browser_排版', link: '/docs/reStudy/browser_maker' },
              { text: 'browser_渲染', link: '/docs/reStudy/browser_print' },
              { text: 'browser_DOM_API', link: '/docs/reStudy/browser_domApi' },
              { text: 'browser_CSSDOM', link: '/docs/reStudy/browser_cssdom' },
              { text: 'browser_事件', link: '/docs/reStudy/browser_event' },
              { text: 'sum_性能', link: '/docs/reStudy/sum_performance' },
              { text: 'sum_工具链', link: '/docs/reStudy/sum_tool' },
              { text: 'sum_持续集成', link: '/docs/reStudy/sum_continue' },
              { text: 'sum_搭建系统', link: '/docs/reStudy/sum_system' },
              { text: 'sum_架构', link: '/docs/reStudy/sum_architecture' },
              { text: 'other_问题', link: '/docs/reStudy/other_question' }
            ]
          }
        ],
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
              { text: '22年初面试准备', link: '/docs/interview/22Ready' },
              { text: '手写面试题', link: '/docs/interview/writeQuestion' },
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
              { text: '长列表的优化', link: '/docs/interview/longList' },
              { text: '性能优化', link: '/docs/interview/performaceOpt' },
              { text: '输入URL', link: '/docs/interview/URL' }
            ]
          }
        ],
        '/docs/jsAdvanced/': [
          {
            text: '进阶',
            children: [
              { text: 'TS', link: '/docs/jsAdvanced/ts' },
              { text: 'vue3', link: '/docs/jsAdvanced/vue3' },
              { text: 'vite', link: '/docs/jsAdvanced/vite' },
              { text: '纯函数', link: '/docs/jsAdvanced/pureFuntion' },
              { text: 'nvm管理node', link: '/docs/jsAdvanced/nvm' },
              { text: 'cURL', link: '/docs/jsAdvanced/cURL' },
              { text: 'husky', link: '/docs/jsAdvanced/husky' },
              { text: 'js原理学习路线', link: '/docs/jsAdvanced/jsAdvanced' },
              { text: 'sentry', link: '/docs/jsAdvanced/sentry' },
              {
                text: 'vue3的三种组件封装',
                link: '/docs/jsAdvanced/vueComponent'
              },
              { text: 'mock', link: '/docs/jsAdvanced/mock' },
              { text: '组件库开发', link: '/docs/jsAdvanced/jiangVui' },
              {
                text: '请求loading封装',
                link: '/docs/jsAdvanced/loadingHandle'
              },
              {
                text: '前端规范',
                link: '/docs/jsAdvanced/standard'
              },
              {
                text: 'changelog',
                link: '/docs/jsAdvanced/changelog'
              },
              {
                text: '监控与埋点',
                link: '/docs/jsAdvanced/monitor'
              },
              {
                text: 'gulp',
                link: '/docs/jsAdvanced/gulp'
              }
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
        ],
        '/docs/work/': [
          {
            text: '工作问题',
            children: [
              { text: 'h5', link: '/docs/work/h5' },
              { text: 'vue', link: '/docs/work/vue' }
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
