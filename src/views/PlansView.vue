<template>
  <div class="plans-page">
    <SiteHeader />

    <main class="plans-main">
      <div class="wrap">
        <!-- 标题：两行排版，第二行用品牌主色强调（对照参考稿 "Start free. / Upgrade when ready."） -->
        <header class="plans-head">
          <h1 class="plans-title">
            {{ t('plans.titleLead') }}<br />
            <span class="plans-title-accent">{{ t('plans.titleAccent') }}</span>
          </h1>
          <p class="plans-sub">{{ t('plans.sub') }}</p>
        </header>

        <p v-if="loading" class="plans-state">{{ t('plans.loading') }}</p>
        <p v-else-if="!cards.length" class="plans-state">{{ t('plans.empty') }}</p>

        <!-- 档位与金额全部取自后端 credits_plan：plan_id=0 为试用档，1/2/3 为付费档 -->
        <div v-else class="cards">
          <article
            v-for="(card, index) in cards"
            :key="card.planId"
            class="card"
            :class="{ 'is-featured': card.featured }"
            :style="{ animationDelay: `${index * 70}ms` }"
          >
            <span v-if="card.badge" class="card-badge" :class="{ 'is-end': card.badgeEnd }">
              {{ card.badge }}
            </span>

            <p class="card-label">{{ card.label }}</p>
            <p class="card-price">
              <span class="card-amount">¥{{ card.amount }}</span>
              <span v-if="!card.free" class="card-unit">{{ t('plans.perYear') }}</span>
            </p>
            <p class="card-period">{{ card.period }}</p>

            <ul class="card-list">
              <li v-for="(row, index) in card.rows" :key="index" class="card-row">
                <span class="tick" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
                    <path
                      d="m5 12.6 4.4 4.4L19 7.4"
                      stroke="currentColor"
                      stroke-width="2.4"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
                <span>{{ row }}</span>
              </li>
            </ul>

            <button
              type="button"
              class="card-cta"
              :class="{ 'is-primary': !card.free, 'is-locked': card.locked }"
              :disabled="card.locked"
              @click="act(card)"
            >
              {{ card.cta }}
            </button>
            <p class="card-foot">{{ card.foot }}</p>
          </article>
        </div>

        <p class="plans-note">{{ t('plans.note') }}</p>
      </div>
    </main>

    <SiteFooter />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import SiteHeader from '@/components/landing/SiteHeader.vue'
import SiteFooter from '@/components/landing/SiteFooter.vue'
import { ElMessageBox } from 'element-plus'
import { fetchPlans } from '@/api/pay'
import { fetchCredits } from '@/api/auth'
import { currentUser, isLoggedIn } from '@/utils/auth'

const { t } = useI18n()
const router = useRouter()

/** 套餐 ID 与落地页文案的对应关系，用于中英名称（与支付弹窗、订单列表同一套约定） */
const NAME_KEYS = { 1: 'basic', 2: 'plus', 3: 'pro' }
/** 打角标的两档：进阶最受欢迎、专业最划算 */
const BADGES = { 2: 'popular', 3: 'best' }
const FEATURED_PLAN_ID = 2

const plans = ref([])
const currentPlanId = ref(0)
const loading = ref(true)

const loggedIn = computed(() => Boolean(currentUser.value) && isLoggedIn())

/** 登录后才知道自己的套餐；未登录时所有档位都可点（付费档点击后会先弹登录） */
function isLocked(planId) {
  return loggedIn.value && planId <= currentPlanId.value
}

function labelOf(plan) {
  const planId = Number(plan.planId)
  if (planId === 0) return t('plans.free')
  const key = NAME_KEYS[planId]
  return key ? t(`landing.pricing.${key}.name`) : plan.planName
}

function ctaOf(planId, free) {
  if (!isLocked(planId)) return free ? t('plans.ctaFree') : t('plans.ctaBuy')
  if (planId === currentPlanId.value) return t('plans.current')
  if (free) return t('plans.included')
  return t('plans.noDowngrade')
}

const cards = computed(() =>
  plans.value.map((plan) => {
    const planId = Number(plan.planId)
    const amount = Number(plan.amount) || 0
    const free = planId === 0
    const badge = BADGES[planId]
    return {
      planId,
      free,
      amount,
      label: labelOf(plan),
      period: free ? t('plans.forever') : t('plans.validFor', { days: plan.expired }),
      badge: badge ? t(`plans.${badge}`) : '',
      badgeEnd: badge === 'best',
      featured: planId === FEATURED_PLAN_ID,
      locked: isLocked(planId),
      cta: ctaOf(planId, free),
      foot: free ? t('plans.footFree') : t('plans.footBuy'),
      // 卖点清单直接取套餐的 description 字段，按换行符一行一条
      rows: String(plan.description || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    }
  })
)

/** 档位动作：试用档未登录时直接引导注册，付费档暂未开放购买（弹窗提示） */
function act(card) {
  if (card.locked) return
  if (card.free) {
    if (!loggedIn.value) {
      window.dispatchEvent(new CustomEvent('questionly:auth', { detail: { tab: 'signup' } }))
      return
    }
    router.push('/app')
    return
  }
  ElMessageBox.alert(t('plans.notOpen'), '', {
    confirmButtonText: t('common.confirm'),
    center: true
  }).catch(() => {})
}

async function loadPlans() {
  loading.value = true
  try {
    plans.value = (await fetchPlans()) || []
  } catch {
    // 错误提示已由 http 拦截器统一处理，这里只兜底成空态
    plans.value = []
  } finally {
    loading.value = false
  }
}

/** 登录态变化时重新拉取「当前套餐」，据此置灰已拥有或更低的档位 */
async function loadQuota() {
  if (!isLoggedIn()) {
    currentPlanId.value = 0
    return
  }
  try {
    const quota = await fetchCredits()
    currentPlanId.value = Number(quota?.planId ?? 0)
  } catch {
    currentPlanId.value = 0
  }
}

watch(currentUser, loadQuota)

onMounted(() => {
  loadPlans()
  loadQuota()
})
</script>

<style scoped>
/* 公开营销页：与顶导 / 页脚一致使用无衬线，数字用系统字体的等高数字 */
.plans-page {
  height: 100%;
  overflow-y: auto;
  scrollbar-gutter: stable;
  font-family: var(--font-heading);
  font-variant-numeric: lining-nums;
}

.wrap {
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 28px;
}

.plans-main {
  padding: 74px 0 92px;
}

.plans-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.plans-title {
  margin: 0;
  font-size: clamp(34px, 4.2vw, 58px);
  line-height: 1.12;
  letter-spacing: -0.03em;
}

/* 第二行改用品牌主色，替代参考稿的紫色强调 */
.plans-title-accent {
  color: var(--c-orange);
}

.plans-sub {
  max-width: 640px;
  margin: 18px 0 0;
  font-size: 15.5px;
  line-height: 1.85;
  color: var(--c-mid-gray);
}

.plans-state {
  margin: 56px 0 0;
  padding: 64px 0;
  font-size: 13.5px;
  color: var(--c-mid-gray);
  text-align: center;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(248px, 1fr));
  gap: 18px;
  margin-top: 56px;
}

.card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 32px 24px 24px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  box-shadow: var(--shadow-xs);
  text-align: left;
  animation: card-rise 0.5s var(--ease-out) both;
}

/* 推荐档：淡品牌色底 + 更亮的描边与投影，做视觉重心 */
.card.is-featured {
  border-color: rgba(217, 119, 87, 0.5);
  background: linear-gradient(180deg, rgba(217, 119, 87, 0.07), rgba(217, 119, 87, 0.01));
  box-shadow: var(--shadow-lg);
}

/* 角标：压在卡片上边缘（推荐档居中、最划算档靠右），与参考稿一致 */
.card-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  padding: 5px 15px;
  border-radius: 999px;
  background: var(--c-orange);
  color: var(--c-on-accent);
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
  transform: translateX(-50%);
  box-shadow: 0 6px 16px -8px rgba(217, 119, 87, 0.85);
}

.card-badge.is-end {
  right: 20px;
  left: auto;
  background: var(--c-dark);
  color: var(--c-light);
  transform: none;
  box-shadow: var(--shadow-sm);
}

.card-label {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--c-mid-gray);
}

.card-price {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 12px 0 0;
}

.card-amount {
  font-size: 40px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--c-dark);
}

.card-unit {
  font-size: 13px;
  color: var(--c-mid-gray);
}

.card-period {
  margin: 7px 0 0;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--c-hairline);
  font-size: 13px;
  color: var(--c-mid-gray);
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 11px;
  margin: 20px 0 24px;
  padding: 0;
  list-style: none;
}

.card-row {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  font-size: 13.5px;
  line-height: 1.7;
}

.tick {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  margin-top: 3px;
  border-radius: 999px;
  background: rgba(217, 119, 87, 0.16);
  color: var(--c-orange-deep);
}

.card-cta {
  width: 100%;
  margin-top: auto;
  padding: 12px 20px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-surface);
  font-family: var(--font-heading);
  font-size: 14px;
  font-weight: 600;
  color: var(--c-dark);
  cursor: pointer;
  transition: transform 0.2s var(--ease-out), background 0.2s var(--ease-soft),
    border-color 0.2s var(--ease-soft), color 0.2s var(--ease-soft), box-shadow 0.2s var(--ease-soft);
}

.card-cta:hover:not(:disabled) {
  border-color: var(--c-orange);
  color: var(--c-orange);
  transform: translateY(-1px);
}

.card-cta.is-primary {
  border-color: transparent;
  background: var(--c-orange);
  color: var(--c-on-accent);
  box-shadow: 0 8px 20px -10px rgba(217, 119, 87, 0.7);
}

.card-cta.is-primary:hover:not(:disabled) {
  background: var(--c-orange-hover);
  color: var(--c-on-accent);
  transform: translateY(-2px);
}

.card-cta:disabled,
.card-cta.is-locked {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

.card-foot {
  margin: 12px 0 0;
  font-size: 11.5px;
  color: var(--c-mid-gray);
  text-align: center;
}

.plans-note {
  margin: 28px 0 0;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--c-mid-gray);
  text-align: center;
}

@keyframes card-rise {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card {
    animation: none;
  }
}

@media (max-width: 720px) {
  .wrap {
    padding: 0 16px;
  }

  .plans-main {
    padding: 48px 0 64px;
  }

  .cards {
    margin-top: 40px;
  }
}
</style>
