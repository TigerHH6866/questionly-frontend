<template>
  <div class="orders">
    <!-- 标签栏投射到顶栏左侧，与「我的资源」的标签栏同一位置与样式 -->
    <Teleport v-if="topbarLead" :to="topbarLead">
      <div class="tabs" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          role="tab"
          class="tab"
          :class="{ 'is-active': activeTab === tab.key }"
          :aria-selected="activeTab === tab.key"
          @click="activeTab = tab.key"
        >
          {{ t(tab.label) }}
        </button>
      </div>
    </Teleport>

    <div v-if="!loggedIn" class="placeholder">{{ t('orders.needLogin') }}</div>

    <!-- 消费记录：额度概览 + 文件解析扣费明细 -->
    <template v-else-if="activeTab === 'consumption'">
      <section v-if="usage" class="usage">
        <p class="usage-title">{{ t('orders.usage.title') }}</p>
        <dl class="usage-grid">
          <div class="usage-item">
            <dt>{{ t('orders.usage.creditsLeft') }}</dt>
            <dd>{{ usage.credits ?? 0 }}</dd>
          </div>
          <div class="usage-item">
            <dt>{{ t('orders.usage.creditsUsed') }}</dt>
            <dd>{{ usage.creditsUsed ?? 0 }}</dd>
          </div>
          <div class="usage-item">
            <dt>{{ t('orders.usage.questionsLeft') }}</dt>
            <dd>{{ usage.questions ?? 0 }}</dd>
          </div>
          <div class="usage-item">
            <dt>{{ t('orders.usage.questionsUsed') }}</dt>
            <dd>{{ usage.questionsUsed ?? 0 }}</dd>
          </div>
        </dl>
      </section>

      <div v-if="usageLoading" class="placeholder">
        <span class="spinner" aria-hidden="true"></span>
        {{ t('process.loading') }}
      </div>

      <div v-else-if="!usageRows.length" class="placeholder">{{ t('orders.consumption.empty') }}</div>

      <template v-else>
        <p class="count">{{ t('orders.consumption.total', { total: usageTotal }) }}</p>

        <ul class="rows">
          <li
            v-for="(row, i) in usageRows"
            :key="row.id"
            class="row"
            :style="{ animationDelay: `${Math.min(i, 11) * 22}ms` }"
          >
            <div class="row-head">
              <span class="row-name">{{ row.fileName }}</span>
              <el-tag class="row-kind" size="small" effect="light" type="info">{{ kindOf(row) }}</el-tag>
              <span class="row-cost">{{ costText(row) }}</span>
            </div>

            <dl class="row-meta">
              <div class="meta-item">
                <dt>{{ t('orders.consumption.time') }}</dt>
                <dd>{{ formatTime(row.createdAt) }}</dd>
              </div>
            </dl>
          </li>
        </ul>

        <div v-if="usageTotal > PAGE_SIZE" class="list-foot">
          <el-pagination
            background
            layout="prev, pager, next"
            :total="usageTotal"
            :page-size="PAGE_SIZE"
            :current-page="usagePageNo"
            @current-change="loadUsage"
          />
        </div>
      </template>
    </template>

    <!-- 购买记录：原有订单列表 -->
    <template v-else>
      <div v-if="loading" class="placeholder">
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
    </template>
  </div>
</template>

<script setup>
import { inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchQuotaUsage } from '@/api/auth'
import { pageOcrTasks } from '@/api/ocr'
import { pagePayOrders } from '@/api/pay'
import { currentUser, isLoggedIn } from '@/utils/auth'

/** 与「我的文件 / 我的试卷」保持一致：每页 20 条 */
const PAGE_SIZE = 20

/** 套餐 ID → 落地页定价文案 key，列表里的套餐名跟随语言切换 */
const PLAN_KEYS = { 1: 'basic', 2: 'plus', 3: 'pro' }

/** 消费记录里按扩展名区分「图片」与「文件」 */
const IMAGE_TYPES = new Set(['png', 'jpg', 'jpeg'])

const { t } = useI18n()

const topbarLead = inject('topbarLead', null)

const tabs = [
  { key: 'consumption', label: 'orders.tabs.consumption' },
  { key: 'purchases', label: 'orders.tabs.purchases' }
]
const activeTab = ref('consumption')

const loggedIn = ref(isLoggedIn())

/** 消费记录：额度概览 + 解析明细 */
const usage = ref(null)
const usageLoading = ref(false)
const usageRows = ref([])
const usageTotal = ref(0)
const usagePageNo = ref(1)

/** 购买记录 */
const loading = ref(false)
const rows = ref([])
const total = ref(0)
const pageNo = ref(1)

/** 消费记录：额度概览与解析明细一起拉，避免概览先到、列表后到造成的错位 */
async function loadUsage(page = 1) {
  if (!isLoggedIn()) return
  usageLoading.value = true
  try {
    const [summary, pageData] = await Promise.all([fetchQuotaUsage(), pageOcrTasks(page, PAGE_SIZE)])
    usage.value = summary
    usageRows.value = pageData?.records || []
    usageTotal.value = Number(pageData?.total) || 0
    usagePageNo.value = page
  } catch {
    usageRows.value = []
    usageTotal.value = 0
  } finally {
    usageLoading.value = false
  }
}

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

/** 切换标签页时按需加载，避免两套列表同时请求 */
function loadActive() {
  if (activeTab.value === 'consumption') {
    loadUsage(1)
  } else {
    load(1)
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

/** 类型列：图片按张计费，其余都算文件 */
function kindOf(row) {
  return IMAGE_TYPES.has(String(row.fileType || '').toLowerCase())
    ? t('orders.consumption.image')
    : t('orders.consumption.file')
}

/** 扣减列：失败已退回的显示 0 积分 */
function costText(row) {
  const cost = Number(row.creditCost) || 0
  return t('orders.consumption.cost', { n: cost > 0 ? `-${cost}` : 0 })
}

/** 唤回支付弹窗；未支付订单由后端复用，二维码与金额都不会变 */
function repay(row) {
  window.dispatchEvent(new CustomEvent('questionly:pay', { detail: { planId: Number(row.planId) } }))
}

/** 支付成功后由弹窗广播，这里重新拉取当前标签页，让状态从「待支付」变成「已支付」 */
function onCreditsRefresh() {
  loadActive()
}

watch(activeTab, loadActive)

// 仅在登录态本身变化时重置列表（额度刷新会重新赋值 currentUser，
// 监听对象会连带触发清空重载，造成列表闪烁）
watch(() => Boolean(currentUser.value), (isIn) => {
  loggedIn.value = isIn
  usage.value = null
  usageRows.value = []
  usageTotal.value = 0
  usagePageNo.value = 1
  rows.value = []
  total.value = 0
  pageNo.value = 1
  if (isIn) loadActive()
})

onMounted(() => {
  window.addEventListener('questionly:credits-refresh', onCreditsRefresh)
  loadActive()
})

onBeforeUnmount(() => {
  window.removeEventListener('questionly:credits-refresh', onCreditsRefresh)
})
</script>

<style scoped>
.orders {
  width: 100%;
}

/* 标签栏与「我的资源」一致：带底槽的胶囊，选中项是其中的滑块 */
.tabs {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-surface);
  box-shadow: var(--shadow-xs);
}

.tab {
  padding: 7px 18px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--c-mid-gray);
  font-family: var(--font-heading);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s var(--ease-soft), color 0.2s var(--ease-soft);
}

.tab:hover:not(.is-active) {
  color: var(--c-dark);
}

.tab.is-active {
  background: var(--c-orange);
  color: var(--c-on-accent);
}

/* 额度概览：与下方列表同宽，四项等分排布 */
.usage {
  max-width: 900px;
  margin: 0 0 18px;
  padding: 16px 20px 18px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  box-shadow: var(--shadow-xs);
}

.usage-title {
  margin: 0 0 14px;
  font-family: var(--font-heading);
  font-size: 12.5px;
  letter-spacing: 0.04em;
  color: var(--c-mid-gray);
}

.usage-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.usage-item {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-left: 16px;
  border-left: 1px solid var(--c-border);
}

.usage-item:first-child {
  padding-left: 0;
  border-left: none;
}

.usage-item dt {
  font-family: var(--font-heading);
  font-size: 12px;
  color: var(--c-mid-gray);
}

/* 数字用无衬线等高数字，四项并排时位数变化不会左右跳动 */
.usage-item dd {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 22px;
  font-weight: 600;
  color: var(--c-dark);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
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
  min-width: 0;
}

.row-plan {
  font-family: var(--font-heading);
  font-size: 15px;
  font-weight: 600;
  color: var(--c-dark);
}

/* 文件名单行省略，避免长文件名把扣减数值挤出卡片 */
.row-name {
  min-width: 0;
  font-family: var(--font-heading);
  font-size: 14px;
  font-weight: 500;
  color: var(--c-dark);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-kind {
  flex: none;
}

.row-cost {
  margin-left: auto;
  flex: none;
  font-family: var(--font-heading);
  font-size: 13px;
  font-weight: 600;
  color: var(--c-orange);
  font-variant-numeric: tabular-nums;
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

/* 窄屏下概览改成两列，避免四个数字挤在一起 */
@media (max-width: 720px) {
  .usage-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px 12px;
  }

  .usage-item:nth-child(3) {
    padding-left: 0;
    border-left: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .row {
    animation: none;
  }
}
</style>
