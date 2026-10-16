import http from './http'

/** 分析单道试题，返回 Markdown 分析报告；bizType 用于后端定位 agent 表中的 LLM 配置 */
export function analyzeQuestion(question, bizType = 'analyze') {
  const form = new FormData()
  form.append('question', question)
  form.append('bizType', bizType)
  return http.post('/questions/analyze', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

/**
 * 单题入库，写入 questions 表；grade / subject 由后端从分析报告中提取。
 * ocrTaskId / ocrIndex 为来源（哪份文件的第几题），用于回显入库状态与防重复；
 * ocrTaskId 是 19 位雪花 ID，必须按字符串传，避免 JS 精度丢失。
 */
export function saveQuestion(title, details, ocrTaskId, ocrIndex) {
  return http.post('/questions/save', { title, details, ocrTaskId, ocrIndex })
}

/** 某份文件下已入库的题目（题号 + 题目 ID），进入文件时用于回显每道题的入库状态 */
export function getImportedQuestions(taskId) {
  return http.get('/questions/imported', { params: { taskId } })
}

/** 按题目 ID 取题库详情，用于已入库题目展示「查看入库信息」 */
export function getQuestionDetail(id) {
  return http.get(`/questions/${id}`)
}

/**
 * 自然语言检索题库。
 * 不传 searchId 为首次检索（需传 q），传 searchId 则按会话翻页
 */
export function searchQuestions(params) {
  return http.get('/search', { params })
}

/** 修改题目的 AI 分析内容 */
export function updateQuestion(id, details) {
  return http.put(`/questions/${id}`, { details })
}

/** 删除题目 */
export function deleteQuestion(id) {
  return http.delete(`/questions/${id}`)
}
