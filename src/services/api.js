import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'https://prajavox-backend.vercel.app') + '/api',
  timeout: 45000,
})

api.interceptors.request.use((config) => {
  try {
    const userStr = localStorage.getItem('praja_user')
    if (userStr) {
      const user = JSON.parse(userStr)
      config.headers['x-user-id'] = user.id || ''
      config.headers['x-user-role'] = user.role || ''
    }
  } catch (e) {}
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
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
