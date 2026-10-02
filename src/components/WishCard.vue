<template>
  <article class="wish-card">
    <!-- 卡片头部：作者信息与删除入口 -->
    <header class="wish-card__head">
      <img
        :src="avatarSrc"
        :alt="wish.author.name"
        class="wish-card__avatar avatar-frame"
      >
      <div class="wish-card__meta">
        <div class="wish-card__name-row">
          <span class="wish-card__name">{{ wish.author.name }}</span>
          <span
            class="wish-card__badge"
            :class="`wish-card__badge--${wish.type}`"
          >
            {{ wish.type === 'wish' ? '许愿' : '祝福' }}
          </span>
        </div>
        <time class="wish-card__time">{{ wish.createdAt }}</time>
      </div>
      <button
        v-if="isMine"
        type="button"
        class="wish-card__del"
        title="删除"
        aria-label="删除这条内容"
        @click="confirmRef?.open()"
      >
        &times;
      </button>
    </header>

    <!-- 正文 -->
    <p class="wish-card__content">
      {{ wish.content }}
    </p>

    <!-- 底部操作栏：点赞 / 评论 -->
    <footer class="wish-card__foot">
      <button
        type="button"
        class="wish-card__action"
        :class="{ 'is-liked': wish.likedByMe }"
        :aria-pressed="wish.likedByMe"
        :aria-label="`点赞,当前 ${wish.likeCount} 赞`"
        @click="$emit('like', wish.id)"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
        <span>{{ wish.likeCount }}</span>
      </button>
      <button
        type="button"
        class="wish-card__action"
        :aria-expanded="commentOpen"
        :aria-label="`评论,共 ${wish.comments.length} 条`"
        @click="commentOpen = !commentOpen"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        </svg>
        <span>{{ wish.comments.length }}</span>
      </button>
    </footer>

    <!-- 评论区 -->
    <div
      v-if="commentOpen"
      class="wish-card__comments"
    >
      <!-- 评论列表 -->
      <div
        v-for="c in wish.comments"
        :key="c.id"
        class="comment"
      >
        <div class="comment__main">
          <span class="comment__author">{{ c.authorName }}:</span>
          <span class="comment__text">{{ c.content }}</span>
        </div>
        <button
          v-if="canDeleteComment(c)"
          type="button"
          class="comment__del"
          title="删除评论"
          aria-label="删除这条评论"
          @click.stop="askDeleteComment(c.id)"
        >
          删除
        </button>
      </div>
      <!-- 评论输入区（登录后可见） -->
      <div
        v-if="auth.isLoggedIn"
        class="comment__input-row"
      >
        <input
          v-model="commentText"
          type="text"
          class="comment__input"
          maxlength="100"
          placeholder="写下你的评论..."
          @keydown.enter="submitComment"
        >
        <button
          type="button"
          class="comment__send"
          :disabled="!commentText.trim()"
          @click="submitComment"
        >
          发送
        </button>
      </div>
      <!-- 未登录提示 -->
      <p
        v-else
        class="comment__tip"
      >
        <RouterLink to="/login">
          登录
        </RouterLink> 后参与评论
      </p>
    </div>

    <!-- 删除确认弹窗：删除内容 / 删除评论 -->
    <ConfirmDialog
      ref="confirmRef"
      title="删除"
      message="确定删除这条内容吗?相关的点赞和评论也会一并删除。"
      @confirm="$emit('delete', wish.id)"
    />
    <ConfirmDialog
      ref="commentConfirmRef"
      title="删除评论"
      message="确定删除这条评论吗?"
      @confirm="confirmDeleteComment"
    />
  </article>
</template>

<script setup>
/**
 * @file 心愿 / 祝福卡片：展示作者、正文、点赞与评论，并支持本人删除内容 / 评论
 * @description Props：wish 单条内容对象；
 *              Emits：like 点赞 (内容 id)、comment 评论 (内容 id, 文本, 成功回调)、
 *              delete 删内容 (内容 id)、delete-comment 删评论 (内容 id, 评论 id)
 */
import { ref, computed } from 'vue';
import { letterAvatar } from '@/utils/avatar';
import { useAuthStore } from '@/stores/auth';
import ConfirmDialog from '@/components/ConfirmDialog.vue';

const props = defineProps({
  /** 单条心愿 / 祝福数据（作者、正文、点赞数、评论列表等） */
  wish: { type: Object, required: true },
});
const emit = defineEmits(['like', 'comment', 'delete', 'delete-comment']);

const auth = useAuthStore();
/** 删除内容确认弹窗实例 */
const confirmRef = ref(null);
/** 删除评论确认弹窗实例 */
const commentConfirmRef = ref(null);
/** 评论区是否展开 */
const commentOpen = ref(false);
/** 评论输入框文本 */
const commentText = ref('');
/** 待删除的评论 id（确认弹窗点击确定后使用） */
const pendingCommentId = ref(null);

/** 头像地址：无自定义头像时退化为用户名文字头像 */
const avatarSrc = computed(() => props.wish.author.avatar || letterAvatar(props.wish.author.name));
/** 当前内容是否为登录用户本人发布 */
const isMine = computed(() => auth.user && auth.user.id === props.wish.author.id);

/**
 * 判断当前用户能否删除指定评论（评论作者本人或楼主均可）
 * @param {object} c 评论对象
 * @returns {boolean} 是否可删
 */
function canDeleteComment(c) {
  return auth.isLoggedIn && auth.user && (c.authorId === auth.user.id || isMine.value);
}

/**
 * 记录待删除评论并打开删除确认弹窗
 * @param {string|number} commentId 评论 id
 */
function askDeleteComment(commentId) {
  pendingCommentId.value = commentId;
  commentConfirmRef.value?.open();
}

/** 确认删除评论：抛出 delete-comment 事件后清空待删 id */
function confirmDeleteComment() {
  if (pendingCommentId.value) {
    emit('delete-comment', props.wish.id, pendingCommentId.value);
    pendingCommentId.value = null;
  }
}

/** 提交评论：文本非空时抛出 comment 事件，由父组件处理成功后回调清空输入框 */
function submitComment() {
  const text = commentText.value.trim();
  if (!text) return;
  emit('comment', props.wish.id, text, () => {
    commentText.value = '';
  });
}
</script>

<style scoped>
/* ====== 卡片容器：入场时淡入并向上位移 ====== */
.wish-card {
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  animation: fadePanel 0.4s ease;
}

@keyframes fadePanel {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ====== 头部：头像 + 作者信息 + 删除按钮横向排列 ====== */
.wish-card__head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.wish-card__avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  flex: none;
}

.wish-card__meta {
  flex: 1;
  min-width: 0;
}

.wish-card__name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.wish-card__name {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}

.wish-card__badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  line-height: 1.4;
}

/* ====== 类型徽标：祝福 / 许愿两套配色 ====== */
.wish-card__badge--blessing {
  color: var(--brand-soft);
  background: rgba(196, 86, 32, 0.18);
  border: 1px solid rgba(196, 86, 32, 0.45);
}

.wish-card__badge--wish {
  color: #8ad8ff;
  background: rgba(3, 233, 244, 0.12);
  border: 1px solid rgba(3, 233, 244, 0.4);
}

.wish-card__time {
  font-size: 12px;
  color: var(--text-3);
}

.wish-card__del {
  flex: none;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-3);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s;
}

.wish-card__del:hover {
  color: #fff;
  background: rgba(231, 76, 60, 0.3);
}

/* ====== 正文：保留换行、长词断行防止溢出 ====== */
.wish-card__content {
  margin: 14px 0;
  color: #fff;
  font-size: 15px;
  line-height: 1.7;
  word-break: break-word;
  white-space: pre-wrap;
}

/* ====== 底部操作按钮：点赞 / 评论，已点赞态 is-liked 变红 ====== */
.wish-card__foot {
  display: flex;
  gap: 20px;
}

.wish-card__action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: none;
  background: transparent;
  color: var(--text-2);
  font-size: 14px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.25s;
}

.wish-card__action svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.wish-card__action:hover {
  color: var(--brand-2);
  background: rgba(196, 86, 32, 0.12);
}

.wish-card__action.is-liked {
  color: #e74c3c;
}

.wish-card__action.is-liked:hover {
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.12);
}

/* ====== 评论区：虚线与正文分隔，含评论列表、输入行与未登录提示 ====== */
.wish-card__comments {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed rgba(255, 255, 255, 0.12);
}

.comment {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-2);
  word-break: break-word;
}

.comment__main {
  min-width: 0;
}

.comment__author {
  color: var(--brand-soft);
  margin-right: 4px;
}

.comment__del {
  flex: none;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-3);
  font-size: 12px;
  cursor: pointer;
  transition: color 0.2s;
}

.comment__del:hover {
  color: #e74c3c;
}

.comment__input-row {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.comment__input {
  flex: 1;
  padding: 8px 12px;
  font-size: 13px;
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color 0.2s;
}

.comment__input:focus {
  border-color: var(--brand-1);
}

.comment__send {
  padding: 8px 16px;
  border: none;
  border-radius: var(--radius-sm);
  color: #fff;
  font-size: 13px;
  background: var(--brand-gradient);
  cursor: pointer;
  transition: opacity 0.2s;
}

.comment__send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.comment__tip {
  margin-top: 10px;
  font-size: 13px;
  color: var(--text-3);
}

.comment__tip a {
  color: var(--brand-2);
}
</style>
