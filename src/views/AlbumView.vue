<template>
  <PageShell :nav-items="navItems">
    <section class="album wrapper">
      <div class="shell-card album__panel">
        <h1 class="album__title">
          新年相册
        </h1>
        <p class="album__subtitle">
          点击查看大图
        </p>

        <!-- 上传区（登录可见） -->
        <div
          v-if="auth.isLoggedIn"
          class="album__upload"
        >
          <input
            ref="fileInput"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            class="album__file"
            @change="onFileChange"
          >
          <button
            type="button"
            class="album__upload-btn"
            @click="triggerUpload"
          >
            <svg
              viewBox="0 0 24 24"
              class="album__upload-icon"
              aria-hidden="true"
            >
              <path d="M19 13v-2h-2v2h-2v2h2v2h2v-2h2v-2h-2zM4 20h16v-2H4v2zM4 4h16v2H4V4z" />
              <path d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 10H6c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2zm0-14H6v12h12V6z" />
            </svg>
            上传图片
          </button>
          <span class="album__upload-hint">支持 JPG/PNG/WEBP,最大 5MB</span>
        </div>
        <p
          v-else
          class="album__login-tip"
        >
          <RouterLink to="/login">
            登录
          </RouterLink> 后即可上传图片
        </p>

        <!-- 图片网格区（加载中 / 空态 / 网格） -->
        <div
          v-if="loading"
          class="album__empty"
        >
          加载中...
        </div>
        <div
          v-else-if="displayImages.length === 0"
          class="album__empty"
        >
          还没有图片,来上传第一张吧~
        </div>
        <div
          v-else
          class="album__grid"
        >
          <figure
            v-for="(img, i) in displayImages"
            :key="img.id || img.src"
            class="album__item"
            @click="open(i)"
          >
            <img
              :src="img.src"
              :alt="img.name"
              loading="lazy"
            >
            <figcaption>{{ img.name }}</figcaption>
            <button
              v-if="canDelete(img)"
              type="button"
              class="album__del"
              title="删除图片"
              aria-label="删除这张图片"
              @click.stop="askDelete(img)"
            >
              &times;
            </button>
          </figure>
        </div>
      </div>
    </section>
  </PageShell>

  <!-- 大图灯箱弹窗 -->
  <LightboxModal
    v-model="lightboxShow"
    :src="currentSrc"
  />
  <!-- 删除图片确认弹窗 -->
  <ConfirmDialog
    ref="confirmRef"
    title="删除图片"
    message="确定删除这张图片吗?删除后不可恢复。"
    @confirm="confirmDelete"
  />
</template>

<script setup>
/**
 * @file 新年相册：图片网格浏览、大图灯箱、登录上传与删除
 * @description 列表由用户上传图片（album store）与内置示例图拼接而成；上传前本地压缩，
 * 仅图片上传者本人可删除（删除前二次确认）；依赖 auth、album store 及
 * PageShell、LightboxModal、ConfirmDialog 组件
 */
import { ref, computed, onMounted } from 'vue';
import { showToast } from '@/utils/toast';
import { useAuthStore } from '@/stores/auth';
import { useAlbumStore } from '@/stores/album';
import { compressImage } from '@/utils/compressImage';
import PageShell from '@/components/PageShell.vue';
import LightboxModal from '@/components/LightboxModal.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';

const auth = useAuthStore();
const store = useAlbumStore();

/** 顶部导航项配置 */
const navItems = [
  { text: '返回首页', to: '/' },
  { text: '新年相册', active: true },
];

/** 内置示例图片：所有访客可见，无 authorId 因而不可删除 */
const staticImages = [
  { src: '/img/n1.jpg', name: 'psyche.yao' },
  { src: '/img/n2.jpg', name: '逮到一只白熊' },
  { src: '/img/n3.jpg', name: '超级无敌帅男.YYJ' },
  { src: '/img/n4.jpg', name: '浅望繇' },
];

/**
 * 相册展示列表：用户上传图片在前、内置示例图在后
 * @returns {Array<{id?: string|number, src: string, name: string, authorId?: string|number, uploaded?: boolean}>}
 * 合并后的图片数组
 */
const displayImages = computed(() => {
  const uploaded = store.items.map((x) => ({
    id: x.id,
    src: x.src,
    name: x.name,
    authorId: x.authorId,
    uploaded: true,
  }));
  return [...uploaded, ...staticImages];
});

/** 灯箱弹窗是否显示 */
const lightboxShow = ref(false);
/** 灯箱当前展示的大图地址 */
const currentSrc = ref('');
/** 隐藏的文件选择 input 引用 */
const fileInput = ref(null);
/** 图片上传是否进行中（防重复选择上传） */
const uploading = ref(false);
/** 删除确认弹窗引用 */
const confirmRef = ref(null);
/** 待删除确认的图片对象 */
const pendingImg = ref(null);

/**
 * 判断当前图片是否允许删除：仅登录用户本人上传的图片可删（内置示例图无 authorId）
 * @param {{uploaded?: boolean, authorId?: string|number}} img 图片对象
 * @returns {boolean} 可删除返回 true
 */
function canDelete(img) {
  return img.uploaded && auth.isLoggedIn && auth.user && img.authorId === auth.user.id;
}

/**
 * 点击删除按钮：暂存待删图片并打开确认弹窗
 * @param {object} img 待删除的图片对象
 */
function askDelete(img) {
  pendingImg.value = img;
  confirmRef.value?.open();
}

/** 确认删除：取出暂存图片请求删除接口，按结果弹出成功或失败提示 */
async function confirmDelete() {
  const img = pendingImg.value;
  pendingImg.value = null;
  if (!img) return;
  const res = await store.removeAlbum(img.id);
  if (res.code === 200) {
    showToast('图片已删除', 'success');
  } else {
    showToast(res.msg || '删除失败', 'error');
  }
}

/**
 * 点击网格图片：记录大图地址并打开灯箱
 * @param {number} i 图片在展示列表中的下标
 */
function open(i) {
  currentSrc.value = displayImages.value[i].src;
  lightboxShow.value = true;
}

/** 触发隐藏文件选择框的点击，打开系统选图 */
function triggerUpload() {
  fileInput.value?.click();
}

/**
 * 文件选择回调：清空 input 值以便重复选同一文件；
 * 校验格式为 JPG/PNG/WEBP、大小不超过 5MB，通过后本地压缩再上传，按结果提示
 * @param {Event} e input[type=file] 的 change 事件对象
 */
async function onFileChange(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
    showToast('仅支持 JPG/PNG/WEBP 格式', 'error');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('图片大小不能超过 5MB', 'error');
    return;
  }
  if (uploading.value) return;
  uploading.value = true;
  try {
    const src = await compressImage(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.85 });
    const res = await store.uploadAlbum({ src, name: auth.displayName || auth.user?.username || '匿名' });
    if (res.code === 200) {
      showToast('上传成功', 'success');
    } else {
      showToast(res.msg || '上传失败', 'error');
    }
  } catch {
    showToast('上传失败', 'error');
  } finally {
    uploading.value = false;
  }
}

/** 页面挂载时拉取用户上传的相册图片 */
onMounted(() => {
  store.fetchAlbum();
});
</script>

<style scoped>
/* ====== 页面容器、面板与标题 ====== */
.album { width: 100%; padding: 20px 0 40px; }
.album__panel { max-width: 960px; margin: 0 auto; padding: 32px 28px; }
.album__title { font-size: 26px; font-weight: 700; text-align: center; margin-bottom: 6px; background: var(--brand-gradient); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.album__subtitle { text-align: center; font-size: 14px; color: var(--text-2); margin-bottom: 24px; }
/* ====== 上传区与未登录提示 ====== */
.album__upload { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding: 14px; background: rgba(255,255,255,0.04); border: 1px dashed var(--border); border-radius: var(--radius); }
.album__file { display: none; }
.album__upload-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; font-size: 14px; border: none; border-radius: var(--radius-sm); color: #fff; background: var(--brand-gradient); cursor: pointer; }
.album__upload-icon { width: 18px; height: 18px; fill: currentColor; }
.album__upload-hint { font-size: 12px; color: var(--text-3); }
.album__login-tip { text-align: center; font-size: 14px; color: var(--text-2); padding: 14px; background: rgba(255,255,255,0.04); border-radius: var(--radius); margin-bottom: 20px; }
.album__login-tip a { color: var(--brand-2); }
/* ====== 图片网格、删除按钮与空态 ====== */
.album__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.album__item { margin: 0; border-radius: var(--radius); overflow: hidden; cursor: zoom-in; border: 1px solid var(--border); transition: transform 0.3s var(--ease), box-shadow 0.3s; position: relative; }
.album__item:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(0,0,0,0.4); }
.album__item img { width: 100%; aspect-ratio: 4/3; object-fit: cover; display: block; transition: transform 0.4s var(--ease); }
.album__item:hover img { transform: scale(1.05); }
.album__item figcaption { padding: 10px 12px; font-size: 13px; color: var(--text-2); text-align: center; background: rgba(0,0,0,0.3); }
.album__del { position: absolute; top: 6px; right: 6px; width: 26px; height: 26px; border: none; border-radius: 50%; background: rgba(0,0,0,0.55); color: #fff; font-size: 18px; line-height: 1; cursor: pointer; opacity: 0; transition: opacity 0.2s, background 0.2s; }
.album__item:hover .album__del, .album__del:focus { opacity: 1; }
.album__del:hover { background: #e74c3c; }
.album__empty { text-align: center; color: var(--text-3); font-size: 14px; padding: 40px 0; }
/* ====== 移动端响应式 ====== */
@media (max-width: 600px) { .album__panel { padding: 24px 16px; } }

/* 触屏设备无 hover：删除角标常驻可见，避免手机上找不到删除入口 */
@media (hover: none) and (pointer: coarse) {
  .album__del { opacity: 0.85; }
}
</style>
