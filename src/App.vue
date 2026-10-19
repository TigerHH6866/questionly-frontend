<template>
  <!-- 工作区外壳：仅在 /app 路由下渲染；落地页与法律页是全幅独立页面，不套侧栏 -->
  <div v-if="inWorkspace" class="shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">
          <!-- 品牌标：用 resources/logo-2048.png 裁切后的成品（frontend/public/logo.png），
               图形本身已带透明留白，这里只负责缩放 -->
          <img class="brand-logo" src="/logo.png" alt="" width="34" height="34" />
        </span>
        <span class="brand-name">{{ t('app.name') }}</span>
      </div>

      <nav class="nav">
        <p class="nav-label">{{ t('nav.section') }}</p>

        <router-link to="/app" class="nav-item" :class="{ 'is-active': isImport }">
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

        <router-link to="/app/search" class="nav-item" :class="{ 'is-active': isSearch }">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="6.2" stroke="currentColor" stroke-width="1.6" />
            <path d="m15.6 15.6 4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
          <span>{{ t('nav.search') }}</span>
        </router-link>

        <router-link to="/app/compose" class="nav-item" :class="{ 'is-active': isCompose }">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="4.5" y="3.5" width="15" height="17" rx="2.2" stroke="currentColor" stroke-width="1.6" />
            <path
              d="M8.6 8.6h6.8M8.6 12h6.8M8.6 15.4h4"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
          </svg>
          <span>{{ t('nav.compose') }}</span>
        </router-link>

        <router-link to="/app/resources" class="nav-item" :class="{ 'is-active': isResources }">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3.8 7.3a2.1 2.1 0 0 1 2.1-2.1h3l1.8 2h7.4a2.1 2.1 0 0 1 2.1 2.1v8.5a2.1 2.1 0 0 1-2.1 2.1H5.9a2.1 2.1 0 0 1-2.1-2.1V7.3Z"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linejoin="round"
            />
          </svg>
          <span>{{ t('nav.resources') }}</span>
        </router-link>
      </nav>

      <!-- 近期文件：内联列表，仅展示最近 10 条，点击进入该文件的题目渲染页 -->
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
                <span class="account-credits-pill">{{ quotaText }}</span>
              </div>
              <!-- 账号菜单入口：「升级套餐」「门户主页」新标签页打开，「我的订单」跳订单页 -->
              <div class="account-menu">
                <button
                  v-for="entry in accountEntries"
                  :key="entry.label"
                  type="button"
                  class="account-entry"
                  @click="onAccountEntry(entry)"
                >
                  <svg class="entry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      :d="entry.path"
                      stroke="currentColor"
                      stroke-width="1.6"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  <span class="entry-label">{{ t(entry.label) }}</span>
                  <svg class="entry-arrow" viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
                    <path
                      d="m9.6 5.6 6.4 6.4-6.4 6.4"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              </div>

              <button type="button" class="account-logout" @click="logout">{{ t('auth.logout') }}</button>
            </div>
          </transition>
        </div>

        <div class="foot-actions">
          <!-- 主题切换：浅色时显示月亮（点击进入深色），深色时显示太阳 -->
          <button
            type="button"
            class="icon-btn"
            :title="theme === 'dark' ? t('nav.themeLight') : t('nav.themeDark')"
            :aria-label="theme === 'dark' ? t('nav.themeLight') : t('nav.themeDark')"
            @click="toggleTheme"
          >
            <svg v-if="theme === 'dark'" viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="4.1" stroke="currentColor" stroke-width="1.5" />
              <path
                d="M12 2.9v1.9M12 19.2v1.9M4.6 12H2.7M21.3 12h-1.9M6.8 6.8 5.4 5.4M18.6 18.6l-1.4-1.4M17.2 6.8l1.4-1.4M5.4 18.6l1.4-1.4"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
            <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
              <path
                d="M20.6 14.4A8.6 8.6 0 0 1 9.6 3.4a8.6 8.6 0 1 0 11 11Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linejoin="round"
              />
            </svg>
          </button>

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
        </div>
      </div>
    </aside>

    <main class="main">
      <header class="topbar" :class="{ 'is-compact': isEditor }">
        <!-- 顶栏左侧插槽：入口页的标签栏等投射到这里（不再有页面标题文案） -->
        <div ref="topbarLead" class="topbar-lead"></div>
        <!-- 页面级操作插槽：处理页把文件标题卡片投射到这里，水平居中 -->
        <div ref="topbarSlot" class="topbar-slot"></div>
      </header>

      <div class="page">
        <!-- 以路径为 key：同一组件在不同文件间切换时强制重建，
             否则实例被复用、onMounted 不再执行，页面会停在上一个文件的解析结果上 -->
        <router-view :key="route.path" />
      </div>
    </main>

  </div>

  <!-- 落地页 / 法律页：整幅渲染，不带工作区外壳 -->
  <router-view v-else />

  <!-- 登录弹窗挂在最外层，落地页与工作区共用（原先在 .shell 内部，外壳隐藏时弹不出来） -->
  <AuthModal v-model="authOpen" :initial-tab="authTab" />
  <!-- 支付弹窗同样挂在最外层：套餐页定价卡与工作区账号菜单都通过 questionly:pay 打开它 -->
  <PayModal v-model="payOpen" :initial-plan-id="payPlanId" />
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AuthModal from '@/components/AuthModal.vue'
import PayModal from '@/components/PayModal.vue'
import { pageOcrTasks } from '@/api/ocr'
import { fetchCredits } from '@/api/auth'
import { setLocale } from '@/i18n'
import { clearAuth, currentUser, isLoggedIn, updateQuota } from '@/utils/auth'
import { theme, toggleTheme } from '@/utils/theme'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()

const authOpen = ref(false)
const authTab = ref('signin')
const payOpen = ref(false)
/** 支付弹窗默认选中的套餐，0 表示按当前套餐自动选下一档 */
const payPlanId = ref(0)
const accountOpen = ref(false)

const displayName = computed(() => currentUser.value?.nickname || currentUser.value?.email || t('nav.account'))

/** 账号卡片里的额度胶囊：积分 + 题目额度（数值取自后端账本，登录与每次扣减后刷新） */
const quotaText = computed(
  () =>
    `⭐ ${currentUser.value?.credits ?? 0} ${t('auth.credits')} · ${currentUser.value?.questionCount ?? 0} ${t('auth.questions')}`
)

/** 账号卡片里的入口；具体行为见 onAccountEntry */
const accountEntries = [
  {
    label: 'nav.portal',
    path: 'M4 10.6 12 4.2l8 6.4V19a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 19v-8.4Z'
  },
  { label: 'nav.upgrade', path: 'M12 19.6V5.6m0 0-5.2 5.2M12 5.6l5.2 5.2' },
  {
    label: 'nav.orders',
    path: 'M5.8 5.4A1.6 1.6 0 0 1 7.4 3.8h9.2a1.6 1.6 0 0 1 1.6 1.6v15.2l-3.1-1.9-3.1 1.9-3.1-1.9-3.1 1.9V5.4ZM9.2 9h5.6M9.2 12.6h5.6'
  },
  {
    label: 'nav.support',
    path: 'M4.6 6.9A2.6 2.6 0 0 1 7.2 4.3h9.6a2.6 2.6 0 0 1 2.6 2.6v6a2.6 2.6 0 0 1-2.6 2.6H10l-4.2 3.4v-3.4H7.2a2.6 2.6 0 0 1-2.6-2.6v-6Z'
  }
]

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

/** 落地页顶导的「登录」按钮等外部入口：广播 questionly:auth 即可打开弹窗（可指定默认标签） */
function onAuthRequest(event) {
  accountOpen.value = false
  authTab.value = event?.detail?.tab === 'signup' ? 'signup' : 'signin'
  authOpen.value = true
}

/** 账号菜单入口：「升级套餐」「门户主页」新标签页打开外部页面，「我的订单」跳订单页 */
function onAccountEntry(entry) {
  accountOpen.value = false
  if (entry.label === 'nav.upgrade') {
    window.open('/plans', '_blank', 'noopener')
  } else if (entry.label === 'nav.portal') {
    window.open('/', '_blank', 'noopener')
  } else if (entry.label === 'nav.orders') {
    router.push('/app/orders')
  }
}

/** 打开支付弹窗；未登录先走登录流程。planId 为 0 时由弹窗按当前套餐自动选下一档 */
function openPay(planId) {
  if (!loggedIn.value) {
    onAuthRequest({ detail: { tab: 'signin' } })
    return
  }
  payPlanId.value = Number(planId) || 0
  payOpen.value = true
}

/** 套餐页定价卡的「立即购买」广播 questionly:pay 打开支付弹窗 */
function onPayRequest(event) {
  openPay(event?.detail?.planId)
}

/** 登录态（currentUser 为响应式，登录/退出都会触发重算） */
const loggedIn = computed(() => Boolean(currentUser.value) && isLoggedIn())

/** 顶栏操作插槽：用 ref 暴露节点，供子页面 Teleport 投射内容（用 ref 而非选择器，
 *  因为子页面挂载时整棵树还没插入 document，选择器查不到） */
const topbarSlot = ref(null)
provide('topbarSlot', topbarSlot)

/** 顶栏左侧插槽：入口页的标签栏投射到这里，与原来的页标题同一位置 */
const topbarLead = ref(null)
provide('topbarLead', topbarLead)

/** 侧栏「近期文件」展示最近 10 条 */
const RECENT_SIZE = 10
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
  router.push(`/app/tasks/${row.id}/process`)
}

/** 从后端账本刷新积分与题目额度（登录后、每次扣减或退回后调用） */
async function refreshQuota() {
  if (!isLoggedIn()) return
  try {
    const quota = await fetchCredits()
    if (quota) updateQuota({ credits: quota.credits, questionCount: quota.questions })
  } catch {
    // 刷新失败不打扰用户，保留上一次展示值
  }
}

function isCurrentTask(row) {
  return route.path === `/app/tasks/${row.id}/process`
}

/** 是否处于工作区（/app 下）。落地页与法律页走不带侧栏的整幅布局 */
const inWorkspace = computed(() => route.path.startsWith('/app'))

// 每次路由变化刷新一次，保证导入完成后列表是最新的；离开工作区时不再请求
watch(() => route.path, () => {
  if (inWorkspace.value) loadRecent()
}, { immediate: false })
// 登录后拉取列表与额度，退出登录后清空列表。
// 只监听登录态本身（不监听 currentUser 对象）：额度刷新会重新赋值 currentUser，
// 若监听对象引用就会「刷新额度 → 赋值 → 再刷新」无限循环，导致订单页等反复清空重载（闪烁）
watch(() => Boolean(currentUser.value), () => {
  loadRecent()
  refreshQuota()
})

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  window.addEventListener('questionly:unauthorized', onUnauthorized)
  window.addEventListener('questionly:auth', onAuthRequest)
  // 套餐页定价卡点击「立即购买」时广播，打开支付弹窗
  window.addEventListener('questionly:pay', onPayRequest)
  // 新建 OCR 任务后由导入页广播，让新文件立刻出现在列表首位
  window.addEventListener('questionly:recent-refresh', loadRecent)
  // 解析扣分 / 入库扣题后由页面广播，同步账号胶囊里的额度
  window.addEventListener('questionly:credits-refresh', refreshQuota)
  loadRecent()
  refreshQuota()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  window.removeEventListener('questionly:unauthorized', onUnauthorized)
  window.removeEventListener('questionly:auth', onAuthRequest)
  window.removeEventListener('questionly:pay', onPayRequest)
  window.removeEventListener('questionly:recent-refresh', loadRecent)
  window.removeEventListener('questionly:credits-refresh', refreshQuota)
})

/** 「导入新文件」只在空白上传页高亮；文件处理页的焦点由侧栏的近期文件列表体现 */
const isImport = computed(() => route.path === '/app')
const isSearch = computed(() => route.path.startsWith('/app/search'))
const isCompose = computed(() => route.path.startsWith('/app/compose'))
/** 试卷编辑页：顶栏压缩高度，并承载「返回」按钮 */
const isEditor = computed(() => route.name === 'paper-editor')
const isResources = computed(() => route.path.startsWith('/app/resources'))

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
  flex: 0 0 244px;
  /* 关键：不设 0 时，内部 nowrap 的长文件名会顶开 min-content 宽度，把侧栏撑到几百 px */
  min-width: 0;
  padding: 24px 16px 16px;
  background: var(--c-sidebar);
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

/* 品牌标：图形自带透明留白，这里不再加底色、描边与投影，只负责给它一个盒子 */
.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
}

/* 像素风图形缩小到 34px 会被浏览器平滑插值，保持等比即可，不做额外的图形改动 */
.brand-logo {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
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
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  font-family: var(--font-heading);
  font-size: 14px;
  color: var(--c-dark);
  text-align: left;
  text-decoration: none;
  cursor: pointer;
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

/* 深色下选中项改用「比侧栏略亮的面」，而不是跟着令牌反相成一整条纯白药丸：
   白底深字在深色侧栏上过于刺眼，与周围层级读不到一起 */
html.dark .nav-item.is-active {
  background: var(--c-light-gray);
  color: var(--c-dark);
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
  background: linear-gradient(135deg, var(--c-orange), var(--c-orange-deep));
  color: var(--c-on-accent);
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
  width: 236px;
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

/* 账号卡片入口区：与上方账号信息用一条分隔线断开 */
.account-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 2px;
  padding-top: 10px;
  border-top: 1px solid var(--c-border);
}

.account-entry {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 8px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--c-dark);
  font-family: var(--font-heading);
  font-size: 13.5px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background 0.18s var(--ease-soft), color 0.18s var(--ease-soft);
}

.account-entry:hover {
  background: var(--c-hover);
}

.entry-icon {
  flex: none;
  width: 17px;
  height: 17px;
  color: var(--c-mid-gray);
  transition: color 0.18s var(--ease-soft);
}

.account-entry:hover .entry-icon {
  color: var(--c-orange);
}

.entry-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 右侧指示符：hover 时轻微右移，暗示「可进入」 */
.entry-arrow {
  flex: none;
  margin-left: auto;
  color: var(--c-mid-gray);
  opacity: 0.75;
  transition: transform 0.18s var(--ease-out), opacity 0.18s var(--ease-soft);
}

.account-entry:hover .entry-arrow {
  opacity: 1;
  transform: translateX(2px);
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
  background: var(--c-danger-bg);
  border-color: rgba(220, 38, 38, 0.28);
  color: var(--c-danger);
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

/* 高度取 80px，让顶栏内容的垂直中线与侧栏品牌行（24px 上内边距 + 32px 图标）对齐 */
.topbar {
  position: relative;
  display: flex;
  align-items: center;
  height: 80px;
  padding: 0 4px 0 8px;
}

/* 试卷编辑页：顶栏只放一个返回按钮，高度压到 48px，把纵向空间让给编辑区 */
.topbar.is-compact {
  height: 48px;
  padding: 0 4px 0 2px;
}

/* 顶栏左侧：投射进来的标签栏等操作元素，靠左贴齐（原页面标题的位置） */
.topbar-lead {
  display: flex;
  align-items: center;
  min-width: 0;
}

/* 顶栏整体操作区：按整行（即 .page 的内容区）定位并水平居中，
   这样投射进来的卡片与页面居中排布的题目区域共用同一中轴线。
   pointer-events 放开给投射内容自身，避免挡住左侧插槽。 */
.topbar-slot {
  position: absolute;
  inset: 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  pointer-events: none;
}

.topbar-slot > * {
  pointer-events: auto;
}

.page {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  /* 滚动条槽两侧对称预留：内容区中心与整行中心重合（顶栏卡片的对齐基准），
     同时内容宽度不随滚动条出现 / 消失而跳动 */
  scrollbar-gutter: stable both-edges;
  padding: 0 8px 32px;
  display: flex;
  flex-direction: column;
}
</style>
