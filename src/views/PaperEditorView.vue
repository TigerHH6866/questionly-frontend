<template>
  <div class="editor">
    <!-- 顶栏左侧：返回（离开前自动保存当前编辑） -->
    <Teleport v-if="topbarLead" :to="topbarLead">
      <button class="back-btn" type="button" @click="back">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
          <path
            d="M14.6 5.6 8.2 12l6.4 6.4"
            stroke="currentColor"
            stroke-width="1.9"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span>{{ t('compose.back') }}</span>
      </button>
    </Teleport>

    <!-- 左：搜索区（贴页面下边缘，高度固定为屏幕 1/2；输入条在卡片底部） -->
    <section class="search-card">
      <header class="block-head">
        <h2 class="block-title">{{ t('compose.search.title') }}</h2>
      </header>

      <div class="search-body">
        <p v-if="searching" class="body-tip">
          <span class="spinner" aria-hidden="true"></span>
          {{ t('search.thinking') }}
        </p>
        <p v-else-if="!searched" class="body-tip">{{ t('compose.search.hint') }}</p>
        <p v-else-if="!hits.length" class="body-tip">{{ t('compose.search.empty') }}</p>

        <ul v-else class="hits">
          <li v-for="hit in hits" :key="hit.id" class="hit">
            <div class="hit-text" v-html="hit.html"></div>
            <button type="button" class="hit-add" @mousedown="keepFocus" @click="insert(hit)">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                <path d="M12 5.4v13.2M5.4 12h13.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
              {{ t('compose.search.insert') }}
            </button>
          </li>
        </ul>
      </div>

      <footer v-if="total > 0" class="search-foot">
        <el-pagination
          small
          background
          layout="prev, pager, next"
          :total="total"
          :page-size="pageSize"
          :current-page="pageNo"
          @current-change="goPage"
        />
      </footer>

      <!-- 输入条：移植搜索题库页的交互（波形 / 麦克风 / 发送），含长按空格 1.5s 启动录音 -->
      <form class="composer" :class="{ 'is-recording': recording }" @submit.prevent="send">
        <div v-if="recording" class="rec-card">
          <span class="rec-dot" aria-hidden="true"></span>
          <div class="rec-wave" aria-hidden="true">
            <span v-for="(bar, i) in recBars" :key="i" class="rec-bar" :style="{ height: `${bar}%` }"></span>
          </div>
          <span class="rec-time">{{ recTime }}</span>
        </div>
        <input
          v-else
          v-model="draft"
          class="chat-input"
          type="text"
          :placeholder="recognizing ? t('search.recognizing') : t('compose.search.placeholder')"
          :disabled="searching || recognizing"
        />

        <button
          class="mic"
          type="button"
          :class="{ 'is-on': recording }"
          :disabled="searching || recognizing"
          :title="t(recording ? 'search.micStop' : 'search.micStart')"
          :aria-label="t(recording ? 'search.micStop' : 'search.micStart')"
          @click="toggleRecording"
        >
          <span v-if="recognizing" class="mic-spinner" aria-hidden="true"></span>
          <svg v-else-if="recording" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <rect x="7" y="7" width="10" height="10" rx="2.5" fill="currentColor" />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
            <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" stroke-width="1.8" />
            <path
              d="M5.5 11.5a6.5 6.5 0 0 0 13 0"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
            <path d="M12 18v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>

        <button class="send" type="submit" :disabled="searching || recognizing || !draft.trim()">
          <span v-if="searching" class="mini-spinner" aria-hidden="true"></span>
          {{ t('compose.search.button') }}
        </button>
      </form>
    </section>

    <!-- 中：排版区（传统文档编辑模式：白纸页面 + 正文可直接编辑；本身无底色无边框，露出页面网格） -->
    <section class="doc-area">
      <div ref="canvasRef" class="canvas">
        <div
          ref="sheetRef"
          class="sheet"
          :style="sheetStyle"
          contenteditable="true"
          spellcheck="false"
          @mousedown="onSheetMouseDown"
          @keydown="onSheetKeydown"
          @input="onSheetInput"
          @compositionend="schedulePaginate(90)"
        ></div>
      </div>
    </section>

    <!-- 右：选项区 -->
    <aside class="options">
      <div class="opt-card">
        <p class="opt-label">{{ t('compose.options.title') }}</p>
        <el-input
          v-model="title"
          type="textarea"
          :rows="3"
          resize="none"
          maxlength="80"
          :placeholder="t('compose.options.titlePlaceholder')"
        />
      </div>

      <div class="opt-card">
        <p class="opt-label">{{ t('compose.options.paperSize') }}</p>
        <div class="seg">
          <button
            v-for="size in PAPER_SIZES"
            :key="size.key"
            type="button"
            class="seg-item"
            :class="{ 'is-active': sizeKey === size.key }"
            @click="sizeKey = size.key"
          >
            <span class="seg-shape" :style="{ aspectRatio: `${size.w} / ${size.h}` }" aria-hidden="true"></span>
            <span class="seg-label">{{ size.key }}</span>
          </button>
        </div>
      </div>

      <div class="opt-card">
        <p class="opt-label">{{ t('compose.options.zoom') }}</p>
        <div class="seg seg--zoom">
          <button
            v-for="level in ZOOM_LEVELS"
            :key="level.key"
            type="button"
            class="seg-chip"
            :class="{ 'is-active': zoomKey === level.key }"
            @click="zoomKey = level.key"
          >
            {{ level.key === 'fit' ? t('compose.options.zoomFit') : level.label }}
          </button>
        </div>
      </div>

      <!-- 文字格式：改的是正文里光标所在的文字 / 段落 -->
      <div class="opt-card">
        <p class="opt-label">{{ t('compose.options.format') }}</p>

        <div class="fmt-row">
          <span class="fmt-tag">{{ t('compose.options.fontSize') }}</span>
          <div class="fmt-chips">
            <button
              v-for="size in FONT_SIZES"
              :key="size.key"
              type="button"
              class="fmt-chip"
              :class="{ 'is-active': formatState.fontSize === size.key }"
              @mousedown="keepFocus"
              @click="applyFontSize(size)"
            >
              {{ t(size.label) }}
            </button>
          </div>
        </div>

        <div class="fmt-row">
          <span class="fmt-tag">{{ t('compose.options.lineHeight') }}</span>
          <div class="fmt-chips">
            <button
              v-for="item in LINE_HEIGHTS"
              :key="item.key"
              type="button"
              class="fmt-chip"
              :class="{ 'is-active': formatState.lineHeight === item.key }"
              @mousedown="keepFocus"
              @click="applyLineHeight(item)"
            >
              {{ item.label }}
            </button>
          </div>
        </div>

        <div class="fmt-row">
          <span class="fmt-tag">{{ t('compose.options.align') }}</span>
          <div class="fmt-chips">
            <button
              v-for="dir in ALIGNMENTS"
              :key="dir.key"
              type="button"
              class="fmt-icon"
              :class="{ 'is-active': formatState.align === dir.key }"
              :title="t(dir.label)"
              @mousedown="keepFocus"
              @click="applyAlign(dir.key)"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
                <path :d="dir.path" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
            </button>

            <span class="fmt-gap" aria-hidden="true"></span>

            <button
              type="button"
              class="fmt-icon"
              :class="{ 'is-active': formatState.bold }"
              :title="t('compose.options.bold')"
              @mousedown="keepFocus"
              @click="execCmd('bold')"
            >
              <span class="fmt-glyph fmt-glyph--bold">B</span>
            </button>
            <button
              type="button"
              class="fmt-icon"
              :class="{ 'is-active': formatState.italic }"
              :title="t('compose.options.italic')"
              @mousedown="keepFocus"
              @click="execCmd('italic')"
            >
              <span class="fmt-glyph fmt-glyph--italic">I</span>
            </button>
            <button
              type="button"
              class="fmt-icon"
              :class="{ 'is-active': formatState.underline }"
              :title="t('compose.options.underline')"
              @mousedown="keepFocus"
              @click="execCmd('underline')"
            >
              <span class="fmt-glyph fmt-glyph--underline">U</span>
            </button>
          </div>
        </div>
      </div>

      <button type="button" class="btn-accent save-btn" :disabled="saving || exporting" @click="save">
        <span v-if="saving" class="spinner spinner-on-accent" aria-hidden="true"></span>
        {{ saving ? t('compose.options.saving') : t('compose.options.save') }}
      </button>

      <button type="button" class="export-btn" :disabled="exporting || saving" @click="exportFile('pdf')">
        <span v-if="exporting" class="spinner" aria-hidden="true"></span>
        {{ exporting ? t('compose.options.exporting') : t('compose.options.exportPdf') }}
      </button>

      <button type="button" class="export-btn" :disabled="exporting || saving" @click="exportFile('word')">
        <span v-if="exporting" class="spinner" aria-hidden="true"></span>
        {{ exporting ? t('compose.options.exporting') : t('compose.options.exportWord') }}
      </button>
    </aside>
  </div>
</template>

<script setup>
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { createPaper, exportPaperDocx, exportPaperPdf, getPaper, updatePaper } from '@/api/paper'
import { searchQuestions } from '@/api/question'
import { recognizeAudio } from '@/api/asr'
import { renderRichMarkdown } from '@/utils/markdown'
import { isLoggedIn } from '@/utils/auth'
import { VoiceRecorder } from '@/utils/recorder'

const props = defineProps({
  /** 路由参数：new 表示新建，其余为已有试卷 ID */
  id: { type: String, default: '' }
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

/** 顶栏左侧插槽：返回按钮由 App.vue 提供承载位置 */
const topbarLead = inject('topbarLead', null)

/** 版面：按纸张真实尺寸（mm）换算，宽度写进 seg-shape 的图形，高度用于给纸张定尺寸 */
const PAPER_SIZES = [
  { key: 'A4', w: 210, h: 297 },
  { key: 'A3', w: 297, h: 420 },
  { key: 'B5', w: 176, h: 250 }
]

/** 缩放基准：A4 恰好放进画布，其他版面按同一缩放比例换算（A3 更大需滚动，B5 更小） */
const BASE_SIZE = PAPER_SIZES.find((size) => size.key === 'A4')

/** 1mm 对应的 CSS 像素（CSS 规范 1in = 96px），纸张按真实尺寸换算后才能保证正文是「五号」 */
const PX_PER_MM = 96 / 25.4

/** 画布内边距（与 .canvas 的 padding 保持一致） */
const CANVAS_PADDING = 10
/** 画布常驻的滚动条槽宽度（与 .canvas 的 scrollbar-gutter: stable 对应），避免出现滚动条时纸张宽度跳变 */
const SCROLLBAR_GUTTER = 10
/** 纸张左侧页码槽宽度（固定屏幕像素，不跟缩放走，保证任何档位都看得清） */
const LABEL_GUTTER = 56

const sizeKey = ref('A4')
const currentSize = computed(() => PAPER_SIZES.find((s) => s.key === sizeKey.value) || PAPER_SIZES[0])

/** 显示比例档位：fit = 整页适配（按 A4 基准等比缩放），其余档为纸张真实尺寸的百分比 */
const ZOOM_LEVELS = [
  { key: 'fit', label: 'fit' },
  { key: '0.5', label: '50%' },
  { key: '0.75', label: '75%' },
  { key: '1', label: '100%' }
]

const zoomKey = ref('fit')

/**
 * 纸张真实尺寸与显示比例之比：字号、内边距、段距全部按它等比缩放。
 * 这样「五号字在纸上的占比」始终等于真实纸张，不会因为整页适配缩小而显得偏大
 */
const sheetScale = ref(0)

/**
 * 单页纸张尺寸：按真实 mm 换算成像素，再乘以当前显示比例得到屏幕尺寸。
 * 每张纸固定为这个高度，内容超出由分页逻辑自动搬到下一张（不再靠 min-height 撑高）
 */
const sheetSize = ref({ width: 0, height: 0 })
const sheetStyle = computed(() => ({
  // 容器额外留出左侧页码槽，纸张本身宽度由 --page-w 给出
  width: sheetSize.value.width ? `${sheetSize.value.width + LABEL_GUTTER}px` : '100%',
  '--page-w': sheetSize.value.width ? `${sheetSize.value.width}px` : '100%',
  '--page-h': sheetSize.value.height ? `${sheetSize.value.height}px` : '0px',
  '--sheet-scale': sheetScale.value || 1
}))

const isNew = computed(() => !props.id || props.id === 'new')

const title = ref('')
const saving = ref(false)
const exporting = ref(false)
const loading = ref(false)

/** 搜索输入：移植搜索题库页的输入条，草稿由输入框与 ASR 共同填充 */
const draft = ref('')
const searching = ref(false)
const searched = ref(false)
const hits = ref([])
const total = ref(0)
const pageNo = ref(1)
const pageSize = ref(20)
const searchId = ref(null)

const sheetRef = ref(null)
const canvasRef = ref(null)

/* ---------- 语音输入（移植自搜索题库页） ---------- */

/** 波形柱子数量 */
const BAR_COUNT = 26
/** 长按空格触发录音的时长 */
const SPACE_HOLD_MS = 1500

const recording = ref(false)
const recognizing = ref(false)
const recBars = ref(new Array(BAR_COUNT).fill(0))
const recSeconds = ref(0)

let recorder = null
let recTimer = null
let spaceTimer = null
let spaceTriggered = false

const recTime = computed(() => {
  const s = recSeconds.value
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})

/** 音量 0~1 -> 波形柱高度百分比，留一条底线表示静音 */
function pushLevel(level) {
  const bar = Math.max(10, Math.min(100, Math.round(level * 130)))
  recBars.value = [...recBars.value.slice(1), bar]
}

/** 未登录时复用全局登录弹窗 */
function requireLogin() {
  if (isLoggedIn()) return true
  window.dispatchEvent(new CustomEvent('questionly:unauthorized'))
  return false
}

async function startRecording() {
  if (recording.value || searching.value || recognizing.value) return
  if (!requireLogin()) return
  recorder = new VoiceRecorder({
    onLevel: pushLevel,
    onSilent: () => finishRecording(true),
    onMaxDuration: () => finishRecording(false)
  })
  try {
    await recorder.start()
  } catch {
    recorder = null
    ElMessage.error(t('search.micDenied'))
    return
  }
  recBars.value = new Array(BAR_COUNT).fill(0)
  recSeconds.value = 0
  recording.value = true
  recTimer = setInterval(() => {
    recSeconds.value += 1
  }, 1000)
}

async function finishRecording(discard = false) {
  const current = recorder
  if (!recording.value || !current) return
  recorder = null
  recording.value = false
  clearInterval(recTimer)
  recTimer = null
  const blob = await current.stop(discard)
  if (!blob) return
  recognizing.value = true
  try {
    const text = ((await recognizeAudio(blob)) || '').trim()
    if (text) draft.value = draft.value.trim() ? `${draft.value.trim()} ${text}` : text
  } catch {
    // 失败提示由 http 拦截器统一弹出
  } finally {
    recognizing.value = false
  }
}

function toggleRecording() {
  if (recording.value) finishRecording()
  else startRecording()
}

function isTypingTarget(target) {
  if (!target) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
}

function onSpaceDown(event) {
  if (event.code !== 'Space' || event.repeat) return
  if (recording.value) return
  if (!isTypingTarget(event.target)) event.preventDefault()
  spaceTriggered = false
  spaceTimer = setTimeout(() => {
    spaceTimer = null
    spaceTriggered = true
    startRecording()
  }, SPACE_HOLD_MS)
}

function onSpaceUp(event) {
  if (event.code !== 'Space') return
  if (spaceTimer) {
    clearTimeout(spaceTimer)
    spaceTimer = null
  }
  if (spaceTriggered) {
    spaceTriggered = false
    finishRecording()
    return
  }
  if (!isTypingTarget(event.target)) event.preventDefault()
}

/* ---------- 试卷加载 / 保存 ---------- */

/** 打开已有试卷：回填标题 / 正文 */
async function load() {
  if (isNew.value || !requireLogin()) return
  loading.value = true
  try {
    const paper = await getPaper(props.id)
    title.value = paper.title || ''
    await nextTick()
    if (sheetRef.value) sheetRef.value.innerHTML = paper.content || ''
    ensurePageFrame()
  } catch {
    ElMessage.error(t('compose.loadFailed'))
  } finally {
    loading.value = false
  }
}

/** 落库前先摘掉只用于编辑的临时元素（图片描边框、选中态），并把结构规整回「一张纸 = 正文容器」 */
function currentContent() {
  const sheet = sheetRef.value
  if (!sheet) return ''
  clearPick()
  normalizeStructure()
  return sheet.innerHTML
}

/** 正文是否为空：去掉标签后仍有文字，或含图片 / 表格等实体内容 */
function hasContent(html) {
  if (!html) return false
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
  return text.length > 0 || /<(img|table|svg|video)/i.test(html)
}

/**
 * 落库。silent 时不弹成功提示（返回页面时用），fallbackTitle 允许标题为空时用「未命名试卷」兜底。
 * @returns {Promise<{created:boolean,id:string}|null>} null 表示没有可保存的内容或保存失败
 */
async function persist({ silent = false, fallbackTitle = false } = {}) {
  if (saving.value || !requireLogin()) return null
  const content = currentContent()
  const typed = title.value.trim()
  const name = typed || (fallbackTitle && hasContent(content) ? t('compose.options.untitled') : '')
  if (!name) {
    if (!silent) ElMessage.error(t('compose.options.titleRequired'))
    return null
  }

  saving.value = true
  const payload = { title: name, content }
  try {
    if (isNew.value) {
      const created = await createPaper(payload)
      if (!silent) ElMessage.success(t('compose.options.saved'))
      return { created: true, id: created.id }
    }
    await updatePaper(props.id, payload)
    if (!silent) ElMessage.success(t('compose.options.saved'))
    return { created: false, id: props.id }
  } catch {
    // 失败提示由 http 拦截器统一弹出
    return null
  } finally {
    saving.value = false
  }
}

async function save() {
  const result = await persist()
  if (result?.created) {
    // 换成带 ID 的地址：组件按 path 重建，重新加载一次即为服务端保存后的内容
    router.replace(`/app/compose/${result.id}`)
  }
}

/**
 * 导出 PDF / Word：先静默保存一次，保证后端拿到的是最新正文；
 * PDF 由后端无头 Chrome 按同一套样式渲染，Word 由 pandoc 转成 docx。
 * @param {'pdf' | 'word'} kind
 */
async function exportFile(kind) {
  if (exporting.value || saving.value || !requireLogin()) return
  if (!hasContent(sheetRef.value?.innerHTML || '')) {
    ElMessage.warning(t('compose.options.exportEmpty'))
    return
  }
  const result = await persist({ silent: true, fallbackTitle: true })
  if (!result) return
  if (result.created) {
    // 新建试卷第一次导出会先落库：换成带 ID 的地址，避免再次导出重复创建
    router.replace(`/app/compose/${result.id}`)
  }

  exporting.value = true
  try {
    const data = kind === 'pdf'
      ? await exportPaperPdf(result.id, sizeKey.value)
      : await exportPaperDocx(result.id, sizeKey.value)
    // 后端异常时返回的是 JSON（业务错误），不是文件
    if (!(data instanceof Blob) || data.type.includes('json')) {
      let message = t('compose.options.exportFailed')
      try {
        const body = JSON.parse(await data.text())
        if (body?.msg) message = body.msg
      } catch {
        // 解析失败就用默认文案
      }
      ElMessage.error(message)
      return
    }
    const name = title.value.trim() || t('compose.options.untitled')
    const url = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = `${name}.${kind === 'pdf' ? 'pdf' : 'docx'}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    ElMessage.success(t(kind === 'pdf' ? 'compose.options.exported' : 'compose.options.exportedWord'))
  } catch {
    // 失败提示由 http 拦截器统一弹出
  } finally {
    exporting.value = false
  }
}

/** 返回：先自动保存当前编辑。
    从「我的试卷」进来的回到我的试卷标签；从「沉浸式组卷」进来的回到试卷列表 */
async function back() {
  if (recording.value) await finishRecording(true)
  await persist({ silent: true, fallbackTitle: true })
  if (route.query.from === 'resources') router.push('/app/resources?tab=papers')
  else router.push('/app/compose')
}

/* ---------- 检索 ---------- */

function toHit(raw) {
  return {
    id: String(raw.id),
    html: renderRichMarkdown(raw.title || '')
  }
}

/** 用接口返回的分页数据刷新结果列表 */
function applyPage(data) {
  searchId.value = data.searchId
  total.value = Number(data.total) || 0
  pageNo.value = Number(data.page) || 1
  pageSize.value = Number(data.pageSize) || 20
  hits.value = (data.records || []).map(toHit)
}

/** 发提问：首次检索（输入条提交即检索） */
async function send() {
  const q = draft.value.trim()
  if (!q || searching.value || !requireLogin()) return
  searching.value = true
  searched.value = true
  try {
    applyPage(await searchQuestions({ q, bizType: 'search', page: 1 }))
  } catch {
    hits.value = []
    total.value = 0
  } finally {
    searching.value = false
  }
}

/** 翻页：复用该次检索的 searchId */
async function goPage(page) {
  if (!searchId.value || page < 1 || searching.value) return
  searching.value = true
  try {
    applyPage(await searchQuestions({ searchId: searchId.value, page }))
  } catch {
    // 失败提示由 http 拦截器统一弹出
  } finally {
    searching.value = false
  }
}

/** 段落是不是「题与题之间的空行」：既用来定插入位置，也用来放插入后的光标 */
function isEmptyLine(el) {
  if (!el || el.nodeType !== 1 || el.tagName !== 'P') return false
  if (el.textContent.trim()) return false
  return !el.querySelector('img, svg, table, .katex')
}

/**
 * 图片是异步出尺寸的：图还没加载完就分页，量不到溢出，题目就会一直挂在原页。
 * 所以给每张还没加载完的图挂一次性监听，图一到就重排。
 */
function watchImages(root) {
  root.querySelectorAll('img').forEach((img) => {
    if (img.dataset.pagWatch) return
    img.dataset.pagWatch = '1'
    if (img.complete) return
    img.addEventListener('load', () => schedulePaginate(60), { once: true })
    img.addEventListener('error', () => schedulePaginate(60), { once: true })
  })
}

/** 把光标放进一个空行（空行用 <br> 撑出行高，不然是零高度） */
function caretInEmptyLine(line) {
  if (!line.firstChild) line.appendChild(document.createElement('br'))
  const range = document.createRange()
  range.setStart(line, 0)
  range.collapse(true)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
  savedRange = range.cloneRange()
}

/** 题目后面保证留一个空行：插入后光标落在这一行，与 Word 插完内容的行为一致 */
function ensureLineAfter(block) {
  const next = block.nextSibling
  if (next && next.nodeType === 1 && isEmptyLine(next)) return next
  const line = document.createElement('p')
  line.appendChild(document.createElement('br'))
  block.after(line)
  return line
}

/** 把题干插到光标所在段落之后；光标不在正文里（例如刚打开试卷）时落到第一页正文末尾 */
function insert(hit) {
  const sheet = sheetRef.value
  if (!sheet) return
  const block = document.createElement('div')
  block.className = 'q-block'
  block.innerHTML = hit.html

  const range = activeRange()
  const target = range && sheet.contains(range.commonAncestorContainer) ? blockOf(range.startContainer) : null
  // 题目块之间不能互相嵌套：光标落在已有题目块内部时把锚点提到该题目块本身，
  // 新题目插到它后面成为同级。否则新题目会被塞进老题目里，分页时整块被当作一个单元搬走。
  const anchor = target?.closest?.('.q-block') || target
  // 光标在哪一页就插到那一页的正文里（光标落在纸张容器等非正文位置时，退化成该页正文）
  const ownerBody = anchor?.closest?.('.pg-body') || null
  const body = ownerBody || pageEls()[0]?.querySelector('.pg-body') || null
  if (body && anchor && anchor !== body && body.contains(anchor)) {
    // 光标停在题后空行上时插到空行之前，空行继续留在末尾当光标位，避免连插时堆出一串空行
    if (isEmptyLine(anchor)) anchor.before(block)
    else anchor.after(block)
  } else if (body) {
    body.appendChild(block)
  } else {
    sheet.appendChild(block)
  }

  // 光标落到题目下一行的空行里，紧接着敲字就是在题下面写
  // 先抢回焦点再放光标：从检索框点过来时正文没有焦点，光标不显示
  sheet.focus()
  caretInEmptyLine(ensureLineAfter(block))
  watchImages(block)
  // 新题目可能把这一页顶爆，稍后按页重排；图片加载完还会各自再排一次
  schedulePaginate(120)
}

/* ---------- 文字格式（字号 / 行距 / 对齐 / 字形） ---------- */

/** 可选字号：px 为纸上的真实像素（14px 即五号），配合 --sheet-scale 跟着缩放走 */
const FONT_SIZES = [
  { key: 'three', px: 21.3, label: 'compose.size.three' },
  { key: 'four', px: 18.7, label: 'compose.size.four' },
  { key: 'smallFour', px: 16, label: 'compose.size.smallFour' },
  { key: 'five', px: 14, label: 'compose.size.five' },
  { key: 'smallFive', px: 12, label: 'compose.size.smallFive' }
]

/** 可选行距：直接写进段落的 line-height */
const LINE_HEIGHTS = [
  { key: '1.0', label: '1.0' },
  { key: '1.5', label: '1.5' },
  { key: '2.0', label: '2.0' }
]

/** 对齐方式：作用在段落上 */
const ALIGNMENTS = [
  { key: 'left', label: 'compose.options.alignLeft', path: 'M2.5 3.5h11M2.5 8h7M2.5 12.5h9' },
  { key: 'center', label: 'compose.options.alignCenter', path: 'M2.5 3.5h11M4.5 8h7M3.5 12.5h9' },
  { key: 'right', label: 'compose.options.alignRight', path: 'M2.5 3.5h11M6.5 8h7M4.5 12.5h9' }
]

/** 光标处的格式，用于高亮工具栏 */
const formatState = ref({ fontSize: '', lineHeight: '', align: '', bold: false, italic: false, underline: false })

/** 最近一次落在正文里的选区：点工具栏会短暂离开正文，用它兜住光标位置 */
let savedRange = null

/** 阻止按钮抢走焦点，保住正文里的光标与选区 */
function keepFocus(event) {
  event.preventDefault()
}

/** 当前选区（必须落在正文里才算数） */
function rangeInSheet() {
  const sheet = sheetRef.value
  const sel = window.getSelection()
  if (!sheet || !sel || !sel.rangeCount) return null
  const range = sel.getRangeAt(0)
  return sheet.contains(range.commonAncestorContainer) ? range : null
}

/** 实际用来改格式的选区：优先当前选区，其次最近一次正文选区（失效则丢弃） */
function activeRange() {
  const current = rangeInSheet()
  if (current) return current
  const sheet = sheetRef.value
  if (savedRange && sheet?.contains(savedRange.commonAncestorContainer)) return savedRange
  return null
}

const BLOCK_TAGS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'TD', 'TH', 'PRE'])
const BLOCK_SELECTOR = 'p,div,li,h1,h2,h3,h4,h5,h6,td,th,blockquote'

/** 从节点往上找最内层块级元素（段落级格式都作用在它上面） */
function blockOf(node) {
  const sheet = sheetRef.value
  let el = node && node.nodeType === 1 ? node : node?.parentElement || null
  while (el && el !== sheet) {
    if (BLOCK_TAGS.has(el.tagName)) return el
    el = el.parentElement
  }
  return null
}

/** 选区覆盖到的段落（只取最内层，避免父子重复设置） */
function blocksInRange(range) {
  const sheet = sheetRef.value
  if (!sheet) return []
  const out = []
  sheet.querySelectorAll(BLOCK_SELECTOR).forEach((el) => {
    if (!range.intersectsNode(el)) return
    const inner = Array.from(el.querySelectorAll(BLOCK_SELECTOR))
    if (inner.some((child) => range.intersectsNode(child))) return
    out.push(el)
  })
  return out
}

/** 字号：选中文字时只包一层 span，光标收起时改整个段落 */
function applyFontSize(size) {
  const range = activeRange()
  if (!range) return
  const value = `calc(${size.px}px * var(--sheet-scale))`
  if (range.collapsed) {
    const block = blockOf(range.startContainer)
    if (block) block.style.fontSize = value
  } else {
    const span = document.createElement('span')
    span.style.fontSize = value
    try {
      range.surroundContents(span)
    } catch {
      // 选区跨了多个段落时 surroundContents 会抛错，改成先取出内容再包 span
      const frag = range.extractContents()
      span.appendChild(frag)
      range.insertNode(span)
    }
    const next = document.createRange()
    next.selectNodeContents(span)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(next)
    savedRange = next.cloneRange()
  }
  formatState.value.fontSize = size.key
  schedulePaginate()
}

/** 行距：作用在选区覆盖的段落上 */
function applyLineHeight(item) {
  const range = activeRange()
  if (!range) return
  blocksInRange(range).forEach((block) => {
    block.style.lineHeight = item.key
  })
  formatState.value.lineHeight = item.key
  schedulePaginate()
}

/** 对齐：作用在选区覆盖的段落上 */
function applyAlign(direction) {
  const range = activeRange()
  if (!range) return
  blocksInRange(range).forEach((block) => {
    block.style.textAlign = direction
  })
  formatState.value.align = direction
}

/** 加粗 / 斜体 / 下划线：交给浏览器原生命令，局部选中的处理交给它 */
function execCmd(command) {
  const sheet = sheetRef.value
  if (!sheet) return
  if (!rangeInSheet() && savedRange) {
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(savedRange)
  }
  sheet.focus()
  document.execCommand(command)
  syncFormat()
}

/** 选区里第一个有文字的位置：选区从容器边界（如空的正文容器）开始时，也能落到真正的内容上 */
function firstTextInRange(range) {
  const root = range.commonAncestorContainer
  const start = root.nodeType === 3 ? root.parentNode : root
  if (!start) return null
  const walker = document.createTreeWalker(start, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    if (node.textContent.trim() && range.intersectsNode(node)) return node
    node = walker.nextNode()
  }
  return null
}

/** 光标处的字形状态（加粗/斜体/下划线）：看光标所在节点的祖先链，比 queryCommandState 可靠 */
function textDecorationAt(node) {
  const sheet = sheetRef.value
  const state = { bold: false, italic: false, underline: false }
  let el = node && node.nodeType === 1 ? node : node?.parentElement || null
  while (el && el !== sheet) {
    const style = window.getComputedStyle(el)
    if (el.tagName === 'B' || el.tagName === 'STRONG' || parseInt(style.fontWeight, 10) >= 600) state.bold = true
    if (el.tagName === 'I' || el.tagName === 'EM' || style.fontStyle === 'italic') state.italic = true
    if (/underline/.test(style.textDecorationLine || style.textDecoration)) state.underline = true
    el = el.parentElement
  }
  return state
}

/** 把光标处的格式回填到工具栏高亮 */
function syncFormat() {
  const range = activeRange()
  const state = { fontSize: '', lineHeight: '', align: '', bold: false, italic: false, underline: false }
  if (range) {
    // 光标（折叠选区）直接用光标节点；只有跨段选区从空容器边界开始时才需要往内容里找
    let probe = range.startContainer
    if (!range.collapsed && probe.nodeType !== 3) probe = firstTextInRange(range) || probe
    const deco = textDecorationAt(probe)
    state.bold = deco.bold
    state.italic = deco.italic
    state.underline = deco.underline
    const block = blockOf(probe)
    if (block) {
      const style = window.getComputedStyle(block)
      const fontSize = parseFloat(style.fontSize)
      const lineHeight = parseFloat(style.lineHeight)
      if (fontSize) state.fontSize = nearestFontSize(fontSize / (sheetScale.value || 1))
      if (fontSize && lineHeight) state.lineHeight = nearestLineHeight(lineHeight / fontSize)
      state.align =
        style.textAlign === 'center'
          ? 'center'
          : style.textAlign === 'right' || style.textAlign === 'end'
            ? 'right'
            : 'left'
    }
  }
  formatState.value = state
}

/** 找不到接近的预设值时不点亮任何芯片（比如纸张默认的 1.85 倍行距） */
function nearestFontSize(px) {
  let best = FONT_SIZES[0]
  FONT_SIZES.forEach((item) => {
    if (Math.abs(item.px - px) < Math.abs(best.px - px)) best = item
  })
  return Math.abs(best.px - px) <= 1 ? best.key : ''
}

function nearestLineHeight(ratio) {
  let best = LINE_HEIGHTS[0]
  LINE_HEIGHTS.forEach((item) => {
    if (Math.abs(Number(item.key) - ratio) < Math.abs(Number(best.key) - ratio)) best = item
  })
  return Math.abs(Number(best.key) - ratio) <= 0.08 ? best.key : ''
}

function onSelectionChange() {
  const range = rangeInSheet()
  if (range) savedRange = range.cloneRange()
  syncFormat()
}

/* ---------- 图片：选中 / 缩放 / 拖动 ---------- */

/** 当前选中的图片 */
let picked = null
/** 拖动中的状态 */
let dragging = null
/** 缩放中的状态 */
let resizing = null

function frameEl() {
  return sheetRef.value?.querySelector('.img-frame') || null
}

/** 取消选中：去掉描边框与图片标记 */
function clearPick() {
  frameEl()?.remove()
  if (picked) picked.classList.remove('is-picked')
  picked = null
}

/** 选中图片，并在它上面盖一层描边 + 右下角缩放柄 */
function pickImage(img) {
  frameEl()?.remove()
  if (picked && picked !== img) picked.classList.remove('is-picked')
  picked = img
  img.classList.add('is-picked')
  syncImageFrame()
}

/** 让描边框跟着图片走（缩放 / 拖动 / 换版面比例 / 分页换页后都要重算） */
function syncImageFrame() {
  const sheet = sheetRef.value
  if (!sheet) return
  if (!picked || !sheet.contains(picked)) {
    frameEl()?.remove()
    return
  }
  // 分页后纸张是最靠近图片的定位祖先，描边框要挂到图片所在的那张纸上
  const page = picked.closest('.pg-page') || sheet
  let frame = frameEl()
  if (!frame) {
    frame = document.createElement('div')
    frame.className = 'img-frame'
    frame.contentEditable = 'false'
    const handle = document.createElement('span')
    handle.className = 'img-handle'
    frame.appendChild(handle)
  }
  if (frame.parentElement !== page) page.appendChild(frame)
  const pageRect = page.getBoundingClientRect()
  const imgRect = picked.getBoundingClientRect()
  frame.style.left = `${imgRect.left - pageRect.left}px`
  frame.style.top = `${imgRect.top - pageRect.top}px`
  frame.style.width = `${imgRect.width}px`
  frame.style.height = `${imgRect.height}px`
}

/** 正文里的鼠标按下：缩放柄 → 缩放，图片 → 选中/拖动，其他 → 取消选中并交给浏览器放光标 */
function onSheetMouseDown(event) {
  const target = event.target
  if (target.classList?.contains('img-handle')) {
    event.preventDefault()
    startResize(event)
    return
  }
  if (target.tagName === 'IMG') {
    event.preventDefault()
    if (picked === target) startDrag(event)
    else pickImage(target)
    return
  }
  if (picked) clearPick()
  // 点在纸张的页边距或页与页之间的缝隙上：光标落到该页正文末尾，避免正文外出现游离文字
  const page = target.closest?.('.pg-page')
  if (page && !target.closest('.pg-body')) {
    event.preventDefault()
    const body = page.querySelector('.pg-body')
    if (body) caretAtEnd(body)
    return
  }
  if (!page && target.classList?.contains('sheet')) event.preventDefault()
}

/** 把光标落到容器内容的末尾 */
function caretAtEnd(container) {
  const range = document.createRange()
  range.selectNodeContents(container)
  range.collapse(false)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
  savedRange = range.cloneRange()
}

/** 图片所在的包含块内容宽度：宽度按百分比存，换版面时图片跟着纸张等比变 */
function containerWidthOf(img) {
  const parent = img.parentElement
  if (!parent) return 0
  const style = window.getComputedStyle(parent)
  return parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
}

function startResize(event) {
  const img = picked
  if (!img) return
  resizing = {
    img,
    startX: event.clientX,
    startWidth: img.getBoundingClientRect().width,
    containerWidth: containerWidthOf(img) || 1
  }
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeUp)
}

function onResizeMove(event) {
  if (!resizing) return
  const { img, startX, startWidth, containerWidth } = resizing
  // 最大不超过正文栏宽，免得存下一个 >100% 的宽度换版面时突然撑破纸张
  const width = Math.max(24, Math.min(containerWidth, startWidth + (event.clientX - startX)))
  img.style.width = `${(width / containerWidth) * 100}%`
  img.style.height = 'auto'
  syncImageFrame()
}

function onResizeUp() {
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeUp)
  resizing = null
  // 图片高度变了，这一页可能装不下
  schedulePaginate()
}

function startDrag(event) {
  if (!picked) return
  dragging = { img: picked, x: event.clientX, y: event.clientY, moved: false }
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragUp)
}

function onDragMove(event) {
  if (!dragging) return
  if (!dragging.moved && Math.hypot(event.clientX - dragging.x, event.clientY - dragging.y) < 4) return
  if (!dragging.moved) {
    dragging.moved = true
    // 拖动时先撤掉描边框，免得它挡住落点的位置判定
    frameEl()?.remove()
  }
  dragging.img.style.opacity = '0.45'
}

function onDragUp(event) {
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragUp)
  const state = dragging
  dragging = null
  if (!state) return
  state.img.style.opacity = ''
  if (!state.moved) {
    syncImageFrame()
    return
  }
  // 松手位置就是新的落点：把图片移过去
  const range = caretRangeAt(event.clientX, event.clientY)
  const sheet = sheetRef.value
  if (!range || !sheet?.contains(range.startContainer) || range.startContainer === state.img) {
    syncImageFrame()
    return
  }
  range.insertNode(state.img)
  const after = document.createRange()
  after.setStartAfter(state.img)
  after.collapse(true)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(after)
  syncImageFrame()
  schedulePaginate()
}

/** 取屏幕上某点对应的文本位置（拖放图片时用来定位落点） */
function caretRangeAt(x, y) {
  if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y)
  if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(x, y)
    if (!pos) return null
    const range = document.createRange()
    range.setStart(pos.offsetNode, pos.offset)
    range.collapse(true)
    return range
  }
  return null
}

/** 卸载或中途打断时清掉挂在 document 上的拖拽监听 */
function stopPointer() {
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeUp)
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragUp)
  dragging = null
  resizing = null
}

/* ---------- 正文容器 ---------- */

/** 判断节点是不是「结构容器」：正文 / 整张纸 / 纸张本体 */
function frameKind(el) {
  if (!el || el.nodeType !== 1) return null
  if (el === sheetRef.value) return 'sheet'
  if (el.classList.contains('pg-page')) return 'pg-page'
  if (el.classList.contains('pg-body')) return 'pg-body'
  return null
}

/* ---------- 退格：保住纸张结构，按段落/页面合并 ---------- */

const ATOMIC_SELECTOR = 'img, svg, table, math, .katex, .katex-display, video, canvas, iframe'
/** 可以逐段合并的块：列表、表格这类结构整体交给浏览器处理，不参与拼接 */
const MERGE_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE'])

function setCaret(range) {
  range.collapse(true)
  const sel = window.getSelection()
  if (!sel) return
  sel.removeAllRanges()
  sel.addRange(range)
  savedRange = range.cloneRange()
  const at = range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer
  at?.scrollIntoView?.({ block: 'nearest' })
}

/** 光标所在的最外层内容块（q-block 或正文容器的直属子节点） */
function caretBlockOf(node) {
  let el = node && node.nodeType === 1 ? node : node?.parentElement || null
  while (el && el !== sheetRef.value) {
    const parent = el.parentElement
    if (!parent) return null
    if (parent.classList.contains('q-block') || parent.classList.contains('pg-body')) return el
    el = parent
  }
  return null
}

/** 光标所在的正文容器 */
function bodyOfCaret(node) {
  let el = node && node.nodeType === 1 ? node : node?.parentElement || null
  while (el && el !== sheetRef.value) {
    if (el.classList.contains('pg-body')) return el
    el = el.parentElement
  }
  return null
}

/** 光标是否停在这个块的正文开头（前面没有文字、图片或公式） */
function caretAtBlockStart(block, range) {
  if (!block || block.nodeType !== 1) return false
  const probe = document.createRange()
  probe.selectNodeContents(block)
  try {
    probe.setEnd(range.startContainer, range.startOffset)
  } catch {
    return false
  }
  if (probe.toString().trim()) return false
  return !probe.cloneContents().querySelector(ATOMIC_SELECTOR)
}

/** 按正文顺序收集所有内容块，用来找光标块的上一块（可能在前一页） */
function orderedBlocks() {
  const out = []
  pageEls().forEach((page) => {
    const body = page.querySelector(':scope > .pg-body')
    if (!body) return
    Array.from(body.childNodes).forEach((node) => {
      if (node.nodeType === 3) {
        if (node.textContent.trim()) out.push(node)
        return
      }
      if (node.nodeType !== 1 || isFrameEl(node)) return
      if (node.classList.contains('q-block')) {
        Array.from(node.childNodes).forEach((child) => {
          if (child.nodeType === 3) {
            if (child.textContent.trim()) out.push(child)
          } else if (child.nodeType === 1 && !isFrameEl(child)) {
            out.push(child)
          }
        })
        return
      }
      out.push(node)
    })
  })
  return out
}

/** 光标块内、光标之前有没有换行 <br>（段内软换行或历史遗留的空行） */
function breakBeforeCaret(block, range) {
  const probe = document.createRange()
  probe.selectNodeContents(block)
  try {
    probe.setEnd(range.startContainer, range.startOffset)
  } catch {
    return false
  }
  return Boolean(probe.cloneContents().querySelector('br'))
}

/** 空行里只有 <br> 占位：清掉后合并过来的文字才会落在这一行，而不是掉到下一行 */
function clearBlankBlock(block) {
  Array.from(block.childNodes).forEach((node) => {
    if (node.nodeType === 3 || (node.nodeType === 1 && node.tagName === 'BR')) node.remove()
  })
}

/** 光标放到容器第 index 个子节点之前：优先贴住相邻的文字节点，落在元素边界上光标会乱跳 */
function caretAtPoint(container, index) {
  const range = document.createRange()
  const after = container.childNodes[index] || null
  const before = index > 0 ? container.childNodes[index - 1] : null
  if (after && after.nodeType === 3) range.setStart(after, 0)
  else if (before && before.nodeType === 3) range.setStart(before, before.data.length)
  else range.setStart(container, Math.min(index, container.childNodes.length))
  setCaret(range)
}

/** 空块：没有文字，也没有图片/公式 */
function isBlankBlock(block) {
  if (!block || block.nodeType !== 1) return false
  if (block.textContent.trim()) return false
  return !block.querySelector(ATOMIC_SELECTOR)
}

/** 正文里一点内容都没有（连空段落都没有）：这时退格会把整张纸一起删掉 */
function isVacantBody(body) {
  if (!body || body.nodeType !== 1) return false
  if (body.textContent.trim()) return false
  if (body.querySelector(ATOMIC_SELECTOR)) return false
  return !body.querySelector('*')
}

/** 光标前紧挨着的公式：浏览器会把光标塞进 KaTeX 的视觉层，退格会把公式删成残缺 */
function katexBeforeCaret(range) {
  const node = range.startContainer
  const offset = range.startOffset
  let before = null
  if (node.nodeType === 3) {
    // 光标不在文字开头时交给浏览器逐字删
    if (offset > 0) return null
    before = node.previousSibling
  } else {
    before = node.childNodes[offset - 1] || null
  }
  while (before && before.nodeType === 3 && !before.data) before = before.previousSibling
  if (!before || before.nodeType !== 1) return null
  return before.closest?.('.katex, .katex-display') || null
}

/**
 * 退格：
 * 1) 正文被清空时拦住浏览器，避免整张纸被删掉；
 * 2) 光标在段落开头时并到上一段（可以跨页），光标落在段落之间而不是公式内部；
 * 3) 光标紧贴公式时整体删掉公式，避免 KaTeX 视觉层被删成残缺；
 * 4) 其余情况交给浏览器。
 */
function handleBackspace(event) {
  const range = rangeInSheet()
  if (!range || !range.collapsed) return false
  const body = bodyOfCaret(range.startContainer)
  if (!body) return false

  const katex = katexBeforeCaret(range)
  if (katex) {
    event.preventDefault()
    const parent = katex.parentNode
    const at = Array.prototype.indexOf.call(parent.childNodes, katex)
    const caret = document.createRange()
    katex.remove()
    caret.setStart(parent, Math.min(at, parent.childNodes.length))
    setCaret(caret)
    schedulePaginate(0)
    return true
  }

  if (isVacantBody(body)) {
    event.preventDefault()
    const pages = pageEls()
    const index = pages.indexOf(body.closest('.pg-page'))
    const prevBody = index > 0 ? pages[index - 1].querySelector(':scope > .pg-body') : null
    if (prevBody) {
      caretAtEnd(prevBody)
    } else {
      const caret = document.createRange()
      caret.setStart(body, 0)
      setCaret(caret)
    }
    return true
  }

  const block = caretBlockOf(range.startContainer)
  if (!block || !MERGE_TAGS.has(block.tagName)) return false
  if (!caretAtBlockStart(block, range)) return false
  // 光标前面是本段内的换行：退格只该吃掉这个换行（逐行上移），
  // 整段合并会让光标一下跳到前面好几行，交给浏览器删 <br> 即可
  if (breakBeforeCaret(block, range)) return false
  const blocks = orderedBlocks()
  const index = blocks.indexOf(block)
  if (index <= 0) {
    // 全文最开头：没有上一段可并，拦住浏览器删除段落/纸张结构
    event.preventDefault()
    return true
  }
  const prev = blocks[index - 1]
  if (!prev || prev.nodeType !== 1 || !MERGE_TAGS.has(prev.tagName)) return false

  event.preventDefault()
  if (isBlankBlock(block)) {
    block.remove()
    if (isBlankBlock(prev)) caretAtPoint(prev, 0)
    else caretAtEnd(prev)
  } else {
    // 上一段是空行：先清掉占位的 <br>，否则合并过来的文字会落到空行下面
    if (isBlankBlock(prev)) clearBlankBlock(prev)
    const at = prev.childNodes.length
    while (block.firstChild) prev.appendChild(block.firstChild)
    block.remove()
    caretAtPoint(prev, at)
  }
  schedulePaginate(0)
  return true
}

/**
 * 光标直接落在正文容器上时按回车，浏览器会连容器属性一起克隆出第二个同样的容器，
 * 所以这里自己造一个段落来换行，结构容器始终只有一个。
 */
function onSheetKeydown(event) {
  if (event.isComposing) return
  if (event.key === 'Backspace' && !event.ctrlKey && !event.altKey && !event.metaKey) {
    if (handleBackspace(event)) return
  }
  if (event.key !== 'Enter' || event.shiftKey) return
  const range = rangeInSheet()
  if (!range) return
  const owner = blockOf(range.startContainer)
  const kind = frameKind(owner)
  if (!kind) return
  // 光标落在整张纸或纸张容器的空白处：拦住回车，免得浏览器把整页/整个容器克隆一份
  if (kind === 'sheet' || kind === 'pg-page') {
    event.preventDefault()
    return
  }

  const container = range.startContainer
  if (container.nodeType === 3 && container.parentElement === owner) {
    // 把这段文字整体裹进一个真正的段落，光标位置完全不动，
    // 回车交给浏览器去拆这个段落 —— 只要它拆的不是正文容器本身就不会被复制
    const paragraph = document.createElement('p')
    owner.insertBefore(paragraph, container)
    paragraph.appendChild(container)
    return
  }

  // 兜底：光标落在容器与子节点之间这类没有段落包裹的位置，就在光标处插一个空行并拦下回车
  // （注意不能把容器里已有的内容搬进新段落，否则整页内容会被裹成一个巨型段落，分页就再也切不开）
  event.preventDefault()
  const paragraph = document.createElement('p')
  paragraph.appendChild(document.createElement('br'))
  const at = container === owner ? range.startOffset : owner.childNodes.length
  owner.insertBefore(paragraph, owner.childNodes[at] || null)
  const caret = document.createRange()
  caret.setStart(paragraph, 0)
  caret.collapse(true)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(caret)
}

/* ---------- 分页（内容超出一页时自动翻到下一张纸） ---------- */

/** 造一张纸：只有正文容器 */
function createPage() {
  const page = document.createElement('div')
  page.className = 'pg-page'
  const body = document.createElement('div')
  body.className = 'pg-body'
  body.dataset.ph = t('compose.doc.placeholder')
  page.appendChild(body)
  return page
}

/** 所有纸张，按文档顺序 */
function pageEls() {
  const sheet = sheetRef.value
  return sheet ? Array.from(sheet.querySelectorAll('.pg-page')) : []
}

/** 页码写进 data-page，由 CSS 的 ::after 渲染到纸张左侧 */
function labelPages() {
  pageEls().forEach((page, index) => {
    page.dataset.page = t('compose.doc.page', { n: index + 1 })
  })
}

/**
 * 把结构规整回「一张纸 = 一个正文容器」：
 * 合并被浏览器克隆出来的重复正文容器、把散落在纸张上的内容收进正文。
 * 只在结构真的不对时才动 DOM（避免不必要的选区丢失）。
 */
function normalizeStructure() {
  const pages = pageEls()
  pages.forEach((page) => {
    // 老试卷里遗留的页眉页脚：直接丢掉，不要把里面的文字并进正文
    page.querySelectorAll(':scope > .pg-head, :scope > .pg-foot').forEach((el) => el.remove())
    let body = page.querySelector(':scope > .pg-body')
    if (!body) {
      body = document.createElement('div')
      body.className = 'pg-body'
      body.dataset.ph = t('compose.doc.placeholder')
      page.appendChild(body)
    }
    page.querySelectorAll(':scope > .pg-body').forEach((extra) => {
      if (extra === body) return
      while (extra.firstChild) body.appendChild(extra.firstChild)
      extra.remove()
    })
    Array.from(page.children).forEach((child) => {
      if (child === body) return
      body.appendChild(child)
    })
  })
}

/** 保证纸张是「一张纸 = 正文」，老试卷的纯正文会被收拢进第一页正文 */
function ensurePageFrame() {
  const sheet = sheetRef.value
  if (!sheet) return
  if (!sheet.querySelector('.pg-page')) {
    // 老数据：纸张下直接是内容（或旧的 .pg-head/.pg-body/.pg-foot 结构），
    // 正文整体收进新首页，遗留的页眉页脚丢弃
    const oldBody = sheet.querySelector(':scope > .pg-body')
    sheet.querySelectorAll(':scope > .pg-head, :scope > .pg-foot').forEach((el) => el.remove())
    const page = createPage()
    const body = page.querySelector(':scope > .pg-body')
    if (oldBody) {
      while (oldBody.firstChild) body.appendChild(oldBody.firstChild)
      oldBody.remove()
    }
    Array.from(sheet.children).forEach((node) => {
      if (node.classList.contains('img-frame')) {
        node.remove()
        return
      }
      body.appendChild(node)
    })
    sheet.appendChild(page)
  }
  normalizeStructure()
  labelPages()
}

/** 只用于编辑的临时元素：图片描边框 */
function isFrameEl(el) {
  return el.classList.contains('img-frame')
}

/** 同一个题目块被换页后要接着排：新造的容器记回源容器，才能认出是同一块 */
const hostSource = new WeakMap()

/** 可以切成两截的纯文字容器；表格、列表项等特殊结构整体换页 */
const SPLIT_TAGS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE'])

/** 行内原子元素：公式 / 图片 / 表格。拆分点只能落在它们两侧，切进去会把内容切坏 */
function isAtomicInline(el) {
  const tag = el.tagName
  if (tag === 'IMG' || tag === 'SVG' || tag === 'TABLE' || tag === 'MATH' || tag === 'VIDEO' || tag === 'CANVAS' || tag === 'IFRAME') return true
  return el.classList.contains('katex') || el.classList.contains('katex-display')
}

/**
 * 正文里的排版单元（按文档顺序）：能独立换页的最小块级元素。
 * - q-block 的每个子元素各算一个单元 —— 题目里的文字段落可以续排当前页，只有放不下的图片才换页
 * - 其余正文直接子元素自身算一个单元
 * unit.host 记录所属的题目块，跨页时用同源容器接着排
 */
function collectUnits(pages) {
  const units = []
  pages.forEach((page) => {
    const body = page.querySelector(':scope > .pg-body')
    if (!body) return
    Array.from(body.childNodes).forEach((node) => {
      if (node.nodeType === 3) {
        // 正文里的裸文字包进段落，避免游离文字不参与换页（空白节点无意义，直接丢）
        if (!node.textContent.trim()) {
          node.remove()
          return
        }
        const p = document.createElement('p')
        body.replaceChild(p, node)
        p.appendChild(node)
        units.push({ el: p, host: null })
        return
      }
      if (node.nodeType !== 1) return
      if (isFrameEl(node)) {
        node.remove()
        return
      }
      if (node.classList.contains('q-block')) {
        const source = hostSource.get(node) || node
        const children = Array.from(node.childNodes)
        // 容器每页重建，避免换页后残留空壳
        node.remove()
        children.forEach((child) => {
          if (child.nodeType === 3) {
            if (!child.textContent.trim()) return
            const p = document.createElement('p')
            p.appendChild(child)
            units.push({ el: p, host: source })
            return
          }
          if (child.nodeType !== 1) return
          // 分页时钉光标的零宽标记也当作单元跟着排，否则会被搬空容器一起丢掉
          units.push({ el: child, host: source })
        })
        return
      }
      units.push({ el: node, host: null })
    })
  })
  return units
}

/** 本页上代表某个题目块的容器：同一块第一次用到时按需克隆一个挂到该页正文里 */
function containerFor(source, body, map) {
  if (!source) return body
  let box = map.get(source)
  if (!box) {
    box = source.cloneNode(false)
    hostSource.set(box, source)
    map.set(source, box)
    body.appendChild(box)
  }
  return box
}

/** 块内的候选拆分点（文档顺序）：文字逐字给点，原子元素只在其前后给点 */
function splitPoints(block) {
  const points = []
  const walk = (parent) => {
    Array.from(parent.childNodes).forEach((child, index) => {
      if (child.nodeType === 3) {
        for (let i = 0; i <= child.data.length; i += 1) points.push({ node: child, offset: i })
        return
      }
      if (child.nodeType !== 1) return
      if (isAtomicInline(child) || child.tagName === 'BR') {
        points.push({ node: parent, offset: index })
        points.push({ node: parent, offset: index + 1 })
        return
      }
      walk(child)
    })
  }
  walk(block)
  return points
}

/** 从块首到该点的内容是否都还在 limitY 以内（随点后移单调变假，可以二分） */
function withinLimit(block, point, limitY) {
  const range = document.createRange()
  try {
    range.setStart(block, 0)
    range.setEnd(point.node, point.offset)
  } catch {
    return false
  }
  let bottom = -Infinity
  for (const rect of range.getClientRects()) {
    if (rect.height <= 0 && rect.width <= 0) continue
    bottom = Math.max(bottom, rect.bottom)
  }
  return bottom <= limitY + 0.5
}

/** 片段里是否有看得见的内容（文字或图片/公式/表格） */
function hasVisible(frag) {
  if (frag.textContent && frag.textContent.replace(/[\s\u200b]/g, '')) return true
  return Boolean(frag.querySelector('img, svg, table, math, video, canvas, .katex'))
}

/**
 * 把块内「装得下的部分」留在当前页，装不下的部分切给下一页 —— 行级拆分，与 Word 一致。
 * 切点只落在行边界上，且不会切进公式/图片；前半段为空（一行都放不下）时整体换页。
 * @returns {boolean} 是否真的切开
 */
function splitBlock(el, limitY) {
  if (!SPLIT_TAGS.has(el.tagName) || el.classList.contains('q-block')) return false
  const points = splitPoints(el)
  if (points.length < 2) return false
  let lo = 0
  let hi = points.length - 1
  let best = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (withinLimit(el, points[mid], limitY)) {
      best = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  // 首尾都说明「一行都放不下」或「其实全放得下」，都不该切
  if (best <= 0 || best >= points.length - 1) return false
  const point = points[best]
  const range = document.createRange()
  range.setStart(el, 0)
  range.setEnd(point.node, point.offset)
  if (!hasVisible(range.cloneContents())) return false
  const head = el.cloneNode(false)
  head.appendChild(range.extractContents())
  el.parentNode.insertBefore(head, el)
  // 拆分处不留段间距：两部分回到同一页时行距连续，看不出被切过
  head.style.marginTop = '0'
  head.style.marginBottom = '0'
  el.style.marginTop = '0'
  el.style.marginBottom = '0'
  return true
}

/** 非闭合选区（跨块选择）没法用零宽标记钉住，退回节点引用记录 */
function captureSelection() {
  const sheet = sheetRef.value
  const sel = window.getSelection()
  if (!sheet || !sel || !sel.rangeCount) return null
  const range = sel.getRangeAt(0)
  if (range.collapsed) return null
  const node = range.startContainer
  if (!sheet.contains(node)) return null
  if (node.parentElement?.closest?.('.img-frame')) return null
  return {
    start: range.startContainer,
    startOffset: range.startOffset,
    end: range.endContainer,
    endOffset: range.endOffset,
    page: node.parentElement?.closest?.('.pg-page') || null
  }
}

function clampOffset(node, offset) {
  const max = node.nodeType === 3 ? node.data.length : node.childNodes.length
  return Math.max(0, Math.min(offset, max))
}

/** 还原选区；若选区被搬到了另一张纸上，把那张纸滚进视野 */
function restoreSelection(state) {
  if (!state) return
  const sheet = sheetRef.value
  if (!sheet || !sheet.contains(state.start) || !sheet.contains(state.end)) return
  const range = document.createRange()
  try {
    range.setStart(state.start, clampOffset(state.start, state.startOffset))
    range.setEnd(state.end, clampOffset(state.end, state.endOffset))
  } catch {
    return
  }
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
  savedRange = range.cloneRange()
  // 分页时把正文滚动拉回了顶部，这里按选区起点再滚一次，保证选区可见
  const at = state.start.nodeType === 3 ? state.start.parentElement : state.start
  at?.scrollIntoView?.({ block: 'nearest' })
}

/**
 * 光标是个闭合点，分页会搬动节点、还会把段落切成两截，用节点引用记会错位。
 * 所以先在光标处插一个零宽的标记，排完整页再按标记把光标收回来。
 */
function plantCaretMark() {
  const sheet = sheetRef.value
  const sel = window.getSelection()
  if (!sheet || !sel || !sel.rangeCount) return null
  const range = sel.getRangeAt(0)
  if (!range.collapsed) return null
  const node = range.startContainer
  if (!sheet.contains(node)) return null
  if (node.parentElement?.closest?.('.img-frame')) return null
  const mark = document.createElement('span')
  mark.className = 'caret-mark'
  const offset = range.startOffset
  if (node.nodeType === 3) {
    if (offset >= node.data.length) node.parentNode.insertBefore(mark, node.nextSibling)
    else node.parentNode.insertBefore(mark, node.splitText(offset))
  } else {
    node.insertBefore(mark, node.childNodes[offset] || null)
  }
  return { mark, page: mark.closest('.pg-page') }
}

/** 按标记收回光标；标记被搬到另一张纸上时顺带把那张纸滚进视野 */
function pickupCaretMark(state) {
  const mark = state?.mark
  if (!mark?.isConnected) return
  const parent = mark.parentNode
  const index = Array.prototype.indexOf.call(parent.childNodes, mark)
  const after = parent.childNodes[index + 1] || null
  const before = parent.childNodes[index - 1] || null
  mark.remove()
  const range = document.createRange()
  // 挨着文字节点落光标，后续 execCommand 才不会在段落边界上出怪
  if (after && after.nodeType === 3) range.setStart(after, 0)
  else if (before && before.nodeType === 3) range.setStart(before, before.data.length)
  else range.setStart(parent, Math.min(index, parent.childNodes.length))
  range.collapse(true)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
  savedRange = range.cloneRange()
  // 分页时把正文滚动拉回了顶部，这里按光标再滚一次：光标必须落回视野
  const at = range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer
  at?.scrollIntoView?.({ block: 'nearest' })
}

/**
 * 按页容量把正文分摊到各张纸上 —— 行级换页，与 Word 的行为一致：
 * 文字续排当前页，只有放不下的整行、图片、公式才落到下一页；
 * 因此不会出现「一道题整体被顶下去、上一页空一大片」。
 * 每张纸都是「正文撑满整页」，各页容量一致。
 */
function paginate() {
  const sheet = sheetRef.value
  if (!sheet) return
  normalizeStructure()
  const pages = pageEls()
  if (!pages.length) return

  // 光标（选区）标记必须在「拆容器之前」钉好：collectUnits 会把 q-block 摘下来重挂，
  // 摘的那一瞬间选区所在节点是脱离文档的，这时再钉标记会因为「节点不在文档里」而放弃，
  // 光标随即掉到页首。先钉好，标记会跟着段落一起被摘下去、再挂进新容器。
  const selection = captureSelection()
  const mark = selection ? null : plantCaretMark()

  const units = collectUnits(pages)
  if (!units.length) {
    // 正文被清空：只留第一页
    if (mark) pickupCaretMark(mark)
    if (pages.length > 1) pages.slice(1).forEach((page) => page.remove())
    labelPages()
    return
  }

  const bodies = pages.map((page) => page.querySelector(':scope > .pg-body'))
  const maps = pages.map(() => new Map())
  let pageIndex = 0
  let lastUsed = 0
  let start = 0
  let guard = 0

  const ensurePage = (index) => {
    while (pages.length <= index) {
      const page = createPage()
      sheet.appendChild(page)
      pages.push(page)
      bodies.push(page.querySelector(':scope > .pg-body'))
      maps.push(new Map())
    }
  }

  try {
    while (start < units.length && guard < 200) {
      guard += 1
      ensurePage(pageIndex)
      const body = bodies[pageIndex]
      const map = maps[pageIndex]
      // 光标打字贴到页底时，浏览器会把 overflow:hidden 的正文容器滚起来让光标可见；
      // 滚动会整体平移容器里的 rect，量出来的底边全落在页内，分页就会误判成「都放得下」。
      // 所以量之前先把滚动拉回顶部（分页跑完还会按光标把该页滚回视野）。
      body.scrollTop = 0

      // 1) 先把还没落页的单元全挂到本页（只写不读，避免每个单元都触发一次重排）
      for (let i = start; i < units.length; i += 1) {
        containerFor(units[i].host, body, map).appendChild(units[i].el)
      }
      // 2) 再一次性读数：本页正文底边 + 每个单元的底边
      const limitY = body.getBoundingClientRect().bottom
      const bottoms = []
      for (let i = start; i < units.length; i += 1) bottoms.push(units[i].el.getBoundingClientRect().bottom)
      let cut = -1
      for (let k = 0; k < bottoms.length; k += 1) {
        // 钉光标的零宽标记不算越界，否则光标会被当成内容挪走甚至丢掉
        if (units[start + k].el.classList.contains('caret-mark')) continue
        if (bottoms[k] > limitY + 0.5) {
          cut = k
          break
        }
      }
      if (cut < 0) {
        // 剩下的内容本页全放得下
        lastUsed = pageIndex
        break
      }

      const index = start + cut
      const unit = units[index]
      if (splitBlock(unit.el, limitY)) {
        // 前半段留在本页，后半段（unit.el 本体）挪到下一页接着排
        lastUsed = pageIndex
        unit.el.remove()
        start = index
      } else if (cut === 0) {
        // 本页还空着仍放不下（超长图片、超长表格）：让它在本页向上溢出，后面的内容从下一页接着排
        lastUsed = pageIndex
        start = index + 1
      } else {
        // 本页已排了能排下的部分，这一单元（图片/表格等不可拆的整块）挪到下一页
        lastUsed = pageIndex
        start = index
      }

      // 离开本页前清掉被搬空、只剩外壳的题目容器
      map.forEach((box, source) => {
        if (box.childNodes.length) return
        box.remove()
        map.delete(source)
      })
      pageIndex += 1
    }

    // 回收没用到的尾页
    while (pages.length > lastUsed + 1) {
      const page = pages.pop()
      bodies.pop()
      maps.pop()
      page.remove()
    }
    labelPages()
    syncImageFrame()
  } finally {
    if (mark) pickupCaretMark(mark)
    else restoreSelection(selection)
  }
}

let paginateTimer = null

/** 重排有延迟：每次敲字都重排会打断输入，也会让光标乱跳 */
function schedulePaginate(delay = 220) {
  clearTimeout(paginateTimer)
  paginateTimer = setTimeout(() => {
    paginateTimer = null
    paginate()
  }, delay)
}

/** 输入内容变化后重排；中文输入法组合期间不能动 DOM，交给 compositionend 收尾 */
function onSheetInput(event) {
  if (event.isComposing) return
  // 打字贴到页底时正文先溢出、被裁掉，重排越快越快看到续排结果
  schedulePaginate(90)
}

/* ---------- 画布尺寸 ---------- */

/**
 * 换算纸张的屏幕尺寸：
 * - 适配档：按 A4 为基准算出比例，其他版面沿用同一比例（A4 恰好整页可见，A3 更大需滚动、B5 更小）
 * - 百分比档：直接取真实尺寸（100% 即 1mm = PX_PER_MM 像素，14px 就是真正的五号字）
 */
function fitSheet() {
  const canvas = canvasRef.value
  if (!canvas) return
  // 横向再扣掉左侧页码槽，保证适配档下「纸张 + 页码」整好落在画布内
  const availW = Math.max(240, canvas.clientWidth - CANVAS_PADDING * 2 - SCROLLBAR_GUTTER - LABEL_GUTTER)
  const availH = Math.max(240, canvas.clientHeight - CANVAS_PADDING * 2)
  const scale =
    zoomKey.value === 'fit'
      ? Math.min(availW / (BASE_SIZE.w * PX_PER_MM), availH / (BASE_SIZE.h * PX_PER_MM))
      : Number(zoomKey.value)
  sheetScale.value = scale
  const size = currentSize.value
  // 每张纸固定为一整页的真实尺寸，超出部分交给分页
  sheetSize.value = {
    width: Math.round(size.w * PX_PER_MM * scale),
    height: Math.round(size.h * PX_PER_MM * scale)
  }
  // 换版面/缩放后，图片描边框与工具栏高亮都跟着重算；页容量变了则要重排
  syncImageFrame()
  syncFormat()
  schedulePaginate()
}

let observer = null

onMounted(async () => {
  fitSheet()
  if (canvasRef.value && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(fitSheet)
    observer.observe(canvasRef.value)
  }
  window.addEventListener('keydown', onSpaceDown)
  window.addEventListener('keyup', onSpaceUp)
  window.addEventListener('resize', syncImageFrame)
  document.addEventListener('selectionchange', onSelectionChange)
  await load()
  // 等纸张尺寸落到 DOM 上再建页并分页，否则量出来的页容量是错的
  await nextTick()
  ensurePageFrame()
  // 老试卷里可能带还没加载完的图，同样要等图出尺寸后再定版
  watchImages(sheetRef.value)
  paginate()
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
  observer = null
  window.removeEventListener('keydown', onSpaceDown)
  window.removeEventListener('keyup', onSpaceUp)
  window.removeEventListener('resize', syncImageFrame)
  document.removeEventListener('selectionchange', onSelectionChange)
  clearPick()
  stopPointer()
  clearTimeout(paginateTimer)
  clearTimeout(spaceTimer)
  clearInterval(recTimer)
  recorder?.stop(true)
})

// 换版面或换显示比例只需重算纸张尺寸，正文不动
watch([sizeKey, zoomKey], fitSheet)
</script>

<style scoped>
/* 网格工作面：三栏（搜索 / 排版 / 选项）浮在同一块点阵背景上 */
.editor {
  position: relative;
  display: flex;
  gap: 14px;
  flex: 1;
  min-height: 0;
  padding: 14px;
  border-radius: var(--radius-lg);
  background-color: var(--c-canvas);
  background-image: radial-gradient(circle, rgba(20, 20, 19, 0.11) 1px, transparent 1px);
  background-size: 22px 22px;
  overflow: hidden;
}

html.dark .editor {
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.07) 1px, transparent 1px);
}

/* ---------- 顶栏返回按钮（Teleport 到 App 顶栏左侧插槽） ---------- */
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 14px 0 10px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-surface);
  color: var(--c-dark);
  font-family: var(--font-heading);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: var(--shadow-xs);
  transition: border-color 0.2s var(--ease-soft), background 0.2s var(--ease-soft),
    color 0.2s var(--ease-soft), transform 0.15s var(--ease-out);
}

.back-btn:hover {
  border-color: rgba(217, 119, 87, 0.55);
  background: rgba(217, 119, 87, 0.08);
  color: var(--c-orange);
}

.back-btn:active {
  transform: scale(0.97);
}

/* ---------- 左：搜索区 ---------- */
.search-card {
  display: flex;
  flex-direction: column;
  flex: 0 0 472px;
  /* 高度与排版区对齐：三栏同高，输入条始终贴在卡片底部 */
  padding: 14px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  box-shadow: var(--shadow-sm), var(--inset-top);
}

.block-head {
  display: flex;
  align-items: center;
  min-height: 20px;
  margin-bottom: 10px;
}

.block-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* 主操作按钮：品牌橙实底胶囊，与站内其他入口（导入页「开始识别处理」）同一套观感 */
.btn-accent {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  border-radius: 999px;
  background: var(--c-orange);
  color: var(--c-on-accent);
  font-family: var(--font-heading);
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(217, 119, 87, 0.3), 0 6px 14px -8px rgba(217, 119, 87, 0.7);
  transition: background 0.2s var(--ease-soft), transform 0.2s var(--ease-out),
    box-shadow 0.2s var(--ease-soft);
}

.btn-accent:hover:not(:disabled) {
  background: var(--c-orange-hover);
  transform: translateY(-1px);
  box-shadow: 0 1px 3px rgba(217, 119, 87, 0.32), 0 10px 20px -10px rgba(217, 119, 87, 0.75);
}

.btn-accent:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(217, 119, 87, 0.3);
}

.btn-accent:disabled {
  opacity: 0.6;
  cursor: default;
  box-shadow: none;
}

.search-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.body-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
  padding: 28px 8px;
  font-family: var(--font-body);
  font-size: 12.5px;
  line-height: 1.6;
  text-align: center;
  color: var(--c-mid-gray);
}

.hits {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0 2px 0 0;
  list-style: none;
}

.hit {
  position: relative;
  padding: 10px 12px 32px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-subtle);
  transition: border-color 0.2s var(--ease-soft), background 0.2s var(--ease-soft);
}

.hit:hover {
  border-color: rgba(217, 119, 87, 0.4);
  background: rgba(217, 119, 87, 0.05);
}

/* 题干完整显示，不做行数截断；超高由 .search-body 滚动承载 */
.hit-text {
  font-family: var(--font-body);
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--c-dark);
  overflow-wrap: anywhere;
}

.hit-text :deep(p) {
  margin: 0;
}

.hit-text :deep(img) {
  max-width: 100%;
}

.hit-add {
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 10px;
  border: 1px solid rgba(217, 119, 87, 0.32);
  border-radius: 999px;
  background: var(--c-surface);
  color: var(--c-orange);
  font-family: var(--font-heading);
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.18s var(--ease-soft), border-color 0.18s var(--ease-soft),
    color 0.18s var(--ease-soft);
}

.hit-add:hover {
  border-color: var(--c-orange);
  background: var(--c-orange);
  color: var(--c-on-accent);
}

.search-foot {
  display: flex;
  justify-content: center;
  flex: none;
  padding-top: 10px;
  border-top: 1px solid var(--c-border);
}

.search-foot :deep(.el-pagination.is-background .el-pager li.is-active) {
  background-color: var(--c-orange);
  color: var(--c-on-accent);
}

/* ---------- 输入条（移植自搜索题库页：波形 / 麦克风 / 发送） ---------- */
.composer {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  margin-top: 10px;
  padding: 5px 5px 5px 14px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-subtle);
  transition: border-color 0.2s var(--ease-soft), background 0.2s var(--ease-soft);
}

/* 录音中给输入条描一圈主题色，提示当前处于录音态 */
.composer.is-recording {
  border-color: rgba(217, 119, 87, 0.55);
  background: var(--c-surface);
}

.chat-input {
  flex: 1;
  min-width: 0;
  height: 38px;
  border: none;
  background: transparent;
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--c-dark);
}

.chat-input:focus {
  outline: none;
}

.chat-input:disabled {
  color: var(--c-mid-gray);
}

.mic {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--c-border);
  border-radius: 50%;
  background: var(--c-surface);
  color: var(--c-mid-gray);
  cursor: pointer;
  transition: border-color 0.2s var(--ease-soft), background 0.2s var(--ease-soft),
    color 0.2s var(--ease-soft), box-shadow 0.2s var(--ease-soft);
}

.mic:hover:not(:disabled) {
  border-color: rgba(217, 119, 87, 0.55);
  background: rgba(217, 119, 87, 0.08);
  color: var(--c-orange);
  box-shadow: var(--shadow-xs);
}

.mic:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mic.is-on {
  border-color: var(--c-orange);
  background: var(--c-orange);
  color: var(--c-on-accent);
}

/* 占住输入框的位置，高度与 .chat-input 一致，切换时不跳动 */
.rec-card {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 38px;
}

.rec-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c-danger-solid);
  animation: recPulse 1.1s var(--ease-soft) infinite;
}

.rec-wave {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 2px;
  height: 26px;
}

.rec-bar {
  flex: 1;
  min-width: 2px;
  max-width: 4px;
  border-radius: 999px;
  background: var(--c-orange);
  transition: height 0.08s linear;
}

.rec-time {
  flex: none;
  font-family: var(--font-heading);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--c-mid-gray);
}

.mic-spinner {
  width: 13px;
  height: 13px;
  border: 2px solid var(--c-light-gray);
  border-top-color: var(--c-orange);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes recPulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.25;
  }
}

.send {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  height: 34px;
  padding: 0 16px;
  border: 1px solid var(--c-orange);
  border-radius: 999px;
  background: var(--c-orange);
  color: var(--c-on-accent);
  font-family: var(--font-heading);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(217, 119, 87, 0.28);
  transition: background 0.2s var(--ease-soft), border-color 0.2s var(--ease-soft),
    box-shadow 0.2s var(--ease-soft), transform 0.2s var(--ease-out);
}

.send:hover:not(:disabled) {
  border-color: var(--c-orange-hover);
  background: var(--c-orange-hover);
  transform: translateY(-1px);
  box-shadow: 0 1px 3px rgba(217, 119, 87, 0.3), 0 8px 16px -9px rgba(217, 119, 87, 0.7);
}

.send:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(217, 119, 87, 0.28);
}

.send:disabled {
  border-color: var(--c-border);
  background: var(--c-light-gray);
  color: var(--c-mid-gray);
  box-shadow: none;
  cursor: not-allowed;
}

.mini-spinner {
  width: 11px;
  height: 11px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* ---------- 中：排版区 ---------- */
.doc-area {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

/* 画布：无底色无边框，直接露出工作面的点阵网格，白纸浮在网格上。
   用块布局而不是 flex：纸张比画布宽时（A3 100%）flex 居中会把左侧裁掉且滚不到，
   块布局下超宽时 auto 外边距自动退化为 0，纸张左边缘始终可达 */
.canvas {
  height: 100%;
  min-height: 0;
  padding: 10px;
  /* 两个方向都允许滚动：100% 时 A3 会比画布宽，需要横向滚动查看 */
  overflow: auto;
  /* 与脚本里的 SCROLLBAR_GUTTER 对应：常驻滚动条槽，避免出现滚动条时纸张宽度跳变 */
  scrollbar-gutter: stable;
}

/* 纸张容器：只负责纵向排列多张纸，本身透明无边框；左侧留出页码槽 */
.sheet {
  position: relative;
  display: flex;
  flex-direction: column;
  /* 页面靠右排，页宽由内联 --page-w 给出，左侧空出的宽度正好放页码 */
  align-items: flex-end;
  gap: calc(22px * var(--sheet-scale));
  /* 窄于画布时由 auto 外边距居中，宽于画布时退化为 0 贴左缘（见 .canvas 注释） */
  margin: 0 auto;
  color: #141413;
  /* 试卷正文排版：中文宋体五号（10.5pt = 14px），数字/英文由字体栈回落命中 Times New Roman。
     浏览器按字符逐个匹配字体，所以西文走 TNR、汉字走宋体，无需额外拆分 span。
     字号乘 --sheet-scale 是为了配合缩放：纸张等比缩小时字号同步缩，五号字在纸上的占比才正确 */
  font-family: "Times New Roman", "SimSun", "宋体", "Songti SC", serif;
  font-size: calc(14px * var(--sheet-scale));
  line-height: 1.85;
  /* 光标：用主题橙描出来，落在纸面上一眼能看到 */
  caret-color: var(--c-orange);
  cursor: text;
  outline: none;
}

/* 单张纸：固定为一页的真实高度 × 显示比例，内容超出由分页逻辑搬到下一页，不撑破纸张 */
.sheet :deep(.pg-page) {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: none;
  width: var(--page-w);
  height: var(--page-h);
  padding: calc(68px * var(--sheet-scale)) calc(72px * var(--sheet-scale));
  border-radius: 2px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(20, 20, 19, 0.14), 0 18px 40px -22px rgba(20, 20, 19, 0.4);
}

/* 页码：贴在纸张左侧空白槽里，不随缩放变字号（缩放档太小会看不清）。
   sticky 让它吸附在画布上沿：纸张滑上去时页码不会跟着滚出可视区，始终能看出当前是第几页。
   它按零高 flex 项参与纸张布局（order:-1 + height:0），再用 translateY 把视觉位置校正回
   改动前的 4px×缩放，所以静止位置不变、正文容量与分页结果也不受影响 */
.sheet :deep(.pg-page)::after {
  content: attr(data-page);
  /* 作为纸张内第一个 flex 项参与布局（order:-1、零高），但视觉上贴在左上角 */
  position: sticky;
  order: -1;
  flex: none;
  height: 0;
  min-height: 0;
  /* 吸附点：与下面的静止位置校正同一个量。吸附后页码正好落在「纸张页首贴住画布上沿」的高度，
     静止时（纸张页首在画布上沿）又略高于吸附点，所以开始吸附的瞬间没有跳变 */
  top: calc(64px * var(--sheet-scale));
  /* 静止位置校正：抵消顶部内边距，并把标签推回纸张左侧的页码槽（槽宽固定 56px，不随缩放） */
  transform: translateY(calc(-64px * var(--sheet-scale)));
  margin-left: calc(-56px - 72px * var(--sheet-scale));
  width: 56px;
  padding-right: 14px;
  box-sizing: border-box;
  text-align: right;
  font-size: 12px;
  line-height: 1.5;
  color: #b3b1a9;
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
}

/* 正文容器：撑满整张纸，空态时给出输入提示；
   overflow 裁掉分页瞬间溢出的那几行，避免纸面被顶破（分页逻辑随后接手） */
.sheet :deep(.pg-body) {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.sheet :deep(.pg-body:empty::before) {
  content: attr(data-ph);
  color: #b3b1a9;
}

/* 以下正文内部间距同样乘 --sheet-scale，跟着字号一起缩，保证纸张整体比例一致 */
.sheet :deep(p) {
  margin: 0 0 calc(10px * var(--sheet-scale));
}

.sheet :deep(img) {
  max-width: 100%;
  cursor: default;
}

/* 选中的图片：空心橙描边由 .img-frame 负责，这里只把光标换成可拖动的形状 */
.sheet :deep(img.is-picked) {
  cursor: move;
}

/* 图片编辑框：盖在选中图片上的描边 + 右下角缩放柄（框本身不吃鼠标，点击仍落到图片上） */
.sheet :deep(.img-frame) {
  position: absolute;
  z-index: 3;
  pointer-events: none;
  box-shadow: 0 0 0 1.5px var(--c-orange);
  border-radius: 2px;
}

.sheet :deep(.img-handle) {
  position: absolute;
  right: -5px;
  bottom: -5px;
  width: 11px;
  height: 11px;
  border: 1.5px solid var(--c-orange);
  border-radius: 2px;
  background: #ffffff;
  pointer-events: auto;
  cursor: nwse-resize;
}

.sheet :deep(table) {
  width: 100%;
  border-collapse: collapse;
}

.sheet :deep(table td),
.sheet :deep(table th) {
  padding: calc(6px * var(--sheet-scale)) calc(8px * var(--sheet-scale));
  border: 1px solid #dcdad2;
}

.sheet :deep(.katex-display) {
  margin: calc(12px * var(--sheet-scale)) 0;
}

/* 插入的题目块之间留出间距，视觉上分区（不画分割线） */
.sheet :deep(.q-block) {
  margin-bottom: calc(18px * var(--sheet-scale));
}

/* ---------- 右：选项区 ---------- */
.options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 0 0 288px;
  min-height: 0;
  overflow-y: auto;
}

.opt-card {
  padding: 14px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  box-shadow: var(--shadow-sm), var(--inset-top);
}

.opt-label {
  margin: 0 0 10px;
  font-family: var(--font-heading);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--c-mid-gray);
}

/* ---------- 文字格式工具栏 ---------- */
.fmt-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.fmt-row + .fmt-row {
  margin-top: 6px;
}

.fmt-tag {
  flex: none;
  width: 28px;
  padding-top: 6px;
  font-family: var(--font-body);
  font-size: 10.5px;
  line-height: 1.2;
  color: var(--c-mid-gray);
}

.fmt-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.fmt-chip,
.fmt-icon {
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-mid-gray);
  font-family: var(--font-heading);
  cursor: pointer;
  /* 面板改宽后不再留空白：同一行内的选项等分当前宽度，跟着栏宽自适应 */
  flex: 1 1 0;
  min-width: 0;
  transition: border-color 0.18s var(--ease-soft), background 0.18s var(--ease-soft),
    color 0.18s var(--ease-soft);
}

.fmt-chip {
  height: 26px;
  padding: 0 4px;
  font-size: 11px;
  white-space: nowrap;
}

.fmt-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  padding: 0;
}

.fmt-chip:hover:not(.is-active),
.fmt-icon:hover:not(.is-active) {
  border-color: rgba(217, 119, 87, 0.4);
  color: var(--c-dark);
}

.fmt-chip.is-active,
.fmt-icon.is-active {
  border-color: var(--c-orange);
  background: rgba(217, 119, 87, 0.08);
  color: var(--c-orange);
  box-shadow: inset 0 0 0 1px rgba(217, 119, 87, 0.2);
}

.fmt-gap {
  flex: none;
  width: 1px;
  height: 18px;
  margin: 0 1px;
  background: var(--c-border);
}

.fmt-glyph {
  font-family: var(--font-heading);
  font-size: 12px;
  line-height: 1;
}

.fmt-glyph--bold {
  font-weight: 700;
}

.fmt-glyph--italic {
  font-style: italic;
  font-weight: 600;
}

.fmt-glyph--underline {
  font-weight: 600;
  text-decoration: underline;
}

/* 版面选择：三段等宽，选中项用品牌橙描边 + 浅底 */
.seg {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.seg-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 62px;
  padding: 6px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-mid-gray);
  cursor: pointer;
  transition: border-color 0.18s var(--ease-soft), background 0.18s var(--ease-soft),
    color 0.18s var(--ease-soft);
}

.seg-item:hover:not(.is-active) {
  border-color: rgba(217, 119, 87, 0.4);
  color: var(--c-dark);
}

.seg-item.is-active {
  border-color: var(--c-orange);
  background: rgba(217, 119, 87, 0.08);
  color: var(--c-orange);
  box-shadow: inset 0 0 0 1px rgba(217, 119, 87, 0.2);
}

/* 显示比例：四段等宽小胶囊，复用版面的选中样式 */
.seg--zoom {
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.seg-chip {
  height: 30px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-mid-gray);
  font-family: var(--font-heading);
  font-size: 11.5px;
  cursor: pointer;
  transition: border-color 0.18s var(--ease-soft), background 0.18s var(--ease-soft),
    color 0.18s var(--ease-soft);
}

.seg-chip:hover:not(.is-active) {
  border-color: rgba(217, 119, 87, 0.4);
  color: var(--c-dark);
}

.seg-chip.is-active {
  border-color: var(--c-orange);
  background: rgba(217, 119, 87, 0.08);
  color: var(--c-orange);
  box-shadow: inset 0 0 0 1px rgba(217, 119, 87, 0.2);
}

/* 纸张形状图标：高度固定，宽度随版面比例变化 */
.seg-shape {
  height: 22px;
  border: 1.4px solid currentColor;
  border-radius: 2px;
  opacity: 0.9;
}

.seg-label {
  font-family: var(--font-heading);
  font-size: 11.5px;
  font-weight: 600;
}

.save-btn {
  width: 100%;
  height: 36px;
  font-size: 13.5px;
}

.export-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 36px;
  border: 1px solid var(--c-border);
  border-radius: 10px;
  background: var(--c-white);
  font-family: var(--font-heading);
  font-size: 13.5px;
  color: var(--c-ink);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}

.export-btn:hover:not(:disabled) {
  border-color: var(--c-orange);
  color: var(--c-orange);
  background: rgba(217, 119, 87, 0.06);
}

.export-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.spinner {
  flex: none;
  width: 13px;
  height: 13px;
  border: 2px solid var(--c-light-gray);
  border-top-color: var(--c-orange);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 实底按钮上的菊花：轨道用半透明白，避免在橙底上糊成一团 */
.spinner-on-accent {
  border-color: rgba(255, 255, 255, 0.45);
  border-top-color: var(--c-on-accent);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
