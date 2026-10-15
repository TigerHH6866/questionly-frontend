<template>
  <div class="import">
    <header class="hero">
      <h2 class="hero-title">{{ t('import.subtitle') }}</h2>
    </header>

    <div
      class="dropzone"
      :class="{ 'is-dragover': dragover, 'has-file': !!picked, 'is-busy': isBusy }"
      @click="openPicker"
      @dragover.prevent="dragover = true"
      @dragleave.prevent="dragover = false"
      @drop.prevent="onDrop"
    >
      <template v-if="!picked">
        <span class="drop-mark">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" aria-hidden="true">
            <path
              d="M12 15.5V4m0 0L7.8 8.2M12 4l4.2 4.2M4.5 15.5v2.8A2.2 2.2 0 0 0 6.7 20.5h10.6a2.2 2.2 0 0 0 2.2-2.2v-2.8"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <p class="drop-title">{{ t('import.drop.title') }}</p>
        <p class="drop-hint">{{ t('import.drop.hint') }}</p>
        <button class="start" type="button" @click.stop="openPicker">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          {{ t('import.choose') }}
        </button>
      </template>

      <template v-else>
        <div class="file-row">
          <span class="file-icon" :class="'file-icon--' + picked.kind">
            <img v-if="picked.kind === 'image' && preview" :src="preview" class="file-thumb" alt="" />
            <svg
              v-else-if="picked.kind === 'image'"
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              aria-hidden="true"
            >
              <rect x="3.5" y="4.5" width="17" height="15" rx="2.4" stroke="currentColor" stroke-width="1.5" />
              <circle cx="9" cy="9.4" r="1.6" stroke="currentColor" stroke-width="1.5" />
              <path
                d="m4.6 17 4.1-4.3a1.6 1.6 0 0 1 2.3 0l2.6 2.7 1.9-1.8a1.6 1.6 0 0 1 2.2 0l2.7 2.6"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <svg
              v-else-if="picked.kind === 'pdf'"
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 3.5h7.2L18 8.3v12.2a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 6 3.5Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linejoin="round"
              />
              <path d="M13 3.5v5h5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
              <path
                d="M7.6 16.8v-4.6h2a1.6 1.6 0 0 1 0 3.2h-2"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <svg v-else viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
              <path
                d="M6 3.5h7.2L18 8.3v12.2a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 6 3.5Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linejoin="round"
              />
              <path d="M13 3.5v5h5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
              <path d="M8 12.6h8M8 15.6h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
            </svg>
          </span>
          <span class="file-meta">
            <span class="file-name">{{ picked.name }}</span>
            <span class="file-size">{{ picked.size }}</span>
          </span>
          <button
            v-if="!isBusy"
            class="file-remove"
            type="button"
            :aria-label="t('import.remove')"
            :title="t('import.remove')"
            @click.stop="clear"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
              <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        <div v-if="isBusy" class="waiting">
          <span class="spinner" aria-hidden="true"></span>
          <span class="waiting-text">{{ t('import.waiting') }}</span>
        </div>

        <template v-else>
          <p v-if="phase === 'failed'" class="fail">{{ failText }}</p>
          <button class="start" type="button" @click.stop="onStart">
            {{ phase === 'failed' ? t('import.retry') : t('import.start') }}
          </button>
        </template>
      </template>

      <input
        ref="inputRef"
        class="file-input"
        type="file"
        :accept="ACCEPT"
        @change="onPick"
      />
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="cards">
      <article class="card">
        <span class="card-icon card-icon--blue">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
            <path
              d="M4 7.5V6.2A1.7 1.7 0 0 1 5.7 4.5h3.1l1.5 1.8h8A1.7 1.7 0 0 1 20 8v10.3a1.7 1.7 0 0 1-1.7 1.7H5.7A1.7 1.7 0 0 1 4 18.3V7.5Z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
            <path d="M8.5 13.5h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </span>
        <h3 class="card-title">{{ t('import.cards.recognize.title') }}</h3>
        <p class="card-desc">{{ t('import.cards.recognize.desc') }}</p>
      </article>

      <article class="card">
        <span class="card-icon card-icon--orange">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
            <path
              d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.4l-1.9-5.6L4.5 10.9 10.1 9 12 3.5Z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
            <path d="M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" fill="currentColor" />
          </svg>
        </span>
        <h3 class="card-title">{{ t('import.cards.analyze.title') }}</h3>
        <p class="card-desc">{{ t('import.cards.analyze.desc') }}</p>
      </article>

      <article class="card">
        <span class="card-icon card-icon--green">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="5.8" stroke="currentColor" stroke-width="1.5" />
            <path d="m14.8 14.8 4.3 4.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </span>
        <h3 class="card-title">{{ t('import.cards.search.title') }}</h3>
        <p class="card-desc">{{ t('import.cards.search.desc') }}</p>
      </article>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { createOcrTask, getOcrTask } from '@/api/ocr'
import { isLoggedIn } from '@/utils/auth'

const ACCEPT = '.png,.jpg,.jpeg,.doc,.docx,.pdf'
const ALLOWED = ['png', 'jpg', 'jpeg', 'doc', 'docx', 'pdf']
const MAX_SIZE = 100 * 1024 * 1024

/** 轮询：每 10s 一次，最多 20 次 */
const POLL_INTERVAL = 10000
const POLL_MAX = 20

const { t } = useI18n()
const router = useRouter()

const inputRef = ref(null)
const dragover = ref(false)
const picked = ref(null)
const file = ref(null)
const error = ref('')

/** 图片类文件的缩略图预览（objectURL），切换文件或离开页面时释放 */
const preview = ref('')

function revokePreview() {
  if (preview.value) {
    URL.revokeObjectURL(preview.value)
    preview.value = ''
  }
}

/** 'idle' | 'busy' | 'failed' */
const phase = ref('idle')
const failKey = ref('')
const failRaw = ref('')

const isBusy = computed(() => phase.value === 'busy')
const failText = computed(() => failRaw.value || (failKey.value ? t(failKey.value) : ''))

let timer = null
let pollCount = 0

function stopPolling() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function openPicker() {
  if (isBusy.value) return
  inputRef.value?.click()
}

function onPick(event) {
  const next = event.target.files?.[0]
  event.target.value = ''
  if (next) accept(next)
}

function onDrop(event) {
  dragover.value = false
  if (isBusy.value) return
  const next = event.dataTransfer?.files?.[0]
  if (next) accept(next)
}

/**
 * Ctrl+V 直接载入：截图工具（Win+Shift+S、微信等）产出的位图、
 * 以及资源管理器里复制的文件，都会以 File 形式出现在 clipboardData.files 中。
 * 只在空载状态响应，避免覆盖已选文件；纯文本粘贴不拦截，交给默认行为。
 */
function onPaste(event) {
  if (picked.value || isBusy.value) return
  const next = event.clipboardData?.files?.[0]
  if (next) accept(next)
}

function accept(next) {
  error.value = ''
  picked.value = null
  file.value = null
  revokePreview()
  const ext = next.name.split('.').pop()?.toLowerCase()
  if (!ALLOWED.includes(ext)) {
    error.value = t('import.error.type')
    return
  }
  if (next.size > MAX_SIZE) {
    error.value = t('import.error.size')
    return
  }
  const kind = kindOf(ext)
  file.value = next
  picked.value = { name: next.name, size: formatSize(next.size), kind }
  // 图片用缩略图替代默认图标，方便确认载入的是哪一张
  if (kind === 'image') preview.value = URL.createObjectURL(next)
  resetPhase()
}

function kindOf(ext) {
  if (['png', 'jpg', 'jpeg'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  return 'doc'
}

function resetPhase() {
  stopPolling()
  phase.value = 'idle'
  failKey.value = ''
  failRaw.value = ''
}

function clear() {
  if (isBusy.value) return
  picked.value = null
  file.value = null
  error.value = ''
  revokePreview()
  resetPhase()
}

/** 失败态下点击「重试」回到载入文档状态，否则开始识别 */
function onStart() {
  if (phase.value === 'failed') {
    resetPhase()
    return
  }
  start()
}

async function start() {
  if (!file.value) return
  if (!isLoggedIn()) {
    // 未登录时复用全局登录弹窗
    window.dispatchEvent(new CustomEvent('questionly:unauthorized'))
    return
  }
  phase.value = 'busy'
  failKey.value = ''
  failRaw.value = ''
  pollCount = 0
  try {
    const task = await createOcrTask(file.value)
    // 新任务已入库，广播一次让侧栏「近期文件」立刻刷新，新文件出现在列表首位
    window.dispatchEvent(new CustomEvent('questionly:recent-refresh'))
    poll(task.id)
  } catch {
    phase.value = 'failed'
    failKey.value = 'import.failed'
  }
}

function poll(id) {
  timer = setTimeout(async () => {
    timer = null
    pollCount += 1
    try {
      const task = await getOcrTask(id)
      if (task.status === 'SUCCESS') {
        router.push(`/tasks/${id}/process`)
        return
      }
      if (task.status === 'FAILED') {
        phase.value = 'failed'
        failRaw.value = task.errorMsg || ''
        failKey.value = task.errorMsg ? '' : 'import.failed'
        return
      }
    } catch {
      // 单次请求异常继续轮询，超过次数上限再判超时
    }
    if (pollCount >= POLL_MAX) {
      phase.value = 'failed'
      failKey.value = 'import.timeout'
      return
    }
    poll(id)
  }, POLL_INTERVAL)
}

onMounted(() => document.addEventListener('paste', onPaste))

onUnmounted(() => {
  document.removeEventListener('paste', onPaste)
  revokePreview()
  stopPolling()
})

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}
</script>

<style scoped>
.import {
  width: 100%;
  max-width: 760px;
  margin: auto;
}

.hero {
  margin-bottom: 26px;
  text-align: center;
}

.hero-title {
  max-width: 520px;
  margin: 0 auto;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.45;
  letter-spacing: -0.015em;
  text-wrap: balance;
}

/* 上传区 */
.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 172px;
  padding: 26px 24px;
  border: 1px dashed var(--c-light-gray);
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  text-align: center;
  cursor: pointer;
  box-shadow: var(--shadow-xs);
  transition: border-color 0.22s var(--ease-soft), background 0.22s var(--ease-soft),
    box-shadow 0.22s var(--ease-soft), transform 0.22s var(--ease-out);
}

.drop-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  margin-bottom: 6px;
  border-radius: 18px;
  background: var(--c-dark);
  color: var(--c-orange);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 8px 18px -10px rgba(20, 20, 19, 0.6);
}

.dropzone:hover,
.dropzone.is-dragover {
  border-color: var(--c-orange);
  background: rgba(217, 119, 87, 0.04);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.dropzone.is-dragover {
  box-shadow: var(--shadow-sm), 0 0 0 4px rgba(217, 119, 87, 0.12);
}

.file-input {
  display: none;
}

.drop-title {
  max-width: 420px;
  margin: 0;
  font-family: var(--font-heading);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.005em;
  line-height: 1.45;
}

.drop-hint {
  margin: 0;
  font-family: var(--font-body);
  font-size: 13px;
  line-height: 1.6;
  color: var(--c-mid-gray);
}

.error {
  margin: 12px 0 0;
  font-family: var(--font-heading);
  font-size: 13px;
  color: var(--c-orange);
}

/* 已选文件：框内文件信息 + 开始按钮 */
.dropzone.has-file {
  gap: 18px;
}

.file-row {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  max-width: 520px;
  padding: 14px 16px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  box-shadow: var(--shadow-xs);
  text-align: left;
}

.file-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
}

.file-icon--image {
  background: rgba(106, 155, 204, 0.14);
  color: var(--c-blue);
  box-shadow: inset 0 0 0 1px rgba(106, 155, 204, 0.18);
  /* 有缩略图时裁到圆角内 */
  overflow: hidden;
}

/* 图片缩略图：铺满图标方块并居中裁切，替代默认图标 */
.file-thumb {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  outline: 1px solid var(--c-hairline-strong);
  outline-offset: -1px;
}

.file-icon--pdf {
  background: rgba(217, 119, 87, 0.14);
  color: var(--c-orange);
  box-shadow: inset 0 0 0 1px rgba(217, 119, 87, 0.18);
}

.file-icon--doc {
  background: rgba(120, 140, 93, 0.14);
  color: var(--c-green);
  box-shadow: inset 0 0 0 1px rgba(120, 140, 93, 0.18);
}

.file-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.file-name {
  font-family: var(--font-heading);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -0.005em;
  word-break: break-all;
}

.file-size {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--c-mid-gray);
}

.file-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--c-mid-gray);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.file-remove:hover {
  background: rgba(217, 119, 87, 0.12);
  color: var(--c-orange);
}

.start {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 24px;
  border: none;
  border-radius: 999px;
  background: var(--c-orange);
  color: var(--c-on-accent);
  font-family: var(--font-heading);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(217, 119, 87, 0.3), 0 6px 14px -8px rgba(217, 119, 87, 0.7);
  transition: background 0.2s var(--ease-soft), transform 0.2s var(--ease-out),
    box-shadow 0.2s var(--ease-soft);
}

.start:hover {
  background: var(--c-orange-hover);
  transform: translateY(-1px);
  box-shadow: 0 1px 3px rgba(217, 119, 87, 0.32), 0 10px 20px -10px rgba(217, 119, 87, 0.75);
}

.start:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(217, 119, 87, 0.3);
}

.dropzone:not(.has-file) .start {
  margin-top: 14px;
}

/* 等待 / 失败态 */
.dropzone.is-busy {
  cursor: default;
}

.dropzone.is-busy:hover {
  border-color: var(--c-light-gray);
  background: var(--c-surface);
  box-shadow: var(--shadow-xs);
  transform: none;
}

.waiting {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.waiting-text {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--c-mid-gray);
}

.fail {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 13px;
  color: var(--c-orange);
}

/* 能力卡片 */
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-top: 30px;
}

.card {
  padding: 22px 20px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  box-shadow: var(--shadow-xs);
  transition: border-color 0.22s var(--ease-soft), transform 0.22s var(--ease-out),
    box-shadow 0.22s var(--ease-soft);
}

.card:hover {
  border-color: rgba(217, 119, 87, 0.35);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-bottom: 16px;
  border-radius: var(--radius-sm);
}

.card-icon--blue {
  background: rgba(106, 155, 204, 0.14);
  color: var(--c-blue);
  box-shadow: inset 0 0 0 1px rgba(106, 155, 204, 0.18);
}

.card-icon--orange {
  background: rgba(217, 119, 87, 0.14);
  color: var(--c-orange);
  box-shadow: inset 0 0 0 1px rgba(217, 119, 87, 0.18);
}

.card-icon--green {
  background: rgba(120, 140, 93, 0.14);
  color: var(--c-green);
  box-shadow: inset 0 0 0 1px rgba(120, 140, 93, 0.18);
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.005em;
}

.card-desc {
  margin: 8px 0 0;
  font-family: var(--font-body);
  font-size: 13px;
  line-height: 1.72;
  color: var(--c-mid-gray);
}

@media (max-width: 860px) {
  .cards {
    grid-template-columns: 1fr;
  }
}
</style>
