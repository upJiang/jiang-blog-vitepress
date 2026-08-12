import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Form, Input, Typography } from 'antd'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Navigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from './AuthProvider'

const schema = z.object({ email: z.string().email(), password: z.string().min(8) })
type LoginInput = z.infer<typeof schema>

export function LoginPage() {
  const auth = useAuth()
  const [error, setError] = useState('')
  const { control, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'demo@example.test', password: 'local-password' },
  })
  if (auth.status === 'signed-in') return <Navigate to="/projects" replace />

  return (
    <main className="login-shell">
      <section className="login-panel">
        <Typography.Title level={1}>项目管理</Typography.Title>
        <Typography.Paragraph>使用本地种子账号登录 React + NestJS 样章。</Typography.Paragraph>
        {error && <Alert type="error" message={error} showIcon />}
        <Form layout="vertical" onFinish={handleSubmit(async (input) => {
          setError('')
          await auth.login(input.email, input.password).catch(() => setError('登录失败，请检查账号或服务状态。'))
        })}>
          <Controller name="email" control={control} render={({ field, fieldState }) => (
            <Form.Item label="邮箱" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
              <Input {...field} autoComplete="username" />
            </Form.Item>
          )} />
          <Controller name="password" control={control} render={({ field, fieldState }) => (
            <Form.Item label="密码" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
              <Input.Password {...field} autoComplete="current-password" />
            </Form.Item>
          )} />
          <Button type="primary" htmlType="submit" loading={formState.isSubmitting}>登录</Button>
        </Form>
      </section>
    </main>
  )
}
