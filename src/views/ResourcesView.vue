<template>
  <div class="resources">
    <!-- 标签栏投射到顶栏左侧：入口页不再显示页面标题，标签即该页的主导航 -->
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

    <!-- 我的文件：完整文件列表，每页 20 条 -->
    <template v-if="activeTab === 'files'">
      <div v-if="!loggedIn" class="placeholder">{{ t('resources.needLogin') }}</div>

      <div v-else-if="loading" class="placeholder">
        <span class="spinner" aria-hidden="true"></span>
        {{ t('process.loading') }}
      </div>

      <div v-else-if="!rows.length" class="placeholder">{{ t('resources.empty') }}</div>

      <template v-else>
        <p class="count">{{ t('resources.total', { total }) }}</p>

        <ul class="rows">
          <li v-for="row in rows" :key="row.id" class="row" @click="open(row)">
            <span class="row-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none">
                <path
                  d="M13.5 3.2H7.1A1.9 1.9 0 0 0 5.2 5.1v13.8a1.9 1.9 0 0 0 1.9 1.9h9.8a1.9 1.9 0 0 0 1.9-1.9V8.3l-5.1-5.1Z"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linejoin="round"
                />
                <path d="M13.4 3.4v4.7h4.9" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
              </svg>
            </span>

            <div class="row-main">
              <p class="row-name">{{ row.fileName }}</p>
              <p class="row-meta">
                <span>{{ formatTime(row.createdAt) }}</span>
                <span v-if="row.questionCount">{{ row.questionCount }} {{ t('tasks.column.questionCount') }}</span>
              </p>
            </div>

            <el-tag :type="statusType(row.status)" size="small" effect="light">
              {{ t(`tasks.status.${row.status}`) }}
            </el-tag>
          </li>
        </ul>

        <div class="list-foot">
          <el-pagination
            background
            layout="prev, pager, next"
            :total="total"
            :page-size="FILE_PAGE_SIZE"
            :current-page="pageNo"
            @current-change="goPage"
          />
        </div>
      </template>
    </template>

    <div v-else class="placeholder">{{ t('resources.soon') }}</div>
  </div>
</template>

<script setup>
import { inject, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { pageOcrTasks } from '@/api/ocr'
import { currentUser, isLoggedIn } from '@/utils/auth'

/**
 * 「我的文件」是完整列表，每页 20 条、可翻页；
 * 与侧栏「近期文件」（只列最近 10 条、不翻页）是两种定位，不要共用同一个常量。
 */
const FILE_PAGE_SIZE = 20

const { t } = useI18n()
const router = useRouter()

/** 顶栏左侧插槽：标签栏由 App.vue 提供，投射上去与页标题同一位置 */
const topbarLead = inject('topbarLead', null)

const tabs = [
  { key: 'files', label: 'resources.tabs.files' },
  { key: 'papers', label: 'resources.tabs.papers' },
  { key: 'questions', label: 'resources.tabs.questions' }
]
const activeTab = ref('files')

const loggedIn = ref(isLoggedIn())
const rows = ref([])
const total = ref(0)
const pageNo = ref(1)
const loading = ref(false)

async function load() {
  if (!loggedIn.value) return
  loading.value = true
  try {
    const page = await pageOcrTasks(pageNo.value, FILE_PAGE_SIZE)
    rows.value = page.records || []
    total.value = Number(page.total) || 0
  } catch {
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function goPage(next) {
  pageNo.value = next
  load()
}

/** 点击记录进入该文件的题目渲染交互页 */
function open(row) {
  router.push(`/tasks/${row.id}/process`)
}

function statusType(status) {
  return { SUCCESS: 'success', FAILED: 'danger', PARSING: 'warning' }[status] || 'info'
}

function formatTime(value) {
  if (!value) return ''
  return String(value).replace('T', ' ').slice(0, 16)
}

// 登录/退出后重新拉取：退出要清空列表，登录要立刻看到自己的文件
watch(
  () => currentUser.value,
  () => {
    loggedIn.value = isLoggedIn()
    pageNo.value = 1
    if (loggedIn.value) {
      load()
    } else {
      rows.value = []
      total.value = 0
    }
  }
)

onMounted(load)
</script>

<style scoped>
.resources {
  width: 100%;
  max-width: 1060px;
  margin: auto;
}

/* 标签栏：整体做成一条带底槽的胶囊，选中项是其中的滑块。
   它被投射到顶栏左侧，所以这里不留外边距，间距由顶栏高度给出 */
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

.tab.is-active {
  background: var(--c-dark);
  color: var(--c-light);
}

/* 深色下选中项用「比底槽略亮的面」，理由同侧栏选中项：纯白滑块过于刺眼 */
html.dark .tab.is-active {
  background: var(--c-light-gray);
  color: var(--c-dark);
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

/* 数字改走无衬线栈（--font-heading）：正文衬线体首选 Georgia，
   它用的是旧式数字（3/4/5/7/9 带降部、6/8 带升部、0/1 只有 x 高），
   和汉字/无衬线混排时高低不齐，看起来「怪怪的」 */
.count {
  margin: 0 0 12px;
  font-family: var(--font-heading);
  font-size: 12.5px;
  color: var(--c-mid-gray);
}

.rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  box-shadow: var(--shadow-xs);
  cursor: pointer;
  transition: border-color 0.2s var(--ease-soft), background 0.2s var(--ease-soft),
    box-shadow 0.2s var(--ease-soft), transform 0.2s var(--ease-out);
}

.row:hover {
  border-color: rgba(217, 119, 87, 0.4);
  background: rgba(217, 119, 87, 0.04);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.row-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  background: rgba(217, 119, 87, 0.1);
  color: var(--c-orange);
  box-shadow: inset 0 0 0 1px rgba(217, 119, 87, 0.16);
}

.row-main {
  flex: 1;
  min-width: 0;
}

.row-name {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 14px;
  font-weight: 500;
  color: var(--c-dark);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 时间与题数都是数字，同样走无衬线栈，理由见 .count */
.row-meta {
  display: flex;
  gap: 12px;
  margin: 4px 0 0;
  font-family: var(--font-heading);
  font-size: 12px;
  color: var(--c-mid-gray);
}

.list-foot {
  display: flex;
  justify-content: center;
  margin-top: 22px;
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
</style>
