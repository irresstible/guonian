/**
 * @file 消息通知 Pinia store：未读数、通知列表与定时轮询
 */
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { apiGet, apiPost } from '@/utils/api';

export const useNotificationsStore = defineStore('notifications', () => {
  // ====== state ======
  const unread = ref(0);
  const list = ref([]);
  const loading = ref(false);

  /** 轮询定时器句柄，不对外暴露 */
  let timer = null;

  // ====== actions ======
  /**
   * 拉取未读通知数（GET /notifications/unread-count），成功后更新 unread
   * 网络错误静默处理，避免轮询失败打扰用户
   * @returns {Promise<void>}
   */
  async function fetchUnread() {
    try {
      const data = await apiGet('/notifications/unread-count');
      if (data.code === 200) unread.value = data.data.count;
    } catch {
      /* 轮询场景下网络波动属常态，静默忽略并等待下一轮 */
    }
  }

  /**
   * 拉取通知列表（GET /notifications），成功后整体替换 list，并维护 loading 状态
   * @returns {Promise<void>}
   */
  async function fetchList() {
    loading.value = true;
    try {
      const data = await apiGet('/notifications');
      if (data.code === 200) list.value = data.data;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 标记通知已读（POST /notifications/read）：传 ID 数组标记部分，不传则全部已读
   * 成功后用响应中的最新未读数同步 unread，并把对应通知在本地置为已读
   * @param {Array<number | string>} [ids] - 需标记的通知 ID 数组；省略时标记全部
   * @returns {Promise<object>} 后端 JSON 响应体，data 含最新未读 count
   */
  async function markRead(ids) {
    const body = Array.isArray(ids) ? { ids } : { all: true };
    const data = await apiPost('/notifications/read', body, { auth: true });
    if (data.code === 200) {
      unread.value = data.data.count;
      const idSet = Array.isArray(ids) ? new Set(ids) : null;
      list.value = list.value.map((n) =>
        !idSet || idSet.has(n.id) ? { ...n, read: true } : n
      );
    }
    return data;
  }

  /**
   * 启动未读数轮询：先清理旧定时器，避免重复开启
   * @param {number} [interval=30000] - 轮询间隔（毫秒）
   */
  function startPolling(interval = 30000) {
    stopPolling();
    timer = setInterval(fetchUnread, interval);
  }

  /**
   * 停止未读数轮询并清空定时器句柄
   */
  function stopPolling() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return { unread, list, loading, fetchUnread, fetchList, markRead, startPolling, stopPolling };
});
