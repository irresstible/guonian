/**
 * @file 相册路由
 * @description 图片可公开浏览；登录后可上传 data URL 图片，仅上传者本人可删除
 */
import { Router } from 'express';
import { load, save } from '../store.js';
import { authRequired, optionalAuth } from '../auth.js';
import { genId, now } from '../util.js';

const router = Router();

/**
 * GET /api/album 获取相册图片列表（匿名可访问）
 * 查询参数：无，结果按上传时间倒序返回
 * 副作用：无
 */
router.get('/', optionalAuth, (req, res) => {
  const list = load('album');
  // id 含时间戳，按 id 字符串倒序即按上传时间倒序
  list.sort((a, b) => b.id.localeCompare(a.id));
  res.json({ code: 200, data: list });
});

/**
 * POST /api/album 上传相册图片（需登录）
 * 请求体：src（必须为 data:image/ 开头的 data URL）、name（可选，缺省取用户昵称/用户名）
 * 副作用：校验通过后写入 album 集合
 */
router.post('/', authRequired, (req, res) => {
  const { src, name } = req.body || {};
  if (!src || !src.startsWith('data:image/')) {
    return res.json({ code: 400, msg: '图片格式非法' });
  }
  // base64 编码体积约为原始二进制的 1.37 倍，2MB 原图对应的 data URL 字符串上限约为 2.74MB
  if (src.length > 2 * 1024 * 1024 * 1.37) {
    return res.json({ code: 400, msg: '图片过大,请压缩后上传' });
  }

  const item = {
    id: genId('a'),
    src,
    name: String(name || req.user.nickname || req.user.username || '匿名'),
    authorId: req.userId,
    createdAt: now(),
  };
  const list = load('album');
  list.push(item);
  save('album', list);
  res.json({ code: 200, data: item });
});

/**
 * DELETE /api/album/:id 删除相册图片（需登录）
 * 请求体：无；权限：仅上传者本人
 * 副作用：从 album 集合中移除目标图片
 */
router.delete('/:id', authRequired, (req, res) => {
  const list = load('album');
  const item = list.find((a) => a.id === req.params.id);
  if (!item) return res.json({ code: 404, msg: '图片不存在或已删除' });
  if (item.authorId !== req.userId) return res.json({ code: 403, msg: '只能删除自己上传的图片' });

  save('album', list.filter((a) => a.id !== item.id));
  res.json({ code: 200, msg: '已删除' });
});

export default router;
