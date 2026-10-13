<template>
  <div ref="rootRef" class="process" :class="{ 'has-panel': panelIndex >= 0 }">
    <div v-if="loading" class="state">
      <span class="spinner"></span>
      <span class="state-text">{{ t('process.loading') }}</span>
    </div>

    <div v-else-if="failed" class="state">
      <p class="fail">{{ t('process.loadFailed') }}</p>
      <button class="btn" type="button" @click="load">{{ t('process.retry') }}</button>
    </div>

    <template v-else>
      <div class="q-col">
        <header class="head">
          <span class="doc" :title="docName">{{ docName }}</span>
          <div class="head-right">
            <span class="counter">{{ t('process.total', { total: questions.length }) }}</span>
            <button class="finish" type="button" @click="finish">{{ t('process.finish') }}</button>
          </div>
        </header>

        <article v-if="questions.length" class="sheet">
          <section
            v-for="q in questions"
            :key="q.index"
            :data-index="q.index"
            class="q"
            :class="{ 'is-analyzed': q.index === panelIndex }"
          >
            <template v-if="q.active">
              <div v-if="!single" class="q-tag">{{ t('process.questionLabel', { n: q.index + 1 }) }}</div>
              <div class="q-body" v-html="q.html"></div>

              <div class="q-foot" :class="{ 'is-tight': q.tight }">
                <button class="copy-latex" type="button" @click="copyLatex(q.index)">
                  {{ t('process.copyLatex') }}
                </button>
                <button
                  class="analyze"
                  type="button"
                  :disabled="busy && analyzingIndex !== q.index"
                  @click="analyze(q.index)"
                >
                  <span v-if="analyzingIndex === q.index" class="mini-spinner" aria-hidden="true"></span>
                  {{ analyzingIndex === q.index
                    ? t('process.analyzing')
                    : q.analyzed
                      ? t('process.viewAnalysis')
                      : t('process.analyze') }}
                </button>
              </div>
            </template>
            <div v-else class="q-skeleton" aria-hidden="true"></div>
          </section>
        </article>

        <div v-else class="state">
          <p class="state-text">{{ t('process.empty') }}</p>
        </div>
      </div>

      <aside v-if="panelIndex >= 0" class="panel">
        <div class="panel-head">
          <span class="panel-tag">{{ t('process.panelTitle') }}</span>
          <span class="panel-q">{{ t('process.questionLabel', { n: panelIndex + 1 }) }}</span>
          <button
            class="panel-close"
            type="button"
            :title="t('process.close')"
            :aria-label="t('process.close')"
            @click="closePanel"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
        </div>
        <div class="panel-body" v-html="panelHtml"></div>
      </aside>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getTaskResult } from '@/api/ocr'
import { analyzeQuestion } from '@/api/question'
import { toBlocks, splitQuestions, renderQuestion, questionMarkdown, questionLatex } from '@/utils/document'
import { renderMarkdown } from '@/utils/markdown'
import { lastImportPath, saveProcessState, getProcessState, dropProcessState } from '@/utils/importSession'

const props = defineProps({ id: { type: String, required: true } })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const loading = ref(false)
const failed = ref(false)
const docName = ref('')
const imagesBase = ref('')
const questions = ref([])
/** 全文作为单一题目兜底（未识别到题号）时，不显示题号标签 */
const single = ref(true)

/** 正在请求分析的题号，-1 表示无请求 */
const analyzingIndex = ref(-1)
/** 右侧面板展示的题号，-1 表示未展开 */
const panelIndex = ref(-1)
const panelHtml = ref('')

const busy = computed(() => analyzingIndex.value >= 0)

/** 题数不超过该值一次性渲染；超过则滚动到附近再渲染 */
const LAZY_THRESHOLD = 10
/** 视口外提前渲染的距离，避免滚动时出现明显空白 */
const PRELOAD_MARGIN = '1200px 0px'

const rootRef = ref(null)

let observer = null

/** 已分析过的题目结果缓存：题号 -> Markdown */
const analysisCache = new Map()

/** 已点「结束」，离开页面时不再缓存本页状态 */
let finished = false

/** 只有文本结尾的题目才有行高余量，可以让按钮上提到与文字底部齐平 */
const TEXT_TAIL_TYPES = new Set(['paragraph', 'title'])

function hasTextTail(blocks) {
  const list = blocks || []
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const block = list[i]
    if (!block.text && !block.html && !block.latex && !block.imgPath) continue
    return TEXT_TAIL_TYPES.has(block.type)
  }
  return false
}

function activate(index) {
  const question = questions.value[index]
  if (!question || question.active) return
  question.active = true
  question.html = renderQuestion(question.blocks, imagesBase.value)
  question.tight = hasTextTail(question.blocks)
}

function showPanel(index, markdown) {
  panelIndex.value = index
  panelHtml.value = renderMarkdown(markdown)
}

function closePanel() {
  panelIndex.value = -1
  panelHtml.value = ''
}

async function analyze(index) {
  if (busy.value) return
  const question = questions.value[index]
  if (!question) return

  // 已分析过的题目直接复用缓存，不再请求接口
  const cached = analysisCache.get(index)
  if (cached) {
    showPanel(index, cached)
    return
  }

  analyzingIndex.value = index
  try {
    const markdown = await analyzeQuestion(questionMarkdown(question.blocks, imagesBase.value))
    analysisCache.set(index, markdown)
    question.analyzed = true
    showPanel(index, markdown)
  } catch {
    // 失败提示由 http 拦截器统一弹出，这里只恢复按钮状态
  } finally {
    analyzingIndex.value = -1
  }
}

/** 写入剪贴板：优先用异步 API，失败或不可用时降级 execCommand */
async function writeClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 非安全上下文等情况下降级
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

/** 生成该题的 LaTeX 片段并复制到剪贴板 */
async function copyLatex(index) {
  const question = questions.value[index]
  if (!question) return
  const latex = questionLatex(question.blocks, imagesBase.value)
  const ok = await writeClipboard(latex)
  if (ok) ElMessage.success(t('process.copied'))
  else ElMessage.error(t('process.copyFailed'))
}

/** 找到实际的滚动容器，让 rootMargin 能在容器外提前渲染 */
function scrollParentOf(el) {
  let node = el?.parentElement
  while (node && node !== document.body) {
    const overflowY = getComputedStyle(node).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll') return node
    node = node.parentElement
  }
  return null
}

function observeEls(els) {
  observer?.disconnect()
  if (!els.length) return
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        activate(Number(entry.target.dataset.index))
        observer.unobserve(entry.target)
      })
    },
    { root: scrollParentOf(els[0]), rootMargin: PRELOAD_MARGIN }
  )
  els.forEach((el) => observer.observe(el))
}

/** 按题量决定一次性渲染还是滚动到附近再渲染 */
function renderQuestions() {
  if (questions.value.length <= LAZY_THRESHOLD) {
    questions.value.forEach((_, index) => activate(index))
    return
  }
  observeEls([...(rootRef.value?.querySelectorAll('.q') || [])])
}

/** 离开页面时把当前状态存入会话缓存 */
function snapshot() {
  return {
    docName: docName.value,
    imagesBase: imagesBase.value,
    questions: questions.value,
    single: single.value,
    panelIndex: panelIndex.value,
    panelHtml: panelHtml.value,
    analysis: new Map(analysisCache),
    scrollTop: scrollParentOf(rootRef.value)?.scrollTop ?? 0
  }
}

/** 还原会话缓存中的页面状态 */
function restore(state) {
  docName.value = state.docName
  imagesBase.value = state.imagesBase
  questions.value = state.questions
  single.value = state.single
  panelIndex.value = state.panelIndex
  panelHtml.value = state.panelHtml
  analysisCache.clear()
  state.analysis.forEach((markdown, index) => analysisCache.set(index, markdown))
}

async function load() {
  // 命中会话缓存时直接还原：不显示加载态、不重新请求，回到本页立即可见
  const cached = getProcessState(props.id)
  if (cached) {
    restore(cached)
    loading.value = false
    failed.value = false
    await nextTick()
    renderQuestions()
    await nextTick()
    const scroller = scrollParentOf(rootRef.value)
    if (scroller) scroller.scrollTop = cached.scrollTop
    return
  }

  loading.value = true
  failed.value = false
  analyzingIndex.value = -1
  panelIndex.value = -1
  panelHtml.value = ''
  analysisCache.clear()

  try {
    const data = await getTaskResult(props.id)
    docName.value = data.fileName || ''
    imagesBase.value = data.imagesBase || ''
    const parsed = splitQuestions(toBlocks(data.contentListV2))
    parsed.questions.forEach((q) => {
      q.active = false
      q.html = ''
      q.analyzed = false
      q.tight = false
    })
    questions.value = parsed.questions
    single.value = parsed.single
  } catch {
    failed.value = true
    loading.value = false
    return
  }

  // 先退出 loading，让题目节点挂载后再决定渲染策略
  loading.value = false
  await nextTick()
  renderQuestions()
}

/** 结束处理：提示未入库题目不会保存，确认后丢弃本页状态并回到载入文件页 */
async function finish() {
  try {
    await ElMessageBox.confirm(t('process.finishTip'), t('process.finish'), {
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
      type: 'warning'
    })
  } catch {
    // 取消结束
    return
  }
  dropProcessState(props.id)
  finished = true
  lastImportPath.value = '/'
  router.push('/')
}

onMounted(() => {
  lastImportPath.value = route.fullPath
  load()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  // 正常离开时缓存状态；点「结束」离开时不缓存，题目状态直接丢弃
  if (!finished && questions.value.length) saveProcessState(props.id, snapshot())
})
</script>

<style scoped>
/* 标题卡片高度与间距固定下来，供面板顶部对齐题目卡片上边缘复用 */
.process {
  --head-h: 52px;
  --head-gap: 20px;
  /* AI 分析按钮高度，用于把它上提到与题干文字底部对齐 */
  --analyze-h: 36px;
  display: flex;
  gap: 24px;
  align-items: flex-start;
  justify-content: center;
  width: 100%;
}

/* 无分析面板时题目列居中；展开后整体左对齐，题目列左边缘与页标题对齐 */
.process.has-panel {
  justify-content: flex-start;
}

.q-col {
  flex: 0 1 900px;
  min-width: 0;
}

/* 文件标题卡片：滚动时固定在页面顶部，标题 / 题量 / 结束做成一个独立卡片 */
.head {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: var(--head-h);
  padding: 0 20px;
  margin-bottom: var(--head-gap);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  box-shadow: 0 8px 24px rgba(20, 20, 19, 0.06);
}

.head-right {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-left: auto;
}

/* 结束：结束本次文件处理，回到载入文件页 */
.finish {
  display: inline-flex;
  align-items: center;
  flex: none;
  height: 26px;
  padding: 0 14px;
  border: 1px solid var(--c-orange);
  border-radius: 999px;
  background: var(--c-orange);
  color: #ffffff;
  font-family: var(--font-heading);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease;
}

.finish:hover {
  background: #c4623f;
  border-color: #c4623f;
}

.doc {
  min-width: 0;
  font-family: var(--font-heading);
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.counter {
  flex: none;
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--c-mid-gray);
  white-space: nowrap;
}

.btn {
  padding: 7px 16px;
  border: 1px solid var(--c-orange);
  border-radius: 999px;
  background: var(--c-orange);
  color: #ffffff;
  font-family: var(--font-heading);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.btn:hover:not(:disabled) {
  border-color: #c4623f;
  background: #c4623f;
}

.sheet {
  padding: 8px 40px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  box-shadow: 0 12px 32px rgba(20, 20, 19, 0.05);
}

/* 题目之间用分割线 + 题号标签区分；上下内边距为分割线到题目的间距 */
.q {
  padding: 24px 20px;
}

.q + .q {
  border-top: 1px dashed var(--c-light-gray);
}

/* 已展示分析结果的那道题高亮 */
.q.is-analyzed {
  border-radius: var(--radius-md);
  background: rgba(217, 119, 87, 0.06);
  box-shadow: inset 3px 0 0 var(--c-orange);
}

.q-tag {
  display: inline-block;
  margin-bottom: 14px;
  padding: 3px 12px;
  border-radius: 999px;
  background: rgba(217, 119, 87, 0.12);
  color: var(--c-orange);
  font-family: var(--font-heading);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* 题干右下角的操作入口：默认排在题干下方 */
.q-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}

/* 题干以文字结尾时，上提自身高度，使按钮下边缘与最后一行文字底部齐平 */
.q-foot.is-tight {
  margin-top: calc(-1 * var(--analyze-h));
}

/* 题干最后一个块不留底部外边距，避免按钮与表格/图片/公式之间出现空隙 */
:deep(.q-body > :last-child) {
  margin-bottom: 0;
}

/* 题干右下角的操作入口：统一主色底 + 白字 */
.analyze,
.copy-latex {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: var(--analyze-h);
  padding: 0 16px;
  border: 1px solid var(--c-orange);
  border-radius: 999px;
  background: var(--c-orange);
  color: #ffffff;
  font-family: var(--font-heading);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.analyze:hover:not(:disabled),
.copy-latex:hover {
  border-color: #c4623f;
  background: #c4623f;
}

/* 分析进行中，其余题目的入口置灰 */
.analyze:disabled {
  border-color: var(--c-border);
  background: var(--c-light-gray);
  color: var(--c-mid-gray);
  cursor: not-allowed;
}

.mini-spinner {
  width: 13px;
  height: 13px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 懒加载占位，等待进入视口后再渲染真实内容 */
.q-skeleton {
  min-height: 150px;
}

/* 右侧分析结果面板：顶部与题目卡片上边缘对齐；滚动时吸附在文件标题栏下方并留出呼吸间距 */
.panel {
  flex: 0 0 768px;
  position: sticky;
  top: calc(var(--head-h) + 8px);
  margin-top: calc(var(--head-h) + var(--head-gap));
  max-height: calc(100vh - 160px);
  overflow-y: auto;
  padding: 22px 24px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  box-shadow: 0 12px 32px rgba(20, 20, 19, 0.05);
}

.panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--c-border);
}

.panel-tag {
  padding: 3px 12px;
  border-radius: 999px;
  background: rgba(217, 119, 87, 0.12);
  color: var(--c-orange);
  font-family: var(--font-heading);
  font-size: 12px;
  font-weight: 600;
}

.panel-q {
  font-family: var(--font-heading);
  font-size: 12px;
  color: var(--c-mid-gray);
}

/* 关闭按钮：收起分析面板，题目列恢复居中 */
.panel-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin-left: auto;
  padding: 0;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-surface);
  color: var(--c-mid-gray);
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.panel-close:hover {
  border-color: var(--c-orange);
  background: rgba(217, 119, 87, 0.08);
  color: var(--c-orange);
}

.panel-body {
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.85;
  word-break: break-word;
}

.panel-body :deep(h1),
.panel-body :deep(h2),
.panel-body :deep(h3),
.panel-body :deep(h4) {
  margin: 18px 0 8px;
  font-family: var(--font-heading);
  font-size: 14px;
  font-weight: 600;
}

.panel-body :deep(h1:first-child),
.panel-body :deep(h2:first-child),
.panel-body :deep(h3:first-child) {
  margin-top: 0;
}

.panel-body :deep(p) {
  margin: 0 0 10px;
}

.panel-body :deep(ul),
.panel-body :deep(ol) {
  margin: 0 0 10px;
  padding-left: 20px;
}

.panel-body :deep(li) {
  margin-bottom: 4px;
}

.panel-body :deep(table) {
  width: 100%;
  margin: 12px 0;
  border-collapse: collapse;
  font-size: 13px;
}

.panel-body :deep(th),
.panel-body :deep(td) {
  padding: 6px 10px;
  border: 1px solid var(--c-border);
  text-align: left;
}

.panel-body :deep(code) {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--c-light-gray);
  font-size: 13px;
}

.panel-body :deep(pre) {
  margin: 12px 0;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  background: var(--c-subtle);
  overflow-x: auto;
}

.panel-body :deep(pre code) {
  padding: 0;
  background: none;
}

.panel-body :deep(blockquote) {
  margin: 12px 0;
  padding-left: 12px;
  border-left: 3px solid var(--c-light-gray);
  color: var(--c-mid-gray);
}

.panel-body :deep(.katex-display) {
  margin: 12px 0;
  overflow-x: auto;
  overflow-y: hidden;
}

.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 72px 0;
}

.state-text {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--c-mid-gray);
}

.fail {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 14px;
  color: var(--c-orange);
}

.spinner {
  width: 22px;
  height: 22px;
  border: 2px solid var(--c-light-gray);
  border-top-color: var(--c-orange);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* v-html 渲染内容 */
:deep(.blk-para p) {
  margin: 0 0 10px;
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.95;
}

:deep(.blk-para p:last-child) {
  margin-bottom: 0;
}

:deep(.blk-title) {
  margin: 0 0 12px;
  font-family: var(--font-heading);
  font-size: 17px;
  font-weight: 600;
}

:deep(.blk-table) {
  margin: 16px 0;
  overflow-x: auto;
}

:deep(.blk-table table) {
  width: 100%;
  border-collapse: collapse;
}

:deep(.blk-table td) {
  padding: 8px 12px;
  border: 1px solid var(--c-border);
  font-family: var(--font-body);
  font-size: 14px;
}

:deep(.blk-image) {
  margin: 16px 0;
}

:deep(.blk-image img) {
  max-width: 100%;
  border-radius: var(--radius-sm);
}

:deep(.blk-equation) {
  margin: 16px 0;
  overflow-x: auto;
  text-align: center;
}

/* 窄屏时分析结果移到题目下方 */
@media (max-width: 1400px) {
  .process {
    flex-direction: column;
  }

  .q-col {
    flex: none;
    width: 100%;
  }

  .panel {
    position: static;
    flex: none;
    width: 100%;
    margin-top: 0;
    max-height: none;
  }
}
</style>
