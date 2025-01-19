import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useLingui } from '@lingui/react/macro';
import { useAuth } from '../hooks/useAuth';
import { useInfiniteQuery } from '@tanstack/react-query';
import Feed from '../components/Feed';
import FeedHeader from '../components/FeedHeader';
import { useRef, useEffect, Fragment } from 'react';
import AuthorText from '../components/AuthorText';

export const Route = createFileRoute('/search')({
  component: Search,
});

function Search() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const { q, sort } = Route.useSearch();
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

  const actorsQuery = useInfiniteQuery({
    queryKey: ['searchActors', q],
    queryFn: ({ pageParam }) =>
      agent.app.bsky.actor.searchActors({
        q,
        limit: 25,
        cursor: pageParam,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage?.data?.cursor,
    enabled: !!q,
  });

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

  console.debug('SEARCH DATA', { query, actorsQuery });

  return (
    <main className="view-search">
      <FeedHeader
        title={q ? t`Search: ${q}` : t`Search`}
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
      <ActorsList query={actorsQuery} />
      <Feed query={query} />
    </main>
  );
}

function ActorsList({ query }) {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = query;

  const { pages } = data || {};

  if (!pages?.length) return null;

  return (
    <ul className="actors-list">
      {pages.map((page, index) => {
        const actors = page.data?.actors || [];
        const firstActorID = actors?.[0]?.did;
        return (
          <Fragment key={firstActorID}>
            {actors.map((actor) => (
              <li key={actor.did}>
                <AuthorText author={actor} showAvatar showName />
                {actor.description && (
                  <p className="actor-description">{actor.description}</p>
                )}
              </li>
            ))}
          </Fragment>
        );
      })}
      {hasNextPage && (
        <button
          type="button"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          More…
        </button>
      )}
    </ul>
  );
}
