/**
 * @file 后端全局配置常量
 * @description 演示环境全部硬编码；生产环境的密钥等敏感配置应改由环境变量注入
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PORT = 3000;
export const DATA_DIR = path.join(__dirname, 'data');
export const TOKEN_TTL = 7 * 24 * 60 * 60 * 1000; // 登录 token 有效期：7 天
export const CODE_TTL = 5 * 60 * 1000; // 短信验证码有效期：5 分钟
// HMAC 签名密钥：演示环境硬编码即可，生产环境必须通过环境变量注入
export const TOKEN_SECRET = 'guonian-demo-secret-2026';
