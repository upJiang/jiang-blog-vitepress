import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { refreshOnce, request, setAccessToken } from '../api/client'

type AuthState = {
  status: 'restoring' | 'signed-out' | 'signed-in'
  login(email: string, password: string): Promise<void>
  logout(): Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('restoring')

  useEffect(() => {
    refreshOnce().then(() => setStatus('signed-in')).catch(() => {
      setAccessToken(null)
      setStatus('signed-out')
    })
  }, [])

  const value = useMemo<AuthState>(() => ({
    status,
    async login(email, password) {
      const body = await request<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setAccessToken(body.accessToken)
      setStatus('signed-in')
    },
    async logout() {
      await request<void>('/auth/logout', { method: 'POST' }).catch(() => undefined)
      setAccessToken(null)
      setStatus('signed-out')
    },
  }), [status])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider is missing')
  return value
}
