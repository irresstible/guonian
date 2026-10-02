import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useWishesStore } from '../wishes';

// Mock api 层
vi.mock('@/utils/api', () => ({
  apiGetPublic: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
}));

import { apiGetPublic, apiPost, apiDelete } from '@/utils/api';

const sampleWish = {
  id: 'w_1',
  type: 'blessing',
  content: '新年快乐',
  createdAt: '2026-10-02 00:00:00',
  author: { id: 'u_1', name: 'alice', avatar: '' },
  likeCount: 0,
  likedByMe: false,
  comments: [],
};

describe('wishes store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('fetchWishes 拼接 type 与 keyword', async () => {
    apiGetPublic.mockResolvedValue({ code: 200, data: [sampleWish] });
    const store = useWishesStore();
    store.activeTab = 'wish';
    store.keyword = '健康';
    await store.fetchWishes();
    expect(apiGetPublic).toHaveBeenCalledWith('/wishes?type=wish&keyword=%E5%81%A5%E5%BA%B7', { auth: true });
    expect(store.items).toHaveLength(1);
  });

  it('createWish 成功后头插', async () => {
    apiPost.mockResolvedValue({ code: 200, data: { ...sampleWish, id: 'w_new' } });
    const store = useWishesStore();
    store.items = [sampleWish];
    await store.createWish({ type: 'blessing', content: '新祝福' });
    expect(store.items[0].id).toBe('w_new');
    expect(store.items).toHaveLength(2);
  });

  it('toggleLike 原地更新 liked/likeCount', async () => {
    apiPost.mockResolvedValue({ code: 200, data: { liked: true, likeCount: 5 } });
    const store = useWishesStore();
    store.items = [{ ...sampleWish }];
    await store.toggleLike('w_1');
    expect(store.items[0].likedByMe).toBe(true);
    expect(store.items[0].likeCount).toBe(5);
  });

  it('addComment 追加到对应 wish', async () => {
    apiPost.mockResolvedValue({ code: 200, data: { id: 'c_1', content: '棒' } });
    const store = useWishesStore();
    store.items = [{ ...sampleWish }];
    await store.addComment('w_1', '棒');
    expect(store.items[0].comments).toHaveLength(1);
    expect(store.items[0].comments[0].content).toBe('棒');
  });

  it('removeWish 从列表过滤', async () => {
    apiDelete.mockResolvedValue({ code: 200 });
    const store = useWishesStore();
    store.items = [sampleWish, { ...sampleWish, id: 'w_2' }];
    await store.removeWish('w_1');
    expect(store.items).toHaveLength(1);
    expect(store.items[0].id).toBe('w_2');
  });
});
