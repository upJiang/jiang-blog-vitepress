export type ApiProblemBody = { code?: string; message?: string; detail?: string }

export class ApiProblem extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
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
    body.detail ?? body.message ?? 'request_failed',
  )
}

async function send(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${apiOrigin}/api${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })
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
  let response = await send(path, init)
  if (response.status === 401 && path !== '/auth/login') {
    await refreshOnce()
    response = await send(path, init)
  }
  if (!response.ok) throw await readProblem(response)
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}
