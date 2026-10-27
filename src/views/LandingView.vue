<template>
  <div class="landing">
    <SiteHeader />

    <!-- 第一屏：hero —— 特点总结 + 演示视频 + 进入工作区 -->
    <section class="hero">
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="wrap hero-inner">
        <p class="eyebrow reveal">{{ t('landing.hero.eyebrow') }}</p>
        <h1 class="hero-title reveal">{{ t('landing.hero.title') }}</h1>
        <p class="hero-sub reveal">{{ t('landing.hero.sub') }}</p>
        <div class="cta-row reveal">
          <router-link to="/app" class="btn btn-primary">{{ t('landing.cta') }}</router-link>
          <button type="button" class="btn btn-ghost" @click="scrollTo('guide')">
            {{ t('landing.hero.secondary') }}
          </button>
        </div>

        <!-- 第一屏大图：静态展示首页主视觉 -->
        <div class="shot reveal">
          <div class="shot-frame">
            <img class="shot-media" src="/hero-home.jpg" :alt="t('landing.hero.title')" />
          </div>
        </div>
      </div>
    </section>

    <!-- 第二屏：两大核心能力（文件解析 / AI 分析题目） -->
    <section id="guide" class="band band-plain">
      <div class="wrap band-inner">
        <header class="band-head reveal">
          <p class="eyebrow">{{ t('landing.features.eyebrow') }}</p>
          <h2 class="band-title">{{ t('landing.features.title') }}</h2>
          <p class="band-sub">{{ t('landing.features.sub') }}</p>
        </header>

        <div class="duo">
          <article class="cap reveal">
            <span class="cap-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
                <path
                  d="M13.4 3.4H7.2A2.2 2.2 0 0 0 5 5.6v12.8a2.2 2.2 0 0 0 2.2 2.2h9.6a2.2 2.2 0 0 0 2.2-2.2V9.4l-5.6-6Z"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linejoin="round"
                />
                <path d="M13.2 3.6v5.6h5.4M8.4 13h7.2M8.4 16.6h4.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
            </span>
            <h3 class="cap-title">{{ t('landing.features.parse.title') }}</h3>
            <p class="cap-desc">{{ t('landing.features.parse.desc') }}</p>
            <ul class="points">
              <li v-for="n in 3" :key="n" class="point">
                <span class="tick" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
                    <path d="m5 12.6 4.4 4.4L19 7.4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
                {{ t(`landing.features.parse.p${n}`) }}
              </li>
            </ul>
          </article>

          <article class="cap reveal">
            <span class="cap-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
                <path
                  d="M12 3.2l1.9 4.9 4.9 1.9-4.9 1.9L12 16.8l-1.9-4.9L5.2 10l4.9-1.9L12 3.2Z"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linejoin="round"
                />
                <path d="M18.4 15.6l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
              </svg>
            </span>
            <h3 class="cap-title">{{ t('landing.features.analyze.title') }}</h3>
            <p class="cap-desc">{{ t('landing.features.analyze.desc') }}</p>
            <ul class="points">
              <li v-for="n in 3" :key="n" class="point">
                <span class="tick" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
                    <path d="m5 12.6 4.4 4.4L19 7.4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
                {{ t(`landing.features.analyze.p${n}`) }}
              </li>
            </ul>
          </article>
        </div>

        <div class="cta-row is-center reveal">
          <router-link to="/app" class="btn btn-primary">{{ t('landing.cta') }}</router-link>
        </div>
      </div>
    </section>

    <!-- 第三屏：便捷搜索 -->
    <section id="search" class="band band-soft">
      <div class="wrap split">
        <div class="split-copy reveal">
          <p class="eyebrow">{{ t('landing.search.eyebrow') }}</p>
          <h2 class="band-title">{{ t('landing.search.title') }}</h2>
          <p class="band-sub">{{ t('landing.search.sub') }}</p>
          <ul class="points">
            <li v-for="n in 3" :key="n" class="point">
              <span class="tick" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
                  <path d="m5 12.6 4.4 4.4L19 7.4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
              {{ t(`landing.search.p${n}`) }}
            </li>
          </ul>
          <router-link to="/app" class="btn btn-primary">{{ t('landing.cta') }}</router-link>
        </div>

        <!-- 检索示意：纯 CSS 绘制的界面缩略图，不依赖任何图片资源 -->
        <div class="mock reveal" aria-hidden="true">
          <div class="mq">
            <span class="mq-icon">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                <circle cx="11" cy="11" r="6.2" stroke="currentColor" stroke-width="1.7" />
                <path d="m15.6 15.6 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
              </svg>
            </span>
            <span class="mq-text">{{ t('landing.search.query') }}</span>
          </div>
          <div class="mhits">
            <div v-for="n in 3" :key="n" class="mhit">
              <p class="mhit-text">{{ t(`landing.search.r${n}`) }}</p>
              <span class="mhit-meta">{{ t('landing.search.meta') }}</span>
            </div>
          </div>
          <p class="mfoot">{{ t('landing.search.foot') }}</p>
        </div>
      </div>
    </section>

    <!-- 第四屏：沉浸式组卷 -->
    <section id="compose" class="band band-plain">
      <div class="wrap split is-flipped">
        <div class="split-copy reveal">
          <p class="eyebrow">{{ t('landing.compose.eyebrow') }}</p>
          <h2 class="band-title">{{ t('landing.compose.title') }}</h2>
          <p class="band-sub">{{ t('landing.compose.sub') }}</p>
          <ul class="points">
            <li v-for="n in 3" :key="n" class="point">
              <span class="tick" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
                  <path d="m5 12.6 4.4 4.4L19 7.4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
              {{ t(`landing.compose.p${n}`) }}
            </li>
          </ul>
          <router-link to="/app" class="btn btn-primary">{{ t('landing.cta') }}</router-link>
        </div>

        <!-- 组卷示意：A4 双页 + 悬浮工具条，同样由 CSS 绘制 -->
        <div class="mock reveal" aria-hidden="true">
          <div class="pm-tool">
            <span v-for="n in 5" :key="n" class="pm-tool-btn"></span>
          </div>
          <div class="pm-pages">
            <div v-for="p in 2" :key="p" class="pm-page" :class="{ 'is-back': p === 2 }">
              <span class="pm-line is-title"></span>
              <span v-for="i in 9" :key="i" class="pm-line" :class="{ 'is-short': i % 4 === 0 }"></span>
              <span class="pm-num">{{ p }}</span>
            </div>
          </div>
          <p class="pm-chip">{{ t('landing.compose.chip') }}</p>
        </div>
      </div>
    </section>

    <SiteFooter />
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import SiteHeader from '@/components/landing/SiteHeader.vue'
import SiteFooter from '@/components/landing/SiteFooter.vue'
import { pendingAnchor } from '@/utils/anchor'

const { t } = useI18n()

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** 滚动入场：给 .reveal 加 .is-in，逐块淡入上移（尊重系统「减少动态效果」设置） */
let observer = null

onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const items = document.querySelectorAll('.reveal')
  if (reduced) {
    items.forEach((el) => el.classList.add('is-in'))
  } else {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in')
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '-8% 0px -12% 0px' }
    )
    items.forEach((el) => observer.observe(el))
  }

  // 从其它页面点区块链接跳回来时滚动到目标区块（ID 由 utils/anchor 跨页暂存，URL 不带 #）
  const anchor = pendingAnchor.value
  if (anchor) {
    pendingAnchor.value = ''
    nextTick(() => scrollTo(anchor))
  }
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<style scoped>
.landing {
  height: 100%;
  overflow-y: auto;
  scrollbar-gutter: stable;
  scroll-behavior: smooth;
  /* 首页保留衬线的编辑排版气质：拉丁走 Georgia / Times New Roman，中文仍回落系统黑体；
     lining-nums 把 Georgia 的旧式非等高数字切换为等高数字（0/3/4/7/9 不再高低不齐） */
  font-family: var(--font-serif);
  font-variant-numeric: lining-nums;
}

.wrap {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 28px;
}

.eyebrow {
  margin: 0 0 14px;
  font-family: var(--font-heading);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--c-orange);
}

.band-title {
  margin: 0;
  font-size: clamp(30px, 3vw, 46px);
  line-height: 1.15;
  letter-spacing: -0.02em;
}

.band-sub {
  max-width: 620px;
  margin: 16px 0 0;
  font-size: 15.5px;
  line-height: 1.9;
  color: var(--c-mid-gray);
}

.cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.cta-row.is-center {
  justify-content: center;
  margin-top: 44px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px 26px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-family: var(--font-heading);
  font-size: 14.5px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.2s var(--ease-out), background 0.2s var(--ease-soft), border-color 0.2s var(--ease-soft),
    color 0.2s var(--ease-soft), box-shadow 0.2s var(--ease-soft);
}

.btn-primary {
  background: var(--c-orange);
  color: var(--c-on-accent);
  box-shadow: 0 8px 20px -10px rgba(217, 119, 87, 0.7);
}

.btn-primary:hover {
  background: var(--c-orange-hover);
  transform: translateY(-2px);
}

.btn-ghost {
  border-color: var(--c-border);
  background: var(--c-surface);
  color: var(--c-dark);
}

.btn-ghost:hover {
  border-color: var(--c-orange);
  color: var(--c-orange);
  transform: translateY(-2px);
}

/* ---------- 第一屏 ---------- */

.hero {
  position: relative;
  overflow: hidden;
  padding: 92px 0 96px;
}

.hero-glow {
  position: absolute;
  top: -320px;
  left: 50%;
  width: 900px;
  height: 620px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(217, 119, 87, 0.22), rgba(217, 119, 87, 0) 68%);
  pointer-events: none;
}

.hero-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.hero-title {
  max-width: 940px;
  margin: 0;
  font-size: clamp(36px, 4.4vw, 64px);
  line-height: 1.08;
  letter-spacing: -0.03em;
}

.hero-sub {
  max-width: 720px;
  margin: 22px 0 32px;
  font-size: 16.5px;
  line-height: 1.9;
  color: var(--c-mid-gray);
}

.shot {
  width: 100%;
  max-width: 1000px;
  margin-top: 60px;
}

.shot-frame {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: linear-gradient(150deg, var(--c-dark), var(--c-orange-deep));
  box-shadow: var(--shadow-lg);
}

.shot-media {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ---------- 屏与屏之间的底色分界 ---------- */

.band {
  display: flex;
  align-items: center;
  min-height: 86vh;
  padding: 96px 0;
}

.band-plain {
  background: var(--c-surface);
}

.band-soft {
  background: var(--c-subtle);
}

.band-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.band-head {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.duo {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
  width: 100%;
  margin-top: 52px;
  text-align: left;
}

.cap {
  padding: 30px 28px 32px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: var(--c-subtle);
  box-shadow: var(--shadow-xs);
}

.band-soft .cap {
  background: var(--c-surface);
}

.cap-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: linear-gradient(150deg, rgba(217, 119, 87, 0.2), rgba(217, 119, 87, 0.06));
  color: var(--c-orange-deep);
}

.cap-title {
  margin: 18px 0 0;
  font-size: 21px;
  letter-spacing: -0.015em;
}

.cap-desc {
  margin: 10px 0 20px;
  font-size: 14.2px;
  line-height: 1.9;
  color: var(--c-mid-gray);
}

.points {
  display: flex;
  flex-direction: column;
  gap: 11px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.point {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 14px;
  line-height: 1.75;
}

.tick {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-top: 3px;
  flex: 0 0 18px;
  border-radius: 999px;
  background: rgba(217, 119, 87, 0.16);
  color: var(--c-orange-deep);
}

/* ---------- 图文分栏（第三、四屏） ---------- */

.split {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  align-items: center;
  gap: 56px;
}

.split.is-flipped .split-copy {
  order: 2;
}

.split.is-flipped .mock {
  order: 1;
}

.split-copy .btn {
  margin-top: 28px;
}

.split-copy .points {
  margin-top: 22px;
}

.split-copy .band-sub {
  max-width: 520px;
}

.mock {
  position: relative;
  padding: 26px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  box-shadow: var(--shadow-md), var(--inset-top);
}

.band-plain .mock {
  background: var(--c-subtle);
}

/* 检索示意 */
.mq {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 16px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-surface);
  box-shadow: var(--shadow-xs);
}

.mq-icon {
  display: inline-flex;
  color: var(--c-orange);
}

.mq-text {
  overflow: hidden;
  font-size: 13.5px;
  color: var(--c-dark);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mhits {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}

.mhit {
  padding: 14px 16px;
  border: 1px solid var(--c-hairline);
  border-radius: var(--radius-md);
  background: var(--c-surface);
}

.mhit-text {
  margin: 0 0 8px;
  font-size: 13px;
  line-height: 1.7;
}

.mhit-meta {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--c-hover);
  font-family: var(--font-heading);
  font-size: 11.5px;
  color: var(--c-mid-gray);
}

.mfoot {
  margin: 14px 0 2px;
  font-family: var(--font-heading);
  font-size: 12px;
  color: var(--c-mid-gray);
  text-align: center;
}

/* 组卷示意 */
.pm-tool {
  position: absolute;
  top: -18px;
  left: 50%;
  display: flex;
  gap: 6px;
  padding: 7px 9px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-surface);
  box-shadow: var(--shadow-sm);
  transform: translateX(-50%);
}

.pm-tool-btn {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  background: var(--c-hover);
}

.pm-tool-btn:first-child {
  background: rgba(217, 119, 87, 0.28);
}

.pm-pages {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding-top: 10px;
}

.pm-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 9px;
  aspect-ratio: 1 / 1.32;
  padding: 18px 16px;
  border: 1px solid var(--c-hairline-strong);
  border-radius: 6px;
  background: var(--c-surface);
  box-shadow: var(--shadow-xs);
}

.pm-page.is-back {
  opacity: 0.72;
}

.pm-line {
  height: 2px;
  border-radius: 2px;
  background: var(--c-hairline-strong);
}

.pm-line.is-title {
  width: 58%;
  height: 4px;
  background: var(--c-mid-gray);
}

.pm-line.is-short {
  width: 64%;
}

.pm-num {
  position: absolute;
  top: 8px;
  right: 9px;
  font-family: var(--font-heading);
  font-size: 9.5px;
  color: var(--c-mid-gray);
}

.pm-chip {
  margin: 16px 0 0;
  padding: 7px 0;
  border-top: 1px solid var(--c-hairline);
  font-family: var(--font-heading);
  font-size: 12px;
  color: var(--c-mid-gray);
  text-align: center;
}

/* ---------- 入场动画 ---------- */

.reveal {
  opacity: 0;
  transform: translateY(18px);
  transition: opacity 0.6s var(--ease-out), transform 0.6s var(--ease-out);
}

.reveal.is-in {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }

  .landing {
    scroll-behavior: auto;
  }
}

@media (max-width: 980px) {
  .split {
    grid-template-columns: minmax(0, 1fr);
    gap: 36px;
  }

  .split.is-flipped .split-copy,
  .split.is-flipped .mock {
    order: initial;
  }
}

@media (max-width: 720px) {
  .wrap {
    padding: 0 16px;
  }

  .hero {
    padding: 56px 0 64px;
  }

  .band {
    min-height: auto;
    padding: 64px 0;
  }

  .shot {
    margin-top: 36px;
  }
}
</style>
