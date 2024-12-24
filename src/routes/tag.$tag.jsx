import { useLingui } from '@lingui/react/macro';
import { queryOptions, useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';

import { Trans } from '@lingui/react/macro';
import Feed from '../components/Feed';
import FeedHeader from '../components/FeedHeader';
import { useAuth } from '../hooks/useAuth';
import Bar from '../components/Bar';

const STALE_TIME = Number.POSITIVE_INFINITY;
const GC_TIME = 6 * 60 * 60 * 1000; // 6 hours

const tagQueryOptions = ({ agent, tag, sort, ...props }) =>
  queryOptions({
    queryKey: ['tag', tag, { sort }],
    queryFn: ({ pageParam }) =>
      agent?.app.bsky.feed.searchPosts({
        q: `#${tag}`,
        sort,
        cursor: pageParam,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage?.data?.cursor,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...props,
  });

export const Route = createFileRoute('/tag/$tag')({
  loader: ({ context, params }) => {
    const { agent } = context.auth;
    return context.queryClient.ensureInfiniteQueryData(
      tagQueryOptions({ agent, tag: params.tag, sort: params.sort }),
    );
  },
  component: TagRoute,
});

export function TagRoute() {
  const { t } = useLingui();
  const { agent } = useAuth();
  const { tag } = Route.useParams();
  const { sort = 'top' } = Route.useSearch();

  const query = useSuspenseInfiniteQuery(tagQueryOptions({ agent, tag, sort }));

  console.debug('TAG DATA', { query, dataUpdatedAt: query.dataUpdatedAt });

  return (
    <>
      <main className="view-feed">
        <FeedHeader
          title={t`#${tag}`}
          queryKey={['tag', tag, { sort }]}
          query={query}
          autoRefresh
        />
        <Bar as="ul" className="tab-bar">
          <li>
            <Link
              to="."
              className={`button small ${sort === 'top' ? 'active' : ''}`}
              search={{
                sort: undefined,
              }}
              activeOptions={{
                includeSearch: true,
                explicitUndefined: true,
              }}
            >
              <Trans>Top</Trans>
            </Link>
          </li>
          <li>
            <Link
              to="."
              className={`button small ${sort === 'latest' ? 'active' : ''}`}
              search={{ sort: 'latest' }}
            >
              <Trans>Latest</Trans>
            </Link>
          </li>
        </Bar>
        <Feed query={query} />
      </main>
    </>
  );
}
