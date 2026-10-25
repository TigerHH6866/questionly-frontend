<template>
  <!-- 划词浮窗：贴在选区上方，只改样式不动内容；mousedown 阻止默认以免选区在点击时丢失 -->
  <Teleport to="body">
    <div
      v-if="visible"
      class="fmt-pop"
      :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
      @mousedown.prevent
    >
      <button class="fmt-btn" type="button" @mousedown.prevent="apply('underline')">
        {{ t('process.fmtUnderline') }}
      </button>
      <button class="fmt-btn" type="button" @mousedown.prevent="apply('dot')">
        {{ t('process.fmtDot') }}
      </button>
      <button class="fmt-btn is-italic" type="button" @mousedown.prevent="apply('italic')">
        {{ t('process.fmtItalic') }}
      </button>
      <button class="fmt-btn is-bold" type="button" @mousedown.prevent="apply('bold')">
        {{ t('process.fmtBold') }}
      </button>
    </div>
  </Teleport>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * 划词格式浮窗（加粗 / 斜体 / 下划线 / 着重号），与文件解析页编辑题目用的是同一套行为。
 *
 * 传入 MathEditArea 实例作为 target：浮窗只在该编辑区内有选区时出现，
 * 点按钮时先恢复选区再执行命令，最后派发 input 让调用方同步缓存。
 */
const props = defineProps({
  /** MathEditArea 组件实例（提供 el / focus / contains） */
  target: { type: Object, default: null }
})

const { t } = useI18n()

const visible = ref(false)
const pos = ref({ x: 0, y: 0 })

/** 浮窗对应的选区：点浮窗会让编辑区失焦，执行命令前据此恢复 */
let savedRange = null
let frame = 0

function elOf(node) {
  return node.nodeType === 1 ? node : node.parentElement
}

function rootEl() {
  const el = props.target?.el
  return el && el.isConnected ? el : null
}

function hide() {
  visible.value = false
  savedRange = null
}

function sync() {
  const root = rootEl()
  const sel = window.getSelection()
  if (!root || !sel || !sel.rangeCount || sel.isCollapsed) {
    hide()
    return
  }
  const range = sel.getRangeAt(0)
  if (!root.contains(range.commonAncestorContainer)) {
    hide()
    return
  }
  const rect = range.getBoundingClientRect()
  if (!rect.width && !rect.height) {
    hide()
    return
  }
  savedRange = range.cloneRange()
  // 浮窗宽度约 230px：左右各留半宽再收 8px 边距，避免贴边溢出
  const half = 115
  pos.value = {
    x: Math.min(Math.max(rect.left + rect.width / 2, half + 8), window.innerWidth - half - 8),
    y: Math.max(rect.top - 42, 8)
  }
  visible.value = true
}

function scheduleSync() {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    sync()
  })
}

/** 着重号：没有对应的 execCommand，手动把选区包进 <span class="dot">；已在其中则取消 */
function toggleDot() {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return
  const range = sel.getRangeAt(0)
  if (range.collapsed) return

  const holder = elOf(range.startContainer)?.closest('span.dot')
  if (holder && holder.contains(range.endContainer)) {
    const parent = holder.parentNode
    if (parent) {
      while (holder.firstChild) parent.insertBefore(holder.firstChild, holder)
      parent.removeChild(holder)
    }
    return
  }

  const span = document.createElement('span')
  span.className = 'dot'
  const frag = range.extractContents()
  span.appendChild(frag)
  range.insertNode(span)

  const next = document.createRange()
  next.selectNodeContents(span)
  sel.removeAllRanges()
  sel.addRange(next)
  savedRange = next.cloneRange()
}

function apply(kind) {
  const root = rootEl()
  const sel = window.getSelection()
  if (!root || !sel || !savedRange) return
  root.focus()
  sel.removeAllRanges()
  sel.addRange(savedRange)
  if (kind === 'dot') {
    toggleDot()
  } else {
    document.execCommand(kind)
  }
  root.dispatchEvent(new Event('input', { bubbles: true }))
  scheduleSync()
}

function onDocMousedown(event) {
  if (!visible.value) return
  // 点在浮窗自身上不收起（按钮用 mousedown 执行，避免先收起再丢选区）
  if (event.target?.closest?.('.fmt-pop')) return
  hide()
}

function onWindowScroll() {
  if (visible.value) hide()
}

onMounted(() => {
  document.addEventListener('selectionchange', scheduleSync)
  document.addEventListener('mousedown', onDocMousedown, true)
  window.addEventListener('scroll', onWindowScroll, true)
})

onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame)
  document.removeEventListener('selectionchange', scheduleSync)
  document.removeEventListener('mousedown', onDocMousedown, true)
  window.removeEventListener('scroll', onWindowScroll, true)
})
</script>

<style scoped>
.fmt-pop {
  position: fixed;
  z-index: 30;
  display: flex;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-surface);
  box-shadow: var(--shadow-md);
  transform: translateX(-50%);
  user-select: none;
}

.fmt-btn {
  height: 26px;
  padding: 0 10px;
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--c-dark);
  font-family: var(--font-heading);
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s var(--ease-soft), color 0.2s var(--ease-soft);
}

.fmt-btn:hover {
  background: rgba(217, 119, 87, 0.12);
  color: var(--c-orange);
}

.fmt-btn.is-italic {
  font-style: italic;
}

.fmt-btn.is-bold {
  font-weight: 700;
}
</style>
