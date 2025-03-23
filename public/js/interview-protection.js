// 面试资料保护脚本
// 确保只在浏览器环境中执行
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  ;(function () {
    try {
      console.log('保护脚本执行中...')

      // 解码当前URL路径
      const encodedPath = window.location.pathname
      const currentPath = decodeURIComponent(encodedPath)

      console.log('当前路径:', currentPath)
      console.log('访问时间:', new Date().toLocaleString())

      // 匹配面试目录下的所有页面（除了密码页面）
      const isInterviewPage =
        currentPath.indexOf('/docs/进阶学习/面试/') > -1 &&
        currentPath.indexOf('/password') === -1

      console.log('是否为受保护页面:', isInterviewPage)

      // 如果是面试页面则检查授权
      if (isInterviewPage) {
        let isAuthorized = false

        try {
          // 检查localStorage中的授权状态
          const authStatus = localStorage.getItem('interview_auth') === 'true'
          const authTime = parseInt(
            localStorage.getItem('interview_auth_time') || '0',
            10
          )
          const currentTime = Date.now()
          const oneDayInMs = 24 * 60 * 60 * 1000

          isAuthorized = authStatus && currentTime - authTime < oneDayInMs
          console.log('授权状态:', isAuthorized)
        } catch (error) {
          console.error('验证状态检查失败', error)
        }

        // 如果未授权，保存当前路径并重定向到密码页面
        if (!isAuthorized) {
          console.log('未授权，即将重定向...')

          // 保存当前路径用于验证后返回
          try {
            localStorage.setItem('interview_redirect', currentPath)
            console.log('已保存重定向路径:', currentPath)
          } catch (error) {
            console.error('保存路径失败', error)
          }

          // 注入一个阻止页面内容渲染的样式
          const style = document.createElement('style')
          style.textContent = 'body { display: none !important; }'
          document.head.appendChild(style)

          // 移除可能已经渲染的内容
          document.write(
            '<html><head><title>正在验证...</title></head><body><h1>正在验证权限...</h1></body></html>'
          )

          // 强制重定向到密码页面
          window.location.replace('/docs/进阶学习/面试/password.html')
        } else {
          console.log('已授权，允许访问')
        }
      }
    } catch (error) {
      console.error('保护脚本执行出错:', error)
    }
  })()
}
