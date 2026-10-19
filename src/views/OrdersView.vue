<template>
  <div class="orders">
    <div v-if="!loggedIn" class="placeholder">{{ t('orders.needLogin') }}</div>

    <div v-else-if="loading" class="placeholder">
      <span class="spinner" aria-hidden="true"></span>
      {{ t('process.loading') }}
    </div>

    <div v-else-if="!rows.length" class="placeholder">{{ t('orders.empty') }}</div>

    <template v-else>
      <p class="count">{{ t('orders.total', { total }) }}</p>

      <ul class="rows">
        <li
          v-for="(row, i) in rows"
          :key="row.orderId"
          class="row"
          :style="{ animationDelay: `${Math.min(i, 11) * 22}ms` }"
        >
          <div class="row-head">
            <span class="row-plan">{{ planName(row) }}</span>
            <span class="row-amount">{{ money(row.amount) }}</span>
            <el-tag class="row-status" :type="statusType(row.status)" size="small" effect="light">
              {{ t(`orders.status.${row.status}`) }}
            </el-tag>
            <!-- 待支付订单可以直接唤回支付弹窗，后端会复用同一笔未支付订单，不会重复下单 -->
            <button
              v-if="row.status === 'CREATED'"
              type="button"
              class="row-act"
              @click="repay(row)"
            >
              {{ t('orders.repay') }}
            </button>
          </div>

          <dl class="row-meta">
            <div class="meta-item">
              <dt>{{ t('orders.tradeNo') }}</dt>
              <dd>{{ row.outTradeNo }}</dd>
            </div>
            <div class="meta-item">
              <dt>{{ t('orders.createdAt') }}</dt>
              <dd>{{ formatTime(row.createdAt) }}</dd>
            </div>
            <div v-if="row.paidAt" class="meta-item">
              <dt>{{ t('orders.paidAt') }}</dt>
              <dd>{{ formatTime(row.paidAt) }}</dd>
            </div>
          </dl>
        </li>
      </ul>

      <div v-if="total > PAGE_SIZE" class="list-foot">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="total"
          :page-size="PAGE_SIZE"
          :current-page="pageNo"
          @current-change="load"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { pagePayOrders } from '@/api/pay'
import { currentUser, isLoggedIn } from '@/utils/auth'

/** 与「我的文件 / 我的试卷」保持一致：每页 20 条 */
const PAGE_SIZE = 20

/** 套餐 ID → 落地页定价文案 key，列表里的套餐名跟随语言切换 */
const PLAN_KEYS = { 1: 'basic', 2: 'plus', 3: 'pro' }

const { t } = useI18n()

const loggedIn = ref(isLoggedIn())
const loading = ref(false)
const rows = ref([])
const total = ref(0)
const pageNo = ref(1)

async function load(page = 1) {
  if (!isLoggedIn()) return
  loading.value = true
  try {
    const pageData = await pagePayOrders(page)
    rows.value = pageData?.records || []
    total.value = Number(pageData?.total) || 0
    pageNo.value = page
  } catch {
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

/** 后端把 Long 序列化成字符串，这里按套餐 ID 找 i18n 名称，找不到就回退到库里的套餐名 */
function planName(row) {
  const key = PLAN_KEYS[row.planId]
  return key ? t(`landing.pricing.${key}.name`) : row.planName
}

function money(value) {
  const amount = Number(value) || 0
  return `¥${Number.isInteger(amount) ? amount : amount.toFixed(2)}`
}

function statusType(status) {
  return { PAID: 'success', CREATED: 'warning', FAILED: 'danger' }[status] || 'info'
}

function formatTime(value) {
  if (!value) return ''
  return String(value).replace('T', ' ').slice(0, 16)
}

/** 唤回支付弹窗；未支付订单由后端复用，二维码与金额都不会变 */
function repay(row) {
  window.dispatchEvent(new CustomEvent('questionly:pay', { detail: { planId: Number(row.planId) } }))
}

/** 支付成功后由弹窗广播，这里重新拉取列表，让状态从「待支付」变成「已支付」 */
function onCreditsRefresh() {
  load(pageNo.value)
}

// 仅在登录态本身变化时重置列表（额度刷新会重新赋值 currentUser，
// 监听对象会连带触发清空重载，造成列表闪烁）
watch(() => Boolean(currentUser.value), (isIn) => {
  loggedIn.value = isIn
  rows.value = []
  total.value = 0
  pageNo.value = 1
  if (isIn) load(1)
})

onMounted(() => {
  window.addEventListener('questionly:credits-refresh', onCreditsRefresh)
  load(1)
})

onBeforeUnmount(() => {
  window.removeEventListener('questionly:credits-refresh', onCreditsRefresh)
})
</script>

<style scoped>
.orders {
  width: 100%;
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 72px 0;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--c-mid-gray);
}

.count {
  margin: 0 0 14px;
  font-family: var(--font-heading);
  font-size: 12.5px;
  color: var(--c-mid-gray);
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(9px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* 订单行宽与题库列表对齐（同为 900px），在这几页之间切换时正文边缘落在同一条线上 */
.rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 900px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  padding: 15px 18px 16px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  box-shadow: var(--shadow-xs);
  animation: rise 0.32s var(--ease-out) both;
  transition: border-color 0.22s var(--ease-soft), box-shadow 0.22s var(--ease-soft);
}

.row:hover {
  border-color: rgba(217, 119, 87, 0.42);
  box-shadow: var(--shadow-sm);
}

.row-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.row-plan {
  font-family: var(--font-heading);
  font-size: 15px;
  font-weight: 600;
  color: var(--c-dark);
}

/* 金额用无衬线等高数字，与卡片里的价格同一套口径 */
.row-amount {
  font-family: var(--font-heading);
  font-size: 14px;
  font-weight: 600;
  color: var(--c-orange);
}

.row-status {
  flex: none;
}

.row-act {
  margin-left: auto;
  flex: none;
  height: 26px;
  padding: 0 12px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--c-orange);
  font-family: var(--font-heading);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s var(--ease-soft), border-color 0.2s var(--ease-soft);
}

.row-act:hover {
  border-color: rgba(217, 119, 87, 0.5);
  background: rgba(217, 119, 87, 0.08);
}

/* 元信息用定义列表排布：标签压到最小字号，值贴右侧 */
.row-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 26px;
  margin: 11px 0 0;
}

.meta-item {
  display: flex;
  align-items: baseline;
  gap: 7px;
  min-width: 0;
}

.meta-item dt {
  font-family: var(--font-heading);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--c-mid-gray);
}

.meta-item dd {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 12.5px;
  color: var(--c-dark);
}

.list-foot {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

/* 分页器选中页改用品牌橙：Element Plus 默认蓝在其他主色入口里显得突兀 */
.list-foot :deep(.el-pagination.is-background .el-pager li.is-active) {
  background-color: var(--c-orange);
  color: var(--c-on-accent);
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--c-light-gray);
  border-top-color: var(--c-orange);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .row {
    animation: none;
  }
}
</style>
