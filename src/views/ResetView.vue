<template>
  <div class="auth-page">
    <!-- 重置密码页背景（复用登录页背景图；竖屏手机自动模糊填充，桌面 cover） -->
    <AdaptiveBg src="/img/login.jpg" />
    <div class="login-box">
      <h2>重置密码</h2>
      <form @submit.prevent="handleReset">
        <FloatInput
          v-model="phone"
          label="手机号"
          autocomplete="tel"
          inputmode="numeric"
          maxlength="11"
        />
        <!-- 验证码与获取按钮行 -->
        <div class="user-box phone-box">
          <div class="phone-input">
            <input
              v-model="verifyCode"
              type="text"
              inputmode="numeric"
              maxlength="6"
              placeholder=" "
            >
            <label>验证码</label>
          </div>
          <VerifyCodeButton :get-phone="() => phone.trim()" />
        </div>
        <PasswordInput
          v-model="newPassword"
          label="新密码"
          autocomplete="new-password"
        />
        <PasswordInput
          v-model="newPassword2"
          label="确认新密码"
          autocomplete="new-password"
        />
        <div class="register-btn-wrap">
          <button
            type="submit"
            class="register-btn"
            :class="{ 'is-loading': submitting }"
          >
            {{ submitting ? '提交中...' : '重置密码' }}
          </button>
        </div>
        <div class="back-login">
          想起密码了？<RouterLink to="/login">
            返回登录
          </RouterLink>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
/**
 * @file 重置密码页：通过手机验证码设置新密码
 * @description 校验手机号、短信验证码与两次一致的新密码后调用 /resetPassword，
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

const phone = ref('');
const verifyCode = ref('');
const newPassword = ref('');
const newPassword2 = ref('');
const submitting = ref(false);

/**
 * 校验重置密码表单
 * @returns {boolean} 手机号符合格式、验证码非空、新密码不少于 6 位且两次输入一致时返回 true，
 * 否则弹出对应错误提示
 */
function checkForm() {
  if (!PHONE_REGEX.test(phone.value.trim())) { showToast('手机号格式不正确', 'error'); return false; }
  if (!verifyCode.value.trim()) { showToast('请输入验证码', 'error'); return false; }
  if (newPassword.value.trim().length < 6) { showToast('新密码长度不能少于6位', 'error'); return false; }
  if (newPassword.value.trim() !== newPassword2.value.trim()) { showToast('两次输入的密码不一致', 'error'); return false; }
  return true;
}

/**
 * 提交重置密码：防重复提交，先经 checkForm 校验，再请求 /resetPassword
 * 成功后提示“密码重置成功”并在 800ms 后跳转登录页；失败弹出后端消息或网络错误
 */
function handleReset() {
  if (submitting.value) return;
  if (!checkForm()) return;

  submitting.value = true;

  apiPost('/resetPassword', {
    phone: phone.value.trim(),
    verifyCode: verifyCode.value.trim(),
    newPassword: newPassword.value.trim(),
  })
    .then((data) => {
      if (data.code === 200) {
        showToast('密码重置成功！', 'success');
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
