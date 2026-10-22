<template>
  <div :class="inline ? 'kp-inline' : 'kp-mask'" @click.self="onMaskClick">
    <div class="kp-card" :class="{ 'is-inline': inline }" role="dialog" :aria-modal="!inline">
      <header v-if="!inline" class="kp-head">
        <div class="kp-heading">
          <span class="kp-title">{{ t('knowledge.title') }}</span>
          <span class="kp-hint">{{ t('knowledge.hint') }}</span>
        </div>
        <button class="kp-close" type="button" :aria-label="t('knowledge.cancel')" @click="close">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </header>

      <div class="kp-toolbar">
        <select v-model="stage" class="kp-select" @change="onStageChange">
          <option v-for="item in stages" :key="item" :value="item">{{ item }}</option>
        </select>
        <select v-model="subject" class="kp-select" @change="loadList">
          <option v-for="item in subjects" :key="item" :value="item">{{ item }}</option>
        </select>
        <input
          v-model="keyword"
          class="kp-search"
          type="search"
          :placeholder="t('knowledge.searchPlaceholder')"
          @input="onSearchInput"
        />
      </div>

      <div class="kp-body">
        <div class="kp-list">
          <p v-if="loading" class="kp-state">{{ t('knowledge.loading') }}</p>
          <p v-else-if="!items.length" class="kp-state">
            {{ keyword.trim() ? t('knowledge.noResult') : t('knowledge.noData') }}
          </p>
          <div v-else class="kp-grid">
            <label
              v-for="item in items"
              :key="item.id"
              class="kp-item"
              :class="{ on: isSelected(item.id) }"
            >
              <input type="checkbox" :checked="isSelected(item.id)" @change="toggleItem(item)" />
              <span class="kp-item-name">{{ item.name }}</span>
            </label>
          </div>
        </div>

        <aside class="kp-selected">
          <p class="kp-selected-head">{{ t('knowledge.selected', { count: selected.length }) }}</p>
          <p v-if="!selected.length" class="kp-state">{{ t('knowledge.empty') }}</p>
          <ul v-else class="kp-chips">
            <li
              v-for="item in selected"
              :key="item.knowledgeId"
              class="kp-chip"
              :class="{ primary: item.knowledgeId === primaryId }"
            >
              <button
                class="kp-star"
                type="button"
                :title="t('knowledge.setPrimary')"
                :aria-label="t('knowledge.setPrimary')"
                @click="setPrimary(item.knowledgeId)"
              >
                ★
              </button>
              <span class="kp-chip-text">
                <span class="kp-chip-name">{{ item.name }}</span>
                <span class="kp-chip-meta">{{ item.stage }} · {{ item.subject }}</span>
              </span>
              <button class="kp-remove" type="button" :aria-label="t('search.delete')" @click="removeItem(item.knowledgeId)">
                ×
              </button>
            </li>
          </ul>
        </aside>
      </div>

      <footer class="kp-foot">
        <button class="kp-clear" type="button" :disabled="!selected.length" @click="clearAll">
          {{ t('knowledge.clear') }}
        </button>
        <span v-if="inline" class="kp-merge-hint">{{ t('knowledge.mergeHint') }}</span>
        <div v-else class="kp-actions">
          <button class="kp-cancel" type="button" :disabled="saving" @click="close">{{ t('knowledge.cancel') }}</button>
          <button class="kp-save" type="button" :disabled="saving" @click="save">
            <span v-if="saving" class="kp-spinner" aria-hidden="true"></span>
            {{ saving ? t('knowledge.saving') : t('knowledge.save') }}
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import {
  getKbFacets,
  getKbKnowledgeList,
  getQuestionKnowledge,
  saveQuestionKnowledge
} from '@/api/question'

const props = defineProps({
  /** 题目 ID；local 模式下可为空 */
  questionId: { type: [String, Number], default: '' },
  /** 默认学段（通常取自 AI 分析报告里的年级） */
  stage: { type: String, default: '' },
  /** 题目学科，用于选择器默认值 */
  subject: { type: String, default: '' },
  /** local 模式下的初始选中项 */
  initial: { type: Array, default: () => [] },
  /** 题目尚未入库时只在前端暂存选择，不调用保存接口 */
  local: { type: Boolean, default: false },
  /** 内嵌在面板标签里时去掉遮罩与卡片外壳，保存后也不自动关闭 */
  inline: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'saved', 'selected'])

const { t } = useI18n()

const facets = ref([])
const stage = ref('')
const subject = ref('')
const items = ref([])
const selected = ref([])
const primaryId = ref('')
const keyword = ref('')
const loading = ref(false)
const saving = ref(false)
let searchTimer = null

/** 学段去重，保持后端返回顺序（小学 → 初中 → 高中）；
 *  分析报告给出的学段即使目录里还没有知识点，也保留为可选项 */
const stages = computed(() => {
  const list = [...new Set(facets.value.map((item) => item.stage))]
  if (props.stage && !list.includes(props.stage)) list.push(props.stage)
  return list
})

/** 当前学段下可选学科；同理保留分析报告给出的学科 */
const subjects = computed(() => {
  const list = [
    ...new Set(facets.value.filter((item) => item.stage === stage.value).map((item) => item.subject))
  ]
  if (props.stage && stage.value === props.stage && props.subject && !list.includes(props.subject)) {
    list.push(props.subject)
  }
  return list
})

function idOf(value) {
  return value == null ? '' : String(value)
}

function isSelected(id) {
  return selected.value.some((item) => item.knowledgeId === idOf(id))
}

/** 加入或移除知识点；主知识点缺失时自动落到第一个 */
function toggleItem(item) {
  const id = idOf(item.id)
  const at = selected.value.findIndex((entry) => entry.knowledgeId === id)
  if (at >= 0) {
    selected.value.splice(at, 1)
    if (primaryId.value === id) primaryId.value = selected.value[0]?.knowledgeId || ''
    syncInline()
    return
  }
  selected.value.push({
    knowledgeId: id,
    name: item.name,
    stage: item.stage,
    subject: item.subject
  })
  if (!primaryId.value) primaryId.value = id
  syncInline()
}

function removeItem(knowledgeId) {
  const id = idOf(knowledgeId)
  selected.value = selected.value.filter((item) => item.knowledgeId !== id)
  if (primaryId.value === id) primaryId.value = selected.value[0]?.knowledgeId || ''
  syncInline()
}

function setPrimary(knowledgeId) {
  primaryId.value = idOf(knowledgeId)
  syncInline()
}

function clearAll() {
  selected.value = []
  primaryId.value = ''
  syncInline()
}

/** 拉取当前学段/学科下的知识点（keyword 非空时由后端按名称/别名过滤） */
async function loadList() {
  if (!stage.value || !subject.value) {
    items.value = []
    return
  }
  loading.value = true
  try {
    items.value = (await getKbKnowledgeList({
      stage: stage.value,
      subject: subject.value,
      keyword: keyword.value.trim() || undefined
    })) || []
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

function onStageChange() {
  if (!subjects.value.includes(subject.value)) {
    subject.value = subjects.value[0] || ''
  }
  loadList()
}

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(loadList, 260)
}

/** 初始化：已绑定知识点 + 学段/学科分布，并给出默认筛选 */
async function init() {
  try {
    facets.value = (await getKbFacets()) || []
  } catch {
    facets.value = []
  }

  const bound = props.local
    ? props.initial
    : ((await getQuestionKnowledge(props.questionId).catch(() => [])) || [])
  selected.value = bound.map((item) => ({
    knowledgeId: idOf(item.knowledgeId),
    name: item.name,
    stage: item.stage,
    subject: item.subject
  }))
  const primary = bound.find((item) => item.role === 1)
  primaryId.value = primary ? idOf(primary.knowledgeId) : selected.value[0]?.knowledgeId || ''

  const first = selected.value[0]
  // 由 AI 分析报告带入学段时，学段/学科按报告原样装填（即使目录暂无该组合）
  stage.value = first?.stage || props.stage || facets.value[0]?.stage || ''
  const stageFacets = facets.value.filter((item) => item.stage === stage.value)
  const preferredSubject = props.stage
    ? props.subject
    : stageFacets.some((item) => item.subject === props.subject)
      ? props.subject
      : ''
  subject.value = first?.subject || preferredSubject || stageFacets[0]?.subject || ''

  await loadList()
}

/** 当前选择转成接口结构，role=1 表示主知识点 */
function currentNodes() {
  return selected.value.map((item) => ({
    knowledgeId: item.knowledgeId,
    role: item.knowledgeId === primaryId.value ? 1 : 2,
    name: item.name,
    stage: item.stage,
    subject: item.subject
  }))
}

async function save() {
  if (saving.value) return
  const nodes = currentNodes()
  // 题目还没入库：先把选择交给调用方暂存，入库时再一起写
  if (props.local) {
    emit('selected', nodes)
    if (!props.inline) close()
    return
  }
  saving.value = true
  try {
    await saveQuestionKnowledge(props.questionId, nodes)
    ElMessage.success(t('knowledge.saved'))
    emit('saved')
    if (!props.inline) close()
  } catch {
    // 失败提示由 http 拦截器统一弹出
  } finally {
    saving.value = false
  }
}

function close() {
  emit('close')
}

/** 内嵌模式没有遮罩，点击空白不关闭 */
function onMaskClick() {
  if (!props.inline) close()
}

function onKeydown(event) {
  if (event.key === 'Escape' && !props.inline) close()
}

// 内嵌模式没有独立保存按钮：仅在用户真正改动选择时同步给父级，由面板底部统一提交
function syncInline() {
  if (props.inline) emit('selected', currentNodes())
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  init()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<style scoped>
.kp-mask {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--c-backdrop);
  backdrop-filter: blur(2px);
}

.kp-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 860px;
  height: 78vh;
  padding: 22px 24px 18px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg), var(--inset-top);
}

/* 内嵌在分析面板的「知识点关联」标签里：去掉遮罩和卡片外壳，撑满剩余高度 */
.kp-inline {
  display: flex;
  flex: 1;
  min-height: 0;
}

.kp-card.is-inline {
  flex: 1;
  height: auto;
  max-width: none;
  min-height: 0;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.kp-card.is-inline .kp-toolbar {
  margin-top: 0;
}

.kp-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.kp-heading {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.kp-title {
  font-family: var(--font-heading);
  font-size: 16px;
  font-weight: 600;
  color: var(--c-dark);
}

.kp-hint {
  font-family: var(--font-heading);
  font-size: 12px;
  color: var(--c-mid-gray);
}

.kp-close {
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

.kp-close:hover {
  background: var(--c-hover);
  color: var(--c-dark);
}

.kp-toolbar {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.kp-select {
  flex: 0 0 132px;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-subtle);
  font-family: var(--font-heading);
  font-size: 13px;
  color: var(--c-dark);
  outline: none;
}

.kp-search {
  flex: 1;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-subtle);
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--c-dark);
  outline: none;
  transition: border-color 0.2s var(--ease-soft);
}

.kp-search:focus {
  border-color: rgba(217, 119, 87, 0.55);
}

.kp-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 16px;
  flex: 1;
  min-height: 0;
  margin-top: 14px;
}

.kp-list,
.kp-selected {
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-subtle);
}

.kp-state {
  margin: 0;
  padding: 10px 4px;
  font-family: var(--font-heading);
  font-size: 12.5px;
  color: var(--c-mid-gray);
}

/* 知识点是扁平目录，用双列排布减少滚动距离 */
.kp-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 10px;
}

.kp-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--c-dark);
  cursor: pointer;
  transition: background 0.15s var(--ease-soft);
}

.kp-item:hover {
  background: var(--c-hover);
}

.kp-item.on {
  background: rgba(217, 119, 87, 0.1);
}

.kp-item input {
  flex: none;
  width: 14px;
  height: 14px;
  accent-color: var(--c-orange);
}

.kp-item-name {
  min-width: 0;
  word-break: break-word;
}

.kp-selected-head {
  margin: 0 0 8px;
  font-family: var(--font-heading);
  font-size: 12px;
  font-weight: 600;
  color: var(--c-mid-gray);
}

.kp-chips {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.kp-chip {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 8px 8px 6px;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  background: var(--c-surface);
}

.kp-chip.primary {
  border-color: rgba(217, 119, 87, 0.45);
  background: rgba(217, 119, 87, 0.07);
}

.kp-star,
.kp-remove {
  flex: none;
  padding: 0 2px;
  border: none;
  background: transparent;
  font-size: 13px;
  line-height: 18px;
  color: var(--c-mid-gray);
  cursor: pointer;
  transition: color 0.15s var(--ease-soft);
}

.kp-chip.primary .kp-star {
  color: var(--c-orange);
}

.kp-remove:hover {
  color: var(--c-danger);
}

.kp-chip-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.kp-chip-name {
  font-family: var(--font-heading);
  font-size: 12.5px;
  color: var(--c-dark);
  word-break: break-word;
}

.kp-chip-meta {
  font-family: var(--font-heading);
  font-size: 11px;
  color: var(--c-mid-gray);
}

.kp-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
}

/* 内嵌模式：没有独立保存，提示随面板底部按钮一起提交 */
.kp-merge-hint {
  font-family: var(--font-heading);
  font-size: 11.5px;
  color: var(--c-mid-gray);
  text-align: right;
}

.kp-clear {
  border: none;
  background: transparent;
  font-family: var(--font-heading);
  font-size: 12.5px;
  color: var(--c-mid-gray);
  cursor: pointer;
}

.kp-clear:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.kp-actions {
  display: flex;
  gap: 10px;
}

.kp-cancel,
.kp-save {
  height: 34px;
  padding: 0 18px;
  border-radius: var(--radius-sm);
  font-family: var(--font-heading);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s var(--ease-soft), color 0.2s var(--ease-soft);
}

.kp-cancel {
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-dark);
}

.kp-cancel:hover {
  background: var(--c-hover);
}

.kp-save {
  border: 1px solid transparent;
  background: var(--c-dark);
  color: var(--c-on-accent);
}

.kp-save:hover {
  background: var(--c-orange);
}

.kp-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.kp-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-right: 6px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: kp-spin 0.7s linear infinite;
}

@keyframes kp-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
