<template>
  <div class="auth-page">
    <!-- 注册页背景（竖屏手机自动模糊填充，桌面 cover） -->
    <AdaptiveBg src="/img/register.jpg" />
    <div class="login-box">
      <h2>注册账号</h2>
      <form @submit.prevent="handleRegister">
        <FloatInput
          v-model="username"
          label="用户名"
          autocomplete="username"
          maxlength="16"
        />
        <PasswordInput
          v-model="password"
          label="密码"
          autocomplete="new-password"
        />
        <PasswordInput
          v-model="password2"
          label="确认密码"
          autocomplete="new-password"
        />
        <!-- 手机号与获取验证码行 -->
        <div class="user-box phone-box">
          <div class="phone-input">
            <input
              v-model="phone"
              type="text"
              autocomplete="tel"
              inputmode="numeric"
              maxlength="11"
              placeholder=" "
            >
            <label>手机号</label>
          </div>
          <VerifyCodeButton :get-phone="() => phone.trim()" />
        </div>
        <FloatInput
          v-model="verifyCode"
          label="验证码"
          inputmode="numeric"
          maxlength="6"
        />
        <div class="register-btn-wrap">
          <button
            type="submit"
            class="register-btn"
            :class="{ 'is-loading': submitting }"
          >
            {{ submitting ? '提交中...' : '注册账号' }}
          </button>
        </div>
        <div class="back-login">
          已有账号？<RouterLink to="/login">
            返回登录
          </RouterLink>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
/**
 * @file 注册页：新用户账号注册表单
 * @description 校验用户名、两次密码、手机号与短信验证码后调用 /register，
 * 成功提示并在 800ms 后跳转登录页；依赖 FloatInput、PasswordInput、VerifyCodeButton 组件
 */
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiPost } from '@/utils/api';
import { PHONE_REGEX } from '@/utils/config';
import { showToast } from '@/utils/toast';
import FloatInput from '@/components/FloatInput.vue';
import PasswordInput from '@/components/PasswordInput.vue';
import VerifyCodeButton from '@/components/VerifyCodeButton.vue';
import AdaptiveBg from '@/components/AdaptiveBg.vue';

const router = useRouter();

const username = ref('');
const password = ref('');
const password2 = ref('');
const phone = ref('');
const verifyCode = ref('');
const submitting = ref(false);

/**
 * 校验注册表单
 * @returns {boolean} 用户名 2-16 位、密码不少于 6 位、两次密码一致、手机号符合格式、
 * 验证码非空时返回 true，否则弹出对应错误提示
 */
function checkForm() {
  const u = username.value.trim();
  const p = password.value.trim();
  const p2 = password2.value.trim();
  const ph = phone.value.trim();
  const code = verifyCode.value.trim();

  if (u.length < 2 || u.length > 16) { showToast('用户名必须是2-16位字符', 'error'); return false; }
  if (p.length < 6) { showToast('密码长度不能少于6位', 'error'); return false; }
  if (p !== p2) { showToast('两次输入的密码不一致', 'error'); return false; }
  if (!PHONE_REGEX.test(ph)) { showToast('手机号格式不正确', 'error'); return false; }
  if (!code) { showToast('请输入验证码', 'error'); return false; }
  return true;
}

/**
 * 提交注册：防重复提交，先经 checkForm 校验，再请求 /register
 * 成功后提示“注册成功”并在 800ms 后跳转登录页；失败弹出后端消息或网络错误
 */
function handleRegister() {
  if (submitting.value) return;
  if (!checkForm()) return;

  submitting.value = true;

  apiPost('/register', {
    username: username.value.trim(),
    password: password.value.trim(),
    phone: phone.value.trim(),
    verifyCode: verifyCode.value.trim(),
  })
    .then((data) => {
      if (data.code === 200) {
        showToast('注册成功！跳转到登录页', 'success');
        setTimeout(() => router.push('/login'), 800);
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
