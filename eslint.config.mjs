import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default tseslint.config(
  // ── Global ignores ────────────────────────────────────
  {
    ignores: [
      '**/dist/',
      '**/node_modules/',
      '**/*.config.*',
      '**/e2e/',
    ],
  },

  // ── Base: JS recommended ──────────────────────────────
  js.configs.recommended,

  // ── TypeScript recommended ────────────────────────────
  ...tseslint.configs.recommended,

  // ── Browser globals for apps/web ──────────────────────
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // ── React hooks rules for TSX ─────────────────────────
  {
    files: ['**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // React Compiler strict rules are temporarily disabled until full refactor.
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
    },
  },

  // ── Tune: allow underscore-prefixed unused vars ───────
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // ── Relax rules for test files ────────────────────────
  {
    files: ['**/__tests__/**', '**/*.spec.*', '**/*.test.*'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
)
