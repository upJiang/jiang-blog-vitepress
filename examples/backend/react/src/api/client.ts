export type ApiProblemBody = {
  status?: number
  code?: string
  detail?: string
  requestId?: string
  fields?: Array<{ field: string; messages: string[] }>
}

export class ApiProblem extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId?: string,
    readonly fields: ApiProblemBody['fields'] = [],
  ) {
    super(message)
  }
}

let accessToken: string | null = null
let refreshFlight: Promise<string> | null = null
const apiOrigin = (import.meta.env.VITE_API_ORIGIN as string | undefined)?.replace(/\/$/, '') ?? ''

export function setAccessToken(token: string | null): void {
  accessToken = token
}

async function readProblem(response: Response): Promise<ApiProblem> {
  const body = await response.json().catch(() => ({})) as ApiProblemBody
  return new ApiProblem(
    response.status,
    body.code ?? `http_${response.status}`,
    body.detail ?? 'request_failed',
    body.requestId,
    body.fields,
  )
}

async function send(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  return fetch(`${apiOrigin}/api${path}`, {
    ...init,
    credentials: 'include',
    headers,
  })
}

async function sendWithRefresh(path: string, init: RequestInit): Promise<Response> {
  let response = await send(path, init)
  if (response.status === 401 && path !== '/auth/login' && path !== '/auth/refresh') {
    await refreshOnce()
    response = await send(path, init)
  }
  return response
}

export async function refreshOnce(): Promise<string> {
  if (!refreshFlight) {
    refreshFlight = fetch(`${apiOrigin}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) throw await readProblem(response)
        const body = await response.json() as { accessToken: string }
        accessToken = body.accessToken
        return body.accessToken
      })
      .finally(() => { refreshFlight = null })
  }
  return refreshFlight
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await sendWithRefresh(path, init)
  if (!response.ok) throw await readProblem(response)
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}

export function idempotencyKey(): string {
  return crypto.randomUUID()
}

export async function sha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function uploadObject(
  uploadUrl: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('PUT', uploadUrl)
    request.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    })
    request.addEventListener('load', () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100)
        resolve()
        return
      }
      reject(new Error(`object_upload_${request.status}`))
    })
    request.addEventListener('error', () => reject(new Error('object_upload_network_error')))
    request.addEventListener('abort', () => reject(new DOMException('Upload aborted', 'AbortError')))
    request.send(file)
  })
}

export type SseMessage = { id?: string; event: string; data: string }

export async function streamTaskEvents(
  taskId: string,
  lastEventId: string | null,
  signal: AbortSignal,
  onMessage: (message: SseMessage) => void,
): Promise<string | null> {
  const response = await sendWithRefresh(`/tasks/${encodeURIComponent(taskId)}/events`, {
    headers: {
      Accept: 'text/event-stream',
      ...(lastEventId ? { 'Last-Event-ID': lastEventId } : {}),
    },
    signal,
  })
  if (!response.ok) throw await readProblem(response)
  if (!response.body) throw new Error('sse_stream_missing')

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  let latest = lastEventId

  const dispatch = (frame: string) => {
    let id: string | undefined
    let event = 'message'
    const data: string[] = []
    for (const line of frame.split(/\r?\n/)) {
      if (!line || line.startsWith(':')) continue
      const separator = line.indexOf(':')
      const field = separator === -1 ? line : line.slice(0, separator)
      const value = separator === -1 ? '' : line.slice(separator + 1).replace(/^ /, '')
      if (field === 'id') id = value
      if (field === 'event') event = value
      if (field === 'data') data.push(value)
    }
    if (!id && data.length === 0) return
    if (id) latest = id
    onMessage({ id, event, data: data.join('\n') })
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += value
    const frames = buffer.split(/\r?\n\r?\n/)
    buffer = frames.pop() ?? ''
    frames.forEach(dispatch)
  }
  if (buffer.trim()) dispatch(buffer)
  return latest
}
