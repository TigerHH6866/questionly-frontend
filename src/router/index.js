import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue')
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/views/SearchView.vue')
  },
  {
    path: '/tasks',
    name: 'tasks',
    component: () => import('@/views/TaskListView.vue')
  },
  {
    path: '/resources',
    name: 'resources',
    component: () => import('@/views/ResourcesView.vue')
  },
  {
    path: '/compose',
    name: 'compose',
    component: () => import('@/views/ComposeView.vue')
  },
  {
    // id 为 new 表示新建试卷（保存时才真正落库），其余为已有试卷 ID
    path: '/compose/:id',
    name: 'paper-editor',
    component: () => import('@/views/PaperEditorView.vue'),
    props: true
  },
  {
    path: '/tasks/:id',
    name: 'task-detail',
    component: () => import('@/views/TaskDetailView.vue'),
    props: true
  },
  {
    path: '/tasks/:id/process',
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