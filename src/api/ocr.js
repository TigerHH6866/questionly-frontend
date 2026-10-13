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

export function getTaskResult(id) {
  return http.get(`/ocr/tasks/${id}/result`)
}