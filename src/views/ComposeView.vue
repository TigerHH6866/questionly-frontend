<template>
  <div class="compose">
    <!-- 顶部：新建组卷入口卡片 -->
    <button type="button" class="new-card" @click="startNew">
      <span class="new-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
          <path d="M12 5.4v13.2M5.4 12h13.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
        </svg>
      </span>
      <span class="new-text">
        <span class="new-title">{{ t('compose.new') }}</span>
        <span class="new-hint">{{ t('compose.newHint') }}</span>
      </span>
      <svg class="new-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path
          d="m9.6 5.6 6.4 6.4-6.4 6.4"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <div v-if="!loggedIn" class="placeholder">{{ t('compose.needLogin') }}</div>

    <div v-else-if="loading" class="placeholder">
      <span class="spinner" aria-hidden="true"></span>
      {{ t('process.loading') }}
    </div>

    <div v-else-if="!rows.length" class="placeholder">{{ t('compose.empty') }}</div>

    <template v-else>
      <p class="count">{{ t('compose.total', { total }) }}</p>

      <ul class="grid">
        <li v-for="row in rows" :key="row.id" class="paper" @click="open(row)">
          <div class="paper-head">
            <span class="paper-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none">
                <rect x="4.5" y="3.5" width="15" height="17" rx="2.2" stroke="currentColor" stroke-width="1.6" />
                <path
                  d="M8.6 8.6h6.8M8.6 12h6.8M8.6 15.4h4"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                />
              </svg>
            </span>
            <span class="paper-time">{{ formatTime(row.updatedAt || row.createdAt) }}</span>
          </div>

          <p class="paper-title">{{ row.title }}</p>
          <p v-if="preview(row.content)" class="paper-preview">{{ preview(row.content) }}</p>

          <div class="paper-tags">
            <span v-for="tag in tagList(row.tags)" :key="tag" class="paper-tag">{{ tag }}</span>
          </div>
        </li>
      </ul>

      <div class="list-foot">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="total"
          :page-size="PAGE_SIZE"
          :current-page="pageNo"
          @current-change="goPage"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { pagePapers } from '@/api/paper'
import { currentUser, isLoggedIn } from '@/utils/auth'

const { t } = useI18n()
const router = useRouter()

/** 与后端约定：每页 20 条 */
const PAGE_SIZE = 20

const loggedIn = ref(isLoggedIn())
const rows = ref([])
const total = ref(0)
const pageNo = ref(1)
const loading = ref(false)

async function load() {
  if (!loggedIn.value) return
  loading.value = true
  try {
    const page = await pagePapers(pageNo.value)
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

/** 新建：先进编辑页，保存时才真正落库 */
function startNew() {
  if (!loggedIn.value) {
    window.dispatchEvent(new CustomEvent('questionly:unauthorized'))
    return
  }
  router.push('/compose/new')
}

/** 点击试卷卡片进入编辑页 */
function open(row) {
  router.push(`/compose/${row.id}`)
}

function tagList(tags) {
  return String(tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

/** 列表只做摘要：去掉正文标签、压掉空白后截断 */
function preview(content) {
  return String(content || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90)
}

function formatTime(value) {
  if (!value) return ''
  return String(value).replace('T', ' ').slice(0, 16)
}

// 登录/退出后重新拉取：退出清空列表，登录立刻看到自己的试卷
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
.compose {
  width: 100%;
  max-width: 1060px;
  margin: auto;
}

/* 新建卡片：虚线描边的整块入口，hover 时描边与底色同时加深 */
.new-card {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  margin-bottom: 22px;
  padding: 16px 20px;
  border: 1px dashed rgba(217, 119, 87, 0.45);
  border-radius: var(--radius-lg);
  background: rgba(217, 119, 87, 0.05);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s var(--ease-soft), background 0.2s var(--ease-soft),
    box-shadow 0.2s var(--ease-soft), transform 0.2s var(--ease-out);
}

.new-card:hover {
  border-color: var(--c-orange);
  background: rgba(217, 119, 87, 0.1);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.new-card:active {
  transform: scale(0.995);
}

.new-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, var(--c-orange), var(--c-orange-deep));
  color: var(--c-on-accent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 6px 14px -7px rgba(217, 119, 87, 0.6);
}

.new-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.new-title {
  font-family: var(--font-heading);
  font-size: 15px;
  font-weight: 600;
  color: var(--c-dark);
}

.new-hint {
  font-family: var(--font-body);
  font-size: 12.5px;
  color: var(--c-mid-gray);
}

.new-arrow {
  flex: none;
  margin-left: auto;
  color: var(--c-orange);
  opacity: 0.8;
  transition: transform 0.2s var(--ease-out);
}

.new-card:hover .new-arrow {
  transform: translateX(2px);
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

/* 数字走无衬线栈，避免衬线数字与汉字混排时高低不齐 */
.count {
  margin: 0 0 12px;
  font-family: var(--font-heading);
  font-size: 12.5px;
  color: var(--c-mid-gray);
}

.grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(236px, 1fr));
  margin: 0;
  padding: 0;
  list-style: none;
}

.paper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 148px;
  padding: 14px 16px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  box-shadow: var(--shadow-xs);
  cursor: pointer;
  transition: border-color 0.2s var(--ease-soft), background 0.2s var(--ease-soft),
    box-shadow 0.2s var(--ease-soft), transform 0.2s var(--ease-out);
}

.paper:hover {
  border-color: rgba(217, 119, 87, 0.4);
  background: rgba(217, 119, 87, 0.04);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.paper-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.paper-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  background: rgba(217, 119, 87, 0.1);
  color: var(--c-orange);
  box-shadow: inset 0 0 0 1px rgba(217, 119, 87, 0.16);
}

.paper-time {
  margin-left: auto;
  font-family: var(--font-heading);
  font-size: 11.5px;
  color: var(--c-mid-gray);
}

.paper-title {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 14.5px;
  font-weight: 600;
  color: var(--c-dark);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.paper-preview {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  margin: 0;
  overflow: hidden;
  font-family: var(--font-body);
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--c-mid-gray);
}

.paper-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: auto;
}

.paper-tag {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 9px;
  border-radius: 999px;
  background: rgba(217, 119, 87, 0.1);
  color: var(--c-orange);
  font-family: var(--font-heading);
  font-size: 11.5px;
}

.list-foot {
  display: flex;
  justify-content: center;
  margin-top: 22px;
}

/* 分页器选中页改用品牌橙：Element Plus 默认蓝与其他主色入口对比突兀 */
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
