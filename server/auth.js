/**
 * @file 认证模块：scrypt 密码哈希、HMAC 无状态 token 与鉴权中间件
 * @description 依赖 node:crypto；token 格式为 base64url(userId).exp.sign，服务端不保存会话
 */
import { scryptSync, randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { TOKEN_TTL, TOKEN_SECRET } from './config.js';
import { load } from './store.js';

// ====== 密码哈希 ======
/**
 * 生成带随机盐的 scrypt 密码哈希
 * @param {string} password - 明文密码
 * @returns {string} 形如 salt:hash 的存储串
 */
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * 校验明文密码是否与存储哈希匹配
 * @param {string} password - 待校验的明文密码
 * @param {string} stored - 注册时存储的 salt:hash 串
 * @returns {boolean} 匹配返回 true；存储格式非法或密码不匹配返回 false
 */
export function verifyPassword(password, stored) {
  const [salt, hash] = (stored || '').split(':');
  if (!salt || !hash) return false;
  const calc = scryptSync(password, salt, 64);
  const expect = Buffer.from(hash, 'hex');
  return calc.length === expect.length && timingSafeEqual(calc, expect);
}

// ====== Token 签发与校验 ======
/**
 * Buffer 转 base64url 字符串
 * @param {Buffer} buf - 待编码数据
 * @returns {string} base64url 编码结果
 */
const b64u = (buf) => Buffer.from(buf).toString('base64url');

/**
 * 用 HMAC-SHA256 对 token 负载签名
 * @param {string} payload - 待签名负载（base64url(userId).exp）
 * @returns {string} base64url 签名
 */
function sign(payload) {
  return createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
}

/**
 * 为用户签发登录 token
 * @param {string} userId - 用户 id
 * @returns {string} 带过期时间与签名的 token
 */
export function issueToken(userId) {
  const exp = Date.now() + TOKEN_TTL;
  const payload = `${b64u(userId)}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

/**
 * 校验 token 签名与有效期，并还原用户 id
 * @param {string} token - 待校验 token
 * @returns {string|null} 合法时返回用户 id；格式错误、签名不符或已过期返回 null
 */
export function verifyToken(token) {
  const parts = (token || '').split('.');
  if (parts.length !== 3) return null;
  const [u, exp, sig] = parts;
  const payload = `${u}.${exp}`;
  const expect = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now()) return null;
  return Buffer.from(u, 'base64url').toString('utf8');
}

// ====== 鉴权中间件 ======
/**
 * 从 Authorization 请求头解析 Bearer token 并还原用户 id
 * @param {import('express').Request} req - Express 请求对象
 * @returns {string|null} 合法 token 返回对应用户 id，否则返回 null
 */
function extractUserId(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  return verifyToken(token);
}

/**
 * 强制登录中间件：token 无效、过期或账号不存在时直接返回 401
 * @param {import('express').Request} req - Express 请求对象，校验通过后挂载 userId/user
 * @param {import('express').Response} res - Express 响应对象
 * @param {import('express').NextFunction} next - 放行下一个中间件
 * @returns {void}
 */
export function authRequired(req, res, next) {
  const userId = extractUserId(req);
  if (!userId) return res.status(401).json({ code: 401, msg: '未登录或登录已过期' });
  const user = load('users').find((u) => u.id === userId);
  if (!user) return res.status(401).json({ code: 401, msg: '账号不存在' });
  req.userId = userId;
  req.user = user;
  next();
}

/**
 * 可选登录中间件：token 合法时挂载用户信息，缺失或无效时按匿名访问放行，不报错
 * @param {import('express').Request} req - Express 请求对象，登录时挂载 userId/user
 * @param {import('express').Response} res - Express 响应对象
 * @param {import('express').NextFunction} next - 放行下一个中间件
 * @returns {void}
 */
export function optionalAuth(req, res, next) {
  const userId = extractUserId(req);
  if (userId) {
    const user = load('users').find((u) => u.id === userId);
    if (user) {
      req.userId = userId;
      req.user = user;
    }
  }
  next();
}
