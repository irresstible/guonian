/**
 * @file 路由表与全局守卫：按公开/需登录分区配置页面，统一拦截未登录访问并更新页面标题
 */
import { createRouter, createWebHistory } from 'vue-router';
import { getToken } from '@/utils/storage';

// ====== 页面组件（路由级按需懒加载） ======
const HomeView = () => import('@/views/HomeView.vue');
const LoginView = () => import('@/views/LoginView.vue');
const RegisterView = () => import('@/views/RegisterView.vue');
const ResetView = () => import('@/views/ResetView.vue');
const UserView = () => import('@/views/UserView.vue');
const HelpView = () => import('@/views/HelpView.vue');
const WishesView = () => import('@/views/WishesView.vue');
const AlbumView = () => import('@/views/AlbumView.vue');
const NotificationsView = () => import('@/views/NotificationsView.vue');

const routes = [
  // ====== 公开路由（守卫直接放行） ======
  // 首页：新年活动入口页，所有访客可访问
  { path: '/', name: 'home', component: HomeView, meta: { title: '一起过新年' } },
  // 登录页：公开访问，登录成功后跳回 query.redirect 指向的来源页
  { path: '/login', name: 'login', component: LoginView, meta: { title: '登录账号' } },
  // 注册页：新用户注册，公开访问
  { path: '/register', name: 'register', component: RegisterView, meta: { title: '注册账号' } },
  // 重置密码页：忘记密码时凭手机验证码重置，公开访问
  { path: '/reset', name: 'reset', component: ResetView, meta: { title: '忘记密码' } },
  // 帮助中心：常见问题说明，公开访问
  { path: '/help', name: 'help', component: HelpView, meta: { title: '帮助中心 - 一起过新年' } },
  // 祝福许愿墙：列表公开浏览，登录后接口额外返回当前用户的点赞状态
  { path: '/wishes', name: 'wishes', component: WishesView, meta: { title: '祝福许愿墙 - 一起过新年' } },
  // 新年相册：照片公开浏览，上传/删除等写操作由接口侧要求登录
  { path: '/album', name: 'album', component: AlbumView, meta: { title: '新年相册 - 一起过新年' } },

  // ====== 需登录路由（meta.requiresAuth，未登录由前置守卫拦截） ======
  // 用户中心：查看与编辑个人资料；未登录访问时携带 redirect 跳转登录页
  {
    path: '/user',
    name: 'user',
    component: UserView,
    meta: { title: '用户中心 - 一起过新年', requiresAuth: true },
  },
  // 消息通知：查看通知列表与未读数；未登录访问时携带 redirect 跳转登录页
  {
    path: '/notifications',
    name: 'notifications',
    component: NotificationsView,
    meta: { title: '消息通知 - 一起过新年', requiresAuth: true },
  },

  // 兜底路由：所有未匹配路径统一重定向回首页
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

/**
 * 全局前置守卫：拦截需要登录但本地无 Token 的访问，重定向到登录页并记录来源地址
 * @param {import('vue-router').RouteLocationNormalized} to - 即将进入的目标路由
 * @returns {import('vue-router').RouteLocationRaw | boolean} 未登录返回登录路由定位，否则放行
 */
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !getToken()) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  return true;
});

/**
 * 全局后置钩子：路由切换后按 meta.title 统一更新浏览器页面标题
 * @param {import('vue-router').RouteLocationNormalized} to - 已进入的目标路由
 */
router.afterEach((to) => {
  document.title = to.meta.title || '一起过新年';
});

export default router;
