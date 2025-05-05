import { Plural, Trans, useLingui } from '@lingui/react/macro';
import {
  IconChevronDown,
  IconReload,
  IconArrowUp,
  IconArrowDown,
} from '@tabler/icons-react';
import { queryOptions, useQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  useParams,
  useRouterState,
  useRouter,
} from '@tanstack/react-router';
import { useLayoutEffect, useRef, useState, useCallback } from 'react';
import { useTitle } from 'react-use';
import AuthorText from '../components/AuthorText';
import BackButton from '../components/BackButton';
import RichPost from '../components/RichPost';
import { useAuth } from '../hooks/useAuth';

const STALE_TIME = Number.POSITIVE_INFINITY;

const postQueryOptions = ({ agent, uri }) =>
  queryOptions({
    queryKey: ['post', uri],
    queryFn: () => agent.getPostThread({ uri, depth: 30, parentHeight: 100 }),
    staleTime: STALE_TIME,
  });

export const Route = createFileRoute('/post/$uri')({
  // loader: ({ context, params }) =>
  //   context.queryClient.ensureQueryData(
  //     postQueryOptions({
  //       agent: context.auth.agent,
  //       uri: params.uri,
  //     }),
  //   ),
  component: Post,
});

export function Post() {
  const { t } = useLingui();
  const { agent } = useAuth();
  const placeholderPost = useRouterState({
    select: ({ location }) => location.state?.post,
  });
  const { uri } = useParams({
    from: '/post/$uri',
  });
  const query = useQuery(
    postQueryOptions({
      agent,
      uri,
    }),
  );

  console.debug('POST DATA', { query });

  const { data, error, isFetching, isStale, refetch } = query;

  const parent = data?.data?.thread?.parent;
  const post = data?.data?.thread?.post || placeholderPost;
  const _replies = data?.data?.thread?.replies;

  const postAuthorHandle = post?.author?.handle || post?.record?.author?.handle;
  let postText = post?.record?.text || '';
  if (postText.length > 64) {
    postText = `${postText.slice(0, 64)}…`;
  }
  const showPostTitle = !!postAuthorHandle && !!postText;
  useTitle(showPostTitle ? `${postAuthorHandle}: ${postText}` : t`Post`);

  // const [thread, replies] = walkThread([{ post }], _replies);
  const thread = walkThread(post, _replies);
  const parents = walkParents(parent);
  console.log('POST THREAD', { parent, parents, post, thread });

  const headerRef = useRef();
  const viewportRef = useRef();
  const prevParent = useRef(parent);
  useLayoutEffect(() => {
    if (!prevParent.current && parent && viewportRef.current && !isStale) {
      viewportRef.current.scrollIntoView();
      prevParent.current = parent;
    }
  }, [parent, isStale]);

  useLayoutEffect(() => {
    // Get header height
    const headerHeight = headerRef.current.getBoundingClientRect().height;
    // Set 'scroll-margin-top' on .viewport
    viewportRef.current.style.scrollMarginTop = `${headerHeight}px`;
  }, []);

  const [scrolledTop, setScrolledTop] = useState(false);
  useLayoutEffect(() => {
    const onScroll = () => {
      setScrolledTop(window.scrollY === 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // List of avatars, deduped
  const parentAvatars = parents
    ?.reduce((acc, parent) => {
      if (!acc.includes(parent.author.avatar)) {
        acc.push(parent.author.avatar);
      }
      return acc;
    }, [])
    .map((avatar) => (
      <img
        key={avatar}
        className="post-author-avatar"
        src={avatar}
        alt=""
        width={16}
        height={16}
        loading="lazy"
        decoding="async"
      />
    ));

  return (
    <main className="view-post">
      <header ref={headerRef}>
        <div>
          <BackButton />
        </div>
        <div>
          {isFetching ? (
            <div className="loader" />
          ) : (
            <div
              style={{
                textAlign: 'center',
              }}
            >
              {parents?.length ? (
                scrolledTop ? (
                  <button
                    type="button"
                    onClick={() => {
                      viewportRef.current.scrollIntoView({
                        behavior: 'smooth',
                      });
                    }}
                    aria-label={t`Scroll back down`}
                  >
                    <IconArrowDown size={16} />{' '}
                    <AuthorText author={post?.author} showAvatar as="span" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      window.scrollTo({
                        top: 0,
                        behavior: 'smooth',
                      });
                    }}
                    aria-label={t`Scroll to top`}
                  >
                    <IconArrowUp size={16} /> <span>{parentAvatars}</span>{' '}
                    <small className="insignificant">{parents.length}</small>
                  </button>
                )
              ) : (
                <>
                  <b>
                    <Trans>Post</Trans>
                  </b>
                  <div>
                    <small
                      style={{
                        opacity: 0.6,
                      }}
                    >
                      <AuthorText author={post?.author} showAvatar />
                    </small>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <div>
          <button
            type="button"
            disabled={isFetching}
            onClick={() => {
              refetch();
            }}
            aria-label={t`Refresh`}
          >
            <IconReload size={16} />
          </button>
        </div>
      </header>
      <Parents parents={parents} />
      <div className="viewport" ref={viewportRef}>
        <Thread thread={thread} />
      </div>
    </main>
  );
}

function Parents({ parents }) {
  if (!parents?.length) return null;

  return (
    <ul className="parents">
      {parents.map((p) => (
        <li
          key={p.uri}
          onPointerEnter={(e) => {
            // Debugging
            if (e.shiftKey) console.log(p);
          }}
        >
          <RichPost post={p} showFooter />
        </li>
      ))}
    </ul>
  );
}

function Thread({ thread }) {
  if (!thread?.length) return null;

  const onlyOneThread = thread.length === 1;
  return thread.map((th, i) => {
    const { post, replies } = th;
    if (!post) return null;
    const onlyOneReply = replies.length === 1;
    const allRepliesCount = getAllRepliesCount(replies);
    return (
      <div
        className="post-thread"
        key={post.record?.uri || post.uri}
        onPointerEnter={(e) => {
          // Debugging
          if (e.shiftKey) console.log(th);
        }}
      >
        <RichPost post={post} thread={i} />
        <Replies
          replies={replies}
          open={onlyOneThread || (onlyOneReply && allRepliesCount < 5)}
        />
      </div>
    );
  });
}

function getAllRepliesCount(replies) {
  let total = replies?.length || 0;
  if (!total) return 0;
  for (const r of replies) {
    total += getAllRepliesCount(r.replies);
  }
  return total;
}
function Replies(props) {
  const { id, open = true, ...otherProps } = props;

  const router = useRouter();
  const { latestLocation } = router;
  const detailsRef = useRef();
  const key = `${id}-${latestLocation.pathname}`;
  const detailsDefaultOpen = useRef(detailsToggleStore.get(key));
  useLayoutEffect(() => {
    if (detailsRef.current && detailsDefaultOpen.current) {
      detailsRef.current.open = true;
    }
  }, []);

  const handleToggle = useCallback(
    (e) => {
      const open = e.currentTarget.open;
      if (open) {
        detailsToggleStore.set(key, open);
      } else {
        detailsToggleStore.del(key);
        // Remove the default open state
        detailsDefaultOpen.current = false;
      }
    },
    [id, latestLocation],
  );

  if (!props?.replies?.length) return null;

  if (open) {
    return <InnerReplies {...otherProps} />;
  }

  const allRepliesCount = getAllRepliesCount(otherProps.replies);

  return (
    <details
      ref={detailsRef}
      className={`replies-disclosure ${detailsDefaultOpen.current ? 'default-open' : ''}`}
      onToggle={handleToggle}
    >
      <summary className="button">
        <div className="replies-preview">
          <RepliesPreview replies={otherProps.replies} />
        </div>
        <div>
          <Plural
            value={otherProps.replies?.length}
            one="# reply"
            other="# replies"
          />{' '}
          {allRepliesCount !== otherProps.replies?.length && (
            <span className="insignificant">
              ⸱{' '}
              <Plural
                value={allRepliesCount}
                one="# comment"
                other="# comments"
              />
            </span>
          )}{' '}
          <IconChevronDown className="arrow" size={16} />
        </div>
      </summary>
      <InnerReplies {...otherProps} />
    </details>
  );
}

function RepliesPreview({ replies }) {
  if (!replies?.length) return null;

  replies.sort((a, b) => {
    const aDate = new Date(a.post.record.createdAt);
    const bDate = new Date(b.post.record.createdAt);
    return aDate - bDate;
  });

  // First 3 with replies text
  const someReplies = replies.filter((r) => r.post?.record?.text).slice(0, 3);
  return (
    <ul>
      {someReplies.map((r) => {
        const { post } = r;
        const { record, author } = post;
        return (
          <li key={post.uri}>
            <img
              className="post-author-avatar"
              src={author?.avatar}
              alt=""
              width={16}
              height={16}
              loading="lazy"
              decoding="async"
            />{' '}
            {record.text}
          </li>
        );
      })}
    </ul>
  );
}

const MAX_PARENT_REPLIES_COUNT = 30;
const DEEP_MAX_PARENT_REPLIES_COUNT = 3;
const MIN_INNER_COMMENTS_COUNT = 2;
function InnerReplies({ replies, level = 1, unindented }) {
  if (!replies?.length) return null;

  replies.sort((a, b) => {
    const aDate = new Date(a.post.record.createdAt);
    const bDate = new Date(b.post.record.createdAt);
    return aDate - bDate;
  });

  const repliesCount = replies.length;

  return (
    <ul className="replies" data-level={level} style={{ '--level': level }}>
      {replies.map((r) => {
        const { post, replies: innerReplies } = r;
        const isUnindented =
          level > 2 && innerReplies?.length === 1 && repliesCount === 1;
        const innerCommentsCount = getAllRepliesCount(innerReplies);
        const maxRepliesCount =
          level > 1 ? DEEP_MAX_PARENT_REPLIES_COUNT : MAX_PARENT_REPLIES_COUNT;
        const newLevel = isUnindented ? level : level + 1;
        return (
          <li
            key={post.uri}
            onPointerEnter={(e) => {
              // Debugging
              if (e.shiftKey) console.log(r);
            }}
            className={unindented ? 'unindented' : ''}
          >
            <RichPost post={post} small context="reply" />
            {repliesCount > maxRepliesCount &&
            innerCommentsCount > MIN_INNER_COMMENTS_COUNT ? (
              <Replies
                id={post.uri}
                replies={innerReplies}
                open={false}
                level={newLevel}
              />
            ) : (
              <InnerReplies
                replies={innerReplies}
                level={newLevel}
                unindented={isUnindented}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function MiniMap({ parent, thread }) {
  // Render every post as blank divs, nested
  const Replies = ({ replies }) => {
    if (!replies?.length) return null;
    return (
      <ul>
        {replies.map((r) => (
          <li key={r.post.uri} data-uri={r.post.uri}>
            <Replies id={r.post.uri} replies={r.replies} />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <ul className="minimap">
      {parent?.map((p) => (
        <li key={p.post.uri} data-uri={p.post.uri} />
      ))}
      {thread?.map((th) => (
        <li key={th.post.uri} data-uri={th.post.uri}>
          <Replies replies={th.replies} />
        </li>
      ))}
    </ul>
  );
}

function walkParents(parent) {
  if (!parent) return null;
  const parents = [];
  let theParent = parent;
  do {
    const { post, parent: parentParent = null } = theParent;
    parents.unshift(post);
    theParent = parentParent;
  } while (theParent);
  return parents;
}

function walkThread(post, replies = [], thread = []) {
  const repliesBySameAuthor = [];
  const repliesByOthers = [];
  for (const r of replies) {
    if (r.post?.author?.did === post.author?.did) {
      repliesBySameAuthor.push(r);
    } else {
      repliesByOthers.push(r);
    }
  }
  thread.push({
    post,
    replies: repliesByOthers,
  });
  if (repliesBySameAuthor.length) {
    for (const r of repliesBySameAuthor) {
      walkThread(r.post, r.replies, thread);
    }
  }
  return thread;
}

const CACHE_LIMIT = 100;
const detailsToggleStore = {
  cache: new Map(),
  get(key) {
    return this.cache.get(key);
  },
  set(key, value) {
    this.cache.set(key, value);
    if (this.cache.size > CACHE_LIMIT) {
      this.cache.delete(this.cache.keys().next().value);
    }
  },
  del(key) {
    this.cache.delete(key);
  },
};
