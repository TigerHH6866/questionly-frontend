<template>
  <div class="detail">
    <el-card shadow="never" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>任务 #{{ id }}</span>
          <div>
            <el-tag :type="statusType(task.status)" size="small">{{ task.status }}</el-tag>
            <el-button size="small" class="btn" @click="load">刷新状态</el-button>
          </div>
        </div>
      </template>

      <el-descriptions :column="2" border>
        <el-descriptions-item label="文件名">{{ task.fileName }}</el-descriptions-item>
        <el-descriptions-item label="文件类型">{{ task.fileType }}</el-descriptions-item>
        <el-descriptions-item label="MinerU 任务">{{ task.mineruTaskId }}</el-descriptions-item>
        <el-descriptions-item label="题目数">{{ task.questionCount }}</el-descriptions-item>
        <el-descriptions-item label="解析结果" :span="2">
          <a v-if="task.resultUrl" :href="task.resultUrl" target="_blank">{{ task.resultUrl }}</a>
          <span v-else>—</span>
        </el-descriptions-item>
        <el-descriptions-item v-if="task.errorMsg" label="失败原因" :span="2">
          <el-text type="danger">{{ task.errorMsg }}</el-text>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { getOcrTask } from '@/api/ocr'

const props = defineProps({ id: { type: String, required: true } })

const task = ref({})
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    task.value = await getOcrTask(props.id)
  } catch {
    // 失败提示由 http 拦截器统一处理，这里避免未捕获的 promise 异常
  } finally {
    loading.value = false
  }
}

function statusType(status) {
  return { SUCCESS: 'success', FAILED: 'danger', PARSING: 'warning' }[status] || 'info'
}

onMounted(load)
</script>

<style scoped>
.detail {
  max-width: 960px;
  margin: 0 auto;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.card-header > div {
  display: flex;
  align-items: center;
  gap: 8px;
}
.btn {
  margin-left: 4px;
}
</style>