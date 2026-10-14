import { ref } from 'vue'

const TOKEN_KEY = 'questionly-token'
const USER_KEY = 'questionly-user'

function readUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** 当前登录用户（响应式），props 见后端 LoginVO */
export const currentUser = ref(readUser())

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function isLoggedIn() {
  return Boolean(getToken())
}

/** 登录成功后写入令牌与用户信息 */
export function setAuth({ token, ...user }) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  currentUser.value = user
}

/** 退出登录 / 令牌失效时清空 */
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  currentUser.value = null
}
