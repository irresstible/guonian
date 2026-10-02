# 一起过新年（guonian）

一个「新年主题社区」单页应用：注册登录后可以发布祝福/许愿、点赞评论、上传相册图片，并接收互动通知。

这是一个**学习/演示项目**：功能完整、可直接运行和部署，但部分实现（短信验证码、图片存储、数据层）按演示标准取舍，不建议原样用于生产。详见文末「已知局限」。

- 在线演示：<https://cjbx.dkw.ccwu.cc>（Cloudflare Workers）
- 前端：Vue 3 + Vite + Pinia + Vue Router
- 后端：同一套 API 提供两种实现 —— 本地 Express + JSON 文件，线上 Cloudflare Worker + D1

## 功能

- 账号：注册、登录、找回密码（手机验证码，演示环境不真正发短信）
- 首页：3D 翻转背景（点击暂停）、新年倒计时、随季节变化的粒子特效（春花瓣/夏流萤/秋落叶/冬雪）
- 祝福许愿墙：发布祝福或许愿、类型筛选与关键词搜索、点赞（再次点击取消）、评论、删除自己的发布；楼主可删除自己帖子下的任意评论
- 新年相册：浏览相册、上传图片（前端压缩，≤2MB）、大图灯箱、删除自己上传的图片
- 用户中心：头像本地裁剪压缩上传、资料编辑、「我的发布/我的相册」集中管理、登录历史、注销账号（级联删除其内容与通知）
- 通知：被点赞/评论时生成通知，未读角标、批量标记已读
- 移动端：全站响应式，横版背景图在竖屏手机上以「完整图 + 模糊填充」展示

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3.5（`<script setup>`）、Vue Router 4、Pinia 4、Vite 8 |
| 本地后端 | Express 5、Node.js ≥ 22，JSON 文件原子写持久化 |
| 线上后端 | Cloudflare Workers（单文件 Worker）、Cloudflare D1（SQLite） |
| 认证 | scrypt 密码哈希 + HMAC-SHA256 无状态 Token（有效期 7 天） |
| 质量 | ESLint（flat config，0 error 0 warning）、Vitest（20 个单元测试） |

## 目录结构

```
.
├── src/                    # 前端源码
│   ├── views/              # 9 个路由页面
│   ├── components/         # 页面骨架、卡片、弹窗、背景等组件
│   ├── stores/             # Pinia：auth / wishes / album / notifications
│   ├── router/             # 路由表与登录守卫
│   ├── utils/              # fetch 封装、本地存储、压缩、倒计时、Toast 等
│   └── assets/main.css     # 全局样式与设计 Token
├── server/                 # Express 版后端（本地开发用）
│   ├── routes/             # auth / wishes / notifications / album 四组路由
│   ├── auth.js             # 密码哈希、Token 签发与校验、鉴权中间件
│   ├── store.js            # JSON 文件读写（tmp + rename 原子替换）
│   └── data/               # 运行时数据（git 已忽略，首次运行自动生成）
├── workers/                # Cloudflare 版后端
│   ├── src/worker.js       # 全部 API 的 Worker 实现（与 Express 行为对齐）
│   ├── schema.sql          # D1 建表脚本（users/wishes/notifications/album/verify_codes）
│   ├── wrangler.toml       # Worker、静态资源、D1 绑定配置
│   └── .dev.vars.example   # 本地开发环境变量示例
├── vite.config.js          # @ 别名 + /api 代理到 localhost:3000
└── eslint.config.js
```

## 本地开发

要求 Node.js 22+（仓库根目录有 `.nvmrc`）。

```bash
npm install

# 终端 1：启动 Express 后端（端口 3000）
npm run dev:server

# 终端 2：启动 Vite 开发服务器（端口 5173）
npm run dev
```

打开 <http://localhost:5173>。开发环境 `/api` 由 Vite 代理到 `http://localhost:3000`，无跨域问题。

验证码不会真的发短信：本地环境会打印在「终端 1」的控制台；云端演示环境会直接在页面 Toast 中返回（仅演示用途）。

其他常用命令：

```bash
npm run lint     # ESLint
npm test         # Vitest 单元测试
npm run build    # 生产构建，产物在 dist/
```

## 部署到 Cloudflare

线上版本的静态资源和 API 由**同一个 Worker** 提供：`dist/` 通过 Assets 绑定托管，未命中静态文件时回退 API 或 SPA 的 `index.html`。

前置条件：一个 Cloudflare 账号，并在本机完成 `npx wrangler login`。

```bash
# 1. 创建 D1 数据库（记下输出的 database_id）
cd workers
npm install
npx wrangler d1 create guonian-db

# 2. 把上一步的 database_id 填入 wrangler.toml 的 [[d1_databases]]
#    （仓库里的 id 是作者自己的库，需要替换成你的）

# 3. 建表
npx wrangler d1 execute guonian-db --remote --file=schema.sql

# 4. 设置 Token 签名密钥（随机长字符串，不要用示例值）
npx wrangler secret put TOKEN_SECRET

# 5. 本地联调 Worker（可选，环境变量从 .dev.vars 读取）
cp .dev.vars.example .dev.vars   # Windows: copy .dev.vars.example .dev.vars
npx wrangler dev

# 6. 构建前端并部署（回到项目根目录）
cd ..
npm run deploy
```

自定义域名：编辑 `workers/wrangler.toml` 的 `routes`，或删除该行直接使用分配的 `*.workers.dev` 地址。使用自有域名时需在 Cloudflare 托管该域名的 DNS（仅支持 NS 委派，免费动态域名服务商通常不允许）。

## API 一览

所有接口前缀 `/api`，除标注外响应统一为 `{ code, msg, data }`。需要登录的接口通过 `Authorization: Bearer <token>` 鉴权。

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/login` | 登录，返回 Token |
| POST | `/register` | 注册（用户名/密码/手机号/验证码） |
| POST | `/sendCode` | 发送演示验证码 |
| POST | `/resetPassword` | 凭验证码重置密码 |
| GET / PUT | `/profile` | 获取 / 修改个人资料 |
| DELETE | `/account` | 注销账号（级联删除内容与通知） |
| GET | `/wishes?type=&keyword=` | 祝福/许愿列表（公开） |
| POST | `/wishes` | 发布（需登录，≤200 字） |
| POST | `/wishes/:id/like` | 点赞 / 取消点赞（切换） |
| POST | `/wishes/:id/comments` | 评论（需登录，≤100 字） |
| DELETE | `/wishes/:id/comments/:commentId` | 删评论（作者或楼主） |
| DELETE | `/wishes/:id` | 删除发布（仅作者） |
| GET | `/notifications` | 通知列表（需登录，上限 100） |
| GET | `/notifications/unread-count` | 未读数 |
| POST | `/notifications/read` | 标记已读（按 id 或全部） |
| GET | `/album` | 相册列表（公开） |
| POST | `/album` | 上传图片（data URL，≤2MB） |
| DELETE | `/album/:id` | 删除图片（仅上传者） |
| GET | `/health` | 健康检查 |

## 数据与安全说明

- 密码使用 `scrypt` 加盐哈希存储，不存明文；Token 为 HMAC 签名的无状态令牌，服务端不维护会话，因此**目前没有 Token 主动吊销机制**（改密后旧 Token 在过期前仍有效）。
- Express 版数据保存在 `server/data/*.json`，写入采用「写临时文件 + rename」原子替换，避免写坏文件；该目录已被 git 忽略。
- Worker 版数据在 D1；其中点赞与评论以 JSON 文本列存在 `wishes` 表内（延续 JSON 版的数据结构，省一次 join），表间外键只在语义层维护，未建数据库级约束。
- **密钥区分环境**：本地 Express 的签名密钥是写在 `server/config.js` 里的演示默认值（随仓库公开，仅供本地）；线上 Worker 的真实密钥通过 `wrangler secret put TOKEN_SECRET` 注入，不落盘、不进仓库，本地的 `workers/.dev.vars` 也已被 git 忽略。

## 已知局限

如实列出，便于判断适用范围：

1. **没有真实短信通道**：验证码在控制台/页面明文返回，任何人都能注册，仅限演示。
2. **本地后端是 JSON 文件存储**：全量读改写，数据量大或并发高时性能差；换数据库只需重写 `server/store.js` 一层，路由无需改。
3. **相册图片以 data URL 存 D1**：省了对象存储配置，但单图 ≤2MB、数据库会膨胀；正规做法应使用 Cloudflare R2（作者账号未开通 R2，故未实现）。
4. **测试覆盖有限**：仅 20 个前端工具/Store 单元测试，API 层与 E2E 未覆盖，也没有 CI 流水线。
5. **无刷新令牌/限流/图形验证码**，登录与发码接口可能被滥用，不适合直接暴露在真实生产环境。
6. **背景图为游戏截图**（`public/img/` 下的合影素材），版权归原游戏方所有，仅用于个人学习演示，请勿商用或二次分发。

## 协议

未添加开源许可证，默认保留所有权利（All Rights Reserved）。
