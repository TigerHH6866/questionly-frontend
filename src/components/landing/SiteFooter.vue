<template>
  <footer class="site-foot">
    <div class="foot-inner">
      <div class="foot-brand">
        <span class="foot-lock">
          <img class="foot-logo" src="/logo.png" alt="" width="34" height="34" />
          <span class="foot-name">{{ t('app.name') }}</span>
        </span>
        <p class="foot-tagline">{{ t('landing.footer.tagline') }}</p>
      </div>

      <nav class="foot-cols">
        <div class="foot-col">
          <p class="foot-col-title">{{ t('landing.footer.product') }}</p>
          <router-link to="/app" class="foot-link">{{ t('nav.import') }}</router-link>
          <router-link to="/app/search" class="foot-link">{{ t('nav.search') }}</router-link>
          <router-link to="/app/compose" class="foot-link">{{ t('nav.compose') }}</router-link>
          <router-link to="/app/resources" class="foot-link">{{ t('nav.resources') }}</router-link>
        </div>

        <div class="foot-col">
          <p class="foot-col-title">{{ t('landing.footer.learn') }}</p>
          <button type="button" class="foot-link" @click="goSection('search')">
            {{ t('landing.search.title') }}
          </button>
          <button type="button" class="foot-link" @click="goSection('compose')">
            {{ t('landing.compose.title') }}
          </button>
          <router-link to="/plans" class="foot-link">{{ t('landing.nav.pricing') }}</router-link>
        </div>

        <div class="foot-col">
          <p class="foot-col-title">{{ t('landing.footer.legal') }}</p>
          <router-link to="/terms" class="foot-link">{{ t('landing.footer.terms') }}</router-link>
          <router-link to="/privacy" class="foot-link">{{ t('landing.footer.privacy') }}</router-link>
        </div>
      </nav>
    </div>

    <div class="foot-bar">
      <div class="foot-bar-inner">
        <p class="foot-copy">© 2026 {{ t('app.name') }} · {{ t('landing.footer.rights') }}</p>
        <div class="foot-bar-right">
          <button type="button" class="foot-lang" @click="toggleLocale">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="8.6" stroke="currentColor" stroke-width="1.5" />
              <path d="M3.8 9.2h16.4M3.8 14.8h16.4" stroke="currentColor" stroke-width="1.5" />
              <path
                d="M12 3.4c2 2.3 3 5.2 3 8.6s-1 6.3-3 8.6c-2-2.3-3-5.2-3-8.6s1-6.3 3-8.6Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linejoin="round"
              />
            </svg>
            <span>{{ locale === 'zh-CN' ? t('lang.en') : t('lang.zh') }}</span>
          </button>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { pendingAnchor } from '@/utils/anchor'
import { setLocale } from '@/i18n'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

/** 区块跳转：本页直接滚动；其它页面先回落地页再定位（目标区块由 utils/anchor 暂存，URL 不带 #） */
function goSection(id) {
  if (route.path === '/') {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }
  pendingAnchor.value = id
  router.push('/')
}

function toggleLocale() {
  setLocale(locale.value === 'zh-CN' ? 'en-US' : 'zh-CN')
}
</script>

<style scoped>
/* 页脚用 --c-dark / --c-light 这对互换色：浅色下深底浅字，深色下自动反相 */
.site-foot {
  background: var(--c-dark);
  color: var(--c-light);
}

.foot-inner {
  display: flex;
  flex-wrap: wrap;
  gap: 48px;
  max-width: 1280px;
  margin: 0 auto;
  padding: 64px 28px 44px;
}

.foot-brand {
  flex: 1 1 300px;
  max-width: 420px;
}

.foot-lock {
  display: flex;
  align-items: center;
  gap: 10px;
}

.foot-logo {
  display: block;
  width: 34px;
  height: 34px;
  object-fit: contain;
}

.foot-name {
  font-family: var(--font-heading);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.015em;
}

.foot-tagline {
  margin: 14px 0 0;
  max-width: 340px;
  font-size: 13.5px;
  line-height: 1.85;
  opacity: 0.62;
}

.foot-cols {
  display: flex;
  flex: 0 1 auto;
  flex-wrap: wrap;
  gap: 56px;
}

.foot-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 9px;
  min-width: 112px;
}

.foot-col-title {
  margin: 0 0 5px;
  font-family: var(--font-heading);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  opacity: 0.5;
}

.foot-link {
  padding: 0;
  border: 0;
  background: transparent;
  font-family: var(--font-heading);
  font-size: 13.5px;
  color: inherit;
  text-decoration: none;
  cursor: pointer;
  opacity: 0.72;
  transition: opacity 0.18s var(--ease-soft), color 0.18s var(--ease-soft);
}

.foot-link:hover {
  color: var(--c-orange);
  opacity: 1;
}

.foot-bar {
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

html.dark .foot-bar {
  border-top-color: rgba(255, 255, 255, 0.1);
}

.foot-bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  max-width: 1280px;
  margin: 0 auto;
  padding: 18px 28px;
}

.foot-copy {
  margin: 0;
  font-size: 12.5px;
  opacity: 0.55;
}

.foot-bar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.foot-lang {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  background: transparent;
  font-family: var(--font-heading);
  font-size: 12.5px;
  color: inherit;
  cursor: pointer;
  opacity: 0.78;
  transition: opacity 0.18s var(--ease-soft), border-color 0.18s var(--ease-soft), color 0.18s var(--ease-soft);
}

html.dark .foot-lang {
  border-color: var(--c-hairline-strong);
}

.foot-lang:hover {
  border-color: var(--c-orange);
  color: var(--c-orange);
  opacity: 1;
}

@media (max-width: 720px) {
  .foot-inner {
    gap: 32px;
    padding: 44px 16px 32px;
  }

  .foot-cols {
    gap: 32px;
  }

  .foot-bar-inner {
    flex-direction: column;
    align-items: flex-start;
    padding: 16px;
  }
}
</style>
