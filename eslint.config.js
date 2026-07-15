import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import eslintConfigPrettier from 'eslint-config-prettier'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'src/shared/ui/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['**/*.vue'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@tanstack/vue-query',
              message:
                'View + Composable rule: chame useQuery/useMutation dentro de um useX.ts colocado, nao direto no .vue.',
            },
            {
              name: 'pinia',
              message:
                'View + Composable rule: acesse stores Pinia dentro de um useX.ts colocado, nao direto no .vue.',
            },
          ],
          patterns: [
            {
              group: ['@/shared/storage/*'],
              message:
                'View + Composable rule: chame o StorageAdapter dentro de um useX.ts colocado, nao direto no .vue.',
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
)
