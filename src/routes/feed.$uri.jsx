import { useLingui } from '@lingui/react/macro';
import {
  queryOptions,
  useQuery,
  useSuspenseInfiniteQuery,
} from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import AuthorText from '../components/AuthorText';
import Feed from '../components/Feed';
import FeedHeader from '../components/FeedHeader';
import { useAuth } from '../hooks/useAuth';

const STALE_TIME = Number.POSITIVE_INFINITY;
const GC_TIME = 6 * 60 * 60 * 1000; // 6 hours

const feedQueryOptions = ({ agent, uri, ...props }) =>
  queryOptions({
    queryKey: ['feed', uri],
    queryFn: ({ pageParam }) =>
      agent?.app.bsky.feed.getFeed({ feed: uri, cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage?.data?.cursor,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...props,
  });

const feedGeneratorQueryOptions = ({ agent, uri, ...props }) =>
  queryOptions({
    queryKey: ['feedGenerator', uri],
    queryFn: () => agent?.app.bsky.feed.getFeedGenerator({ feed: uri }),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...props,
  });

export const Route = createFileRoute('/feed/$uri')({
  loader: ({ context, params }) => {
    const { agent } = context.auth;
    return context.queryClient.ensureInfiniteQueryData(
      feedQueryOptions({ agent, uri: params.uri }),
    );
  },
  component: FeedPage,
});

export function FeedPage() {
  const { t } = useLingui();
  const { agent, loaded } = useAuth();
  const { uri } = Route.useParams();
  const feedGeneratorQuery = useQuery(
    feedGeneratorQueryOptions({ agent, uri }),
  );
  const query = useSuspenseInfiniteQuery(feedQueryOptions({ agent, uri }));

  if (!loaded) return null;

  console.debug('FEED DATA', {
    query,
    feedGeneratorQuery,
    dataUpdatedAt: query.dataUpdatedAt,
  });

  const title = feedGeneratorQuery.data?.data?.view?.displayName;
  const titleLoading = feedGeneratorQuery.isFetching;
  const creator = feedGeneratorQuery.data?.data?.view?.creator;

  return (
    <>
      <main className="view-feed">
        <FeedHeader
          title={titleLoading ? '⋯' : title || t`Feed`}
          TitleComponent={
            <div style={{ textAlign: 'center' }}>
              <b>{titleLoading ? '⋯' : title || t`Feed`}</b>
              <div>
                <small style={{ opacity: 0.6 }}>
                  <AuthorText author={creator} showAvatar />
                </small>
              </div>
            </div>
          }
          queryKey={['feed', uri]}
          query={query}
          autoRefresh
        />
        <Feed query={query} />
      </main>
    </>
  );
}
