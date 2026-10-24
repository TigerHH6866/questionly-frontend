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
      <!-- 返回：投射到顶栏左侧，与组卷编辑页的返回同一位置、同一观感 -->
      <Teleport v-if="topbarLead" :to="topbarLead">
        <button class="back-btn" type="button" @click="goBack">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
            <path
              d="M14.6 5.6 8.2 12l6.4 6.4"
              stroke="currentColor"
              stroke-width="1.9"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>{{ t('common.back') }}</span>
        </button>
      </Teleport>

      <!-- 文件标题卡片：投射到父级顶栏，与页标题同一行、与下方题目区域同一中轴线 -->
      <Teleport v-if="topbarSlot" :to="topbarSlot">
        <header class="head">
          <template v-if="renaming">
            <input
              ref="nameInput"
              v-model="nameDraft"
              class="doc-input"
              maxlength="100"
              :placeholder="t('process.renamePlaceholder')"
              @keydown.enter.prevent="commitRename"
              @keydown.esc.prevent="cancelRename"
              @blur="commitRename"
            />
          </template>
          <span v-else class="doc" :title="t('process.renameHint')" @click="startRename">{{ docName }}</span>
          <span class="counter">{{ t('process.total', { total: questions.length }) }}</span>
        </header>
      </Teleport>

      <div class="q-col">
        <article v-if="questions.length" class="sheet">
          <section
            v-for="(q, i) in questions"
            :key="q.index"
            :data-index="q.index"
            class="q"
            :class="{ 'is-analyzed': q.index === panelIndex }"
          >
            <template v-if="q.active">
              <div class="q-head">
                <div v-if="!single" class="q-tag">{{ t('process.questionLabel', { n: i + 1 }) }}</div>

                <div class="q-tools">
                  <button class="q-tool" type="button" :disabled="i === 0" @click="mergeUp(q.index)">
                    {{ t('process.mergeUp') }}
                  </button>

                  <!-- 编辑：图标按钮，编辑中切换为「完成」语义（主色实底 + 再点一次退出） -->
                  <button
                    class="q-tool is-icon"
                    type="button"
                    :class="{ 'is-on': q.index === editingIndex }"
                    :title="q.index === editingIndex ? t('process.editDone') : t('process.edit')"
                    :aria-label="q.index === editingIndex ? t('process.editDone') : t('process.edit')"
                    @click="q.index === editingIndex ? stopEdit() : startEdit(q.index)"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                      <path
                        d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
                        stroke="currentColor"
                        stroke-width="1.7"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>

                  <!-- 删除：从处理页移除本题，仅记入草稿，不动 full.md -->
                  <button
                    class="q-tool is-icon is-danger"
                    type="button"
                    :title="t('process.delete')"
                    :aria-label="t('process.delete')"
                    @click="removeQuestion(q.index)"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                      <path
                        d="M3.6 6.4h16.8M9 6.4V4.6a1.4 1.4 0 0 1 1.4-1.4h3.2A1.4 1.4 0 0 1 15 4.6v1.8m2.6 0v12.6a1.8 1.8 0 0 1-1.8 1.8H8.2a1.8 1.8 0 0 1-1.8-1.8V6.4M10.3 10.6v6M13.7 10.6v6"
                        stroke="currentColor"
                        stroke-width="1.7"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                </div>

                <div class="q-actions">
                  <button class="copy-latex" type="button" @click="copyLatex(q.index)">
                    {{ t('process.copyLatex') }}
                  </button>
                  <button
                    class="analyze"
                    type="button"
                    :disabled="busy && analyzingIndex !== q.index"
                    @click="q.saved ? viewBankInfo(q.index) : analyze(q.index)"
                  >
                    <span v-if="analyzingIndex === q.index" class="mini-spinner" aria-hidden="true"></span>
                    <!-- 已入库：文案左侧加绿色圆圈打勾 -->
                    <svg v-else-if="q.saved" class="bank-check" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" fill="#16a34a" />
                      <path
                        d="M7.4 12.5l3 3 6.2-6.6"
                        fill="none"
                        stroke="#fff"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                    {{ analyzingIndex === q.index
                      ? t('process.analyzing')
                      : q.saved
                        ? t('process.bankInfo')
                        : q.analyzed
                          ? t('process.viewAnalysis')
                          : t('process.analyze') }}
                  </button>
                </div>
              </div>
              <!-- 编辑态手动写 innerHTML（内容会随编辑实时变化），非编辑态交给 v-html -->
              <div
                v-if="q.index !== editingIndex"
                class="q-body"
                v-html="q.html"
              ></div>
              <div
                v-else
                :ref="setEditBody"
                class="q-body q-editing"
                contenteditable="true"
                spellcheck="false"
                @input="onEditInput"
                @keydown="onEditKeydown"
                @mouseup="onEditMouseup"
                @keyup="onEditKeyup"
              ></div>
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
          <div class="panel-tabs">
            <button
              class="panel-tab"
              type="button"
              :class="{ 'is-active': panelTab === 'analysis' }"
              @click="switchTab('analysis')"
            >
              {{ t('process.tabAnalysis') }}
            </button>
            <button
              class="panel-tab"
              type="button"
              :class="{ 'is-active': panelTab === 'answer' }"
              @click="switchTab('answer')"
            >
              {{ t('process.tabAnswer') }}
            </button>
            <button
              class="panel-tab"
              type="button"
              :class="{ 'is-active': panelTab === 'knowledge' }"
              @click="switchTab('knowledge')"
            >
              {{ t('knowledge.relTitle') }}
            </button>
          </div>
          <span class="panel-q">{{ t('process.questionLabel', { n: noOf(panelIndex) }) }}</span>
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

        <!-- 元信息：学段 / 学科 / 布鲁姆认知目标 / 难度 四个下拉，按 AI 分析内容自动匹配；
             匹配不到留空，由用户自行选择，随「存入题库 / 更新题库」一起落库 -->
        <div class="panel-meta">
          <select
            v-model="metaStage"
            class="panel-meta-select"
            :class="{ 'is-empty': !metaStage }"
            :aria-label="t('questionMeta.stage')"
          >
            <option value="">{{ t('questionMeta.stage') }}</option>
            <option v-for="item in STAGES" :key="item" :value="item">{{ item }}</option>
          </select>
          <select
            v-model="metaSubject"
            class="panel-meta-select"
            :class="{ 'is-empty': !metaSubject }"
            :aria-label="t('questionMeta.subject')"
          >
            <option value="">{{ t('questionMeta.subject') }}</option>
            <option v-for="item in SUBJECTS" :key="item" :value="item">{{ item }}</option>
          </select>
          <select
            v-model="metaBloom"
            class="panel-meta-select"
            :class="{ 'is-empty': !metaBloom }"
            :aria-label="t('questionMeta.bloom')"
          >
            <option value="">{{ t('questionMeta.bloom') }}</option>
            <option v-for="item in BLOOM_TYPES" :key="item" :value="item">{{ item }}</option>
          </select>
          <select
            v-model="metaDifficulty"
            class="panel-meta-select"
            :class="{ 'is-empty': !metaDifficulty }"
            :aria-label="t('questionMeta.difficulty')"
          >
            <option value="">{{ t('questionMeta.difficulty') }}</option>
            <option v-for="item in DIFFICULTIES" :key="item" :value="item">{{ item }}</option>
          </select>
        </div>

        <!-- AI 分析：可编辑的分析正文 -->
        <div
          v-if="panelTab === 'analysis'"
          ref="panelBodyRef"
          class="panel-body"
          contenteditable="true"
          spellcheck="false"
          @input="onPanelInput"
        ></div>

        <!-- 答案分析：默认空态给 AI 解题入口，生成后转为可编辑正文 -->
        <template v-else-if="panelTab === 'answer'">
          <p class="answer-notice">{{ t('process.answerNotice') }}</p>
          <div v-if="!hasAnswer" class="answer-empty">
            <button class="answer-action" type="button" :disabled="solvingIndex >= 0" @click="generateAnswer">
              <span v-if="solvingIndex >= 0" class="mini-spinner" aria-hidden="true"></span>
              {{ solvingIndex >= 0 ? t('process.answerSolving') : t('process.aiSolve') }}
            </button>
          </div>
          <div
            v-else
            ref="answerBodyRef"
            class="panel-body"
            contenteditable="true"
            spellcheck="false"
            @input="onAnswerInput"
          ></div>
        </template>

        <!-- 知识点关联：独立标签，学段/学科按 AI 分析自动装填，知识点直接平铺可选 -->
        <div v-else class="kp-tab">
          <p v-if="panelQuestion && !panelQuestion.saved" class="kp-tab-hint">
            {{ t('knowledge.unsavedHint') }}
          </p>
          <KnowledgePicker
            inline
            :question-id="panelQuestion?.questionId || ''"
            :stage="pickerStage"
            :subject="pickerSubject"
            :local="!panelQuestion?.saved"
            :initial="panelKnowledge"
            @selected="onKnowledgeSelected"
          />
        </div>

        <div class="panel-foot">
          <button class="save-bank" type="button" :disabled="saving" @click="saveToBank">
            <span v-if="saving" class="mini-spinner" aria-hidden="true"></span>
            {{ saving
              ? t('process.saving')
              : panelQuestion?.saved
                ? t('process.updateBank')
                : t('process.saveToBank') }}
          </button>
        </div>
      </aside>
    </template>

    <!-- 划词浮窗：只改样式，不动内容；mousedown 阻止默认以免选区在点击时丢失 -->
    <div
      v-if="selVisible"
      class="fmt-pop"
      :style="{ left: selPos.x + 'px', top: selPos.y + 'px' }"
      @mousedown.prevent
    >
      <button class="fmt-btn" type="button" @mousedown.prevent="applyUnderline">
        {{ t('process.fmtUnderline') }}
      </button>
      <button class="fmt-btn" type="button" @mousedown.prevent="applyDot">
        {{ t('process.fmtDot') }}
      </button>
      <button class="fmt-btn is-italic" type="button" @mousedown.prevent="applyItalic">
        {{ t('process.fmtItalic') }}
      </button>
      <button class="fmt-btn is-bold" type="button" @mousedown.prevent="applyBold">
        {{ t('process.fmtBold') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, nextTick, onBeforeUnmount, onMounted, onUpdated, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getTaskResult, renameOcrTask, saveTaskDraft } from '@/api/ocr'
import {
  analyzeQuestion,
  saveQuestion,
  updateQuestion,
  getImportedQuestions,
  getQuestionDetail,
  getQuestionAnswer,
  getQuestionKnowledge,
} from '@/api/question'
import {
  toBlocks,
  splitQuestions,
  renderQuestion,
  questionMarkdown,
  questionLatex,
  editedHtmlToLatex,
  absolutizeImages
} from '@/utils/document'
import { renderMarkdown } from '@/utils/markdown'
import {
  BLOOM_TYPES,
  DIFFICULTIES,
  STAGES,
  SUBJECTS,
  normalizeBloom,
  normalizeDifficulty,
  normalizeStage,
  normalizeSubject as normalizeMetaSubject,
  parseQuestionMeta
} from '@/utils/questionMeta'
import { toEditedMarkdown, toQuestionMarkdown } from '@/utils/editedMarkdown'
import { saveProcessState, getProcessState } from '@/utils/importSession'
import KnowledgePicker from '@/components/KnowledgePicker.vue'

const props = defineProps({ id: { type: String, required: true } })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

/** 顶栏操作插槽节点（由 App.vue 提供）：文件标题卡片投射到那里，与页标题同一行 */
const topbarSlot = inject('topbarSlot', null)
/** 顶栏左侧插槽：返回入口投射到那里，与其它页面的返回按钮同一位置 */
const topbarLead = inject('topbarLead', null)

/**
 * 返回：从「我的文件」进来的按来源标记回到该列表（含标签），
 * 其它入口（导入后的跳转、侧栏近期文件、任务列表）按浏览器历史回退，无历史时兜底回列表
 */
function goBack() {
  if (route.query.from === 'resources') {
    router.push('/app/resources?tab=files')
    return
  }
  if (window.history.state && window.history.state.back) router.back()
  else router.push('/app/resources?tab=files')
}

const loading = ref(false)
const failed = ref(false)
const docName = ref('')
const imagesBase = ref('')
const questions = ref([])
/** 文件名就地编辑：进入编辑态、草稿值与输入框引用 */
const renaming = ref(false)
const nameDraft = ref('')
const nameInput = ref(null)
const savingName = ref(false)

/** 点击文件名进入编辑态，自动聚焦并全选，便于直接覆盖输入 */
async function startRename() {
  if (!docName.value) return
  nameDraft.value = docName.value
  renaming.value = true
  await nextTick()
  nameInput.value?.focus()
  nameInput.value?.select()
}

function cancelRename() {
  renaming.value = false
  nameDraft.value = docName.value
}

/** 回车或失焦时自动保存；内容未变化则直接退出编辑态 */
async function commitRename() {
  if (!renaming.value || savingName.value) return
  const next = nameDraft.value.trim()
  renaming.value = false
  if (!next) {
    nameDraft.value = docName.value
    ElMessage.warning(t('process.renameEmpty'))
    return
  }
  if (next === docName.value) return
  savingName.value = true
  try {
    await renameOcrTask(props.id, next)
    docName.value = next
    ElMessage.success(t('process.renameSaved'))
  } catch {
    nameDraft.value = docName.value
  } finally {
    savingName.value = false
  }
}
/** 全文作为单一题目兜底（未识别到题号）时，不显示题号标签 */
const single = ref(true)

/** 正在请求分析的题号，-1 表示无请求 */
const analyzingIndex = ref(-1)
/** 右侧面板展示的题号，-1 表示未展开 */
const panelIndex = ref(-1)
const panelHtml = ref('')

/** 面板顶部四个元信息下拉：按 AI 分析内容匹配，匹配不到留空由用户选择 */
const metaStage = ref('')
const metaSubject = ref('')
const metaBloom = ref('')
const metaDifficulty = ref('')
/** 已匹配过元信息的题号，同一题重新打开时保留用户的手动选择 */
let metaIndex = -1
/** 打开面板时的四维元信息快照，用于判断用户是否只改了下拉菜单 */
let metaSnapshot = { stage: '', subject: '', bloom: '', difficulty: '' }

/** 面板当前标签：analysis=AI 分析 / answer=答案分析 */
const panelTab = ref('analysis')
/** 题目答案缓存：题号 -> Markdown（AI 解题或人工录入） */
const answerCache = reactive(new Map())
/** 答案面板里就地编辑后的 HTML：题号 -> HTML */
const answerEdit = reactive(new Map())
/** 已从题库读过答案的题号，避免切标签时反复请求 */
const answerLoaded = new Set()
/** 答案正文节点，读取编辑结果用 */
const answerBodyRef = ref(null)
/** 正在 AI 解题的题号，-1 表示无请求 */
const solvingIndex = ref(-1)

const busy = computed(() => analyzingIndex.value >= 0)

/** 题数不超过该值一次性渲染；超过则滚动到附近再渲染 */
const LAZY_THRESHOLD = 10
/** 视口外提前渲染的距离，避免滚动时出现明显空白 */
const PRELOAD_MARGIN = '1200px 0px'

const rootRef = ref(null)

let observer = null

/** 已分析过的题目结果缓存：题号 -> Markdown */
const analysisCache = new Map()

/** 已入库题目的入库信息缓存：题号 -> 题库中的 details */
const bankCache = new Map()

/** 用户在面板里就地编辑后的 HTML 缓存：题号 -> HTML（未编辑过的题号不在其中） */
const editCache = new Map()

/** 面板正文节点，读取编辑结果用 */
const panelBodyRef = ref(null)
/** 正在入库 */
const saving = ref(false)
/** 当前面板对应的题目 */
const panelQuestion = computed(() => questionOf(panelIndex.value))

/** 当前面板的题目是否已有答案内容（含「手动输入」进入的空编辑态） */
const hasAnswer = computed(() => {
  const index = panelIndex.value
  return index >= 0 && (answerCache.has(index) || answerEdit.has(index))
})

/** 知识点标签的默认筛选与已选知识点 */
const pickerStage = ref('')
const pickerSubject = ref('')
const panelKnowledge = ref([])
/** 题目尚未入库时的知识点预选：题号 -> 选择结果 */
const knowledgePending = new Map()
/** 打开过知识点标签的题号：入库/更新时把当前选择一并提交 */
const knowledgeTouched = new Set()

/**
 * 从 AI 分析 Markdown 中取年级 / 科目，规则与后端 QuestionService.extractLabel 一致：
 * 形如「## 2. 年级」下一行的取值，或「科目：数学」写在标题行内。
 */
function extractLabel(markdown, ...keywords) {
  const lines = (markdown || '').split(/\r?\n/)
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim()
    if (!line.startsWith('#')) continue
    const heading = line
      .replace(/^#+\s*/, '')
      .replace(/^[\d一二三四五六七八九十]+[.、．]?\s*/, '')
    for (const keyword of keywords) {
      const at = heading.indexOf(keyword)
      if (at < 0) continue
      const inline = heading
        .slice(at + keyword.length)
        .replace(/^[：:—\-–\s]+/, '')
        .trim()
      if (inline) return cleanLabel(inline)
      for (let j = i + 1; j < lines.length; j += 1) {
        const value = lines[j].trim()
        if (!value) continue
        if (value.startsWith('#')) break
        return cleanLabel(value)
      }
    }
  }
  return ''
}

function cleanLabel(raw) {
  return raw
    .replace(/[（(].*$/, '')
    .replace(/[*_`~]/g, '')
    .replace(/^[-•·\s]+/, '')
    .replace(/[。.;；,，]+$/, '')
    .trim()
}

/** 年级文本归到知识点的三个学段 */
function stageOf(grade) {
  if (/小学|[一二三四五六]年级/.test(grade)) return '小学'
  if (/初中|初[一二三]|[七八九]年级/.test(grade)) return '初中'
  if (/高中|高[一二三]/.test(grade)) return '高中'
  return ''
}

/** AI 报告里的学科写法归一为题库学科名（如思想政治→政治、信息科技→信息技术） */
function normalizeSubject(raw, stage) {
  const value = (raw || '').replace(/^(小学|初中|高中)/, '').trim()
  if (!value) return ''
  if (stage === '高中') {
    if (/思想政治|思想品德|政治|道德与法治|道法/.test(value)) return '政治'
    return value
  }
  if (stage === '初中') {
    if (/思想政治|思想品德|政治|道德与法治|道法/.test(value)) return '道德与法治'
    if (/信息科技|信息技术|计算机/.test(value)) return '信息技术'
    return value
  }
  if (/信息科技|信息技术|计算机/.test(value)) return '信息技术'
  if (/品德|道法/.test(value)) return '道德与法治'
  return value
}

/** 当前面板题目在 AI 分析报告里的学段 / 学科，用于选择器默认值 */
function analysisMeta(index) {
  const markdown = analysisCache.get(index) || bankCache.get(index) || ''
  const stage = stageOf(extractLabel(markdown, '学段', '年级'))
  return {
    stage,
    subject: normalizeSubject(extractLabel(markdown, '科目', '学科'), stage)
  }
}

/** 已入库题目还没读过分析正文时补拉一次，供学段/学科自动装填 */
async function ensureAnalysisText(index) {
  const question = questionOf(index)
  if (!question?.saved || !question.questionId) return
  if (analysisCache.has(index) || bankCache.has(index)) return
  try {
    const detail = await getQuestionDetail(question.questionId)
    bankCache.set(index, detail?.details || '')
  } catch {
    // 分析正文只是默认值的来源，取不到不阻塞知识点选择
  }
}

/** 载入当前面板题目的知识点：已入库走接口，未入库读本地预选 */
async function loadPanelKnowledge(index = panelIndex.value) {
  if (index < 0) {
    panelKnowledge.value = []
    return
  }
  const question = questionOf(index)
  if (!question) {
    panelKnowledge.value = []
    return
  }
  // 已有改动但还没随入库提交的选择，以本地暂存为准，避免切换标签后丢失
  if (knowledgePending.has(index)) {
    panelKnowledge.value = knowledgePending.get(index) || []
    return
  }
  if (question.saved && question.questionId) {
    await ensureAnalysisText(index)
    try {
      panelKnowledge.value = (await getQuestionKnowledge(question.questionId)) || []
    } catch {
      panelKnowledge.value = []
    }
    return
  }
  panelKnowledge.value = []
}

/** 打开知识点标签前先备好学段/学科与已选：学段/学科取自 AI 分析报告 */
async function prepareKnowledgeTab() {
  const index = panelIndex.value
  if (index < 0) return
  await ensureAnalysisText(index)
  const meta = analysisMeta(index)
  pickerStage.value = meta.stage
  pickerSubject.value = meta.subject
  await loadPanelKnowledge(index)
}

/** 内嵌选择器的勾选实时同步到这里，等底部「存入题库 / 更新题库」时统一提交 */
function onKnowledgeSelected(items) {
  const index = panelIndex.value
  if (index < 0) return
  knowledgeTouched.add(index)
  knowledgePending.set(index, items || [])
  panelKnowledge.value = items || []
}

/** 该题当前勾选的知识点 ID，随「存入题库 / 更新题库」一起提交 */
function knowledgeIdsOf(index) {
  const items = knowledgePending.get(index) || panelKnowledge.value || []
  return items.map((item) => Number(item.knowledgeId))
}

/** 正在编辑的题号（稳定 ocrIndex），-1 表示没有题目处于编辑态 */
const editingIndex = ref(-1)
/** 编辑态正文节点：用户就在这个节点里改，手动写 innerHTML，不挂 v-html 绑定 */
let editBodyRef = null
/** 本次编辑是否真的改过内容，退出编辑时据此决定要不要落快照 */
let dirtyEdit = false
/** 划词浮窗 */
const selVisible = ref(false)
const selPos = ref({ x: 0, y: 0 })
/** 浮窗对应的选区，点浮窗按钮前用它把选区恢复回来 */
let selRange = null
/** 已提示过「编辑结果不回写题库」的题号，避免反复弹同样的提示 */
const savedEditTipShown = new Set()

/** 按题号（稳定 ocrIndex）找题目：合并 / 拆分后数组顺序会变，不能再用下标定位 */
function questionOf(index) {
  return questions.value.find((question) => question.index === index) || null
}

/** 题号标签显示的是页面上的位次，而不是稳定标识 */
function noOf(index) {
  return questions.value.findIndex((question) => question.index === index) + 1
}

/** 题目当前 HTML：编辑过用编辑态快照，否则按块渲染；表格里的相对图片统一补全为 OSS 地址 */
function htmlOf(question) {
  const html = question.editedHtml || renderQuestion(question.blocks, imagesBase.value)
  return absolutizeImages(html, imagesBase.value)
}

/** 题目当前 Markdown：编辑过从快照反推，否则走原有的块转换 */
function markdownOf(question) {
  return question.editedHtml
    ? toQuestionMarkdown(question.editedHtml)
    : questionMarkdown(question.blocks, imagesBase.value)
}

/** 题目当前 LaTeX：编辑过从快照反推，否则走原有的块转换 */
function latexOf(question) {
  return question.editedHtml
    ? editedHtmlToLatex(question.editedHtml)
    : questionLatex(question.blocks, imagesBase.value)
}

/** 拆分新建题目时用的题号标识：取当前最大值 +1，避免与已入库题号撞车 */
function nextOcrIndex() {
  return questions.value.reduce((max, question) => Math.max(max, question.index), -1) + 1
}

/** 草稿上报的节流句柄 */
let draftTimer = null

/**
 * 草稿内容：只记录「题目顺序 + 每题由哪些原始题拼成 + 题干编辑快照 + 入库题目 ID」。
 * 未编辑过的题干仍从 full.md 的原始块取，因此草稿不会污染解析结果。
 */
function draftPayload() {
  return JSON.stringify({
    v: 1,
    single: single.value,
    items: questions.value.map((question) => ({
      i: question.index,
      s: question.source,
      h: question.editedHtml || '',
      qid: question.questionId || ''
    }))
  })
}

/** 标记草稿有改动，节流上报，避免连续编辑时频繁请求 */
function markDraftDirty() {
  if (draftTimer) clearTimeout(draftTimer)
  draftTimer = setTimeout(pushDraft, 600)
}

/** 立即上报草稿（离开页面时也会调用，保证待上报的改动不丢） */
async function pushDraft() {
  if (draftTimer) {
    clearTimeout(draftTimer)
    draftTimer = null
  }
  try {
    await saveTaskDraft(props.id, draftPayload())
  } catch {
    // 失败提示由 http 拦截器统一弹出
  }
}

/**
 * 还原服务端草稿。草稿只描述顺序、块归属与编辑快照，原始题干仍来自 full.md：
 * 没编辑过的题照旧按块渲染，编辑过的题用 HTML 快照，与本次处理页的渲染策略一致。
 * items 为空数组表示本题被逐题删光了，同样按草稿为准（只有草稿串为空才算「没有草稿」）。
 */
function applyDraft(raw, parsed) {
  if (!raw) return
  let draft = null
  try {
    draft = JSON.parse(raw)
  } catch {
    // 草稿损坏时按原始解析结果展示，不阻塞页面
    return
  }
  if (!draft || !Array.isArray(draft.items)) return

  const blocksOf = new Map(parsed.questions.map((question) => [question.index, question.blocks]))
  const restored = draft.items.map((item) => {
    // 合并过的题目由多道原始题的块拼成，拆出来的题目内容只存在于编辑快照里
    const source = item.s || [item.i]
    return {
      index: item.i,
      blocks: source.flatMap((index) => blocksOf.get(index) || []),
      source,
      editedHtml: hasVisibleContent(item.h) ? item.h : '',
      // 该题已入库时的题库题目 ID，打开文件时校验是否仍有效
      questionId: item.qid || null,
      html: '',
      active: false,
      analyzed: false,
      saved: false
    }
  })

  questions.value = restored
  single.value = Boolean(draft.single)
}

function activate(index) {
  const question = questionOf(index)
  if (!question || question.active) return
  question.active = true
  question.html = htmlOf(question)
}

function showPanel(index, markdown, detail) {
  panelIndex.value = index
  panelTab.value = 'analysis'
  // 四维元信息：已入库以库里存的值为准，未入库或库中为空时按分析内容匹配
  if (metaIndex !== index) {
    const parsed = parseQuestionMeta(markdown)
    metaStage.value = normalizeStage(detail?.grade) || parsed.stage || ''
    metaSubject.value = normalizeMetaSubject(detail?.subject) || parsed.subject || ''
    metaBloom.value = normalizeBloom(detail?.bloomType) || parsed.bloomType || ''
    metaDifficulty.value = normalizeDifficulty(detail?.difficulty) || parsed.difficulty || ''
    metaIndex = index
    metaSnapshot = {
      stage: metaStage.value,
      subject: metaSubject.value,
      bloom: metaBloom.value,
      difficulty: metaDifficulty.value
    }
  }
  // 编辑过的题目直接用编辑缓存还原，未编辑过的重新渲染 Markdown
  panelHtml.value = editCache.has(index) ? editCache.get(index) : renderMarkdown(markdown)
  nextTick(syncPanelBody)
}

/**
 * 面板正文手动写入 innerHTML，不挂 v-html 绑定。
 * 用户就在这个节点里编辑，而 v-html 会在父组件任意一次重渲染时重新赋值并清空改动。
 */
function syncPanelBody() {
  const el = panelBodyRef.value
  if (el && panelIndex.value >= 0) el.innerHTML = panelHtml.value
}

function closePanel() {
  panelIndex.value = -1
  panelHtml.value = ''
  panelKnowledge.value = []
  metaIndex = -1
}

/** 面板里就地编辑：只写缓存、不回写 panelHtml，避免重渲染打断光标 */
function onPanelInput() {
  const el = panelBodyRef.value
  if (!el || panelIndex.value < 0) return
  editCache.set(panelIndex.value, el.innerHTML)
}

/** 切换面板标签：AI 分析 / 答案分析 / 知识点关联 */
async function switchTab(tab) {
  if (panelTab.value === tab) return
  if (tab === 'knowledge') await prepareKnowledgeTab()
  panelTab.value = tab
  await nextTick()
  if (tab === 'answer') await openAnswer()
  else if (tab === 'analysis') syncPanelBody()
}

/**
 * 打开答案标签：已有答案（含编辑态）直接展示；
 * 已入库且没读过时，从题库读回已保存的答案；仍无答案则展示空态两个入口
 */
async function openAnswer() {
  const index = panelIndex.value
  if (index < 0) return
  if (!answerCache.has(index) && !answerEdit.has(index)) {
    const question = questionOf(index)
    if (question?.saved && question.questionId && !answerLoaded.has(index)) {
      answerLoaded.add(index)
      try {
        const saved = await getQuestionAnswer(question.questionId)
        if (saved) answerCache.set(index, saved)
      } catch {
        // 答案只是辅助信息，取不到不阻塞，按空态展示
      }
    }
  }
  await nextTick()
  syncAnswerBody()
}

/** 答案正文手动写入 innerHTML（与 AI 分析面板同策略，避免重渲染打断光标） */
function syncAnswerBody() {
  const el = answerBodyRef.value
  const index = panelIndex.value
  if (!el || index < 0) return
  el.innerHTML = answerEdit.has(index) ? answerEdit.get(index) : renderMarkdown(answerCache.get(index) || '')
}

/** 答案面板里就地编辑：只写缓存 */
function onAnswerInput() {
  const el = answerBodyRef.value
  const index = panelIndex.value
  if (!el || index < 0) return
  answerEdit.set(index, el.innerHTML)
}

/** AI 解题：按 biz_type=answer 调 LLM 生成答案并展示 */
async function generateAnswer() {
  const index = panelIndex.value
  const question = questionOf(index)
  if (!question || solvingIndex.value >= 0) return
  // 题干可能正在编辑，先把编辑态写回模型，保证解的是最新内容
  commitEdit()

  solvingIndex.value = index
  try {
    const markdown = await analyzeQuestion(markdownOf(question), 'answer')
    answerCache.set(index, markdown || '')
    answerEdit.delete(index)
    await nextTick()
    syncAnswerBody()
  } catch {
    // 失败提示由 http 拦截器统一弹出，这里只恢复按钮状态
  } finally {
    solvingIndex.value = -1
  }
}

/** 取当前题目的答案 Markdown：编辑过从 HTML 反推，否则用缓存原文 */
function answerValueOf(index) {
  if (answerEdit.has(index)) return toEditedMarkdown(answerEdit.get(index))
  return answerCache.get(index) || ''
}

/**
 * 保存：题干用题干 Markdown、分析结果用 AI 分析 Markdown、答案用答案 Markdown。
 * 未入库时写入 questions 表（含 answers）；已入库时按题目 ID 更新分析结果与答案。
 */
async function saveToBank() {
  const index = panelIndex.value
  const question = questionOf(index)
  if (!question || saving.value) return
  // 题干可能正在编辑，先把编辑态写回模型，保证保存的是最新内容
  commitEdit()

  const edited = editCache.get(index)
  const details = edited ? toEditedMarkdown(edited) : analysisCache.get(index) || ''
  const answers = answerValueOf(index)
  // 只改了四个元信息下拉或知识点也算有效修改（已入库题目可直接更新）
  const knowledgeChanged = knowledgeTouched.has(index)
  const metaChanged = metaStage.value !== metaSnapshot.stage
    || metaSubject.value !== metaSnapshot.subject
    || metaBloom.value !== metaSnapshot.bloom
    || metaDifficulty.value !== metaSnapshot.difficulty
    || knowledgeChanged
  if (!details && !answers && !metaChanged) {
    ElMessage.warning(t('process.saveEmpty'))
    return
  }

  saving.value = true
  try {
    const meta = {
      grade: metaStage.value,
      subject: metaSubject.value,
      bloomType: metaBloom.value,
      difficulty: metaDifficulty.value
    }
    if (question.saved && question.questionId) {
      // 已入库：更新分析结果、答案与知识点（未改动的参数传 undefined 表示保持不变）
      await updateQuestion(question.questionId, details || undefined, answers || undefined, {
        ...meta,
        knowledgeIds: knowledgeChanged ? knowledgeIdsOf(index) : undefined
      })
      knowledgePending.delete(index)
      knowledgeTouched.delete(index)
      bankCache.delete(index)
      ElMessage.success(t('process.updated'))
    } else {
      // 返回题目在题库中的雪花 ID（已入库则返回已有 ID），写进模型并落草稿
      const id = await saveQuestion(markdownOf(question), details, answers, props.id, question.index, {
        ...meta,
        knowledgeIds: knowledgeIdsOf(index)
      })
      question.questionId = id
      question.saved = true
      knowledgePending.delete(index)
      knowledgeTouched.delete(index)
      markDraftDirty()

      ElMessage.success(t('process.saved'))
      // 入库一道题消耗一份题目额度，同步账号胶囊里的余额
      window.dispatchEvent(new CustomEvent('questionly:credits-refresh'))
    }
    // 保存成功后同步元信息快照，避免再次点击时把「已保存」误判成没有修改
    metaSnapshot = {
      stage: metaStage.value,
      subject: metaSubject.value,
      bloom: metaBloom.value,
      difficulty: metaDifficulty.value
    }
  } catch {
    // 失败提示由 http 拦截器统一弹出
  } finally {
    saving.value = false
  }
}

/**
 * 回显入库状态：拉取该文件已入库的题目（题号 + 题目 ID）。
 * 草稿里存了题目 ID 的题以 ID 为准校验是否仍有效（题库里查不到即视为已删除），
 * 只存了题号的旧草稿则按题号兜底命中并顺手补上题目 ID。
 */
async function loadImported() {
  try {
    const loaded = await getImportedQuestions(props.id)
    const idSet = new Set()
    const idOfIndex = new Map()
    ;(loaded || []).forEach((item) => {
      idSet.add(String(item.questionId))
      idOfIndex.set(item.index, String(item.questionId))
    })

    let dirty = false
    questions.value.forEach((question) => {
      const id = question.questionId ? String(question.questionId) : ''
      if (id) {
        if (idSet.has(id)) {
          question.saved = true
        } else {
          // 草稿里的题目已被从题库删除，清掉标记
          question.saved = false
          question.questionId = null
          dirty = true
        }
        return
      }
      const mapped = idOfIndex.get(question.index)
      if (mapped) {
        question.saved = true
        question.questionId = mapped
        dirty = true
      } else {
        question.saved = false
      }
    })
    if (dirty) markDraftDirty()
    if (panelIndex.value >= 0 && panelTab.value === 'answer') reloadPanelKnowledge()
  } catch {
    // 入库状态只是辅助信息，取不到不阻塞页面
  }
}

/** 查看已入库题目的入库信息：按题目 ID 取题库 details，展示在右侧面板 */
async function viewBankInfo(index) {
  if (busy.value) return
  const question = questionOf(index)
  if (!question || !question.questionId) return
  commitEdit()

  const cached = bankCache.get(index)
  if (cached) {
    showPanel(index, cached)
    return
  }

  analyzingIndex.value = index
  try {
    const detail = await getQuestionDetail(question.questionId)
    const markdown = detail?.details || ''
    bankCache.set(index, markdown)
    showPanel(index, markdown, detail)
  } catch {
    // 失败提示由 http 拦截器统一弹出
  } finally {
    analyzingIndex.value = -1
  }
}

async function analyze(index) {
  if (busy.value) return
  const question = questionOf(index)
  if (!question) return
  // 题干可能正在编辑，先把编辑态写回模型，保证分析的是最新内容
  commitEdit()

  // 已分析过的题目直接复用缓存，不再请求接口
  const cached = analysisCache.get(index)
  if (cached) {
    showPanel(index, cached)
    return
  }

  analyzingIndex.value = index
  try {
    const markdown = await analyzeQuestion(markdownOf(question))
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
  const question = questionOf(index)
  if (!question) return
  // 题干可能正在编辑，先把编辑态写回模型，保证复制的是最新内容
  commitEdit()
  const latex = latexOf(question)
  const ok = await writeClipboard(latex)
  if (ok) ElMessage.success(t('process.copied'))
  else ElMessage.error(t('process.copyFailed'))
}

/** 取节点所属元素，选区端点可能是文本节点 */
function elOf(node) {
  return node.nodeType === 1 ? node : node.parentElement
}

/** 摘掉包裹节点，保留其中的内容（取消着重号时用） */
function unwrap(el) {
  const parent = el.parentNode
  if (!parent) return
  while (el.firstChild) parent.insertBefore(el.firstChild, el)
  parent.removeChild(el)
}

/** 编辑态正文节点的函数式 ref：放在 v-for 里用模板 ref 会收集成数组 */
function setEditBody(el) {
  editBodyRef = el
}

/**
 * 编辑后的正文是否还有可见内容：只剩 <br> / 空白 / 空段落时视为空。
 * 删除或剪切把内容清光时，不能把空壳当成编辑结果，否则整道题会看起来消失。
 */
function hasVisibleContent(html) {
  if (!html) return false
  if (/<(img|video|table|svg|canvas)\b/i.test(html)) return true
  const text = html
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .trim()
  return Boolean(text)
}

/**
 * 把编辑态正文写回模型，不退出编辑。
 * 只有本次编辑真的改过内容（打字 / 回车 / 应用格式）才落快照，
 * 避免仅进出编辑模式就把题干变成 HTML 快照、丢掉可无损转换的块结构。
 * 内容被删空时回落到原始识别块，避免题目再次进入编辑时变成空白。
 */
function commitEdit() {
  const index = editingIndex.value
  if (index < 0 || !dirtyEdit || !editBodyRef) return
  const question = questionOf(index)
  if (!question) return
  const html = editBodyRef.innerHTML
  dirtyEdit = false
  if (hasVisibleContent(html)) {
    question.editedHtml = html
    question.html = html
  } else {
    question.editedHtml = ''
    question.html = renderQuestion(question.blocks, imagesBase.value)
  }
  markDraftDirty()
}

/** 正文有实际改动（打字 / 删除）时标记为脏 */
function onEditInput() {
  dirtyEdit = true
}

/** 进入编辑：确保该题已渲染，再手动写入 innerHTML 并聚焦 */
async function startEdit(index) {
  if (editingIndex.value === index) return
  if (editingIndex.value >= 0) stopEdit()
  const question = questionOf(index)
  if (!question) return
  if (question.saved && !savedEditTipShown.has(index)) {
    savedEditTipShown.add(index)
    ElMessage.warning(t('process.editSavedTip'))
  }

  activate(index)
  editingIndex.value = index
  dirtyEdit = false
  hideSelPop()
  await nextTick()
  if (editBodyRef) {
    // 关掉 CSS 化的加粗 / 斜体，让 execCommand 产出 <b> / <i>，便于反转 Markdown 与 LaTeX
    document.execCommand('styleWithCSS', false, false)
    editBodyRef.innerHTML = question.html
    editBodyRef.focus()
    // 手动写入的 innerHTML 不经过 Vue 更新，编辑态也要重新量一次选项组
    layoutOptionGrids()
  }
}

/** 退出编辑：把正文存成编辑态快照 */
function stopEdit() {
  if (editingIndex.value < 0) return
  commitEdit()
  editingIndex.value = -1
  hideSelPop()
}

/** 划词浮窗：记录选区与位置，点击浮窗按钮后据此恢复 */
function updateSelPop() {
  const body = editBodyRef
  const sel = window.getSelection()
  if (!body || !sel || sel.isCollapsed || sel.rangeCount === 0) {
    hideSelPop()
    return
  }
  const range = sel.getRangeAt(0)
  if (!body.contains(range.commonAncestorContainer)) {
    hideSelPop()
    return
  }
  const rect = range.getBoundingClientRect()
  if (!rect.width && !rect.height) {
    hideSelPop()
    return
  }
  selRange = range.cloneRange()
  // 浮窗宽度约 230px：左右各留半宽再收 8px 边距，避免贴边溢出
  const half = 115
  selPos.value = {
    x: Math.min(Math.max(rect.left + rect.width / 2, half + 8), window.innerWidth - half - 8),
    y: Math.max(rect.top - 42, 8)
  }
  selVisible.value = true
}

function hideSelPop() {
  selVisible.value = false
  selRange = null
}

/** 执行编辑命令前先恢复选区（点浮窗会丢选区），执行后同步模型 */
function withSelection(fn) {
  const body = editBodyRef
  const sel = window.getSelection()
  if (!body || !sel || !selRange) return
  body.focus()
  sel.removeAllRanges()
  sel.addRange(selRange)
  fn()
  dirtyEdit = true
  commitEdit()
  updateSelPop()
}

function applyBold() {
  withSelection(() => document.execCommand('bold'))
}

function applyItalic() {
  withSelection(() => document.execCommand('italic'))
}

function applyUnderline() {
  withSelection(() => document.execCommand('underline'))
}

/** 着重号：没有对应的 execCommand，手动把选区包进 <span class="dot">；已在其中则取消 */
function toggleDot() {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return
  const range = sel.getRangeAt(0)
  if (range.collapsed) return

  const holder = elOf(range.startContainer)?.closest('span.dot')
  if (holder && holder.contains(range.endContainer)) {
    unwrap(holder)
    return
  }

  const span = document.createElement('span')
  span.className = 'dot'
  const frag = range.extractContents()
  span.appendChild(frag)
  range.insertNode(span)

  // 选区落在新节点上，方便连续调整
  const next = document.createRange()
  next.selectNodeContents(span)
  sel.removeAllRanges()
  sel.addRange(next)
  selRange = next.cloneRange()
}

function applyDot() {
  withSelection(toggleDot)
}

/**
 * Shift+Enter：把光标之后的正文移出本题，接到下一题开头；末题则新建一题。
 * 题号标识沿用被并入的下一题，页面序号按数组位次自动重排。
 */
function splitAtCursor() {
  const body = editBodyRef
  const index = editingIndex.value
  const sel = window.getSelection()
  if (!body || index < 0 || !sel || sel.rangeCount === 0) return
  const question = questionOf(index)
  if (!question) return

  const range = sel.getRangeAt(0)
  if (!body.contains(range.startContainer)) return
  // 光标落在公式内部时不允许拆分，避免公式被截断
  if (elOf(range.startContainer)?.closest('.katex')) {
    ElMessage.warning(t('process.splitInFormula'))
    return
  }

  const tail = document.createRange()
  tail.setStart(range.startContainer, range.startOffset)
  tail.setEnd(body, body.childNodes.length)
  const holder = document.createElement('div')
  holder.appendChild(tail.extractContents())
  // 去掉拆出来的空段落，什么都没有就不拆
  const moved = holder.innerHTML
    .replace(/^\s+/, '')
    .replace(/<(p|div|li)[^>]*>(?:\s|<br\s*\/?>)*<\/\1>/gi, '')
    .trim()
  if (!moved) return

  // 拆分后原题的内容已经变了，先落成快照
  dirtyEdit = true
  commitEdit()

  const pos = questions.value.indexOf(question)
  const next = questions.value[pos + 1]
  if (next) {
    const merged = moved + htmlOf(next)
    next.editedHtml = merged
    next.html = merged
    next.active = true
  } else {
    questions.value.push({
      index: nextOcrIndex(),
      blocks: [],
      // 拆出来的题目内容只存在于 HTML 快照里，没有对应的原始块
      source: [],
      active: true,
      html: moved,
      editedHtml: moved,
      questionId: null,
      analyzed: false,
      saved: false
    })
    single.value = false
  }
  markDraftDirty()

  // 光标回到本题末尾，便于继续编辑
  const after = document.createRange()
  after.selectNodeContents(body)
  after.collapse(false)
  sel.removeAllRanges()
  sel.addRange(after)
  hideSelPop()
}

/** 并入上方：整题接到上一题末尾，本题从列表移除，题号标识沿用上一题 */
function mergeUp(index) {
  const question = questionOf(index)
  if (!question) return
  const pos = questions.value.indexOf(question)
  if (pos <= 0) return
  const prev = questions.value[pos - 1]
  // 上一题正在编辑时先结束编辑，否则合并结果会被编辑态提交覆盖掉
  if (editingIndex.value === index || editingIndex.value === prev.index) stopEdit()

  const plain = !prev.editedHtml && !question.editedHtml
  prev.blocks = [...(prev.blocks || []), ...(question.blocks || [])]
  // 本题的块并入上一题，草稿里据此还原合并后的原始块归属
  prev.source = [...(prev.source || [prev.index]), ...(question.source || [question.index])]
  prev.active = true
  if (plain) {
    // 两题都没编辑过时按块重排，得到的题干仍是可无损转换的原始结构
    prev.html = renderQuestion(prev.blocks, imagesBase.value)
  } else {
    const merged = htmlOf(prev) + htmlOf(question)
    prev.editedHtml = merged
    prev.html = merged
  }

  if (panelIndex.value === index) closePanel()
  questions.value.splice(pos, 1)
  markDraftDirty()

  if (prev.saved || question.saved) ElMessage.warning(t('process.mergeSavedTip'))
}

/**
 * 删除本题：只从处理页移除并记进草稿，full.md（识别原文）始终只读、不改动。
 * 草稿里少了这道题，重新进入文件时自然不再出现；点「结束」清掉草稿即回到解析原文。
 * 已入库的题目只提示、不联动删除题库记录。
 */
async function removeQuestion(index) {
  const question = questionOf(index)
  if (!question) return
  try {
    await ElMessageBox.confirm(t('process.deleteTip'), t('process.delete'), {
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
      type: 'warning'
    })
  } catch {
    // 取消删除
    return
  }

  // 正在编辑本题时直接退出编辑（不提交改动，本题马上要被移除）
  if (editingIndex.value === index) {
    editingIndex.value = -1
    hideSelPop()
  }
  if (panelIndex.value === index) closePanel()

  // 题号标识可能在本次会话内被拆出来的新题复用，清掉缓存避免带出已删题的旧结果
  analysisCache.delete(index)
  editCache.delete(index)
  answerCache.delete(index)
  answerEdit.delete(index)
  answerLoaded.delete(index)
  knowledgePending.delete(index)
  knowledgeTouched.delete(index)

  const pos = questions.value.indexOf(question)
  if (pos >= 0) questions.value.splice(pos, 1)
  markDraftDirty()

  if (question.saved) ElMessage.warning(t('process.deleteSavedTip'))
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
    questions.value.forEach((question) => activate(question.index))
    return
  }
  observeEls([...(rootRef.value?.querySelectorAll('.q') || [])])
}

/**
 * 选项组列数自适应：一行排得下就保持 1x4，排不下就改成 2x2，
 * 让每行左右两端的选项分别贴住容器两边（间距随行宽自适应），避免出现 3+1 参差排布。
 */
function layoutOptionGrids() {
  const root = rootRef.value
  if (!root) return
  const grids = [...root.querySelectorAll('.opt-grid')]
  if (!grids.length) return
  // 先退回自然换行状态，才能量出一行排布所需的真实宽度
  grids.forEach((el) => el.classList.remove('is-pairs'))
  grids.forEach((el) => {
    const items = [...el.children]
    if (items.length < 3) return
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0
    const natural =
      items.reduce((sum, item) => sum + item.getBoundingClientRect().width, 0) +
      gap * (items.length - 1)
    if (natural > el.clientWidth + 1) el.classList.add('is-pairs')
  })
}

// 题目正文用 v-html 写入，编辑 / 合并 / 拆分后 DOM 会重建，需重新量一次
onUpdated(() => nextTick(layoutOptionGrids))

/** 离开页面时把当前状态存入会话缓存 */
function snapshot() {
  return {
    docName: docName.value,
    imagesBase: imagesBase.value,
    questions: questions.value,
    single: single.value,
    panelIndex: panelIndex.value,
    panelHtml: panelHtml.value,
    panelTab: panelTab.value,
    analysis: new Map(analysisCache),
    edits: new Map(editCache),
    answers: new Map(answerCache),
    answerEdits: new Map(answerEdit),
    answerLoaded: new Set(answerLoaded),
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
  panelTab.value = state.panelTab || 'analysis'
  analysisCache.clear()
  state.analysis.forEach((markdown, index) => analysisCache.set(index, markdown))
  editCache.clear()
  state.edits.forEach((html, index) => editCache.set(index, html))
  answerCache.clear()
  state.answers?.forEach((answers, index) => answerCache.set(index, answers))
  answerEdit.clear()
  state.answerEdits?.forEach((html, index) => answerEdit.set(index, html))
  answerLoaded.clear()
  state.answerLoaded?.forEach((index) => answerLoaded.add(index))
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
    if (panelTab.value === 'answer') {
      syncAnswerBody()
    } else if (panelTab.value === 'knowledge') {
      // 知识点标签要等 AI 分析正文就绪后再挂载选择器，先从分析态切入
      panelTab.value = 'analysis'
      if (panelIndex.value >= 0) await switchTab('knowledge')
    } else syncPanelBody()
    await nextTick()
    const scroller = scrollParentOf(rootRef.value)
    if (scroller) scroller.scrollTop = cached.scrollTop
    loadImported()
    return
  }

  loading.value = true
  failed.value = false
  analyzingIndex.value = -1
  panelIndex.value = -1
  panelHtml.value = ''
  panelTab.value = 'analysis'
  editingIndex.value = -1
  solvingIndex.value = -1
  analysisCache.clear()
  editCache.clear()
  answerCache.clear()
  answerEdit.clear()
  answerLoaded.clear()

  try {
    const data = await getTaskResult(props.id)
    docName.value = data.fileName || ''
    imagesBase.value = data.imagesBase || ''
    const parsed = splitQuestions(toBlocks(data.contentListV2))
    parsed.questions.forEach((q) => {
      q.active = false
      q.html = ''
      q.editedHtml = ''
      // 该题的块来自哪些原始题：只有「并入上方」会把多道原始题拼成一道
      q.source = [q.index]
      q.questionId = null
      q.analyzed = false
      q.saved = false
    })
    questions.value = parsed.questions
    single.value = parsed.single
    // 上次的编辑草稿存在时按草稿还原顺序与内容（换设备 / 刷新后仍能看到改过的题）
    applyDraft(data.editDraft, parsed)
  } catch {
    failed.value = true
    loading.value = false
    return
  }

  // 先退出 loading，让题目节点挂载后再决定渲染策略
  loading.value = false
  await nextTick()
  renderQuestions()
  loadImported()
}

/** 编辑态键盘：Shift+Enter 把光标之后的正文拆给下一题 */
function onEditKeydown(event) {
  if (event.key === 'Enter' && event.shiftKey) {
    event.preventDefault()
    splitAtCursor()
  }
}

/** 划词（鼠标拖选或键盘选择）后弹出格式浮窗 */
function onEditMouseup() {
  updateSelPop()
}

function onEditKeyup() {
  updateSelPop()
}

/** 点在编辑区与浮窗之外时收起浮窗 */
function onDocMousedown(event) {
  if (editingIndex.value < 0) return
  const target = event.target
  if (target?.closest?.('.fmt-pop')) return
  if (editBodyRef?.contains(target)) return
  hideSelPop()
}

/** 滚动后浮窗位置已失效，直接收起 */
function onWindowScroll() {
  if (editingIndex.value >= 0) hideSelPop()
}

onMounted(() => {
  document.addEventListener('mousedown', onDocMousedown)
  window.addEventListener('scroll', onWindowScroll, true)
  load()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  document.removeEventListener('mousedown', onDocMousedown)
  window.removeEventListener('scroll', onWindowScroll, true)
  // 还在编辑态时先把改动写回模型，避免离开页面丢掉未提交的编辑
  if (editingIndex.value >= 0) commitEdit()
  // 页面内来回切换时缓存状态，回到本页立刻可见；编辑结果同时留在服务端草稿里，
  // 刷新 / 换设备也能按草稿还原
  if (questions.value.length) saveProcessState(props.id, snapshot())
  // 待上报的草稿立即刷盘，避免离开页面丢掉最后一次改动
  if (draftTimer) pushDraft()
})
</script>

<style scoped>
.process {
  /* 题头操作按钮高度，与题号标签同一行居中对齐 */
  --action-h: 27px;
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

/* 文件标题卡片：投射在顶栏里（见模板 Teleport）。
   宽度与题目列同为 900px，由顶栏插槽水平居中 ⇒ 卡片与题目区域共用同一中轴线、
   左右边缘对齐；窄屏时按 max-width 收缩，避免与顶栏左侧插槽（入口页的标签栏）重叠。 */
.head {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 0 1 auto;
  width: 900px;
  min-width: 0;
  max-width: calc(100% - 320px);
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  box-shadow: var(--shadow-xs);
}

.doc {
  min-width: 0;
  font-family: var(--font-heading);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: text;
  border-bottom: 1px dashed transparent;
  transition: border-color 0.15s ease, color 0.15s ease;
}

.doc:hover {
  border-bottom-color: var(--c-border);
  color: var(--c-primary);
}

/* 就地编辑文件名：与展示态同字号、同字重，避免切换时跳动 */
.doc-input {
  flex: 1;
  min-width: 0;
  height: 30px;
  padding: 0 8px;
  font-family: var(--font-heading);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--c-ink);
  background: var(--c-subtle);
  border: 1px solid var(--c-primary);
  border-radius: var(--radius-sm);
  outline: none;
}

/* 「共 N 题」走无衬线栈 + 等宽数字，避免数字宽度变化时右侧对不齐 */
.counter {
  flex: none;
  margin-left: auto;
  font-family: var(--font-heading);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--c-mid-gray);
  white-space: nowrap;
}

/* 返回入口：投射在顶栏左侧，胶囊描边按钮，与组卷编辑页的返回保持一致 */
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

.btn {
  padding: 7px 16px;
  border: 1px solid var(--c-orange);
  border-radius: 999px;
  background: var(--c-orange);
  color: var(--c-on-accent);
  font-family: var(--font-heading);
  font-size: 13px;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(217, 119, 87, 0.28);
  transition: background 0.2s var(--ease-soft), border-color 0.2s var(--ease-soft),
    box-shadow 0.2s var(--ease-soft);
}

.btn:hover:not(:disabled) {
  border-color: var(--c-orange-hover);
  background: var(--c-orange-hover);
  box-shadow: 0 1px 3px rgba(217, 119, 87, 0.3), 0 8px 16px -9px rgba(217, 119, 87, 0.7);
}

.sheet {
  padding: 8px 40px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  box-shadow: var(--shadow-md), var(--inset-top);
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

/* 题头：左侧题号标签 + 右侧操作入口，同处一行 */
.q-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.q-tag {
  display: inline-block;
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

/* 编辑入口：紧挨题号标签右侧，与右侧的通用操作分开 */
.q-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.q-tool {
  height: var(--action-h);
  padding: 0 12px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-surface);
  color: var(--c-dark);
  font-family: var(--font-heading);
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.2s var(--ease-soft), background 0.2s var(--ease-soft),
    color 0.2s var(--ease-soft), box-shadow 0.2s var(--ease-soft), transform 0.2s var(--ease-out);
}

.q-tool:hover:not(:disabled) {
  border-color: rgba(217, 119, 87, 0.55);
  background: rgba(217, 119, 87, 0.08);
  color: var(--c-orange);
  box-shadow: var(--shadow-xs);
}

.q-tool:disabled {
  border-color: var(--c-border);
  background: var(--c-light-gray);
  color: var(--c-mid-gray);
  cursor: not-allowed;
}

/* 处于编辑态的入口：主色实底，提示再点一次即结束编辑 */
.q-tool.is-on {
  border-color: var(--c-orange);
  background: var(--c-orange);
  color: var(--c-on-accent);
  box-shadow: 0 1px 2px rgba(217, 119, 87, 0.28);
}

/* 图标按钮：方形，只放图标，尺寸与文字按钮同高 */
.q-tool.is-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--action-h);
  padding: 0;
}

/* 删除：hover 走红色系，与其余主色入口区分开 */
.q-tool.is-danger:hover:not(:disabled) {
  border-color: rgba(220, 38, 38, 0.5);
  background: var(--c-danger-bg);
  color: var(--c-danger);
}

/* 操作入口：贴行右侧；无题号标签（单题兜底）时靠右对齐 */
.q-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

/* 题干最后一个块不留底部外边距，避免末尾出现空隙 */
:deep(.q-body > :last-child) {
  margin-bottom: 0;
}

/* 题头操作入口：统一主色底 + 白字 */
.analyze,
.copy-latex {
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

.analyze:hover:not(:disabled),
.copy-latex:hover {
  border-color: var(--c-orange-hover);
  background: var(--c-orange-hover);
  transform: translateY(-1px);
  box-shadow: 0 1px 3px rgba(217, 119, 87, 0.3), 0 8px 16px -9px rgba(217, 119, 87, 0.7);
}

.analyze:active:not(:disabled),
.copy-latex:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(217, 119, 87, 0.28);
}

/* 分析进行中，其余题目的入口置灰 */
.analyze:disabled {
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

/* 已入库提示：文案左侧的绿色圆圈打勾 */
.bank-check {
  flex-shrink: 0;
}

/* 懒加载占位，等待进入视口后再渲染真实内容 */
.q-skeleton {
  min-height: 150px;
}

/* 编辑态正文：虚线框提示此处可改；聚焦后转实线 */
.q-body.q-editing {
  padding: 12px 14px;
  border: 1px dashed rgba(217, 119, 87, 0.45);
  border-radius: var(--radius-sm);
  background: rgba(217, 119, 87, 0.03);
  outline: none;
}

.q-body.q-editing:focus {
  border-style: solid;
  border-color: var(--c-orange);
}

/* 划词浮窗：贴在选区上方，水平居中 */
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

/* 右侧分析结果面板：顶部与题目卡片上边缘对齐；滚动时吸附在页面顶部并留出呼吸间距 */
.panel {
  flex: 0 0 768px;
  position: sticky;
  top: 8px;
  max-height: calc(100vh - 160px);
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

/* 元信息行：四个等宽下拉（学段 / 学科 / 布鲁姆认知目标 / 难度），与题库面板保持一致 */
.panel-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
  padding: 0 24px 14px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--c-border);
}

.panel-meta-select {
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
  font-family: var(--font-heading);
  font-size: 12.5px;
  letter-spacing: 0.02em;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: border-color 0.2s var(--ease-soft), background-color 0.2s var(--ease-soft),
    color 0.2s var(--ease-soft), box-shadow 0.2s var(--ease-soft);
}

.panel-meta-select:hover {
  border-color: rgba(217, 119, 87, 0.55);
  background-color: rgba(217, 119, 87, 0.06);
}

.panel-meta-select:focus {
  outline: none;
  border-color: var(--c-orange);
  box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.12);
}

/* 未匹配到（用户尚未选择）时用灰字当作占位 */
.panel-meta-select.is-empty {
  color: var(--c-mid-gray);
}

/* 面板标签：AI 分析 / 答案分析 */
.panel-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
}

.panel-tab {
  height: 28px;
  padding: 0 14px;
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

.panel-tab:hover {
  color: var(--c-dark);
  background: rgba(217, 119, 87, 0.08);
}

.panel-tab.is-active {
  border-color: rgba(217, 119, 87, 0.28);
  background: rgba(217, 119, 87, 0.12);
  color: var(--c-orange);
}

.panel-q {
  font-family: var(--font-heading);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--c-mid-gray);
}

/* 答案正文顶部的免责提示：常驻但独立于可编辑正文，避免被保存进答案 */
.answer-notice {
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

/* 答案空态：两个入口居中 */
.answer-empty {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0 24px;
}

.answer-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 168px;
  height: 34px;
  padding: 0 20px;
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
    color 0.2s var(--ease-soft), box-shadow 0.2s var(--ease-soft), transform 0.15s var(--ease-out);
}

.answer-action:hover:not(:disabled) {
  border-color: var(--c-orange-hover);
  background: var(--c-orange-hover);
  transform: translateY(-1px);
  box-shadow: 0 1px 3px rgba(217, 119, 87, 0.3), 0 8px 16px -9px rgba(217, 119, 87, 0.7);
}

.answer-action:disabled {
  border-color: var(--c-border);
  background: var(--c-light-gray);
  color: var(--c-mid-gray);
  box-shadow: none;
  cursor: not-allowed;
}

/* 知识点关联标签：学段/学科与知识点列表在面板内就地展开 */
.kp-tab {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 0 24px;
}

.kp-tab-hint {
  flex: none;
  margin: 0 0 10px;
  font-family: var(--font-heading);
  font-size: 11.5px;
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

/* 面板底部：存入题库入口 */
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
    color 0.2s var(--ease-soft), box-shadow 0.2s var(--ease-soft), transform 0.2s var(--ease-out);
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

/* 已入库或正在入库：置灰不可再点，避免同一题重复写入 */
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
  /* 保留 AI 分析里用于对齐的连续空格（HTML 默认会折叠） */
  white-space: pre-wrap;
}

.panel-body :deep(h1:first-child),
.panel-body :deep(h2:first-child),
.panel-body :deep(h3:first-child) {
  margin-top: 0;
}

.panel-body :deep(p) {
  margin: 0 0 10px;
  white-space: pre-wrap;
}

.panel-body :deep(ul),
.panel-body :deep(ol) {
  margin: 0 0 10px;
  padding-left: 20px;
}

.panel-body :deep(li) {
  margin-bottom: 4px;
  white-space: pre-wrap;
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
  white-space: pre-wrap;
}

/* 公式内部恢复默认折叠，避免 KaTeX 标记里的换行/缩进被 pre-wrap 展开 */
.panel-body :deep(.katex) {
  white-space: normal;
}

.panel-body :deep(th) {
  background: var(--c-subtle);
  font-family: var(--font-heading);
  font-weight: 600;
}

.panel-body :deep(tbody tr:nth-child(even)) {
  background: var(--c-subtle);
}

.panel-body :deep(td) {
  font-variant-numeric: tabular-nums;
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
  border-right-color: rgba(217, 119, 87, 0.4);
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

/* 短选项组：每行两端顶格，选项间距随行宽自适应（1x4 一行、2x2 两行时各排左右对齐） */
:deep(.opt-grid) {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  column-gap: 2em;
  row-gap: 0;
}

:deep(.opt-grid .opt-item) {
  white-space: nowrap;
}

/* 一行放不下时改成 2x2：两列各自贴边，行内间距自适应 */
:deep(.opt-grid.is-pairs) {
  display: grid;
  grid-template-columns: auto auto;
  justify-content: space-between;
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
  font-variant-numeric: tabular-nums;
}

:deep(.blk-table th) {
  padding: 8px 12px;
  border: 1px solid var(--c-border);
  background: var(--c-subtle);
  font-family: var(--font-heading);
  font-size: 13px;
  font-weight: 600;
}

:deep(.blk-table tr:nth-child(even) td) {
  background: var(--c-subtle);
}

/* 表格单元格内的图片（装置图等）：按单元格宽度等比缩放，居中显示 */
:deep(.blk-table td img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
}

:deep(.blk-image) {
  margin: 16px 0;
}

/* 连续多图：按 data-cols 均分一行，4 张及以上每行两张 */
:deep(.blk-images) {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  gap: 12px;
  margin: 16px 0;
}

:deep(.blk-images > .blk-image) {
  margin: 0;
  min-width: 0;
}

:deep(.blk-images[data-cols='2'] > .blk-image) {
  width: calc(50% - 6px);
}

:deep(.blk-images[data-cols='3'] > .blk-image) {
  width: calc(33.333% - 8px);
}

:deep(.blk-image img) {
  max-width: 100%;
}

/* 整条图（甲乙丙被识成一张宽图）：宽度贴合图片，标签按图宽均分到对应子图下方 */
:deep(.blk-image-multi) {
  display: table;
  max-width: 100%;
  margin: 16px auto;
}

:deep(.blk-image-labels) {
  display: flex;
  justify-content: space-around;
  align-items: center;
  margin-top: 6px;
  font-family: var(--font-body);
  font-size: 14px;
}

/* 单张图的整句图注 */
:deep(.blk-image-caption) {
  margin-top: 6px;
  text-align: center;
  font-size: 13px;
  color: var(--c-muted);
  line-height: 1.6;
}

:deep(.blk-images > .blk-image img) {
  display: block;
  margin: 0 auto;
  width: auto;
  max-width: 100%;
  height: auto;
}

/* 选项字母 + 选项图：两列排布，最多每行两个 */
:deep(.blk-options) {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px 18px;
  margin: 14px 0;
}

:deep(.blk-options > .blk-option) {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
}

:deep(.blk-options[data-cols='2'] > .blk-option) {
  width: calc(50% - 9px);
}

:deep(.blk-options[data-cols='3'] > .blk-option) {
  width: calc(33.333% - 12px);
}

:deep(.blk-option-label) {
  flex: 0 0 auto;
  padding-top: 8px;
  line-height: 1.6;
}

:deep(.blk-option > .blk-image) {
  flex: 1;
  min-width: 0;
  margin: 0;
}

:deep(.blk-option > .blk-image img) {
  display: block;
  max-width: 100%;
  height: auto;
}

/* 多图 + 图下说明：每格一张图配自己的文字，2 图两列、3 图三列、4 图及以上每行两张 */
:deep(.blk-labeled) {
  display: grid;
  gap: 14px 18px;
  margin: 14px 0;
}

:deep(.blk-labeled[data-cols='1']) {
  grid-template-columns: minmax(0, 1fr);
}

:deep(.blk-labeled[data-cols='2']) {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

:deep(.blk-labeled[data-cols='3']) {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

:deep(.blk-labeled-cell) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

:deep(.blk-labeled-cell > .blk-image) {
  margin: 0;
}

:deep(.blk-labeled-cell > .blk-image img) {
  display: block;
  max-width: 100%;
  max-height: 140px;
  width: auto;
  height: auto;
}

:deep(.blk-labeled-cell > .blk-para) {
  margin: 0;
  text-align: center;
}

/* 「材料」左右分栏：按原始版面把两栏图文并排还原 */
:deep(.blk-cols) {
  display: grid;
  gap: 26px;
  align-items: start;
  margin: 14px 0;
}

:deep(.blk-col) {
  min-width: 0;
}

/* 两栏顶部对齐：第一块不再留上间距 */
:deep(.blk-col > :first-child) {
  margin-top: 0;
}

/* 一栏内被 OCR 切开的连续图片：首尾相接排成一条，图注合并到下方 */
:deep(.blk-strip) {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 4px;
}

:deep(.blk-strip-item) {
  margin: 0;
  flex: 0 1 auto;
  min-width: 0;
}

:deep(.blk-strip-item img) {
  display: block;
  width: auto;
  max-width: 100%;
  max-height: 132px;
  height: auto;
}

:deep(.blk-strip-caption),
:deep(.blk-strip-group) {
  text-align: center;
  font-size: 13px;
  color: var(--c-mid-gray);
}

:deep(.blk-strip-caption) {
  margin-top: 8px;
}

:deep(.blk-strip-group) {
  margin-top: 4px;
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
