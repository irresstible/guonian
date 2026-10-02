<template>
  <span
    class="code-btn"
    :class="{ 'is-counting': counting }"
    @click="handleClick"
  >
    {{ counting ? `${count}s后重发` : '获取验证码' }}
  </span>
</template>

<script setup>
/**
 * @file 获取验证码按钮：校验手机号后请求发送接口，成功后进入 60 秒倒计时防止重复发送
 * @description Props：getPhone 由父组件传入，返回当前手机号输入值；无 Emits
 */
import { ref, onUnmounted } from 'vue';
import { apiPost } from '@/utils/api';
import { PHONE_REGEX } from '@/utils/config';
import { showToast } from '@/utils/toast';

const props = defineProps({
  /** 父组件传入的取值函数，返回当前手机号输入值 */
  getPhone: { type: Function, required: true },
});

/** 是否处于倒计时中（倒计时中点击无效） */
const counting = ref(false);
/** 剩余可重发秒数 */
const count = ref(60);
let timer = null;

/** 启动 60 秒重发倒计时，归零后恢复可点击 */
function startCountdown() {
  counting.value = true;
  count.value = 60;
  timer = setInterval(() => {
    count.value--;
    if (count.value <= 0) {
      clearInterval(timer);
      timer = null;
      counting.value = false;
    }
  }, 1000);
}

/** 点击处理：倒计时中忽略；手机号合法后请求发送验证码，按结果 Toast 提示并决定是否开始倒计时 */
function handleClick() {
  if (counting.value) return;

  const phone = props.getPhone();
  if (!PHONE_REGEX.test(phone)) {
    showToast('请输入正确的11位手机号', 'error');
    return;
  }

  apiPost('/sendCode', { phone })
    .then((data) => {
      if (data.code === 200) {
        showToast(
          data.devCode ? `演示环境验证码：${data.devCode}` : '验证码已发送！请到后端终端查看',
          'success'
        );
        startCountdown();
      } else {
        showToast(data.msg, 'error');
      }
    })
    .catch(() => showToast('网络错误，后端没启动', 'error'));
}

/** 卸载时清除倒计时定时器 */
onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>
