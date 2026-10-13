import http from './http'

/** 分析单道试题，返回 Markdown 分析报告 */
export function analyzeQuestion(question) {
  const form = new FormData()
  form.append('question', question)
  return http.post('/questions/analyze', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
