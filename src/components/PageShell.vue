<template>
  <div>
    <!-- 全屏翻转背景 -->
    <FlipBackground />

    <div class="page-content">
      <div class="main-page wrapper">
        <!-- 顶部导航栏 -->
        <div class="page-header wrapper">
          <ul>
            <li
              v-for="(item, i) in navItems"
              :key="i"
            >
              <RouterLink
                v-if="item.to"
                :to="item.to"
                :class="item.class || (item.active ? 'active' : '')"
              >
                {{ item.text }}
              </RouterLink>
              <a
                v-else
                href="#"
                :class="item.class || (item.active ? 'active' : '')"
                @click.prevent="item.onClick && item.onClick()"
              >
                {{ item.text }}
              </a>
            </li>
            <li v-if="auth.isLoggedIn">
              <NotificationBell />
            </li>
            <slot name="nav-extra" />
          </ul>
        </div>

        <!-- 页面主体内容插槽 -->
        <slot />
      </div>

      <!-- 页脚 -->
      <PageFooter />
    </div>
  </div>
</template>

<script setup>
/**
 * @file 内容型页面公共骨架：翻转背景 + 顶部导航 + 内容插槽 + 页脚
 * @description Props：navItems 导航项数组，每项为 { text, to?, onClick?, active?, class? }；
 *              插槽：nav-extra 导航栏额外项，默认插槽为页面主体
 */
import { useAuthStore } from '@/stores/auth';
import FlipBackground from '@/components/FlipBackground.vue';
import PageFooter from '@/components/PageFooter.vue';
import NotificationBell from '@/components/NotificationBell.vue';

defineProps({
  /** 导航项数组，每项结构：{ text 文案, to? 路由地址, onClick? 点击回调, active? 高亮, class? 自定义类名 } */
  navItems: { type: Array, default: () => [] },
});

const auth = useAuthStore();
</script>

<style scoped>
/* ====== 骨架布局：内容层 z-index 抬到翻转背景之上，默认不拦截指针事件 ====== */
.page-content {
  position: relative;
  z-index: 10;
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  pointer-events: none;
}

.main-page {
  flex: 1;
  pointer-events: none;
}

/* 只有实际内容块接收事件，通栏空白透传给翻转背景 */
.main-page :deep(.profile-card),
.main-page :deep(.text-content__container),
.main-page :deep(.help-card),
.main-page :deep(.shell-card),
.page-header ul,
.page-content :deep(.page-footer__box) {
  pointer-events: auto;
}

/* ====== 顶部导航：胶囊链接，active 项用品牌渐变高亮 ====== */
.page-header {
  margin: 10px auto;
  display: flex;
  justify-content: center;
  align-items: center;
}

.page-header ul {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 14px;
  width: fit-content;
  max-width: 100%;
  margin: 0 auto;
}

.page-header ul li :deep(a) {
  display: inline-block;
  padding: 6px 12px;
  font-size: 16px;
  color: #fff;
  transition: color 0.25s;
  cursor: pointer;
}

.page-header ul li :deep(a:hover) {
  color: var(--brand-2);
}

.page-header ul li :deep(a.active) {
  color: #fff;
  background: var(--brand-gradient);
  border-radius: 999px;
  box-shadow: var(--shadow-brand);
}

.page-header ul li :deep(a.active:hover) {
  color: #fff;
}

/* ====== 移动端响应式：收紧导航间距与字号 ====== */
@media (max-width: 768px) {
  .page-header ul {
    gap: 8px;
  }
  .page-header ul li :deep(a) {
    font-size: 15px;
    padding: 6px 10px;
  }
}
</style>
