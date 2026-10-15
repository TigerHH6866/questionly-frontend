/**
 * 题目处理页的会话缓存：taskId -> 页面状态（题目列表、分析结果、滚动位置）。
 * 同一文件来回切换时直接还原，省掉一次请求，也保住滚动进度。
 */
const sessions = new Map()

export function saveProcessState(taskId, state) {
  if (taskId) sessions.set(taskId, state)
}

export function getProcessState(taskId) {
  return sessions.get(taskId)
}
