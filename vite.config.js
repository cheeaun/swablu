import { lingui } from '@lingui/vite-plugin';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { SondaRollupPlugin } from 'sonda';
import { defineConfig, loadEnv } from 'vite';
import generateFile from 'vite-plugin-generate-file';
import { run } from 'vite-plugin-run';
import { VitePWA } from 'vite-plugin-pwa';

import { clientMetadata } from './src/utils/clientMetadata';

const { VITE_APP_NAME: APP_NAME, VITE_PUBLIC_URL: PUBLIC_URL } = loadEnv(
  'production',
  process.cwd(),
);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react({
      babel: {
        plugins: ['@lingui/babel-plugin-lingui-macro'],
      },
    }),
    lingui(),
    run({
      silent: false,
      input: [
        {
          name: 'lingui-extract',
          run: ['npm', 'run', 'lingui-extract'],
          pattern: 'src/**/*.{js,jsx,ts,tsx}',
        },
      ],
    }),
    SondaRollupPlugin({
      open: false,
      detailed: true,
      brotli: true,
    }),
    generateFile([
      {
        type: 'json',
        output: './client-metadata.json',
        data: clientMetadata({
          REDIRECT_URI: PUBLIC_URL,
          CLIENT_ID: `${PUBLIC_URL}/client-metadata.json`,
        }),
      },
    ]),
    VitePWA({
      manifest: {
        name: APP_NAME,
        short_name: APP_NAME,
        description: 'Experimental opinionated web client for Bluesky',
        icons: [
          {
            src: 'logo-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'logo-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'logo-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        categories: ['social', 'news'],
      },
      strategies: 'injectManifest',
      injectRegister: 'inline',
      injectManifest: {
        // Prevent "Unable to find a place to inject the manifest" error
        injectionPoint: undefined,
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      // https://github.com/tabler/tabler-icons/issues/1233#issuecomment-2428245119
      // /esm/icons/index.mjs only exports the icons statically, so no separate chunks are created
      '@tabler/icons-react': '@tabler/icons-react/dist/esm/icons/index.mjs',
    },
  },
  css: {
    lightningcss: {
      enabled: true,
    },
  },
  build: {
    cssMinify: 'lightningcss',
    cssCodeSplit: false,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Video stuff
          if (
            /(hls|media-chrome|media-tracks|custom-media-element)/i.test(id)
          ) {
            return 'video';
          }
          // Editor stuff
          if (/(prosemirror|tiptap|popperjs|tippy)/i.test(id)) {
            return 'editor';
          }
          // The rest
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    port: 3300,
    host: true,
  },
  preview: {
    port: 3301,
    host: true,
  },
});
