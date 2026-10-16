import http from './http'

/** 当前用户的试卷列表，每页 20 条，按创建时间倒序 */
export function pagePapers(pageNo = 1) {
  return http.get('/papers', { params: { pageNo } })
}

/** 按试卷 ID 取详情（含正文），编辑页打开时调用 */
export function getPaper(id) {
  return http.get(`/papers/${id}`)
}

/** 创建试卷，返回落库后的完整记录（含生成的 ID） */
export function createPaper(payload) {
  return http.post('/papers', payload)
}

/** 编辑试卷：标题 / 内容 / 标签整体覆盖 */
export function updatePaper(id, payload) {
  return http.put(`/papers/${id}`, payload)
}
