/**
 * @file 登录态 Pinia store：全局共享 Token 与当前用户资料
 * @description 导航栏、登录页、用户中心统一从本 store 读取用户信息，避免各页面重复调用 /profile
 */
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { apiGet } from '@/utils/api';
import { letterAvatar } from '@/utils/avatar';
import * as storage from '@/utils/storage';

export const useAuthStore = defineStore('auth', () => {
  // ====== state ======
  const token = ref(storage.getToken());
  /**
   * 当前登录用户的完整资料，未拉取或未登录时为 null
   * @type {import('vue').Ref<null | {username: string, nickname: string, avatar: string, phone: string, gender: string, bio: string, createdAt: string}>}
   */
  const user = ref(null);

  // ====== getters ======
  /** 是否已登录（本地存在 Token） */
  const isLoggedIn = computed(() => !!token.value);
  /** 页面展示名：优先昵称，其次用户名，均无则为空串 */
  const displayName = computed(() => (user.value ? user.value.nickname || user.value.username : ''));
  /** 头像地址：有自定义头像用自定义头像，否则回退为首字母 SVG */
  const avatarSrc = computed(() => {
    if (user.value && user.value.avatar) return user.value.avatar;
    return letterAvatar(displayName.value || 'U');
  });

  // ====== actions ======
  /**
   * 登录成功后写入登录态：持久化 Token 与用户名，资料留待 fetchProfile 拉取
   * @param {{token: string, username: string}} authInfo - 登录接口返回的 Token 与用户名
   */
  function setAuth({ token: t, username }) {
    storage.setToken(t);
    storage.setUsername(username);
    token.value = t;
    user.value = null; // 此时仅有用户名，完整资料需另行调用 fetchProfile
  }

  /**
   * 拉取当前登录用户资料（GET /profile）
   * @returns {Promise<boolean>} 成功写入 user 返回 true；业务失败会清空登录态并返回 false；网络错误保留登录态返回 false，由调用方决定是否降级展示
   */
  async function fetchProfile() {
    if (!token.value) return false;
    try {
      const data = await apiGet('/profile');
      if (data.code === 200) {
        user.value = data.data;
        return true;
      }
      logout();
      return false;
    } catch {
      // 网络错误不清登录态：可能只是临时断网，保留身份供离线/降级展示
      return false;
    }
  }

  /**
   * 退出登录：清除本地全部登录数据并重置内存状态
   */
  function logout() {
    storage.clearAuth();
    token.value = '';
    user.value = null;
  }

  return { token, user, isLoggedIn, displayName, avatarSrc, setAuth, fetchProfile, logout };
});
