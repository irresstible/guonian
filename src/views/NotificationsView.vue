<template>
  <PageShell :nav-items="navItems">
    <section class="notif wrapper">
      <div class="shell-card notif__panel">
        <!-- 标题与全部已读操作区 -->
        <div class="notif__head">
          <h1 class="notif__title">
            消息通知
          </h1>
          <button
            v-if="store.unread > 0"
            type="button"
            class="notif__read-all"
            @click="markAll"
          >
            全部已读
          </button>
        </div>

        <!-- 通知列表区（加载中 / 空态 / 列表） -->
        <div
          v-if="store.loading"
          class="notif__empty"
        >
          加载中...
        </div>
        <div
          v-else-if="store.list.length === 0"
          class="notif__empty"
        >
          暂无通知
        </div>
        <ul
          v-else
          class="notif__list"
        >
          <li
            v-for="n in store.list"
            :key="n.id"
            class="notif__item"
            :class="{ unread: !n.read }"
          >
            <span
              v-if="!n.read"
              class="notif__dot"
              aria-label="未读"
            />
            <div class="notif__body">
              <p class="notif__text">
                <strong>{{ n.fromName }}</strong>
                {{ n.type === 'like' ? ' 赞了你的' : ' 评论了你的' }}
                {{ n.wishType === 'wish' ? '许愿' : '祝福' }}
              </p>
              <p class="notif__excerpt">
                "{{ n.excerpt }}"
              </p>
              <time class="notif__time">{{ n.createdAt }}</time>
            </div>
            <button
              v-if="!n.read"
              type="button"
              class="notif__mark"
              @click="markOne(n.id)"
            >
              标为已读
            </button>
          </li>
        </ul>
      </div>
    </section>
  </PageShell>
</template>

<script setup>
/**
 * @file 消息通知：点赞/评论通知列表与已读操作
 * @description 挂载时通过 notifications store 拉取通知，支持单条标为已读与全部已读；
 * 依赖 notifications store 与 PageShell 组件
 */
import { onMounted } from 'vue';
import { useNotificationsStore } from '@/stores/notifications';
import PageShell from '@/components/PageShell.vue';

const store = useNotificationsStore();

/** 顶部导航项配置 */
const navItems = [
  { text: '返回首页', to: '/' },
  { text: '消息通知', active: true },
];

/** 页面挂载时拉取通知列表 */
onMounted(async () => {
  await store.fetchList();
});

/**
 * 将单条通知标为已读
 * @param {string|number} id 通知 ID
 */
async function markOne(id) {
  await store.markRead([id]);
}

/** 将全部未读通知标为已读（store 内部读取当前未读列表） */
async function markAll() {
  await store.markRead();
}
</script>

<style scoped>
/* ====== 页面容器与面板 ====== */
.notif {
  width: 100%;
  padding: 20px 0 40px;
}

.notif__panel {
  max-width: 680px;
  margin: 0 auto;
  padding: 28px 24px;
  color: #fff;
}

/* ====== 标题与“全部已读”操作区 ====== */
.notif__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.notif__title {
  font-size: 22px;
  font-weight: 700;
}

.notif__read-all {
  padding: 6px 14px;
  font-size: 13px;
  color: var(--brand-soft);
  background: rgba(196, 86, 32, 0.14);
  border: 1px solid rgba(196, 86, 32, 0.45);
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.25s;
}

.notif__read-all:hover {
  color: #fff;
  background: var(--brand-1);
}

/* ====== 通知列表与单条通知 ====== */
.notif__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notif__item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  transition: border-color 0.25s;
}

.notif__item.unread {
  border-color: rgba(232, 131, 74, 0.4);
  background: rgba(196, 86, 32, 0.08);
}

.notif__dot {
  flex: none;
  width: 8px;
  height: 8px;
  margin-top: 6px;
  border-radius: 50%;
  background: #e74c3c;
}

.notif__body {
  flex: 1;
  min-width: 0;
}

.notif__text {
  font-size: 14px;
  color: var(--text-2);
  line-height: 1.6;
}

.notif__text strong {
  color: #fff;
}

.notif__excerpt {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notif__time {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-3);
}

.notif__mark {
  flex: none;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--text-2);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.notif__mark:hover {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.4);
}

/* ====== 加载中与空态提示 ====== */
.notif__empty {
  text-align: center;
  color: var(--text-3);
  font-size: 14px;
  padding: 40px 0;
}
</style>
