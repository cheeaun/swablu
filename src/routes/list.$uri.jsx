import { useLingui } from '@lingui/react/macro';
import {
  queryOptions,
  useQuery,
  useSuspenseInfiniteQuery,
} from '@tanstack/react-query';
import { createFileRoute, useParams } from '@tanstack/react-router';

import Feed from '../components/Feed';
import FeedHeader from '../components/FeedHeader';
import { useAuth } from '../hooks/useAuth';

const STALE_TIME = Number.POSITIVE_INFINITY;
const GC_TIME = 6 * 60 * 60 * 1000; // 6 hours

const listFeedQueryOptions = ({ agent, uri, ...props }) =>
  queryOptions({
    queryKey: ['listFeed', uri],
    queryFn: ({ pageParam }) =>
      agent?.app.bsky.feed.getListFeed({ list: uri, cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage?.data?.cursor,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...props,
  });

const listQueryOptions = ({ agent, uri, ...props }) =>
  queryOptions({
    queryKey: ['list', uri],
    queryFn: () => agent?.app.bsky.graph.getList({ list: uri }),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...props,
  });

export const Route = createFileRoute('/list/$uri')({
  loader: ({ context, params }) => {
    const { agent } = context.auth;
    return context.queryClient.ensureInfiniteQueryData(
      listFeedQueryOptions({ agent, uri: params.uri }),
    );
  },
  component: ListPage,
});

export function ListPage() {
  const { t } = useLingui();
  const { agent, loaded } = useAuth();
  const { uri } = useParams({
    from: '/list/$uri',
  });
  const listQuery = useQuery(listQueryOptions({ agent, uri }));
  const query = useSuspenseInfiniteQuery(listFeedQueryOptions({ agent, uri }));

  if (!loaded) return null;

  console.debug('LIST DATA', {
    query,
    listQuery,
    dataUpdatedAt: query.dataUpdatedAt,
  });

  const title = listQuery.data?.data?.list?.name;
  const titleLoading = listQuery.isFetching;

  return (
    <>
      <main className="view-feed">
        <FeedHeader
          title={titleLoading ? '⋯' : title || t`List`}
          queryKey={['listFeed', uri]}
          query={query}
          autoRefresh
          noBack
        />
        <Feed query={query} />
      </main>
    </>
  );
}
