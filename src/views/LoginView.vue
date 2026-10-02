<template>
  <div class="auth-page">
    <!-- 登录页背景（竖屏手机自动模糊填充，桌面 cover） -->
    <AdaptiveBg src="/img/login.jpg" />
    <div class="login-box">
      <h2>登录账号</h2>
      <form @submit.prevent="handleLogin">
        <FloatInput
          v-model="username"
          label="用户名"
          autocomplete="username"
        />
        <PasswordInput
          v-model="password"
          label="密码"
          autocomplete="current-password"
        />
        <!-- 记住密码与忘记密码行 -->
        <div class="login-options">
          <label class="remember-label">
            <input
              v-model="rememberMe"
              type="checkbox"
            >
            记住密码
          </label>
          <RouterLink
            to="/reset"
            class="forget-link"
          >
            忘记密码？
          </RouterLink>
        </div>
        <div class="login-btn-wrap">
          <button
            type="submit"
            class="login-btn"
            :class="{ 'is-loading': submitting }"
          >
            {{ submitting ? '登录中...' : '登录' }}
          </button>
        </div>
        <div class="back-register">
          没有账号？<RouterLink to="/register">
            立即注册
          </RouterLink>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
/**
 * @file 登录页：用户名密码登录表单
 * @description 校验通过后调用 /login，成功时写入 auth store、记录本地登录历史、按勾选记忆用户名，
 * 并跳转 redirect 查询参数或用户中心；依赖 auth store 与 FloatInput、PasswordInput 组件
 */
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { apiPost } from '@/utils/api';
import {
  getSavedUsername, setSavedUsername, removeSavedUsername, addLoginHistory,
} from '@/utils/storage';
import { showToast } from '@/utils/toast';
import { useAuthStore } from '@/stores/auth';
import FloatInput from '@/components/FloatInput.vue';
import PasswordInput from '@/components/PasswordInput.vue';
import AdaptiveBg from '@/components/AdaptiveBg.vue';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const username = ref('');
const password = ref('');
const rememberMe = ref(false);
const submitting = ref(false);

/** 页面挂载时回填本地记住的用户名，并同步勾选“记住密码” */
onMounted(() => {
  const saved = getSavedUsername();
  if (saved) {
    username.value = saved;
    rememberMe.value = true;
  }
});

/**
 * 校验登录表单
 * @returns {boolean} 用户名非空、密码非空且不少于 6 位时返回 true，否则弹出错误提示
 */
function checkForm() {
  if (!username.value.trim()) { showToast('用户名不能为空', 'error'); return false; }
  if (!password.value.trim()) { showToast('密码不能为空', 'error'); return false; }
  if (password.value.trim().length < 6) { showToast('密码不能少于6位', 'error'); return false; }
  return true;
}

/**
 * 提交登录：防重复提交，先经 checkForm 校验，再请求 /login
 * 成功后保存登录态、追加一条本地登录历史、按勾选记忆或清除用户名，
 * 提示成功并在 800ms 后跳转 redirect 查询参数（默认 /user）；失败弹出后端消息或网络错误
 */
function handleLogin() {
  if (submitting.value) return;
  if (!checkForm()) return;

  submitting.value = true;

  apiPost('/login', {
    username: username.value.trim(),
    password: password.value.trim(),
  })
    .then((data) => {
      if (data.code === 200) {
        auth.setAuth({ token: data.token, username: data.username });
        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const time = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        addLoginHistory({ time, ua: navigator.userAgent });
        if (rememberMe.value) {
          setSavedUsername(username.value.trim());
        } else {
          removeSavedUsername();
        }
        showToast('登录成功！', 'success');
        const target = typeof route.query.redirect === 'string' ? route.query.redirect : '/user';
        setTimeout(() => router.push(target), 800);
      } else {
        showToast(data.msg, 'error');
        submitting.value = false;
      }
    })
    .catch(() => {
      showToast('网络错误', 'error');
      submitting.value = false;
    });
}
</script>
