import { createHmac, randomUUID } from 'node:crypto'

const base = (process.env.API_ORIGIN ?? 'http://127.0.0.1:3001').replace(/\/$/, '')

async function call(path, { token, method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  })
  const raw = await response.text()
  let data = null
  try { data = raw ? JSON.parse(raw) : null } catch { data = raw }
  return { status: response.status, data, headers: response.headers }
}

function check(condition, message) {
  if (!condition) throw new Error(message)
}

const login = await call('/auth/login', {
  method: 'POST',
  body: { email: 'demo@example.test', password: 'local-password' },
})
check(login.status === 200 && login.data.accessToken, `login failed: ${login.status}`)
const token = login.data.accessToken

for (const path of [
  '/tenants', '/departments', '/users', '/roles', '/permissions', '/audit-logs',
  '/projects', '/products', '/knowledge-bases',
]) {
  const result = await call(path, { token })
  check(result.status === 200 && Array.isArray(result.data.items), `${path}: ${result.status}`)
}

const idempotencyKey = `contract-${randomUUID()}`
const orderBody = {
  items: [{ productId: '30000000-0000-4000-8000-000000000001', quantity: 1 }],
}
const order = await call('/orders', {
  token,
  method: 'POST',
  body: orderBody,
  headers: { 'Idempotency-Key': idempotencyKey },
})
check(order.status === 201 && order.data.amount === '19.90', `order: ${order.status}`)
const repeated = await call('/orders', {
  token,
  method: 'POST',
  body: orderBody,
  headers: { 'Idempotency-Key': idempotencyKey },
})
check(repeated.status === 201 && repeated.data.id === order.data.id, `order retry: ${repeated.status}`)

const payment = {
  provider: 'contract-pay',
  providerEventId: `event-${randomUUID()}`,
  orderId: order.data.id,
  status: 'paid',
}
const signed = `${payment.provider}:${payment.providerEventId}:${payment.orderId}:${payment.status}`
const signature = createHmac('sha256', process.env.PAYMENT_CALLBACK_SECRET ?? 'local-payment-secret')
  .update(signed)
  .digest('hex')
const paid = await call('/payments/callback', {
  method: 'POST',
  body: payment,
  headers: { 'X-Signature': signature },
})
check(paid.status === 204, `payment: ${paid.status}`)

const document = await call('/knowledge-bases/50000000-0000-4000-8000-000000000001/documents', {
  token,
  method: 'POST',
  body: { fileId: '60000000-0000-4000-8000-000000000001' },
})
check(document.status === 202 && document.data.status === 'queued', `document: ${document.status}`)
const chat = await call('/chat-runs', {
  token,
  method: 'POST',
  body: {
    knowledgeBaseId: '50000000-0000-4000-8000-000000000001',
    question: 'How does this task move through the worker?',
  },
})
check(chat.status === 202 && chat.data.status === 'queued', `chat: ${chat.status}`)
const task = await call(`/tasks/${chat.data.id}`, { token })
check(task.status === 200 && task.data.type === 'chat.run', `task: ${task.status}`)

console.log(`contract smoke passed: ${base}`)
