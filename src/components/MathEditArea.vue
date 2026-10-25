<template>
  <!-- 必须是单根元素：父组件的 class 与 scoped 的 data-v-* 只有在单根时才会落到这里，
       否则 .qb-body / :deep(p) 这类作用域样式全部失效，正文排版会整体塌陷 -->
  <div
    ref="rootRef"
    data-math-edit
    :contenteditable="editable ? 'true' : 'false'"
    spellcheck="false"
    @keydown="onKeydown"
  >
    <!-- 公式工具条与弹层：光标落在本区域时出现，双击公式可再次编辑；
         Teleport 到 body，不会在本容器内产生任何 DOM 节点 -->
    <MathEditBar />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MathEditBar from '@/components/MathEditBar.vue'
import { deleteMathAfterCaret, deleteMathBeforeCaret, protectMath } from '@/utils/mathEdit'

/**
 * 统一的公式可编辑区域（文件解析页、我的题库共用）。
 *
 * - paint(html)：写入正文后把 KaTeX 节点标记为不可编辑原子，光标不会钻进视觉层
 * - getHtml()：读取当前正文，交给调用方存缓存或转 Markdown
 * - 退格 / Delete 紧贴公式时整块删除，并派发 input 让调用方同步缓存
 * - 公式插入、上下标、双击编辑公式、粘贴规范化由内置 MathEditBar 负责
 *
 * 用法：
 *   <MathEditArea ref="bodyRef" class="panel-body" :editable="!readonly" @input="onInput" />
 *   bodyRef.value.paint(html) / bodyRef.value.getHtml()
 */
defineProps({
  /** 只读时关闭 contenteditable，工具条也不再出现 */
  editable: { type: Boolean, default: true }
})

const rootRef = ref(null)

function paint(html) {
  const el = rootRef.value
  if (!el) return
  el.innerHTML = html || ''
  protectMath(el)
}

function getHtml() {
  return rootRef.value?.innerHTML || ''
}

function focusArea() {
  rootRef.value?.focus()
}

function contains(node) {
  return Boolean(rootRef.value?.contains(node))
}

function onKeydown(event) {
  const el = rootRef.value
  const removed =
    event.key === 'Backspace'
      ? deleteMathBeforeCaret(event, el)
      : event.key === 'Delete'
        ? deleteMathAfterCaret(event, el)
        : false
  if (removed) el.dispatchEvent(new Event('input', { bubbles: true }))
}

defineExpose({ paint, getHtml, focus: focusArea, contains, el: rootRef })
</script>
