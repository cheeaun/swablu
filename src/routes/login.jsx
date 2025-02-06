import { Trans, useLingui } from '@lingui/react/macro';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useRef, useDeferredValue } from 'react';
import { useTitle } from 'react-use';
import { useAuth } from '../hooks/useAuth';
import store from '../utils/store';
import { toast } from 'sonner';
import {
  Button,
  ComboBox,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
} from 'react-aria-components';
import AuthorText from '../components/AuthorText';
import { useDebounce } from 'react-use';

export const Route = createFileRoute('/login')({
  component: Login,
});

export function Login() {
  const { t } = useLingui();
  useTitle(t`Log in`);
  const [uiState, setUIState] = useState();
  const { agent, login } = useAuth();
  const navigate = useNavigate();

  const lastLoginIdentity = store.local.get('lastLoginIdentity');

  const [identityValue, setIdentityValue] = useState('');
  const deferredIdentityValue = useDeferredValue(identityValue);
  const [actors, setActors] = useState([]);

  useDebounce(
    () => {
      if (deferredIdentityValue) {
        agent.app.bsky.actor
          .searchActorsTypeahead({
            q: deferredIdentityValue,
            limit: 5,
          })
          .then((res) => {
            const actors = res?.data?.actors || [];
            if (actors.length) {
              setActors(actors);
            }
          })
          .catch((err) => {
            console.warn(err);
          });
      }
    },
    300,
    [deferredIdentityValue],
  );

  return (
    <main>
      <div className="main-body">
        <h1>
          <Trans>Log in</Trans>
        </h1>
        <form
          className="login-form"
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
              const provider = e.target.provider?.value?.trim?.();
              const value = e.target.identity.value.trim();
              store.local.set('lastLoginIdentity', value);
              await login(value, { handleResolver: provider });
              // 1s wait
              await new Promise((resolve) => setTimeout(resolve, 1000));
              navigate({ to: '/' });
            } catch (error) {
              console.error(error);
              toast.error(error?.message || error);
            }
            setUIState('idle');
          }}
        >
          {/* <label
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
          <br /> */}
          @{' '}
          <ComboBox
            defaultFilter={() => true}
            allowsCustomValue
            aria-label="Search for a user by handle"
            defaultInputValue={lastLoginIdentity || ''}
          >
            <Input
              name="identity"
              required
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
              disabled={uiState === 'loading'}
              placeholder="handle.bsky.social"
              onInput={(e) => {
                setIdentityValue(e.target.value);
              }}
            />
            <Popover>
              <ListBox
                items={actors.map((actor) => ({
                  id: actor.did,
                  ...actor,
                }))}
              >
                {(item) => (
                  <ListBoxItem textValue={item.handle}>
                    <AuthorText
                      as="span"
                      className="typeahead-item"
                      showAvatar
                      showName
                      author={item}
                    />
                  </ListBoxItem>
                )}
              </ListBox>
            </Popover>
          </ComboBox>{' '}
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
