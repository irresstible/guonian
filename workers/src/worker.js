/**
 * @file 「一起过新年」Cloudflare Worker 服务入口
 * @description /api/* 请求由 D1 数据库支撑（用户、祝福/许愿、通知、相册、验证码），
 *              其余路径交由 ASSETS 绑定返回 Vite 构建的静态产物（SPA 回退 index.html）。
 *              运行需开启 nodejs_compat；依赖环境绑定：env.DB（D1 数据库）、
 *              env.ASSETS（静态资源）、env.TOKEN_SECRET（HMAC 令牌密钥）。
 */
import { scryptSync, randomBytes, createHmac, timingSafeEqual } from 'node:crypto';

const TOKEN_TTL = 7 * 24 * 60 * 60 * 1000; // 登录令牌有效期：7 天
const CODE_TTL = 5 * 60 * 1000; // 短信验证码有效期：5 分钟
const PHONE_REGEX = /^1[3-9]\d{9}$/; // 中国大陆手机号
const WISH_TYPES = ['blessing', 'wish']; // 内容类型：blessing 祝福、wish 许愿

// ====== 通用工具 ======

/**
 * 构造统一格式的 JSON 响应
 * @param {*} data - 响应体数据
 * @param {number} [status=200] - HTTP 状态码
 * @returns {Response} JSON 响应对象
 */
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

// 单实例内自增序号，配合时间戳与随机字节降低 ID 碰撞概率
let seq = 0;

/**
 * 生成带业务前缀的唯一 ID（时间戳 + 随机字节 + 自增序号）
 * @param {string} prefix - ID 前缀，如 u 用户、w 祝福、c 评论、n 通知、a 相册
 * @returns {string} 唯一 ID
 */
function genId(prefix) {
  seq = (seq + 1) % 1000;
  return `${prefix}_${Date.now().toString(36)}${randomBytes(3).toString('hex')}${seq}`;
}

/**
 * 生成本地时区的时间字符串
 * @returns {string} 格式为 YYYY-MM-DD HH:mm:ss
 */
function now() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * 返回剔除密码哈希字段后的用户对象
 * @param {Object} u - 用户记录
 * @returns {Object|null} 脱敏后的用户对象；入参为空时返回 null
 */
function publicUser(u) {
  if (!u) return null;
  const rest = { ...u };
  delete rest.passwordHash;
  return rest;
}

/**
 * 将祝福/许愿记录序列化为前端所需结构（作者信息、点赞数、当前用户点赞态、评论列表）
 * @param {Object} w - 祝福记录，likes/comments 须为已解析的数组
 * @param {Array<Object>} users - 全量用户列表，用于补全作者昵称与头像
 * @param {string|null} currentUserId - 当前登录用户 ID，未登录为 null（仅影响 likedByMe）
 * @returns {Object} 序列化后的祝福/许愿对象
 */
function serializeWish(w, users, currentUserId) {
  const byId = new Map(users.map((u) => [u.id, u]));
  const author = byId.get(w.authorId);
  return {
    id: w.id,
    type: w.type,
    content: w.content,
    createdAt: w.createdAt,
    author: {
      id: w.authorId,
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
        authorName: cu ? cu.nickname || cu.username : '已注销用户',
        authorAvatar: cu ? cu.avatar || '' : '',
        content: c.content,
        createdAt: c.createdAt,
      };
    }),
  };
}

// ====== 密码哈希 ======
// scrypt 算法，存储格式 salt:hash，与 Express 本地后端完全一致，可互通校验

/**
 * 对明文密码生成带随机盐的 scrypt 哈希
 * @param {string} password - 明文密码
 * @returns {string} 格式为 salt:hash 的存储串
 */
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * 以恒定时间比较方式校验明文密码与存储哈希是否匹配
 * @param {string} password - 待校验的明文密码
 * @param {string} stored - 存储的 salt:hash 串
 * @returns {boolean} 校验通过返回 true；格式非法或不匹配返回 false
 */
function verifyPassword(password, stored) {
  const [salt, hash] = (stored || '').split(':');
  if (!salt || !hash) return false;
  const calc = scryptSync(password, salt, 64);
  const expect = Buffer.from(hash, 'hex');
  return calc.length === expect.length && timingSafeEqual(calc, expect);
}

// ====== 登录令牌 ======
// HMAC 签名令牌，格式：base64url(userId).过期时间戳.签名

/**
 * 将字节数据编码为 base64url 字符串
 * @param {Buffer} buf - 字节数据
 * @returns {string} base64url 字符串
 */
const b64u = (buf) => Buffer.from(buf).toString('base64url');

/**
 * 使用 HMAC-SHA256 对载荷签名
 * @param {string} payload - 待签名载荷
 * @param {string} secret - 签名密钥（env.TOKEN_SECRET）
 * @returns {string} base64url 编码的签名
 */
function sign(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/**
 * 为用户签发登录令牌
 * @param {string} userId - 用户 ID
 * @param {string} secret - 签名密钥（env.TOKEN_SECRET）
 * @returns {string} 登录令牌
 */
function issueToken(userId, secret) {
  const exp = Date.now() + TOKEN_TTL;
  const payload = `${b64u(userId)}.${exp}`;
  return `${payload}.${sign(payload, secret)}`;
}

/**
 * 校验登录令牌的签名与有效期
 * @param {string} token - 登录令牌
 * @param {string} secret - 签名密钥（env.TOKEN_SECRET）
 * @returns {string|null} 合法且未过期返回用户 ID，否则返回 null
 */
function verifyToken(token, secret) {
  const parts = (token || '').split('.');
  if (parts.length !== 3) return null;
  const [u, exp, sig] = parts;
  const payload = `${u}.${exp}`;
  const expect = sign(payload, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now()) return null;
  return Buffer.from(u, 'base64url').toString('utf8');
}

// ====== 数据库访问 ======

/**
 * 查询全部用户
 * @param {Object} env - Worker 环境绑定
 * @returns {Promise<Array<Object>>} 用户记录数组
 */
const allUsers = (env) => env.DB.prepare('SELECT * FROM users').all().then((r) => r.results);

/**
 * 按指定字段精确查找单个用户（字段名为代码内常量，不接受外部传入）
 * @param {Object} env - Worker 环境绑定
 * @param {'id'|'username'|'phone'} field - 查询字段
 * @param {string} value - 字段值
 * @returns {Promise<Object|null>} 用户记录，不存在返回 null
 */
const findUser = (env, field, value) =>
  env.DB.prepare(`SELECT * FROM users WHERE ${field} = ?`).bind(value).first();

/**
 * 将 D1 行中的点赞、评论 JSON 文本解析为数组
 * @param {Object} row - wishes 表原始行
 * @returns {Object} 含 likes、comments 数组的祝福记录
 */
function parseWish(row) {
  return { ...row, likes: JSON.parse(row.likes), comments: JSON.parse(row.comments) };
}

// ====== 鉴权 ======

/**
 * 从请求的 Bearer 令牌中解析当前用户（可选鉴权，不拦截请求）
 * @param {Request} request - 原始请求
 * @param {Object} env - Worker 环境绑定
 * @returns {Promise<{userId: string|null, user: Object|null}>} 解析结果；未登录或令牌无效时两字段均为 null
 */
async function extractUser(request, env) {
  const h = request.headers.get('Authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  const userId = verifyToken(token, env.TOKEN_SECRET);
  if (!userId) return { userId: null, user: null };
  const user = await findUser(env, 'id', userId);
  return user ? { userId, user } : { userId: null, user: null };
}

// ====== 通知 ======

/**
 * 写入一条通知；点赞通知按「同一用户对同一内容的未读点赞」去重
 * @param {Object} env - Worker 环境绑定
 * @param {Object} params - 通知内容
 * @param {string} params.userId - 接收者用户 ID（外键语义 → users.id）
 * @param {'like'|'comment'} params.type - 通知类型
 * @param {string} params.wishId - 关联的祝福/许愿 ID（外键语义 → wishes.id）
 * @param {string} [params.wishType] - 关联内容类型，缺省 blessing
 * @param {string} params.fromUserId - 触发者用户 ID（外键语义 → users.id，可能与接收者相同）
 * @param {string} params.fromName - 触发者昵称快照
 * @param {string} [params.excerpt] - 内容摘要，入库时截断为前 30 字
 * @returns {Promise<void>}
 */
async function createNotification(env, { userId, type, wishId, wishType, fromUserId, fromName, excerpt }) {
  if (type === 'like') {
    const dup = await env.DB.prepare(
      "SELECT id FROM notifications WHERE type = 'like' AND wishId = ? AND fromUserId = ? AND read = 0"
    )
      .bind(wishId, fromUserId)
      .first();
    if (dup) return;
  }
  await env.DB.prepare(
    'INSERT INTO notifications (id, userId, type, wishId, wishType, fromUserId, fromName, excerpt, read, createdAt) VALUES (?,?,?,?,?,?,?,?,0,?)'
  )
    .bind(genId('n'), userId, type, wishId, wishType || 'blessing', fromUserId, fromName, (excerpt || '').slice(0, 30), now())
    .run();
}

// ====== API 路由处理 ======

/**
 * 处理全部 /api/* 请求，按方法与路径分发到各业务分支
 * @param {Request} request - 原始请求
 * @param {Object} env - Worker 环境绑定
 * @returns {Promise<Response>} 对应接口的 JSON 响应，未匹配返回 404
 */
async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  /**
   * 解析请求体 JSON
   * @returns {Promise<Object>} 请求体对象；无请求体或解析失败时返回空对象
   */
  const body = async () => {
    try {
      return await request.json();
    } catch {
      return {};
    }
  };

  /**
   * GET /api/health 健康检查
   * 是否登录：否
   * 请求体：无
   * 权限规则：公开
   */
  if (path === '/api/health') return json({ code: 200, msg: 'ok' });

  /**
   * POST /api/login 用户登录
   * 是否登录：否
   * 请求体：{ username: string, password: string }
   * 权限规则：公开；校验用户名与密码通过后签发 HMAC 令牌
   */
  if (method === 'POST' && path === '/api/login') {
    const { username, password } = await body();
    if (!username || !password) return json({ code: 400, msg: '用户名和密码不能为空' });
    const user = await findUser(env, 'username', username);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return json({ code: 400, msg: '用户名或密码错误' });
    }
    return json({ code: 200, token: issueToken(user.id, env.TOKEN_SECRET), username: user.username });
  }

  /**
   * POST /api/register 用户注册
   * 是否登录：否
   * 请求体：{ username: string, password: string, phone: string, verifyCode: string }
   * 权限规则：公开；须通过短信验证码校验，且用户名、手机号均未被注册
   */
  if (method === 'POST' && path === '/api/register') {
    const { username, password, phone, verifyCode } = await body();
    if (!username || username.length < 2 || username.length > 16) {
      return json({ code: 400, msg: '用户名必须是2-16位字符' });
    }
    if (!password || password.length < 6) return json({ code: 400, msg: '密码不能少于6位' });
    if (!PHONE_REGEX.test(phone || '')) return json({ code: 400, msg: '手机号格式不正确' });
    if (!verifyCode) return json({ code: 400, msg: '请输入验证码' });

    const rec = await env.DB.prepare('SELECT code, expires FROM verify_codes WHERE phone = ?').bind(phone).first();
    if (!rec || rec.expires < Date.now() || rec.code !== verifyCode) {
      return json({ code: 400, msg: '验证码错误或已过期' });
    }
    if (await findUser(env, 'username', username)) return json({ code: 400, msg: '用户名已存在' });
    if (await findUser(env, 'phone', phone)) return json({ code: 400, msg: '该手机号已注册' });

    await env.DB.prepare(
      'INSERT INTO users (id, username, passwordHash, phone, nickname, avatar, gender, bio, createdAt) VALUES (?,?,?,?,?,?,?,?,?)'
    )
      .bind(genId('u'), username, hashPassword(password), phone, '', '', 'secret', '', now())
      .run();
    await env.DB.prepare('DELETE FROM verify_codes WHERE phone = ?').bind(phone).run();
    return json({ code: 200, msg: '注册成功' });
  }

  /**
   * POST /api/sendCode 发送短信验证码
   * 是否登录：否
   * 请求体：{ phone: string }
   * 权限规则：公开；同一手机号再次发送会覆盖旧验证码。
   *           演示环境无短信通道，验证码经 console 打印并通过 devCode 字段直接回显，生产应接入短信服务
   */
  if (method === 'POST' && path === '/api/sendCode') {
    const { phone } = await body();
    if (!PHONE_REGEX.test(phone || '')) return json({ code: 400, msg: '手机号格式不正确' });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await env.DB.prepare(
      'INSERT INTO verify_codes (phone, code, expires) VALUES (?,?,?) ON CONFLICT(phone) DO UPDATE SET code = excluded.code, expires = excluded.expires'
    )
      .bind(phone, code, Date.now() + CODE_TTL)
      .run();
    console.log(`[验证码] 手机号 ${phone} 的验证码是:${code}(5分钟内有效)`);
    return json({ code: 200, msg: '验证码已发送', devCode: code });
  }

  /**
   * POST /api/resetPassword 重置密码
   * 是否登录：否
   * 请求体：{ phone: string, verifyCode: string, newPassword: string }
   * 权限规则：公开；须通过短信验证码校验，且手机号已注册
   */
  if (method === 'POST' && path === '/api/resetPassword') {
    const { phone, verifyCode, newPassword } = await body();
    if (!PHONE_REGEX.test(phone || '')) return json({ code: 400, msg: '手机号格式不正确' });
    if (!verifyCode) return json({ code: 400, msg: '请输入验证码' });
    if (!newPassword || newPassword.length < 6) return json({ code: 400, msg: '新密码不能少于6位' });

    const rec = await env.DB.prepare('SELECT code, expires FROM verify_codes WHERE phone = ?').bind(phone).first();
    if (!rec || rec.expires < Date.now() || rec.code !== verifyCode) {
      return json({ code: 400, msg: '验证码错误或已过期' });
    }
    const user = await findUser(env, 'phone', phone);
    if (!user) return json({ code: 400, msg: '该手机号未注册' });

    await env.DB.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').bind(hashPassword(newPassword), user.id).run();
    await env.DB.prepare('DELETE FROM verify_codes WHERE phone = ?').bind(phone).run();
    return json({ code: 200, msg: '密码重置成功' });
  }

  /**
   * GET /api/wishes 祝福/许愿列表
   * 是否登录：否（可选登录，登录后返回每条内容的 likedByMe 状态）
   * 请求体：无；查询参数 type（可选，blessing/wish）、keyword（可选，对内容做大小写不敏感匹配）
   * 权限规则：公开，按 ID 倒序返回
   */
  if (method === 'GET' && path === '/api/wishes') {
    const { userId } = await extractUser(request, env);
    const type = url.searchParams.get('type');
    const keyword = (url.searchParams.get('keyword') || '').toLowerCase();
    const rows = (await env.DB.prepare('SELECT * FROM wishes').all()).results.map(parseWish);
    let list = rows;
    if (type && WISH_TYPES.includes(type)) list = list.filter((w) => w.type === type);
    if (keyword) list = list.filter((w) => w.content.toLowerCase().includes(keyword));
    list.sort((a, b) => b.id.localeCompare(a.id));
    const users = await allUsers(env);
    return json({ code: 200, data: list.map((w) => serializeWish(w, users, userId)) });
  }

  /**
   * GET /api/album 相册列表
   * 是否登录：否
   * 请求体：无
   * 权限规则：公开，按 ID 倒序返回
   */
  if (method === 'GET' && path === '/api/album') {
    const rows = (await env.DB.prepare('SELECT * FROM album').all()).results;
    rows.sort((a, b) => b.id.localeCompare(a.id));
    return json({ code: 200, data: rows });
  }

  /**
   * GET /api/notifications/unread-count 通知未读数
   * 是否登录：是
   * 请求体：无
   * 权限规则：仅统计当前登录用户自己的未读通知
   */
  if (method === 'GET' && path === '/api/notifications/unread-count') {
    const auth = await requireAuth(request, env);
    if (auth.res) return auth.res;
    const row = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM notifications WHERE userId = ? AND read = 0'
    )
      .bind(auth.userId)
      .first();
    return json({ code: 200, data: { count: row.count } });
  }

  /**
   * GET /api/notifications 通知列表
   * 是否登录：是
   * 请求体：无
   * 权限规则：仅返回当前登录用户自己的通知，按时间倒序最多 100 条
   */
  if (method === 'GET' && path === '/api/notifications') {
    const auth = await requireAuth(request, env);
    if (auth.res) return auth.res;
    const rows = (
      await env.DB.prepare(
        'SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC, id DESC LIMIT 100'
      )
        .bind(auth.userId)
        .all()
    ).results;
    return json({ code: 200, data: rows.map((n) => ({ ...n, read: !!n.read })) });
  }

  /**
   * POST /api/notifications/read 标记通知已读
   * 是否登录：是
   * 请求体：{ ids?: string[], all?: boolean }；all 为真时全部已读，否则按 ids 批量已读
   * 权限规则：仅能标记属于当前登录用户自己的通知，响应返回最新未读数
   */
  if (method === 'POST' && path === '/api/notifications/read') {
    const auth = await requireAuth(request, env);
    if (auth.res) return auth.res;
    const { ids, all } = await body();
    if (all) {
      await env.DB.prepare('UPDATE notifications SET read = 1 WHERE userId = ?').bind(auth.userId).run();
    } else if (Array.isArray(ids) && ids.length) {
      const stmts = ids.map((id) =>
        env.DB.prepare('UPDATE notifications SET read = 1 WHERE userId = ? AND id = ?').bind(auth.userId, id)
      );
      await env.DB.batch(stmts);
    }
    const row = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM notifications WHERE userId = ? AND read = 0'
    )
      .bind(auth.userId)
      .first();
    return json({ code: 200, data: { count: row.count } });
  }

  /**
   * GET /api/profile 获取个人资料
   * 是否登录：是
   * 请求体：无
   * 权限规则：仅返回当前登录用户本人的资料（不含密码哈希）
   */
  if (path === '/api/profile' && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (auth.res) return auth.res;
    return json({ code: 200, data: publicUser(auth.user) });
  }

  /**
   * PUT /api/profile 修改个人资料
   * 是否登录：是
   * 请求体：{ nickname?: string, gender?: 'male'|'female'|'secret', bio?: string, avatar?: string }，均为可选
   * 权限规则：仅能修改当前登录用户本人的资料；昵称限 16 字、简介限 100 字
   */
  if (path === '/api/profile' && method === 'PUT') {
    const auth = await requireAuth(request, env);
    if (auth.res) return auth.res;
    const { nickname, gender, bio, avatar } = await body();
    if (nickname && nickname.length > 16) return json({ code: 400, msg: '昵称不能超过16个字符' });
    if (bio && bio.length > 100) return json({ code: 400, msg: '个人简介不能超过100个字符' });
    if (gender && !['male', 'female', 'secret'].includes(gender)) return json({ code: 400, msg: '性别取值非法' });

    const u = auth.user;
    if (nickname !== undefined) u.nickname = String(nickname).trim();
    if (gender !== undefined) u.gender = gender;
    if (bio !== undefined) u.bio = String(bio).trim();
    if (avatar !== undefined) u.avatar = avatar;
    await env.DB.prepare('UPDATE users SET nickname=?, gender=?, bio=?, avatar=? WHERE id=?')
      .bind(u.nickname, u.gender, u.bio, u.avatar, u.id)
      .run();
    return json({ code: 200, data: publicUser(u) });
  }

  /**
   * DELETE /api/account 注销账号
   * 是否登录：是
   * 请求体：无
   * 权限规则：仅能注销当前登录用户本人；级联删除其发布的内容，
   *           从他人内容中移除其点赞与评论，并清理其相关通知
   */
  if (path === '/api/account' && method === 'DELETE') {
    const auth = await requireAuth(request, env);
    if (auth.res) return auth.res;
    const uid = auth.userId;

    const wishes = (await env.DB.prepare('SELECT * FROM wishes').all()).results.map(parseWish);
    const removedWishIds = new Set();
    const wishStmts = [];
    for (const w of wishes) {
      if (w.authorId === uid) {
        removedWishIds.add(w.id);
        wishStmts.push(env.DB.prepare('DELETE FROM wishes WHERE id = ?').bind(w.id));
        continue;
      }
      const likes = w.likes.filter((id) => id !== uid);
      const comments = w.comments.filter((c) => c.authorId !== uid);
      if (likes.length !== w.likes.length || comments.length !== w.comments.length) {
        wishStmts.push(
          env.DB.prepare('UPDATE wishes SET likes=?, comments=? WHERE id=?')
            .bind(JSON.stringify(likes), JSON.stringify(comments), w.id)
        );
      }
    }
    const stmts = [
      env.DB.prepare('DELETE FROM users WHERE id = ?').bind(uid),
      ...wishStmts,
      env.DB.prepare('DELETE FROM notifications WHERE userId = ? OR fromUserId = ?').bind(uid, uid),
    ];
    for (const wid of removedWishIds) {
      stmts.push(env.DB.prepare('DELETE FROM notifications WHERE wishId = ?').bind(wid));
    }
    await env.DB.batch(stmts);
    return json({ code: 200, msg: '账号已注销' });
  }

  /**
   * POST /api/wishes 发布祝福/许愿
   * 是否登录：是
   * 请求体：{ type: 'blessing'|'wish', content: string }
   * 权限规则：登录用户均可发布；内容去空白后不能为空且不超过 200 字
   */
  if (method === 'POST' && path === '/api/wishes') {
    const auth = await requireAuth(request, env);
    if (auth.res) return auth.res;
    const { type, content } = await body();
    if (!WISH_TYPES.includes(type)) return json({ code: 400, msg: '类型非法' });
    const text = String(content || '').trim();
    if (!text) return json({ code: 400, msg: '内容不能为空' });
    if (text.length > 200) return json({ code: 400, msg: '内容不能超过200字' });

    const wish = {
      id: genId('w'),
      type,
      content: text,
      authorId: auth.userId,
      createdAt: now(),
      likes: [],
      comments: [],
    };
    await env.DB.prepare(
      'INSERT INTO wishes (id, type, content, authorId, createdAt, likes, comments) VALUES (?,?,?,?,?,?,?)'
    )
      .bind(wish.id, wish.type, wish.content, wish.authorId, wish.createdAt, '[]', '[]')
      .run();
    const users = await allUsers(env);
    return json({ code: 200, data: serializeWish(wish, users, auth.userId) });
  }

  /**
   * POST /api/wishes/:id/like 点赞 / 取消点赞（切换式）
   * 是否登录：是
   * 请求体：无；路径参数 id 为祝福/许愿 ID
   * 权限规则：登录用户对任意存在的内容操作，仅可切换自己的点赞态；新增点赞时通知作者
   */
  const likeMatch = path.match(/^\/api\/wishes\/([^/]+)\/like$/);
  if (method === 'POST' && likeMatch) {
    const auth = await requireAuth(request, env);
    if (auth.res) return auth.res;
    const row = await env.DB.prepare('SELECT * FROM wishes WHERE id = ?').bind(likeMatch[1]).first();
    if (!row) return json({ code: 404, msg: '内容不存在或已删除' });
    const wish = parseWish(row);

    const idx = wish.likes.indexOf(auth.userId);
    let liked;
    if (idx >= 0) {
      wish.likes.splice(idx, 1);
      liked = false;
    } else {
      wish.likes.push(auth.userId);
      liked = true;
      // 通知内容作者；用户给自己的内容点赞时，作者本人也会在通知流中看到
      await createNotification(env, {
        userId: wish.authorId,
        type: 'like',
        wishId: wish.id,
        wishType: wish.type,
        fromUserId: auth.userId,
        fromName: auth.user.nickname || auth.user.username,
        excerpt: wish.content,
      });
    }
    await env.DB.prepare('UPDATE wishes SET likes = ? WHERE id = ?')
      .bind(JSON.stringify(wish.likes), wish.id)
      .run();
    return json({ code: 200, data: { liked, likeCount: wish.likes.length } });
  }

  /**
   * POST /api/wishes/:id/comments 发表评论
   * 是否登录：是
   * 请求体：{ content: string }；路径参数 id 为祝福/许愿 ID
   * 权限规则：登录用户可对任意存在的内容评论；内容去空白后不能为空且不超过 100 字，评论后通知作者
   */
  const commentMatch = path.match(/^\/api\/wishes\/([^/]+)\/comments$/);
  if (method === 'POST' && commentMatch) {
    const auth = await requireAuth(request, env);
    if (auth.res) return auth.res;
    const text = String((await body()).content || '').trim();
    if (!text) return json({ code: 400, msg: '评论不能为空' });
    if (text.length > 100) return json({ code: 400, msg: '评论不能超过100字' });

    const row = await env.DB.prepare('SELECT * FROM wishes WHERE id = ?').bind(commentMatch[1]).first();
    if (!row) return json({ code: 404, msg: '内容不存在或已删除' });
    const wish = parseWish(row);

    const comment = { id: genId('c'), authorId: auth.userId, content: text, createdAt: now() };
    wish.comments.push(comment);
    await env.DB.prepare('UPDATE wishes SET comments = ? WHERE id = ?')
      .bind(JSON.stringify(wish.comments), wish.id)
      .run();

    // 通知内容作者；用户评论自己的内容时，作者本人也会在通知流中看到
    await createNotification(env, {
      userId: wish.authorId,
      type: 'comment',
      wishId: wish.id,
      wishType: wish.type,
      fromUserId: auth.userId,
      fromName: auth.user.nickname || auth.user.username,
      excerpt: wish.content,
    });

    const users = await allUsers(env);
    const full = serializeWish(wish, users, auth.userId);
    return json({ code: 200, data: full.comments.find((c) => c.id === comment.id) });
  }

  /**
   * DELETE /api/wishes/:id/comments/:commentId 删除评论
   * 是否登录：是
   * 请求体：无；路径参数 id 为祝福/许愿 ID、commentId 为评论 ID
   * 权限规则：仅评论作者本人或该内容的楼主可删除
   */
  const delCommentMatch = path.match(/^\/api\/wishes\/([^/]+)\/comments\/([^/]+)$/);
  if (method === 'DELETE' && delCommentMatch) {
    const auth = await requireAuth(request, env);
    if (auth.res) return auth.res;
    const row = await env.DB.prepare('SELECT * FROM wishes WHERE id = ?').bind(delCommentMatch[1]).first();
    if (!row) return json({ code: 404, msg: '内容不存在或已删除' });
    const wish = parseWish(row);
    const idx = wish.comments.findIndex((c) => c.id === delCommentMatch[2]);
    if (idx < 0) return json({ code: 404, msg: '评论不存在或已删除' });
    const comment = wish.comments[idx];
    if (comment.authorId !== auth.userId && wish.authorId !== auth.userId) {
      return json({ code: 403, msg: '只能删除自己的评论' });
    }
    wish.comments.splice(idx, 1);
    await env.DB.prepare('UPDATE wishes SET comments = ? WHERE id = ?')
      .bind(JSON.stringify(wish.comments), wish.id)
      .run();
    return json({ code: 200, msg: '已删除' });
  }

  /**
   * DELETE /api/wishes/:id 删除祝福/许愿
   * 是否登录：是
   * 请求体：无；路径参数 id 为祝福/许愿 ID
   * 权限规则：仅内容作者本人可删除，同时清理该内容关联的全部通知
   */
  const delWishMatch = path.match(/^\/api\/wishes\/([^/]+)$/);
  if (method === 'DELETE' && delWishMatch) {
    const auth = await requireAuth(request, env);
    if (auth.res) return auth.res;
    const row = await env.DB.prepare('SELECT * FROM wishes WHERE id = ?').bind(delWishMatch[1]).first();
    if (!row) return json({ code: 404, msg: '内容不存在或已删除' });
    if (row.authorId !== auth.userId) return json({ code: 403, msg: '只能删除自己的内容' });
    await env.DB.batch([
      env.DB.prepare('DELETE FROM wishes WHERE id = ?').bind(row.id),
      env.DB.prepare('DELETE FROM notifications WHERE wishId = ?').bind(row.id),
    ]);
    return json({ code: 200, msg: '已删除' });
  }

  /**
   * POST /api/album 上传相册图片
   * 是否登录：是
   * 请求体：{ src: string, name?: string }；src 为 data URL 形式的图片，name 缺省取用户昵称/用户名
   * 权限规则：登录用户均可上传；校验 data URL 前缀，base64 体积上限约 2MB
   */
  if (method === 'POST' && path === '/api/album') {
    const auth = await requireAuth(request, env);
    if (auth.res) return auth.res;
    const { src, name } = await body();
    if (!src || !src.startsWith('data:image/')) return json({ code: 400, msg: '图片格式非法' });
    if (src.length > 2 * 1024 * 1024 * 1.37) return json({ code: 400, msg: '图片过大,请压缩后上传' });

    const item = {
      id: genId('a'),
      src,
      name: String(name || auth.user.nickname || auth.user.username || '匿名'),
      authorId: auth.userId,
      createdAt: now(),
    };
    await env.DB.prepare('INSERT INTO album (id, src, name, authorId, createdAt) VALUES (?,?,?,?,?)')
      .bind(item.id, item.src, item.name, item.authorId, item.createdAt)
      .run();
    return json({ code: 200, data: item });
  }

  /**
   * DELETE /api/album/:id 删除相册图片
   * 是否登录：是
   * 请求体：无；路径参数 id 为相册图片 ID
   * 权限规则：仅图片上传者本人可删除
   */
  const delAlbumMatch = path.match(/^\/api\/album\/([^/]+)$/);
  if (method === 'DELETE' && delAlbumMatch) {
    const auth = await requireAuth(request, env);
    if (auth.res) return auth.res;
    const item = await env.DB.prepare('SELECT * FROM album WHERE id = ?').bind(delAlbumMatch[1]).first();
    if (!item) return json({ code: 404, msg: '图片不存在或已删除' });
    if (item.authorId !== auth.userId) return json({ code: 403, msg: '只能删除自己上传的图片' });
    await env.DB.prepare('DELETE FROM album WHERE id = ?').bind(item.id).run();
    return json({ code: 200, msg: '已删除' });
  }

  return json({ code: 404, msg: '接口不存在' }, 404);
}

/**
 * 登录鉴权守卫：校验令牌并要求账号存在
 * @param {Request} request - 原始请求
 * @param {Object} env - Worker 环境绑定
 * @returns {Promise<{userId: string, user: Object}|{res: Response}>}
 *          鉴权通过返回用户信息；失败返回含 res（401 JSON 响应）的对象，调用方应直接返回该 res
 */
async function requireAuth(request, env) {
  const { userId, user } = await extractUser(request, env);
  if (!userId) return { res: json({ code: 401, msg: '未登录或登录已过期' }, 401) };
  if (!user) return { res: json({ code: 401, msg: '账号不存在' }, 401) };
  return { userId, user };
}

export default {
  /**
   * Worker 请求总入口：/api/* 进入路由处理并统一兜底异常，其余路径走静态资源
   * @param {Request} request - 入站请求
   * @param {Object} env - Worker 环境绑定
   * @returns {Promise<Response>} API JSON 响应或静态资源响应（异常时返回 500）
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env);
      } catch (err) {
        console.error(err);
        return json({ code: 500, msg: '服务器内部错误' }, 500);
      }
    }
    // 非 API 请求交由静态资源绑定处理，资源未命中时按 SPA 规则回退 index.html
    return env.ASSETS.fetch(request);
  },
};
