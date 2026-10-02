<template>
  <div
    class="countdown"
    role="timer"
    :aria-label="ariaLabel"
  >
    <p class="countdown__label">
      {{ label }}
    </p>
    <!-- 倒计时数字网格 -->
    <div
      v-if="!passed"
      class="countdown__grid"
    >
      <div class="countdown__cell">
        <span class="countdown__num">{{ pad(parts.days) }}</span>
        <span class="countdown__unit">天</span>
      </div>
      <div class="countdown__cell">
        <span class="countdown__num">{{ pad(parts.hours) }}</span>
        <span class="countdown__unit">时</span>
      </div>
      <div class="countdown__cell">
        <span class="countdown__num">{{ pad(parts.minutes) }}</span>
        <span class="countdown__unit">分</span>
      </div>
      <div class="countdown__cell">
        <span class="countdown__num">{{ pad(parts.seconds) }}</span>
        <span class="countdown__unit">秒</span>
      </div>
    </div>
    <!-- 到期后祝福文案 -->
    <p
      v-else
      class="countdown__happy"
    >
      新年快乐!万事胜意!
    </p>
  </div>
</template>

<script setup>
/**
 * @file 春节倒计时：每秒刷新天 / 时 / 分 / 秒，到期后切换为新年祝福文案
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { getNextSpringFestival, getCountdownParts } from '@/utils/countdown';

const target = getNextSpringFestival();
const year = target.getFullYear();
const label = `距 ${year} 年春节`;

const parts = ref(getCountdownParts(target));
/** 是否已过春节（到期后隐藏数字面板） */
const passed = computed(() => parts.value.passed);

/** 供屏幕阅读器朗读的倒计时描述 */
const ariaLabel = computed(() =>
  passed.value
    ? '新年快乐'
    : `距 ${year} 年春节还有 ${parts.value.days} 天 ${parts.value.hours} 小时`
);

let timer = null;
/** 定时器回调：重新计算并刷新各时间分量 */
function tick() {
  parts.value = getCountdownParts(target);
}

/**
 * 数字补零为两位字符串
 * @param {number} n 原始数值
 * @returns {string} 至少两位的字符串
 */
function pad(n) {
  return String(n).padStart(2, '0');
}

/** 挂载后启动每秒刷新的定时器 */
onMounted(() => {
  timer = setInterval(tick, 1000);
});

/** 卸载时清除定时器，避免内存泄漏 */
onUnmounted(() => {
  clearInterval(timer);
});
</script>

<style scoped>
/* ====== 容器与标题 ====== */
.countdown {
  max-width: 800px;
  margin: 20px auto 0;
  padding: 24px 32px;
  text-align: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-lg);
}

.countdown__label {
  font-size: 15px;
  color: var(--text-2);
  margin-bottom: 16px;
  letter-spacing: 1px;
}

/* ====== 数字网格：flex 等分四格；数字使用 tabular-nums 等宽，跳秒时不抖动 ====== */
.countdown__grid {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.countdown__cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 72px;
  padding: 12px 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.countdown__num {
  font-size: 30px;
  font-weight: 700;
  color: #fff;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  background: var(--brand-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.countdown__unit {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-3);
}

/* ====== 到期祝福：品牌渐变裁切为文字颜色 ====== */
.countdown__happy {
  font-size: 22px;
  font-weight: 700;
  background: var(--brand-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* ====== 窄屏响应式：缩小格子间距与字号 ====== */
@media (max-width: 600px) {
  .countdown {
    padding: 20px 16px;
  }
  .countdown__grid {
    gap: 8px;
  }
  .countdown__cell {
    min-width: 60px;
    padding: 10px 6px;
  }
  .countdown__num {
    font-size: 24px;
  }
}
</style>
