<template>
  <!-- 浮动工具条：跟随光标出现在可编辑正文下方，提供公式、上标、下标三个入口 -->
  <Teleport to="body">
    <div v-if="barVisible" class="math-bar" :style="barStyle" @mousedown.prevent>
      <button
        class="math-bar-btn"
        type="button"
        :title="t('mathEdit.insert')"
        :aria-label="t('mathEdit.insert')"
        @mousedown.prevent="openDialog()"
      >
        <span class="math-bar-sigma">Σ</span>
      </button>
      <button
        class="math-bar-btn"
        type="button"
        :title="t('mathEdit.sup')"
        :aria-label="t('mathEdit.sup')"
        @mousedown.prevent="applyTag('sup')"
      >
        <span class="math-bar-script">x<sup>2</sup></span>
      </button>
      <button
        class="math-bar-btn"
        type="button"
        :title="t('mathEdit.sub')"
        :aria-label="t('mathEdit.sub')"
        @mousedown.prevent="applyTag('sub')"
      >
        <span class="math-bar-script">x<sub>2</sub></span>
      </button>
    </div>
  </Teleport>

  <!-- 公式弹层：输入 LaTeX 并实时预览，Enter 提交 / Esc 取消 -->
  <Teleport to="body">
    <div v-if="dialogOpen" class="math-mask" @mousedown.self="cancel">
      <div class="math-dialog" role="dialog" aria-modal="true">
        <div class="math-dialog-head">
          <span class="math-dialog-title">
            {{ editingNode ? t('mathEdit.editTitle') : t('mathEdit.insertTitle') }}
          </span>
          <button
            class="math-dialog-close"
            type="button"
            :title="t('common.cancel')"
            :aria-label="t('common.cancel')"
            @click="cancel"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        <textarea
          ref="texRef"
          v-model="texDraft"
          class="math-input"
          rows="3"
          spellcheck="false"
          :placeholder="t('mathEdit.placeholder')"
          @keydown="onDialogKeydown"
        ></textarea>

        <div class="math-preview">
          <span v-if="!texDraft.trim()" class="math-preview-hint">
            {{ t('mathEdit.previewEmpty') }}
          </span>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-else class="math-preview-body" v-html="previewHtml"></span>
        </div>

        <div class="math-symbols">
          <button
            v-for="item in SYMBOLS"
            :key="item.tex"
            class="math-symbol"
            type="button"
            :title="item.tex"
            @mousedown.prevent="insertSnippet(item.tex)"
          >
            {{ item.label }}
          </button>
        </div>

        <p class="math-dialog-hint">{{ t('mathEdit.hint') }}</p>

        <div class="math-dialog-foot">
          <button class="math-dialog-btn" type="button" @click="cancel">
            {{ t('common.cancel') }}
          </button>
          <button
            class="math-dialog-btn is-primary"
            type="button"
            :disabled="!texDraft.trim()"
            @click="commit"
          >
            {{ t('common.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import katex from 'katex'
import {
  insertMath,
  mathNodeAt,
  normalizeMathPaste,
  replaceMath,
  restoreEditRange,
  saveEditRange,
  toggleSupSub
} from '@/utils/mathEdit'

/**
 * 公式编辑工具条 + 弹层。
 * 可编辑区域只需标记 data-math-edit，组件通过 document 级监听接管：
 * 光标落入区域时显示工具条，双击已有公式进入编辑，粘贴时规范上下标与 LaTeX。
 */
const ROOT_SELECTOR = '[data-math-edit]'

/** 常用符号：{ } 在 insertSnippet 里会吸附光标，方便连续输入 */
const SYMBOLS = [
  { label: 'a/b', tex: '\\frac{}{}' },
  { label: '√', tex: '\\sqrt{}' },
  { label: 'xⁿ', tex: '^{}' },
  { label: 'xₙ', tex: '_{}' },
  { label: '×', tex: '\\times ' },
  { label: '÷', tex: '\\div ' },
  { label: '±', tex: '\\pm ' },
  { label: '≤', tex: '\\leq ' },
  { label: '≥', tex: '\\geq ' },
  { label: '≠', tex: '\\neq ' },
  { label: 'π', tex: '\\pi ' },
  { label: 'θ', tex: '\\theta ' },
  { label: 'α', tex: '\\alpha ' },
  { label: 'β', tex: '\\beta ' },
  { label: '△', tex: '\\triangle ' },
  { label: '∠', tex: '\\angle ' },
  { label: '°', tex: '^{\\circ}' },
  { label: '∞', tex: '\\infty ' },
  { label: 'ce', tex: '\\ce{}' },
  { label: '( )', tex: '\\left( \\right)' }
]

const { t } = useI18n()

const barVisible = ref(false)
const barStyle = ref({ left: '0px', top: '0px' })
const dialogOpen = ref(false)
const texDraft = ref('')
const editingNode = ref(null)
const texRef = ref(null)

/** 当前可编辑区域、打开弹层前的选区（提交时据此定位插入点） */
let activeRoot = null
let savedRange = null
let frame = 0

const previewHtml = computed(() => {
  const tex = texDraft.value.trim()
  if (!tex) return ''
  return katex.renderToString(tex, { throwOnError: false, displayMode: false, strict: false })
})

function elementAt(node) {
  if (!node) return null
  return node.nodeType === 1 ? node : node.parentElement
}

function hideBar() {
  barVisible.value = false
  activeRoot = null
}

/** 取选区所在的可编辑区域；不在 data-math-edit 内或不可编辑时返回 null */
function editableRootOf(node) {
  const root = elementAt(node)?.closest?.(ROOT_SELECTOR)
  if (!root || !root.isContentEditable) return null
  return root
}

function sync() {
  if (dialogOpen.value) return
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) {
    hideBar()
    return
  }
  const range = sel.getRangeAt(0)
  const root = editableRootOf(range.startContainer)
  if (!root) {
    hideBar()
    return
  }

  let rect = range.getBoundingClientRect()
  if (!rect || (!rect.width && !rect.height && !rect.top && !rect.left)) {
    rect = root.getBoundingClientRect()
  }
  if (!rect || (!rect.width && !rect.height && !rect.top)) {
    hideBar()
    return
  }
  // 光标滚出视口时不必留一个悬空的工具条
  if (rect.bottom < 0 || rect.top > window.innerHeight) {
    hideBar()
    return
  }

  activeRoot = root
  barVisible.value = true
  // 工具条贴在光标下方，水平居中并夹在视口内；下方空间不足时翻到上方
  const half = 68
  const height = 36
  const center = Math.min(
    Math.max(rect.left + rect.width / 2, half + 8),
    window.innerWidth - half - 8
  )
  let top = rect.bottom + 8
  if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 8)
  barStyle.value = { left: `${center}px`, top: `${top}px` }
}

function scheduleSync() {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    sync()
  })
}

function notifyInput(root) {
  root?.dispatchEvent?.(new Event('input', { bubbles: true }))
}

function applyTag(tag) {
  const root = activeRoot
  if (!root) return
  if (!toggleSupSub(root, tag)) return
  notifyInput(root)
  scheduleSync()
}

async function openDialog(node = null, root = null) {
  const target = root || activeRoot
  if (!target) return
  editingNode.value = node
  activeRoot = target
  savedRange = node ? null : saveEditRange(target)
  texDraft.value = node?.dataset?.tex || ''
  barVisible.value = false
  dialogOpen.value = true
  await nextTick()
  const el = texRef.value
  el?.focus()
  el?.setSelectionRange(texDraft.value.length, texDraft.value.length)
}

function focusRoot(root, range) {
  if (!root?.isContentEditable) return
  restoreEditRange(root, range)
  scheduleSync()
}

function cancel() {
  const root = activeRoot
  const range = savedRange
  dialogOpen.value = false
  editingNode.value = null
  texDraft.value = ''
  savedRange = null
  activeRoot = null
  focusRoot(root, range)
}

function commit() {
  const tex = texDraft.value.trim()
  const root = activeRoot
  const node = editingNode.value
  if (!tex || !root) {
    cancel()
    return
  }

  const range = savedRange
  dialogOpen.value = false
  editingNode.value = null
  texDraft.value = ''
  savedRange = null
  activeRoot = null

  if (node?.isConnected) {
    root.focus?.()
    replaceMath(node, tex)
  } else {
    insertMath(root, tex, range)
  }
  notifyInput(root)
  scheduleSync()
}

/** 符号面板：插到输入框光标处，遇到空组 { } 时把光标吸附进去 */
function insertSnippet(tex) {
  const el = texRef.value
  if (!el) return
  const start = el.selectionStart ?? texDraft.value.length
  const end = el.selectionEnd ?? start
  const value = texDraft.value
  texDraft.value = value.slice(0, start) + tex + value.slice(end)
  const empty = tex.indexOf('{}')
  const caret = empty >= 0 ? start + empty + 1 : start + tex.length
  nextTick(() => {
    el.focus()
    el.setSelectionRange(caret, caret)
  })
}

function onDialogKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    cancel()
    return
  }
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    commit()
  }
}

function onSelectionChange() {
  scheduleSync()
}

function onViewportChange() {
  if (barVisible.value) scheduleSync()
}

/** 双击已有公式：带着原始 LaTeX 打开弹层，提交后原地替换 */
function onDblClick(event) {
  const root = editableRootOf(event.target)
  if (!root) return
  const node = mathNodeAt(event.target)
  if (!node || !root.contains(node)) return
  event.preventDefault()
  openDialog(node, root)
}

/** 粘贴：Word 上下标换标签、LaTeX 文本转公式；未接管时走浏览器默认粘贴 */
function onPaste(event) {
  const root = editableRootOf(event.target)
  if (!root) return
  if (!normalizeMathPaste(event, root)) return
  notifyInput(root)
  scheduleSync()
}

onMounted(() => {
  document.addEventListener('selectionchange', onSelectionChange)
  document.addEventListener('focusin', onSelectionChange)
  document.addEventListener('dblclick', onDblClick, true)
  document.addEventListener('paste', onPaste, true)
  window.addEventListener('scroll', onViewportChange, true)
  window.addEventListener('resize', onViewportChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', onSelectionChange)
  document.removeEventListener('focusin', onSelectionChange)
  document.removeEventListener('dblclick', onDblClick, true)
  document.removeEventListener('paste', onPaste, true)
  window.removeEventListener('scroll', onViewportChange, true)
  window.removeEventListener('resize', onViewportChange)
  if (frame) cancelAnimationFrame(frame)
})
</script>

<style scoped>
.math-bar {
  position: fixed;
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-surface);
  box-shadow: var(--shadow-md);
  transform: translateX(-50%);
  user-select: none;
}

.math-bar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 26px;
  padding: 0 8px;
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--c-dark);
  font-family: var(--font-heading);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s var(--ease-soft), color 0.2s var(--ease-soft);
}

.math-bar-btn:hover {
  background: rgba(217, 119, 87, 0.12);
  color: var(--c-orange);
}

.math-bar-sigma {
  font-family: var(--font-serif);
  font-size: 14px;
  line-height: 1;
}

.math-bar-script {
  font-family: var(--font-serif);
  font-size: 12.5px;
  line-height: 1;
}

.math-mask {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--c-backdrop);
}

.math-dialog {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(520px, 100%);
  padding: 18px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  box-shadow: var(--shadow-lg), var(--inset-top);
}

.math-dialog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.math-dialog-title {
  font-family: var(--font-heading);
  font-size: 14px;
  font-weight: 600;
  color: var(--c-dark);
}

.math-dialog-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--c-mid-gray);
  cursor: pointer;
  transition: background 0.2s var(--ease-soft), color 0.2s var(--ease-soft);
}

.math-dialog-close:hover {
  background: var(--c-hover);
  color: var(--c-dark);
}

.math-input {
  width: 100%;
  min-height: 74px;
  padding: 9px 11px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-subtle);
  color: var(--c-dark);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s var(--ease-soft);
}

.math-input:focus {
  border-color: var(--c-orange);
}

.math-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 64px;
  padding: 10px 12px;
  overflow-x: auto;
  border: 1px dashed var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-light);
  color: var(--c-dark);
  font-size: 15px;
}

.math-preview-hint {
  font-family: var(--font-heading);
  font-size: 12px;
  color: var(--c-mid-gray);
}

.math-preview-body {
  display: inline-block;
  white-space: nowrap;
}

.math-symbols {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.math-symbol {
  min-width: 30px;
  height: 26px;
  padding: 0 7px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-dark);
  font-family: var(--font-serif);
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.2s var(--ease-soft), color 0.2s var(--ease-soft),
    background 0.2s var(--ease-soft);
}

.math-symbol:hover {
  border-color: var(--c-orange);
  background: rgba(217, 119, 87, 0.1);
  color: var(--c-orange);
}

.math-dialog-hint {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--c-mid-gray);
}

.math-dialog-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.math-dialog-btn {
  height: 32px;
  padding: 0 16px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-surface);
  color: var(--c-dark);
  font-family: var(--font-heading);
  font-size: 12.5px;
  cursor: pointer;
  transition: border-color 0.2s var(--ease-soft), background 0.2s var(--ease-soft),
    color 0.2s var(--ease-soft), opacity 0.2s var(--ease-soft);
}

.math-dialog-btn:hover {
  border-color: var(--c-orange);
  color: var(--c-orange);
}

.math-dialog-btn.is-primary {
  border-color: var(--c-orange);
  background: var(--c-orange);
  color: var(--c-on-accent);
}

.math-dialog-btn.is-primary:hover {
  border-color: var(--c-orange-hover);
  background: var(--c-orange-hover);
  color: var(--c-on-accent);
}

.math-dialog-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
