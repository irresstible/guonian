/**
 * @file 通用工具函数
 * @description 提供 id 生成、时间格式化、用户信息脱敏与祝福记录序列化
 */
import { randomBytes } from 'node:crypto';

/** 中国大陆手机号正则 */
export const PHONE_REGEX = /^1[3-9]\d{9}$/;

// 进程内自增序号，参与 id 组成以降低同毫秒内的碰撞概率
let seq = 0;

/**
 * 生成带前缀的唯一 id（时间戳 + 随机字节 + 自增序号）
 * @param {string} prefix - id 业务前缀，如 u/w/c/n/a
 * @returns {string} 唯一 id
 */
export function genId(prefix) {
  seq = (seq + 1) % 1000;
  return `${prefix}_${Date.now().toString(36)}${randomBytes(3).toString('hex')}${seq}`;
}

/**
 * 返回当前时间的 YYYY-MM-DD HH:mm:ss 字符串（前端按字符串直接展示）
 * @returns {string} 格式化后的本地时间
 */
export function now() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * 剔除密码哈希等敏感字段，返回可对外公开的用户信息
 * @param {object|null} u - 用户原始记录
 * @returns {object|null} 脱敏后的用户对象；入参为空时返回 null
 */
export function publicUser(u) {
  if (!u) return null;
  const rest = { ...u };
  delete rest.passwordHash;
  return rest;
}

/**
 * 序列化祝福记录：补全作者与评论者的展示信息，并计算当前用户是否已点赞
 * @param {object} w - wish 原始记录
 * @param {Array} users - 全部用户记录，用于按 id 查找展示信息
 * @param {string|null} currentUserId - 当前登录用户 id，匿名为 null
 * @returns {object} 供前端展示的祝福对象
 */
export function serializeWish(w, users, currentUserId) {
  const byId = new Map(users.map((u) => [u.id, u]));
  const author = byId.get(w.authorId);
  return {
    id: w.id,
    type: w.type,
    content: w.content,
    createdAt: w.createdAt,
    author: {
      id: w.authorId,
      // 作者已注销时使用兜底昵称与空头像
      name: author ? author.nickname || author.username : '已注销用户',
      avatar: author ? author.avatar || '' : '',
    },
    likeCount: w.likes.length,
    likedByMe: currentUserId ? w.likes.includes(currentUserId) : false,
    comments: w.comments.map((c) => {
      const cu = byId.get(c.authorId);
      return {
        id: c.id,
        authorId: c.authorId,
        // 评论者已注销时同样使用兜底展示
        authorName: cu ? cu.nickname || cu.username : '已注销用户',
        authorAvatar: cu ? cu.avatar || '' : '',
        content: c.content,
        createdAt: c.createdAt,
      };
    }),
  };
}
