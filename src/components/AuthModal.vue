<template>
  <teleport to="body">
    <transition name="auth-fade">
      <div v-if="visible" class="auth-mask" @click.self="close">
        <div class="auth-card" role="dialog" aria-modal="true">
          <button type="button" class="auth-close" :aria-label="t('auth.close')" @click="close">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </svg>
          </button>

          <div class="auth-head">
            <span class="auth-mark">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  d="M12 2.5 20.5 7.4v9.2L12 21.5 3.5 16.6V7.4L12 2.5Z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linejoin="round"
                />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
            </span>
            <h2 class="auth-title">{{ tab === 'signin' ? t('auth.signInTitle') : t('auth.signUpTitle') }}</h2>
            <p class="auth-sub">{{ tab === 'signin' ? t('auth.signInSub') : t('auth.signUpSub') }}</p>
          </div>

          <div class="auth-tabs">
            <button
              type="button"
              class="auth-tab"
              :class="{ 'is-active': tab === 'signin' }"
              @click="switchTab('signin')"
            >
              {{ t('auth.signIn') }}
            </button>
            <button
              type="button"
              class="auth-tab"
              :class="{ 'is-active': tab === 'signup' }"
              @click="switchTab('signup')"
            >
              {{ t('auth.signUp') }}
            </button>
          </div>

          <form class="auth-form" @submit.prevent="submit">
            <label class="auth-field">
              <span class="auth-label">{{ t('auth.email') }}</span>
              <input
                v-model.trim="form.email"
                type="email"
                class="auth-input"
                :class="{ 'is-error': errors.email }"
                :placeholder="t('auth.emailPlaceholder')"
                autocomplete="email"
              />
              <span v-if="errors.email" class="auth-error">{{ errors.email }}</span>
            </label>

            <label class="auth-field">
              <span class="auth-label">{{ t('auth.password') }}</span>
              <input
                v-model="form.password"
                type="password"
                class="auth-input"
                :class="{ 'is-error': errors.password }"
                :placeholder="t('auth.passwordPlaceholder')"
                :autocomplete="tab === 'signin' ? 'current-password' : 'new-password'"
              />
              <span v-if="errors.password" class="auth-error">{{ errors.password }}</span>
            </label>

            <label v-if="tab === 'signup'" class="auth-field">
              <span class="auth-label">{{ t('auth.code') }}</span>
              <div class="auth-code-row">
                <input
                  v-model.trim="form.code"
                  type="text"
                  class="auth-input"
                  :class="{ 'is-error': errors.code }"
                  :placeholder="t('auth.codePlaceholder')"
                  maxlength="6"
                  inputmode="numeric"
                />
                <button type="button" class="auth-code-btn" disabled>{{ t('auth.sendCode') }}</button>
              </div>
              <span v-if="errors.code" class="auth-error">{{ errors.code }}</span>
            </label>

            <button type="submit" class="auth-submit" :disabled="loading">
              {{ loading ? t('auth.submitting') : tab === 'signin' ? t('auth.signIn') : t('auth.signUp') }}
            </button>
          </form>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { login } from '@/api/auth'
import { setAuth } from '@/utils/auth'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 打开时默认停留的页签 */
  initialTab: { type: String, default: 'signin' }
})
const emit = defineEmits(['update:modelValue', 'success'])

const { t } = useI18n()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** 密码：≥8 位，仅字母与数字，且必须同时包含字母和数字 */
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/

const visible = ref(props.modelValue)
const tab = ref('signin')
const loading = ref(false)
const form = reactive({ email: '', password: '', code: '' })
const errors = reactive({ email: '', password: '', code: '' })

watch(
  () => props.modelValue,
  (val) => {
    visible.value = val
    if (val) {
      tab.value = props.initialTab === 'signup' ? 'signup' : 'signin'
      form.email = ''
      form.password = ''
      form.code = ''
      clearErrors()
    }
  }
)

function close() {
  visible.value = false
  emit('update:modelValue', false)
}

function switchTab(next) {
  if (tab.value === next) return
  tab.value = next
  clearErrors()
}

function clearErrors() {
  errors.email = ''
  errors.password = ''
  errors.code = ''
}

function validate() {
  clearErrors()
  let ok = true

  if (!form.email) {
    errors.email = t('auth.errEmailRequired')
    ok = false
  } else if (!EMAIL_RE.test(form.email)) {
    errors.email = t('auth.errEmailFormat')
    ok = false
  }

  if (!form.password) {
    errors.password = t('auth.errPasswordRequired')
    ok = false
  } else if (!PASSWORD_RE.test(form.password)) {
    errors.password = t('auth.errPasswordRule')
    ok = false
  }

  if (tab.value === 'signup' && !form.code) {
    errors.code = t('auth.errCodeRequired')
    ok = false
  }

  return ok
}

async function submit() {
  if (!validate()) return

  // 注册暂未开放：仅做前端表单与校验，不调用后端
  if (tab.value === 'signup') {
    ElMessage.info(t('auth.signUpPending'))
    return
  }

  loading.value = true
  try {
    const data = await login(form.email, form.password)
    setAuth(data)
    ElMessage.success(t('auth.signInSuccess'))
    emit('success')
    close()
  } catch {
    // 错误提示已由 http 拦截器统一处理
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-mask {
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

.auth-card {
  position: relative;
  width: 100%;
  max-width: 380px;
  padding: 28px 28px 26px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg), var(--inset-top);
}

.auth-close {
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

.auth-close:hover {
  background: var(--c-hover);
  color: var(--c-dark);
}

.auth-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.auth-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  background: rgba(217, 119, 87, 0.12);
  color: var(--c-orange);
  box-shadow: inset 0 0 0 1px rgba(217, 119, 87, 0.16), 0 2px 6px -3px rgba(217, 119, 87, 0.4);
}

.auth-title {
  font-size: 20px;
  letter-spacing: -0.015em;
}

.auth-sub {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--c-mid-gray);
}

.auth-tabs {
  display: flex;
  gap: 4px;
  margin: 20px 0 18px;
  padding: 4px;
  background: var(--c-subtle);
  border: 1px solid var(--c-border);
  border-radius: 999px;
}

.auth-tab {
  flex: 1;
  height: 32px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--c-mid-gray);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s var(--ease-soft), color 0.2s var(--ease-soft),
    box-shadow 0.2s var(--ease-soft);
}

.auth-tab.is-active {
  background: var(--c-surface);
  color: var(--c-dark);
  box-shadow: var(--shadow-xs);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.auth-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.auth-label {
  font-family: var(--font-heading);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--c-dark);
}

.auth-input {
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-dark);
  font-family: var(--font-heading);
  font-size: 13.5px;
  transition: border-color 0.2s var(--ease-soft), box-shadow 0.2s var(--ease-soft);
}

.auth-input::placeholder {
  color: var(--c-mid-gray);
}

.auth-input:focus {
  outline: none;
  border-color: rgba(217, 119, 87, 0.65);
  box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.14);
}

.auth-input.is-error {
  border-color: var(--c-danger);
}

.auth-code-row {
  display: flex;
  gap: 8px;
}

.auth-code-row .auth-input {
  flex: 1;
  min-width: 0;
}

.auth-code-btn {
  flex: none;
  height: 40px;
  padding: 0 14px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-subtle);
  color: var(--c-mid-gray);
  font-size: 12.5px;
  font-weight: 500;
  cursor: not-allowed;
}

.auth-error {
  font-family: var(--font-heading);
  font-size: 11.5px;
  color: var(--c-danger);
}

.auth-submit {
  height: 42px;
  margin-top: 4px;
  border: none;
  border-radius: 999px;
  background: var(--c-orange);
  color: var(--c-on-accent);
  font-family: var(--font-heading);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(217, 119, 87, 0.24);
  transition: background 0.2s var(--ease-soft), transform 0.15s var(--ease-out),
    box-shadow 0.2s var(--ease-soft);
}

.auth-submit:hover:not(:disabled) {
  background: var(--c-orange-hover);
  box-shadow: 0 8px 18px -10px rgba(217, 119, 87, 0.6);
}

.auth-submit:active:not(:disabled) {
  transform: translateY(1px);
}

.auth-submit:disabled {
  opacity: 0.7;
  cursor: default;
}

.auth-fade-enter-active,
.auth-fade-leave-active {
  transition: opacity 0.22s var(--ease-soft);
}

.auth-fade-enter-active .auth-card,
.auth-fade-leave-active .auth-card {
  transition: transform 0.26s var(--ease-out), opacity 0.22s var(--ease-soft);
}

.auth-fade-enter-from,
.auth-fade-leave-to {
  opacity: 0;
}

.auth-fade-enter-from .auth-card,
.auth-fade-leave-to .auth-card {
  transform: translateY(10px) scale(0.98);
}
</style>
