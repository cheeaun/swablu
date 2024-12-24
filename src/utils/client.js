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

console.log('CLIENT METADATA', finalClientMetadata);
const client = new BrowserOAuthClient({
  handleResolver: 'https://bsky.social',
  redirect_uri: REDIRECT_URI,
  responseMode: 'query',
  clientMetadata: finalClientMetadata,
});

client.addEventListener('deleted', (event) => {
  const { sub, cause } = event.detail;
  console.error(`Session for ${sub} is no longer available (cause: ${cause})`);
  store.session.del('currentAccountDid');
  toast.error(`You've been logged out. Cause: "${cause}"`, {
    duration: 10_000,
  });
});

export default client;
