<template>
  <div class="qdm-mask" @click.self="close">
    <div class="qdm-card" role="dialog" aria-modal="true">
      <header class="qdm-head">
        <div class="qdm-heading">
          <span class="qdm-tag">{{ t('process.panelTitle') }}</span>
          <span class="qdm-hint">{{ t('process.panelHint') }}</span>
        </div>
        <div class="qdm-head-right">
          <span class="qdm-time">{{ formatTime(question.createdAt) }}</span>
          <button
            class="qdm-close"
            type="button"
            :title="t('process.close')"
            :aria-label="t('process.close')"
            @click="close"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </header>

      <!-- 题干顶部一行：学段、学科、知识点；时间移到右上角 -->
      <div class="qdm-meta">
        <template v-if="stage">
          <span class="qdm-meta-text">{{ stage }}</span>
          <span class="qdm-meta-sep" aria-hidden="true">/</span>
        </template>
        <template v-if="subject">
          <span class="qdm-meta-text">{{ subject }}</span>
          <span class="qdm-meta-sep" aria-hidden="true">/</span>
        </template>
        <span v-for="item in knowledge" :key="item.knowledgeId" class="qdm-kp" :class="{ primary: item.role === 1 }">
          <span v-if="item.role === 1" class="qdm-kp-star" aria-hidden="true">★</span>
          <span class="qdm-kp-name">{{ item.name }}</span>
        </span>
        <button class="qdm-kp-add" type="button" @click="pickerOpen = true">
          ＋ {{ t('knowledge.select') }}
        </button>
      </div>

      <div class="qdm-scroll">
        <section class="qdm-sec">
          <p class="qdm-label">{{ t('resources.questions.stem') }}</p>
          <div class="qdm-stem" v-html="stemHtml"></div>
        </section>

        <section class="qdm-sec">
          <p class="qdm-label">{{ t('process.panelTitle') }}</p>
          <div v-if="loading" class="qdm-loading">
            <span class="spinner" aria-hidden="true"></span>
            {{ t('process.loading') }}
          </div>
          <!-- 正文手动写 innerHTML，不挂 v-html：用户就在这个节点里编辑，
               v-html 会在父组件任意一次重渲染时重新赋值并清空改动 -->
          <div
            v-show="!loading"
            ref="bodyRef"
            class="qdm-body"
            contenteditable="true"
            spellcheck="false"
          ></div>
        </section>
      </div>

      <footer class="qdm-foot">
        <button class="qdm-del" type="button" :disabled="busy" @click="remove">
          {{ t('search.delete') }}
        </button>
        <button class="qdm-save" type="button" :disabled="busy || loading" @click="save">
          <span v-if="saving" class="mini-spinner" aria-hidden="true"></span>
          {{ saving ? t('process.saving') : t('search.saveEdit') }}
        </button>
      </footer>
    </div>

    <KnowledgePicker
      v-if="pickerOpen"
      :question-id="question.id"
      :subject="question.subject || ''"
      @close="pickerOpen = false"
      @saved="loadKnowledge"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteQuestion,
  getQuestionDetail,
  getQuestionKnowledge,
  updateQuestion
} from '@/api/question'
import KnowledgePicker from '@/components/KnowledgePicker.vue'
import { renderMarkdown, renderRichMarkdown } from '@/utils/markdown'
import { toEditedMarkdown } from '@/utils/editedMarkdown'

const props = defineProps({
  /** 列表里的题目摘要：id / title / image / grade / subject / createdAt */
  question: { type: Object, required: true }
})
const emit = defineEmits(['close', 'deleted'])

const { t } = useI18n()

const bodyRef = ref(null)
const loading = ref(false)
const saving = ref(false)
const busy = computed(() => loading.value || saving.value)
const knowledge = ref([])
const pickerOpen = ref(false)

/** 学段优先用题目记录的年级，缺失时退回已关联知识点的学段 */
const stage = computed(() => props.question.grade || knowledge.value[0]?.stage || '')
/** 学科取题目本身记录的学科，缺失时用知识点所属学科 */
const subject = computed(() => props.question.subject || knowledge.value[0]?.subject || '')

/** 拉取题目已绑定的知识点（支持一题多选） */
async function loadKnowledge() {
  try {
    knowledge.value = (await getQuestionKnowledge(props.question.id)) || []
  } catch {
    knowledge.value = []
  }
}

/** 题干是原始 Markdown，可能内嵌表格 HTML，走富文本渲染 */
const stemHtml = computed(() => renderRichMarkdown(props.question.title || ''))

function formatTime(value) {
  if (!value) return ''
  return String(value).replace('T', ' ').slice(0, 16)
}

/** 拉取题目详情里的 AI 分析正文并渲染进可编辑区 */
async function loadDetail() {
  loading.value = true
  try {
    const detail = await getQuestionDetail(props.question.id)
    const el = bodyRef.value
    if (el) el.innerHTML = renderMarkdown(detail?.details || '')
  } catch {
    // 失败提示由 http 拦截器统一弹出
  } finally {
    loading.value = false
  }
}

/** 保存修改：把可编辑区 HTML 转回 Markdown 后写回数据库 */
async function save() {
  if (busy.value) return
  const el = bodyRef.value
  const details = el ? toEditedMarkdown(el.innerHTML) : ''
  if (!details) {
    ElMessage.warning(t('search.saveEditEmpty'))
    return
  }

  saving.value = true
  try {
    await updateQuestion(props.question.id, details)
    ElMessage.success(t('search.updated'))
  } catch {
    // 失败提示由 http 拦截器统一弹出
  } finally {
    saving.value = false
  }
}

/** 删除题目：确认后调用删除接口，并把结果交给父级刷新列表 */
async function remove() {
  if (busy.value) return
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
    await deleteQuestion(props.question.id)
  } catch {
    return
  }

  ElMessage.success(t('search.deleted'))
  emit('deleted')
}

function close() {
  emit('close')
}

/** 弹层期间按 Esc 关闭 */
function onKeydown(event) {
  if (event.key === 'Escape') close()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  loadDetail()
  loadKnowledge()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.qdm-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--c-backdrop);
  backdrop-filter: blur(2px);
}

.qdm-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 760px;
  max-height: 86vh;
  padding: 24px 26px 20px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg), var(--inset-top);
}

.qdm-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.qdm-heading {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.qdm-tag {
  font-family: var(--font-heading);
  font-size: 15px;
  font-weight: 600;
  color: var(--c-dark);
}

.qdm-hint {
  font-family: var(--font-heading);
  font-size: 12px;
  color: var(--c-mid-gray);
}

.qdm-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--c-mid-gray);
  cursor: pointer;
  transition: background 0.2s var(--ease-soft), color 0.2s var(--ease-soft);
}

.qdm-close:hover {
  background: var(--c-hover);
  color: var(--c-dark);
}

/* 右上角：入库时间 + 关闭按钮 */
.qdm-head-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}

.qdm-time {
  font-family: var(--font-heading);
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: var(--c-mid-gray);
  white-space: nowrap;
}

/* 题干顶部一行：学段 / 学科 / 知识点 chips / 选择入口 */
.qdm-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  margin: 10px 0 0;
  font-family: var(--font-heading);
  font-size: 12px;
  color: var(--c-mid-gray);
}

.qdm-meta-text {
  color: var(--c-mid-gray);
}

.qdm-meta-sep {
  color: var(--c-light-gray);
}

.qdm-scroll {
  flex: 1;
  min-height: 0;
  margin: 16px -4px 0;
  padding: 0 4px;
  overflow-y: auto;
}

.qdm-sec + .qdm-sec {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--c-border);
}

.qdm-label {
  margin: 0 0 10px;
  font-family: var(--font-heading);
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--c-mid-gray);
}

/* 知识点 chips 与选择入口，跟在学段、学科同一行 */
.qdm-kp {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  max-width: 100%;
  padding: 3px 9px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-subtle);
  font-family: var(--font-heading);
  font-size: 12px;
  color: var(--c-dark);
}

.qdm-kp.primary {
  border-color: rgba(217, 119, 87, 0.45);
  background: rgba(217, 119, 87, 0.08);
}

.qdm-kp-star {
  font-size: 10px;
  color: var(--c-orange);
}

.qdm-kp-name {
  word-break: break-word;
}

.qdm-kp-add {
  padding: 3px 8px;
  border: 1px dashed rgba(217, 119, 87, 0.45);
  border-radius: 999px;
  background: transparent;
  font-family: var(--font-heading);
  font-size: 11.5px;
  color: var(--c-orange);
  cursor: pointer;
  transition: background 0.2s var(--ease-soft), border-color 0.2s var(--ease-soft);
}

.qdm-kp-add:hover {
  border-color: var(--c-orange);
  background: rgba(217, 119, 87, 0.08);
}

.qdm-stem {
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.9;
  word-break: break-word;
}

.qdm-body {
  min-height: 160px;
  padding: 12px 14px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-subtle);
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.9;
  word-break: break-word;
  outline: none;
  transition: border-color 0.2s var(--ease-soft), box-shadow 0.2s var(--ease-soft);
}

.qdm-body:focus {
  border-color: rgba(217, 119, 87, 0.55);
  box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.12);
}

/* Markdown 排版：题干与分析正文共用同一套块级样式 */
.qdm-stem :deep(p),
.qdm-body :deep(p) {
  margin: 0 0 10px;
}

.qdm-stem :deep(p:last-child),
.qdm-body :deep(p:last-child) {
  margin-bottom: 0;
}

.qdm-stem :deep(h1),
.qdm-stem :deep(h2),
.qdm-stem :deep(h3),
.qdm-stem :deep(h4),
.qdm-body :deep(h1),
.qdm-body :deep(h2),
.qdm-body :deep(h3),
.qdm-body :deep(h4) {
  margin: 0 0 12px;
  font-family: var(--font-heading);
  font-size: 16px;
  font-weight: 600;
}

.qdm-stem :deep(ul),
.qdm-stem :deep(ol),
.qdm-body :deep(ul),
.qdm-body :deep(ol) {
  margin: 0 0 10px;
  padding-left: 20px;
}

.qdm-stem :deep(li),
.qdm-body :deep(li) {
  margin-bottom: 4px;
}

.qdm-stem :deep(table),
.qdm-body :deep(table) {
  width: 100%;
  margin: 12px 0;
  border-collapse: collapse;
}

.qdm-stem :deep(td),
.qdm-stem :deep(th),
.qdm-body :deep(td),
.qdm-body :deep(th) {
  padding: 7px 10px;
  border: 1px solid var(--c-border);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.qdm-stem :deep(th),
.qdm-body :deep(th) {
  background: var(--c-subtle);
  font-family: var(--font-heading);
  font-size: 12.5px;
  font-weight: 600;
}

.qdm-stem :deep(img),
.qdm-body :deep(img) {
  max-width: 100%;
  border-radius: var(--radius-sm);
  border: 1px solid var(--c-border);
  box-shadow: var(--shadow-xs);
}

.qdm-stem :deep(.katex-display),
.qdm-body :deep(.katex-display) {
  margin: 12px 0;
  overflow-x: auto;
  overflow-y: hidden;
}

.qdm-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 0;
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--c-mid-gray);
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--c-light-gray);
  border-top-color: var(--c-orange);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.qdm-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.qdm-del,
.qdm-save {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 18px;
  border-radius: var(--radius-sm);
  font-family: var(--font-heading);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s var(--ease-soft), color 0.2s var(--ease-soft),
    border-color 0.2s var(--ease-soft), opacity 0.2s var(--ease-soft);
}

.qdm-del {
  border: 1px solid var(--c-border);
  background: transparent;
  color: var(--c-mid-gray);
}

.qdm-del:hover:not(:disabled) {
  border-color: rgba(220, 38, 38, 0.35);
  background: var(--c-danger-bg);
  color: var(--c-danger);
}

.qdm-save {
  border: none;
  background: var(--c-orange);
  color: var(--c-on-accent);
}

.qdm-save:hover:not(:disabled) {
  background: var(--c-orange-hover);
}

.qdm-del:disabled,
.qdm-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mini-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: var(--c-on-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
