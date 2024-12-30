import { Trans, useLingui } from '@lingui/react/macro';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTitle } from 'react-use';
import { useAuth } from '../hooks/useAuth';
import store from '../utils/store';
import { toast } from 'sonner';
import { DEFAULT_HANDLE_RESOLVER } from '../utils/client';

export const Route = createFileRoute('/login')({
  component: Login,
});

export function Login() {
  const { t } = useLingui();
  useTitle(t`Log in`);
  const [uiState, setUIState] = useState();
  const { agent, login } = useAuth();
  const navigate = useNavigate();

  return (
    <main>
      <div className="main-body">
        <h1>
          <Trans>Log in</Trans>
        </h1>
        <form
          style={{
            paddingBottom: 20,
          }}
          onSubmit={async (e) => {
            e.preventDefault();
            if (agent?.did) {
              const yes = confirm(
                'You are already signed in. Are you sure you want to log in again?',
              );
              if (!yes) return;
            }
            setUIState('loading');
            try {
              const provider = e.target.provider.value.trim();
              const value = e.target.identity.value.trim();
              await login(value, { handleResolver: provider });
              // 1s wait
              await new Promise((resolve) => setTimeout(resolve, 1000));
              store.session.set('lastLoginIdentity', value);
              navigate({ to: '/' });
            } catch (error) {
              console.error(error);
              toast.error(error?.message || error);
            }
            setUIState('idle');
          }}
        >
          <label
            style={{
              display: 'block',
              paddingBottom: 10,
            }}
          >
            Hosting provider
            <br />
            <input
              type="url"
              name="provider"
              placeholder={DEFAULT_HANDLE_RESOLVER}
              disabled={uiState === 'loading'}
            />
          </label>
          <br />@{' '}
          <input
            type="text"
            name="identity"
            required
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
            disabled={uiState === 'loading'}
            placeholder="handle.bsky.social"
          />{' '}
          <button type="submit" disabled={uiState === 'loading'}>
            <Trans>Log in</Trans>
          </button>
        </form>
        <hr />
        <p>
          <Link to="/">
            <Trans>Back to home</Trans>
          </Link>
        </p>
      </div>
    </main>
  );
}
