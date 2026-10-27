import http from './http'

export function getHealth() {
  return http.get('/health')
}

export function createOcrTask(file, onProgress) {
  const form = new FormData()
  form.append('file', file)
  return http.post('/ocr/tasks', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
  })
}

export function pageOcrTasks(pageNo = 1, pageSize = 10) {
  return http.get('/ocr/tasks', { params: { pageNo, pageSize } })
}

export function getOcrTask(id) {
  return http.get(`/ocr/tasks/${id}`)
}

/** 删除文件记录（物理删除，题库中已入库的题目不受影响） */
export function deleteOcrTask(id) {
  return http.delete(`/ocr/tasks/${id}`)
}

export function getTaskResult(id) {
  return http.get(`/ocr/tasks/${id}/result`)
}

/** 修改文件名（仅改展示名，不影响 OSS 解析结果与已入库题目） */
export function renameOcrTask(id, fileName) {
  return http.put(`/ocr/tasks/${id}/name`, { fileName })
}

/**
 * 保存题干编辑草稿：整页编辑快照（JSON 字符串），后端原样存取。
 * 让编辑结果在刷新页面 / 换设备后仍能恢复，同时不写回解析结果与题库。
 */
export function saveTaskDraft(id, draft) {
  return http.put(`/ocr/tasks/${id}/draft`, { draft })
}

/**
 * 导出 Word：html 为页面当前渲染的整份正文（含题干编辑快照），
 * 后端用 pandoc 转成 docx，公式为 Word 原生公式、图片内嵌。
 */
export async function exportTaskDocx(id, html) {
  const blob = await http.post(`/ocr/tasks/${id}/docx`, { html }, { responseType: 'blob', timeout: 180000 })
  // 业务异常时后端返回 JSON，响应类型为 blob 时会被包成 Blob，这里还原错误文案
  if (blob && blob.type && blob.type.includes('application/json')) {
    const text = await blob.text()
    let msg = 'Word 生成失败，请稍后重试'
    try {
      msg = JSON.parse(text).msg || msg
    } catch {
      // 解析失败时保留默认文案
    }
    throw Object.assign(new Error(msg), { apiError: true })
  }
  return blob
}