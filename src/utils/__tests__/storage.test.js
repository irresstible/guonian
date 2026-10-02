/**
 * utils/storage 单测（node 环境 + localStorage stub）
 */
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

// localStorage 桩
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

let storage;
beforeAll(async () => {
  storage = await import('../storage.js');
});

describe('storage', () => {
  beforeEach(() => store.clear());

  it('getToken 无值时返回空串', () => {
    expect(storage.getToken()).toBe('');
  });

  it('setToken/getToken 往返一致', () => {
    storage.setToken('abc123');
    expect(storage.getToken()).toBe('abc123');
  });

  it('用户名读写', () => {
    expect(storage.getUsername()).toBeNull();
    storage.setUsername('modtest');
    expect(storage.getUsername()).toBe('modtest');
  });

  it('记住的用户名可设置与移除', () => {
    storage.setSavedUsername('u1');
    expect(storage.getSavedUsername()).toBe('u1');
    storage.removeSavedUsername();
    expect(storage.getSavedUsername()).toBeNull();
  });

  it('clearAuth 清空 token/username/savedUsername', () => {
    storage.setToken('t');
    storage.setUsername('u');
    storage.setSavedUsername('s');
    storage.clearAuth();
    expect(storage.getToken()).toBe('');
    expect(storage.getUsername()).toBeNull();
    expect(storage.getSavedUsername()).toBeNull();
  });
});
