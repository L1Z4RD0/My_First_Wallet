import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../store/auth'

const routes = [
  {
    path: '/',
    redirect: () => {
      const auth = useAuthStore()
      if (!auth.isLoggedIn) return '/login'
      if (auth.isAdmin)    return '/admin'
      if (auth.isDocente)  return '/teacher'
      return '/app'
    }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/app',
    name: 'student',
    component: () => import('../views/StudentApp.vue'),
    meta: { role: 'alumno' }
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../views/AdminDashboard.vue'),
    meta: { role: 'admin' }
  },
  {
    path: '/teacher',
    name: 'teacher',
    component: () => import('../views/TeacherDashboard.vue'),
    meta: { role: 'docente' }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.public) return true

  if (!auth.isLoggedIn) return { name: 'login' }

  if (to.meta.role && auth.user?.role !== to.meta.role) {
    if (auth.isAdmin)   return { name: 'admin' }
    if (auth.isDocente) return { name: 'teacher' }
    return { name: 'student' }
  }

  return true
})

export default router
