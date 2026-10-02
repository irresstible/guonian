<template>
  <!-- 全屏翻页背景（点击暂停 / 继续） -->
  <div
    class="page-flip"
    @click="paused = !paused"
  >
    <div
      class="page-flip__inner"
      :class="{ pause: paused }"
    >
      <!-- 正反两面背景图，图层适配（cover/竖屏模糊填充）由 AdaptiveBg 统一负责 -->
      <div class="page-flip__item page-flip__item--first">
        <AdaptiveBg
          src="/img/bg1.jpg"
          alt="新年背景1"
          embedded
        />
      </div>
      <div class="page-flip__item page-flip__item--second">
        <AdaptiveBg
          src="/img/bg2.png"
          alt="新年背景2"
          embedded
        />
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * @file 全屏 3D 翻页背景：两张背景图循环翻转，点击可暂停 / 继续
 * @description 仅负责翻转动画结构（preserve-3d 双面），图片在各屏的裁切/
 * 竖屏模糊填充统一由 AdaptiveBg 组件（embedded 模式）负责
 */
import { ref } from 'vue';
import AdaptiveBg from './AdaptiveBg.vue';

/** 翻页动画是否暂停 */
const paused = ref(false);
</script>

<style scoped>
/* ====== 容器：fixed 全屏铺底，perspective 提供 3D 视距 ====== */
.page-flip {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  perspective: 1200px;
  z-index: 0;
  cursor: pointer;
}

/* ====== 翻页层：preserve-3d 承载两面，关键帧循环翻转，.pause 暂停动画 ====== */
.page-flip__inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  animation: pageFlip 6s infinite ease-in-out;
}

.page-flip__inner.pause {
  animation-play-state: paused;
}

/* ====== 正反两面：绝对定位叠放并隐藏背面；第二面预先 rotateY(180deg) ====== */
.page-flip__item {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  overflow: hidden;
}

.page-flip__item--first {
  z-index: 2;
}

.page-flip__item--second {
  transform: rotateY(180deg);
  z-index: 1;
}

/* ====== 翻页关键帧：0→180→360 形成无缝循环翻页 ====== */
@keyframes pageFlip {
  0% {
    transform: rotateY(0deg);
  }
  50% {
    transform: rotateY(180deg);
  }
  100% {
    transform: rotateY(360deg);
  }
}
</style>
