import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      '.next/**',
      '.next-demo-sweep/**',
      '.next-demo-sweep-*/**',
      '.next-screenshots-mobile/**',
      '.next-screenshots-mobile-*/**',
      '.next-screenshots-desktop/**',
      '.next-screenshots-desktop-*/**',
      '_bmad/**',
      '_bmad-output/**',
      '.agent/**',
      '.augment/**',
      '.claude/**',
    ],
  },
];

export default eslintConfig;
