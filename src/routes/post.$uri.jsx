import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { IconChevronDown, IconReload } from '@tabler/icons-react';
import { queryOptions, useQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  useParams,
  useRouterState,
} from '@tanstack/react-router';
import { useLayoutEffect, useRef } from 'react';
import { useTitle } from 'react-use';
import AuthorText from '../components/AuthorText';
import BackButton from '../components/BackButton';
import RichPost from '../components/RichPost';
import { useAuth } from '../hooks/useAuth';

const STALE_TIME = Number.POSITIVE_INFINITY;

const postQueryOptions = ({ agent, uri }) =>
  queryOptions({
    queryKey: ['post', uri],
    queryFn: () => agent.getPostThread({ uri, depth: 10, parentHeight: 100 }),
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
  if (!props?.replies?.length) return null;

  const { open = true, ...otherProps } = props;
  if (open) {
    return <InnerReplies {...otherProps} />;
  }

  const allRepliesCount = getAllRepliesCount(otherProps.replies);

  return (
    <details className="replies-disclosure">
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

  const someReplies = replies.slice(0, 3);
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
            <InnerReplies
              replies={innerReplies}
              level={isUnindented ? level : level + 1}
              unindented={isUnindented}
            />
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
            <Replies replies={r.replies} />
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
    if (r.post.author?.did === post.author?.did) {
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
