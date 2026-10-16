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
            <button type="button" class="hit-add" @click="insert(hit)">
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
          :data-placeholder="t('compose.doc.placeholder')"
        ></div>
      </div>
    </section>

    <!-- 右：选项区 -->
    <aside class="options">
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

      <div class="opt-card">
        <p class="opt-label">{{ t('compose.options.title') }}</p>
        <el-input v-model="title" maxlength="80" :placeholder="t('compose.options.titlePlaceholder')" />
      </div>

      <div class="opt-card">
        <p class="opt-label">{{ t('compose.options.tags') }}</p>
        <el-input v-model="tags" maxlength="200" :placeholder="t('compose.options.tagsHint')" />
      </div>

      <button type="button" class="btn-accent save-btn" :disabled="saving" @click="save">
        <span v-if="saving" class="spinner spinner-on-accent" aria-hidden="true"></span>
        {{ saving ? t('compose.options.saving') : t('compose.options.save') }}
      </button>
    </aside>
  </div>
</template>

<script setup>
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { createPaper, getPaper, updatePaper } from '@/api/paper'
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
 * 纸张尺寸：按真实 mm 换算成像素，再乘以当前显示比例得到屏幕尺寸；
 * 用 min-height 兜住整页高度 —— 正文超出时纸张会自然变高（而不是溢出到纸外），画布负责滚动
 */
const sheetSize = ref({ width: 0, minHeight: 0 })
const sheetStyle = computed(() => ({
  width: sheetSize.value.width ? `${sheetSize.value.width}px` : '100%',
  minHeight: sheetSize.value.minHeight ? `${sheetSize.value.minHeight}px` : '60vh',
  '--sheet-scale': sheetScale.value || 1
}))

const isNew = computed(() => !props.id || props.id === 'new')

const title = ref('')
const tags = ref('')
const saving = ref(false)
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

/** 打开已有试卷：回填标题 / 标签 / 正文 */
async function load() {
  if (isNew.value || !requireLogin()) return
  loading.value = true
  try {
    const paper = await getPaper(props.id)
    title.value = paper.title || ''
    tags.value = paper.tags || ''
    await nextTick()
    if (sheetRef.value) sheetRef.value.innerHTML = paper.content || ''
  } catch {
    ElMessage.error(t('compose.loadFailed'))
  } finally {
    loading.value = false
  }
}

function currentContent() {
  return sheetRef.value ? sheetRef.value.innerHTML : ''
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
  const payload = { title: name, content, tags: tags.value.trim() }
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
    router.replace(`/compose/${result.id}`)
  }
}

/** 返回：先自动保存当前编辑，再回到组卷列表 */
async function back() {
  if (recording.value) await finishRecording(true)
  await persist({ silent: true, fallbackTitle: true })
  router.push('/compose')
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

/** 把题目题干追加到排版区末尾，并滚到底部让改动可见 */
function insert(hit) {
  const sheet = sheetRef.value
  if (!sheet) return
  const block = document.createElement('div')
  block.className = 'q-block'
  block.innerHTML = hit.html
  sheet.appendChild(block)
  if (canvasRef.value) canvasRef.value.scrollTop = canvasRef.value.scrollHeight
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
  const availW = Math.max(240, canvas.clientWidth - CANVAS_PADDING * 2 - SCROLLBAR_GUTTER)
  const availH = Math.max(240, canvas.clientHeight - CANVAS_PADDING * 2)
  const scale =
    zoomKey.value === 'fit'
      ? Math.min(availW / (BASE_SIZE.w * PX_PER_MM), availH / (BASE_SIZE.h * PX_PER_MM))
      : Number(zoomKey.value)
  sheetScale.value = scale
  const size = currentSize.value
  sheetSize.value = {
    width: Math.round(size.w * PX_PER_MM * scale),
    minHeight: Math.round(size.h * PX_PER_MM * scale)
  }
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
  await load()
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
  observer = null
  window.removeEventListener('keydown', onSpaceDown)
  window.removeEventListener('keyup', onSpaceUp)
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
  flex: 0 0 448px;
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

/* 纸张：真实尺寸 × 显示比例写入内联样式，正文超出时纸张自然变高；正文可直接编辑 */
.sheet {
  height: auto;
  /* 窄于画布时由 auto 外边距居中，宽于画布时退化为 0 贴左缘（见 .canvas 注释） */
  margin: 0 auto;
  padding: calc(68px * var(--sheet-scale)) calc(72px * var(--sheet-scale));
  border-radius: 2px;
  background: #ffffff;
  color: #141413;
  box-shadow: 0 1px 3px rgba(20, 20, 19, 0.14), 0 18px 40px -22px rgba(20, 20, 19, 0.4);
  /* 试卷正文排版：中文宋体五号（10.5pt = 14px），数字/英文由字体栈回落命中 Times New Roman。
     浏览器按字符逐个匹配字体，所以西文走 TNR、汉字走宋体，无需额外拆分 span。
     字号乘 --sheet-scale 是为了配合缩放：纸张等比缩小时字号同步缩，五号字在纸上的占比才正确 */
  font-family: "Times New Roman", "SimSun", "宋体", "Songti SC", serif;
  font-size: calc(14px * var(--sheet-scale));
  line-height: 1.85;
  outline: none;
}

.sheet:empty::before {
  content: attr(data-placeholder);
  color: #a9a79e;
}

/* 以下正文内部间距同样乘 --sheet-scale，跟着字号一起缩，保证纸张整体比例一致 */
.sheet :deep(p) {
  margin: 0 0 calc(10px * var(--sheet-scale));
}

.sheet :deep(img) {
  max-width: 100%;
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

/* 插入的题目块之间留出间距，视觉上分区 */
.sheet :deep(.q-block) {
  margin-bottom: calc(18px * var(--sheet-scale));
  padding-bottom: calc(14px * var(--sheet-scale));
  border-bottom: 1px dashed #e2e0d6;
}

.sheet :deep(.q-block:last-child) {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

/* ---------- 右：选项区 ---------- */
.options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 0 0 264px;
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
