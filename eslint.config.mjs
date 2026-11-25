import { defineConfig, globalIgnores } from 'eslint/config';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import reactHooks from 'eslint-plugin-react-hooks';

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  globalIgnores([
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
    'tests/cjs-hook.cjs',
    'tests/shims/**',
  ]),
  {
    // ESLint 10 only resolves a rule's plugin from the same config object.
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      // Both rules come with eslint-config-next 16. Kept as warnings
      // because they flag established patterns in this codebase:
      // - set-state-in-effect: mounted/hydration guards that set state
      //   on first client render (theme switcher, welcome popup, group
      //   list expansion sync).
      // - purity: Date.now() during render in async server components,
      //   which is request-time server code, not client render.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
];

export default defineConfig(eslintConfig);
