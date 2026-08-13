import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Form, Input, Layout, List, Progress, Space, Tag, Typography } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { request, streamTaskEvents, type SseMessage } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import { AppHeader } from '../layout/AppHeader'

type Task = {
  id: string
  type: string
  status: 'queued' | 'running' | 'retrying' | 'completed' | 'failed' | 'cancelled'
  progress: number
  attempt: number
  result: Record<string, unknown> | null
}

type VisibleEvent = SseMessage & { key: string; receivedAt: string }
const terminalStates = new Set<Task['status']>(['completed', 'failed', 'cancelled'])

export function TasksPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { taskId } = useParams<{ taskId: string }>()
  const [input, setInput] = useState(taskId ?? '')
  const [events, setEvents] = useState<VisibleEvent[]>([])
  const [streamState, setStreamState] = useState<'idle' | 'connecting' | 'live' | 'stopped' | 'error'>('idle')

  useEffect(() => setInput(taskId ?? ''), [taskId])

  const task = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => request<Task>(`/tasks/${encodeURIComponent(taskId!)}`),
    enabled: auth.status === 'signed-in' && Boolean(taskId),
  })

  useEffect(() => {
    if (!taskId || auth.status !== 'signed-in') return
    const controller = new AbortController()
    let cancelled = false
    let lastEventId: string | null = null

    const connect = async () => {
      setEvents([])
      setStreamState('connecting')
      while (!cancelled) {
        let reachedTerminal = false
        try {
          lastEventId = await streamTaskEvents(taskId, lastEventId, controller.signal, (message) => {
            setStreamState('live')
            if (message.event === 'snapshot') {
              const snapshot = JSON.parse(message.data) as Task
              queryClient.setQueryData(['task', taskId], snapshot)
              reachedTerminal = terminalStates.has(snapshot.status)
              return
            }
            setEvents((current) => {
              const key = message.id ? `${message.event}:${message.id}` : `${message.event}:${message.data}`
              if (current.some((event) => event.key === key)) return current
              return [...current, { ...message, key, receivedAt: new Date().toLocaleTimeString() }].slice(-100)
            })
          })
          if (reachedTerminal) {
            setStreamState('stopped')
            return
          }
          await new Promise((resolve) => window.setTimeout(resolve, 1000))
        } catch (reason) {
          if (controller.signal.aborted) return
          setStreamState('error')
          await new Promise((resolve) => window.setTimeout(resolve, 1500))
        }
      }
    }
    void connect()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [auth.status, queryClient, taskId])

  const streamLabel = useMemo(() => ({
    idle: '等待任务编号',
    connecting: '正在连接事件流',
    live: '事件流已连接',
    stopped: '任务已结束',
    error: '连接中断，正在携带 Last-Event-ID 重连',
  })[streamState], [streamState])

  if (auth.status === 'restoring') return <main className="status-page">正在恢复会话...</main>
  if (auth.status === 'signed-out') return <Navigate to="/login" replace />

  return (
    <Layout className="app-shell">
      <AppHeader />
      <Layout.Content className="task-content">
        <section className="task-query" aria-labelledby="task-query-title">
          <Typography.Title level={3} id="task-query-title">任务进度</Typography.Title>
          <Form layout="vertical" onFinish={() => input.trim() && navigate(`/tasks/${encodeURIComponent(input.trim())}`)}>
            <Form.Item label="任务 ID">
              <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="输入 UUID" />
            </Form.Item>
            <Button type="primary" htmlType="submit" disabled={!input.trim()}>查看任务</Button>
          </Form>
        </section>

        {taskId && (
          <section className="task-status" aria-labelledby="task-status-title">
            <div className="section-heading-row">
              <Typography.Title level={3} id="task-status-title">当前状态</Typography.Title>
              <Tag color={streamState === 'error' ? 'warning' : streamState === 'live' ? 'processing' : 'default'}>{streamLabel}</Tag>
            </div>
            {task.isError && <Alert type="error" message="任务不存在、无权访问，或 API 当前不可用。" showIcon />}
            {task.data && (
              <Space direction="vertical" size="middle" className="full-width">
                <div className="task-facts">
                  <div><Typography.Text type="secondary">类型</Typography.Text><Typography.Text>{task.data.type}</Typography.Text></div>
                  <div><Typography.Text type="secondary">状态</Typography.Text><Typography.Text>{task.data.status}</Typography.Text></div>
                  <div><Typography.Text type="secondary">尝试次数</Typography.Text><Typography.Text>{task.data.attempt}</Typography.Text></div>
                </div>
                <Progress percent={task.data.progress} status={task.data.status === 'failed' ? 'exception' : task.data.status === 'completed' ? 'success' : 'active'} />
                {task.data.result && <pre className="result-output">{JSON.stringify(task.data.result, null, 2)}</pre>}
              </Space>
            )}
          </section>
        )}

        {taskId && (
          <section className="task-events" aria-labelledby="task-events-title">
            <Typography.Title level={3} id="task-events-title">事件记录</Typography.Title>
            <List
              locale={{ emptyText: '尚未收到增量事件' }}
              dataSource={[...events].reverse()}
              renderItem={(event) => (
                <List.Item extra={<Typography.Text type="secondary">{event.receivedAt}</Typography.Text>}>
                  <List.Item.Meta
                    title={`${event.event}${event.id ? ` #${event.id}` : ''}`}
                    description={<code className="event-data">{event.data}</code>}
                  />
                </List.Item>
              )}
            />
          </section>
        )}
      </Layout.Content>
    </Layout>
  )
}
