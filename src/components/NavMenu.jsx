import { Trans, useLingui } from '@lingui/react/macro';
import {
  IconBell,
  IconList,
  IconLogin2,
  IconLogout2,
  IconMenu2,
  IconNotebook,
  IconNotes,
  IconUserCircle,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useLinkProps } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  Separator,
} from 'react-aria-components';
import { useAuth } from '../hooks/useAuth';

export default function NavMenu() {
  const { t } = useLingui();
  const { agent, logout } = useAuth();

  // getPreferences
  const { data: preferences } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => agent.getPreferences(),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

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

  return (
    <MenuTrigger>
      <Button aria-label={t`Menu`}>
        <IconMenu2 size={16} />
      </Button>
      <Popover>
        <Menu>
          {agent?.did &&
            feeds.map((feed) => {
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
                  {type === 'feed' ? (
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
          <Separator />
          {agent?.did && (
            <>
              <MenuItem href="#/notifications" data-icon>
                <IconBell size={16} />
                <Trans>Notifications</Trans>
              </MenuItem>
              <MenuItem href={`#/profile/${agent?.did}`} data-icon>
                <IconUserCircle size={16} />
                <Trans>Profile</Trans>
              </MenuItem>
            </>
          )}
          <Separator />
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
  );
}

function MenuLink(props) {
  const linkProps = useLinkProps(props);
  const { className, ...otherLinkProps } = linkProps;
  return <MenuItem {...props} {...otherLinkProps} />;
}
