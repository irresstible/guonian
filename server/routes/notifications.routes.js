/**
 * @file 通知路由
 * @description 路由器整体挂载 authRequired，以下所有接口均需登录
 */
import { Router } from 'express';
import { load, save } from '../store.js';
import { authRequired } from '../auth.js';

const router = Router();
router.use(authRequired); // 统一登录校验，后续接口不再单独挂载该中间件

/**
 * GET /api/notifications 获取当前用户的通知列表（需登录）
 * 查询参数：无；通知写入时即采用头插法，存储本身已按时间倒序
 * 副作用：无，最多返回最近 100 条
 */
router.get('/', (req, res) => {
  const list = load('notifications')
    .filter((n) => n.userId === req.userId)
    .slice(0, 100);
  res.json({ code: 200, data: list });
});

/**
 * GET /api/notifications/unread-count 获取当前用户未读通知数（需登录）
 * 副作用：无
 */
router.get('/unread-count', (req, res) => {
  const count = load('notifications').filter((n) => n.userId === req.userId && !n.read).length;
  res.json({ code: 200, data: { count } });
});

/**
 * POST /api/notifications/read 标记通知已读（需登录）
 * 请求体：ids（通知 id 数组，批量标记指定项）或 all（true 表示全部标记已读），二选一
 * 副作用：只更新属于当前用户的通知，返回标记后剩余的未读数
 */
router.post('/read', (req, res) => {
  const { ids, all } = req.body || {};
  const list = load('notifications');
  const idSet = Array.isArray(ids) ? new Set(ids) : null;
  for (const n of list) {
    if (n.userId !== req.userId) continue; // 只允许标记自己的通知，防止越权
    if (all || (idSet && idSet.has(n.id))) n.read = true;
  }
  save('notifications', list);
  const count = list.filter((n) => n.userId === req.userId && !n.read).length;
  res.json({ code: 200, data: { count } });
});

export default router;
