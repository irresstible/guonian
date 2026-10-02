<template>
  <PageShell :nav-items="navItems">
    <!-- 帮助中心内容区 -->
    <section class="help-section wrapper">
      <div class="help-card">
        <h1 class="help-title">
          帮助中心
        </h1>
        <p class="help-subtitle">
          常见问题与使用指引，点击问题展开答案
        </p>

        <!-- FAQ 折叠列表 -->
        <div class="faq-list">
          <details
            v-for="(faq, i) in faqs"
            :key="i"
            class="faq-item"
          >
            <summary>{{ faq.q }}</summary>
            <div class="faq-answer">
              {{ faq.a }}
            </div>
          </details>
        </div>

        <!-- 联系客服区 -->
        <div class="help-contact">
          <h2>没有找到答案？</h2>
          <p>可以通过以下方式联系我们，我们会尽快回复：</p>
          <p class="help-contact__mail">
            客服邮箱：support@guonian.example
          </p>
        </div>
      </div>
    </section>
  </PageShell>
</template>

<script setup>
/**
 * @file 帮助中心：常见问题折叠列表与客服联系方式
 * @description 纯静态内容页，FAQ 基于原生 details/summary 实现折叠展开；依赖 PageShell 组件
 */
import PageShell from '@/components/PageShell.vue';

/** 顶部导航项配置 */
const navItems = [
  { text: '返回首页', to: '/' },
  { text: '我的主页', to: '/user' },
  { text: '帮助中心', to: '/help', active: true },
];

/** 常见问题数据：q 为问题，a 为答案 */
const faqs = [
  {
    q: '如何注册账号？',
    a: '在首页点击「登录|注册」进入登录页，再点击「注册账号」。填写 2-16 位用户名、6 位以上密码、11 位手机号并获取短信验证码即可完成注册。',
  },
  {
    q: '收不到验证码怎么办？',
    a: '请先确认手机号输入正确。验证码发送后按钮会进入 60 秒倒计时，结束后可重新获取。演示环境的验证码会显示在后端运行窗口中。',
  },
  {
    q: '忘记密码怎么办？',
    a: '在登录页点击「忘记密码」，或进入「用户中心 → 账号设置 → 修改密码」，通过手机号验证码即可重置新密码。',
  },
  {
    q: '如何修改昵称、性别和个人简介？',
    a: '登录后进入「我的主页」，点击个人资料卡片上的「编辑资料」按钮，在弹窗中修改后保存即可。昵称最多 16 个字，个人简介最多 100 个字。',
  },
  {
    q: '如何上传或更换头像？',
    a: '在「编辑资料」弹窗中点击头像区域，或直接把图片拖入该区域。支持 JPG / PNG / WEBP 格式，大小不超过 5MB，系统会自动居中裁剪并压缩为 256×256。',
  },
  {
    q: '如何退出登录？',
    a: '在用户中心顶部导航点击「退出登录」，确认后即可退出；已登录状态下也可以在首页右上角直接退出。',
  },
  {
    q: '如何使用祝福许愿墙？',
    a: '登录后进入「祝福许愿墙」页，可发布祝福或许愿；可以给他人内容点赞、评论；只能删除自己发布的内容；顶部可以按关键词搜索。',
  },
  {
    q: '验证码在哪里查看？',
    a: '注册或重置密码时，验证码会打印在后端运行窗口（控制台）中，不会发送到手机。',
  },
];
</script>

<style scoped>
/* ====== 帮助中心卡片 ====== */
.help-section {
  width: 100%;
  padding: 20px 0 40px;
  pointer-events: auto;
}

.help-card {
  max-width: 760px;
  margin: 0 auto;
  padding: 40px 36px;
  color: #fff;
  background: rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.help-title {
  font-size: 28px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 8px;
  background: var(--brand-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.help-subtitle {
  text-align: center;
  font-size: 14px;
  color: var(--text-2);
  margin-bottom: 28px;
}

/* ====== FAQ 折叠列表 ====== */
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.faq-item {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius);
  overflow: hidden;
  transition: border-color 0.25s, background 0.25s;
}

.faq-item[open] {
  border-color: rgba(232, 131, 74, 0.5);
  background: rgba(232, 131, 74, 0.08);
}

.faq-item summary {
  position: relative;
  padding: 16px 44px 16px 18px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  list-style: none;
  user-select: none;
  transition: color 0.25s;
}

.faq-item summary::-webkit-details-marker {
  display: none;
}

.faq-item summary::after {
  content: '+';
  position: absolute;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 22px;
  font-weight: 300;
  color: var(--brand-2);
  transition: transform 0.25s;
}

.faq-item[open] summary::after {
  transform: translateY(-50%) rotate(45deg);
}

.faq-item summary:hover {
  color: var(--brand-2);
}

.faq-answer {
  padding: 0 18px 18px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-2);
}

/* ====== 联系客服 ====== */
.help-contact {
  margin-top: 32px;
  padding: 24px;
  text-align: center;
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(255, 255, 255, 0.18);
}

.help-contact h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.help-contact p {
  font-size: 14px;
  color: var(--text-2);
  line-height: 1.8;
}

.help-contact__mail {
  color: var(--brand-2);
  font-weight: 500;
}

/* ====== 移动端响应式 ====== */
@media (max-width: 600px) {
  .help-card {
    padding: 28px 18px;
  }

  .help-title {
    font-size: 24px;
  }

  .faq-item summary {
    font-size: 15px;
    padding: 14px 40px 14px 16px;
  }
}
</style>
