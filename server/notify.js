/**
 * @file 通知生成服务
 * @description 在点赞/评论祝福内容时写入通知记录；未读点赞按触发者 + 内容去重，避免重复打扰
 */
import { load, save } from './store.js';
import { genId, now } from './util.js';

/**
 * 创建一条互动通知并写入存储（未读点赞命中去重时直接跳过）
 * @param {object} opts - 通知参数
 * @param {string} opts.userId - 接收者用户 id
 * @param {'like'|'comment'} opts.type - 互动类型
 * @param {string} opts.wishId - 被互动内容 id
 * @param {string} [opts.wishType] - 被互动内容类型 blessing|wish，缺省为 blessing
 * @param {string} opts.fromUserId - 触发者用户 id
 * @param {string} opts.fromName - 触发者昵称快照
 * @param {string} opts.excerpt - 被互动内容摘要，写入时截取前 30 字
 * @returns {void}
 */
export function createNotification({ userId, type, wishId, wishType, fromUserId, fromName, excerpt }) {
  const list = load('notifications');

  // 未读点赞去重：同一触发者对同一内容已存在未读 like 通知时，不再重复插入
  if (type === 'like') {
    const dup = list.some(
      (n) => n.type === 'like' && n.wishId === wishId && n.fromUserId === fromUserId && !n.read
    );
    if (dup) return;
  }

  list.unshift({
    id: genId('n'),
    userId,
    type,
    wishId,
    wishType: wishType || 'blessing',
    fromUserId,
    fromName,
    excerpt: (excerpt || '').slice(0, 30),
    read: false,
    createdAt: now(),
  });
  save('notifications', list);
}
