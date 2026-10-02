import { describe, it, expect } from 'vitest';
import { getNextSpringFestival, getCountdownParts } from '../countdown';

describe('getNextSpringFestival', () => {
  it('节前返回最近的一个春节', () => {
    const d = getNextSpringFestival(new Date('2026-01-01T00:00:00+08:00'));
    expect(d.toISOString()).toBe(new Date('2026-02-17T00:00:00+08:00').toISOString());
  });

  it('当天已过零点则返回下一年', () => {
    const d = getNextSpringFestival(new Date('2026-02-17T00:00:01+08:00'));
    expect(d.toISOString()).toBe(new Date('2027-02-06T00:00:00+08:00').toISOString());
  });

  it('跨年滚动', () => {
    const d = getNextSpringFestival(new Date('2026-12-31T23:59:59+08:00'));
    expect(d.toISOString()).toBe(new Date('2027-02-06T00:00:00+08:00').toISOString());
  });
});

describe('getCountdownParts', () => {
  const target = new Date('2026-02-17T00:00:00+08:00');

  it('正确换算天/时/分/秒', () => {
    const now = new Date(target.getTime() - (1 * 86400 + 2 * 3600 + 3 * 60 + 4) * 1000);
    const p = getCountdownParts(target, now);
    expect(p).toMatchObject({ days: 1, hours: 2, minutes: 3, seconds: 4, passed: false });
  });

  it('到达或超过目标时间返回 passed=true 且归零', () => {
    const now = new Date(target.getTime() + 1000);
    const p = getCountdownParts(target, now);
    expect(p).toMatchObject({ days: 0, hours: 0, minutes: 0, seconds: 0, passed: true });
  });

  it('整好零时差为 0', () => {
    const now = new Date(target.getTime() - 1);
    const p = getCountdownParts(target, now);
    expect(p.seconds).toBe(0);
    expect(p.passed).toBe(false);
  });
});
