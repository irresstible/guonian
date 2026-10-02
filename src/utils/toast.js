/**
 * @file Toast 轻提示：全局响应式单例状态，由 App.vue 中的 ToastHost 组件统一渲染
 */
import { reactive } from 'vue';

/** Toast 单例状态，同一时刻只展示一条提示 */
export const toastState = reactive({
  visible: false,
  msg: '',
  type: 'info', // 提示类型，仅可取 'info' | 'success' | 'error'
});

let toastTimer = null;

/**
 * 显示一条 Toast 提示，到时自动隐藏
 * @param {string} msg - 提示文案
 * @param {'info' | 'success' | 'error'} [type='info'] - 提示类型
 * @param {number} [duration=2000] - 显示时长（毫秒）
 */
export function showToast(msg, type = 'info', duration = 2000) {
  toastState.msg = msg;
  toastState.type = type;
  toastState.visible = false;

  // 连续触发时先复位再于下一帧置为可见，强制重播入场动画
  requestAnimationFrame(() => {
    toastState.visible = true;
  });

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastState.visible = false;
  }, duration);
}
