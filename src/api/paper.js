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

/** 编辑试卷：标题 / 内容整体覆盖 */
export function updatePaper(id, payload) {
  return http.put(`/papers/${id}`, payload)
}

/** 导出试卷 PDF，按指定版面（A4 / A3 / B5）由后端无头 Chrome 渲染 */
export function exportPaperPdf(id, size = 'A4') {
  return http.get(`/papers/${id}/pdf`, { params: { size }, responseType: 'blob', timeout: 180000 })
}

/** 导出试卷 Word，由后端 pandoc 转成 docx（公式为 Word 原生公式） */
export function exportPaperDocx(id, size = 'A4') {
  return http.get(`/papers/${id}/docx`, { params: { size }, responseType: 'blob', timeout: 180000 })
}
