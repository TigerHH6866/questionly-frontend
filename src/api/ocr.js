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

/**
 * 保存题干编辑草稿：整页编辑快照（JSON 字符串），后端原样存取。
 * 让编辑结果在刷新页面 / 换设备后仍能恢复，同时不写回解析结果与题库。
 */
export function saveTaskDraft(id, draft) {
  return http.put(`/ocr/tasks/${id}/draft`, { draft })
}