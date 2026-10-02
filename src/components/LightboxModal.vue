<template>
  <Teleport to="body">
    <!-- 图片灯箱：遮罩 + 关闭按钮 + 预览图 -->
    <div
      class="lightbox"
      :class="{ show: modelValue }"
      @click.self="close"
    >
      <span
        class="lightbox__close"
        @click="close"
      >×</span>
      <img
        class="lightbox__pic"
        :src="src"
        alt="预览"
      >
    </div>
  </Teleport>
</template>

<script setup>
/**
 * @file 图片灯箱：Teleport 全屏遮罩预览图片，支持 Esc 与点击遮罩关闭
 * @description Props：modelValue 是否显示（v-model）、src 图片地址；Emits：update:modelValue 关闭时触发，载荷固定为 false
 */
import { watch, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  /** 是否显示灯箱（v-model） */
  modelValue: { type: Boolean, default: false },
  /** 预览图片地址 */
  src: { type: String, default: '' },
});
const emit = defineEmits(['update:modelValue']);

/** 关闭灯箱：向父级同步 false */
function close() {
  emit('update:modelValue', false);
}

/**
 * 键盘事件处理：灯箱打开时按 Esc 关闭
 * @param {KeyboardEvent} e 键盘事件
 */
function onKeydown(e) {
  if (e.key === 'Escape' && props.modelValue) close();
}

/** 显隐变化时锁定 / 释放 body 滚动，避免遮罩下页面滚动 */
watch(() => props.modelValue, (v) => {
  document.body.style.overflow = v ? 'hidden' : '';
});

/** 挂载时注册全局 Esc 监听 */
onMounted(() => document.addEventListener('keydown', onKeydown));
/** 卸载时移除监听并恢复 body 滚动 */
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = '';
});
</script>

<style scoped>
/* ====== 遮罩层：默认透明且不拦截指针事件，.show 时淡入并可交互 ====== */
.lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s var(--ease);
  z-index: 100;
}

.lightbox.show {
  opacity: 1;
  pointer-events: auto;
}

/* ====== 关闭按钮：悬停时旋转 90° 给出操作反馈 ====== */
.lightbox__close {
  position: absolute;
  top: 28px;
  right: 32px;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: background 0.25s, transform 0.25s;
}

.lightbox__close:hover {
  background: var(--brand-1);
  transform: rotate(90deg);
}

/* ====== 预览图：限高限宽适配视口，.show 时缩放进场 ====== */
.lightbox__pic {
  max-width: 90%;
  max-height: 86%;
  border-radius: var(--radius);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
  transform: scale(0.92);
  transition: transform 0.35s var(--ease);
}

.lightbox.show .lightbox__pic {
  transform: scale(1);
}
</style>
