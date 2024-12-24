import { Trans, useLingui } from '@lingui/react/macro';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTitle } from 'react-use';
import { useAuth } from '../hooks/useAuth';
import store from '../utils/store';

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
          onSubmit={async (e) => {
            e.preventDefault();
            if (agent?.did) {
              const yes = confirm(
                'You are already signed in. Are you sure you want to log in again?',
              );
              if (!yes) return;
            }
            setUIState('loading');
            const value = e.target.identity.value.trim();
            await login(value);
            // 1s wait
            await new Promise((resolve) => setTimeout(resolve, 1000));
            store.session.set('lastLoginIdentity', value);
            navigate({ to: '/' });
            setUIState('idle');
          }}
        >
          <input
            type="text"
            name="identity"
            required
            disabled={uiState === 'loading'}
          />{' '}
          <button type="submit" disabled={uiState === 'loading'}>
            <Trans>Log in</Trans>
          </button>
        </form>
        <p>
          <Link to="/">
            <Trans>Back to home</Trans>
          </Link>
        </p>
      </div>
    </main>
  );
}
