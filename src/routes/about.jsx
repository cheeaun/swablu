import { Trans, useLingui } from '@lingui/react/macro';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useTitle } from 'react-use';
const { VITE_APP_NAME: APP_NAME } = import.meta.env;
import logoSVGURL from '../../design/swablu.svg';

export const Route = createFileRoute('/about')({
  component: About,
});

export function About() {
  const { t } = useLingui();
  useTitle(t`About`);
  return (
    <main>
      <div className="main-body">
        <img
          src={logoSVGURL}
          alt=""
          width={100}
          height={100}
          style={{
            borderRadius: 16,
            marginTop: 32,
          }}
        />
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
        <p className="warning-block">
          <b>⚠️ Warning</b>: This project is in early development. Features are
          incomplete. Bugs are expected. Experimental designs are subject to
          change.
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
          {/* <a
            href="https://bsky.app/profile/cheeaun.com"
            target="_blank"
            rel="noreferrer"
          >
            @cheeaun.com
          </a> */}
          <Link to="/https://bsky.app/profile/cheeaun.com">@cheeaun.com</Link>
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
          </Link>{' '}
          or{' '}
          <Link to="/feed/at%3A%2F%2Fdid%3Aplc%3Az72i7hdynmk6r22z27h6tvur%2Fapp.bsky.feed.generator%2Fwhats-hot">
            Discover trending posts
          </Link>
        </p>
      </div>
    </main>
  );
}
