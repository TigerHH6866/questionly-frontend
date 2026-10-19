import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  // 落地页与法律页是公开的全幅独立页面，不套工作区侧栏外壳（见 App.vue）
  {
    path: '/',
    name: 'landing',
    component: () => import('@/views/LandingView.vue')
  },
  {
    path: '/terms',
    name: 'terms',
    component: () => import('@/views/LegalView.vue'),
    props: { kind: 'terms' }
  },
  {
    path: '/privacy',
    name: 'privacy',
    component: () => import('@/views/LegalView.vue'),
    props: { kind: 'privacy' }
  },
  {
    // 套餐页：公开的营销页，顶导与页脚的「定价」入口都指向这里
    path: '/plans',
    name: 'plans',
    component: () => import('@/views/PlansView.vue')
  },
  // 工作区：所有功能页统一挂在 /app 前缀下
  {
    path: '/app',
    name: 'home',
    component: () => import('@/views/HomeView.vue')
  },
  {
    path: '/app/search',
    name: 'search',
    component: () => import('@/views/SearchView.vue')
  },
  {
    path: '/app/tasks',
    name: 'tasks',
    component: () => import('@/views/TaskListView.vue')
  },
  {
    path: '/app/resources',
    name: 'resources',
    component: () => import('@/views/ResourcesView.vue')
  },
  {
    path: '/app/orders',
    name: 'orders',
    component: () => import('@/views/OrdersView.vue')
  },
  {
    path: '/app/compose',
    name: 'compose',
    component: () => import('@/views/ComposeView.vue')
  },
  {
    // id 为 new 表示新建试卷（保存时才真正落库），其余为已有试卷 ID
    path: '/app/compose/:id',
    name: 'paper-editor',
    component: () => import('@/views/PaperEditorView.vue'),
    props: true
  },
  {
    path: '/app/tasks/:id',
    name: 'task-detail',
    component: () => import('@/views/TaskDetailView.vue'),
    props: true
  },
  {
    path: '/app/tasks/:id/process',
    name: 'task-process',
    component: () => import('@/views/TaskProcessView.vue'),
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
