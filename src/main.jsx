import './index.css';
import './app.css';
import './styles/react-aria.css';
import './styles/sonner.css';

import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Link,
  RouterProvider,
  createHashHistory,
  createRouter,
} from '@tanstack/react-router';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { messages } from './locales/en-GB.po';
import store from './utils/store';
import { ModeratePostProvider } from './hooks/useModeratePost';
import detectLang from './utils/detectLang';
import React from 'react';
import Bugsnag from '@bugsnag/js';
import BugsnagPluginReact from '@bugsnag/plugin-react';
import BugsnagPerformance from '@bugsnag/browser-performance';

const { VITE_BUGSNAG_API_KEY: BUGSNAG_API_KEY, DEV } = import.meta.env;

if (!DEV) {
  Bugsnag.start({
    apiKey: BUGSNAG_API_KEY,
    plugins: [new BugsnagPluginReact()],
  });
  BugsnagPerformance.start({ apiKey: BUGSNAG_API_KEY });
}

// Change theme-color based on current theme (html[data-theme])
// Use the --bg-color variable for the theme-color
{
  function updateTheme() {
    // Get theme
    const theme = document.documentElement.dataset.theme;
    // Get current --bg-color
    const bgColor = getComputedStyle(document.documentElement).getPropertyValue(
      '--bg-color',
    );
    // Get the correct --bg-color
    // console.log({ theme, bgColor });
    let realBgColor = bgColor;
    if (/light-dark/i.test(bgColor)) {
      const [_, lightColor, darkColor] = bgColor.match(
        /light-dark\((.+),(.+)\)/,
      );
      if (theme === 'auto') {
        const currentTheme = window.matchMedia('(prefers-color-scheme: dark)')
          .matches
          ? 'dark'
          : 'light';
        realBgColor = currentTheme === 'dark' ? darkColor : lightColor;
      } else {
        realBgColor = theme === 'dark' ? darkColor : lightColor;
      }
    }
    // Set meta[theme-color]
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', realBgColor);
    } else {
      const newMeta = document.createElement('meta');
      newMeta.setAttribute('name', 'theme-color');
      newMeta.setAttribute('content', realBgColor);
      document.head.appendChild(newMeta);
    }
  }

  // When html[data-theme] changes
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.attributeName === 'data-theme') {
        updateTheme();
      }
    }
  });
  observer.observe(document.documentElement, { attributes: true });

  // When system theme changes
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (e) => {
      updateTheme();
    });

  // When visibility visible
  document.addEventListener('visibilitychange', (e) => {
    if (document.visibilityState === 'visible') {
      updateTheme();
    }
  });
}

// Set appearance
const currentAppearance = store.local.get('appearance');
if (currentAppearance) {
  document.documentElement.dataset.theme = currentAppearance;
}

// Set text size
const currentTextSize = store.local.get('textSize');
if (currentTextSize) {
  document.documentElement.style.setProperty(
    '--text-size',
    `${currentTextSize}px`,
  );
}

// Load the messages for the default language
i18n.load('en-GB', messages);
i18n.activate('en-GB');
const detectedLang = detectLang();
store.session.setJSON('detectedLang', detectedLang);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

// Import the generated route tree
import { routeTree } from './routeTree.gen';

// Create a new router instance
const hashHistory = createHashHistory();
const router = createRouter({
  routeTree,
  scrollRestoration: true,
  history: hashHistory,
  defaultViewTransition: true,
  defaultPendingComponent: (params) => {
    console.log('PENDING', router);
    return (
      <main>
        <div className="main-body">
          <div className="loader-block">
            <div className="loader" />
          </div>
        </div>
      </main>
    );
  },
  defaultErrorComponent: ({ error, reset }) => {
    console.log('ERROR', router);
    return (
      <main>
        <div className="main-body">
          <h1>
            <Trans>An error occurred</Trans>
          </h1>
          {error.message && <p>{error.message}</p>}
          <p>
            <button type="button" onClick={reset}>
              <Trans>Retry</Trans>
            </button>{' '}
            or{' '}
            <button type="button" onClick={() => router.invalidate()}>
              <Trans>Reload</Trans>
            </button>
          </p>
        </div>
      </main>
    );
  },
  defaultNotFoundComponent: (params) => {
    console.log('NOT FOUND', router);
    return (
      <main>
        <div className="main-body">
          <h1>
            <Trans>Page not found</Trans>
          </h1>
          <Link to="/">
            <Trans>Go to home</Trans>
          </Link>
        </div>
      </main>
    );
  },
});

const App = () => {
  const auth = useAuth();
  const queryClient = useQueryClient();
  return <RouterProvider router={router} context={{ auth, queryClient }} />;
};

const ErrorBoundary = DEV
  ? React.Fragment
  : Bugsnag.getPlugin('react').createErrorBoundary(React);

const rootNode = document.getElementById('root');
const root = createRoot(rootNode);
root.render(
  <ErrorBoundary>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <I18nProvider i18n={i18n}>
          <ModeratePostProvider>
            <App />
          </ModeratePostProvider>
        </I18nProvider>
      </QueryClientProvider>
    </AuthProvider>
  </ErrorBoundary>,
);
