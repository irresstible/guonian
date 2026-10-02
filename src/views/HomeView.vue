<template>
  <PageShell :nav-items="navItems">
    <template #nav-extra>
      <!-- 导航栏用户区 -->
      <li>
        <RouterLink
          to="/user"
          class="user-info"
        >
          <img
            :src="navAvatarSrc"
            alt="头像"
            class="user-avatar"
            :class="{ 'avatar-frame': auth.isLoggedIn }"
          >
          <span class="user-name">{{ navUsername }}</span>
        </RouterLink>
      </li>
      <li>
        <a
          v-if="auth.isLoggedIn"
          href="#"
          @click.prevent="handleLogout"
        >退出登录</a>
        <RouterLink
          v-else
          to="/login"
        >
          登录|注册
        </RouterLink>
      </li>
    </template>

    <!-- 新年倒计时区 -->
    <CountdownClock />
  </PageShell>

  <!-- 图片灯箱弹窗 -->
  <LightboxModal
    v-model="imgModalShow"
    :src="imgModalSrc"
  />
</template>

<script setup>
/**
 * @file 首页：新年倒计时落地页与站点导航入口
 * @description 导航项可打开图片灯箱或跳转许愿墙/相册；已登录用户在导航栏展示头像与昵称，
 * 挂载时拉取最新资料，依赖 auth store 及 PageShell、CountdownClock、LightboxModal 组件
 */
import { ref, computed, onMounted } from 'vue';
import { letterAvatar } from '@/utils/avatar';
import { getUsername } from '@/utils/storage';
import { showToast } from '@/utils/toast';
import { useAuthStore } from '@/stores/auth';
import PageShell from '@/components/PageShell.vue';
import CountdownClock from '@/components/CountdownClock.vue';
import LightboxModal from '@/components/LightboxModal.vue';

const auth = useAuthStore();

/** 灯箱弹窗是否显示 */
const imgModalShow = ref(false);
/** 灯箱当前展示的图片地址 */
const imgModalSrc = ref('');

/**
 * 打开图片灯箱并展示指定图片
 * @param {string} src 图片地址
 */
function openImgModal(src) {
  imgModalSrc.value = src;
  imgModalShow.value = true;
}

/** 顶部导航项配置：前四项点击打开灯箱图片，后两项跳转祝福许愿墙与新年相册 */
const navItems = [
  { text: 'psyche.yao', onClick: () => openImgModal('/img/n1.jpg') },
  { text: '逮到一只白熊', onClick: () => openImgModal('/img/n2.jpg') },
  { text: '超级无敌帅男.YYJ', onClick: () => openImgModal('/img/n3.jpg') },
  { text: '浅望繇', onClick: () => openImgModal('/img/n4.jpg') },
  { text: '祝福许愿墙', to: '/wishes' },
  { text: '新年相册', to: '/album' },
];

/**
 * 导航栏展示名：未登录显示“我的主页”，登录后依次取资料昵称、本地缓存用户名
 * @returns {string} 用于导航栏展示的用户名称
 */
const navUsername = computed(() => {
  if (!auth.isLoggedIn) return '我的主页';
  return auth.displayName || getUsername() || '我的主页';
});

/**
 * 导航栏头像地址：未登录用站点图标，登录后优先用资料头像，缓存用户名时生成字母头像
 * @returns {string} 头像图片地址
 */
const navAvatarSrc = computed(() => {
  if (!auth.isLoggedIn) return '/img/favicon.ico';
  if (auth.user) return auth.avatarSrc;
  const cached = getUsername();
  return cached ? letterAvatar(cached) : '/img/favicon.ico';
});

/** 退出登录：清空登录态并提示成功 */
function handleLogout() {
  auth.logout();
  showToast('已退出登录', 'success');
}

/** 页面挂载后，已登录用户拉取最新个人资料 */
onMounted(() => {
  if (auth.isLoggedIn) auth.fetchProfile();
});
</script>

<style scoped>
/* ====== 首页独有：导航栏用户信息 ====== */
.user-info {
  display: flex !important;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}

.user-avatar {
  display: block;
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid rgba(255, 255, 255, 0.55);
  transition: border-color 0.25s, transform 0.25s;
}

.user-info:hover .user-avatar {
  border-color: var(--brand-2);
  transform: scale(1.08);
}

.user-name {
  color: #fff;
  font-size: inherit;
  font-family: inherit;
  line-height: 1;
  white-space: nowrap;
}

.user-info:hover .user-name {
  color: var(--brand-2);
}
</style>
