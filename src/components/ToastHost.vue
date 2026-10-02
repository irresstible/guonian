<template>
  <Teleport to="body">
    <div
      class="global-toast"
      :class="[`global-toast--${toastState.type}`, { show: toastState.visible }]"
    >
      {{ toastState.msg }}
    </div>
  </Teleport>
</template>

<script setup>
/**
 * @file 全局 Toast 宿主：直接渲染共享的 toastState，无 Props / Emits，由 utils/toast 驱动
 */
import { toastState } from '@/utils/toast';
</script>

<style>
/* ====== 全局 Toast（非 scoped，保证 Teleport 到 body 后样式仍生效）：顶部居中，默认隐藏并上移 ====== */
.global-toast {
  position: fixed;
  top: 40px;
  left: 50%;
  transform: translateX(-50%) translateY(-20px);
  padding: 12px 28px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  opacity: 0;
  transition: all 0.3s var(--ease);
  pointer-events: none;
  z-index: 99999;
  white-space: nowrap;
  max-width: calc(100vw - 32px);
  box-shadow: var(--shadow);
}
.global-toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
/* ====== 三种语义配色：info / success / error ====== */
.global-toast--info {
  background: rgba(3, 233, 244, 0.92);
  color: #000;
}
.global-toast--success {
  background: linear-gradient(135deg, rgba(39, 174, 96, 0.95), rgba(46, 204, 113, 0.95));
  color: #fff;
}
.global-toast--error {
  background: linear-gradient(135deg, rgba(192, 57, 43, 0.95), rgba(231, 76, 60, 0.95));
  color: #fff;
}
</style>
