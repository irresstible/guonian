<template>
  <canvas
    ref="canvasRef"
    class="season-canvas"
    aria-hidden="true"
  />
</template>

<script setup>
/**
 * @file 四季粒子背景 canvas：按当前月份渲染春花瓣 / 夏萤火虫 / 秋落叶 / 冬雪花
 * @description 遵循系统 prefers-reduced-motion 设置，页面隐藏时暂停渲染以省电
 */
import { ref, onMounted, onUnmounted } from 'vue';

const canvasRef = ref(null);
/** requestAnimationFrame 句柄 */
let rafId = null;
/** 当前全部粒子实例 */
let particles = [];
/** 用户是否偏好减少动态效果 */
let reducedMotion = false;
/** 当前季节 key：spring / summer / autumn / winter */
let season = 'winter';

/** 四季粒子配置：数量、配色、下落速度区间、尺寸区间 */
const SEASONS = {
  spring: { count: 40, colors: ['#ffb7c5', '#ffc9d6', '#ff9eb5'], speed: [0.5, 1.1], size: [4, 8] },
  summer: { count: 28, colors: ['#d8ff7a', '#eaffb0', '#c8ff5e'], speed: [0.15, 0.4], size: [1.5, 3] },
  autumn: { count: 36, colors: ['#e8912d', '#d4761f', '#c45620', '#eab54a'], speed: [0.6, 1.3], size: [5, 9] },
  winter: { count: 80, colors: ['#ffffff'], speed: [0.3, 1.0], size: [1, 3.5] },
};

/**
 * 按月份判定季节
 * @param {Date} d 待判定的日期，默认当前时间
 * @returns {'spring'|'summer'|'autumn'|'winter'} 季节 key
 */
function getSeason(d = new Date()) {
  const m = d.getMonth();
  if (m >= 2 && m <= 4) return 'spring'; // 3-5 月
  if (m >= 5 && m <= 7) return 'summer'; // 6-8 月
  if (m >= 8 && m <= 10) return 'autumn'; // 9-11 月
  return 'winter'; // 12-2 月
}

/**
 * 生成 [min, max) 区间内的随机数
 * @param {number} min 最小值
 * @param {number} max 最大值
 * @returns {number} 随机数
 */
const rand = (min, max) => min + Math.random() * (max - min);
/**
 * 从数组中随机取一项
 * @template T
 * @param {T[]} arr 候选数组
 * @returns {T} 随机项
 */
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * 按设备像素比设置画布物理尺寸，避免高分屏模糊
 * @param {HTMLCanvasElement} canvas 目标画布
 */
function resize(canvas) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** 按当前季节配置重新生成一屏粒子 */
function initParticles() {
  const cfg = SEASONS[season];
  const W = window.innerWidth;
  const H = window.innerHeight;
  particles = Array.from({ length: cfg.count }, () => ({
    x: rand(0, W),
    y: rand(0, H),
    r: rand(cfg.size[0], cfg.size[1]),
    speed: rand(cfg.speed[0], cfg.speed[1]),
    sway: rand(0, Math.PI * 2),
    swaySpeed: rand(0.005, 0.015),
    rot: rand(0, Math.PI * 2),
    rotSpeed: rand(-0.03, 0.03),
    color: pick(cfg.colors),
    phase: rand(0, Math.PI * 2), // 萤火虫呼吸闪烁的相位偏移
  }));
}

/**
 * 按季节形态绘制单个粒子
 * @param {CanvasRenderingContext2D} ctx 画布上下文
 * @param {object} p 粒子实例
 * @param {number} t requestAnimationFrame 时间戳
 */
function drawParticle(ctx, p, t) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (season === 'summer') {
    // 萤火虫：发光圆点 + 呼吸式明暗变化
    const glow = 0.5 + 0.5 * Math.sin(t / 300 + p.phase);
    ctx.globalAlpha = 0.3 + 0.6 * glow;
    ctx.shadowBlur = 8;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(0, 0, p.r, 0, Math.PI * 2);
    ctx.fill();
  } else if (season === 'winter') {
    // 雪花：半透明白色圆点
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(0, 0, p.r, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 花瓣 / 落叶：旋转的椭圆
    ctx.rotate(p.rot);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * 动画主循环：更新粒子位移并重绘，越界粒子从对侧循环出现
 * @param {number} t requestAnimationFrame 时间戳
 */
function draw(t) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = window.innerWidth;
  const H = window.innerHeight;
  ctx.clearRect(0, 0, W, H);

  for (const p of particles) {
    if (season === 'summer') {
      // 萤火虫：四面八方缓慢漂浮，不做下落
      p.sway += p.swaySpeed;
      p.x += Math.sin(p.sway) * 0.5;
      p.y += Math.cos(p.sway * 0.8) * 0.35 - 0.05;
      if (p.y < -10) p.y = H + 10;
      if (p.y > H + 10) p.y = -10;
      if (p.x > W + 10) p.x = -10;
      if (p.x < -10) p.x = W + 10;
    } else {
      // 花瓣 / 落叶 / 雪花：匀速下落 + 左右摇摆 + 自转
      p.y += p.speed;
      p.sway += p.swaySpeed;
      p.x += Math.sin(p.sway) * 0.5;
      p.rot += p.rotSpeed;
      if (p.y > H + 10) {
        p.y = -10;
        p.x = rand(0, W);
      }
      if (p.x > W + 10) p.x = -10;
      if (p.x < -10) p.x = W + 10;
    }
    drawParticle(ctx, p, t);
  }

  if (!reducedMotion) rafId = requestAnimationFrame(draw);
}

/** 页面可见性变化：隐藏时暂停帧循环省电，重新可见时恢复 */
function handleVisibility() {
  if (document.hidden) {
    cancelAnimationFrame(rafId);
    rafId = null;
  } else if (!rafId && !reducedMotion) {
    rafId = requestAnimationFrame(draw);
  }
}

/** 窗口尺寸变化时按新视口重置画布分辨率 */
function handleResize() {
  if (canvasRef.value) resize(canvasRef.value);
}

/** 挂载时确定季节、初始化画布与粒子，并注册 resize / 可见性监听 */
onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  season = getSeason();
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  resize(canvas);
  initParticles();
  if (reducedMotion) {
    draw(0); // 偏好减少动态时只静态渲染一帧，不启动循环
  } else {
    rafId = requestAnimationFrame(draw);
  }
  window.addEventListener('resize', handleResize);
  document.addEventListener('visibilitychange', handleVisibility);
});

/** 卸载时取消帧循环并移除事件监听 */
onUnmounted(() => {
  cancelAnimationFrame(rafId);
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('visibilitychange', handleVisibility);
});
</script>

<style scoped>
/* ====== 粒子画布：fixed 全屏覆盖且不拦截指针事件，层级介于背景与内容之间 ====== */
.season-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
}
</style>
