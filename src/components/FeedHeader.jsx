import { useLingui } from '@lingui/react/macro';
import { IconReload } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useIdle, useTitle } from 'react-use';
import BackButton from './BackButton';

export default function FeedHeader({
  title,
  TitleComponent,
  queryKey,
  query,
  autoRefresh,
  noBack,
  headerStart = null,
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
        <FeedRefresh
          queryKey={queryKey}
          query={query}
          autoRefresh={autoRefresh}
        />
      </div>
    </header>
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
    function refetch() {
      refresh();
      timeoutId = setTimeout(refetch, 30 * 1000);
    }
    const isInert = document.querySelector('.media-dialog[open]');
    if (isIdle && window.scrollY === 0 && !isInert) {
      refetch();
    }
    return () => clearTimeout(timeoutId);
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
