import http from './http'

/** 在架套餐列表（按级别升序，含 plan_id=0 的试用档）：档位与金额以后端 credits_plan 表为准 */
export function fetchPlans() {
  return http.get('/credits/plans')
}

/** 下单：返回订单与微信 Native 支付二维码 */
export function createPayOrder(planId) {
  return http.post('/pay/orders', { planId })
}

/** 轮询查单：待支付订单会由后端向微信核实，支付成功后返回最新额度 */
export function fetchPayOrder(orderId) {
  return http.get(`/pay/orders/${orderId}`)
}

/** 我的订单：按创建时间倒序分页，每页 20 条 */
export function pagePayOrders(pageNo = 1) {
  return http.get('/pay/orders', { params: { pageNo } })
}
