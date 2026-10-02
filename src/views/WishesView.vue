<template>
  <PageShell :nav-items="navItems">
    <section class="wishes wrapper">
      <div class="shell-card wishes__panel">
        <h1 class="wishes__title">
          祝福许愿墙
        </h1>

        <!-- 分类标签与搜索区 -->
        <div class="wishes__toolbar">
          <div
            class="wishes__tabs"
            role="tablist"
            aria-label="内容分类"
          >
            <button
              v-for="t in tabs"
              :key="t.value"
              type="button"
              role="tab"
              class="wishes__tab"
              :class="{ active: store.activeTab === t.value }"
              :aria-selected="store.activeTab === t.value"
              @click="switchTab(t.value)"
            >
              {{ t.label }}
            </button>
          </div>
          <input
            v-model="searchInput"
            type="search"
            class="wishes__search"
            placeholder="搜索内容..."
            aria-label="搜索祝福或许愿"
          >
        </div>

        <!-- 发布区（登录可见） -->
        <WishComposer
          v-if="auth.isLoggedIn"
          :sending="sending"
          @submit="handleCreate"
        />
        <p
          v-else
          class="wishes__login-tip"
        >
          <RouterLink to="/login">
            登录
          </RouterLink> 后即可发布祝福与许愿
        </p>

        <!-- 内容列表区（加载中 / 空态 / 列表） -->
        <div
          v-if="store.loading"
          class="wishes__empty"
        >
          加载中...
        </div>
        <div
          v-else-if="store.filtered.length === 0"
          class="wishes__empty"
        >
          {{ store.keyword ? '没有找到相关内容' : '还没有内容,来发第一条吧~' }}
        </div>
        <div
          v-else
          class="wishes__list"
        >
          <WishCard
            v-for="w in store.filtered"
            :key="w.id"
            :wish="w"
            @like="handleLike"
            @comment="handleComment"
            @delete="handleDelete"
            @delete-comment="handleDeleteComment"
          />
        </div>
      </div>
    </section>
  </PageShell>
</template>

<script setup>
/**
 * @file 祝福许愿墙：祝福/许愿内容的发布、浏览、点赞、评论与删除
 * @description 通过 wishes store 拉取与操作数据，支持分类切换与关键词搜索（300ms 防抖）；
 * 发布需登录，内容校验在 WishComposer 内完成；依赖 auth、wishes store 及
 * PageShell、WishComposer、WishCard 组件
 */
import { ref, onMounted, watch } from 'vue';
import { showToast } from '@/utils/toast';
import { useAuthStore } from '@/stores/auth';
import { useWishesStore } from '@/stores/wishes';
import PageShell from '@/components/PageShell.vue';
import WishComposer from '@/components/WishComposer.vue';
import WishCard from '@/components/WishCard.vue';

const auth = useAuthStore();
const store = useWishesStore();

/** 顶部导航项配置 */
const navItems = [
  { text: '返回首页', to: '/' },
  { text: '祝福许愿墙', active: true },
];

/** 分类标签定义：blessing 祝福 / wish 许愿 */
const tabs = [
  { label: '祝福', value: 'blessing' },
  { label: '许愿', value: 'wish' },
];

/** 搜索框输入值 */
const searchInput = ref('');
/** 发布请求是否进行中（用于禁用发布框） */
const sending = ref(false);
/** 搜索防抖计时器 */
let debounceTimer = null;

/** 监听搜索输入：防抖 300ms 后写入关键词并重新拉取列表 */
watch(searchInput, (v) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    store.keyword = v;
    store.fetchWishes();
  }, 300);
});

/**
 * 切换祝福/许愿分类：点击当前分类时不重复请求
 * @param {'blessing'|'wish'} value 目标分类值
 */
function switchTab(value) {
  if (store.activeTab === value) return;
  store.activeTab = value;
  store.fetchWishes();
}

/**
 * 发布祝福或许愿：调用 store 提交，成功后提示，且当发布类型与当前分类不同时自动切换过去
 * @param {{type: string, content: string}} payload 发布内容（类型与正文，校验由 WishComposer 完成）
 */
async function handleCreate(payload) {
  sending.value = true;
  try {
    const data = await store.createWish(payload);
    if (data.code === 200) {
      showToast('发布成功', 'success');
      if (store.activeTab !== payload.type) {
        store.activeTab = payload.type;
        store.fetchWishes();
      }
    } else {
      showToast(data.msg || '发布失败', 'error');
    }
  } catch {
    showToast('网络错误', 'error');
  } finally {
    sending.value = false;
  }
}

/**
 * 点赞/取消点赞：未登录时提示先登录，失败时弹出后端消息
 * @param {string|number} id 祝福或许愿内容 ID
 */
async function handleLike(id) {
  if (!auth.isLoggedIn) {
    showToast('请先登录', 'info');
    return;
  }
  const data = await store.toggleLike(id);
  if (data.code !== 200) showToast(data.msg || '操作失败', 'error');
}

/**
 * 发表评论：成功后执行 done 回调（由子组件清空输入）并提示
 * @param {string|number} id 被评论内容的 ID
 * @param {string} content 评论正文
 * @param {() => void} done 评论成功后的收尾回调
 */
async function handleComment(id, content, done) {
  const data = await store.addComment(id, content);
  if (data.code === 200) {
    done();
    showToast('评论成功', 'success');
  } else {
    showToast(data.msg || '评论失败', 'error');
  }
}

/**
 * 删除自己发布的祝福或许愿
 * @param {string|number} id 内容 ID
 */
async function handleDelete(id) {
  const data = await store.removeWish(id);
  if (data.code === 200) {
    showToast('已删除', 'success');
  } else {
    showToast(data.msg || '删除失败', 'error');
  }
}

/**
 * 删除评论（仅限自己的评论）
 * @param {string|number} wishId 评论所属内容的 ID
 * @param {string|number} commentId 评论 ID
 */
async function handleDeleteComment(wishId, commentId) {
  const data = await store.removeComment(wishId, commentId);
  if (data.code === 200) {
    showToast('评论已删除', 'success');
  } else {
    showToast(data.msg || '删除失败', 'error');
  }
}

/** 页面挂载时拉取首屏祝福许愿列表 */
onMounted(() => {
  store.fetchWishes();
});
</script>

<style scoped>
/* ====== 页面容器与面板 ====== */
.wishes {
  width: 100%;
  padding: 20px 0 40px;
}

.wishes__panel {
  max-width: 760px;
  margin: 0 auto;
  padding: 32px 28px;
  color: #fff;
}

.wishes__title {
  font-size: 26px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 24px;
  background: var(--brand-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* ====== 分类标签与搜索栏 ====== */
.wishes__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.wishes__tabs {
  display: flex;
  gap: 8px;
}

.wishes__tab {
  padding: 8px 20px;
  font-size: 14px;
  color: var(--text-2);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border);
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.25s;
}

.wishes__tab:hover {
  border-color: rgba(196, 86, 32, 0.5);
}

.wishes__tab.active {
  color: #fff;
  background: var(--brand-gradient);
  border-color: transparent;
  box-shadow: var(--shadow-brand);
}

.wishes__search {
  flex: 1;
  min-width: 160px;
  max-width: 260px;
  padding: 8px 14px;
  font-size: 14px;
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border);
  border-radius: 999px;
  outline: none;
  transition: border-color 0.2s;
}

.wishes__search:focus {
  border-color: var(--brand-1);
}

.wishes__search::placeholder {
  color: var(--text-3);
}

/* ====== 未登录提示 ====== */
.wishes__login-tip {
  text-align: center;
  font-size: 14px;
  color: var(--text-2);
  padding: 16px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--radius);
  margin-bottom: 16px;
}

.wishes__login-tip a {
  color: var(--brand-2);
}

/* ====== 内容列表与空态 ====== */
.wishes__list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.wishes__empty {
  text-align: center;
  color: var(--text-3);
  font-size: 14px;
  padding: 40px 0;
}

/* ====== 移动端响应式 ====== */
@media (max-width: 600px) {
  .wishes__panel {
    padding: 24px 16px;
  }
  .wishes__toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .wishes__search {
    max-width: none;
  }
}
</style>
