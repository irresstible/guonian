/**
 * @file 春节倒计时计算：内置近年春节日期，输出距下一个春节的天/时/分/秒
 */

// 近年春节（正月初一）零点日期表，固定东八区，避免时区偏移导致跨天错误
export const SPRING_FESTIVALS = [
  '2026-02-17T00:00:00+08:00',
  '2027-02-06T00:00:00+08:00',
  '2028-01-26T00:00:00+08:00',
  '2029-02-13T00:00:00+08:00',
  '2030-02-03T00:00:00+08:00',
];

/**
 * 获取下一个未到来的春节日期
 * @param {Date} [now=new Date()] - 参照时间，默认当前时间（便于测试）
 * @returns {Date} 下一个春节的零点 Date；表内日期全部过去时，按末年的月日向后递推一年
 */
export function getNextSpringFestival(now = new Date()) {
  for (const s of SPRING_FESTIVALS) {
    const d = new Date(s);
    if (d.getTime() > now.getTime()) return d;
  }
  // 超出内置日期表范围：取末年的月/日，用下一年年份重新构造东八区零点
  const last = new Date(SPRING_FESTIVALS[SPRING_FESTIVALS.length - 1]);
  const year = now.getFullYear() + 1;
  return new Date(new Date(`${year}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}T00:00:00+08:00`));
}

/**
 * 计算目标时间距当前时间的倒计时各部分
 * @param {Date} target - 倒计时目标时间
 * @param {Date} [now=new Date()] - 参照时间，默认当前时间
 * @returns {{days: number, hours: number, minutes: number, seconds: number, passed: boolean, target: Date}} 剩余天/时/分/秒；passed 为 true 表示目标时间已过，各数值归零
 */
export function getCountdownParts(target, now = new Date()) {
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, passed: true, target };
  }
  const sec = Math.floor(diff / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  return { days, hours, minutes, seconds, passed: false, target };
}
