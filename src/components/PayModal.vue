<template>
  <teleport to="body">
    <transition name="pay-fade">
      <div v-if="visible" class="pay-mask" @click.self="close">
        <div class="pay-card" role="dialog" aria-modal="true">
          <button type="button" class="pay-close" :aria-label="t('auth.close')" @click="close">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </svg>
          </button>

          <header class="pay-head">
            <h2 class="pay-title">{{ t('pay.title') }}</h2>
            <p class="pay-sub">{{ t('pay.sub') }}</p>
          </header>

          <!-- 套餐档位：金额取后端 credits_plan 表，低于或等于当前套餐的档位置灰 -->
          <div v-if="plans.length" class="pay-plans">
            <button
              v-for="item in plans"
              :key="item.planId"
              type="button"
              class="pay-plan"
              :class="{ 'is-active': item.planId === selectedPlanId, 'is-locked': isLocked(item) }"
              :disabled="isLocked(item) || loading"
              @click="selectPlan(item.planId)"
            >
              <span class="pay-plan-name">{{ planName(item) }}</span>
              <span class="pay-plan-price">¥{{ item.amount }}</span>
              <span v-if="isLocked(item)" class="pay-plan-lock">{{ t('pay.current') }}</span>
            </button>
          </div>

          <div class="pay-body">
            <p v-if="hint" class="pay-hint">{{ hint }}</p>

            <template v-if="qrImage">
              <img class="pay-qr" :src="qrImage" :alt="t('pay.qrAlt')" />
              <p class="pay-amount">
                <span class="pay-amount-value">¥{{ order.amount }}</span>
                <span class="pay-amount-plan">{{ planName(order) }}</span>
              </p>
              <p class="pay-include">{{ includeText }}</p>
              <p class="pay-tip">
                <span class="pay-tip-dot" aria-hidden="true"></span>
                {{ statusText }}
              </p>
            </template>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { createPayOrder, fetchPayOrder, fetchPlans } from '@/api/pay'
import { fetchCredits } from '@/api/auth'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 打开时优先选中的套餐（0 表示按当前套餐自动选下一档） */
  initialPlanId: { type: Number, default: 0 }
})
const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()

/** 套餐 ID 与落地页定价文案的对应关系，用于中英名称 */
const PLAN_KEYS = { 1: 'basic', 2: 'plus', 3: 'pro' }

/** 轮询间隔与上限：2 秒一次，最多 5 分钟（对应二维码有效期） */
const POLL_INTERVAL = 2000
const MAX_POLLS = 150

const visible = ref(props.modelValue)
const loading = ref(false)
const plans = ref([])
const currentPlanId = ref(0)
const selectedPlanId = ref(0)
const order = ref(null)
const hint = ref('')
/** 轮询超时（二维码过期）后置位，展示提示与重新下单 */
const timedOut = ref(false)

let pollTimer = null
let pollCount = 0

const qrImage = computed(() => order.value?.qrImage || '')
const status = computed(() => order.value?.status || '')

/** 已拥有或降级的档位不可购买 */
function isLocked(item) {
  return item.planId <= currentPlanId.value
}

const includeText = computed(() => {
  const plan = plans.value.find((item) => item.planId === order.value?.planId)
  if (!plan) return ''
  return `${plan.credits} ${t('auth.credits')} · ${plan.questionCount} ${t('auth.questions')}`
})

const statusText = computed(() => {
  if (timedOut.value) return t('pay.expired')
  if (status.value === 'PAID') return t('pay.success')
  if (status.value === 'CLOSED' || status.value === 'FAILED') return t('pay.closed')
  return t('pay.pending')
})

function planName(item) {
  if (!item) return ''
  const key = PLAN_KEYS[item.planId]
  return key ? t(`landing.pricing.${key}.name`) : item.planName
}

/** 后端把 Long 序列化为字符串（雪花 ID 超出 JS 安全范围），这里统一转成数字便于比较 */
function normalizePlan(plan) {
  return { ...plan, planId: Number(plan.planId), amount: Number(plan.amount) }
}

function normalizeOrder(order) {
  return order ? { ...order, planId: Number(order.planId) } : order
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function reset() {
  stopPolling()
  pollCount = 0
  loading.value = false
  plans.value = []
  currentPlanId.value = 0
  selectedPlanId.value = 0
  order.value = null
  hint.value = ''
  timedOut.value = false
}

function close() {
  stopPolling()
  visible.value = false
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  async (val) => {
    visible.value = val
    if (!val) {
      stopPolling()
      return
    }
    reset()
    await loadOptions()
  }
)

onBeforeUnmount(stopPolling)

/** 拉取可购买套餐与当前套餐，决定默认选中的档位 */
async function loadOptions() {
  loading.value = true
  try {
    const [planList, quota] = await Promise.all([fetchPlans(), fetchCredits()])
    // 套餐接口现在一并返回 plan_id=0 的试用档（供套餐页展示），支付弹窗只卖付费档
    plans.value = (planList || []).map(normalizePlan).filter((item) => item.planId >= 1)
    currentPlanId.value = Number(quota?.planId ?? 0)

    const purchasable = plans.value.filter((item) => !isLocked(item))
    if (!purchasable.length) {
      hint.value = t('pay.highest')
      return
    }
    const preferred = plans.value.find(
      (item) => item.planId === props.initialPlanId && !isLocked(item)
    )
    selectedPlanId.value = preferred ? preferred.planId : purchasable[0].planId
    await createOrder()
  } catch {
    // 错误提示已由 http 拦截器统一处理
  } finally {
    loading.value = false
  }
}

async function selectPlan(planId) {
  if (planId === selectedPlanId.value || loading.value) return
  selectedPlanId.value = planId
  await createOrder()
}

/** 下单拿二维码（同一档位后端会复用未支付的订单，不会重复下单） */
async function createOrder() {
  stopPolling()
  pollCount = 0
  timedOut.value = false
  hint.value = ''
  loading.value = true
  try {
    order.value = normalizeOrder(await createPayOrder(selectedPlanId.value))
    if (order.value?.status === 'PAID') {
      await onPaid()
      return
    }
    if (order.value?.status === 'CREATED') {
      startPolling()
    } else {
      hint.value = t('pay.closed')
    }
  } catch {
    // 具体报错已由 http 拦截器弹出，这里兜底避免弹窗正文空白
    hint.value = t('pay.failHint')
  } finally {
    loading.value = false
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(async () => {
    pollCount += 1
    if (pollCount > MAX_POLLS) {
      stopPolling()
      timedOut.value = true
      return
    }
    try {
      const latest = await fetchPayOrder(order.value.orderId)
      order.value = normalizeOrder(latest)
      if (latest?.status === 'PAID') {
        await onPaid()
      } else if (latest?.status !== 'CREATED') {
        stopPolling()
      }
    } catch {
      // 单次轮询失败不打断整体轮询
    }
  }, POLL_INTERVAL)
}

async function onPaid() {
  stopPolling()
  ElMessage.success(t('pay.success'))
  // 通知工作区刷新账号胶囊里的积分与题目额度
  window.dispatchEvent(new CustomEvent('questionly:credits-refresh'))
  close()
}
</script>

<style scoped>
.pay-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--c-backdrop);
  backdrop-filter: blur(2px);
}

.pay-card {
  position: relative;
  width: 100%;
  max-width: 420px;
  padding: 28px 28px 26px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg), var(--inset-top);
}

.pay-close {
  position: absolute;
  top: 14px;
  right: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--c-mid-gray);
  cursor: pointer;
  transition: background 0.2s var(--ease-soft), color 0.2s var(--ease-soft);
}

.pay-close:hover {
  background: var(--c-hover);
  color: var(--c-dark);
}

.pay-head {
  text-align: center;
}

.pay-title {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 18px;
  font-weight: 600;
  color: var(--c-dark);
}

.pay-sub {
  margin: 6px 0 0;
  font-size: 12.5px;
  color: var(--c-mid-gray);
}

.pay-plans {
  display: flex;
  gap: 8px;
  margin: 18px 0 4px;
}

.pay-plan {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 6px 9px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-subtle);
  color: var(--c-dark);
  cursor: pointer;
  transition: border-color 0.2s var(--ease-soft), background 0.2s var(--ease-soft),
    transform 0.15s var(--ease-out);
}

.pay-plan:hover:not(:disabled) {
  border-color: var(--c-orange);
  transform: translateY(-1px);
}

.pay-plan.is-active {
  border-color: var(--c-orange);
  background: rgba(217, 119, 87, 0.08);
}

.pay-plan.is-locked {
  opacity: 0.55;
  cursor: not-allowed;
}

.pay-plan-name {
  font-size: 13px;
  font-weight: 600;
}

.pay-plan-price {
  font-family: var(--font-heading);
  font-size: 14px;
  font-weight: 600;
  color: var(--c-orange);
}

.pay-plan-lock {
  font-size: 10.5px;
  color: var(--c-mid-gray);
}

.pay-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 296px;
  margin-top: 16px;
}

.pay-qr {
  width: 200px;
  height: 200px;
  padding: 8px;
  background: #ffffff;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.pay-amount {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 12px 0 0;
}

.pay-amount-value {
  font-family: var(--font-heading);
  font-size: 22px;
  font-weight: 700;
  color: var(--c-orange);
}

.pay-amount-plan {
  font-size: 13px;
  color: var(--c-dark);
}

.pay-include {
  margin: 4px 0 0;
  font-size: 12.5px;
  color: var(--c-mid-gray);
}

.pay-tip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 14px 0 0;
  font-size: 12.5px;
  color: var(--c-dark);
}

.pay-tip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-orange);
  animation: pay-pulse 1.4s var(--ease-soft) infinite;
}

.pay-hint {
  margin: 40px 0 0;
  font-size: 13px;
  color: var(--c-mid-gray);
  text-align: center;
}

@keyframes pay-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.35;
    transform: scale(0.8);
  }
}

.pay-fade-enter-active,
.pay-fade-leave-active {
  transition: opacity 0.18s var(--ease-soft);
}

.pay-fade-enter-from,
.pay-fade-leave-to {
  opacity: 0;
}
</style>
