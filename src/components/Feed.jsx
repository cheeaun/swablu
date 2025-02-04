import { Plural, Trans } from '@lingui/react/macro';
import { Link } from '@tanstack/react-router';
import RichPost from './RichPost';
import RichReason from './RichReason';
import { useModeratePost } from '../hooks/useModeratePost';
import { memo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useViewMode } from '../hooks/useViewMode';

export default function Feed({ query, massageFeed, allowSubFeed }) {
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

  console.debug('FEED', { query, dataUpdatedAt: query.dataUpdatedAt });

  const { pages } = data || {};

  const { moderatePost } = useModeratePost();

  const { viewMode } = useViewMode();

  return (
    <>
      {!!pages?.length && (
        <ul
          // className={`feed ${isFetching && !isFetchingNextPage ? 'loading' : ''}`}
          className={`feed ${viewMode || ''}`}
        >
          {pages.map((page, index) => {
            const posts = page.data.feed || page.data.posts;
            const firstPostID = posts?.[0]?.post?.uri || posts?.[0]?.uri;
            if (firstPostID) {
              return (
                <FeedPage
                  key={firstPostID}
                  firstPostID={firstPostID}
                  posts={posts}
                  context={massageFeed}
                  reset={index === 0 && pages.length === 1}
                  moderatePost={moderatePost}
                  allowSubFeed={allowSubFeed}
                />
              );
            }

            return (
              <li key="nada">
                <p className="post-nada">No posts.</p>
              </li>
            );
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

const SUB_FEED_LIMIT = 3;
function subFeedify(feed) {
  // Group reposts into separate feed items
  const subFeed = [];
  const feedCopy = [];
  const feedCount = feed.length;
  for (let i = 0; i < feedCount; i++) {
    const item = feed[i];
    const { reason } = item;
    if (/#reasonRepost/i.test(reason?.$type)) {
      subFeed.push(item);
    } else {
      feedCopy.push(item);
    }
  }
  const subFeedCount = subFeed.length;
  console.log('REPOSTS', subFeedCount, feedCount);

  if (subFeedCount <= SUB_FEED_LIMIT) {
    return feed;
  }

  const feedCopyCount = feedCopy.length;
  const subFeedRatio = subFeedCount / feedCount;

  // If > 90% of feed, give up
  if (subFeedRatio > 0.9 || feedCopyCount <= SUB_FEED_LIMIT) {
    return feed;
  }

  // If > 50% of feed, split subFeed in half, insert at one third and two third of feedCopy
  if (subFeedRatio > 0.5) {
    const half = Math.floor(subFeedCount / 2);
    feedCopy.splice(feedCopyCount / 3, 0, {
      kind: 'sub-feed',
      type: 'repost',
      posts: subFeed.slice(0, half),
    });
    feedCopy.splice((feedCopyCount / 3) * 2, 0, {
      kind: 'sub-feed',
      type: 'repost',
      posts: subFeed.slice(half),
    });
    return feedCopy;
  }
  // If < 50% of feed, insert subFeed at half of feedCopy
  const index = Math.floor(feedCopyCount / 2);
  feedCopy.splice(index, 0, {
    kind: 'sub-feed',
    type: 'repost',
    posts: subFeed,
  });
  return feedCopy;
}

function _FeedPage({ posts, context, reset, moderatePost, allowSubFeed }) {
  const { agent } = useAuth();
  let feed = context
    ? feedMassage(posts, { context, reset, authDid: agent?.did })
    : posts;

  if (allowSubFeed) {
    feed = subFeedify(feed);
  }

  return feed.map((item) => {
    if (item?.kind === 'sub-feed') {
      const posts = item?.posts?.filter((item) => {
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
          return false;
        }
        return true;
      });

      const key = posts[0].post.uri;

      return (
        <li key={key} className={`sub-feed sub-feed-${item?.type}`}>
          {item?.type === 'repost' && (
            <h3 className="repost-heading">
              <Plural value={posts.length} one="# repost" other="# reposts" />
            </h3>
          )}
          <FeedCarousel posts={posts} />
        </li>
      );
    }
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

    const key = post.uri + (reason?.indexedAt ? `_${reason.indexedAt}` : '');

    return <FeedItem as="li" key={key} item={item} />;
  });
}
const FeedPage = memo(_FeedPage, (oldProps, newProps) => {
  const oldFirstPostID = oldProps.firstPostID;
  const newFirstPostID = newProps.firstPostID;
  return oldFirstPostID === newFirstPostID;
});

function FeedCarousel(props) {
  const { posts } = props;

  return (
    <ul className="carousel">
      {posts.map((item) => {
        if (!item?.post) item = { post: item };
        const { post, reason } = item;

        const key =
          post.uri + (reason?.indexedAt ? `_${reason.indexedAt}` : '');

        return (
          <FeedItem
            as="li"
            key={key}
            item={item}
            richPostProps={{
              small: true,
            }}
          />
        );
      })}
    </ul>
  );
}

function _FeedItem(props) {
  const { as, item, richPostProps, ...otherProps } = props;
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
        {...richPostProps}
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
  clear() {
    this.cache.clear();
  },
});
const seenPostsStores = new Map();
window.__SEEN_POSTS_STORES__ = seenPostsStores;
function seenPostsStoreContext(context, reset) {
  if (seenPostsStores.has(context)) {
    if (reset) {
      seenPostsStores.get(context).clear();
    } else {
      return seenPostsStores.get(context);
    }
  }
  const store = seenPostsStore();
  seenPostsStores.set(context, store);
  return store;
}

function feedMassage(feed, { context, reset, authDid }) {
  console.log('FEED MASSAGE', { feed, context, reset, authDid });
  const store = seenPostsStoreContext(context, reset);
  return feed.filter((item) => {
    const { post, reply, reason } = item;
    const { root, parent } = reply || {};

    if (parent?.blocked || root?.blocked) return false;

    const hasParent = !!parent?.uri;
    const followingParent = parent?.author?.viewer?.following;
    const parentSameAuthor = parent?.author?.did === post?.author?.did;
    const hasRoot = !!root?.uri && root?.uri !== parent?.uri;
    const followingRoot = root?.author?.viewer?.following;
    const rootSameAuthor = root?.author?.did === post?.author?.did;

    const self = authDid === post?.author?.did;
    if (self) return true;
    const parentSelf = authDid === parent?.author?.did;
    if (parentSelf) return true;
    const rootSelf = authDid === root?.author?.did;
    if (rootSelf) return true;

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
