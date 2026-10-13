import { ref } from 'vue'

/**
 * 导航栏「导入题目」的回跳目标。
 * 停留在题目处理页时指向该题目页，离开后点击「导入题目」即可回到原文件状态。
 */
export const lastImportPath = ref('/')

/** 题目处理页的会话缓存：taskId -> 页面状态（题目列表、分析结果、滚动位置） */
const sessions = new Map()

export function saveProcessState(taskId, state) {
  if (taskId) sessions.set(taskId, state)
}

export function getProcessState(taskId) {
  return sessions.get(taskId)
}

export function dropProcessState(taskId) {
  sessions.delete(taskId)
}
