/**
 * @file 基于 JSON 文件的轻量持久化层
 * @description 写入采用临时文件 + rename 原子替换；数据文件位于 server/data，启动时自动补齐
 */
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './config.js';

// 需要持久化的集合文件名（不含扩展名）
const FILES = ['users', 'wishes', 'notifications', 'album'];

/**
 * 返回集合对应的 JSON 文件路径
 * @param {string} name - 集合名
 * @returns {string} 数据文件绝对路径
 */
function fileOf(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

/**
 * 初始化数据目录与集合文件：目录不存在则创建，缺失的集合文件写入空数组
 * @returns {void}
 */
export function initStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const name of FILES) {
    const file = fileOf(name);
    if (!fs.existsSync(file)) fs.writeFileSync(file, '[]', 'utf8');
  }
}

/**
 * 读取并解析集合文件
 * @param {string} name - 集合名
 * @returns {Array} 集合记录数组；文件缺失或 JSON 解析失败时返回空数组
 */
export function load(name) {
  try {
    return JSON.parse(fs.readFileSync(fileOf(name), 'utf8'));
  } catch {
    return [];
  }
}

/**
 * 将整个集合原子写入磁盘
 * @param {string} name - 集合名
 * @param {Array} data - 待持久化的记录数组
 * @returns {void}
 */
export function save(name, data) {
  const file = fileOf(name);
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file); // 先写临时文件再 rename，避免写入中断导致原文件损坏
}
