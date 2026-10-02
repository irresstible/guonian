/**
 * @file 本地存储统一读写入口：登录态、记住的用户名、登录历史
 * @description 所有 localStorage 访问收敛到本模块，存储键不对外暴露
 */

// ====== 存储键与容量上限 ======
const TOKEN_KEY = 'token';
const USERNAME_KEY = 'username';
const SAVED_USERNAME_KEY = 'savedUsername';
const LOGIN_HISTORY_KEY = 'loginHistory';
const LOGIN_HISTORY_MAX = 10;

/**
 * 读取登录 Token
 * @returns {string} Token 字符串，不存在时返回空串
 */
export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';

/**
 * 写入登录 Token
 * @param {string} token - 登录成功后后端返回的 Token
 */
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);

/**
 * 读取当前登录用户名
 * @returns {string | null} 用户名，不存在时为 null
 */
export const getUsername = () => localStorage.getItem(USERNAME_KEY);

/**
 * 写入当前登录用户名
 * @param {string} username - 用户名
 */
export const setUsername = (username) => localStorage.setItem(USERNAME_KEY, username);

/**
 * 读取"记住我"保存的用户名（用于登录页回填）
 * @returns {string | null} 保存的用户名，未保存时为 null
 */
export const getSavedUsername = () => localStorage.getItem(SAVED_USERNAME_KEY);

/**
 * 保存"记住我"用户名
 * @param {string} username - 需要记住的用户名
 */
export const setSavedUsername = (username) =>
  localStorage.setItem(SAVED_USERNAME_KEY, username);

/**
 * 清除"记住我"保存的用户名
 */
export const removeSavedUsername = () =>
  localStorage.removeItem(SAVED_USERNAME_KEY);

/**
 * 读取登录历史列表（按时间从新到旧）
 * @returns {Array<{time: string, ua: string}>} 登录历史数组，数据损坏或为空时返回空数组
 */
export const getLoginHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(LOGIN_HISTORY_KEY)) || [];
  } catch {
    // 本地数据被篡改或损坏时按无历史处理，避免页面崩溃
    return [];
  }
};

/**
 * 追加一条登录记录：最新记录头插，超过上限时丢弃最旧记录
 * @param {{time: string, ua: string}} entry - 登录时间与登录设备（User-Agent）
 */
export const addLoginHistory = ({ time, ua }) => {
  const list = getLoginHistory();
  list.unshift({ time, ua });
  localStorage.setItem(LOGIN_HISTORY_KEY, JSON.stringify(list.slice(0, LOGIN_HISTORY_MAX)));
};

/**
 * 清空全部登录历史
 */
export const clearLoginHistory = () => localStorage.removeItem(LOGIN_HISTORY_KEY);

/**
 * 退出登录时清除全部登录相关数据（Token、用户名、记住的用户名）
 */
export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(SAVED_USERNAME_KEY);
};
