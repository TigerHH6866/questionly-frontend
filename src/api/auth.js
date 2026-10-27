import http from './http'

export function login(email, password) {
  return http.post('/auth/login', { email, password })
}

/** 邮箱 + 密码 + 验证码注册，成功即登录并获赠试用套餐 */
export function register(email, password, code) {
  return http.post('/auth/register', { email, password, code })
}

/** 发送注册邮箱验证码 */
export function sendCode(email) {
  return http.post('/auth/code', { email })
}

/** 当前用户的可用积分与题目余额 */
export function fetchCredits() {
  return http.get('/credits')
}

/** 额度用量汇总：剩余 / 已用积分与题目（「我的订单-消费记录」顶部） */
export function fetchQuotaUsage() {
  return http.get('/credits/usage')
}

/** 激活 / 升级套餐（支付接入前用于联调与手动开通） */
export function applyPlan(planId) {
  return http.post(`/credits/plans/${planId}`)
}
