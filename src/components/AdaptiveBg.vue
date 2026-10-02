<template>
  <!-- 自适应图片背景：桌面/横屏 cover 裁切，竖屏手机「模糊铺底 + 完整图片」 -->
  <div
    class="adaptive-bg"
    :class="{ 'adaptive-bg--embedded': embedded }"
  >
    <!-- 竖屏手机用的模糊铺底层（桌面/横屏不渲染，避免双倍 GPU 开销） -->
    <img
      class="adaptive-bg__blur"
      :src="src"
      alt=""
      aria-hidden="true"
    >
    <img
      class="adaptive-bg__img"
      :src="src"
      :alt="alt"
    >
  </div>
</template>

<script setup>
/**
 * @file 自适应全屏图片背景组件
 * @description 统一「横版图片在竖屏手机显示不全」的解决方案：
 * 桌面与横屏走 object-fit:cover 全屏裁切；竖屏手机（≤768px 且 portrait）
 * 主图改为 contain 完整展示，同图放大模糊后铺满上下留白（视频 App 式模糊填充）。
 * 独立模式（默认）根节点 fixed 相对视口铺满；embedded 模式改为 absolute 填满
 * 已定位的父容器（用于 3D 翻转等需要自带图层结构的场景）。
 */

defineProps({
  /** 背景图片地址 */
  src: {
    type: String,
    required: true,
  },
  /** 无障碍替代文本；纯装饰背景传空字符串即可 */
  alt: {
    type: String,
    default: '',
  },
  /** 嵌入模式：absolute 填满已定位父容器，而非 fixed 相对视口 */
  embedded: {
    type: Boolean,
    default: false,
  },
});
</script>

<style scoped>
/* ====== 独立模式（默认）：fixed 相对视口全屏铺底 ====== */
.adaptive-bg {
  position: fixed;
  inset: 0;
  width: 100%;
  /* 100vh 兜底，100dvh 修复移动端浏览器地址栏动态遮挡 */
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  /* 图片加载前/留白处的兜底色，与图片暗调一致 */
  background: #1a1208;
  z-index: 0;
  /* 独立模式下背景纯装饰，点击穿透，避免遮挡表单等下层交互 */
  pointer-events: none;
}

/* ====== 嵌入模式：填满已定位父容器（如翻转背景的正反两面） ====== */
.adaptive-bg--embedded {
  position: absolute;
  height: 100%;
  z-index: auto;
  /* 需要接收点击并冒泡给翻转容器，实现点击暂停/继续 */
  pointer-events: auto;
}

.adaptive-bg__img {
  position: relative;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* 模糊铺底层默认（桌面/横屏）不渲染 */
.adaptive-bg__blur {
  display: none;
}

/* ====== 竖屏手机适配 ======
   横版合影在竖屏 cover 会裁掉两侧人物，改为：
   主图 contain 完整展示 + 同图放大模糊铺满留白处。
   横屏手机与桌面仍用 cover，不受影响。 */
@media (max-width: 768px) and (orientation: portrait) {
  .adaptive-bg__blur {
    display: block;
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    /* 放大裁掉模糊边缘的羽化，并压暗让主图更突出 */
    transform: scale(1.18);
    filter: blur(18px) brightness(0.65);
  }

  .adaptive-bg__img {
    position: relative;
    z-index: 1;
    object-fit: contain;
  }
}
</style>
