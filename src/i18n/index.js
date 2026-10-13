import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN'
import enUS from './en-US'

const STORAGE_KEY = 'questionly-locale'
const supported = ['zh-CN', 'en-US']

const saved = localStorage.getItem(STORAGE_KEY)
const browserLocale = navigator.language?.startsWith('zh') ? 'zh-CN' : 'en-US'
const initial = supported.includes(saved) ? saved : browserLocale

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: initial,
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  }
})

document.documentElement.lang = initial

export function setLocale(locale) {
  if (!supported.includes(locale)) return
  i18n.global.locale.value = locale
  localStorage.setItem(STORAGE_KEY, locale)
  document.documentElement.lang = locale
}

export default i18n
