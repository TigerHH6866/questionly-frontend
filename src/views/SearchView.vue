<template>
  <div class="search" :class="{ 'has-panel': panelId !== null, 'is-empty': !turns.length }">
    <div class="search-main">
      <div class="chat-col">
        <div ref="chatRef" class="chat-scroll">
          <div v-if="!turns.length" class="hero">
            <span class="hero-mark">
              <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
                <path
                  d="M12 2.5 20.5 7.4v9.2L12 21.5 3.5 16.6V7.4L12 2.5Z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linejoin="round"
                />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
            </span>
            <h2 class="hero-name">{{ t('app.name') }}</h2>
            <p class="hero-desc">{{ t('search.empty.desc') }}</p>
          </div>

          <div v-for="turn in turns" :key="turn.key" class="turn">
            <p class="ask">{{ turn.question }}</p>

            <div v-if="turn.loading" class="reply-state">
              <span class="spinner"></span>
              <span class="state-text">{{ t('search.thinking') }}</span>
            </div>

            <div v-else-if="turn.failed" class="reply-state">
              <span class="state-text fail">{{ t('search.failed') }}</span>
            </div>

            <template v-else>
              <div class="reply-head">
                <span class="reply-count">{{ t('search.found', { total: turn.total }) }}</span>
              </div>

              <p v-if="!turn.records.length" class="reply-state state-text">{{ t('search.none') }}</p>

              <article v-else class="sheet">
                <section
                  v-for="(q, qi) in turn.records"
                  :key="q.id"
                  class="q"
                  :class="{ 'is-analyzed': q.id === panelId }"
                >
                  <div class="q-head">
                    <div class="q-tag">
                      {{ t('process.questionLabel', { n: (turn.page - 1) * turn.pageSize + qi + 1 }) }}
                    </div>

                    <div class="q-actions">
                      <button class="act copy-latex" type="button" @click="copyLatex(q)">
                        {{ t('process.copyLatex') }}
                      </button>
                      <button class="act analyze" type="button" @click="openAnalysis(q)">
                        {{ t('process.viewAnalysis') }}
                      </button>
                      <button class="act danger" type="button" @click="removeQuestion(turn, q)">
                        {{ t('search.delete') }}
                      </button>
                    </div>
                  </div>
                  <div class="q-body" v-html="q.html"></div>
                </section>
              </article>

              <div v-if="turn.pages > 1" class="pager">
                <button
                  class="page-btn"
                  type="button"
                  :disabled="turn.loading || turn.page <= 1"
                  @click="goPage(turn, turn.page - 1)"
                >
                  {{ t('search.prev') }}
                </button>
                <span class="page-info">{{ t('search.page', { page: turn.page, pages: turn.pages }) }}</span>
                <button
                  class="page-btn"
                  type="button"
                  :disabled="turn.loading || !turn.hasNext"
                  @click="goPage(turn, turn.page + 1)"
                >
                  {{ t('search.next') }}
                </button>
              </div>
            </template>
          </div>

          <!-- 输入框与题目区同处一个滚动容器，保证左右边缘严格对齐 -->
          <div class="composer-dock">
            <form class="composer" :class="{ 'is-recording': recording }" @submit.prevent="send">
              <!-- 录音中：输入框位置换成状态卡片，实时渲染音量波形 -->
              <div v-if="recording" class="rec-card">
                <span class="rec-dot" aria-hidden="true"></span>
                <div class="rec-wave" aria-hidden="true">
                  <span
                    v-for="(bar, i) in recBars"
                    :key="i"
                    class="rec-bar"
                    :style="{ height: `${bar}%` }"
                  ></span>
                </div>
                <span class="rec-time">{{ recTime }}</span>
              </div>
              <input
                v-else
                v-model="draft"
                class="chat-input"
                type="text"
                :placeholder="recognizing ? t('search.recognizing') : t('search.placeholder')"
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
                <svg v-else-if="recording" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <rect x="7" y="7" width="10" height="10" rx="2.5" fill="currentColor" />
                </svg>
                <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
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
                {{ t('search.send') }}
              </button>
            </form>
          </div>
        </div>
      </div>

      <aside v-if="panelId !== null" class="panel">
        <div class="panel-head">
          <div class="panel-heading">
            <span class="panel-tag">{{ t('process.panelTitle') }}</span>
            <span class="panel-hint">{{ t('process.panelHint') }}</span>
          </div>
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
        <div
          ref="panelBodyRef"
          class="panel-body"
          contenteditable="true"
          spellcheck="false"
          @input="onPanelInput"
        ></div>

        <div class="panel-foot">
          <button class="save-bank" type="button" :disabled="saving" @click="saveEdit">
            <span v-if="saving" class="mini-spinner" aria-hidden="true"></span>
            {{ saving ? t('process.saving') : t('search.saveEdit') }}
          </button>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { searchQuestions, updateQuestion, deleteQuestion } from '@/api/question'
import { recognizeAudio } from '@/api/asr'
import { renderMarkdown, renderRichMarkdown } from '@/utils/markdown'
import { markdownToLatex } from '@/utils/document'
import { toEditedMarkdown } from '@/utils/editedMarkdown'
import { isLoggedIn } from '@/utils/auth'
import { VoiceRecorder } from '@/utils/recorder'

const { t } = useI18n()

/** 对话轮次：每条记录一次提问及其分页结果 */
const turns = ref([])
const draft = ref('')
const chatRef = ref(null)

const searching = computed(() => turns.value.some((turn) => turn.loading))

/** 右侧面板展示的题目 id，null 表示未展开 */
const panelId = ref(null)
const panelHtml = ref('')
const panelBodyRef = ref(null)
const saving = ref(false)

/** 面板里就地编辑后的 HTML 缓存：题目 id -> HTML（未编辑过的题目不在其中） */
const editCache = new Map()

/** 当前面板对应的题目 */
const panelQuestion = computed(() => {
  for (const turn of turns.value) {
    const found = turn.records.find((item) => item.id === panelId.value)
    if (found) return found
  }
  return null
})

/** 后端返回的一条记录 -> 页面渲染用对象 */
function toRecord(raw) {
  return {
    id: String(raw.id),
    title: raw.title || '',
    details: raw.details || '',
    html: renderRichMarkdown(raw.title || '')
  }
}

/** 用接口返回的分页数据刷新这一轮的结果 */
function applyTurn(turn, data) {
  turn.searchId = data.searchId
  turn.total = Number(data.total) || 0
  turn.page = Number(data.page) || 1
  turn.pageSize = Number(data.pageSize) || 20
  turn.pages = Math.max(1, Number(data.pages) || 1)
  turn.hasNext = Boolean(data.hasNext)
  turn.records = (data.records || []).map(toRecord)
  turn.loading = false
  turn.failed = false
}

async function scrollToBottom() {
  await nextTick()
  const el = chatRef.value
  if (el) el.scrollTop = el.scrollHeight
}

/** 发出提问：新增一轮对话并请求第一页 */
async function send() {
  const question = draft.value.trim()
  if (!question || searching.value) return
  if (!isLoggedIn()) {
    // 未登录时复用全局登录弹窗
    window.dispatchEvent(new CustomEvent('questionly:unauthorized'))
    return
  }

  // 轮次对象必须是响应式的：分页/翻页在 await 之后回写，若持有的是原始对象引用则不会触发重渲染
  const turn = reactive({
    key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    question,
    loading: true,
    failed: false,
    records: [],
    total: 0,
    page: 1,
    pageSize: 20,
    pages: 1,
    hasNext: false,
    searchId: null
  })
  turns.value.push(turn)
  draft.value = ''
  await scrollToBottom()

  try {
    applyTurn(turn, await searchQuestions({ q: question, bizType: 'search', page: 1 }))
  } catch {
    // 失败提示由 http 拦截器统一弹出
    turn.loading = false
    turn.failed = true
  }
  await scrollToBottom()
}

/** 翻页：复用该轮检索的 searchId */
async function goPage(turn, page) {
  if (turn.loading || !turn.searchId || page < 1) return
  turn.loading = true
  try {
    applyTurn(turn, await searchQuestions({ searchId: turn.searchId, page }))
  } catch {
    turn.loading = false
  }
  await scrollToBottom()
}

/** 删除题目：确认后调删除接口并从当前结果里移除 */
async function removeQuestion(turn, q) {
  try {
    await ElMessageBox.confirm(t('search.deleteTip'), t('search.delete'), {
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
      type: 'warning'
    })
  } catch {
    return
  }

  try {
    await deleteQuestion(q.id)
  } catch {
    return
  }

  const index = turn.records.findIndex((item) => item.id === q.id)
  if (index >= 0) turn.records.splice(index, 1)
  turn.total = Math.max(0, turn.total - 1)
  turn.pages = Math.max(1, Math.ceil(turn.total / turn.pageSize))
  turn.hasNext = turn.page < turn.pages
  if (panelId.value === q.id) closePanel()
  ElMessage.success(t('search.deleted'))

  // 当前页已空且存在上一页时回退一页
  if (!turn.records.length && turn.page > 1) goPage(turn, turn.page - 1)
}

function openAnalysis(q) {
  panelId.value = q.id
  // 编辑过的题目用编辑缓存还原，未编辑过的直接渲染已有分析结果
  panelHtml.value = editCache.has(q.id) ? editCache.get(q.id) : renderMarkdown(q.details)
  nextTick(syncPanelBody)
}

/**
 * 面板正文手动写入 innerHTML，不挂 v-html 绑定。
 * 用户就在这个节点里编辑，而 v-html 会在父组件任意一次重渲染时重新赋值并清空改动。
 */
function syncPanelBody() {
  const el = panelBodyRef.value
  if (el && panelId.value !== null) el.innerHTML = panelHtml.value
}

function closePanel() {
  panelId.value = null
  panelHtml.value = ''
}

/** 面板里就地编辑：只写缓存、不回写 panelHtml，避免重渲染打断光标 */
function onPanelInput() {
  const el = panelBodyRef.value
  if (!el || panelId.value === null) return
  editCache.set(panelId.value, el.innerHTML)
}

/** 保存修改：把面板 HTML 转回 Markdown 后 update 回数据库 */
async function saveEdit() {
  const question = panelQuestion.value
  if (!question || saving.value) return

  const el = panelBodyRef.value
  const details = el ? toEditedMarkdown(el.innerHTML) : ''
  if (!details) {
    ElMessage.warning(t('search.saveEditEmpty'))
    return
  }

  saving.value = true
  try {
    await updateQuestion(question.id, details)
    question.details = details
    if (el) editCache.set(question.id, el.innerHTML)
    ElMessage.success(t('search.updated'))
  } catch {
    // 失败提示由 http 拦截器统一弹出
  } finally {
    saving.value = false
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
async function copyLatex(q) {
  const ok = await writeClipboard(markdownToLatex(q.title))
  if (ok) ElMessage.success(t('process.copied'))
  else ElMessage.error(t('process.copyFailed'))
}

/* ---------- 语音输入 ---------- */

/** 波形柱子数量 */
const BAR_COUNT = 26

/** 长按空格触发录音的时长 */
const SPACE_HOLD_MS = 2000

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

async function startRecording() {
  if (recording.value || searching.value || recognizing.value) return
  if (!isLoggedIn()) {
    // 未登录时复用全局登录弹窗，避免录完才发现无法识别
    window.dispatchEvent(new CustomEvent('questionly:unauthorized'))
    return
  }

  recorder = new VoiceRecorder({
    onLevel: pushLevel,
    // 启动后一直没说话：放弃本次录音，直接回到输入状态
    onSilent: () => finishRecording(true),
    // 录满上限：带着已录内容直接走识别
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

/**
 * 结束录音并识别
 * @param {boolean} discard 丢弃已录内容（一直没说话的静音超时）
 */
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

/** 输入控件内不拦截空格，保证正常打字与在分析面板里编辑 */
function isTypingTarget(target) {
  if (!target) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
}

function onSpaceDown(event) {
  if (event.code !== 'Space' || event.repeat) return
  if (recording.value || isTypingTarget(event.target)) return
  // 输入框里已有内容时不抢空格，避免打断正在编辑的提问
  if (draft.value.trim()) return
  event.preventDefault()
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

onMounted(() => {
  window.addEventListener('keydown', onSpaceDown)
  window.addEventListener('keyup', onSpaceUp)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onSpaceDown)
  window.removeEventListener('keyup', onSpaceUp)
  clearTimeout(spaceTimer)
  clearInterval(recTimer)
  recorder?.stop(true)
})
</script>

<style scoped>
.search {
  /* 题头操作按钮高度，与题号标签同一行居中对齐 */
  --action-h: 27px;
  /* 悬浮分析面板宽度 */
  --panel-w: 560px;
  /* 题目区与面板之间的期望视觉间距 */
  --col-gap: 20px;
  /* 滚动条会占据容器右侧的宽度，需从让位宽度中扣除 */
  --scrollbar-w: 11px;
  /* 题目区 + 间距 + 面板 的总宽：整组按此宽度在交互区内水平居中 */
  --group-w: calc(952px + var(--col-gap) + var(--panel-w));
  /* 整组居中后左右两侧各自的留白，窄屏时收敛为 0 */
  --side-pad: max(0px, calc((100% - var(--group-w)) / 2));
  /* 展开面板时为其让出的右侧宽度 */
  --panel-gutter: calc(var(--panel-w) + var(--col-gap) - var(--scrollbar-w));
  flex: 1;
  min-height: 0;
  display: flex;
}

.search-main {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
}

/* 对话框铺满整宽，滚动条因此落在内容区最右侧；分析面板作为悬浮卡片叠在其上方 */
.chat-col {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.chat-scroll {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding-right: 4px;
}

/* 展开面板：左侧留白与面板右侧留白一致，整组在交互区内居中 */
.search.has-panel .chat-scroll {
  padding-left: var(--side-pad);
  padding-right: calc(var(--side-pad) + var(--panel-gutter));
}

/* 对话内容与输入框同处一个滚动容器，共用同一内容盒，左右边缘严格对齐 */
.chat-scroll > .turn,
.composer {
  width: 100%;
  max-width: 952px;
  margin-inline: auto;
}

/* 展开面板时填满为面板让位后的内容盒，使整组宽度精确等于 --group-w */
.search.has-panel .chat-scroll > .turn,
.search.has-panel .composer {
  max-width: none;
}

/* 输入框吸附在滚动容器底部；内容不足一屏时由 margin-top:auto 顶到底部 */
.composer-dock {
  position: sticky;
  bottom: 0;
  flex: none;
  margin-top: auto;
  padding-top: 16px;
}

/* 空态由 .hero 的 margin:auto 同时负责垂直居中与顶开底部输入框 */
.search.is-empty .composer-dock {
  margin-top: 0;
}

/* ---------- 空态：品牌标识 ---------- */

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin: auto;
  padding: 48px 32px;
  text-align: center;
}

.hero-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border-radius: var(--radius-md);
  background: rgba(217, 119, 87, 0.12);
  color: var(--c-orange);
  box-shadow: inset 0 0 0 1px rgba(217, 119, 87, 0.16), 0 2px 6px -3px rgba(217, 119, 87, 0.4);
}

.hero-name {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.015em;
}

.hero-desc {
  margin: 0;
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.72;
  color: var(--c-mid-gray);
  white-space: nowrap;
}

/* ---------- 对话轮次 ---------- */

.turn + .turn {
  margin-top: 30px;
}

/* 用户提问气泡：右对齐 */
.ask {
  display: block;
  width: fit-content;
  max-width: 74%;
  margin: 0 0 14px auto;
  padding: 9px 16px;
  border-radius: 14px 14px 4px 14px;
  background: rgba(217, 119, 87, 0.1);
  box-shadow: inset 0 0 0 1px rgba(217, 119, 87, 0.16);
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.reply-head {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.reply-count {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 999px;
  background: rgba(120, 140, 93, 0.12);
  color: var(--c-green);
  font-family: var(--font-heading);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  box-shadow: inset 0 0 0 1px rgba(120, 140, 93, 0.18);
}

.reply-state {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 0;
}

/* ---------- 题目卡片 ---------- */

.sheet {
  padding: 8px 40px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  box-shadow: var(--shadow-md), var(--inset-top);
}

/* 题目之间用分割线区分；上下内边距为分割线到题目的间距 */
.q {
  padding: 24px 20px;
}

.q + .q {
  border-top: 1px dashed var(--c-light-gray);
}

/* 已展开分析结果的题目高亮 */
.q.is-analyzed {
  border-radius: var(--radius-md);
  background: rgba(217, 119, 87, 0.06);
  box-shadow: inset 3px 0 0 var(--c-orange);
}

/* 题头：左侧题号标签 + 右侧操作入口，同处一行 */
.q-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.q-tag {
  display: inline-block;
  flex: none;
  padding: 3px 12px;
  border-radius: 999px;
  background: rgba(217, 119, 87, 0.12);
  color: var(--c-orange);
  font-family: var(--font-heading);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  box-shadow: inset 0 0 0 1px rgba(217, 119, 87, 0.16);
}

.q-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

/* 题头操作入口：主色底 + 白字（同录入题目页），删除为中性描边 */
.act {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: var(--action-h);
  padding: 0 12px;
  border: 1px solid var(--c-orange);
  border-radius: 999px;
  background: var(--c-orange);
  color: var(--c-on-accent);
  font-family: var(--font-heading);
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(217, 119, 87, 0.28);
  transition: background 0.2s var(--ease-soft), border-color 0.2s var(--ease-soft),
    color 0.2s var(--ease-soft), box-shadow 0.2s var(--ease-soft), transform 0.2s var(--ease-out);
}

.copy-latex:hover,
.analyze:hover {
  border-color: var(--c-orange-hover);
  background: var(--c-orange-hover);
  transform: translateY(-1px);
  box-shadow: 0 1px 3px rgba(217, 119, 87, 0.3), 0 8px 16px -9px rgba(217, 119, 87, 0.7);
}

.copy-latex:active,
.analyze:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(217, 119, 87, 0.28);
}

.danger {
  border-color: var(--c-border);
  background: var(--c-surface);
  color: var(--c-mid-gray);
  box-shadow: none;
}

.danger:hover {
  border-color: rgba(220, 38, 38, 0.4);
  background: var(--c-danger-bg);
  color: var(--c-danger);
  transform: translateY(-1px);
}

.danger:active {
  transform: translateY(0);
}

/* 题干内容（Markdown 渲染） */
.q-body {
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.95;
  word-break: break-word;
}

.q-body :deep(p) {
  margin: 0 0 10px;
}

.q-body :deep(p:last-child) {
  margin-bottom: 0;
}

.q-body :deep(h1),
.q-body :deep(h2),
.q-body :deep(h3),
.q-body :deep(h4) {
  margin: 0 0 12px;
  font-family: var(--font-heading);
  font-size: 17px;
  font-weight: 600;
}

.q-body :deep(ul),
.q-body :deep(ol) {
  margin: 0 0 10px;
  padding-left: 20px;
}

.q-body :deep(li) {
  margin-bottom: 4px;
}

.q-body :deep(table) {
  width: 100%;
  margin: 14px 0;
  border-collapse: collapse;
}

.q-body :deep(td),
.q-body :deep(th) {
  padding: 8px 12px;
  border: 1px solid var(--c-border);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.q-body :deep(th) {
  background: var(--c-subtle);
  font-family: var(--font-heading);
  font-size: 13px;
  font-weight: 600;
}

.q-body :deep(tbody tr:nth-child(even)) {
  background: var(--c-subtle);
}

.q-body :deep(img) {
  max-width: 100%;
  border-radius: var(--radius-sm);
  border: 1px solid var(--c-border);
  box-shadow: var(--shadow-xs);
}

.q-body :deep(.katex-display) {
  margin: 12px 0;
  overflow-x: auto;
  overflow-y: hidden;
  text-align: center;
}

/* ---------- 分页 ---------- */

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
}

.page-btn {
  height: 30px;
  padding: 0 16px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-surface);
  color: var(--c-dark);
  font-family: var(--font-heading);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.2s var(--ease-soft), background 0.2s var(--ease-soft),
    color 0.2s var(--ease-soft), box-shadow 0.2s var(--ease-soft);
}

.page-btn:hover:not(:disabled) {
  border-color: rgba(217, 119, 87, 0.55);
  background: rgba(217, 119, 87, 0.08);
  color: var(--c-orange);
  box-shadow: var(--shadow-xs);
}

.page-btn:disabled {
  border-color: var(--c-border);
  background: var(--c-subtle);
  color: var(--c-mid-gray);
  cursor: not-allowed;
}

.page-info {
  font-family: var(--font-heading);
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  color: var(--c-mid-gray);
}

/* ---------- 底部输入框 ---------- */

.composer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 8px 8px 18px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  box-shadow: var(--shadow-md), var(--inset-top);
}

.chat-input {
  flex: 1;
  min-width: 0;
  height: 62px;
  border: none;
  background: transparent;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--c-dark);
}

.chat-input:focus {
  outline: none;
}

.chat-input:disabled {
  color: var(--c-mid-gray);
}

/* ---------- 语音输入 ---------- */

/* 录音中给输入条描一圈主题色，提示当前处于录音态 */
.composer.is-recording {
  border-color: rgba(217, 119, 87, 0.55);
}

.mic {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 38px;
  height: 38px;
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
  gap: 12px;
  height: 62px;
  padding: 0 2px;
}

.rec-dot {
  flex: none;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--c-danger-solid);
  animation: recPulse 1.1s var(--ease-soft) infinite;
}

.rec-wave {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 3px;
  height: 30px;
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
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--c-mid-gray);
}

.mic-spinner {
  width: 14px;
  height: 14px;
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
  height: 38px;
  padding: 0 22px;
  border: 1px solid var(--c-orange);
  border-radius: 999px;
  background: var(--c-orange);
  color: var(--c-on-accent);
  font-family: var(--font-heading);
  font-size: 13px;
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

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--c-light-gray);
  border-top-color: var(--c-orange);
  border-right-color: rgba(217, 119, 87, 0.4);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.state-text {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--c-mid-gray);
}

.fail {
  font-family: var(--font-heading);
  color: var(--c-orange);
}

/* ---------- 右侧分析面板 ---------- */

/* 悬浮在对话区右侧的分析面板：右侧留白与题目区左侧留白一致，整组居中 */
.panel {
  position: absolute;
  top: 0;
  right: var(--side-pad);
  bottom: 0;
  width: var(--panel-w);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 20px 0 16px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  box-shadow: var(--shadow-md), var(--inset-top);
}

.panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  padding: 0 24px 12px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--c-border);
}

/* 标签与提示语竖向排列，关闭按钮靠右 */
.panel-heading {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.panel-hint {
  font-family: var(--font-body);
  font-size: 12px;
  line-height: 1.4;
  color: var(--c-mid-gray);
}

.panel-tag {
  padding: 3px 12px;
  border-radius: 999px;
  background: rgba(217, 119, 87, 0.12);
  color: var(--c-orange);
  font-family: var(--font-heading);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  box-shadow: inset 0 0 0 1px rgba(217, 119, 87, 0.16);
}

/* 关闭按钮：收起分析面板，对话列恢复居中 */
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
  transition: border-color 0.2s var(--ease-soft), background 0.2s var(--ease-soft),
    color 0.2s var(--ease-soft), box-shadow 0.2s var(--ease-soft);
}

.panel-close:hover {
  border-color: rgba(217, 119, 87, 0.55);
  background: rgba(217, 119, 87, 0.08);
  color: var(--c-orange);
  box-shadow: var(--shadow-xs);
}

/* 面板正文：可点击插入光标就地编辑，只滚动正文、头部与底部按钮常驻 */
.panel-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 24px;
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.85;
  word-break: break-word;
}

.panel-body:focus {
  outline: none;
  box-shadow: inset 0 0 0 1px rgba(217, 119, 87, 0.22);
}

/* 面板底部：保存修改入口 */
.panel-foot {
  flex: none;
  display: flex;
  justify-content: flex-end;
  padding: 14px 24px 0;
  margin-top: 12px;
  border-top: 1px solid var(--c-border);
}

.save-bank {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 18px;
  border: 1px solid var(--c-orange);
  border-radius: 999px;
  background: var(--c-orange);
  color: var(--c-on-accent);
  font-family: var(--font-heading);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(217, 119, 87, 0.28);
  transition: background 0.2s var(--ease-soft), border-color 0.2s var(--ease-soft),
    box-shadow 0.2s var(--ease-soft), transform 0.2s var(--ease-out);
}

.save-bank:hover:not(:disabled) {
  border-color: var(--c-orange-hover);
  background: var(--c-orange-hover);
  transform: translateY(-1px);
  box-shadow: 0 1px 3px rgba(217, 119, 87, 0.3), 0 8px 16px -9px rgba(217, 119, 87, 0.7);
}

.save-bank:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(217, 119, 87, 0.28);
}

.save-bank:disabled {
  border-color: var(--c-border);
  background: var(--c-light-gray);
  color: var(--c-mid-gray);
  box-shadow: none;
  cursor: not-allowed;
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
  padding: 7px 10px;
  border: 1px solid var(--c-border);
  text-align: left;
}

.panel-body :deep(th) {
  background: var(--c-subtle);
  font-family: var(--font-heading);
  font-weight: 600;
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 窄屏时分析面板不再悬浮，直接堆叠到对话列下方 */
@media (max-width: 1400px) {
  .search-main {
    flex-direction: column;
  }

  .chat-col {
    flex: none;
    width: 100%;
    height: 70vh;
  }

  /* 面板改为堆叠布局后不再需要预留右侧空间，也不再需要整组居中留白 */
  .search.has-panel {
    --side-pad: 0px;
    --panel-gutter: 0px;
  }

  .panel {
    position: static;
    width: 100%;
    max-height: 60vh;
  }
}
</style>
