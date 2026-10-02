/**
 * @file 全局常量配置
 * @description API 开发与生产均走同源 /api：开发环境由 vite.config.js 代理到 http://localhost:3000，生产环境由后端同源静态托管
 */

/** API 请求统一前缀 */
export const API_BASE = '/api';

/** 手机号校验正则，规则与后端保持一致 */
export const PHONE_REGEX = /^1[3-9]\d{9}$/;
