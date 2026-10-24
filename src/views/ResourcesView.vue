<template>
  <div class="resources">
    <!-- 标签栏投射到顶栏左侧：三个标签靠左摆放，与本页内容的左边缘对齐 -->
    <Teleport v-if="topbarLead" :to="topbarLead">
      <div class="tabs" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          role="tab"
          class="tab"
          :class="{ 'is-active': activeTab === tab.key }"
          :aria-selected="activeTab === tab.key"
          @click="activeTab = tab.key"
        >
          {{ t(tab.label) }}
        </button>
      </div>
    </Teleport>

    <!-- 我的文件：卡片网格，每页 20 张 -->
    <template v-if="activeTab === 'files'">
      <div v-if="!loggedIn" class="placeholder">{{ t('resources.needLogin') }}</div>

      <div v-else-if="loading" class="placeholder">
        <span class="spinner" aria-hidden="true"></span>
        {{ t('process.loading') }}
      </div>

      <div v-else-if="!lists.files.rows.length" class="placeholder">{{ t('resources.empty') }}</div>

      <template v-else>
        <p class="count">{{ t('resources.total', { total: lists.files.total }) }}</p>

        <ul class="cards">
          <li
            v-for="(row, i) in lists.files.rows"
            :key="row.id"
            class="card"
            tabindex="0"
            :style="{ animationDelay: `${Math.min(i, 11) * 22}ms` }"
            @click="openFile(row)"
            @keydown.enter="openFile(row)"
          >
            <div class="card-eyebrow">
              <span class="card-ico" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                  <path
                    d="M13.5 3.6H7.4A1.8 1.8 0 0 0 5.6 5.4v13.2a1.8 1.8 0 0 0 1.8 1.8h9.2a1.8 1.8 0 0 0 1.8-1.8V8.4l-4.9-4.8Z"
                    stroke="currentColor"
                    stroke-width="1.7"
                    stroke-linejoin="round"
                  />
                  <path d="M13.3 3.8v4.6h4.7" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
                </svg>
              </span>
              <span class="card-kind">{{ t('resources.files.cardLabel') }}</span>
              <span class="card-sep">/</span>
              <span class="card-time">{{ formatTime(row.createdAt) }}</span>
            </div>

            <div class="card-body">
              <p class="card-title">{{ row.fileName }}</p>
              <p v-if="row.questionCount" class="card-note">
                {{ t('resources.files.questionCount', { count: row.questionCount }) }}
              </p>
            </div>

            <span class="card-rule" aria-hidden="true"></span>

            <div class="card-foot">
              <el-tag :type="statusType(row.status)" size="small" effect="light">
                {{ statusText(row.status) }}
              </el-tag>
              <!-- 删除文件记录：只删这一条记录，题库中已入库的题目不受影响 -->
              <button type="button" class="card-act" @click.stop="removeFile(row)">
                {{ t('resources.files.delete') }}
              </button>
            </div>
          </li>
        </ul>

        <div class="list-foot">
          <el-pagination
            background
            layout="prev, pager, next"
            :total="lists.files.total"
            :page-size="PAGE_SIZE"
            :current-page="lists.files.pageNo"
            @current-change="(next) => goPage('files', next)"
          />
        </div>
      </template>
    </template>

    <!-- 我的试卷：卡片网格，点击进入组卷编辑器继续编辑 -->
    <template v-else-if="activeTab === 'papers'">
      <div v-if="!loggedIn" class="placeholder">{{ t('resources.papers.needLogin') }}</div>

      <div v-else-if="loading" class="placeholder">
        <span class="spinner" aria-hidden="true"></span>
        {{ t('process.loading') }}
      </div>

      <div v-else-if="!lists.papers.rows.length" class="placeholder">{{ t('resources.papers.empty') }}</div>

      <template v-else>
        <p class="count">{{ t('resources.papers.total', { total: lists.papers.total }) }}</p>

        <ul class="cards">
          <li
            v-for="(row, i) in lists.papers.rows"
            :key="row.id"
            class="card"
            tabindex="0"
            :style="{ animationDelay: `${Math.min(i, 11) * 22}ms` }"
            @click="openPaper(row)"
            @keydown.enter="openPaper(row)"
          >
            <div class="card-eyebrow">
              <span class="card-ico" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                  <path
                    d="M7.1 4.6h6.7l4.3 4.3v9.7a1.2 1.2 0 0 1-1.2 1.2H7.1a1.2 1.2 0 0 1-1.2-1.2V5.8a1.2 1.2 0 0 1 1.2-1.2Z"
                    stroke="currentColor"
                    stroke-width="1.7"
                    stroke-linejoin="round"
                  />
                  <path d="M13.6 4.8v4.4h4.4" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
                  <path d="M8.5 12.9h7M8.5 16h4.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
                </svg>
              </span>
              <span class="card-kind">{{ t('resources.papers.cardLabel') }}</span>
              <span class="card-sep">/</span>
              <span class="card-time">{{ formatTime(row.updatedAt || row.createdAt) }}</span>
            </div>

            <div class="card-body">
              <p class="card-title">{{ row.title || t('compose.untitled') }}</p>
              <p v-if="preview(row.content)" class="card-text">{{ preview(row.content) }}</p>
            </div>

            <span class="card-rule" aria-hidden="true"></span>

            <div class="card-foot">
              <span class="card-go" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                  <path d="M5 12h13M12.5 6.5 19 12l-6.5 5.5" stroke="currentColor" stroke-width="1.8"
                        stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
            </div>
          </li>
        </ul>

        <div class="list-foot">
          <el-pagination
            background
            layout="prev, pager, next"
            :total="lists.papers.total"
            :page-size="PAGE_SIZE"
            :current-page="lists.papers.pageNo"
            @current-change="(next) => goPage('papers', next)"
          />
        </div>
      </template>
    </template>

    <!-- 我的题目：题干按文件解析页的样式完整渲染；点击题目（或右侧箭头）在右侧展开分析面板 -->
    <template v-else>
      <div v-if="!loggedIn" class="placeholder">{{ t('resources.questions.needLogin') }}</div>

      <template v-else>
        <!-- 顶部筛选：全部（重置）/ 认知目标 / 难度 / 筛选按钮，默认展示全部 -->
        <div class="q-filters">
          <button
            type="button"
            class="q-filter-all"
            :class="{ 'is-active': !hasFilter }"
            @click="showAllQuestions"
          >
            {{ t('resources.questions.all') }}
          </button>
          <select v-model="filters.bloomType" class="q-filter-select" :aria-label="t('questionMeta.bloom')">
            <option value="">{{ t('questionMeta.bloom') }}</option>
            <option v-for="item in BLOOM_TYPES" :key="item" :value="item">{{ item }}</option>
          </select>
          <select v-model="filters.difficulty" class="q-filter-select" :aria-label="t('questionMeta.difficulty')">
            <option value="">{{ t('questionMeta.difficulty') }}</option>
            <option v-for="item in DIFFICULTIES" :key="item" :value="item">{{ item }}</option>
          </select>
          <button
            type="button"
            class="q-filter-apply"
            :class="{ 'is-active': hasFilter }"
            @click="applyQuestionFilters"
          >
            {{ t('resources.questions.filter') }}
          </button>
        </div>

        <div v-if="loading" class="placeholder">
          <span class="spinner" aria-hidden="true"></span>
          {{ t('process.loading') }}
        </div>

        <div v-else-if="!lists.questions.rows.length" class="placeholder">
          {{ hasFilter ? t('resources.questions.noMatch') : t('resources.questions.empty') }}
        </div>

        <template v-else>
        <div class="qs-layout" :class="{ 'has-panel': activeQuestion }">
          <div class="qs-main">
            <p class="count">{{ t('resources.questions.total', { total: lists.questions.total }) }}</p>

            <ul class="rows">
              <li
                v-for="(row, i) in lists.questions.rows"
                :key="row.id"
                class="row"
                :class="{ 'is-active': activeQuestion?.id === row.id }"
                tabindex="0"
                :style="{ animationDelay: `${Math.min(i, 11) * 20}ms` }"
                @click="openQuestion(row)"
                @keydown.enter="openQuestion(row)"
              >
                <div class="row-head">
                  <span class="row-ico" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                      <path
                        d="M12 3.4 20 7.5l-8 4.1-8-4.1 8-4.1Z"
                        stroke="currentColor"
                        stroke-width="1.7"
                        stroke-linejoin="round"
                      />
                      <path d="m4 12 8 4.1 8-4.1" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
                      <path d="m4 16.4 8 4.1 8-4.1" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
                    </svg>
                  </span>
                  <!-- 行头：学段 / 学科 / 布鲁姆认知目标 / 难度，空值自动跳过 -->
                  <template
                    v-for="(item, i) in [row.grade, row.subject, row.bloomType, row.difficulty].filter(Boolean)"
                    :key="item"
                  >
                    <span v-if="i > 0" class="row-sep">/</span>
                    <span class="row-kind">{{ item }}</span>
                  </template>

                  <div class="row-tools">
                    <button
                      class="row-open"
                      type="button"
                      :title="t('resources.questions.detail')"
                      :aria-label="t('resources.questions.detail')"
                      @click.stop="openQuestion(row)"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                        <path
                          d="m9 5 7 7-7 7"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </button>
                    <button class="row-act" type="button" @click.stop="removeQuestion(row)">
                      {{ t('search.delete') }}
                    </button>
                  </div>
                </div>

                <!-- 来源：题目导入时的文件名（后端联表 ocr_task 带出），单独占第二行，过长时省略 -->
                <div v-if="row.sourceName" class="row-source-line" :title="row.sourceName">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true">
                    <path
                      d="M13.5 3.6H7.4A1.8 1.8 0 0 0 5.6 5.4v13.2a1.8 1.8 0 0 0 1.8 1.8h9.2a1.8 1.8 0 0 0 1.8-1.8V8.4l-4.9-4.8Z"
                      stroke="currentColor"
                      stroke-width="1.7"
                      stroke-linejoin="round"
                    />
                    <path d="M13.3 3.8v4.6h4.7" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
                  </svg>
                  <span class="row-source-name">{{ row.sourceName }}</span>
                </div>

                <!-- 题干是题库里的 Markdown（含公式、图片与表格），按文件解析页的排版完整渲染 -->
                <div class="row-stem" v-html="renderRichMarkdown(row.title)"></div>

                <!-- 入库时间移到行尾右下角，让行头只放学科 / 学段 / 来源 -->
                <div class="row-foot">
                  <span class="row-time">{{ formatTime(row.createdAt) }}</span>
                </div>
              </li>
            </ul>

            <div class="list-foot">
              <el-pagination
                background
                layout="prev, pager, next"
                :total="lists.questions.total"
                :page-size="QUESTION_PAGE_SIZE"
                :current-page="lists.questions.pageNo"
                @current-change="(next) => goPage('questions', next)"
              />
            </div>
          </div>

          <QuestionBankPanel
            v-if="activeQuestion"
            :key="activeQuestion.id"
            :question="activeQuestion"
            @close="activeQuestion = null"
          />
        </div>
        </template>
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deleteOcrTask, pageOcrTasks } from '@/api/ocr'
import { pagePapers } from '@/api/paper'
import { deleteQuestion, filterQuestions, pageQuestions } from '@/api/question'
import { currentUser, isLoggedIn } from '@/utils/auth'
import { renderRichMarkdown } from '@/utils/markdown'
import { BLOOM_TYPES, DIFFICULTIES } from '@/utils/questionMeta'
import QuestionBankPanel from '@/components/QuestionBankPanel.vue'

/** 三个标签页都是完整列表、可翻页，每页统一 20 条（题库题干完整渲染后单行更高，也按此翻页） */
const PAGE_SIZE = 20
const QUESTION_PAGE_SIZE = 20

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

/** 顶栏左侧插槽：标签栏由 App.vue 提供，投射上去即贴内容左边缘 */
const topbarLead = inject('topbarLead', null)

const tabs = [
  { key: 'files', label: 'resources.tabs.files' },
  { key: 'papers', label: 'resources.tabs.papers' },
  { key: 'questions', label: 'resources.tabs.questions' }
]

/**
 * 当前标签同时写进地址栏（?tab=papers）：这样从「我的试卷」进编辑页后按返回，
 * 能回到试卷标签本身，而不是被重置回默认的文件标签。
 */
const activeTab = ref(tabs.some((tab) => tab.key === route.query.tab) ? route.query.tab : 'files')

const loggedIn = ref(isLoggedIn())
const loading = ref(false)

/** 三个标签各自的分页状态；loaded 用于切换标签时只在首次加载，保留已翻到的页码 */
const lists = reactive({
  files: { rows: [], total: 0, pageNo: 1, loaded: false },
  papers: { rows: [], total: 0, pageNo: 1, loaded: false },
  questions: { rows: [], total: 0, pageNo: 1, loaded: false }
})

/** 正在查看分析详情的题目（列表行摘要），非空时在右侧展开面板 */
const activeQuestion = ref(null)

/** 我的题目筛选：filters 是下拉里当前选择，appliedFilters 是点击「筛选」后真正生效的条件 */
const filters = reactive({ bloomType: '', difficulty: '' })
const appliedFilters = reactive({ bloomType: '', difficulty: '' })
const hasFilter = computed(() => Boolean(appliedFilters.bloomType || appliedFilters.difficulty))

const LOADERS = {
  files: (pageNo) => pageOcrTasks(pageNo, PAGE_SIZE),
  papers: (pageNo) => pagePapers(pageNo),
  questions: (pageNo) =>
    hasFilter.value
      ? filterQuestions({ ...appliedFilters, pageNo, pageSize: QUESTION_PAGE_SIZE })
      : pageQuestions(pageNo, QUESTION_PAGE_SIZE)
}

// 递增序号用于丢弃过期响应：快速切标签时，先发出的请求可能后返回
let loadSeq = 0

async function load(tab, pageNo) {
  if (!loggedIn.value) return
  const list = lists[tab]
  const seq = (loadSeq += 1)
  loading.value = true
  try {
    const page = await LOADERS[tab](pageNo)
    if (seq !== loadSeq) return
    list.rows = page.records || []
    list.total = Number(page.total) || 0
    list.pageNo = pageNo
    list.loaded = true
  } catch {
    if (seq !== loadSeq) return
    list.rows = []
    list.total = 0
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

function goPage(tab, next) {
  load(tab, next)
}

/** 点击「筛选」：把下拉里的认知目标 / 难度生效，回到第一页按条件查询 */
function applyQuestionFilters() {
  appliedFilters.bloomType = filters.bloomType
  appliedFilters.difficulty = filters.difficulty
  activeQuestion.value = null
  load('questions', 1)
}

/** 点击「全部」：清空筛选条件，回到完整的题库列表 */
function showAllQuestions() {
  filters.bloomType = ''
  filters.difficulty = ''
  appliedFilters.bloomType = ''
  appliedFilters.difficulty = ''
  activeQuestion.value = null
  load('questions', 1)
}

/** 点击文件记录进入该文件的题目渲染交互页（带来源标记，页内的返回按钮据此回到本页） */
function openFile(row) {
  router.push({ path: `/app/tasks/${row.id}/process`, query: { from: 'resources' } })
}

/** 点击试卷继续进入组卷编辑器（带来源标记，编辑器返回时回到「我的试卷」标签） */
function openPaper(row) {
  router.push({ path: `/app/compose/${row.id}`, query: { from: 'resources' } })
}

function openQuestion(row) {
  activeQuestion.value = row
}

/** 删掉当前页最后一条时回退一页，避免停在空页 */
function nextPageAfterDelete(list) {
  return list.rows.length === 1 && list.pageNo > 1 ? list.pageNo - 1 : list.pageNo
}

/** 详情面板里删除题目后：关闭面板并按当前页重新拉取 */
async function onQuestionDeleted() {
  activeQuestion.value = null
  await load('questions', nextPageAfterDelete(lists.questions))
}

/** 列表行上的删除：确认后调接口并按当前页重新拉取 */
async function removeQuestion(row) {
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
    await deleteQuestion(row.id)
  } catch {
    return
  }

  ElMessage.success(t('search.deleted'))
  await onQuestionDeleted()
}

/** 卡片上的删除：只删这条文件记录，题库里已入库的题目不受影响 */
async function removeFile(row) {
  try {
    await ElMessageBox.confirm(t('resources.files.deleteTip'), t('resources.files.delete'), {
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
      type: 'warning'
    })
  } catch {
    return
  }

  try {
    await deleteOcrTask(row.id)
  } catch {
    return
  }

  ElMessage.success(t('resources.files.deleted'))
  await load('files', nextPageAfterDelete(lists.files))
}

function statusType(status) {
  return { SUCCESS: 'success', FAILED: 'danger', PARSING: 'warning' }[status] || 'info'
}

/** 文件卡片的状态文案：解析完成在本页读作「已解析」，其余沿用任务状态原词 */
function statusText(status) {
  return status === 'SUCCESS' ? t('resources.files.parsed') : t(`tasks.status.${status}`)
}

/** 试卷正文是 HTML，剥掉标签取一段纯文本做摘要 */
function preview(content) {
  return String(content || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140)
}

function formatTime(value) {
  if (!value) return ''
  return String(value).replace('T', ' ').slice(0, 16)
}

// 切标签时按需加载：已加载过的标签保留原有页码，不重复请求；
// 同时把标签写进地址栏（replace 不新增历史项），让「返回」能回到同一标签
watch(activeTab, (tab) => {
  if (route.query.tab !== tab) router.replace({ query: { ...route.query, tab } })
  if (!loggedIn.value) return
  if (!lists[tab].loaded) load(tab, 1)
})

// 登录/退出后重新拉取：退出要清空列表，登录要立刻看到自己的资源
watch(
  () => currentUser.value,
  () => {
    loggedIn.value = isLoggedIn()
    activeQuestion.value = null
    loadSeq += 1
    Object.values(lists).forEach((list) => {
      list.rows = []
      list.total = 0
      list.pageNo = 1
      list.loaded = false
    })
    if (loggedIn.value) load(activeTab.value, 1)
  }
)

// 首屏直接加载地址栏里的那个标签：从「我的试卷」进编辑页后返回时，
// activeTab 已经由 query 初始化好，不会触发上面的 watch，必须在这里补一次加载
onMounted(() => load(activeTab.value, 1))
</script>

<style scoped>
/* 列表整体铺满内容区：卡片列数由 .cards 的 auto-fill 随屏幕宽度自适应，
   这里不能再设 max-width 硬上限（宽屏下会两侧留大片空白），
   也不能用 margin:auto（在 .page 这个纵向 flex 容器里会连带把内容垂直居中） */
.resources {
  width: 100%;
}

/* 标签栏：整体做成一条带底槽的胶囊，选中项是其中的滑块。
   它被投射到顶栏左侧插槽，所以这里不留外边距，间距由顶栏高度给出 */
.tabs {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-surface);
  box-shadow: var(--shadow-xs);
}

.tab {
  padding: 7px 18px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--c-mid-gray);
  font-family: var(--font-heading);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s var(--ease-soft), color 0.2s var(--ease-soft);
}

.tab:hover:not(.is-active) {
  color: var(--c-dark);
}

/* 选中态用项目主色（品牌橙）实底：与主按钮、分页选中页同一套主色语言 */
.tab.is-active {
  background: var(--c-orange);
  color: var(--c-on-accent);
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 72px 0;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--c-mid-gray);
}

/* 数字单独声明无衬线栈并启用等宽数字，保证多位计数（如 1,024）在列表中左右对齐 */
.count {
  margin: 0 0 14px;
  font-family: var(--font-heading);
  font-size: 12.5px;
  color: var(--c-mid-gray);
}

/* ---------------- 我的题目：顶部筛选 ---------------- */

.q-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 0 0 12px;
}

.q-filter-all,
.q-filter-apply {
  height: 32px;
  padding: 0 15px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-surface);
  color: var(--c-mid-gray);
  font-family: var(--font-heading);
  font-size: 12.5px;
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease, border-color 0.18s ease;
}

.q-filter-all:hover {
  border-color: var(--c-orange);
  color: var(--c-orange);
}

.q-filter-all.is-active {
  border-color: var(--c-orange);
  background: var(--c-orange);
  color: var(--c-on-accent);
}

.q-filter-select {
  width: 132px;
  height: 32px;
  padding: 0 30px 0 14px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background-color: var(--c-surface);
  /* 原生箭头会贴到右边缘，改用自绘箭头，固定在右侧留白内 */
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23b0aea5' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  appearance: none;
  color: var(--c-dark);
  font-family: var(--font-heading);
  font-size: 12.5px;
  cursor: pointer;
}

.q-filter-select:focus {
  border-color: var(--c-orange);
  outline: none;
}

/* 「全部」与「筛选」是互斥的选中态：默认都未选中，筛选生效后只高亮「筛选」 */
.q-filter-all.is-active,
.q-filter-apply.is-active {
  border-color: var(--c-orange);
  background: var(--c-orange);
  color: var(--c-on-accent);
}

.q-filter-apply:hover {
  border-color: var(--c-orange);
  color: var(--c-orange);
}

.q-filter-apply.is-active:hover {
  color: var(--c-on-accent);
  filter: brightness(1.05);
}

/* 入场：整片卡片自上而下依次浮起，只做一次性错峰，不做滚动监听 */
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(9px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* ---------------- 文件 / 试卷：卡片网格 ---------------- */

/* auto-fill + minmax 让卡片数随视口自适应，最少 292px 保证标题不会被挤成两行碎词 */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(292px, 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 164px;
  padding: 16px 18px 14px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  box-shadow: var(--shadow-xs);
  cursor: pointer;
  overflow: hidden;
  animation: rise 0.34s var(--ease-out) both;
  transition: border-color 0.22s var(--ease-soft), box-shadow 0.22s var(--ease-soft),
    transform 0.22s var(--ease-out);
}

.card:hover {
  border-color: rgba(217, 119, 87, 0.42);
  box-shadow: var(--shadow-md);
  transform: translateY(-3px);
}

.card:focus-visible {
  outline: none;
  border-color: var(--c-orange);
  box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.16);
}

/* 卡片顶边压 2px 暖色线：平时低调，hover 时整条点亮，作为卡片的「脊」 */
.card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--c-orange) 42%, transparent);
  opacity: 0.28;
  transition: opacity 0.22s var(--ease-soft);
}

.card:hover::before {
  opacity: 1;
}

/* 眉行：图标 + 类型 + 时间，字号压到最小，把视觉重量让给标题 */
.card-eyebrow {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-heading);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--c-mid-gray);
}

.card-ico {
  display: inline-flex;
  color: var(--c-orange);
}

.card-kind {
  font-weight: 600;
}

/* 眉行里的分隔用细斜杠，比中点更克制，也不吃字距 */
.card-sep {
  color: var(--c-border);
}

/* 时间走数字较多的无衬线栈且不做大写转换（日期里的字母不该被放大） */
.card-time {
  letter-spacing: 0.02em;
  text-transform: none;
}

/* 卡片主体占据剩余高度，使同排卡片的页脚始终贴底对齐 */
.card-body {
  flex: 1;
  margin-top: 12px;
}

.card-title {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--c-dark);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.card-text {
  margin: 8px 0 0;
  font-family: var(--font-body);
  font-size: 12.5px;
  line-height: 1.72;
  color: var(--c-mid-gray);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.card-note {
  margin: 8px 0 0;
  font-family: var(--font-heading);
  font-size: 12px;
  color: var(--c-mid-gray);
}

/* 页脚上方的细分割线只铺 60%，留白让卡片不闷 */
.card-rule {
  height: 1px;
  margin: 14px 0 11px;
  background: linear-gradient(90deg, var(--c-border), var(--c-border) 60%, transparent);
}

.card-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-height: 24px;
}

.card-go {
  display: inline-flex;
  flex: none;
  color: var(--c-light-gray);
  transition: color 0.22s var(--ease-soft), transform 0.22s var(--ease-out);
}

.card:hover .card-go {
  color: var(--c-orange);
  transform: translateX(3px);
}

/* 卡片页脚右侧的删除入口：常态低调，hover 时转成危险色，避免误点 */
.card-act {
  flex: none;
  height: 24px;
  padding: 0 11px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--c-mid-gray);
  font-family: var(--font-heading);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s var(--ease-soft), border-color 0.2s var(--ease-soft),
    color 0.2s var(--ease-soft);
}

.card-act:hover {
  border-color: rgba(220, 38, 38, 0.35);
  background: var(--c-danger-bg);
  color: var(--c-danger);
}

/* ---------------- 题目：完整题干 + 右侧分析面板 ---------------- */

/* 题目列与右侧面板并排：题目列可收缩、面板固定 768px，
   与文件解析页的布局同一套行为（窄屏时面板整块移到题目列下方） */
.qs-layout {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  width: 100%;
}

.qs-main {
  flex: 0 1 900px;
  max-width: 900px;
  min-width: 0;
}

/* 题目行宽对齐文件处理页的题目列（.q-col 同为 900px），
   在这两页之间来回切换时正文的左右边缘落在同一条线上 */
.rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 900px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  padding: 15px 18px 16px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  box-shadow: var(--shadow-xs);
  cursor: pointer;
  animation: rise 0.32s var(--ease-out) both;
  transition: border-color 0.22s var(--ease-soft), background 0.22s var(--ease-soft),
    box-shadow 0.22s var(--ease-soft), transform 0.22s var(--ease-out);
}

.row:hover {
  border-color: rgba(217, 119, 87, 0.42);
  background: rgba(217, 119, 87, 0.035);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

/* 正在右侧面板里查看的那一行：主色描边 + 左侧竖线，和文件解析页选中题目的高亮同一语言 */
.row.is-active {
  border-color: rgba(217, 119, 87, 0.55);
  background: rgba(217, 119, 87, 0.06);
  box-shadow: inset 3px 0 0 var(--c-orange), var(--shadow-sm);
}

.row:focus-visible {
  outline: none;
  border-color: var(--c-orange);
  box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.16);
}

.row-head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 9px;
  font-family: var(--font-heading);
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  /* 行头（学段 / 学科 / 认知目标 / 难度）统一用主题色高亮 */
  color: var(--c-orange);
}

.row-ico {
  display: inline-flex;
  color: var(--c-orange);
}

.row-kind {
  font-weight: 600;
}

.row-sep {
  color: rgba(217, 119, 87, 0.38);
}

/* 来源文件名：单独第二行，与行头图标同一起点左右对齐，超长时省略 */
.row-source-line {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  max-width: 100%;
  margin: -3px 0 9px;
  font-family: var(--font-heading);
  font-size: 12.5px;
  letter-spacing: 0.01em;
  color: var(--c-orange);
}

.row-source-line svg {
  flex: none;
  width: 14px;
  height: 14px;
  opacity: 0.85;
}

.row-source-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 入库时间：移到行尾右下角 */
.row-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.row-time {
  font-family: var(--font-heading);
  font-size: 11px;
  letter-spacing: 0.02em;
  text-transform: none;
  color: var(--c-mid-gray);
  font-variant-numeric: tabular-nums;
}

/* 题干完整展开：Markdown 正文、公式、图片与表格按文件解析页的排版渲染 */
.row-stem {
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.9;
  color: var(--c-dark);
  word-break: break-word;
}

.row-stem :deep(p) {
  margin: 0 0 10px;
}

.row-stem :deep(p:last-child) {
  margin-bottom: 0;
}

.row-stem :deep(h1),
.row-stem :deep(h2),
.row-stem :deep(h3),
.row-stem :deep(h4) {
  margin: 12px 0 10px;
  font-family: var(--font-heading);
  font-size: 15px;
  font-weight: 600;
}

.row-stem :deep(h1:first-child),
.row-stem :deep(h2:first-child),
.row-stem :deep(h3:first-child) {
  margin-top: 0;
}

.row-stem :deep(ul),
.row-stem :deep(ol) {
  margin: 0 0 10px;
  padding-left: 20px;
}

.row-stem :deep(li) {
  margin-bottom: 4px;
}

.row-stem :deep(table) {
  width: 100%;
  margin: 12px 0;
  border-collapse: collapse;
}

.row-stem :deep(th),
.row-stem :deep(td) {
  padding: 7px 10px;
  border: 1px solid var(--c-border);
  font-size: 13.5px;
  font-variant-numeric: tabular-nums;
}

.row-stem :deep(th) {
  background: var(--c-subtle);
  font-family: var(--font-heading);
  font-size: 13px;
  font-weight: 600;
}

.row-stem :deep(img) {
  max-width: 100%;
}

.row-stem :deep(.katex-display) {
  margin: 12px 0;
  overflow-x: auto;
  overflow-y: hidden;
}

/* 行头右侧的操作组：展开分析 + 删除，整体贴右 */
.row-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex: none;
}

/* 展开分析入口：常态低调，hover 时点亮主色并右移，提示「点开看分析」 */
.row-open {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: transparent;
  color: var(--c-mid-gray);
  cursor: pointer;
  transition: border-color 0.2s var(--ease-soft), background 0.2s var(--ease-soft),
    color 0.2s var(--ease-soft), transform 0.2s var(--ease-out);
}

.row-open:hover {
  border-color: rgba(217, 119, 87, 0.55);
  background: rgba(217, 119, 87, 0.08);
  color: var(--c-orange);
  transform: translateX(2px);
}

/* 删除入口：常态低调，hover 时转成危险色，避免误点 */
.row-act {
  flex: none;
  height: 26px;
  padding: 0 12px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--c-mid-gray);
  font-family: var(--font-heading);
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
  cursor: pointer;
  transition: background 0.2s var(--ease-soft), border-color 0.2s var(--ease-soft),
    color 0.2s var(--ease-soft);
}

.row-act:hover {
  border-color: rgba(220, 38, 38, 0.35);
  background: var(--c-danger-bg);
  color: var(--c-danger);
}

.list-foot {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

/* 分页器选中页改用品牌橙：Element Plus 默认蓝在其他主色入口里显得突兀 */
.list-foot :deep(.el-pagination.is-background .el-pager li.is-active) {
  background-color: var(--c-orange);
  color: var(--c-on-accent);
}

.spinner {
  width: 14px;
  height: 14px;
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

/* 尊重系统的减弱动效偏好：只保留状态切换，不做位移 */
@media (prefers-reduced-motion: reduce) {
  .card,
  .row {
    animation: none;
  }

  .card:hover,
  .row:hover,
  .card:hover .card-go {
    transform: none;
  }
}
</style>
