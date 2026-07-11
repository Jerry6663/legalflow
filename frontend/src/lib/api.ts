const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

const TOKEN_KEY = 'legflow_token'
const FETCH_TIMEOUT = 20000 // 20s default timeout

// ===== Auth Helpers =====

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY)
  // Redirect to login if on a protected page
  if (window.location.pathname !== '/' && window.location.pathname !== '/login' && window.location.pathname !== '/pricing') {
    window.location.href = '/login'
  }
}

function timedFetch(url: string, options: RequestInit = {}, timeout: number = FETCH_TIMEOUT): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer))
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers = { ...options.headers } as Record<string, string>
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await timedFetch(`${API_BASE}${url}`, { ...options, headers })
  if (res.status === 401) {
    logout() // Token expired — clear and redirect
    throw new Error('登录已过期，请重新登录')
  }
  return res
}

// ===== Auth API =====

export async function register(username: string, password: string) {
  const res = await timedFetch(`${API_BASE}/review/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  }, 15000)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '注册失败' }))
    throw new Error(err.detail || '注册失败')
  }
  return res.json()
}

export async function login(username: string, password: string) {
  const res = await timedFetch(`${API_BASE}/review/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  }, 15000)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '登录失败' }))
    throw new Error(err.detail || '登录失败')
  }
  return res.json()
}

export async function getMe(): Promise<{ username: string; review_count: number }> {
  const res = await authFetch('/review/auth/me')
  if (!res.ok) throw new Error('未登录')
  return res.json()
}

// ===== Contract API =====

export async function uploadContract(file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await timedFetch(`${API_BASE}/review/upload`, {
    method: 'POST',
    body: form,
  }, 30000)
  if (!res.ok) throw new Error('Upload failed')
  return res.json()
}

export interface ReviewRule {
  id: string
  name: string
  level: string
  applicable: string
  checkpoint: string
  legal_basis?: string
  suggestion?: string
}

export async function fetchRules(): Promise<{ rules: ReviewRule[]; total: number }> {
  const res = await authFetch('/review/rules')
  if (!res.ok) throw new Error('Failed to fetch rules')
  return res.json()
}

export async function analyzeContract(text: string, contractType?: string) {
  const res = await timedFetch(`${API_BASE}/review/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contract_text: text, contract_type: contractType }),
  }, 60000)
  if (!res.ok) throw new Error('Analysis failed')
  return res.json()
}
