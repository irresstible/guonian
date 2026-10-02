/**
 * utils/avatar 与 utils/toast 单测
 */
import { describe, it, expect } from 'vitest';
import { letterAvatar } from '../avatar.js';

describe('letterAvatar', () => {
  it('取名字首字母并大写', () => {
    const url = letterAvatar('modtest');
    expect(url.startsWith('data:image/svg+xml,')).toBe(true);
    expect(decodeURIComponent(url)).toContain('>M<');
  });

  it('中文名取首字符', () => {
    expect(decodeURIComponent(letterAvatar('浅望繇'))).toContain('>浅<');
  });

  it('空值兜底为 U', () => {
    expect(decodeURIComponent(letterAvatar(''))).toContain('>U<');
    expect(decodeURIComponent(letterAvatar(null))).toContain('>U<');
  });
});

describe('toast', () => {
  it('showToast 更新响应式状态并在到时后隐藏', async () => {
    // requestAnimationFrame 桩
    globalThis.requestAnimationFrame = (fn) => fn();
    const { toastState, showToast } = await import('../toast.js');

    showToast('测试消息', 'success', 20);
    expect(toastState.msg).toBe('测试消息');
    expect(toastState.type).toBe('success');
    expect(toastState.visible).toBe(true);

    await new Promise((r) => setTimeout(r, 40));
    expect(toastState.visible).toBe(false);
  });
});
