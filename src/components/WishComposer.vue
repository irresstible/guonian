<template>
  <div class="composer">
    <!-- 类型切换：祝福 / 许愿 -->
    <div class="composer__type">
      <label
        class="type-opt"
        :class="{ active: modelType === 'blessing' }"
      >
        <input
          v-model="modelType"
          type="radio"
          value="blessing"
        >
        <span>🎆 祝福</span>
      </label>
      <label
        class="type-opt"
        :class="{ active: modelType === 'wish' }"
      >
        <input
          v-model="modelType"
          type="radio"
          value="wish"
        >
        <span>🌟 许愿</span>
      </label>
    </div>
    <!-- 正文输入 -->
    <textarea
      v-model="text"
      class="composer__input"
      rows="3"
      maxlength="200"
      placeholder="写下你的新年祝福或心愿..."
    />
    <!-- 底部栏：字数统计与发布按钮 -->
    <div class="composer__foot">
      <span class="composer__count">{{ text.length }} / 200</span>
      <button
        type="button"
        class="composer__btn"
        :disabled="!canSend || sending"
        @click="send"
      >
        {{ sending ? '发送中...' : '发布' }}
      </button>
    </div>
  </div>
</template>

<script setup>
/**
 * @file 心愿 / 祝福发布器：切换类型、输入正文并显示字数，合法后提交并清空
 * @description Props：sending 是否发送中（禁用按钮）；Emits：submit 发布时触发，载荷为 { type, content }
 */
import { ref, computed } from 'vue';

const props = defineProps({
  /** 是否处于发送中状态，为 true 时禁止重复发布 */
  sending: { type: Boolean, default: false },
});
/** 点击发布且内容合法时触发，载荷 { type: 类型, content: 去空白后的正文 } */
const emit = defineEmits(['submit']);

/** 当前选中的内容类型：blessing 祝福 / wish 许愿 */
const modelType = ref('blessing');
/** 文本框内容 */
const text = ref('');

/** 是否允许发布：去空白后非空且不超过 200 字 */
const canSend = computed(() => text.value.trim().length > 0 && text.value.trim().length <= 200);

/** 发布：校验通过后抛出 submit 事件并清空文本框 */
function send() {
  if (!canSend.value || props.sending) return;
  emit('submit', { type: modelType.value, content: text.value.trim() });
  text.value = '';
}
</script>

<style scoped>
/* ====== 发布器容器 ====== */
.composer {
  padding: 18px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 16px;
}

/* ====== 类型切换：隐藏原生 radio，用 span 模拟胶囊选项，.active 高亮 ====== */
.composer__type {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.type-opt {
  cursor: pointer;
}

.type-opt input {
  position: absolute;
  opacity: 0;
}

.type-opt span {
  display: block;
  padding: 6px 14px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.type-opt:hover span {
  border-color: rgba(196, 86, 32, 0.5);
}

.type-opt.active span {
  color: #fff;
  background: linear-gradient(135deg, #c45620, #e8834a);
  border-color: transparent;
  box-shadow: var(--shadow-brand);
}

/* ====== 多行正文输入：聚焦时高亮边框 ====== */
.composer__input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  font-size: 14px;
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  outline: none;
  resize: vertical;
  line-height: 1.6;
  font-family: inherit;
  transition: border-color 0.2s;
}

.composer__input:focus {
  border-color: var(--brand-1);
  background: rgba(255, 255, 255, 0.09);
}

.composer__input::placeholder {
  color: var(--text-3);
}

/* ====== 底部栏：字数统计与发布按钮两端对齐 ====== */
.composer__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}

.composer__count {
  font-size: 12px;
  color: var(--text-3);
}

.composer__btn {
  padding: 8px 22px;
  font-size: 14px;
  border: none;
  border-radius: var(--radius-sm);
  color: #fff;
  background: var(--brand-gradient);
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
}

.composer__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.composer__btn:hover:not(:disabled) {
  transform: translateY(-1px);
}
</style>
