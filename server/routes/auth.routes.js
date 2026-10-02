/**
 * @file 认证与账户相关路由
 * @description 包含登录、注册、验证码、重置密码、个人资料与注销；验证码仅保存在内存中，服务重启即失效
 */
import { Router } from 'express';
import { load, save } from '../store.js';
import { hashPassword, verifyPassword, issueToken, authRequired } from '../auth.js';
import { genId, now, PHONE_REGEX, publicUser } from '../util.js';
import { CODE_TTL } from '../config.js';

const router = Router();

// 内存验证码表：phone -> { code, expires }，服务重启后全部失效
const codes = new Map();

/**
 * POST /api/login 用户登录（无需登录）
 * 请求体：username 用户名、password 密码
 * 副作用：仅校验并签发 token，不写存储
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.json({ code: 400, msg: '用户名和密码不能为空' });
  const user = load('users').find((u) => u.username === username);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.json({ code: 400, msg: '用户名或密码错误' });
  }
  res.json({ code: 200, token: issueToken(user.id), username: user.username });
});

/**
 * POST /api/register 注册新用户（无需登录）
 * 请求体：username（2-16 位）、password（≥6 位）、phone、verifyCode
 * 副作用：校验验证码及用户名/手机号唯一性后创建用户，成功后验证码立即作废
 */
router.post('/register', (req, res) => {
  const { username, password, phone, verifyCode } = req.body || {};
  if (!username || username.length < 2 || username.length > 16) {
    return res.json({ code: 400, msg: '用户名必须是2-16位字符' });
  }
  if (!password || password.length < 6) return res.json({ code: 400, msg: '密码不能少于6位' });
  if (!PHONE_REGEX.test(phone || '')) return res.json({ code: 400, msg: '手机号格式不正确' });
  if (!verifyCode) return res.json({ code: 400, msg: '请输入验证码' });

  const rec = codes.get(phone);
  if (!rec || rec.expires < Date.now() || rec.code !== verifyCode) {
    return res.json({ code: 400, msg: '验证码错误或已过期' });
  }

  const users = load('users');
  if (users.some((u) => u.username === username)) {
    return res.json({ code: 400, msg: '用户名已存在' });
  }
  if (users.some((u) => u.phone === phone)) {
    return res.json({ code: 400, msg: '该手机号已注册' });
  }

  users.push({
    id: genId('u'),
    username,
    passwordHash: hashPassword(password),
    phone,
    nickname: '',
    avatar: '',
    gender: 'secret',
    bio: '',
    createdAt: now(),
  });
  save('users', users);
  codes.delete(phone);
  res.json({ code: 200, msg: '注册成功' });
});

/**
 * POST /api/sendCode 发送短信验证码（无需登录）
 * 请求体：phone
 * 副作用：生成 6 位验证码存入内存（5 分钟有效）；演示环境打印到后端窗口并通过 devCode 原样返回
 */
router.post('/sendCode', (req, res) => {
  const { phone } = req.body || {};
  if (!PHONE_REGEX.test(phone || '')) return res.json({ code: 400, msg: '手机号格式不正确' });
  const code = String(Math.floor(100000 + Math.random() * 900000));
  codes.set(phone, { code, expires: Date.now() + CODE_TTL });
  // 演示环境无真实短信通道：打印到后端运行窗口，并在响应中通过 devCode 返回方便前端联调
  console.log(`[验证码] 手机号 ${phone} 的验证码是:${code}(5分钟内有效)`);
  res.json({ code: 200, msg: '验证码已发送', devCode: code });
});

/**
 * POST /api/resetPassword 通过手机验证码重置密码（无需登录）
 * 请求体：phone、verifyCode、newPassword（≥6 位）
 * 副作用：重置对应用户密码，成功后验证码立即作废
 */
router.post('/resetPassword', (req, res) => {
  const { phone, verifyCode, newPassword } = req.body || {};
  if (!PHONE_REGEX.test(phone || '')) return res.json({ code: 400, msg: '手机号格式不正确' });
  if (!verifyCode) return res.json({ code: 400, msg: '请输入验证码' });
  if (!newPassword || newPassword.length < 6) return res.json({ code: 400, msg: '新密码不能少于6位' });

  const rec = codes.get(phone);
  if (!rec || rec.expires < Date.now() || rec.code !== verifyCode) {
    return res.json({ code: 400, msg: '验证码错误或已过期' });
  }

  const users = load('users');
  const user = users.find((u) => u.phone === phone);
  if (!user) return res.json({ code: 400, msg: '该手机号未注册' });

  user.passwordHash = hashPassword(newPassword);
  save('users', users);
  codes.delete(phone);
  res.json({ code: 200, msg: '密码重置成功' });
});

/**
 * GET /api/profile 获取当前登录用户资料（需登录）
 * 副作用：无，返回脱敏后的用户信息
 */
router.get('/profile', authRequired, (req, res) => {
  res.json({ code: 200, data: publicUser(req.user) });
});

/**
 * PUT /api/profile 更新当前登录用户资料（需登录）
 * 请求体：nickname（≤16 字）、gender（male/female/secret）、bio（≤100 字）、avatar，均可选，仅更新传入字段
 * 副作用：写入 users 集合；avatar 传空字符串 '' 表示移除头像
 */
router.put('/profile', authRequired, (req, res) => {
  const { nickname, gender, bio, avatar } = req.body || {};
  if (nickname && nickname.length > 16) return res.json({ code: 400, msg: '昵称不能超过16个字符' });
  if (bio && bio.length > 100) return res.json({ code: 400, msg: '个人简介不能超过100个字符' });
  if (gender && !['male', 'female', 'secret'].includes(gender)) {
    return res.json({ code: 400, msg: '性别取值非法' });
  }

  const users = load('users');
  const user = users.find((u) => u.id === req.userId);
  if (!user) return res.status(401).json({ code: 401, msg: '账号不存在' });

  if (nickname !== undefined) user.nickname = String(nickname).trim();
  if (gender !== undefined) user.gender = gender;
  if (bio !== undefined) user.bio = String(bio).trim();
  if (avatar !== undefined) user.avatar = avatar; // '' 表示移除头像
  save('users', users);
  res.json({ code: 200, data: publicUser(user) });
});

/**
 * DELETE /api/account 注销当前账号（需登录）
 * 请求体：无
 * 副作用：级联删除用户本人、其发布的祝福、其在他人祝福下的点赞与评论，以及相关通知
 */
router.delete('/account', authRequired, (req, res) => {
  const uid = req.userId;

  // 1. 删除用户记录
  save('users', load('users').filter((u) => u.id !== uid));

  // 2. 删除其发布的祝福；他人祝福下移除该用户的点赞与评论
  const wishes = load('wishes');
  const kept = [];
  const removedWishIds = new Set();
  for (const w of wishes) {
    if (w.authorId === uid) {
      removedWishIds.add(w.id);
      continue;
    }
    w.likes = w.likes.filter((id) => id !== uid);
    w.comments = w.comments.filter((c) => c.authorId !== uid);
    kept.push(w);
  }
  save('wishes', kept);

  // 3. 清理通知：被删祝福相关的、由该用户触发的、发给该用户的
  save(
    'notifications',
    load('notifications').filter(
      (n) => !removedWishIds.has(n.wishId) && n.fromUserId !== uid && n.userId !== uid
    )
  );

  res.json({ code: 200, msg: '账号已注销' });
});

export default router;
