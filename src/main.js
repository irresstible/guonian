/**
 * @file 应用入口：创建并挂载 Vue 实例，注册 Pinia、路由及全局兜底逻辑
 * @description 401 处理回调在入口注册，避免 api 模块与 store/router 之间产生循环依赖
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { setUnauthorizedHandler } from '@/utils/api';
import { useAuthStore } from '@/stores/auth';
import { showToast } from '@/utils/toast';
import './assets/main.css';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);

// ====== 登录失效统一处理 ======
/**
 * 鉴权失效回调：清空登录态、提示用户并跳转登录页
 */
setUnauthorizedHandler(() => {
  const auth = useAuthStore(pinia);
  auth.logout();
  showToast('登录已过期，请重新登录', 'error');
  router.push('/login');
});

// ====== 全局错误兜底 ======
/**
 * 捕获组件内未处理异常：输出日志并向用户给出统一提示
 * @param {unknown} err - 捕获到的异常对象
 */
app.config.errorHandler = (err) => {
  console.error('[GlobalError]', err);
  showToast('页面出现异常', 'error');
};

app.mount('#app');
