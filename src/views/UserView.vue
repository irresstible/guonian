<template>
  <PageShell :nav-items="navItems">
    <!-- 个人资料面板 -->
    <div
      v-show="activeTab === 'profile'"
      class="tab-panel active"
    >
      <div class="profile-section wrapper">
        <!-- 头像与基本信息区 -->
        <div class="profile-card">
          <div class="avatar-wrap">
            <div class="avatar avatar-frame">
              <span v-if="!auth.user?.avatar">{{ avatarLetter }}</span>
              <img
                v-else
                :src="auth.user.avatar"
                class="avatar__img"
                alt="用户头像"
              >
            </div>
            <button
              type="button"
              class="avatar-edit"
              aria-label="更换头像"
              title="更换头像"
              @click="openEditModal"
            >
              <svg viewBox="0 0 24 24"><path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z" /></svg>
            </button>
          </div>
          <div class="profile-info">
            <div class="profile-title-row">
              <h2 class="profile-name">
                {{ displayName }}
              </h2>
              <button
                type="button"
                class="edit-profile-btn"
                @click="openEditModal"
              >
                <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                编辑资料
              </button>
            </div>
            <p class="profile-meta">
              账号：<span>{{ auth.user?.username || '-' }}</span>
            </p>
            <p class="profile-meta">
              手机号：<span>{{ maskedPhone }}</span>
            </p>
            <p class="profile-meta">
              性别：<span>{{ genderText }}</span>
            </p>
            <p class="profile-meta">
              注册时间：<span>{{ auth.user?.createdAt || '****' }}</span>
            </p>
            <p class="profile-desc">
              {{ auth.user?.bio || DEFAULT_BIO }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 我的发布面板：集中管理自己的祝福/许愿及评论 -->
    <div
      v-show="activeTab === 'content'"
      class="tab-panel"
    >
      <div class="manage-section wrapper">
        <div class="shell-card manage-panel">
          <div class="manage-head">
            <h2>我的发布</h2>
            <RouterLink
              to="/wishes"
              class="manage-link"
            >
              去祝福墙发布 →
            </RouterLink>
          </div>
          <p class="manage-stat">
            共 {{ myWishes.length }} 条（祝福 {{ blessCount }} · 许愿 {{ wishCount }}）
          </p>

          <!-- 加载中 / 空态 / 发布列表 -->
          <div
            v-if="contentLoading"
            class="manage-empty"
          >
            加载中...
          </div>
          <div
            v-else-if="myWishes.length === 0"
            class="manage-empty"
          >
            还没有发布过内容，
            <RouterLink to="/wishes">
              去发布第一条
            </RouterLink>
          </div>
          <ul
            v-else
            class="wm-list"
          >
            <li
              v-for="w in myWishes"
              :key="w.id"
              class="wm-item"
            >
              <div class="wm-meta">
                <span
                  class="wm-tag"
                  :class="{ 'wm-tag--wish': w.type === 'wish' }"
                >{{ w.type === 'wish' ? '许愿' : '祝福' }}</span>
                <span class="wm-time">{{ w.createdAt }}</span>
                <span class="wm-stats">{{ w.likeCount }} 赞 · {{ w.comments.length }} 评论</span>
              </div>
              <p class="wm-content">
                {{ w.content }}
              </p>
              <div class="wm-actions">
                <button
                  type="button"
                  class="wm-btn"
                  @click="toggleComments(w.id)"
                >
                  {{ expanded[w.id] ? '收起评论' : `查看评论 (${w.comments.length})` }}
                </button>
                <button
                  type="button"
                  class="wm-btn wm-btn--danger"
                  @click="askDeleteWish(w)"
                >
                  删除发布
                </button>
              </div>

              <!-- 评论管理区：楼主可删除任意评论 -->
              <ul
                v-if="expanded[w.id]"
                class="cm-list"
              >
                <li
                  v-for="c in w.comments"
                  :key="c.id"
                  class="cm-item"
                >
                  <div class="cm-body">
                    <span class="cm-author">{{ c.authorName }}</span>
                    <span class="cm-text">{{ c.content }}</span>
                    <span class="cm-time">{{ c.createdAt }}</span>
                  </div>
                  <button
                    type="button"
                    class="wm-btn wm-btn--danger wm-btn--sm"
                    @click="askDeleteComment(w, c)"
                  >
                    删除
                  </button>
                </li>
                <li
                  v-if="w.comments.length === 0"
                  class="cm-empty"
                >
                  暂无评论
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 我的相册面板：集中上传与删除自己的图片 -->
    <div
      v-show="activeTab === 'album'"
      class="tab-panel"
    >
      <div class="manage-section wrapper">
        <div class="shell-card manage-panel">
          <div class="manage-head">
            <h2>我的相册</h2>
            <button
              type="button"
              class="manage-upload-btn"
              :disabled="uploading"
              @click="albumInputRef?.click()"
            >
              {{ uploading ? '上传中...' : '＋ 上传图片' }}
            </button>
            <input
              ref="albumInputRef"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              @change="onAlbumFileChange"
            >
          </div>
          <p class="manage-stat">
            共 {{ myAlbum.length }} 张，仅展示你上传的图片；支持 JPG/PNG/WEBP，最大 5MB
          </p>

          <!-- 加载中 / 空态 / 图片网格 -->
          <div
            v-if="album.loading"
            class="manage-empty"
          >
            加载中...
          </div>
          <div
            v-else-if="myAlbum.length === 0"
            class="manage-empty"
          >
            还没有上传过图片，点击右上角上传第一张吧
          </div>
          <div
            v-else
            class="am-grid"
          >
            <figure
              v-for="img in myAlbum"
              :key="img.id"
              class="am-item"
              @click="openLightbox(img.src)"
            >
              <img
                :src="img.src"
                :alt="img.name"
                loading="lazy"
              >
              <figcaption>{{ img.name }}</figcaption>
              <button
                type="button"
                class="am-del"
                title="删除图片"
                aria-label="删除这张图片"
                @click.stop="askDeleteImage(img)"
              >
                &times;
              </button>
            </figure>
          </div>
        </div>
      </div>
    </div>

    <!-- 账号设置面板 -->
    <div
      v-show="activeTab === 'settings'"
      class="tab-panel active"
    >
      <div class="text-content wrapper">
        <div class="text-content__container settings-grid">
          <div class="settings-item">
            <h2>修改密码</h2>
            <p>
              <RouterLink
                to="/reset"
                class="action-link"
              >
                点击重置密码
              </RouterLink>
            </p>
          </div>
          <div class="settings-item">
            <h2>帮助中心</h2>
            <p>
              <RouterLink
                to="/help"
                class="action-link"
              >
                常见问题与联系客服
              </RouterLink>
            </p>
          </div>
          <div class="settings-item">
            <h2>登录历史</h2>
            <ul class="login-history">
              <li
                v-for="(h, i) in loginHistory"
                :key="i"
                class="login-history__item"
              >
                <span class="login-history__time">{{ h.time }}</span>
                <span class="login-history__ua">{{ shortUa(h.ua) }}</span>
              </li>
              <li
                v-if="!loginHistory.length"
                class="login-history__empty"
              >
                暂无登录记录
              </li>
            </ul>
          </div>
          <div class="settings-item">
            <h2>注销账号</h2>
            <p>
              <a
                href="#"
                class="action-link action-link--danger"
                @click.prevent="askDeleteAccount"
              >
                永久注销账号
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  </PageShell>

  <!-- 编辑资料弹窗 -->
  <Teleport to="body">
    <div
      v-if="editVisible"
      class="modal-mask"
      :class="{ show: editShown }"
      @click.self="closeEditModal"
    >
      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editModalTitle"
      >
        <div class="modal__header">
          <h3 id="editModalTitle">
            编辑个人资料
          </h3>
          <button
            type="button"
            class="modal__close"
            aria-label="关闭"
            @click="closeEditModal"
          >
            &times;
          </button>
        </div>
        <div class="modal__body">
          <!-- 头像上传区：支持点击与拖拽 -->
          <div
            class="avatar-uploader"
            :class="{ 'is-dragover': dragover }"
            @click="avatarInputRef?.click()"
            @dragenter.prevent.stop="dragover = true"
            @dragover.prevent.stop="dragover = true"
            @dragleave.prevent.stop="dragover = false"
            @drop.prevent.stop="onDrop"
          >
            <div class="avatar avatar--lg">
              <span v-if="!previewAvatar">{{ previewLetter }}</span>
              <img
                v-else
                :src="previewAvatar"
                class="avatar__img"
                alt="头像预览"
              >
              <div class="avatar-uploader__mask">
                <svg viewBox="0 0 24 24"><path d="M19 7v2.99s-1.99.01-2 0V7h-3s.01-1.99 0-2h3V2h2v3h3v2h-3zm-3 4V8h-3V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8h-3zM5 19l3-4 2 3 3-4 4 5H5z" /></svg>
                <span>更换头像</span>
              </div>
            </div>
            <p class="avatar-uploader__hint">
              点击或拖拽图片到此（JPG / PNG / WEBP，≤5MB，自动裁剪压缩）
            </p>
            <button
              v-if="showRemoveBtn"
              type="button"
              class="avatar-uploader__remove"
              @click.stop="handleRemoveAvatar"
            >
              移除头像
            </button>
            <input
              ref="avatarInputRef"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              @change="onFileChange"
            >
          </div>

          <div class="form-group">
            <label for="editNickname">昵称</label>
            <input
              id="editNickname"
              v-model="editNickname"
              type="text"
              class="form-input"
              maxlength="16"
              placeholder="未设置时显示登录账号"
            >
          </div>

          <div class="form-group">
            <label>性别</label>
            <div class="gender-group">
              <label class="gender-option">
                <input
                  v-model="editGender"
                  type="radio"
                  name="gender"
                  value="male"
                >
                <span>男</span>
              </label>
              <label class="gender-option">
                <input
                  v-model="editGender"
                  type="radio"
                  name="gender"
                  value="female"
                >
                <span>女</span>
              </label>
              <label class="gender-option">
                <input
                  v-model="editGender"
                  type="radio"
                  name="gender"
                  value="secret"
                >
                <span>保密</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label for="editBio">个人简介</label>
            <textarea
              id="editBio"
              v-model="editBio"
              class="form-input form-textarea"
              maxlength="100"
              rows="3"
              placeholder="介绍一下自己吧～"
            />
            <div class="char-counter">
              <span>{{ editBio.length }}</span>/100
            </div>
          </div>
        </div>
        <div class="modal__footer">
          <button
            type="button"
            class="btn btn--ghost"
            @click="closeEditModal"
          >
            取消
          </button>
          <button
            type="button"
            class="btn btn--primary"
            :disabled="isSaving"
            @click="saveProfile"
          >
            {{ isSaving ? '保存中...' : '保存修改' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 退出登录确认弹窗 -->
  <ConfirmDialog
    ref="confirmRef"
    title="退出登录"
    message="确定要退出登录吗?"
    @confirm="doLogout"
  />

  <!-- 注销账号确认弹窗 -->
  <ConfirmDialog
    ref="deleteConfirmRef"
    title="注销账号"
    message="注销后账号、发布的祝福许愿、点赞评论及通知都将永久删除且不可恢复。确定继续吗?"
    @confirm="doDeleteAccount"
  />

  <!-- 发布/评论/图片管理的通用删除确认弹窗 -->
  <ConfirmDialog
    ref="manageConfirmRef"
    :title="pendingManage?.title || '删除'"
    :message="pendingManage?.message || ''"
    @confirm="confirmManage"
  />

  <!-- 相册大图灯箱弹窗 -->
  <LightboxModal
    v-model="lightboxShow"
    :src="lightboxSrc"
  />
</template>

<script setup>
/**
 * @file 用户中心：个人资料、我的发布、我的相册与账号设置的集中管理页
 * @description 四个标签面板：资料（头像裁剪压缩上传、昵称/性别/简介编辑）、
 * 我的发布（删除自己的祝福/许愿、楼主删除任意评论）、我的相册（上传/灯箱/删除自己的图片）、
 * 设置（重置密码入口、帮助中心、本地登录历史、注销账号）；需登录，由路由守卫保证，
 * 401 由全局处理器接管；依赖 auth/wishes/album store 及 PageShell、ConfirmDialog、LightboxModal 组件
 */
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { apiGetPublic, apiPut, apiDelete } from '@/utils/api';
import { showToast } from '@/utils/toast';
import { getLoginHistory, clearLoginHistory } from '@/utils/storage';
import { useAuthStore } from '@/stores/auth';
import { useAlbumStore } from '@/stores/album';
import { compressImage } from '@/utils/compressImage';
import PageShell from '@/components/PageShell.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import LightboxModal from '@/components/LightboxModal.vue';

/** 性别字段值到中文文案的映射 */
const GENDER_TEXT = { male: '男', female: '女', secret: '保密' };
/** 个人简介为空时展示的默认文案 */
const DEFAULT_BIO = '热爱新年文化，喜欢分享节日祝福和年俗故事。';

const router = useRouter();
const auth = useAuthStore();
const album = useAlbumStore();

/** 当前激活的标签面板：profile 个人资料 / content 我的发布 / album 我的相册 / settings 账号设置 */
const activeTab = ref('profile');

/** 顶部导航项：回首页、切换四个标签面板、唤起退出登录确认弹窗 */
const navItems = computed(() => [
  { text: '返回首页', to: '/' },
  { text: '个人资料', active: activeTab.value === 'profile', onClick: () => (activeTab.value = 'profile') },
  { text: '我的发布', active: activeTab.value === 'content', onClick: () => (activeTab.value = 'content') },
  { text: '我的相册', active: activeTab.value === 'album', onClick: () => (activeTab.value = 'album') },
  { text: '账号设置', active: activeTab.value === 'settings', onClick: () => (activeTab.value = 'settings') },
  { text: '退出登录', onClick: () => confirmRef.value?.open() },
]);

/**
 * 资料卡展示名：优先昵称，其次登录账号，资料未加载时显示“加载中...”
 * @returns {string} 展示名称
 */
const displayName = computed(() => (auth.user ? auth.user.nickname || auth.user.username : '加载中...'));
/**
 * 无头像图片时展示的首字母（昵称或账号首字符大写）
 * @returns {string} 单个大写字母
 */
const avatarLetter = computed(() =>
  (auth.user ? auth.user.nickname || auth.user.username : 'U').charAt(0).toUpperCase()
);
/**
 * 脱敏后的手机号（中间四位以 **** 代替）
 * @returns {string} 形如 138****1234，无手机号时返回 ****
 */
const maskedPhone = computed(() => {
  const p = auth.user?.phone;
  return p ? p.substring(0, 3) + '****' + p.substring(7) : '****';
});
/**
 * 性别的中文文案
 * @returns {string} 男 / 女 / 保密
 */
const genderText = computed(() => GENDER_TEXT[auth.user?.gender] || '保密');

/**
 * 页面挂载：拉取个人资料（未登录则稍后跳登录页）、读取本地登录历史，
 * 并绑定 Esc 关闭弹窗与全局拖拽拦截
 */
onMounted(async () => {
  await auth.fetchProfile();
  if (!auth.isLoggedIn) {
    setTimeout(() => router.push('/login'), 800);
  }
  loginHistory.value = getLoginHistory();
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('dragover', preventDocDrag);
  document.addEventListener('drop', preventDocDrag);
});

/** 页面卸载：移除挂载时注册的全局事件监听 */
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
  document.removeEventListener('dragover', preventDocDrag);
  document.removeEventListener('drop', preventDocDrag);
});

/**
 * 键盘事件：编辑弹窗打开时按 Esc 关闭
 * @param {KeyboardEvent} e 键盘事件对象
 */
function onKeydown(e) {
  if (e.key === 'Escape' && editVisible.value) closeEditModal();
}

/**
 * 拦截 document 上的拖拽默认行为，避免图片被拖到页面其他位置时浏览器直接打开
 * @param {DragEvent} e 拖拽事件对象
 */
function preventDocDrag(e) {
  e.preventDefault();
}

/** 编辑资料弹窗的显隐（editVisible 控制挂载，editShown 控制进出场过渡）与表单状态 */
const editVisible = ref(false);
const editShown = ref(false);
const editNickname = ref('');
const editGender = ref('secret');
const editBio = ref('');
const isSaving = ref(false);

/** 待保存的头像：null 表示未更改，'' 表示移除头像，字符串为新图片的 data URL */
const pendingAvatar = ref(null);
/** 是否展示“移除头像”按钮 */
const showRemoveBtn = ref(false);
/** 拖拽文件是否正悬停在上传区上 */
const dragover = ref(false);
/** 隐藏的文件选择 input 引用 */
const avatarInputRef = ref(null);

/**
 * 弹窗内头像预览地址：未更改时取当前资料头像，否则取待保存值（空串表示无头像）
 * @returns {string} 头像图片地址或空串
 */
const previewAvatar = computed(() => {
  if (pendingAvatar.value === null) return auth.user?.avatar || '';
  return pendingAvatar.value;
});
/**
 * 无头像图片时预览区展示的首字母
 * @returns {string} 单个大写字母
 */
const previewLetter = computed(() =>
  (editNickname.value || auth.user?.username || 'U').charAt(0).toUpperCase()
);

/** 打开编辑资料弹窗：资料未加载时提示，否则用当前资料初始化表单并播放进入动画 */
function openEditModal() {
  if (!auth.user) {
    showToast('资料加载中，请稍后再试', 'info');
    return;
  }

  pendingAvatar.value = null;
  editNickname.value = auth.user.nickname || '';
  editBio.value = auth.user.bio || '';
  editGender.value = auth.user.gender || 'secret';
  showRemoveBtn.value = !!auth.user.avatar;

  editVisible.value = true;
  requestAnimationFrame(() => {
    editShown.value = true;
  });
}

/** 关闭编辑资料弹窗：先播离场动画，过渡结束后再卸载内容 */
function closeEditModal() {
  editShown.value = false;
  setTimeout(() => {
    editVisible.value = false;
  }, 250);
}

/** 头像允许的图片 MIME 类型 */
const ACCEPTED_TYPES = /^image\/(png|jpe?g|webp)$/;
/** 头像文件大小上限（5MB） */
const MAX_SIZE = 5 * 1024 * 1024;
/** 头像裁剪压缩后的输出边长（像素） */
const OUTPUT_SIZE = 256;

/**
 * 读取图片文件并在 canvas 上等比居中裁剪为正方形，压缩输出 data URL
 * @param {File} file 用户选择的图片文件
 * @returns {Promise<string>} 256×256 的 JPEG data URL
 */
function fileToSquareDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('图片加载失败，请换一张'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = OUTPUT_SIZE;
        canvas.height = OUTPUT_SIZE;
        const ctx = canvas.getContext('2d');

        // 按 cover 方式等比放大后居中裁剪
        const scale = Math.max(OUTPUT_SIZE / img.width, OUTPUT_SIZE / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (OUTPUT_SIZE - w) / 2, (OUTPUT_SIZE - h) / 2, w, h);

        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * 校验并处理待上传头像：类型须为 JPG/PNG/WEBP、大小不超过 5MB，
 * 通过后本地裁剪压缩写入待保存状态并提示“记得保存”
 * @param {File} file 用户选择或拖入的图片文件
 */
function handleFile(file) {
  if (!ACCEPTED_TYPES.test(file.type)) {
    showToast('仅支持 JPG / PNG / WEBP 格式', 'error');
    return;
  }
  if (file.size > MAX_SIZE) {
    showToast('图片大小不能超过 5MB', 'error');
    return;
  }

  fileToSquareDataUrl(file)
    .then((dataUrl) => {
      pendingAvatar.value = dataUrl;
      showRemoveBtn.value = true;
      showToast('头像已更新，记得保存', 'success');
    })
    .catch((err) => showToast(err.message, 'error'));
}

/**
 * 文件选择框 change 事件：取出所选图片处理后清空 value，以便重复选择同一文件
 * @param {Event} e input[type=file] 的 change 事件对象
 */
function onFileChange(e) {
  const file = e.target.files && e.target.files[0];
  if (file) handleFile(file);
  e.target.value = '';
}

/**
 * 拖拽放下事件：取消悬停态并取出拖入的图片处理
 * @param {DragEvent} e drop 事件对象
 */
function onDrop(e) {
  dragover.value = false;
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) handleFile(file);
}

/** 移除头像：将待保存头像置为空串并隐藏移除按钮（保存后生效） */
function handleRemoveAvatar() {
  pendingAvatar.value = '';
  showRemoveBtn.value = false;
}

/**
 * 保存资料：防重复提交；校验昵称不超过 16 字、简介不超过 100 字；
 * 仅当头像确有更改（pendingAvatar 非 null）时才携带 avatar 字段；
 * PUT /profile 成功后更新本地资料、关闭弹窗并提示；401 由全局处理器接管（清登录态并跳登录页）
 */
function saveProfile() {
  if (isSaving.value || !auth.user) return;

  const payload = {
    nickname: editNickname.value.trim(),
    gender: editGender.value,
    bio: editBio.value.trim(),
  };

  if (payload.nickname.length > 16) {
    showToast('昵称不能超过16个字符', 'error');
    return;
  }
  if (payload.bio.length > 100) {
    showToast('个人简介不能超过100个字符', 'error');
    return;
  }
  if (pendingAvatar.value !== null) payload.avatar = pendingAvatar.value;

  isSaving.value = true;

  apiPut('/profile', payload)
    .then((data) => {
      if (data.code === 200) {
        auth.user = data.data;
        closeEditModal();
        showToast('资料保存成功', 'success');
      } else if (data.code !== 401) {
        showToast(data.msg || '保存失败', 'error');
      }
    })
    .catch(() => showToast('网络错误', 'error'))
    .finally(() => {
      isSaving.value = false;
    });
}

/** 退出登录确认弹窗引用 */
const confirmRef = ref(null);

/** 确认退出：清空登录态、提示成功，并在 800ms 后跳转登录页 */
function doLogout() {
  auth.logout();
  showToast('已退出登录', 'success');
  setTimeout(() => router.push('/login'), 800);
}

/** 本地存储的登录历史记录列表 */
const loginHistory = ref([]);

/**
 * 从完整 UserAgent 中提取常见浏览器标识，避免列表中整串过长
 * @param {string} ua 浏览器原始 UserAgent 字符串
 * @returns {string} 浏览器标识（如 Chrome/120.0），无法识别时截断前 30 个字符
 */
function shortUa(ua) {
  if (!ua) return '未知设备';
  const m = ua.match(/(Edg|Chrome|Firefox|Safari|Version)\/[\d.]+/);
  return m ? m[0] : ua.slice(0, 30);
}

/** 注销账号确认弹窗引用与提交中状态 */
const deleteConfirmRef = ref(null);
const deleting = ref(false);

/** 打开注销账号确认弹窗 */
function askDeleteAccount() {
  deleteConfirmRef.value?.open();
}

/**
 * 确认注销：防重复提交，请求 DELETE /account；
 * 成功后清空本地登录历史与登录态，提示并在 800ms 后跳转首页
 */
function doDeleteAccount() {
  if (deleting.value) return;
  deleting.value = true;
  apiDelete('/account')
    .then((data) => {
      if (data.code === 200) {
        clearLoginHistory();
        auth.logout();
        showToast('账号已注销,感谢使用', 'success');
        setTimeout(() => router.push('/'), 800);
      } else if (data.code !== 401) {
        showToast(data.msg || '注销失败', 'error');
      }
    })
    .catch(() => showToast('网络错误', 'error'))
    .finally(() => {
      deleting.value = false;
    });
}

// ====== 我的发布管理 ======

/** 当前用户发布的祝福/许愿列表（GET /wishes 不带 type 返回全部，前端按作者过滤） */
const myWishes = ref([]);
/** 发布列表加载中状态 */
const contentLoading = ref(false);
/** 各发布卡片的评论区展开状态表：{ [wishId]: boolean } */
const expanded = reactive({});

/** 自己发布的祝福数量 */
const blessCount = computed(() => myWishes.value.filter((w) => w.type === 'blessing').length);
/** 自己发布的许愿数量 */
const wishCount = computed(() => myWishes.value.filter((w) => w.type === 'wish').length);

/**
 * 拉取全部祝福/许愿并过滤出当前用户发布的内容
 * @returns {Promise<void>}
 */
async function loadMyWishes() {
  contentLoading.value = true;
  try {
    const data = await apiGetPublic('/wishes', { auth: true });
    if (data.code === 200) {
      myWishes.value = (data.data || []).filter((w) => auth.user && w.author.id === auth.user.id);
    }
  } finally {
    contentLoading.value = false;
  }
}

/**
 * 展开/收起某条发布的评论管理区
 * @param {string} wishId 发布记录 ID
 */
function toggleComments(wishId) {
  expanded[wishId] = !expanded[wishId];
}

/** 管理类删除确认弹窗引用 */
const manageConfirmRef = ref(null);
/** 暂存待确认的删除动作：标题、文案与实际执行的请求函数 */
const pendingManage = ref(null);

/**
 * 统一执行暂存的删除动作，按接口返回结果提示
 * @returns {Promise<void>}
 */
async function confirmManage() {
  const pending = pendingManage.value;
  pendingManage.value = null;
  if (!pending) return;
  try {
    const res = await pending.run();
    if (res?.code === 200) {
      showToast('已删除', 'success');
    } else if (res && res.code !== 401) {
      showToast(res.msg || '删除失败', 'error');
    }
  } catch {
    showToast('网络错误', 'error');
  }
}

/**
 * 弹出删除发布确认；确认后请求 DELETE /wishes/:id 并从本地列表移除
 * @param {object} w 待删除的发布对象
 */
function askDeleteWish(w) {
  pendingManage.value = {
    title: '删除发布',
    message: '确定删除这条内容吗？相关的点赞和评论也会一并删除。',
    run: async () => {
      const res = await apiDelete(`/wishes/${w.id}`);
      if (res.code === 200) myWishes.value = myWishes.value.filter((x) => x.id !== w.id);
      return res;
    },
  };
  manageConfirmRef.value?.open();
}

/**
 * 弹出删除评论确认；楼主可删除自己发布下的任意评论，确认后请求并本地移除
 * @param {object} w 评论所属发布对象
 * @param {object} c 待删除评论对象
 */
function askDeleteComment(w, c) {
  pendingManage.value = {
    title: '删除评论',
    message: '确定删除这条评论吗？',
    run: async () => {
      const res = await apiDelete(`/wishes/${w.id}/comments/${c.id}`);
      if (res.code === 200) w.comments = w.comments.filter((x) => x.id !== c.id);
      return res;
    },
  };
  manageConfirmRef.value?.open();
}

// ====== 我的相册管理 ======

/** 当前用户上传的图片（album store 含全部上传，按 authorId 过滤本人） */
const myAlbum = computed(() =>
  album.items.filter((x) => auth.user && x.authorId === auth.user.id)
);
/** 隐藏的图片文件选择 input 引用 */
const albumInputRef = ref(null);
/** 图片上传中状态（防重复选择） */
const uploading = ref(false);
/** 灯箱显隐与当前大图地址 */
const lightboxShow = ref(false);
const lightboxSrc = ref('');

/**
 * 打开大图灯箱
 * @param {string} src 大图地址
 */
function openLightbox(src) {
  lightboxSrc.value = src;
  lightboxShow.value = true;
}

/**
 * 选择图片后校验格式与 5MB 上限，本地压缩再上传，按结果提示
 * @param {Event} e input[type=file] 的 change 事件对象
 * @returns {Promise<void>}
 */
async function onAlbumFileChange(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file || uploading.value) return;
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
    showToast('仅支持 JPG/PNG/WEBP 格式', 'error');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('图片大小不能超过 5MB', 'error');
    return;
  }
  uploading.value = true;
  try {
    const src = await compressImage(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.85 });
    const res = await album.uploadAlbum({
      src,
      name: auth.displayName || auth.user?.username || '匿名',
    });
    if (res.code === 200) showToast('上传成功', 'success');
    else if (res.code !== 401) showToast(res.msg || '上传失败', 'error');
  } catch {
    showToast('上传失败', 'error');
  } finally {
    uploading.value = false;
  }
}

/**
 * 弹出删除图片确认；确认后调用 album store 删除（仅本人图片会通过后端校验）
 * @param {object} img 待删除图片对象
 */
function askDeleteImage(img) {
  pendingManage.value = {
    title: '删除图片',
    message: '确定删除这张图片吗？删除后不可恢复。',
    run: () => album.removeAlbum(img.id),
  };
  manageConfirmRef.value?.open();
}

/** 切换标签时按需加载对应数据：每次进入都刷新，保证管理页看到最新状态 */
watch(activeTab, (tab) => {
  if (tab === 'content') loadMyWishes();
  if (tab === 'album') album.fetchAlbum();
});
</script>

<style scoped>
/* ====== 用户中心独有样式（公共骨架已抽入 PageShell） ====== */

/* ====== 标签面板切换 ====== */
.tab-panel {
  animation: fadePanel 0.4s ease;
}

@keyframes fadePanel {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ====== 集中管理面板（我的发布 / 我的相册） ====== */
.manage-section {
  width: 100%;
  padding: 20px 0 40px;
}

.manage-panel {
  max-width: 860px;
  margin: 0 auto;
  padding: 28px 28px 32px;
  text-align: left;
}

.manage-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.manage-head h2 {
  margin: 0;
  font-size: 22px;
  color: #fff;
}

.manage-link {
  font-size: 13px;
  color: var(--brand-2, #e8834a);
  text-decoration: none;
  transition: color 0.2s;
}

.manage-link:hover {
  color: #fff;
}

.manage-stat {
  margin: 8px 0 18px;
  font-size: 13px;
  color: var(--text-3);
}

.manage-empty {
  padding: 44px 0;
  text-align: center;
  font-size: 14px;
  color: var(--text-3);
}

.manage-empty a {
  color: var(--brand-2, #e8834a);
}

.manage-upload-btn {
  padding: 8px 18px;
  font-size: 14px;
  border: none;
  border-radius: var(--radius-sm, 8px);
  color: #fff;
  background: var(--brand-gradient, linear-gradient(135deg, #c45620, #e8834a));
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.manage-upload-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(196, 86, 32, 0.35);
}

.manage-upload-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* ====== 我的发布：列表卡片与类型标签 ====== */
.wm-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.wm-item {
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
  border-radius: var(--radius, 12px);
}

.wm-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--text-3);
}

.wm-tag {
  padding: 2px 10px;
  border-radius: 999px;
  color: #fff;
  background: linear-gradient(135deg, #c45620, #e8834a);
}

.wm-tag--wish {
  background: linear-gradient(135deg, #8e44ad, #c678dd);
}

.wm-stats {
  margin-left: auto;
}

.wm-content {
  margin: 0 0 12px;
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-1, #fff);
  word-break: break-word;
}

.wm-actions {
  display: flex;
  gap: 10px;
}

.wm-btn {
  padding: 5px 14px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s;
}

.wm-btn:hover {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.4);
}

.wm-btn--danger {
  color: #e57373;
  border-color: rgba(229, 115, 115, 0.4);
}

.wm-btn--danger:hover {
  color: #fff;
  background: #e74c3c;
  border-color: #e74c3c;
}

.wm-btn--sm {
  padding: 3px 10px;
  font-size: 12px;
  flex: none;
}

/* ====== 评论管理区 ====== */
.cm-list {
  list-style: none;
  margin: 12px 0 0;
  padding: 12px 0 0;
  border-top: 1px dashed var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cm-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  line-height: 1.7;
}

.cm-body {
  min-width: 0;
}

.cm-author {
  color: var(--brand-2, #e8834a);
  margin-right: 6px;
}

.cm-text {
  color: var(--text-2);
  word-break: break-word;
}

.cm-time {
  display: block;
  font-size: 12px;
  color: var(--text-3);
}

.cm-empty {
  list-style: none;
  font-size: 13px;
  color: var(--text-3);
}

/* ====== 我的相册：图片网格与删除角标 ====== */
.am-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}

.am-item {
  position: relative;
  margin: 0;
  border-radius: var(--radius, 12px);
  overflow: hidden;
  border: 1px solid var(--border);
  cursor: zoom-in;
  transition: transform 0.3s var(--ease, ease), box-shadow 0.3s;
}

.am-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4);
}

.am-item img {
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: cover;
  display: block;
}

.am-item figcaption {
  padding: 8px 10px;
  font-size: 13px;
  color: var(--text-2);
  text-align: center;
  background: rgba(0, 0, 0, 0.3);
}

.am-del {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s, background 0.2s;
}

.am-item:hover .am-del,
.am-del:focus {
  opacity: 1;
}

.am-del:hover {
  background: #e74c3c;
}

/* ====== 个人资料区域 ====== */
.profile-section {
  padding: 20px 0;
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 40px;
  padding: 36px 40px;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* ====== 头像 ====== */
.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c45620, #e8834a);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: 700;
  color: #fff;
  border: 3px solid rgba(255, 255, 255, 0.25);
  transition: transform 0.3s;
  overflow: hidden;
}

.avatar:hover {
  transform: scale(1.05);
}

.avatar__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

/* 弹窗内大头像 */
.avatar--lg {
  width: 108px;
  height: 108px;
  font-size: 42px;
  cursor: pointer;
  position: relative;
}

.avatar--lg:hover {
  transform: scale(1.02);
}

.avatar-edit {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 28px;
  height: 28px;
  padding: 0;
  background: rgba(196, 86, 32, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px solid rgba(0, 0, 0, 0.4);
  transition: background 0.3s, transform 0.3s;
}

.avatar-edit:hover {
  background: #c45620;
  transform: scale(1.1);
}

.avatar-edit svg {
  width: 14px;
  height: 14px;
  fill: #fff;
}

/* ====== 个人信息文字 ====== */
.profile-info {
  flex: 1;
}

.profile-name {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 10px;
}

.profile-title-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.profile-title-row .profile-name {
  margin-bottom: 0;
}

.edit-profile-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  font-size: 13px;
  color: #f3b389;
  background: rgba(196, 86, 32, 0.14);
  border: 1px solid rgba(196, 86, 32, 0.55);
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.25s;
}

.edit-profile-btn svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

.edit-profile-btn:hover {
  color: #fff;
  background: #c45620;
  border-color: #c45620;
  transform: translateY(-1px);
}

.profile-meta {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 4px;
}

.profile-meta span {
  color: #fff;
}

.profile-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 10px;
  line-height: 1.6;
}

/* ====== 文字内容区 ====== */
.text-content {
  width: 100%;
  padding: 40px 0;
}

.text-content__container {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  gap: 60px;
  text-align: center;
  color: #fff;
  padding: 36px 32px;
  background: rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
}

.text-content__left h2,
.text-content__right h2 {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 6px;
}

.text-content__left p,
.text-content__right p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 24px;
}

.action-link {
  color: #c45620;
  text-decoration: none;
  transition: color 0.25s;
}

.action-link:hover {
  color: #e8834a;
}

/* ====== 账号设置：四宫格 ====== */
.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  text-align: left;
}

.settings-item {
  padding: 20px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.settings-item h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 10px;
  color: #fff;
}

.settings-item p {
  font-size: 14px;
  margin: 0;
}

.action-link--danger {
  color: #e57373;
}

.action-link--danger:hover {
  color: #ef5350;
}

/* ====== 登录历史 ====== */
.login-history {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 180px;
  overflow-y: auto;
}

.login-history__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--radius-sm);
}

.login-history__time {
  color: #fff;
}

.login-history__ua {
  color: var(--text-3);
  font-size: 12px;
  word-break: break-all;
}

.login-history__empty {
  font-size: 13px;
  color: var(--text-3);
  padding: 12px 0;
  text-align: center;
}

@media (max-width: 768px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}

/* ====== 弹窗遮罩与容器 ====== */
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  opacity: 0;
  transition: opacity 0.25s ease;
  box-sizing: border-box;
}

.modal-mask.show {
  opacity: 1;
}

.modal {
  width: 460px;
  max-width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  background: rgba(28, 22, 20, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
  transform: translateY(24px) scale(0.96);
  opacity: 0;
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s;
}

.modal-mask.show .modal {
  transform: translateY(0) scale(1);
  opacity: 1;
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.modal__header h3 {
  margin: 0;
  font-size: 19px;
  color: #fff;
}

.modal__close {
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s;
}

.modal__close:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.modal__body {
  padding: 20px 24px;
}

.modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 0 24px 22px;
}

/* ====== 弹窗内表单 ====== */
.form-group {
  margin-bottom: 18px;
}

.form-group > label {
  display: block;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  box-sizing: border-box;
  padding: 11px 14px;
  font-size: 14px;
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}

.form-input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.form-input:focus {
  border-color: #c45620;
  background: rgba(255, 255, 255, 0.09);
  box-shadow: 0 0 0 3px rgba(196, 86, 32, 0.18);
}

.form-textarea {
  resize: vertical;
  min-height: 76px;
  line-height: 1.6;
  font-family: inherit;
}

.char-counter {
  margin-top: 6px;
  text-align: right;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

/* 性别分段选择：隐藏原生 radio，用 span 模拟三段按钮 */
.gender-group {
  display: flex;
  gap: 10px;
}

.gender-option {
  flex: 1;
  cursor: pointer;
}

.gender-option input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.gender-option span {
  display: block;
  text-align: center;
  padding: 10px 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  transition: all 0.2s;
}

.gender-option:hover span {
  border-color: rgba(196, 86, 32, 0.6);
}

.gender-option input:checked + span {
  color: #fff;
  background: linear-gradient(135deg, #c45620, #e8834a);
  border-color: transparent;
  box-shadow: 0 6px 16px rgba(196, 86, 32, 0.35);
}

/* ====== 头像上传区 ====== */
.avatar-uploader {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 22px;
}

.avatar-uploader__mask {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #fff;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.25s;
}

.avatar-uploader__mask svg {
  width: 24px;
  height: 24px;
  fill: #fff;
}

.avatar-uploader:hover .avatar-uploader__mask,
.avatar-uploader.is-dragover .avatar-uploader__mask {
  opacity: 1;
}

.avatar-uploader.is-dragover .avatar--lg {
  border-color: #03e9f4;
  box-shadow: 0 0 0 4px rgba(3, 233, 244, 0.25);
}

.avatar-uploader__hint {
  margin: 12px 0 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  text-align: center;
}

.avatar-uploader__remove {
  margin-top: 4px;
  padding: 0;
  border: none;
  background: transparent;
  font-size: 12px;
  color: #e57373;
  cursor: pointer;
  transition: color 0.2s;
}

.avatar-uploader__remove:hover {
  color: #ef5350;
  text-decoration: underline;
}

/* ====== 弹窗底部按钮 ====== */
.btn {
  padding: 10px 22px;
  font-size: 14px;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.25s;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.btn--primary {
  color: #fff;
  background: linear-gradient(135deg, #c45620, #e8834a);
  box-shadow: 0 6px 18px rgba(196, 86, 32, 0.35);
}

.btn--primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(196, 86, 32, 0.45);
}

.btn--ghost {
  color: rgba(255, 255, 255, 0.8);
  background: transparent;
  border-color: rgba(255, 255, 255, 0.25);
}

.btn--ghost:hover:not(:disabled) {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.55);
  background: rgba(255, 255, 255, 0.08);
}

/* ====== 移动端响应式 ====== */
@media (max-width: 768px) {
  .profile-card {
    flex-direction: column;
    text-align: center;
    padding: 28px 20px;
    gap: 20px;
  }
  .text-content__container {
    flex-direction: column;
    gap: 0;
    padding: 24px 20px;
  }
  .modal {
    width: 100%;
  }
  .modal__body {
    padding: 18px 18px;
  }
  .modal__footer {
    padding: 0 18px 18px;
  }
  .btn {
    flex: 1;
    padding: 11px 12px;
  }

  /* 顶部六个导航项在手机端缩小，减少换行高度 */
  :deep(.page-header ul) {
    gap: 6px;
  }
  :deep(.page-header ul li a) {
    font-size: 13px;
    padding: 5px 9px;
  }

  /* 集中管理面板收紧内边距，避免与 wrapper 双重留白 */
  .manage-section {
    padding: 12px 0 32px;
  }
  .manage-panel {
    padding: 20px 16px 24px;
  }
  .manage-head h2 {
    font-size: 19px;
  }
  .manage-stat {
    margin-bottom: 14px;
  }

  /* 发布卡片：统计信息不再右顶，随标签自然换行 */
  .wm-item {
    padding: 14px;
  }
  .wm-stats {
    margin-left: 0;
    width: 100%;
  }
  .wm-actions {
    flex-wrap: wrap;
  }
  .wm-btn {
    flex: 1;
    text-align: center;
  }

  /* 相册网格：手机端固定两列，避免单列过宽 */
  .am-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .am-item figcaption {
    padding: 6px 8px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  :deep(.page-header ul li a) {
    font-size: 12px;
    padding: 4px 8px;
  }
  .manage-upload-btn {
    padding: 7px 14px;
    font-size: 13px;
  }
  .wm-content {
    font-size: 14px;
  }
}

/* 触屏设备无 hover：删除角标常驻可见，避免手机上找不到删除入口 */
@media (hover: none) and (pointer: coarse) {
  .am-del {
    opacity: 0.85;
  }
}
</style>
