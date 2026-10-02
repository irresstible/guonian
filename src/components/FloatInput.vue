<template>
  <div class="user-box">
    <input
      :type="type"
      :value="modelValue"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
      :maxlength="maxlength"
      placeholder=" "
      @input="$emit('update:modelValue', $event.target.value)"
    >
    <label>{{ label }}</label>
  </div>
</template>

<script setup>
/**
 * @file 浮动标签文本输入框，通过 v-model 双向绑定输入值
 */
defineProps({
  /** 输入框值（v-model） */
  modelValue: { type: String, default: '' },
  /** 浮动标签文案 */
  label: { type: String, required: true },
  /** 输入框类型，如 text / tel */
  type: { type: String, default: 'text' },
  /** 浏览器自动填充提示 */
  autocomplete: { type: String, default: '' },
  /** 移动端弹出的键盘模式 */
  inputmode: { type: String, default: '' },
  /** 最大可输入长度 */
  maxlength: { type: [String, Number], default: undefined },
});
/** 输入内容变化时触发，载荷为最新字符串值 */
defineEmits(['update:modelValue']);
</script>
