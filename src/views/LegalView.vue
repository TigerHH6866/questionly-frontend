<template>
  <div class="legal">
    <SiteHeader />

    <main class="legal-main">
      <article class="legal-doc">
        <p class="legal-eyebrow">{{ t(`legal.${kind}.eyebrow`) }}</p>
        <h1 class="legal-title">{{ t(`legal.${kind}.title`) }}</h1>
        <p class="legal-updated">{{ t('legal.updated') }}</p>

        <!-- 正文来自 src/legal 下的静态 Markdown（renderMarkdown 用 html:false 解析，原文里的 HTML 会被转义） -->
        <div class="legal-body" v-html="html"></div>

        <div class="legal-back">
          <router-link to="/" class="back-btn">{{ t('legal.back') }}</router-link>
        </div>
      </article>
    </main>

    <SiteFooter />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SiteHeader from '@/components/landing/SiteHeader.vue'
import SiteFooter from '@/components/landing/SiteFooter.vue'
import { renderMarkdown } from '@/utils/markdown'
import termsZh from '@/legal/terms.zh-CN.md?raw'
import termsEn from '@/legal/terms.en-US.md?raw'
import privacyZh from '@/legal/privacy.zh-CN.md?raw'
import privacyEn from '@/legal/privacy.en-US.md?raw'

const props = defineProps({
  /** terms=用户协议；privacy=隐私政策 —— 两份文本共用同一套排版，正文各自一份 Markdown */
  kind: { type: String, default: 'terms' }
})

const { t, locale } = useI18n()

// 每种语言一份 Markdown 源文件，按当前语言取用；缺失时回落到中文版
const DOCS = {
  terms: { 'zh-CN': termsZh, 'en-US': termsEn },
  privacy: { 'zh-CN': privacyZh, 'en-US': privacyEn }
}

const html = computed(() => {
  const doc = DOCS[props.kind] || DOCS.terms
  return renderMarkdown(doc[locale.value] || doc['zh-CN'])
})
</script>

<style scoped>
.legal {
  height: 100%;
  overflow-y: auto;
  scrollbar-gutter: stable;
  /* 与首页保持同一套衬线气质（协议/政策本身就是整篇阅读型文本），数字用等高数字 */
  font-family: var(--font-serif);
  font-variant-numeric: lining-nums;
}

.legal-main {
  max-width: 1280px;
  margin: 0 auto;
  padding: 56px 28px 72px;
}

.legal-doc {
  max-width: 860px;
  margin: 0 auto;
  padding: 46px 52px 42px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  box-shadow: var(--shadow-sm), var(--inset-top);
}

.legal-eyebrow {
  margin: 0 0 12px;
  font-family: var(--font-heading);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--c-orange);
}

.legal-title {
  margin: 0;
  font-size: clamp(28px, 3vw, 38px);
  letter-spacing: -0.02em;
}

.legal-updated {
  margin: 12px 0 30px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--c-hairline);
  font-family: var(--font-heading);
  font-size: 12.5px;
  color: var(--c-mid-gray);
}

/* 以下是 Markdown 渲染结果的排版（条标题、条款段落、枚举子项、加粗与分割线） */
.legal-body :deep(h2) {
  margin: 34px 0 14px;
  font-size: 17px;
  line-height: 1.5;
  letter-spacing: -0.01em;
}

.legal-body :deep(p) {
  margin: 0 0 12px;
  font-size: 14.5px;
  line-height: 2;
  color: var(--c-dark);
}

.legal-body :deep(strong) {
  font-weight: 600;
}

/* 生成式 AI 特别告知这类需要单独提示的段落，用引用块承载 */
.legal-body :deep(blockquote) {
  margin: 0 0 26px;
  padding: 16px 20px;
  border-left: 3px solid var(--c-orange);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  background: var(--c-subtle);
}

.legal-body :deep(blockquote p) {
  margin: 0;
  font-size: 14px;
  line-height: 1.95;
}

/* （1）（2）这类枚举子项：左侧缩进但不重复加项目符号 */
.legal-body :deep(ul) {
  margin: 0 0 14px;
  padding-left: 20px;
  list-style: none;
}

.legal-body :deep(li) {
  margin: 0 0 8px;
  font-size: 14.5px;
  line-height: 1.95;
  color: var(--c-dark);
}

.legal-body :deep(hr) {
  margin: 32px 0 22px;
  border: 0;
  border-top: 1px solid var(--c-hairline);
}

.legal-back {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid var(--c-hairline);
}

.back-btn {
  display: inline-flex;
  align-items: center;
  padding: 11px 22px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-surface);
  font-family: var(--font-heading);
  font-size: 14px;
  font-weight: 500;
  color: var(--c-dark);
  text-decoration: none;
  transition: border-color 0.2s var(--ease-soft), color 0.2s var(--ease-soft), transform 0.2s var(--ease-out);
}

.back-btn:hover {
  border-color: var(--c-orange);
  color: var(--c-orange);
  transform: translateY(-1px);
}

@media (max-width: 720px) {
  .legal-main {
    padding: 32px 16px 48px;
  }

  .legal-doc {
    padding: 28px 22px;
  }
}
</style>
