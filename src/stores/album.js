/**
 * @file 新年相册 Pinia store：照片列表加载、上传与删除的数据流
 */
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { apiGetPublic, apiPost, apiDelete } from '@/utils/api';

export const useAlbumStore = defineStore('album', () => {
  // ====== state ======
  const items = ref([]);
  const loading = ref(false);

  // ====== actions ======
  /**
   * 拉取相册照片列表（GET /album），成功后整体替换 items，并维护 loading 状态
   * 携带弱鉴权：未登录可浏览公开数据，登录后额外返回归属等用户相关字段
   * @returns {Promise<void>}
   */
  async function fetchAlbum() {
    loading.value = true;
    try {
      const data = await apiGetPublic('/album', { auth: true });
      if (data.code === 200) items.value = data.data;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 上传相册照片（POST /album），成功后将新照片头插到列表最前
   * @param {object} payload - 上传内容（通常为压缩后的图片 data URL 及文案）
   * @returns {Promise<object>} 后端 JSON 响应体，data 为新创建的照片对象
   */
  async function uploadAlbum(payload) {
    const data = await apiPost('/album', payload, { auth: true });
    if (data.code === 200) items.value.unshift(data.data);
    return data;
  }

  /**
   * 删除自己上传的照片（DELETE /album/:id），成功后从列表移除该条
   * @param {number | string} id - 待删除照片 ID
   * @returns {Promise<object>} 后端 JSON 响应体
   */
  async function removeAlbum(id) {
    const data = await apiDelete(`/album/${id}`);
    if (data.code === 200) items.value = items.value.filter((x) => x.id !== id);
    return data;
  }

  return { items, loading, fetchAlbum, uploadAlbum, removeAlbum };
});
