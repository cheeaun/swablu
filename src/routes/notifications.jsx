import { Trans, useLingui } from '@lingui/react/macro';
import { IconReload } from '@tabler/icons-react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useTitle } from 'react-use';
import AuthorText from '../components/AuthorText';
import BackButton from '../components/BackButton';
import { useAuth } from '../hooks/useAuth';

export const Route = createFileRoute('/notifications')({
  component: Notifications,
});

export function Notifications() {
  const { i18n, t } = useLingui();
  useTitle(t`Notifications`);
  const queryClient = useQueryClient();
  const { agent } = useAuth();
  const query = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam }) =>
      agent.listNotifications({
        cursor: pageParam,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage?.data?.cursor,
  });

  console.debug('NOTIFICATIONS DATA', { query });

  const {
    data,
    error,
    isFetching,
    isStale,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = query;

  const refresh = useCallback(() => {
    queryClient.setQueryData(['notifications'], (data) => ({
      pages: data.pages.slice(0, 1),
      pageParams: data.pageParams.slice(0, 1),
    }));
    refetch();
  }, [queryClient, refetch]);

  const { pages = [] } = data || {};

  const currentDate = useRef('Today');

  const [posts, setPosts] = useState({});
  useEffect(() => {
    if (!pages.length) return;
    const lastPage = pages[pages.length - 1];
    const { data } = lastPage;
    const { notifications } = data;
    const subjects = new Set();
    for (const notification of notifications) {
      const { reasonSubject, record } = notification;
      if (reasonSubject && !record?.reply && !posts[reasonSubject]) {
        subjects.add(reasonSubject);
      }
    }
    if (subjects.size) {
      (async () => {
        const results = await agent.getPosts({ uris: [...subjects] });
        console.debug('NOTIFICATIONS POSTS', { results });
        const { posts: resultsPosts } = results.data;
        for (const post of resultsPosts) {
          posts[post.uri] = post;
        }
        setPosts({ ...posts });
      })();
    }
  }, [pages?.length, agent]);

  console.debug('NOTIFICATIONS', { pages, posts, query });

  return (
    <main className="view-notifications">
      <header>
        <div>
          <BackButton />
        </div>
        <div>
          {isFetching ? (
            <div className="loader" />
          ) : (
            <h2>
              <Trans>Notifications</Trans>
            </h2>
          )}
        </div>
        <div>
          <button
            type="button"
            disabled={isFetching}
            onClick={refresh}
            aria-label={t`Refresh`}
          >
            <IconReload size={16} />
          </button>
        </div>
      </header>
      <div>
        {!!pages?.length && (
          <div className="notifications-list">
            {pages.map((page) => {
              const notifications = page.data.notifications;
              return notifications.map((notification, i) => {
                const { author, record, uri, reason, reasonSubject } =
                  notification;
                const date = new Date(record?.createdAt);
                const dateString = i18n.date(date, {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                });
                const showDate = i === 0 || dateString !== currentDate.current;
                currentDate.current = dateString;
                const notificationSubject = reason === 'mention' ? uri : null;
                return (
                  <Fragment key={uri}>
                    {showDate && (
                      <h2 className="notifcation-date">
                        <time dateTime={date.toISOString()}>{dateString}</time>
                      </h2>
                    )}
                    <div className="notification-item">
                      <span
                        className={`notifcation-reason ${reason.toLowerCase()}`}
                      >
                        {reason}
                      </span>{' '}
                      {author?.handle && <AuthorText author={author} />}
                      {record?.text ? (
                        <Link
                          className="post-author-reason-subject"
                          to={`/post/${encodeURIComponent(uri)}`}
                        >
                          ‒{record.text}
                        </Link>
                      ) : reasonSubject ? (
                        <Link
                          className="post-author-reason-subject"
                          to={`/post/${encodeURIComponent(reasonSubject)}`}
                        >
                          →{' '}
                          {posts[reasonSubject]?.record?.text &&
                            posts[reasonSubject].record?.text}
                        </Link>
                      ) : (
                        notificationSubject && (
                          <Link
                            className="post-author-reason-subject"
                            to={`/post/${encodeURIComponent(notificationSubject)}`}
                          >
                            →{' '}
                            {notificationSubject && record.text && record.text}
                          </Link>
                        )
                      )}
                    </div>
                  </Fragment>
                );
              });
            })}
          </div>
        )}
        {hasNextPage && (
          <div className="feed-more">
            <button
              type="button"
              disabled={isFetchingNextPage}
              onClick={(e) => {
                e.preventDefault();
                fetchNextPage();
              }}
            >
              <Trans>More…</Trans>
            </button>
          </div>
        )}
        {!isFetching && !hasNextPage && (
          <div className="feed-end">
            <p>
              <Trans>The end.</Trans>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
