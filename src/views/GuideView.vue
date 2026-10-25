<template>
  <div class="guide-page">
    <SiteHeader />

    <main class="guide-main">
      <!-- 页头：与落地页同一套衬线气质，只保留标题与一句话说明 -->
      <section class="guide-hero">
        <div class="guide-glow" aria-hidden="true"></div>
        <p class="guide-eyebrow">{{ t('guide.eyebrow') }}</p>
        <h1 class="guide-title">{{ t('guide.title') }}</h1>
        <p class="guide-sub">{{ t('guide.sub') }}</p>
      </section>

      <div class="guide-layout">
        <!-- 左侧目录：桌面端常驻，点击跳到对应章节；窄屏隐藏，正文直接顺序阅读 -->
        <aside class="guide-toc" aria-label="toc">
          <p class="toc-title">{{ t('guide.toc') }}</p>
          <nav class="toc-nav">
            <button
              v-for="item in toc"
              :key="item.id"
              type="button"
              class="toc-item"
              :class="{ 'is-sub': item.level === 2 }"
              @click="jump(item.id)"
            >
              {{ item.text }}
            </button>
          </nav>
        </aside>

        <article class="guide-doc">
          <!-- 正文来自 src/guide 下的静态 Markdown，图片已放在 public/guide 下 -->
          <div class="guide-body" v-html="html" @click="onBodyClick"></div>

          <div class="guide-back">
            <router-link to="/" class="back-btn">{{ t('guide.back') }}</router-link>
          </div>
        </article>
      </div>
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
import guideMd from '@/guide/guide.zh-CN.md?raw'

const { t } = useI18n()

/** 去掉 Markdown 里的转义反斜杠（如 2\.1），目录与标题里按原文显示 */
function unescapeMd(text) {
  return text.replace(/\\([\\`*_{}[\]()#+\-.!])/g, '$1')
}

/** 目录取正文中的一、二级标题，顺序与渲染结果一致（渲染时按同一顺序补 id） */
const toc = []
guideMd.replace(/^(#{1,2})\s+(.+)$/gm, (_, hashes, text) => {
  toc.push({
    id: `guide-h${toc.length}`,
    level: hashes.length,
    text: unescapeMd(text.trim())
  })
})

const html = computed(() => {
  let index = 0
  return renderMarkdown(guideMd).replace(/<h([12])>/g, (_, level) => `<h${level} id="guide-h${index++}">`)
})

function jump(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** 截图点开看大图：正文图片统一在新标签页打开原图 */
function onBodyClick(event) {
  const img = event.target.closest('img')
  if (img) window.open(img.src, '_blank', 'noopener')
}
</script>

<style scoped>
.guide-page {
  height: 100%;
  overflow-y: auto;
  scrollbar-gutter: stable;
  /* 与首页、法律页保持同一套衬线排版；数字用等高数字 */
  font-family: var(--font-serif);
  font-variant-numeric: lining-nums;
}

.guide-main {
  padding-bottom: 72px;
}

/* ---------- 页头 ---------- */

.guide-hero {
  position: relative;
  overflow: hidden;
  padding: 76px 28px 54px;
  text-align: center;
}

.guide-glow {
  position: absolute;
  top: -260px;
  left: 50%;
  width: 820px;
  height: 520px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(217, 119, 87, 0.16), rgba(217, 119, 87, 0) 68%);
  pointer-events: none;
}

.guide-eyebrow {
  position: relative;
  margin: 0 0 14px;
  font-family: var(--font-heading);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--c-orange);
}

.guide-title {
  position: relative;
  max-width: 880px;
  margin: 0 auto;
  font-size: clamp(30px, 3.4vw, 46px);
  line-height: 1.18;
  letter-spacing: -0.02em;
}

.guide-sub {
  position: relative;
  max-width: 660px;
  margin: 18px auto 0;
  font-size: 15px;
  line-height: 1.9;
  color: var(--c-mid-gray);
}

/* ---------- 目录 + 正文 ---------- */

.guide-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  align-items: start;
  gap: 28px;
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 28px;
}

.guide-toc {
  position: sticky;
  top: 100px;
  padding: 18px 14px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: var(--c-subtle);
  box-shadow: var(--shadow-xs);
}

.toc-title {
  margin: 0 0 10px;
  padding: 0 6px;
  font-family: var(--font-heading);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--c-mid-gray);
}

.toc-nav {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.toc-item {
  display: block;
  width: 100%;
  padding: 7px 8px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  font-family: var(--font-heading);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--c-dark);
  text-align: left;
  cursor: pointer;
  transition: background 0.18s var(--ease-soft), color 0.18s var(--ease-soft);
}

.toc-item:hover {
  background: var(--c-hover);
  color: var(--c-orange);
}

.toc-item.is-sub {
  padding-left: 18px;
  font-size: 12.5px;
  font-weight: 400;
  color: var(--c-mid-gray);
}

.toc-item.is-sub:hover {
  color: var(--c-orange);
}

.guide-doc {
  min-width: 0;
  padding: 42px 52px 38px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  box-shadow: var(--shadow-sm), var(--inset-top);
}

/* 章标题：与上一节留出足够呼吸，并用细分割线断开 */
.guide-body :deep(h1) {
  margin: 0 0 20px;
  padding-top: 40px;
  border-top: 1px solid var(--c-hairline);
  font-size: 26px;
  line-height: 1.4;
  letter-spacing: -0.015em;
  scroll-margin-top: 100px;
}

.guide-body :deep(h1:first-child) {
  padding-top: 0;
  border-top: 0;
}

.guide-body :deep(h2) {
  margin: 30px 0 14px;
  font-size: 19px;
  line-height: 1.5;
  letter-spacing: -0.01em;
  scroll-margin-top: 100px;
}

.guide-body :deep(p) {
  margin: 0 0 14px;
  font-size: 14.8px;
  line-height: 2;
  color: var(--c-dark);
}

.guide-body :deep(strong) {
  font-weight: 600;
}

/* 强调提示（原文里的斜体说明）单独成一段，降低视觉重量 */
.guide-body :deep(em) {
  color: var(--c-mid-gray);
}

.guide-body :deep(ul),
.guide-body :deep(ol) {
  margin: 0 0 16px;
  padding-left: 24px;
}

.guide-body :deep(li) {
  margin: 0 0 8px;
  font-size: 14.8px;
  line-height: 1.95;
  color: var(--c-dark);
}

.guide-body :deep(li::marker) {
  color: var(--c-orange);
}

/* 界面截图：整宽展示，点开可在新标签页看原图 */
.guide-body :deep(img) {
  display: block;
  width: 100%;
  height: auto;
  margin: 20px 0 26px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-subtle);
  box-shadow: var(--shadow-sm);
  cursor: zoom-in;
}

.guide-back {
  margin-top: 36px;
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

@media (max-width: 980px) {
  .guide-layout {
    grid-template-columns: minmax(0, 1fr);
    max-width: 860px;
  }

  .guide-toc {
    display: none;
  }
}

@media (max-width: 720px) {
  .guide-hero {
    padding: 52px 16px 36px;
  }

  .guide-layout {
    padding: 0 16px;
  }

  .guide-doc {
    padding: 28px 22px;
  }
}
</style>
