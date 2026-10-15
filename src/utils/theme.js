import { ref, watch } from 'vue'

/**
 * 主题模式：'light' | 'dark'。
 * 首次进入跟随浏览器的 prefers-color-scheme；用户点过切换按钮后才记住选择，
 * 在那之前浏览器主题变化会继续同步跟随。
 */
const STORAGE_KEY = 'questionly:theme'

function readStored() {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'light' || saved === 'dark' ? saved : null
}

function browserTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const stored = readStored()

/** 用户是否手动选过主题；没选过就一直跟随浏览器 */
let explicit = Boolean(stored)

/** 当前主题，供切换按钮驱动图标 */
export const theme = ref(stored || browserTheme())

/** 深色样式全部挂在 html.dark 上（Element Plus 的深色变量同源，一份标记两处生效） */
function apply(next) {
  document.documentElement.classList.toggle('dark', next === 'dark')
}

apply(theme.value)

watch(theme, apply)

const media = window.matchMedia('(prefers-color-scheme: dark)')
media.addEventListener('change', (event) => {
  if (!explicit) theme.value = event.matches ? 'dark' : 'light'
})

/** 浅色 / 深色互切，并从此固定为用户的选择 */
export function toggleTheme() {
  explicit = true
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem(STORAGE_KEY, theme.value)
}
