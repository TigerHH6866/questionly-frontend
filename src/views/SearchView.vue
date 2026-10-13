<template>
  <div class="search">
    <div class="empty">
      <span class="empty-mark">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6" stroke="currentColor" stroke-width="1.5" />
          <path d="m15 15 4.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </span>
      <h2 class="empty-title">{{ t('search.empty.title') }}</h2>
      <p class="empty-desc">{{ t('search.empty.desc') }}</p>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped>
.search {
  max-width: 820px;
  margin: 0 auto;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 72px 32px;
  border: 1px dashed var(--c-light-gray);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  text-align: center;
}

.empty-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(120, 140, 93, 0.14);
  color: var(--c-green);
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
}

.empty-desc {
  max-width: 460px;
  margin: 0;
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.7;
  color: var(--c-mid-gray);
}
</style>
