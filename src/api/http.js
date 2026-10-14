import axios from 'axios'
import { ElMessage } from 'element-plus'
import { clearAuth, getToken } from '@/utils/auth'

const http = axios.create({
  baseURL: '/api',
  timeout: 120000
})

/** 统一注入 OAuth 2.0 Bearer Token */
http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function handleUnauthorized(msg) {
  // 区分「本来就没登录」与「登录态失效」：只有后者才自动弹出登录框
  const hadToken = Boolean(getToken())
  clearAuth()
  if (hadToken) {
    ElMessage.error(msg || '登录状态已失效，请重新登录')
    window.dispatchEvent(new CustomEvent('questionly:unauthorized'))
  } else {
    ElMessage.warning(msg || '请先登录')
  }
}

http.interceptors.response.use(
  (response) => {
    const body = response.data
    if (body && typeof body.code === 'number' && body.code !== 0) {
      if (body.code === 401) {
        handleUnauthorized(body.msg)
      } else {
        ElMessage.error(body.msg || '请求失败')
      }
      return Promise.reject(new Error(body.msg || '请求失败'))
    }
    return body.data
  },
  (error) => {
    const code = error.response?.status
    if (code === 401) {
      handleUnauthorized(error.response?.data?.msg)
    } else {
      ElMessage.error(error.message || '网络异常')
    }
    return Promise.reject(error)
  }
)

export default http
