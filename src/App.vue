<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
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
        <span class="brand-name">{{ t('app.name') }}</span>
      </div>

      <nav class="nav">
        <p class="nav-label">{{ t('nav.section') }}</p>

        <router-link :to="lastImportPath" class="nav-item" :class="{ 'is-active': isImport }">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 15.5V4m0 0L7.8 8.2M12 4l4.2 4.2M4.5 15.5v2.8A2.2 2.2 0 0 0 6.7 20.5h10.6a2.2 2.2 0 0 0 2.2-2.2v-2.8"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>{{ t('nav.import') }}</span>
        </router-link>

        <router-link to="/search" class="nav-item" :class="{ 'is-active': isSearch }">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="6.2" stroke="currentColor" stroke-width="1.6" />
            <path d="m15.6 15.6 4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
          <span>{{ t('nav.search') }}</span>
        </router-link>
      </nav>

      <!-- 近期文件：内联列表，仅展示最近 7 条，点击进入该文件的题目渲染页 -->
      <section v-if="loggedIn" class="recent">
        <p class="recent-label">{{ t('nav.recent') }}</p>
        <ul class="recent-list">
          <li v-for="row in recentTasks" :key="row.id">
            <button
              type="button"
              class="recent-item"
              :class="{ 'is-active': isCurrentTask(row) }"
              :title="row.fileName"
              @click="openTask(row)"
            >
              {{ row.fileName }}
            </button>
          </li>
          <li v-if="!recentTasks.length" class="recent-empty">{{ t('tasks.empty') }}</li>
        </ul>
      </section>

      <!-- 底部：用户头像 + 多语言 + 设置入口（设置暂为占位） -->
      <div class="side-foot">
        <div class="account-wrap">
          <button
            type="button"
            class="avatar"
            :title="isLoggedIn ? displayName : t('nav.account')"
            :aria-label="t('nav.account')"
            @click="toggleAccount"
          >
            <img v-if="currentUser?.avatar" :src="currentUser.avatar" class="avatar-img" alt="" />
            <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
              <circle cx="12" cy="9" r="3.4" stroke="currentColor" stroke-width="1.7" />
              <path
                d="M5.2 19.4c.9-3 3.6-4.8 6.8-4.8s5.9 1.8 6.8 4.8"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
              />
            </svg>
          </button>

          <transition name="pop">
            <div v-if="accountOpen" class="account-pop">
              <div class="account-info">
                <p class="account-name">{{ displayName }}</p>
                <p class="account-email">{{ currentUser?.email }}</p>
              </div>
              <div class="account-credits">
                <span class="account-credits-pill">⭐ {{ currentUser?.credits ?? 0 }} {{ t('auth.credits') }}</span>
              </div>
              <button type="button" class="account-logout" @click="logout">{{ t('auth.logout') }}</button>
            </div>
          </transition>
        </div>

        <div class="foot-actions">
          <button
            type="button"
            class="icon-btn"
            :title="t('nav.language')"
            :aria-label="t('nav.language')"
            @click="toggleLocale"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="8.6" stroke="currentColor" stroke-width="1.5" />
              <path d="M3.8 9.2h16.4M3.8 14.8h16.4" stroke="currentColor" stroke-width="1.5" />
              <path
                d="M12 3.4c2 2.3 3 5.2 3 8.6s-1 6.3-3 8.6c-2-2.3-3-5.2-3-8.6s1-6.3 3-8.6Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linejoin="round"
              />
            </svg>
            <span class="icon-btn-label">{{ locale === 'zh-CN' ? t('lang.zh') : t('lang.en') }}</span>
          </button>

          <button
            type="button"
            class="icon-btn"
            :title="t('nav.settings')"
            :aria-label="t('nav.settings')"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5" />
              <path
                d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <main class="main">
      <header class="topbar">
        <h1 class="page-title">{{ pageTitle }}</h1>
      </header>

      <div class="page">
        <router-view />
      </div>
    </main>

    <AuthModal v-model="authOpen" :initial-tab="authTab" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AuthModal from '@/components/AuthModal.vue'
import { pageOcrTasks } from '@/api/ocr'
import { setLocale } from '@/i18n'
import { clearAuth, currentUser, isLoggedIn } from '@/utils/auth'
import { lastImportPath } from '@/utils/importSession'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()

const authOpen = ref(false)
const authTab = ref('signin')
const accountOpen = ref(false)

const displayName = computed(() => currentUser.value?.nickname || currentUser.value?.email || t('nav.account'))

/** 未登录点击头像 → 登录弹窗；已登录 → 账号浮层 */
function toggleAccount() {
  if (isLoggedIn()) {
    accountOpen.value = !accountOpen.value
  } else {
    authTab.value = 'signin'
    authOpen.value = true
  }
}

function logout() {
  clearAuth()
  accountOpen.value = false
}

function onDocumentClick(event) {
  if (accountOpen.value && !event.target.closest('.account-wrap')) {
    accountOpen.value = false
  }
}

/** 令牌失效时自动弹出登录框 */
function onUnauthorized() {
  accountOpen.value = false
  authTab.value = 'signin'
  authOpen.value = true
}

/** 登录态（currentUser 为响应式，登录/退出都会触发重算） */
const loggedIn = computed(() => Boolean(currentUser.value) && isLoggedIn())

/** 侧栏「近期文件」只展示最近 7 条 */
const RECENT_SIZE = 7
const recentTasks = ref([])

/** 拉取最近文件；未登录时清空，避免触发 401 提示 */
async function loadRecent() {
  if (!isLoggedIn()) {
    recentTasks.value = []
    return
  }
  try {
    const page = await pageOcrTasks(1, RECENT_SIZE)
    recentTasks.value = page.records || []
  } catch {
    recentTasks.value = []
  }
}

/** 点击记录进入该文件的题目渲染交互页 */
function openTask(row) {
  router.push(`/tasks/${row.id}/process`)
}

function isCurrentTask(row) {
  return route.path === `/tasks/${row.id}/process`
}

// 每次路由变化刷新一次，保证导入完成后列表是最新的
watch(() => route.path, loadRecent)
// 登录后立即拉取，退出登录后清空
watch(currentUser, loadRecent)

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  window.addEventListener('questionly:unauthorized', onUnauthorized)
  loadRecent()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  window.removeEventListener('questionly:unauthorized', onUnauthorized)
})

/** 题目处理页属于「导入题目」这条流程，导航栏焦点保持在导入题目 */
const isImport = computed(() => route.path === '/' || route.path.endsWith('/process'))
const isSearch = computed(() => route.path.startsWith('/search'))

const pageTitle = computed(() => {
  if (isSearch.value) return t('search.title')
  if (route.path.endsWith('/process')) return t('process.title')
  if (route.path === '/tasks') return t('tasks.list')
  if (route.path.startsWith('/tasks/')) return t('tasks.detail')
  return t('import.title')
})

function toggleLocale() {
  setLocale(locale.value === 'zh-CN' ? 'en-US' : 'zh-CN')
}
</script>

<style scoped>
/* 外层只负责划分左右两块，不再有整体边框 */
.shell {
  display: flex;
  gap: 20px;
  height: calc(100vh - 40px);
  margin: 20px;
}

/* 左侧导航：独立卡片块 */
.sidebar {
  display: flex;
  flex-direction: column;
  flex: 0 0 232px;
  /* 关键：不设 0 时，内部 nowrap 的长文件名会顶开 min-content 宽度，把侧栏撑到几百 px */
  min-width: 0;
  padding: 24px 16px 16px;
  background: #f5f5f5;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md), var(--inset-top);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px 26px;
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: rgba(217, 119, 87, 0.12);
  color: var(--c-orange);
  box-shadow: inset 0 0 0 1px rgba(217, 119, 87, 0.16), 0 2px 6px -3px rgba(217, 119, 87, 0.4);
}

.brand-name {
  font-family: var(--font-heading);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.015em;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-label {
  margin: 0 0 8px;
  padding: 0 8px;
  font-family: var(--font-heading);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--c-mid-gray);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  font-family: var(--font-heading);
  font-size: 14px;
  color: var(--c-dark);
  text-decoration: none;
  transition: background 0.2s var(--ease-soft), color 0.2s var(--ease-soft),
    box-shadow 0.2s var(--ease-soft);
}

.nav-item:hover {
  background: var(--c-hover);
}

.nav-item.is-active {
  background: var(--c-dark);
  color: var(--c-light);
  box-shadow: var(--shadow-xs);
}

.nav-icon {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
}

/* 近期文件：侧栏内联列表，占据剩余空间并可滚动 */
.recent {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--c-border);
}

.recent-label {
  margin: 0 0 6px;
  padding: 0 8px;
  font-family: var(--font-heading);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--c-mid-gray);
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  min-height: 0;
  margin: 0;
  padding: 0 0 4px;
  list-style: none;
  overflow-y: auto;
}

.recent-item {
  display: block;
  width: 100%;
  padding: 7px 8px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--c-dark);
  font-family: var(--font-heading);
  font-size: 13px;
  line-height: 1.4;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: background 0.18s var(--ease-soft), color 0.18s var(--ease-soft);
}

.recent-item:hover {
  background: var(--c-hover);
}

.recent-item.is-active {
  background: rgba(217, 119, 87, 0.1);
  color: var(--c-orange);
  font-weight: 500;
}

.recent-empty {
  padding: 4px 8px;
  font-family: var(--font-body);
  font-size: 12.5px;
  color: var(--c-mid-gray);
}

/* 侧栏底部：头像 + 语言 / 设置 */
.side-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding: 14px 4px 2px;
  border-top: 1px solid var(--c-border);
}

.account-wrap {
  position: relative;
  flex: none;
}

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 34px;
  height: 34px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--c-orange), #b65a3c);
  color: #ffffff;
  cursor: pointer;
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35),
    0 1px 2px rgba(217, 119, 87, 0.22), 0 6px 14px -7px rgba(217, 119, 87, 0.55);
  transition: transform 0.15s var(--ease-out), box-shadow 0.2s var(--ease-soft);
}

.avatar:hover {
  transform: translateY(-1px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35),
    0 2px 4px rgba(217, 119, 87, 0.24), 0 10px 20px -9px rgba(217, 119, 87, 0.6);
}

.avatar:active {
  transform: scale(0.96);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 已登录账号浮层：贴着头像向侧栏内部弹出 */
.account-pop {
  position: absolute;
  left: 0;
  bottom: 44px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 200px;
  padding: 14px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg), var(--inset-top);
}

.account-info {
  min-width: 0;
}

.account-name {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 13.5px;
  font-weight: 600;
  color: var(--c-dark);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-email {
  margin: 3px 0 0;
  font-family: var(--font-heading);
  font-size: 11.5px;
  color: var(--c-mid-gray);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-credits-pill {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(217, 119, 87, 0.16), rgba(217, 119, 87, 0.06));
  color: var(--c-orange);
  font-family: var(--font-heading);
  font-size: 12px;
  font-weight: 600;
}

.account-logout {
  height: 32px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-subtle);
  color: var(--c-mid-gray);
  font-family: var(--font-heading);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s var(--ease-soft), color 0.2s var(--ease-soft),
    border-color 0.2s var(--ease-soft);
}

.account-logout:hover {
  background: #fef2f2;
  border-color: rgba(220, 38, 38, 0.28);
  color: #dc2626;
}

.pop-enter-active,
.pop-leave-active {
  transition: opacity 0.18s var(--ease-soft), transform 0.2s var(--ease-out);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.97);
}

.foot-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  min-width: 34px;
  padding: 0 10px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-surface);
  color: var(--c-dark);
  font-family: var(--font-heading);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.2s var(--ease-soft), color 0.2s var(--ease-soft),
    background 0.2s var(--ease-soft), box-shadow 0.2s var(--ease-soft);
}

.icon-btn:hover {
  border-color: rgba(217, 119, 87, 0.55);
  background: rgba(217, 119, 87, 0.08);
  color: var(--c-orange);
  box-shadow: var(--shadow-xs);
}

.icon-btn:active {
  transform: scale(0.97);
}

.icon-btn-label {
  line-height: 1;
}

/* 右侧交互区域：无边界的透明容器 */
.main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

/* 高度取 80px，使标题垂直中线与侧栏品牌行（24px 上内边距 + 32px 图标）对齐 */
.topbar {
  display: flex;
  align-items: center;
  height: 80px;
  padding: 0 4px 0 8px;
}

.page-title {
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.015em;
  text-wrap: balance;
}

.page {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 8px 32px;
  display: flex;
  flex-direction: column;
}
</style>
