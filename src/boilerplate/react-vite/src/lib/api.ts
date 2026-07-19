import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

let isLoggingOut = false

function logout() {
  if (isLoggingOut) return
  if (window.location.pathname === '/login') return

  isLoggingOut = true
  window.location.assign('/login')
}

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      logout()
    }
    return Promise.reject(error)
  },
)
