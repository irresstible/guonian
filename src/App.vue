<template>
  <!-- 路由出口（错误边界兜底） -->
  <ErrorBoundary>
    <RouterView />
  </ErrorBoundary>
  <!-- 全局浮层：季节粒子背景与 Toast 提示 -->
  <SeasonCanvas />
  <ToastHost />
</template>

<script setup>
/**
 * @file 应用根组件：路由出口 + 全局错误边界 + 季节粒子背景 + 全局 Toast
 */
import ErrorBoundary from '@/components/ErrorBoundary.vue';
import SeasonCanvas from '@/components/SeasonCanvas.vue';
import ToastHost from '@/components/ToastHost.vue';
</script>
