import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
// Element Plus 的深色变量：与站内主题共用 html.dark 这一个标记，一份开关两处生效
import 'element-plus/theme-chalk/dark/css-vars.css'
import 'katex/dist/katex.min.css'

import App from './App.vue'
import router from './router'
import i18n from './i18n'
import './styles/global.css'

createApp(App).use(router).use(i18n).use(ElementPlus).mount('#app')
