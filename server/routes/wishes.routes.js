/**
 * @file 祝福/许愿内容路由
 * @description 提供列表筛选、发布、点赞、评论与删除；点赞和评论会向内容作者写入通知
 */
import { Router } from 'express';
import { load, save } from '../store.js';
import { authRequired, optionalAuth } from '../auth.js';
import { genId, now, serializeWish } from '../util.js';
import { createNotification } from '../notify.js';

const router = Router();

// 合法的内容类型
const TYPES = ['blessing', 'wish'];

/**
 * GET /api/wishes 获取祝福/许愿列表（匿名可访问，登录时返回 likedByMe）
 * 查询参数：type 按类型筛选（blessing|wish）、keyword 按内容关键词模糊匹配
 * 副作用：无，结果按发布时间倒序返回
 */
router.get('/', optionalAuth, (req, res) => {
  const { type, keyword } = req.query;
  const users = load('users');
  let list = load('wishes');
  if (type && TYPES.includes(type)) list = list.filter((w) => w.type === type);
  if (keyword) {
    const kw = String(keyword).toLowerCase();
    list = list.filter((w) => w.content.toLowerCase().includes(kw));
  }
  // id 含时间戳，按 id 字符串倒序即按发布时间倒序，且排序结果稳定
  list = [...list].sort((a, b) => b.id.localeCompare(a.id));
  res.json({ code: 200, data: list.map((w) => serializeWish(w, users, req.userId || null)) });
});

/**
 * POST /api/wishes 发布祝福或许愿（需登录）
 * 请求体：type（blessing|wish）、content（去空白后 1-200 字）
 * 副作用：写入 wishes 集合并返回序列化后的新记录
 */
router.post('/', authRequired, (req, res) => {
  const { type, content } = req.body || {};
  if (!TYPES.includes(type)) return res.json({ code: 400, msg: '类型非法' });
  const text = String(content || '').trim();
  if (!text) return res.json({ code: 400, msg: '内容不能为空' });
  if (text.length > 200) return res.json({ code: 400, msg: '内容不能超过200字' });

  const wish = {
    id: genId('w'),
    type,
    content: text,
    authorId: req.userId,
    createdAt: now(),
    likes: [],
    comments: [],
  };
  const wishes = load('wishes');
  wishes.push(wish);
  save('wishes', wishes);
  res.json({ code: 200, data: serializeWish(wish, load('users'), req.userId) });
});

/**
 * POST /api/wishes/:id/like 切换点赞状态（需登录）
 * 请求体：无
 * 副作用：未点赞则点赞并向作者写入 like 通知（自己给自己点赞时，通知流中同样可见）；已点赞则取消且不写通知
 */
router.post('/:id/like', authRequired, (req, res) => {
  const wishes = load('wishes');
  const wish = wishes.find((w) => w.id === req.params.id);
  if (!wish) return res.json({ code: 404, msg: '内容不存在或已删除' });

  const idx = wish.likes.indexOf(req.userId);
  let liked;
  if (idx >= 0) {
    wish.likes.splice(idx, 1);
    liked = false;
  } else {
    wish.likes.push(req.userId);
    liked = true;
    // 不排除作者本人：自己给自己点赞时，通知流里同样可见
    createNotification({
      userId: wish.authorId,
      type: 'like',
      wishId: wish.id,
      wishType: wish.type,
      fromUserId: req.userId,
      fromName: req.user.nickname || req.user.username,
      excerpt: wish.content,
    });
  }
  save('wishes', wishes);
  res.json({ code: 200, data: { liked, likeCount: wish.likes.length } });
});

/**
 * POST /api/wishes/:id/comments 发表评论（需登录）
 * 请求体：content（去空白后 1-100 字）
 * 副作用：评论追加到目标内容，并向作者写入 comment 通知（自己评论自己的内容时，通知流中同样可见）
 */
router.post('/:id/comments', authRequired, (req, res) => {
  const text = String((req.body || {}).content || '').trim();
  if (!text) return res.json({ code: 400, msg: '评论不能为空' });
  if (text.length > 100) return res.json({ code: 400, msg: '评论不能超过100字' });

  const wishes = load('wishes');
  const wish = wishes.find((w) => w.id === req.params.id);
  if (!wish) return res.json({ code: 404, msg: '内容不存在或已删除' });

  const comment = { id: genId('c'), authorId: req.userId, content: text, createdAt: now() };
  wish.comments.push(comment);
  save('wishes', wishes);

  // 不排除作者本人：自己评论自己的内容时，通知流里同样可见
  createNotification({
    userId: wish.authorId,
    type: 'comment',
    wishId: wish.id,
    wishType: wish.type,
    fromUserId: req.userId,
    fromName: req.user.nickname || req.user.username,
    excerpt: wish.content,
  });

  const users = load('users');
  const full = serializeWish(wish, users, req.userId);
  const cv = full.comments.find((c) => c.id === comment.id);
  res.json({ code: 200, data: cv });
});

/**
 * DELETE /api/wishes/:id/comments/:commentId 删除评论（需登录）
 * 请求体：无；权限：评论作者本人或内容作者（楼主）均可删除
 * 副作用：从目标内容的评论列表中移除该评论
 */
router.delete('/:id/comments/:commentId', authRequired, (req, res) => {
  const wishes = load('wishes');
  const wish = wishes.find((w) => w.id === req.params.id);
  if (!wish) return res.json({ code: 404, msg: '内容不存在或已删除' });

  const idx = wish.comments.findIndex((c) => c.id === req.params.commentId);
  if (idx < 0) return res.json({ code: 404, msg: '评论不存在或已删除' });

  const comment = wish.comments[idx];
  if (comment.authorId !== req.userId && wish.authorId !== req.userId) {
    return res.json({ code: 403, msg: '只能删除自己的评论' });
  }

  wish.comments.splice(idx, 1);
  save('wishes', wishes);
  res.json({ code: 200, msg: '已删除' });
});

/**
 * DELETE /api/wishes/:id 删除祝福或许愿（需登录）
 * 请求体：无；权限：仅内容作者本人
 * 副作用：删除目标内容，并级联删除该内容关联的全部通知
 */
router.delete('/:id', authRequired, (req, res) => {
  const wishes = load('wishes');
  const wish = wishes.find((w) => w.id === req.params.id);
  if (!wish) return res.json({ code: 404, msg: '内容不存在或已删除' });
  if (wish.authorId !== req.userId) return res.json({ code: 403, msg: '只能删除自己的内容' });

  save('wishes', wishes.filter((w) => w.id !== wish.id));
  save('notifications', load('notifications').filter((n) => n.wishId !== wish.id));
  res.json({ code: 200, msg: '已删除' });
});

export default router;
