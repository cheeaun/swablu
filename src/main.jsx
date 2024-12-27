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

const { VITE_BUGSNAG_API_KEY: BUGSNAG_API_KEY } = import.meta.env;

Bugsnag.start({
  apiKey: BUGSNAG_API_KEY,
  plugins: [new BugsnagPluginReact()],
});
BugsnagPerformance.start({ apiKey: BUGSNAG_API_KEY });

// Set appearance
const currentAppearance = store.local.get('appearance');
if (currentAppearance) {
  document.documentElement.dataset.theme = currentAppearance;
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

const ErrorBoundary = Bugsnag.getPlugin('react').createErrorBoundary(React);

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
