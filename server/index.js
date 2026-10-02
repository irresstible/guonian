/**
 * @file 「一起过新年」后端服务入口
 * @description 基于 Express，监听 3000 端口（/api 由 Vite 开发服务器代理）；通过 npm run server 启动
 */
import express from 'express';
import { initStore } from './store.js';
import { PORT } from './config.js';
import authRoutes from './routes/auth.routes.js';
import wishesRoutes from './routes/wishes.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import albumRoutes from './routes/album.routes.js';

initStore();

const app = express();
app.use(express.json({ limit: '3mb' })); // 头像与相册图片以 data URL 传输，需放宽请求体体积上限

app.use('/api', authRoutes);
app.use('/api/wishes', wishesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/album', albumRoutes);

/** 健康检查接口，供探活使用，无需登录 */
app.get('/api/health', (req, res) => res.json({ code: 200, msg: 'ok' }));

app.listen(PORT, () => {
  console.log(`「一起过新年」后端已启动: http://localhost:${PORT}`);
  console.log('注册/重置密码的验证码将打印在本窗口');
});
