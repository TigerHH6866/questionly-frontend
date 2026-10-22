<template>
  <div class="compose">
    <!-- 顶部：新建组卷入口卡片（＋ 图标与标题在卡片内居中） -->
    <button type="button" class="new-card" @click="startNew">
      <span class="new-line">
        <span class="new-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
            <path d="M12 5.4v13.2M5.4 12h13.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
          </svg>
        </span>
        <span class="new-title">{{ t('compose.new') }}</span>
        <svg class="new-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
          <path
            d="m9.6 5.6 6.4 6.4-6.4 6.4"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
      <span class="new-hint">{{ t('compose.newHint') }}</span>
    </button>

    <div v-if="!loggedIn" class="placeholder">{{ t('compose.needLogin') }}</div>

    <div v-else-if="loading" class="placeholder">
      <span class="spinner" aria-hidden="true"></span>
      {{ t('process.loading') }}
    </div>

    <div v-else-if="!rows.length" class="placeholder">{{ t('compose.empty') }}</div>

    <template v-else>
      <p class="count">{{ t('compose.recent') }}</p>

      <ul ref="gridRef" class="grid">
        <li v-for="row in visibleRows" :key="row.id" class="paper" @click="open(row)">
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
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { pagePapers } from '@/api/paper'
import { currentUser, isLoggedIn } from '@/utils/auth'

const { t } = useI18n()
const router = useRouter()

const loggedIn = ref(isLoggedIn())
const rows = ref([])
const loading = ref(false)

/**
 * 近期编辑只展示 2 行：列数随视口变化（.grid 是 auto-fill），
 * 所以可见条数 = 列数 × 2，由实际渲染出来的列数决定，而不是写死一个数量。
 */
const gridRef = ref(null)
const columns = ref(1)
const visibleRows = computed(() => rows.value.slice(0, columns.value * 2))

function measureColumns() {
  const el = gridRef.value
  if (!el) return
  const cols = getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length
  columns.value = Math.max(1, cols)
}

/** 只取第一页：近期编辑不需要翻页，多出来的条目由 2 行上限截掉 */
async function load() {
  if (!loggedIn.value) return
  loading.value = true
  try {
    const page = await pagePapers(1)
    rows.value = page.records || []
  } catch {
    rows.value = []
  } finally {
    loading.value = false
  }
  await nextTick()
  measureColumns()
}

/** 新建：先进编辑页，保存时才真正落库 */
function startNew() {
  if (!loggedIn.value) {
    window.dispatchEvent(new CustomEvent('questionly:unauthorized'))
    return
  }
  router.push('/app/compose/new')
}

/** 点击试卷卡片进入编辑页（不带来源标记，编辑器默认返回到本页） */
function open(row) {
  router.push(`/app/compose/${row.id}`)
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
    if (loggedIn.value) load()
    else rows.value = []
  }
)

onMounted(() => {
  load()
  window.addEventListener('resize', measureColumns)
})

onBeforeUnmount(() => window.removeEventListener('resize', measureColumns))
</script>

<style scoped>
.compose {
  width: 100%;
  max-width: 1060px;
  /* 内容（新建卡片 + 近期编辑）整体在页面里水平、垂直居中：
     .page 是纵向 flex 容器，上下 auto 外边距即可吃掉剩余高度。
     条目再多也只是撑满后退化成顶部对齐并正常滚动，不会溢出 */
  margin: auto;
}

/* 新建卡片：虚线描边的整块入口，内容（＋ 图标 + 标题 + 说明）整体居中 */
.new-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-bottom: 22px;
  padding: 16px 20px;
  border: 1px dashed rgba(217, 119, 87, 0.45);
  border-radius: var(--radius-lg);
  background: rgba(217, 119, 87, 0.05);
  text-align: center;
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

/* 图标与标题同处一行、作为一组居中，箭头跟在标题后面做可点击提示 */
.new-line {
  display: inline-flex;
  align-items: center;
  gap: 10px;
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
