import { useLingui } from '@lingui/react/macro';
import { queryOptions, useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { createFileRoute, redirect } from '@tanstack/react-router';

import Feed from '../components/Feed';
import FeedHeader from '../components/FeedHeader';
import { useAuth } from '../hooks/useAuth';
import { About } from './about';

const STALE_TIME = Number.POSITIVE_INFINITY;
const GC_TIME = 6 * 60 * 60 * 1000; // 6 hours

const timelineQueryOptions = ({ agent, ...props }) =>
  queryOptions({
    queryKey: ['timeline'],
    queryFn: ({ pageParam }) => agent?.getTimeline({ cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage?.data?.cursor,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...props,
  });

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    // Why this doesn't run
    console.log('INDEX BEFORE LOAD', { context });
    if (!context.auth.agent?.did) {
      throw redirect({
        to: '/about',
      });
    }
  },
  loader: ({ context }) => {
    const { agent } = context.auth;
    return context.queryClient.ensureInfiniteQueryData(
      timelineQueryOptions({ agent }),
    );
  },
  component: Index,
});

export function Index() {
  const { t } = useLingui();
  const { agent, loaded } = useAuth();
  const query = agent?.did
    ? useSuspenseInfiniteQuery(timelineQueryOptions({ agent }))
    : {};

  if (!loaded) return null;
  if (!agent?.did) {
    return <About />;
  }

  console.debug('INDEX DATA', { query, dataUpdatedAt: query.dataUpdatedAt });

  return (
    <>
      <main className="view-feed">
        <FeedHeader
          title={t`Following`}
          queryKey={['timeline']}
          query={query}
          autoRefresh
          noBack
        />
        <Feed query={query} massageFeed />
      </main>
    </>
  );
}
