type FetcherArgs = string | [string, RequestInit?]

export async function fetcher(args: FetcherArgs) {
  const [path, init] = Array.isArray(args) ? args : [args, undefined]
  const base = import.meta.env.VITE_BACKEND_URL || ""
  const url = `${base}${path}`
  
  const res = await fetch(url, {
    ...(init || {}),
    credentials: 'include', // Include cookies for session-based auth
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  })
  
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Request failed ${res.status}: ${text}`)
  }
  
  return res.json()
}

// Auth-specific API functions
export const authAPI = {
  async login(userName: string, password: string) {
    const response = await fetcher(['/pa-dasher-api/users/validateLogin', {
      method: 'POST',
      body: JSON.stringify({ userName, password })
    }])
    return response
  },

  async logout() {
    const response = await fetcher(['/pa-dasher-api/users/logout', {
      method: 'POST'
    }])
    return response
  },

  async isLoggedIn() {
    const response = await fetcher(['/pa-dasher-api/users/isLoggedIn', {
      method: 'POST'
    }])
    return response
  }
}
