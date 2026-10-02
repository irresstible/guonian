/**
 * @file 网络请求统一封装：拼接接口地址、注入鉴权 Token、集中处理登录失效
 * @description 对接后端同源 /api 接口；401 处理器由应用入口注册，以规避与 store/router 的循环依赖
 */
import { API_BASE } from './config';
import { getToken } from './storage';

/**
 * 登录失效回调：由应用入口注册（清登录态并跳登录页），未注册时不做处理
 * @type {null | (() => void)}
 */
let onUnauthorized = null;

/**
 * 注册 401 统一处理回调
 * @param {() => void} fn - 登录失效时执行的处理函数
 */
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

/**
 * 发起 fetch 请求并解析 JSON，按需携带鉴权头并统一处理 401
 * @param {string} url - 接口相对路径，会与 API_BASE 拼接
 * @param {object} [options={}] - fetch 配置项，额外支持 auth 字段控制是否注入 Token
 * @param {boolean} [options.auth] - 是否携带 Authorization 头并参与 401 拦截
 * @param {object} [options.headers] - 自定义请求头
 * @returns {Promise<object>} 后端返回的 JSON 响应体（含 code/data 等字段）
 */
async function request(url, options = {}) {
  const headers = options.headers || {};
  if (options.auth) headers['Authorization'] = 'Bearer ' + getToken();

  const res = await fetch(API_BASE + url, { ...options, headers });
  const data = await res.json();

  // 同时兼容 HTTP 状态码 401 与业务体 code=401，业务页面无需各自判断登录失效
  if (options.auth && (res.status === 401 || data.code === 401)) {
    if (onUnauthorized) onUnauthorized();
  }
  return data;
}

/**
 * 发起需登录的 GET 请求（固定携带 Token）
 * @param {string} url - 接口相对路径
 * @returns {Promise<object>} 后端 JSON 响应体
 */
export const apiGet = (url) => request(url, { auth: true });

/**
 * 发起 GET 请求，可按需携带 Token
 * @param {string} url - 接口相对路径
 * @param {object} [options] - 请求选项
 * @param {boolean} [options.auth=false] - 是否携带 Token；公开列表需要 likedByMe 等登录态字段时传 true
 * @returns {Promise<object>} 后端 JSON 响应体
 */
export const apiGetPublic = (url, { auth = false } = {}) => request(url, { auth });

/**
 * 发起 JSON POST 请求，可按需携带 Token
 * @param {string} url - 接口相对路径
 * @param {object} body - 请求体，将序列化为 JSON
 * @param {object} [options] - 请求选项
 * @param {boolean} [options.auth=false] - 是否携带 Token；发布/点赞/评论等写操作传 true，登录/注册/发码保持默认 false
 * @returns {Promise<object>} 后端 JSON 响应体
 */
export const apiPost = (url, body, { auth = false } = {}) =>
  request(url, {
    method: 'POST',
    auth,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

/**
 * 发起需登录的 JSON PUT 请求（固定携带 Token）
 * @param {string} url - 接口相对路径
 * @param {object} body - 请求体，将序列化为 JSON
 * @returns {Promise<object>} 后端 JSON 响应体
 */
export const apiPut = (url, body) =>
  request(url, {
    method: 'PUT',
    auth: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

/**
 * 发起需登录的 DELETE 请求（固定携带 Token）
 * @param {string} url - 接口相对路径
 * @returns {Promise<object>} 后端 JSON 响应体
 */
export const apiDelete = (url) => request(url, { method: 'DELETE', auth: true });
