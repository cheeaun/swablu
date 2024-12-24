import { Trans, useLingui } from '@lingui/react/macro';
import {
  IconBell,
  IconFileTextSpark,
  IconHome,
  IconList,
  IconLogin2,
  IconLogout2,
  IconMenu4,
  IconNotebook,
  IconNotes,
  IconPencil,
  IconUserCircle,
  IconCheck,
  IconBrightnessFilled,
  IconInfoSquareRounded,
} from '@tabler/icons-react';
import { useLinkProps } from '@tanstack/react-router';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  Tooltip,
  TooltipTrigger,
  SubmenuTrigger,
} from 'react-aria-components';
import { useAuth } from '../hooks/useAuth';
import { compose } from './Composer';
import RALink from './RALink';
import store from '../utils/store';
import usePreferences from '../hooks/usePreferences';

export default function NavGlobal() {
  const { t } = useLingui();
  const { agent } = useAuth();
  const signedIn = !!agent?.did;
  const preferences = usePreferences();

  const [feeds, setFeeds] = useState([]);
  useEffect(() => {
    const { savedFeeds } = preferences || {};
    if (savedFeeds) {
      (async () => {
        const feedFeeds = savedFeeds.filter(
          ({ type, value } = {}) => type === 'feed' && value,
        );
        const feedGenerators = await agent.app.bsky.feed.getFeedGenerators({
          feeds: feedFeeds.map((feed) => feed.value),
        });

        const listFeeds = savedFeeds.filter(
          ({ type, value } = {}) => type === 'list' && value,
        );
        const lists = (
          await Promise.allSettled(
            listFeeds.map(({ value }) =>
              agent.app.bsky.graph.getList({ list: value }),
            ),
          )
        )
          .filter((list) => list.status === 'fulfilled')
          .map((list) => list.value.data.list);

        console.log({ lists });

        const finalFeeds = savedFeeds.map((feed) => {
          const { value, type } = feed;
          const view =
            type === 'feed'
              ? feedGenerators?.data?.feeds.find(
                  (feedGenerator) => feedGenerator?.uri === value,
                )
              : type === 'list'
                ? lists.find((list) => list?.uri === value)
                : type === 'timeline'
                  ? {
                      displayName: t`Following`,
                    }
                  : null;
          return {
            ...feed,
            __view: view,
          };
        });
        setFeeds(finalFeeds);
      })();
    }
  }, [preferences?.savedFeeds]);

  console.debug({ preferences, feeds });

  const navRef = useRef(null);
  const [popoverPlacement, setPopoverPlacement] = useState('top');
  useLayoutEffect(() => {
    // Use ResizeObserver to check if this component has moved due to CSS changes it based on media query
    // If this is near bottom edge of viewport, set popoverPlacement to top
    // If this is near left edge of viewport, set popoverPlacement to right
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const box = entry.borderBoxSize;
      const orientation =
        box[0].inlineSize > box[0].blockSize ? 'horizontal' : 'vertical';
      if (orientation === 'horizontal') {
        setPopoverPlacement('top');
        const navHeight = box[0].blockSize;
        document.documentElement.style.setProperty(
          '--nav-global-height',
          `${navHeight}px`,
        );
      } else {
        setPopoverPlacement('right');
      }
    });

    if (navRef.current) {
      observer.observe(navRef.current, {
        box: 'border-box',
      });
    }
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <nav ref={navRef} className="nav-global" aria-label={t`Global Navigation`}>
      <TooltipTrigger>
        <RALink to="/">
          <IconHome size={24} />
        </RALink>
        <Tooltip placement={popoverPlacement}>
          <Trans>Home</Trans>
        </Tooltip>
      </TooltipTrigger>
      {signedIn && (
        <>
          <TooltipTrigger>
            <MenuTrigger>
              <Button>
                <IconFileTextSpark size={24} />
              </Button>
              <Popover placement={popoverPlacement}>
                <Menu>
                  {!feeds?.length && (
                    <MenuItem isDisabled>
                      <Trans>No saved feeds</Trans>
                    </MenuItem>
                  )}
                  {feeds.map((feed) => {
                    if (!feed.__view) return null;
                    if (!/^(timeline|feed|list)$/.test(feed.type)) return null;
                    const { type, value } = feed;
                    const url =
                      type === 'feed'
                        ? `/feed/${encodeURIComponent(value)}`
                        : type === 'list'
                          ? `/list/${encodeURIComponent(value)}`
                          : type === 'timeline'
                            ? '/'
                            : null;
                    return (
                      <MenuLink to={url} key={value} data-icon>
                        {feed.__view?.avatar ? (
                          <img
                            className="menu-avatar"
                            src={feed.__view?.avatar}
                            width={16}
                            height={16}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            style={{
                              borderRadius: 3,
                            }}
                          />
                        ) : type === 'feed' ? (
                          <IconNotes size={16} />
                        ) : type === 'list' ? (
                          <IconList size={16} />
                        ) : type === 'timeline' ? (
                          <IconNotebook size={16} />
                        ) : null}
                        {feed.__view?.displayName || feed.__view?.name}
                      </MenuLink>
                    );
                  })}
                </Menu>
              </Popover>
            </MenuTrigger>
            <Tooltip placement={popoverPlacement}>
              <Trans>My Feeds</Trans>
            </Tooltip>
          </TooltipTrigger>
          <TooltipTrigger>
            <RALink to="/notifications">
              <IconBell size={24} />
            </RALink>
            <Tooltip placement={popoverPlacement}>
              <Trans>Notifications</Trans>
            </Tooltip>
          </TooltipTrigger>
        </>
      )}
      <div className="spacer" />
      <NavSecondary popoverPlacement={popoverPlacement} />
    </nav>
  );
}

export function NavSecondary({ popoverPlacement }) {
  const { agent, logout } = useAuth();
  const signedIn = !!agent?.did;

  const [appearance, setAppearance] = useState(
    store.local.get('appearance') || 'auto',
  );
  const updateAppearance = (appearance) => {
    if (!appearance) return;
    store.local.set('appearance', appearance);
    setAppearance(appearance);
    // Change color-scheme CSS in :root
    document.documentElement.style.setProperty(
      'color-scheme',
      {
        light: 'light',
        dark: 'dark',
        auto: 'light dark',
      }[appearance] || 'light-dark',
    );
  };

  return (
    <>
      {signedIn && (
        <>
          <TooltipTrigger>
            <Button onPress={compose}>
              <IconPencil size={24} />
            </Button>
            <Tooltip placement={popoverPlacement}>
              <Trans>Post</Trans>
            </Tooltip>
          </TooltipTrigger>
          <TooltipTrigger>
            <RALink to={`/profile/${encodeURIComponent(agent.did)}`}>
              <IconUserCircle size={24} />
            </RALink>
            <Tooltip placement={popoverPlacement}>
              <Trans>Profile</Trans>
            </Tooltip>
          </TooltipTrigger>
        </>
      )}
      <TooltipTrigger>
        <MenuTrigger>
          <Button>
            <IconMenu4 size={24} />
          </Button>
          <Popover placement={popoverPlacement}>
            <Menu>
              <SubmenuTrigger>
                <MenuItem data-icon>
                  <IconBrightnessFilled size={16} />
                  Appearance
                </MenuItem>
                <Popover>
                  <Menu>
                    <MenuItem
                      data-icon
                      onAction={() => updateAppearance('light')}
                    >
                      <IconCheck
                        size={16}
                        style={{
                          opacity: appearance === 'light' ? 1 : 0,
                        }}
                      />
                      Light
                    </MenuItem>
                    <MenuItem
                      data-icon
                      onAction={() => updateAppearance('dark')}
                    >
                      <IconCheck
                        size={16}
                        style={{ opacity: appearance === 'dark' ? 1 : 0 }}
                      />
                      Dark
                    </MenuItem>
                    <MenuItem
                      data-icon
                      onAction={() => updateAppearance('auto')}
                    >
                      <IconCheck
                        size={16}
                        style={{
                          opacity: appearance === 'auto' ? 1 : 0,
                        }}
                      />
                      Auto
                    </MenuItem>
                  </Menu>
                </Popover>
              </SubmenuTrigger>
              <MenuItem href="#/about" data-icon>
                <IconInfoSquareRounded size={16} />
                About
              </MenuItem>
              {agent?.did ? (
                <MenuItem
                  onAction={() => {
                    logout();
                  }}
                  data-icon
                >
                  <IconLogout2 size={16} />
                  <Trans>Log out</Trans>
                </MenuItem>
              ) : (
                <MenuItem href="#/login" data-icon>
                  <IconLogin2 size={16} />
                  <Trans>Log in</Trans>
                </MenuItem>
              )}
            </Menu>
          </Popover>
        </MenuTrigger>
        <Tooltip placement={popoverPlacement}>
          <Trans>Menu</Trans>
        </Tooltip>
      </TooltipTrigger>
    </>
  );
}

function MenuLink(props) {
  const linkProps = useLinkProps(props);
  const { className, ...otherLinkProps } = linkProps;
  return <MenuItem {...props} {...otherLinkProps} />;
}

export function NavGlobal2() {
  const { t } = useLingui();
  return (
    <nav
      className="nav-global nav-global-2"
      aria-label={t`Global Navigation 2`}
    >
      <NavSecondary popoverPlacement="left" />
    </nav>
  );
}
