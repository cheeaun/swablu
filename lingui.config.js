import { defineConfig } from '@lingui/cli';

export default defineConfig({
  sourceLocale: 'en-GB',
  locales: ['en-GB'],
  fallbackLocales: {
    default: 'en-GB',
  },
  catalogs: [
    {
      path: '<rootDir>/src/locales/{locale}',
      include: ['src'],
    },
  ],
  orderBy: 'origin',
});
