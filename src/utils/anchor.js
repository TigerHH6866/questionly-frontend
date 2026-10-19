import { ref } from 'vue'

/**
 * 跨页锚点暂存。
 * history 模式下区块链接不再把 #id 写进地址栏：点击时把目标区块 ID 存进这里，
 * 落地页挂载后读取并滚动过去，读完即清空，地址栏始终保持无 # 的干净路径。
 */
export const pendingAnchor = ref('')
