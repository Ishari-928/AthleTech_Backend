import globals from 'globals';
import pluginJs from '@eslint/js';

export default [
  {
    files: ['**/*.{js,mjs,cjs}'],
    ignores: ['node_modules/', 'dist/', 'build/'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      ...pluginJs.configs.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
      'no-console': 'off',
    },
  },
];

