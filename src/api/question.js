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
 * 单题入库，写入 questions 表；grade / subject / bloomType / difficulty 为面板里选定的值，
 * 未传时后端按分析内容自动匹配。answers 为题目答案（AI 解题或人工录入），可为空；
 * ocrTaskId / ocrIndex 为来源（哪份文件的第几题），用于回显入库状态与防重复；
 * ocrTaskId 是 19 位雪花 ID，必须按字符串传，避免 JS 精度丢失。
 */
export function saveQuestion(title, details, answers, ocrTaskId, ocrIndex, meta) {
  return http.post('/questions/save', {
    title,
    details,
    answers,
    ocrTaskId,
    ocrIndex,
    grade: meta?.grade,
    subject: meta?.subject,
    bloomType: meta?.bloomType,
    difficulty: meta?.difficulty
  })
}

/** 某份文件下已入库的题目（题号 + 题目 ID），进入文件时用于回显每道题的入库状态 */
export function getImportedQuestions(taskId) {
  return http.get('/questions/imported', { params: { taskId } })
}

/** 当前用户的题库列表（「我的题目」），默认每页 10 条，按入库时间倒序 */
export function pageQuestions(pageNo = 1, pageSize = 10) {
  return http.get('/questions', { params: { pageNo, pageSize } })
}

/** 按题目 ID 取题库详情，用于已入库题目展示「查看入库信息」 */
export function getQuestionDetail(id) {
  return http.get(`/questions/${id}`)
}

/** 按题目 ID 取题目答案（AI 解题或人工录入的内容） */
export function getQuestionAnswer(id) {
  return http.get(`/questions/${id}/answer`)
}

/**
 * 自然语言检索题库。
 * 不传 searchId 为首次检索（需传 q），传 searchId 则按会话翻页
 */
export function searchQuestions(params) {
  return http.get('/search', { params })
}

/**
 * 修改题目的 AI 分析内容与 / 或答案与 / 或四维元信息；不传的参数保持不变。
 * meta: { grade, subject, bloomType, difficulty }
 */
export function updateQuestion(id, details, answers, meta) {
  return http.put(`/questions/${id}`, {
    details,
    answers,
    grade: meta?.grade,
    subject: meta?.subject,
    bloomType: meta?.bloomType,
    difficulty: meta?.difficulty
  })
}

/** 删除题目 */
export function deleteQuestion(id) {
  return http.delete(`/questions/${id}`)
}

/** 获取题目绑定的知识点 */
export function getQuestionKnowledge(id) {
  return http.get(`/questions/${id}/knowledge`)
}

/** 保存题目知识点绑定（全量覆盖，一题可多选） */
export function saveQuestionKnowledge(id, nodes) {
  return http.put(`/questions/${id}/knowledge`, { nodes })
}

/** 知识点目录的学段/学科分布 */
export function getKbFacets() {
  return http.get('/kb/facets')
}

/** 知识点列表（按学段/学科筛选，keyword 匹配名称或别名） */
export function getKbKnowledgeList({ stage, subject, keyword } = {}) {
  return http.get('/kb/list', { params: { stage, subject, keyword } })
}
