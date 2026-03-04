import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'https://prajavox-backend.vercel.app') + '/api',
  timeout: 45000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('praja_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // 401 = invalid/expired token → force re-login
    if (err.response?.status === 401) {
      const token = localStorage.getItem('praja_token');
      // If it's a mock token, we're in offline/demo mode, so don't force logout on 401
      if (!token || !token.startsWith('mock-token')) {
        localStorage.removeItem('praja_user')
        localStorage.removeItem('praja_token')
        window.location.href = '/login'
      }
    }

    // Friendly error messages for network issues
    if (!err.response) {
      err.message = err.code === 'ECONNABORTED'
        ? 'Request timeout. Server may be slow. Retrying...'
        : 'Network connection error. Retrying...'
    }

    return Promise.reject(err)
  }
)

export default api
