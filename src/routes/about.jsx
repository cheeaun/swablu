import { Trans, useLingui } from '@lingui/react/macro';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useTitle } from 'react-use';
const { VITE_APP_NAME: APP_NAME } = import.meta.env;

export const Route = createFileRoute('/about')({
  component: About,
});

export function About() {
  const { t } = useLingui();
  useTitle(t`About`);
  return (
    <main>
      <div className="main-body">
        <h1>{APP_NAME}</h1>
        <p>
          <Trans>
            Experimental opinionated web client for{' '}
            <a href="https://bsky.social" target="_blank" rel="noreferrer">
              Bluesky
            </a>
            .
          </Trans>
        </p>
        <p>
          <a
            href="https://github.com/cheeaun/swablu"
            target="_blank"
            rel="noreferrer"
          >
            Built
          </a>{' '}
          by{' '}
          <a
            href="https://bsky.app/profile/cheeaun.com"
            target="_blank"
            rel="noreferrer"
          >
            @cheeaun.com
          </a>
        </p>
        <p>
          <a
            href="https://github.com/sponsors/cheeaun"
            target="_blank"
            rel="noreferrer"
          >
            Sponsor
          </a>{' '}
          ·{' '}
          <a
            href="https://www.buymeacoffee.com/cheeaun"
            target="_blank"
            rel="noreferrer"
          >
            Coffee
          </a>{' '}
          ·{' '}
          <a
            href="https://patreon.com/cheeaun"
            target="_blank"
            rel="noreferrer"
          >
            Patreon
          </a>
        </p>
        <hr />
        <p>
          <Link to="/login" className="button">
            <Trans>Log in</Trans>
          </Link>
        </p>
      </div>
    </main>
  );
}
