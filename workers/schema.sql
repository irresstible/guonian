-- =============================================================
-- @file 「一起过新年」Cloudflare D1（SQLite）数据库建表脚本
-- @description 供 workers/src/worker.js 使用，可用 wrangler d1 execute 执行。
--              表结构与 Express + JSON 文件版（server/data 下的 users.json、
--              wishes.json、notifications.json、album.json）一一对应，
--              差异仅为持久化方式：JSON 版中的数组在此以 JSON 文本列保存；
--              外键仅为语义引用，未建强制约束（用户注销时由应用层手动级联清理）。
-- =============================================================

-- 用户表：对应 Express 版 server/data/users.json。
-- passwordHash 为 scrypt 哈希，格式 salt:hash，与 Express 版互通；
-- gender 取值 male/female/secret；username、phone 均唯一。
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  gender TEXT NOT NULL DEFAULT 'secret',
  bio TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL
);

-- 祝福/许愿表：对应 Express 版 server/data/wishes.json。
-- type 取值 blessing（祝福）/wish（许愿）。
-- authorId 为外键语义 → users.id（作者；作者注销后该内容随之一并删除）。
-- likes 为点赞用户 ID 数组的 JSON 文本，元素均为 users.id；
-- comments 为评论数组的 JSON 文本，每条评论的 authorId 语义 → users.id。
CREATE TABLE IF NOT EXISTS wishes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  authorId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  likes TEXT NOT NULL DEFAULT '[]',
  comments TEXT NOT NULL DEFAULT '[]'
);

-- 通知表：对应 Express 版 server/data/notifications.json。
-- userId 为外键语义 → users.id（通知接收者）；
-- wishId 为外键语义 → wishes.id（触发通知的内容，可空；内容删除时通知一并删除）；
-- fromUserId 为外键语义 → users.id（点赞/评论的触发者，允许与接收者为同一人）。
-- type 取值 like/comment；wishType 冗余记录关联内容类型，默认 blessing；
-- read 为已读标记，0 未读 / 1 已读。
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  type TEXT NOT NULL,
  wishId TEXT,
  wishType TEXT NOT NULL DEFAULT 'blessing',
  fromUserId TEXT,
  fromName TEXT,
  excerpt TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL
);

-- 相册表：对应 Express 版 server/data/album.json。
-- src 为图片 data URL，直接以文本存库；
-- authorId 为外键语义 → users.id（上传者）。
CREATE TABLE IF NOT EXISTS album (
  id TEXT PRIMARY KEY,
  src TEXT NOT NULL,
  name TEXT NOT NULL,
  authorId TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

-- 短信验证码表：Express 版验证码存于内存（服务重启即失效），D1 版改为落库。
-- 以手机号为主键（同号重发时 UPSERT 覆盖）；expires 为毫秒级过期时间戳。
CREATE TABLE IF NOT EXISTS verify_codes (
  phone TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires INTEGER NOT NULL
);
