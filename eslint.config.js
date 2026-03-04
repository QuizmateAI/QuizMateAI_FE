import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import react from 'eslint-plugin-react'
import importPlugin from 'eslint-plugin-import'
import unusedImports from 'eslint-plugin-unused-imports'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      react,
      import: importPlugin,
      'unused-imports': unusedImports,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        alias: {
          map: [['@', './src']],
          extensions: ['.js', '.jsx', '.json'],
        },
      },
    },
    rules: {
      /* 0. BẢO VỆ JSX — KHÔNG XÓA NHẦM IMPORT COMPONENT DÙNG TRONG JSX */
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',

      /* 1. KIỂM TRA CHỮ HOA/THƯỜNG KHI IMPORT (CHỐNG LỖI DEPLOY VERCEL/AWS) */
      'import/no-unresolved': [2, { caseSensitive: true }],

      /* 2. LOẠI BỎ IMPORT VÀ BIẾN THỪA (CLEAN CODE) */
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      /* 3. ĐẢM BẢO HIỆU SUẤT REACT HOOKS */
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      /* 4. QUY TẮC JSX */
      'react/jsx-no-duplicate-props': 'error',
      'react/self-closing-comp': 'warn',
      'react/prop-types': 'off',

      /* 5. CẢNH BÁO CONSOLE KHI DEPLOY */
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      /* 6. CHO PHÉP EXPORT HỖN HỢP (hook + component) — pattern phổ biến */
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
])
