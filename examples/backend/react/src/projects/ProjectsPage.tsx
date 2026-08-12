import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Form, Input, Layout, List, Space, Typography } from 'antd'
import { Controller, useForm } from 'react-hook-form'
import { Navigate } from 'react-router-dom'
import { z } from 'zod'
import { request } from '../api/client'
import { useAuth } from '../auth/AuthProvider'

type Project = { id: string; name: string; description: string | null; version: number; updatedAt: string }
const schema = z.object({ name: z.string().trim().min(1).max(120), description: z.string().max(2000) })
type ProjectInput = z.infer<typeof schema>

export function ProjectsPage() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const form = useForm<ProjectInput>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '' },
  })
  const projects = useQuery({
    queryKey: ['projects'],
    queryFn: () => request<Project[]>('/projects'),
    enabled: auth.status === 'signed-in',
  })
  const createProject = useMutation({
    mutationFn: (input: ProjectInput) => request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ ...input, description: input.description || null }),
    }),
    onSuccess: async () => {
      form.reset()
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  if (auth.status === 'restoring') return <main className="status-page">正在恢复会话...</main>
  if (auth.status === 'signed-out') return <Navigate to="/login" replace />

  return (
    <Layout className="app-shell">
      <Layout.Header className="app-header">
        <Typography.Title level={2}>项目管理</Typography.Title>
        <Button onClick={() => void auth.logout()}>退出</Button>
      </Layout.Header>
      <Layout.Content className="app-content">
        <section className="project-form">
          <Typography.Title level={3}>创建项目</Typography.Title>
          {createProject.isError && <Alert type="error" message="项目创建失败" showIcon />}
          <Form layout="vertical" onFinish={form.handleSubmit((input) => createProject.mutate(input))}>
            <Controller name="name" control={form.control} render={({ field, fieldState }) => (
              <Form.Item label="项目名称" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
                <Input {...field} />
              </Form.Item>
            )} />
            <Controller name="description" control={form.control} render={({ field }) => (
              <Form.Item label="描述"><Input.TextArea {...field} rows={3} /></Form.Item>
            )} />
            <Button type="primary" htmlType="submit" loading={createProject.isPending}>创建</Button>
          </Form>
        </section>
        <section className="project-list">
          <Space direction="vertical" size="middle" className="full-width">
            <Typography.Title level={3}>当前租户项目</Typography.Title>
            {projects.isError && <Alert type="error" message="项目列表加载失败" showIcon />}
            <List loading={projects.isLoading} dataSource={projects.data ?? []} renderItem={(project) => (
              <List.Item extra={<span>v{project.version}</span>}>
                <List.Item.Meta title={project.name} description={project.description || '暂无描述'} />
              </List.Item>
            )} />
          </Space>
        </section>
      </Layout.Content>
    </Layout>
  )
}
