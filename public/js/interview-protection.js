// 面试资料保护脚本
// 确保只在浏览器环境中执行
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // 使用立即执行函数，防止变量污染全局命名空间
  ;(function () {
    try {
      console.log('面试保护脚本加载 - ' + new Date().toLocaleString())

      // 使用更可靠的方式检测当前路径
      function getCurrentPath() {
        return decodeURIComponent(window.location.pathname)
      }

      // 检查是否是需要保护的页面 - 使用最严格的匹配
      function isProtectedPage(path) {
        // 匹配面试目录下的所有页面（除了密码页面）
        // 统一使用小写来比较，增加兼容性
        const lowerPath = path.toLowerCase()

        // 添加更精确的路径匹配
        const interviewDirPattern = '/docs/进阶学习/面试/'
        const passwordPattern = '/password'

        return (
          lowerPath.indexOf(interviewDirPattern) > -1 &&
          !(
            lowerPath.endsWith(passwordPattern) ||
            lowerPath.endsWith(passwordPattern + '.html') ||
            lowerPath.endsWith(passwordPattern + '/')
          )
        )
      }

      // 检查授权状态 - 更严格的检查
      function checkAuthorization() {
        try {
          // 检查localStorage中的授权状态
          const authStatus = localStorage.getItem('interview_auth') === 'true'
          const authTime = parseInt(
            localStorage.getItem('interview_auth_time') || '0',
            10
          )
          const currentTime = Date.now()
          const oneDayInMs = 24 * 60 * 60 * 1000

          // 确保时间差有效且授权状态正确
          const isValid = authStatus && currentTime - authTime < oneDayInMs
          console.log(
            '授权时间检查:',
            new Date(authTime).toLocaleString(),
            '当前:',
            new Date(currentTime).toLocaleString()
          )

          return isValid
        } catch (error) {
          console.error('授权状态检查失败:', error)
          return false
        }
      }

      // 重定向到密码页面
      function redirectToPasswordPage(currentPath) {
        // 先保存当前路径用于验证后返回
        try {
          localStorage.setItem('interview_redirect', currentPath)
          console.log('已保存重定向路径:', currentPath)
        } catch (error) {
          console.error('保存路径失败', error)
        }

        // 确保阻止页面渲染，防止内容闪现
        const style = document.createElement('style')
        style.textContent = 'body{display:none !important}'
        document.head.appendChild(style)

        // 完全阻止后续代码执行的强制重定向
        const passwordPageUrl = '/docs/进阶学习/面试/password.html'
        console.log('执行重定向到:', passwordPageUrl)

        // 使用replace避免浏览器历史堆积
        window.location.replace(passwordPageUrl)
      }

      // 执行授权检查并处理
      function main() {
        const currentPath = getCurrentPath()
        console.log('当前路径:', currentPath)

        // 检查是否是保护页面
        if (isProtectedPage(currentPath)) {
          console.log('访问的是受保护页面')

          // 检查授权状态
          const isAuthorized = checkAuthorization()
          console.log('授权状态:', isAuthorized)

          // 如果未授权，重定向到密码页面
          if (!isAuthorized) {
            console.log('未授权，执行重定向...')
            redirectToPasswordPage(currentPath)
            return false // 阻止后续执行
          } else {
            console.log('已授权，允许访问')
          }
        } else {
          console.log('不是需要保护的页面，跳过检查')
        }

        return true
      }

      // 确保第一次执行成功后再注册导航监听
      if (main()) {
        // 监听页面导航事件，确保SPA应用中路由变化时也能捕获
        if ('onpopstate' in window) {
          console.log('注册路由变化监听器')

          // 备份原始的 history.pushState
          const originalPushState = history.pushState
          if (originalPushState) {
            history.pushState = function () {
              // 调用原始方法
              originalPushState.apply(this, arguments)
              // 检查新的URL
              console.log('路由变化，重新检查权限')
              setTimeout(main, 10)
            }
          }

          // 监听返回按钮等导航事件
          window.addEventListener('popstate', function () {
            console.log('导航事件触发，重新检查权限')
            setTimeout(main, 10)
          })
        }

        // 监听页面可见性变化，当用户从其他标签页回来时重新检查
        if ('visibilitychange' in document) {
          document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible') {
              console.log('页面可见性变化，重新检查权限')
              main()
            }
          })
        }
      }
    } catch (error) {
      console.error('保护脚本执行出错:', error)
    }
  })()
}
