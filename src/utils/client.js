import { BrowserOAuthClient } from '@atproto/oauth-client-browser';
import { toast } from 'sonner';
import { clientMetadata } from './clientMetadata';
import store from './store';

const { VITE_PUBLIC_URL: PUBLIC_URL } = import.meta.env;

const REDIRECT_URI = PUBLIC_URL;
const finalClientMetadata = import.meta.env.DEV
  ? clientMetadata()
  : clientMetadata({
      REDIRECT_URI,
      CLIENT_ID: `${PUBLIC_URL}/client-metadata.json`,
    });

export const DEFAULT_HANDLE_RESOLVER = 'https://api.bsky.app';
export function initClient({ handleResolver } = {}) {
  const client = new BrowserOAuthClient({
    handleResolver: handleResolver || DEFAULT_HANDLE_RESOLVER,
    redirect_uri: REDIRECT_URI,
    responseMode: 'query',
    clientMetadata: finalClientMetadata,
  });

  client.addEventListener('deleted', (event) => {
    const { sub, cause } = event.detail;
    console.error(
      `Session for ${sub} is no longer available (cause: ${cause})`,
    );
    store.session.del('currentAccountDid');
    toast.error(`You've been logged out. Cause: "${cause}"`, {
      duration: 10_000,
    });
    // Redirect to login page
    location.hash = '/login';
  });

  return client;
}
