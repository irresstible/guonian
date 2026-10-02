<template>
  <Teleport to="body">
    <!-- 确认弹窗：遮罩 + 卡片 -->
    <div
      v-if="visible"
      class="modal-mask"
      :class="{ show: shown }"
      @click.self="handleCancel"
    >
      <div
        class="modal modal--sm"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="titleId"
      >
        <!-- 正文 -->
        <div class="modal__body">
          <h3 :id="titleId">
            {{ title }}
          </h3>
          <p class="confirm-msg">
            {{ message }}
          </p>
        </div>
        <!-- 操作按钮 -->
        <div class="modal__footer">
          <button
            type="button"
            class="btn btn--ghost"
            @click="handleCancel"
          >
            取消
          </button>
          <button
            ref="okBtnRef"
            type="button"
            class="btn btn--danger"
            @click="handleOk"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
/**
 * @file 确认对话框：Teleport 挂载到 body，通过暴露的 open() 打开
 * @description Props：title 标题、message 文案；Emits：confirm 点击确定、cancel 点击取消或遮罩，均无载荷
 */
import { ref, nextTick, watch } from 'vue';

defineProps({
  /** 弹窗标题 */
  title: { type: String, default: '提示' },
  /** 弹窗提示文案 */
  message: { type: String, default: '' },
});
const emit = defineEmits(['confirm', 'cancel']);

const visible = ref(false);
const shown = ref(false);
const okBtnRef = ref(null);
const titleId = 'confirmTitle-' + Math.random().toString(36).slice(2, 8);

/** 打开后下一帧再加 show 类触发过渡动画，并自动聚焦确定按钮 */
watch(visible, async (v) => {
  if (v) {
    await nextTick();
    requestAnimationFrame(() => {
      shown.value = true;
      okBtnRef.value?.focus();
    });
  }
});

/** 先移除 show 类播放关闭动画，过渡结束后再真正卸载弹窗 */
function close() {
  shown.value = false;
  setTimeout(() => {
    visible.value = false;
  }, 250);
}

/** 点击确定：关闭弹窗并触发 confirm 事件 */
function handleOk() {
  close();
  emit('confirm');
}

/** 点击取消或遮罩：关闭弹窗并触发 cancel 事件 */
function handleCancel() {
  close();
  emit('cancel');
}

/** 打开弹窗，供父组件通过组件 ref 调用 */
function open() {
  visible.value = true;
}

defineExpose({ open });
</script>

<style scoped>
/* ====== 遮罩层：fixed 全屏居中 + 毛玻璃，用 opacity 控制淡入淡出 ====== */
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  opacity: 0;
  transition: opacity 0.25s ease;
  box-sizing: border-box;
}

.modal-mask.show {
  opacity: 1;
}

/* ====== 弹窗卡片：位移 + 缩放初始态，遮罩 show 时联动过渡进场 ====== */
.modal {
  width: 460px;
  max-width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  background: rgba(28, 22, 20, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
  transform: translateY(24px) scale(0.96);
  opacity: 0;
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s;
}

.modal-mask.show .modal {
  transform: translateY(0) scale(1);
  opacity: 1;
}

.modal--sm {
  width: 360px;
}

/* ====== 正文与页脚布局 ====== */
.modal__body {
  padding: 20px 24px;
}

.modal__body h3 {
  margin: 0;
  font-size: 19px;
  color: #fff;
}

.modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 0 24px 22px;
}

/* ====== 操作按钮：幽灵描边与危险主按钮两种风格 ====== */
.btn {
  padding: 10px 22px;
  font-size: 14px;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.25s;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.btn--ghost {
  color: rgba(255, 255, 255, 0.8);
  background: transparent;
  border-color: rgba(255, 255, 255, 0.25);
}

.btn--ghost:hover:not(:disabled) {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.55);
  background: rgba(255, 255, 255, 0.08);
}

.btn--danger {
  color: #fff;
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  box-shadow: 0 6px 18px rgba(231, 76, 60, 0.3);
}

.btn--danger:hover:not(:disabled) {
  transform: translateY(-1px);
}

/* ====== 提示文案 ====== */
.confirm-msg {
  margin: 12px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.75);
}

/* ====== 移动端适配：弹窗撑满宽度，底部按钮等分 ====== */
@media (max-width: 768px) {
  .modal {
    width: 100%;
  }
  .modal__body {
    padding: 18px 18px;
  }
  .modal__footer {
    padding: 0 18px 18px;
  }
  .btn {
    flex: 1;
    padding: 11px 12px;
  }
}
</style>
