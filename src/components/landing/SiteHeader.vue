<template>
  <header class="site-head">
    <div class="head-inner">
      <!-- 左：logo + 名称，点击回落地页 -->
      <router-link to="/" class="brand" :title="t('app.name')">
        <img class="brand-logo" src="/logo.png" alt="" width="41" height="41" />
        <span class="brand-name">{{ t('app.name') }}</span>
      </router-link>

      <!-- 右：工作区 / 定价 / 教程 + 头像与设置 -->
      <div class="head-right">
        <nav class="head-nav">
          <router-link to="/app" class="nav-link">{{ t('landing.nav.workspace') }}</router-link>
          <router-link to="/plans" class="nav-link">{{ t('landing.nav.pricing') }}</router-link>
          <router-link to="/guide" class="nav-link">{{ t('landing.nav.guide') }}</router-link>
        </nav>

        <div class="account-wrap">
          <button
            v-if="loggedIn"
            type="button"
            class="avatar"
            :title="displayName"
            :aria-label="displayName"
            @click="menuOpen = !menuOpen"
          >
            <img v-if="currentUser?.avatar" class="avatar-img" :src="currentUser.avatar" alt="" />
            <span v-else class="avatar-letter">{{ initial }}</span>
          </button>
          <button v-else type="button" class="login-btn" @click="askLogin">
            {{ t('landing.login') }}
          </button>

          <transition name="pop">
            <div v-if="menuOpen" class="menu">
              <div class="menu-head">
                <p class="menu-name">{{ displayName }}</p>
                <p class="menu-email">{{ currentUser?.email }}</p>
                <span class="menu-credits">⭐ {{ currentUser?.credits ?? 0 }} {{ t('auth.credits') }}</span>
              </div>
              <button type="button" class="menu-item" @click="goWorkspace">
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4 10.6 12 4.2l8 6.4V19a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 19v-8.4Z"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span>{{ t('landing.account.workspace') }}</span>
              </button>
              <!-- 设置页尚未实现：先与工作区侧栏的占位入口保持一致，不做跳转 -->
              <button type="button" class="menu-item" @click="menuOpen = false">
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6" />
                  <path
                    d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span>{{ t('landing.account.settings') }}</span>
              </button>
              <button type="button" class="menu-item is-danger" @click="signOut">
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M15 8.2V5.6A1.6 1.6 0 0 0 13.4 4H6.6A1.6 1.6 0 0 0 5 5.6v12.8A1.6 1.6 0 0 0 6.6 20h6.8a1.6 1.6 0 0 0 1.6-1.6v-2.6M10 12h10m0 0-3-3m3 3-3 3"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span>{{ t('landing.account.logout') }}</span>
              </button>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { clearAuth, currentUser, isLoggedIn } from '@/utils/auth'

const { t } = useI18n()
const router = useRouter()

const menuOpen = ref(false)
/** 登录态（currentUser 是响应式，登录/退出都会重算） */
const loggedIn = computed(() => Boolean(currentUser.value) && isLoggedIn())
const displayName = computed(() => currentUser.value?.nickname || currentUser.value?.email || t('nav.account'))
const initial = computed(() => (displayName.value || '?').trim().slice(0, 1).toUpperCase())

function askLogin() {
  menuOpen.value = false
  window.dispatchEvent(new CustomEvent('questionly:auth', { detail: { tab: 'signin' } }))
}

function goWorkspace() {
  menuOpen.value = false
  router.push('/app')
}

function signOut() {
  clearAuth()
  menuOpen.value = false
}

function onDocumentClick(event) {
  if (menuOpen.value && !event.target.closest('.account-wrap')) menuOpen.value = false
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<style scoped>
.site-head {
  position: sticky;
  top: 0;
  z-index: 40;
  border-bottom: 1px solid var(--c-hairline);
  background: rgba(250, 249, 245, 0.84);
  backdrop-filter: blur(14px) saturate(1.2);
}

html.dark .site-head {
  background: rgba(30, 30, 28, 0.82);
}

.head-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  /* 顶导铺满整幅：品牌区左对齐、导航与头像右对齐；两侧留出随屏宽自适应的留白，
     避免大屏下贴到屏幕物理边缘显得局促 */
  padding: 17px clamp(28px, 3vw, 56px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: var(--c-dark);
}

.brand-logo {
  display: block;
  width: 41px;
  height: 41px;
  object-fit: contain;
}

.brand-name {
  font-family: var(--font-heading);
  font-size: 21.5px;
  font-weight: 600;
  letter-spacing: -0.015em;
}

.head-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.head-nav {
  display: flex;
  align-items: center;
  gap: 5px;
}

.nav-link {
  padding: 10px 17px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font-family: var(--font-heading);
  font-size: 17px;
  font-weight: 500;
  color: var(--c-dark);
  text-decoration: none;
  cursor: pointer;
  transition: background 0.2s var(--ease-soft), color 0.2s var(--ease-soft);
}

.nav-link:hover {
  background: var(--c-hover);
  color: var(--c-orange);
}

/* 未登录：登录按钮；已登录：头像 */
.login-btn {
  padding: 11px 22px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-surface);
  font-family: var(--font-heading);
  font-size: 17px;
  font-weight: 500;
  color: var(--c-dark);
  cursor: pointer;
  box-shadow: var(--shadow-xs);
  transition: border-color 0.2s var(--ease-soft), color 0.2s var(--ease-soft), transform 0.2s var(--ease-out);
}

.login-btn:hover {
  border-color: var(--c-orange);
  color: var(--c-orange);
  transform: translateY(-1px);
}

.account-wrap {
  position: relative;
}

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: linear-gradient(150deg, rgba(217, 119, 87, 0.22), rgba(217, 119, 87, 0.06));
  color: var(--c-orange-deep);
  font-family: var(--font-heading);
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-xs);
  transition: transform 0.2s var(--ease-out), border-color 0.2s var(--ease-soft);
}

.avatar:hover {
  transform: translateY(-1px);
  border-color: var(--c-orange);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-letter {
  line-height: 1;
}

/* 账号浮层：与工作区同一套观感 */
.menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 248px;
  padding: 8px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  box-shadow: var(--shadow-lg), var(--inset-top);
}

.menu-head {
  padding: 10px 12px 12px;
  border-bottom: 1px solid var(--c-border);
}

.menu-name {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 14px;
  font-weight: 600;
}

.menu-email {
  margin: 3px 0 8px;
  overflow: hidden;
  font-size: 12px;
  color: var(--c-mid-gray);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-credits {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  background: linear-gradient(120deg, rgba(217, 119, 87, 0.18), rgba(217, 119, 87, 0.07));
  font-family: var(--font-heading);
  font-size: 12px;
  font-weight: 600;
  color: var(--c-orange-deep);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  font-family: var(--font-heading);
  font-size: 13.5px;
  color: var(--c-dark);
  text-align: left;
  cursor: pointer;
  transition: background 0.18s var(--ease-soft), color 0.18s var(--ease-soft);
}

.menu-item:hover {
  background: var(--c-hover);
}

.menu-item.is-danger:hover {
  background: var(--c-danger-bg);
  color: var(--c-danger);
}

.menu-icon {
  width: 17px;
  height: 17px;
  flex: 0 0 17px;
}

.pop-enter-active,
.pop-leave-active {
  transition: opacity 0.18s var(--ease-soft), transform 0.18s var(--ease-out);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

@media (max-width: 720px) {
  .head-inner {
    padding: 12px 16px;
  }

  .head-nav {
    display: none;
  }
}
</style>
