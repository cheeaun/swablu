import { Plural, Trans } from '@lingui/react/macro';
import { Link } from '@tanstack/react-router';
import RichPost from './RichPost';
import RichReason from './RichReason';
import { useModeratePost } from '../hooks/useModeratePost';
import { memo } from 'react';

export default function Feed({ query, massageFeed }) {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    refetch,
  } = query;

  console.debug('FEED', { query, dataUpdatedAt: query.dataUpdatedAt });

  const { pages } = data || {};

  const { moderatePost } = useModeratePost();

  return (
    <>
      {!!pages?.length && (
        <ul
          // className={`feed ${isFetching && !isFetchingNextPage ? 'loading' : ''}`}
          className="feed"
        >
          {pages.map((page) => {
            const posts = page.data.feed || page.data.posts;
            const feed = massageFeed ? feedMassage(posts, massageFeed) : posts;
            return feed.map((item) => {
              if (!item?.post) item = { post: item };
              const { post, reason } = item;

              const mod = moderatePost(post);
              const modUI = mod?.ui?.('contentList');
              const isFiltered = modUI?.filter;

              if (isFiltered) {
                console.info(
                  'FILTERED POST',
                  post?.uri,
                  modUI?.filters?.[0]?.label?.val || modUI?.filters?.[0]?.type,
                  {
                    post,
                    modUI,
                  },
                );
                return null;
              }

              const key =
                post.uri + (reason?.indexedAt ? `_${reason.indexedAt}` : '');

              return <FeedItem as="li" key={key} item={item} />;
            });
          })}
        </ul>
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
    </>
  );
}

function _FeedItem(props) {
  const { as, item, ...otherProps } = props;
  const Component = as || 'div';

  const { post, reason, reply } = item;

  const { root, parent, grandparentAuthor } = reply || {};
  const showRoot =
    !reason && root?.cid && parent?.cid && root.cid !== parent.cid;
  const showViewThread =
    !reason && showRoot && parent?.record?.reply?.parent?.uri !== root?.uri;
  const showParent = !reason && parent?.cid;

  const threadSameAuthor =
    showRoot &&
    root?.author?.did === parent?.author?.did &&
    parent?.author?.did === post?.author?.did;

  return (
    <Component
      onPointerEnter={(e) => {
        // Debugging
        if (e.shiftKey) console.log(item);
      }}
      className={threadSameAuthor ? 'thread-same-author' : ''}
      {...otherProps}
    >
      {showRoot && <RichPost post={root} className="post-root" />}
      {showViewThread && (
        <div className="post-view-thread">
          <Link
            to={`/post/${encodeURIComponent(root.uri)}`}
            state={{ post: root }}
          >
            {root.replyCount > 1 ? (
              <Plural
                value={root.replyCount}
                one="# reply. View full thread"
                other="# replies. View full thread"
              />
            ) : (
              <Trans>View full thread</Trans>
            )}{' '}
            →
          </Link>
        </div>
      )}
      {showParent && (
        <RichPost
          post={parent}
          className="post-parent"
          parentAuthor={
            grandparentAuthor?.did !== root.author?.did && grandparentAuthor
          }
        />
      )}
      <RichReason reason={reason} />
      <RichPost
        post={post}
        showFooter
        parentAuthor={
          !showParent &&
          post?.record?.reply?.parent?.uri === parent?.uri &&
          parent?.author
        }
      />
    </Component>
  );
}
const FeedItem = memo(_FeedItem, (oldProps, newProps) => {
  const oldPostUri = oldProps.item?.post?.uri;
  const newPostUri = newProps.item?.post?.uri;
  return oldPostUri === newPostUri;
});

const CACHE_LIMIT = 500;
const seenPostsStore = () => ({
  cache: new Set(),
  add(key) {
    this.cache.add(key);
    if (this.cache.size > CACHE_LIMIT) {
      this.cache.delete(this.cache.values().next().value);
    }
  },
  has(key) {
    return this.cache.has(key);
  },
});
const seenPostsStores = new Map();
window.__SEEN_POSTS_STORES__ = seenPostsStores;
function seenPostsStoreContext(context) {
  if (seenPostsStores.has(context)) {
    return seenPostsStores.get(context);
  }
  const store = seenPostsStore();
  seenPostsStores.set(context, store);
  return store;
}

function feedMassage(feed, context) {
  const store = seenPostsStoreContext(context);
  return feed.filter((item) => {
    const { post, reply, reason } = item;
    const { root, parent } = reply || {};

    const hasParent = !!parent?.uri;
    const followingParent = parent?.author?.viewer?.following;
    const parentSameAuthor = parent?.author?.did === post?.author?.did;
    const hasRoot = !!root?.uri && root?.uri !== parent?.uri;
    const followingRoot = root?.author?.viewer?.following;
    const rootSameAuthor = root?.author?.did === post?.author?.did;

    // If not following parent author and not the same as post author
    if (hasParent && !followingParent && !parentSameAuthor) {
      // But if following root author that's different than post author, allow it.
      if (hasRoot && followingRoot && !rootSameAuthor) {
        // continue
      } else {
        return false;
      }
    }

    // If post is already shown, don't show it again
    if (store.has(post.uri)) return false;

    if (root?.uri) store.add(root.uri);
    if (parent?.uri) store.add(parent.uri);
    if (reason) store.add(post.uri);
    if (post?.embed?.record?.uri) store.add(post.embed.record.uri);
    return true;
  });
}
