<template>
  <button
    type="button"
    class="notif-bell"
    :aria-label="`消息通知,${unread} 条未读`"
    @click="go"
  >
    <svg
      viewBox="0 0 24 24"
      class="notif-bell__icon"
      aria-hidden="true"
    >
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5S10.5 3.17 10.5 4v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
    <span
      v-if="unread > 0"
      class="notif-bell__badge"
    >{{ badgeText }}</span>
  </button>
</template>

<script setup>
/**
 * @file 消息通知铃铛：展示未读数徽标，点击跳转通知页，挂载后轮询未读数
 */
import { computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useNotificationsStore } from '@/stores/notifications';

const router = useRouter();
const store = useNotificationsStore();

/** 未读消息数 */
const unread = computed(() => store.unread);
/** 徽标展示文案，超过 99 时折叠为 99+ */
const badgeText = computed(() => (unread.value > 99 ? '99+' : String(unread.value)));

/** 点击铃铛跳转通知中心 */
function go() {
  router.push('/notifications');
}

/** 挂载时拉取一次未读数，并启动 30 秒轮询 */
onMounted(() => {
  store.fetchUnread();
  store.startPolling(30000);
});

/** 卸载时停止轮询，避免无效请求 */
onUnmounted(() => {
  store.stopPolling();
});
</script>

<style scoped>
/* ====== 铃铛按钮：圆形图标按钮，作为徽标的定位上下文 ====== */
.notif-bell {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 50%;
  transition: background 0.25s;
}

.notif-bell:hover {
  background: rgba(255, 255, 255, 0.12);
}

.notif-bell__icon {
  width: 20px;
  height: 20px;
  fill: #fff;
  transition: fill 0.25s;
}

.notif-bell:hover .notif-bell__icon {
  fill: var(--brand-2);
}

/* ====== 未读徽标：绝对定位挂在右上角，全圆角胶囊并描深色边与背景拉开层次 ====== */
.notif-bell__badge {
  position: absolute;
  top: 0;
  right: -2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: #e74c3c;
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
  font-weight: 600;
  box-shadow: 0 0 0 2px rgba(26, 18, 16, 0.9);
}
</style>
