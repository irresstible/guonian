import pluginVue from 'eslint-plugin-vue';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '.wrangler/**', 'workers/.wrangler/**'],
  },
  ...pluginVue.configs['flat/recommended'],
  {
    rules: {
      // 项目约定：允许单词组件名（视图组件）
      'vue/multi-word-component-names': 'off',
      // 项目视图含原始 HTML 结构，文本插值统一用 {{ }}
      'vue/no-v-html': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
