import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTitle } from 'react-use';
import { useLingui } from '@lingui/react/macro';
import { useAuth } from '../hooks/useAuth';
import { useInfiniteQuery } from '@tanstack/react-query';
import Feed from '../components/Feed';
import FeedHeader from '../components/FeedHeader';
import { useRef, useEffect } from 'react';

export const Route = createFileRoute('/search')({
  component: Search,
});

function Search() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const { q, sort } = Route.useSearch();
  useTitle(t`Search${q ? `: ${q}` : ''}`);
  const { agent } = useAuth();
  const query = useInfiniteQuery({
    queryKey: ['search', q, sort],
    queryFn: ({ pageParam }) =>
      agent.app.bsky.feed.searchPosts({
        q,
        sort: sort || 'latest',
        limit: 25,
        cursor: pageParam,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage?.data?.cursor,
    enabled: !!q,
  });

  console.debug('SEARCH DATA', { query });

  const searchFieldRef = useRef(null);
  useEffect(() => {
    if (searchFieldRef.current) {
      if (q) {
        searchFieldRef.current.value = q;
      } else {
        searchFieldRef.current.focus();
      }
    }
  }, [q]);

  return (
    <main className="view-search">
      <FeedHeader
        TitleComponent={
          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ search: { q: e.target.q.value } });
            }}
          >
            <input
              type="search"
              name="q"
              placeholder={t`Search`}
              defaultValue={q}
            />
          </form>
        }
        queryKey={['search', q, sort]}
        query={query}
      />
      <Feed query={query} />
    </main>
  );
}
