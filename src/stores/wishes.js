/**
 * @file 祝福/许愿墙 Pinia store：列表加载、发布、点赞、评论与删除的数据流
 */
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { apiGetPublic, apiPost, apiDelete } from '@/utils/api';

export const useWishesStore = defineStore('wishes', () => {
  // ====== state ======
  const items = ref([]);
  const loading = ref(false);
  const activeTab = ref('blessing'); // 当前墙类型：blessing=祝福，wish=许愿
  const keyword = ref('');

  // ====== getters ======
  /** 当前 tab 展示的列表（类型过滤由接口按 activeTab 返回，前端直接透传） */
  const filtered = computed(() => items.value);

  // ====== actions ======
  /**
   * 拉取祝福/许愿列表（GET /wishes），携带当前 tab 与搜索关键词
   * 成功后用接口返回的整页数据替换 items，并维护 loading 状态
   * @returns {Promise<void>}
   */
  async function fetchWishes() {
    loading.value = true;
    try {
      const params = new URLSearchParams();
      params.set('type', activeTab.value);
      if (keyword.value.trim()) params.set('keyword', keyword.value.trim());
      const data = await apiGetPublic(`/wishes?${params.toString()}`, { auth: true });
      if (data.code === 200) items.value = data.data;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 发布祝福或许愿（POST /wishes），成功后将新内容头插到列表最前
   * @param {object} payload - 发布表单内容（类型、正文等）
   * @returns {Promise<object>} 后端 JSON 响应体，供调用方判断成功与否
   */
  async function createWish(payload) {
    const data = await apiPost('/wishes', payload, { auth: true });
    if (data.code === 200) {
      items.value.unshift(data.data);
    }
    return data;
  }

  /**
   * 切换指定内容的点赞状态（POST /wishes/:id/like），成功后用后端返回值原地更新
   * @param {number | string} id - 祝福/许愿记录 ID
   * @returns {Promise<object>} 后端 JSON 响应体，data 含最新 liked 与 likeCount
   */
  async function toggleLike(id) {
    const data = await apiPost(`/wishes/${id}/like`, {}, { auth: true });
    if (data.code === 200) {
      const w = items.value.find((x) => x.id === id);
      if (w) {
        w.likedByMe = data.data.liked;
        w.likeCount = data.data.likeCount;
      }
    }
    return data;
  }

  /**
   * 对指定内容发表评论（POST /wishes/:id/comments），成功后把新评论追加到该记录的 comments
   * @param {number | string} id - 被评论的祝福/许愿记录 ID
   * @param {string} content - 评论正文
   * @returns {Promise<object>} 后端 JSON 响应体，data 为新创建的评论对象
   */
  async function addComment(id, content) {
    const data = await apiPost(`/wishes/${id}/comments`, { content }, { auth: true });
    if (data.code === 200) {
      const w = items.value.find((x) => x.id === id);
      if (w) w.comments.push(data.data);
    }
    return data;
  }

  /**
   * 删除评论（DELETE /wishes/:wishId/comments/:commentId，限评论作者或楼主），成功后从对应记录移除
   * @param {number | string} wishId - 所属祝福/许愿记录 ID
   * @param {number | string} commentId - 待删除评论 ID
   * @returns {Promise<object>} 后端 JSON 响应体
   */
  async function removeComment(wishId, commentId) {
    const data = await apiDelete(`/wishes/${wishId}/comments/${commentId}`);
    if (data.code === 200) {
      const w = items.value.find((x) => x.id === wishId);
      if (w) w.comments = w.comments.filter((c) => c.id !== commentId);
    }
    return data;
  }

  /**
   * 删除自己发布的祝福/许愿（DELETE /wishes/:id），成功后从列表移除该条
   * @param {number | string} id - 待删除记录 ID
   * @returns {Promise<object>} 后端 JSON 响应体
   */
  async function removeWish(id) {
    const data = await apiDelete(`/wishes/${id}`);
    if (data.code === 200) {
      items.value = items.value.filter((x) => x.id !== id);
    }
    return data;
  }

  return {
    items,
    loading,
    activeTab,
    keyword,
    filtered,
    fetchWishes,
    createWish,
    toggleLike,
    addComment,
    removeComment,
    removeWish,
  };
});
