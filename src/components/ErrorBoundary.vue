<template>
  <!-- 错误兜底态 -->
  <div
    v-if="hasError"
    class="error-boundary"
  >
    <div class="error-boundary__card">
      <h2>页面出了点问题</h2>
      <p>刷新或返回首页试试</p>
      <button
        class="error-boundary__btn"
        @click="goHome"
      >
        返回首页
      </button>
    </div>
  </div>
  <!-- 正常内容插槽 -->
  <slot v-else />
</template>

<script setup>
/**
 * @file 错误边界：捕获后代组件抛出的渲染错误，展示全屏兜底卡片
 * @description 默认插槽为被保护的页面内容
 */
import { ref, onErrorCaptured } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const hasError = ref(false);

/** 捕获后代组件错误：记录日志、切换到兜底 UI，并返回 false 阻止继续向上冒泡 */
onErrorCaptured((err) => {
  console.error('[ErrorBoundary]', err);
  hasError.value = true;
  return false;
});

/** 重置错误态并跳转回首页 */
function goHome() {
  hasError.value = false;
  router.push('/');
}
</script>

<style scoped>
/* ====== 兜底页：fixed 全屏覆盖，最高层级确保压过所有业务内容 ====== */
.error-boundary {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1210;
  z-index: 9999;
}

/* ====== 居中的兜底卡片与返回按钮 ====== */
.error-boundary__card {
  text-align: center;
  padding: 40px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
}

.error-boundary__card h2 {
  color: #fff;
  font-size: 24px;
  margin-bottom: 8px;
}

.error-boundary__card p {
  color: var(--text-2);
  font-size: 14px;
  margin-bottom: 20px;
}

.error-boundary__btn {
  padding: 10px 24px;
  border: none;
  border-radius: var(--radius-sm);
  color: #fff;
  background: var(--brand-gradient);
  cursor: pointer;
  font-size: 14px;
}
</style>
