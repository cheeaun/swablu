import { useLingui } from '@lingui/react/macro';
import {
  IconReload,
  IconLayoutDashboard,
  IconCheck,
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useIdle, useTitle } from 'react-use';
import BackButton from './BackButton';
import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  Tooltip,
  TooltipTrigger,
} from 'react-aria-components';
import { Trans } from '@lingui/react/macro';
import { useViewMode } from '../hooks/useViewMode';

export default function FeedHeader({
  title,
  TitleComponent,
  queryKey,
  query,
  autoRefresh,
  noBack,
  headerStart = null,
  showViewMode,
}) {
  useTitle(title);
  const headerRef = useRef(null);

  useLayoutEffect(() => {
    if (headerRef.current) {
      const headerHeight = headerRef.current.offsetHeight;
      document.documentElement.style.setProperty(
        '--header-height',
        `${headerHeight}px`,
      );
    }
  }, []);

  return (
    <header ref={headerRef}>
      {headerStart ||
        (!noBack ? (
          <div>
            <BackButton />
          </div>
        ) : (
          <div />
        ))}
      <div>
        {query.isFetching ? (
          <div className="loader" />
        ) : (
          TitleComponent || <h2>{title || '…'}</h2>
        )}
      </div>
      <div>
        {showViewMode && (
          <>
            <FeedViewMode />{' '}
          </>
        )}
        <FeedRefresh
          queryKey={queryKey}
          query={query}
          autoRefresh={autoRefresh}
        />
      </div>
    </header>
  );
}

function FeedViewMode() {
  const { viewMode, setViewMode } = useViewMode();
  return (
    <TooltipTrigger>
      <MenuTrigger>
        <Button>
          <IconLayoutDashboard size={16} />
        </Button>
        <Popover>
          <Menu>
            <MenuItem data-icon onAction={() => setViewMode('list')}>
              <IconCheck
                size={16}
                style={{
                  opacity: viewMode === 'list' ? 1 : 0,
                }}
              />
              List
            </MenuItem>
            <MenuItem data-icon onAction={() => setViewMode('carousel')}>
              <IconCheck
                size={16}
                style={{
                  opacity: viewMode === 'carousel' ? 1 : 0,
                }}
              />
              Carousel
            </MenuItem>
          </Menu>
        </Popover>
      </MenuTrigger>
      <Tooltip>
        <Trans>View mode</Trans>
      </Tooltip>
    </TooltipTrigger>
  );
}

// I know, this component is a mess
// It's a refresh button that refreshes the feed and also auto-refreshes it
function FeedRefresh({ queryKey, query, autoRefresh }) {
  const queryClient = useQueryClient();
  const { t } = useLingui();
  const { isFetching, refetch } = query;
  const isIdle = useIdle(15_000); // 15 seconds

  const refresh = useCallback(() => {
    queryClient.setQueryData(queryKey, (data) => ({
      pages: data.pages.slice(0, 1),
      pageParams: data.pageParams.slice(0, 1),
    }));
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!autoRefresh) return;
    let timeoutId = null;
    let rafId = null;
    function refetch() {
      rafId = requestAnimationFrame(() => {
        refresh();
        timeoutId = setTimeout(refetch, 30 * 1000);
      });
    }
    const isInert = document.querySelector('.media-dialog[open]');
    if (isIdle && window.scrollY === 0 && !isInert) {
      refetch();
    }
    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(rafId);
    };
  }, [isIdle, autoRefresh, refresh]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0 });
  };

  return (
    <button
      type="button"
      disabled={isFetching}
      onClick={() => {
        scrollToTop();
        refresh();
      }}
      aria-label={t`Refresh`}
    >
      <IconReload size={16} />
    </button>
  );
}
