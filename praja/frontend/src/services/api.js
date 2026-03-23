import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'https://prajavox-backend.vercel.app') + '/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('praja_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Disable strict 401 logout for the prototype/demo, because 
    // mock tokens or out-of-sync backends will constantly kick the user out
    if (err.response?.status === 401) {
      console.warn('API returned 401, but keeping user logged in for prototype mode.')
      // localStorage.removeItem('praja_user')
      // localStorage.removeItem('praja_token')
      // window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api


