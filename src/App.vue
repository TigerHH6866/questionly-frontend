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

      <!-- 底部：用户头像 + 多语言 + 设置入口（设置暂为占位） -->
      <div class="side-foot">
        <span class="avatar" :title="t('nav.account')">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
            <circle cx="12" cy="9" r="3.4" stroke="currentColor" stroke-width="1.7" />
            <path
              d="M5.2 19.4c.9-3 3.6-4.8 6.8-4.8s5.9 1.8 6.8 4.8"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
            />
          </svg>
        </span>

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
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { setLocale } from '@/i18n'
import { lastImportPath } from '@/utils/importSession'

const route = useRoute()
const { t, locale } = useI18n()

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
  padding: 24px 16px 16px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 12px 32px rgba(20, 20, 19, 0.05);
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
}

.brand-name {
  font-family: var(--font-heading);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
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
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--c-mid-gray);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  font-family: var(--font-heading);
  font-size: 14px;
  color: var(--c-dark);
  text-decoration: none;
  transition: background 0.18s ease, color 0.18s ease;
}

.nav-item:hover {
  background: var(--c-hover);
}

.nav-item.is-active {
  background: var(--c-dark);
  color: var(--c-light);
}

.nav-icon {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
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

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--c-orange), #b65a3c);
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(217, 119, 87, 0.28);
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
  transition: border-color 0.18s ease, color 0.18s ease, background 0.18s ease;
}

.icon-btn:hover {
  border-color: var(--c-orange);
  background: rgba(217, 119, 87, 0.08);
  color: var(--c-orange);
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
  letter-spacing: -0.01em;
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
