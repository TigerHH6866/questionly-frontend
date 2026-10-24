<template>
  <aside class="qb">
    <header class="qb-head">
      <div class="qb-tabs">
        <button
          class="qb-tab"
          type="button"
          :class="{ 'is-active': tab === 'analysis' }"
          @click="switchTab('analysis')"
        >
          {{ t('process.tabAnalysis') }}
        </button>
        <button
          v-if="showAnswer"
          class="qb-tab"
          type="button"
          :class="{ 'is-active': tab === 'answer' }"
          @click="switchTab('answer')"
        >
          {{ t('process.tabAnswer') }}
        </button>
        <button
          class="qb-tab"
          type="button"
          :class="{ 'is-active': tab === 'knowledge' }"
          @click="switchTab('knowledge')"
        >
          {{ t('knowledge.relTitle') }}
        </button>
      </div>
      <button
        class="qb-close"
        type="button"
        :title="t('process.close')"
        :aria-label="t('process.close')"
        @click="emit('close')"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
    </header>

    <!-- 元信息：学段 / 学科 / 布鲁姆认知目标 / 难度 四个下拉，自动按分析内容匹配；
         只读模式下仅展示，入库时间保持右对齐 -->
    <div class="qb-meta">
      <select
        v-model="metaStage"
        class="qb-meta-select"
        :class="{ 'is-empty': !metaStage }"
        :disabled="readonly"
        :aria-label="t('questionMeta.stage')"
      >
        <option value="">{{ t('questionMeta.stage') }}</option>
        <option v-for="item in STAGES" :key="item" :value="item">{{ item }}</option>
      </select>
      <select
        v-model="metaSubject"
        class="qb-meta-select"
        :class="{ 'is-empty': !metaSubject }"
        :disabled="readonly"
        :aria-label="t('questionMeta.subject')"
      >
        <option value="">{{ t('questionMeta.subject') }}</option>
        <option v-for="item in SUBJECTS" :key="item" :value="item">{{ item }}</option>
      </select>
      <select
        v-model="metaBloom"
        class="qb-meta-select"
        :class="{ 'is-empty': !metaBloom }"
        :disabled="readonly"
        :aria-label="t('questionMeta.bloom')"
      >
        <option value="">{{ t('questionMeta.bloom') }}</option>
        <option v-for="item in BLOOM_TYPES" :key="item" :value="item">{{ item }}</option>
      </select>
      <select
        v-model="metaDifficulty"
        class="qb-meta-select"
        :class="{ 'is-empty': !metaDifficulty }"
        :disabled="readonly"
        :aria-label="t('questionMeta.difficulty')"
      >
        <option value="">{{ t('questionMeta.difficulty') }}</option>
        <option v-for="item in DIFFICULTIES" :key="item" :value="item">{{ item }}</option>
      </select>
      <span class="qb-meta-time">{{ formatTime(metaCreatedAt) }}</span>
    </div>

    <!-- AI 分析：可编辑正文，与文件解析页一致（v-show 保留切标签前的编辑内容）；
         只读模式下仅展示，不允许修改 -->
    <div
      v-show="tab === 'analysis'"
      ref="analysisRef"
      class="qb-body"
      :class="{ 'is-readonly': readonly }"
      :contenteditable="readonly ? 'false' : 'true'"
      spellcheck="false"
      @input="onAnalysisInput"
    ></div>

    <!-- 答案：默认给 AI 解题入口，生成后转为可编辑正文 -->
    <template v-if="tab === 'answer'">
      <p class="qb-answer-notice">{{ t('process.answerNotice') }}</p>
      <div v-if="solving" class="qb-empty">
        <span class="spinner" aria-hidden="true"></span>
        {{ t('process.answerSolving') }}
      </div>
      <div v-else-if="!hasAnswer" class="qb-empty">
        <button class="qb-solve" type="button" @click="generateAnswer">
          {{ t('process.aiSolve') }}
        </button>
      </div>
      <div
        v-else
        ref="answerRef"
        class="qb-body"
        :class="{ 'is-readonly': readonly }"
        :contenteditable="readonly ? 'false' : 'true'"
        spellcheck="false"
        @input="onAnswerInput"
      ></div>
    </template>

    <!-- 知识点关联：已入库题目直接读写绑定关系，随底部保存一起提交；
         只读模式下仅展示已绑定的知识点 -->
    <div v-else-if="tab === 'knowledge'" class="qb-kp">
      <div v-if="readonly" class="qb-kp-view">
        <p v-if="knowledgeLoading" class="qb-kp-state">{{ t('knowledge.loading') }}</p>
        <p v-else-if="!knowledgeItems.length" class="qb-kp-state">{{ t('knowledge.empty') }}</p>
        <ul v-else class="qb-kp-chips">
          <li
            v-for="item in knowledgeItems"
            :key="item.knowledgeId"
            class="qb-kp-chip"
          >
            <span class="qb-kp-name">{{ item.name }}</span>
            <span class="qb-kp-meta">{{ item.stage }} · {{ item.subject }}</span>
          </li>
        </ul>
      </div>
      <KnowledgePicker
        v-else
        inline
        :question-id="question.id"
        :stage="stage"
        :subject="subject"
        @selected="onKnowledgeSelected"
      />
    </div>

    <div v-if="loading" class="qb-loading">
      <span class="spinner" aria-hidden="true"></span>
      {{ t('process.loading') }}
    </div>

    <footer v-if="!readonly" class="qb-foot">
      <button class="qb-save" type="button" :disabled="busy" @click="save">
        <span v-if="saving" class="mini-spinner" aria-hidden="true"></span>
        {{ saving ? t('process.saving') : t('search.saveEdit') }}
      </button>
    </footer>
  </aside>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import {
  analyzeQuestion,
  getQuestionAnswer,
  getQuestionDetail,
  getQuestionKnowledge,
  updateQuestion
} from '@/api/question'
import KnowledgePicker from '@/components/KnowledgePicker.vue'
import { renderMarkdown } from '@/utils/markdown'
import { hasQuestionImage, snapshotQuestion } from '@/utils/questionSnapshot'
import {
  BLOOM_TYPES,
  DIFFICULTIES,
  STAGES,
  SUBJECTS,
  normalizeBloom,
  normalizeDifficulty,
  normalizeStage,
  normalizeSubject,
  parseQuestionMeta
} from '@/utils/questionMeta'
import { toEditedMarkdown } from '@/utils/editedMarkdown'

const props = defineProps({
  /** 题库列表行：id / title / subject / grade / createdAt */
  question: { type: Object, required: true },
  /** 只读：搜索页复用面板查看分析与答案，但正文不可编辑、不提供保存 */
  readonly: { type: Boolean, default: false },
  /** 是否显示「答案分析」标签页（组卷检索面板只看分析与知识点） */
  showAnswer: { type: Boolean, default: true }
})
const emit = defineEmits(['close', 'updated'])

const { t } = useI18n()

const tab = ref('analysis')
const analysisRef = ref(null)
const answerRef = ref(null)
const loading = ref(true)
const saving = ref(false)
const solving = ref(false)
const hasAnswer = ref(false)
const busy = computed(() => loading.value || saving.value || solving.value)

/** 列表行可能只有 id/title（搜索结果），详情接口拉到后再补齐元信息 */
const metaStage = ref(normalizeStage(props.question.grade))
const metaSubject = ref(normalizeSubject(props.question.subject))
const metaBloom = ref(normalizeBloom(props.question.bloomType))
const metaDifficulty = ref(normalizeDifficulty(props.question.difficulty))
const metaCreatedAt = ref(props.question.createdAt || '')
const stage = computed(() => metaStage.value || '')
const subject = computed(() => metaSubject.value || '')

/** 分析正文的当前 HTML：切标签时保存，切回来原样写回，避免重渲染清空改动 */
let analysisHtml = ''
let answerHtml = ''
let answerLoaded = false
let knowledgeTouched = false
let knowledgeNodes = []
// 只读模式下的知识点展示
const knowledgeItems = ref([])
const knowledgeLoading = ref(false)
let knowledgeLoaded = false

function paint(el, html) {
  if (el) el.innerHTML = html
}

function onAnalysisInput() {
  const el = analysisRef.value
  if (el) analysisHtml = el.innerHTML
}

function onAnswerInput() {
  const el = answerRef.value
  if (el) answerHtml = el.innerHTML
}

/** 打开面板即拉取 AI 分析正文 */
async function loadAnalysis() {
  loading.value = true
  try {
    const detail = await getQuestionDetail(props.question.id)
    analysisHtml = renderMarkdown(detail?.details || '')
    if (detail) {
      // 四个维度以题库里存的值为准；库中为空时再按分析内容匹配
      const parsed = parseQuestionMeta(detail.details || '')
      metaStage.value = normalizeStage(detail.grade) || parsed.stage || metaStage.value
      metaSubject.value = normalizeSubject(detail.subject) || parsed.subject || metaSubject.value
      metaBloom.value = normalizeBloom(detail.bloomType) || parsed.bloomType || ''
      metaDifficulty.value = normalizeDifficulty(detail.difficulty) || parsed.difficulty || ''
      metaCreatedAt.value = detail.createdAt || metaCreatedAt.value
    }
  } catch {
    analysisHtml = ''
  } finally {
    loading.value = false
    await nextTick()
    paint(analysisRef.value, analysisHtml)
  }
}

/** 答案懒加载：首次切到答案标签时从题库读回已保存内容 */
async function loadAnswer() {
  if (answerLoaded) return
  answerLoaded = true
  try {
    const saved = await getQuestionAnswer(props.question.id)
    answerHtml = saved ? renderMarkdown(saved) : ''
    hasAnswer.value = Boolean(saved)
  } catch {
    answerHtml = ''
    hasAnswer.value = false
  }
}

/** 切换面板标签 */
async function switchTab(next) {
  if (tab.value === next) return
  tab.value = next
  if (next === 'answer') {
    if (!answerLoaded) {
      solving.value = true
      await loadAnswer()
      solving.value = false
    }
    await nextTick()
    paint(answerRef.value, answerHtml)
  } else if (next === 'knowledge' && props.readonly) {
    loadKnowledgeView()
  }
}

/** 只读模式：拉取题目已绑定的知识点，仅展示 */
async function loadKnowledgeView() {
  if (knowledgeLoaded) return
  knowledgeLoaded = true
  knowledgeLoading.value = true
  try {
    knowledgeItems.value = (await getQuestionKnowledge(props.question.id)) || []
  } catch {
    knowledgeItems.value = []
  } finally {
    knowledgeLoading.value = false
  }
}

/** AI 解题：按 biz_type=answer 生成答案 */
async function generateAnswer() {
  if (solving.value) return
  solving.value = true
  try {
    const stem = props.question.title || ''
    // 带图题目：先把完整题干（含选项图）合成一张截图交给视觉模型；纯文字题仍只传文本
    let image = null
    if (hasQuestionImage(stem)) {
      try {
        image = await snapshotQuestion(stem)
      } catch {
        // 合成失败退回纯文本，不发残缺图片
        image = null
      }
    }
    const markdown = await analyzeQuestion(stem, 'answer', image)
    answerHtml = renderMarkdown(markdown || '')
    hasAnswer.value = Boolean(markdown)
    // 只读面板没有保存按钮，生成结果直接落库，避免下次打开又要重新解题
    if (props.readonly && markdown) {
      await updateQuestion(props.question.id, undefined, markdown)
      emit('updated')
    }
  } catch {
    // 失败提示由 http 拦截器统一弹出
  } finally {
    solving.value = false
  }
  // 等空态切到正文节点之后再写入，避免 ref 尚不存在导致内容丢失
  await nextTick()
  paint(answerRef.value, answerHtml)
}

/** 内嵌选择器的勾选先暂存，随底部保存一起提交 */
function onKnowledgeSelected(items) {
  knowledgeTouched = true
  knowledgeNodes = (items || []).map((item) => Number(item.knowledgeId))
}

/** 保存：分析正文、答案与知识点随题目一起提交 */
async function save() {
  if (busy.value) return
  const details = analysisRef.value ? toEditedMarkdown(analysisRef.value.innerHTML) : ''
  if (!details) {
    ElMessage.warning(t('search.saveEditEmpty'))
    return
  }

  const answers =
    answerLoaded && hasAnswer.value && answerRef.value
      ? toEditedMarkdown(answerRef.value.innerHTML)
      : undefined

  saving.value = true
  try {
    await updateQuestion(props.question.id, details, answers, {
      grade: metaStage.value,
      subject: metaSubject.value,
      bloomType: metaBloom.value,
      difficulty: metaDifficulty.value,
      knowledgeIds: knowledgeTouched ? knowledgeNodes : undefined
    })
    knowledgeTouched = false
    ElMessage.success(t('search.updated'))
    emit('updated')
  } catch {
    // 失败提示由 http 拦截器统一弹出
  } finally {
    saving.value = false
  }
}

function formatTime(value) {
  if (!value) return ''
  return String(value).replace('T', ' ').slice(0, 16)
}

onMounted(loadAnalysis)
</script>

<style scoped>
/* 右侧分析面板：与文件解析页的面板同宽（768px）同一套结构
   （标签 + 可编辑正文 + 底部保存），窄屏同样整块移到题目列下方 */
.qb {
  position: sticky;
  top: 8px;
  flex: 0 0 768px;
  display: flex;
  flex-direction: column;
  min-height: 420px;
  max-height: calc(100vh - 150px);
  padding: 20px 0 16px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  box-shadow: var(--shadow-md), var(--inset-top);
  overflow: hidden;
}

.qb-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  padding: 0 24px 12px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--c-border);
}

.qb-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
}

.qb-tab {
  height: 28px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: none;
  color: var(--c-mid-gray);
  font-family: var(--font-heading);
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: background 0.2s var(--ease-soft), color 0.2s var(--ease-soft),
    border-color 0.2s var(--ease-soft);
}

.qb-tab:hover {
  color: var(--c-dark);
  background: rgba(217, 119, 87, 0.08);
}

.qb-tab.is-active {
  border-color: rgba(217, 119, 87, 0.28);
  background: rgba(217, 119, 87, 0.12);
  color: var(--c-orange);
}

.qb-close {
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
    color 0.2s var(--ease-soft);
}

.qb-close:hover {
  border-color: rgba(217, 119, 87, 0.55);
  background: rgba(217, 119, 87, 0.08);
  color: var(--c-orange);
}

/* 元信息行：四个下拉（学段 / 学科 / 布鲁姆认知目标 / 难度），右侧入库时间 */
.qb-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
  padding: 0 24px 14px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--c-border);
  font-family: var(--font-heading);
  font-size: 12.5px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--c-mid-gray);
}

.qb-meta-select {
  /* 固定 94px（较等分时的 ~118px 缩小 20%），不随容器宽度拉伸 */
  flex: 0 1 94px;
  min-width: 0;
  height: 30px;
  padding: 0 20px 0 10px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background-color: var(--c-surface);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' fill='none' stroke='%238a8a8a' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 7px center;
  background-size: 10px;
  appearance: none;
  color: var(--c-dark);
  font-family: inherit;
  font-size: 12.5px;
  letter-spacing: 0.02em;
  text-transform: none;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: border-color 0.2s var(--ease-soft), background-color 0.2s var(--ease-soft),
    color 0.2s var(--ease-soft), box-shadow 0.2s var(--ease-soft);
}

.qb-meta-select:hover:not(:disabled) {
  border-color: rgba(217, 119, 87, 0.55);
  background-color: rgba(217, 119, 87, 0.06);
}

.qb-meta-select:focus {
  outline: none;
  border-color: var(--c-orange);
  box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.12);
}

/* 未匹配到（用户尚未选择）时用灰字当作占位 */
.qb-meta-select.is-empty {
  color: var(--c-mid-gray);
}

/* 只读面板：下拉退化成纯文本，仅展示已匹配的值 */
.qb-meta-select:disabled {
  flex: 0 0 auto;
  height: auto;
  padding: 0;
  border-color: transparent;
  background-color: transparent;
  background-image: none;
  color: var(--c-dark);
  cursor: default;
}

.qb-meta-select:disabled.is-empty {
  color: var(--c-mid-gray);
}

.qb-meta-time {
  margin-left: auto;
  letter-spacing: 0.02em;
  text-transform: none;
  font-variant-numeric: tabular-nums;
}

/* 答案正文顶部的免责提示：随标签页常驻，不进入可编辑正文，避免被保存进答案 */
.qb-answer-notice {
  flex: none;
  margin: 10px 24px 0;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--c-subtle);
  color: var(--c-mid-gray);
  font-family: var(--font-body);
  font-size: 12.5px;
  line-height: 1.6;
}

/* 正文：可点击就地编辑，只滚动正文，头部与底部按钮常驻 */
.qb-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 24px;
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.85;
  word-break: break-word;
}

.qb-body:focus {
  outline: none;
  box-shadow: inset 0 0 0 1px rgba(217, 119, 87, 0.22);
}

/* 知识点标签：选择器在面板内就地展开 */
.qb-kp {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 0 24px;
}

/* 只读模式：正文只展示，不可编辑，也没有聚焦反馈 */
.qb-body.is-readonly {
  cursor: default;
}

.qb-body.is-readonly:focus {
  box-shadow: none;
}

/* 知识点只读展示：主知识点描边用主题色 */
.qb-kp-view {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.qb-kp-state {
  margin: 18px 0 0;
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--c-mid-gray);
}

.qb-kp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.qb-kp-chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 13px;
  border: 1px solid var(--c-border);
  border-radius: 12px;
  background: var(--c-surface);
  font-family: var(--font-heading);
  font-size: 12.5px;
  letter-spacing: 0.02em;
  color: var(--c-dark);
}

.qb-kp-meta {
  font-size: 11px;
  color: var(--c-mid-gray);
}

/* 答案空态：AI 解题入口居中 */
.qb-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 24px;
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--c-mid-gray);
}

.qb-solve {
  height: 34px;
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
    box-shadow 0.2s var(--ease-soft);
}

.qb-solve:hover {
  border-color: var(--c-orange-hover);
  background: var(--c-orange-hover);
}

/* 分析正文加载中：浮在正文位置上的轻提示 */
.qb-loading {
  position: absolute;
  inset: 120px 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--c-mid-gray);
}

.qb-foot {
  flex: none;
  display: flex;
  justify-content: flex-end;
  padding: 14px 24px 0;
  margin-top: 12px;
  border-top: 1px solid var(--c-border);
}

.qb-save {
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
    box-shadow 0.2s var(--ease-soft), transform 0.15s var(--ease-out);
}

.qb-save:hover:not(:disabled) {
  border-color: var(--c-orange-hover);
  background: var(--c-orange-hover);
  transform: translateY(-1px);
}

.qb-save:disabled {
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
  border-top-color: var(--c-on-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner {
  width: 13px;
  height: 13px;
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

/* Markdown 排版：与文件解析页的分析正文同一套块级样式 */
.qb-body :deep(p) {
  margin: 0 0 10px;
  /* 保留 AI 分析里用于对齐的连续空格（HTML 默认会折叠） */
  white-space: pre-wrap;
}

.qb-body :deep(p:last-child) {
  margin-bottom: 0;
}

.qb-body :deep(h1),
.qb-body :deep(h2),
.qb-body :deep(h3),
.qb-body :deep(h4) {
  margin: 14px 0 10px;
  font-family: var(--font-heading);
  font-size: 15px;
  font-weight: 600;
  white-space: pre-wrap;
}

.qb-body :deep(h1:first-child),
.qb-body :deep(h2:first-child),
.qb-body :deep(h3:first-child) {
  margin-top: 0;
}

.qb-body :deep(ul),
.qb-body :deep(ol) {
  margin: 0 0 10px;
  padding-left: 20px;
}

.qb-body :deep(li) {
  margin-bottom: 4px;
  white-space: pre-wrap;
}

.qb-body :deep(table) {
  width: 100%;
  margin: 12px 0;
  border-collapse: collapse;
}

.qb-body :deep(th),
.qb-body :deep(td) {
  padding: 7px 10px;
  border: 1px solid var(--c-border);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  white-space: pre-wrap;
}

/* 公式内部恢复默认折叠，避免 KaTeX 标记里的换行/缩进被 pre-wrap 展开 */
.qb-body :deep(.katex) {
  white-space: normal;
}

.qb-body :deep(th) {
  background: var(--c-subtle);
  font-family: var(--font-heading);
  font-size: 12.5px;
  font-weight: 600;
}

.qb-body :deep(img) {
  max-width: 100%;
}

.qb-body :deep(.katex-display) {
  margin: 12px 0;
  overflow-x: auto;
  overflow-y: hidden;
}

/* 与文件解析页一致：窄屏时分析面板移到题目列下方 */
@media (max-width: 1400px) {
  .qb {
    position: static;
    flex: none;
    width: 100%;
    max-height: none;
  }
}
</style>
