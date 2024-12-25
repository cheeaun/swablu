import { defineConfig } from '@lingui/cli';
import { formatter } from '@lingui/format-po';

export default defineConfig({
  sourceLocale: 'en-GB',
  locales: ['en-GB'],
  fallbackLocales: {
    default: 'en-GB',
  },
  format: formatter({ lineNumbers: false }),
  catalogs: [
    {
      path: '<rootDir>/src/locales/{locale}',
      include: ['src'],
    },
  ],
  orderBy: 'origin',
});
