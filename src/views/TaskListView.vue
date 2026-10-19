<template>
  <div class="list">
    <div class="list-head">
      <h2 class="list-title">{{ t('tasks.list') }}</h2>
      <button class="refresh" type="button" :disabled="loading" @click="load">
        <span v-if="loading" class="spinner" aria-hidden="true"></span>
        {{ t('tasks.refresh') }}
      </button>
    </div>

    <p v-if="!loading && !rows.length" class="empty">{{ t('tasks.empty') }}</p>

    <ul v-else class="rows">
      <li v-for="row in rows" :key="row.id" class="row" @click="open(row)">
        <span class="row-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none">
            <path
              d="M13.5 3.2H7.1A1.9 1.9 0 0 0 5.2 5.1v13.8a1.9 1.9 0 0 0 1.9 1.9h9.8a1.9 1.9 0 0 0 1.9-1.9V8.3l-5.1-5.1Z"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linejoin="round"
            />
            <path d="M13.4 3.4v4.7h4.9" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
          </svg>
        </span>

        <div class="row-main">
          <p class="row-name">{{ row.fileName }}</p>
          <p class="row-meta">
            <span>{{ formatTime(row.createdAt) }}</span>
            <span v-if="row.questionCount">{{ row.questionCount }} {{ t('tasks.column.questionCount') }}</span>
          </p>
        </div>

        <el-tag :type="statusType(row.status)" size="small" effect="light">
          {{ t(`tasks.status.${row.status}`) }}
        </el-tag>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { pageOcrTasks } from '@/api/ocr'

/** 近期文件只展示最近 7 条 */
const RECENT_SIZE = 7

const { t } = useI18n()
const router = useRouter()
const rows = ref([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const page = await pageOcrTasks(1, RECENT_SIZE)
    rows.value = page.records || []
  } finally {
    loading.value = false
  }
}

/** 点击记录进入该文件的题目渲染交互页 */
function open(row) {
  router.push(`/app/tasks/${row.id}/process`)
}

function statusType(status) {
  return { SUCCESS: 'success', FAILED: 'danger', PARSING: 'warning' }[status] || 'info'
}

function formatTime(value) {
  if (!value) return ''
  return String(value).replace('T', ' ').slice(0, 16)
}

onMounted(load)
</script>

<style scoped>
.list {
  width: 100%;
  max-width: 760px;
  margin: auto;
}

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.list-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.refresh {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 16px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-surface);
  color: var(--c-mid-gray);
  font-family: var(--font-heading);
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.2s var(--ease-soft), color 0.2s var(--ease-soft),
    background 0.2s var(--ease-soft);
}

.refresh:hover:not(:disabled) {
  border-color: rgba(217, 119, 87, 0.55);
  background: rgba(217, 119, 87, 0.08);
  color: var(--c-orange);
}

.refresh:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.empty {
  margin: 0;
  padding: 48px 0;
  text-align: center;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--c-mid-gray);
}

.rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  box-shadow: var(--shadow-xs);
  cursor: pointer;
  transition: border-color 0.2s var(--ease-soft), background 0.2s var(--ease-soft),
    box-shadow 0.2s var(--ease-soft), transform 0.2s var(--ease-out);
}

.row:hover {
  border-color: rgba(217, 119, 87, 0.4);
  background: rgba(217, 119, 87, 0.04);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.row-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  background: rgba(217, 119, 87, 0.1);
  color: var(--c-orange);
  box-shadow: inset 0 0 0 1px rgba(217, 119, 87, 0.16);
}

.row-main {
  flex: 1;
  min-width: 0;
}

.row-name {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 14px;
  font-weight: 500;
  color: var(--c-dark);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-meta {
  display: flex;
  gap: 12px;
  margin: 4px 0 0;
  font-family: var(--font-body);
  font-size: 12px;
  color: var(--c-mid-gray);
}

.spinner {
  width: 13px;
  height: 13px;
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
</style>
