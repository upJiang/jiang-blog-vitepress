import { Button, Layout, Space, Typography } from 'antd'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export function AppHeader() {
  const auth = useAuth()
  return (
    <Layout.Header className="app-header">
      <Typography.Title level={2}>后台管理</Typography.Title>
      <nav aria-label="主导航" className="app-nav">
        <Space size="small">
          <NavLink to="/projects" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>项目</NavLink>
          <NavLink to="/tasks" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>任务</NavLink>
        </Space>
      </nav>
      <Button onClick={() => void auth.logout()}>退出</Button>
    </Layout.Header>
  )
}
