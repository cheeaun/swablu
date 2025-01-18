import { Plural, Trans, useLingui } from '@lingui/react/macro';
import {
  IconArrowRight,
  IconHeart,
  IconHeartFilled,
  IconMessageCircle,
  IconQuote,
  IconRepeat,
  IconRepeatOff,
  IconMessageCircleOff,
  IconUsers,
  IconCornerLeftUp,
} from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useEffect, useState, useRef } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  Tooltip,
  TooltipTrigger,
} from 'react-aria-components';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import usePostMeta from '../hooks/usePostMeta';
import { STAT_NUMBER_FORMAT } from '../utils/constants';
import text2Components from '../utils/text2Components';
import { postUriToPermalink } from '../utils/url-helpers';
import AuthorText from './AuthorText';
import { compose } from './Composer';
import RALink from './RALink';
import RichEmbed from './RichEmbed';
import TimeAgo from './TimeAgo';
import store from '../utils/store';
import TranslationBlock from './TranslationBlock';

export default function RichPost({
  post,
  className,
  small,
  thread,
  showFooter,
  context,
  preview,
  parentAuthor,
}) {
  // console.log('RENDER RICHPOST', post?.uri?.slice(-8));
  const { agent } = useAuth();
  let {
    record,
    embed,
    replyCount,
    likeCount,
    quoteCount,
    repostCount,
    viewer,
    threadgate,
  } = post;
  const embeds = record?.embeds;
  if (record?.value) record = { ...record, ...record.value };
  const author = post.author || record?.author;
  const { text, facets, createdAt, langs } = record || {};
  likeCount ||= record?.likeCount;
  quoteCount ||= record?.quoteCount;
  replyCount ||= record?.replyCount;
  repostCount ||= record?.repostCount;

  const richPost = text ? text2Components({ text, facets }) : null;

  const postUri = post.uri || record.uri;
  if (!postUri) {
    console.warn('Missing post uri', post);
  }

  const [postMeta, setPostMeta] = usePostMeta(postUri, {
    likeCount,
    quoteCount,
    replyCount,
    repostCount,
    liked: viewer?.like,
    reposted: viewer?.repost,
  });
  const firstLoad = useRef(true);
  useEffect(() => {
    // console.log('SET POST META', {
    //   postUri,
    //   likeCount,
    //   quoteCount,
    //   replyCount,
    //   repostCount,
    //   viewer,
    // });
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    setPostMeta(postUri, {
      likeCount,
      quoteCount,
      replyCount,
      repostCount,
      liked: viewer?.like,
      reposted: viewer?.repost,
    });
  }, [post]);
  // console.log('POST META', postMeta);

  const isThread = typeof thread === 'number';
  const firstThread = thread === 0;
  const showSide = !(small || isThread);
  const isHero = thread === 0;

  const isEmpty = !text && !embed && !embeds?.length;

  // Like
  const likeMutation = useMutation({
    mutationFn: ({ postUri, postCid, agent }) => {
      return agent.like(postUri, postCid);
    },
    onMutate: (variables) => {
      const { postUri } = variables;
      const prevLikeCount = postMeta.likeCount;
      console.log('LIKE', { prevLikeCount });
      setPostMeta(postUri, {
        likeCount: prevLikeCount + 1,
        liked: true,
      });
      return { prevLikeCount };
    },
    onSuccess: (data, variables) => {
      const { postUri } = variables;
      console.log('LIKE', { data });
      setPostMeta(postUri, {
        liked: data.uri,
      });
      toast.success(`Liked @${post.author?.handle}'s post`);
    },
    onError: (error, variables, context) => {
      const { postUri } = variables;
      const { prevLikeCount } = context;
      console.error('LIKE ERROR', { error });
      setPostMeta(postUri, {
        likeCount: prevLikeCount,
        liked: undefined,
      });
    },
  });

  // Unlike
  const deleteLikeMutation = useMutation({
    mutationFn: ({ likeUri, agent }) => {
      return agent.deleteLike(likeUri);
    },
    onMutate: (variables) => {
      const { likeUri, postUri } = variables;
      const prevLikeCount = postMeta.likeCount;
      console.log('DELETE LIKE', { prevLikeCount });
      setPostMeta(postUri, {
        likeCount: Math.max(0, prevLikeCount - 1),
        liked: false,
      });
      return { likeUri, prevLikeCount };
    },
    onSuccess: (data, variables) => {
      const { postUri } = variables;
      console.log('DELETE LIKE', { data });
      setPostMeta(postUri, {
        liked: undefined,
      });
      toast.success(`Unliked @${post.author?.handle}'s post`);
    },
    onError: (error, variables, context) => {
      const { postUri } = variables;
      const { likeUri, prevLikeCount } = context;
      console.error('DELETE LIKE ERROR', { error });
      setPostMeta(postUri, {
        likeCount: prevLikeCount,
        liked: likeUri,
      });
    },
  });

  // Repost
  const repostMutation = useMutation({
    mutationFn: ({ postUri, postCid, agent }) => {
      return agent.repost(postUri, postCid);
    },
    onMutate: (variables) => {
      const { postUri } = variables;
      const prevRepostCount = postMeta.repostCount;
      setPostMeta(postUri, {
        repostCount: prevRepostCount + 1,
        reposted: true,
      });
      return { prevRepostCount };
    },
    onSuccess: (data, variables) => {
      const { postUri } = variables;
      console.log('REPOST', { data });
      setPostMeta(postUri, {
        reposted: data.uri,
      });
      toast.success(`Reposted @${post.author?.handle}'s post`);
    },
    onError: (error, variables, context) => {
      const { postUri } = variables;
      const { prevRepostCount } = context;
      console.error('REPOST ERROR', { error });
      setPostMeta(postUri, {
        repostCount: prevRepostCount,
        reposted: undefined,
      });
    },
  });

  // Unrepost
  const deleteRepostMutation = useMutation({
    mutationFn: ({ repostUri, agent }) => {
      return agent.deleteRepost(repostUri);
    },
    onMutate: (variables) => {
      const { repostUri, postUri } = variables;
      const prevRepostCount = postMeta.repostCount;
      setPostMeta(postUri, {
        repostCount: Math.max(0, prevRepostCount - 1),
        reposted: false,
      });
      return { repostUri, prevRepostCount };
    },
    onSuccess: (data, variables) => {
      const { postUri } = variables;
      console.log('DELETE REPOST', { data });
      setPostMeta(postUri, {
        reposted: undefined,
      });
      toast.success(`Unreposted @${post.author?.handle}'s post`);
    },
    onError: (error, variables, context) => {
      const { postUri } = variables;
      const { repostUri, prevRepostCount } = context;
      console.error('DELETE REPOST ERROR', { error });
      setPostMeta(postUri, {
        repostCount: prevRepostCount,
        reposted: repostUri,
      });
    },
  });

  // Inline translation
  const [showInlineTranslation, setShowInlineTranslation] = useState(null);
  useEffect(() => {
    if (!langs?.length) return;
    const detectedLang = store.session.getJSON('detectedLang');
    if (!detectedLang?.length) return;
    // TODO: Filter detected lang codes to the ones that engines can support
    // But for now, let's do this the lazy hacky way
    // Get the first 2-char code
    const detectedLangCode = detectedLang.find((code) => code.length === 2);
    if (!detectedLangCode) return;
    // If there's one code in langs that's not in detectedLang, show inline translation
    const containsDetectedLang = langs.find((code) =>
      detectedLang.includes(code),
    );
    if (!containsDetectedLang) {
      setShowInlineTranslation({
        text,
        detectedLangCode,
      });
    }
  }, [langs, text]);

  const following = !!post?.author?.viewer?.following;

  // if (isEmpty) return null;

  let allowReplyGate = 'all';
  if (threadgate?.record) {
    const { allow } = threadgate.record;
    if (allow) {
      if (!allow?.length) {
        allowReplyGate = 'none';
      } else {
        allowReplyGate = 'some';
      }
    }
  }

  return (
    <div
      data-uri={post?.uri}
      className={`post ${small ? 'small' : ''} ${isThread ? 'thread' : ''} ${isHero ? 'hero' : ''} ${className || ''}`}
      data-thread={thread ?? undefined}
      tabIndex="-1"
    >
      {!preview && (
        <div className="post-contextmenu-container" hidden>
          <div className="post-contextmenu">
            <PostActions
              liked={postMeta?.liked}
              likeCount={postMeta?.likeCount}
              replyCount={postMeta?.replyCount}
              quoteCount={postMeta?.quoteCount}
              reposted={postMeta?.reposted}
              repostCount={postMeta?.repostCount}
              replyDisabled={viewer?.replyDisabled}
              quoteDisabled={viewer?.embeddingDisabled}
              likeHandler={() => {
                if (typeof postMeta?.liked === 'boolean') {
                  // Pending mode
                  return;
                }
                const likeUri = postMeta?.liked;
                if (likeUri) {
                  deleteLikeMutation.mutate({
                    postUri: post.uri,
                    likeUri,
                    agent,
                  });
                } else {
                  likeMutation.mutate({
                    postUri: post.uri,
                    postCid: post.cid,
                    agent,
                  });
                }
              }}
              replyHandler={() => {
                compose({
                  record: {
                    reply: {
                      root: post?.record?.reply?.root
                        ? {
                            uri: post.record.reply.root.uri,
                            cid: post.record.reply.root.cid,
                          }
                        : {
                            uri: post.uri,
                            cid: post.cid,
                          },
                      parent: {
                        uri: post.uri,
                        cid: post.cid,
                      },
                    },
                  },
                  replyPreview: post,
                });
              }}
              repostHandler={() => {
                if (typeof postMeta?.reposted === 'boolean') {
                  // Pending mode
                  return;
                }
                const repostUri = postMeta?.reposted;
                if (repostUri) {
                  deleteRepostMutation.mutate({
                    postUri: post.uri,
                    repostUri,
                    agent,
                  });
                } else {
                  repostMutation.mutate({
                    postUri: post.uri,
                    postCid: post.cid,
                    agent,
                  });
                }
              }}
              quoteHandler={() => {
                compose({
                  record: {
                    embed: {
                      $type: 'app.bsky.embed.record',
                      record: {
                        uri: post.uri,
                        cid: post.cid,
                      },
                    },
                  },
                  quotePreview: post,
                });
              }}
              postLink={`/post/${encodeURIComponent(postUri)}`}
              postState={{ post }}
            />
          </div>
        </div>
      )}
      {showSide && (
        <div className="post-side">
          <Link to={`/profile/${author?.did}`} state={{ profile: author }}>
            <img
              className={`post-author-avatar ${following ? 'post-author-following' : ''}`}
              src={author?.avatar}
              alt=""
              width="36"
              height="36"
              loading="lazy"
              decoding="async"
            />
          </Link>
        </div>
      )}
      <div className="post-main">
        <div className="post-header">
          <span className="post-author">
            {(firstThread || !isThread) && (
              <AuthorText
                author={author}
                showAvatar={!showSide}
                noTooltip={firstThread}
                showName={firstThread}
                hideTooltipAvatar
              />
            )}
          </span>
          <Link
            to={`/post/${encodeURIComponent(postUri)}`}
            className="post-timestamp"
            state={{ post }}
          >
            <TimeAgo dateTime={record?.createdAt} />
          </Link>
        </div>
        <div className="post-body">
          {!!richPost && (
            <div className="post-content">
              {!!parentAuthor?.did && parentAuthor?.did !== author?.did && (
                <small className="post-content-reply-hint">
                  <IconCornerLeftUp size={12} stroke={3} />@
                  <AuthorText author={parentAuthor} />
                </small>
              )}
              {richPost}
            </div>
          )}
          {!!showInlineTranslation && (
            <TranslationBlock
              text={showInlineTranslation.text}
              detectedLangCode={showInlineTranslation.detectedLangCode}
            />
          )}
          <RichEmbed embed={embed} />
          {embeds?.length > 0 && (
            <div className="post-embeds">
              {embeds.map((embed) => (
                <RichEmbed key={embed.$type} embed={embed} small />
              ))}
            </div>
          )}
        </div>
        {showFooter && (
          <div className="post-footer">
            {replyCount > 0 && (
              <Link
                to={`/post/${encodeURIComponent(postUri)}`}
                className="post-reply-count"
                state={{ post }}
              >
                <Plural value={replyCount} one="# reply" other="# replies" />
              </Link>
            )}
          </div>
        )}
        {isHero && (
          <div className="post-footer">
            {allowReplyGate !== 'all' && (
              <div>
                {allowReplyGate === 'none' && (
                  <>
                    <IconMessageCircleOff size={12} /> Replies disabled
                  </>
                )}
                {allowReplyGate === 'some' && (
                  <>
                    <IconUsers size={12} /> Some people can reply
                  </>
                )}
              </div>
            )}
            <RichStats
              replyCount={replyCount}
              likeCount={likeCount}
              quoteCount={quoteCount}
              repostCount={repostCount}
              createdAt={createdAt}
              permalink={postUriToPermalink(post.uri, {
                handle: post.author?.handle,
              })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function RichStats({
  replyCount,
  likeCount,
  quoteCount,
  repostCount,
  createdAt,
  permalink,
}) {
  const { i18n } = useLingui();
  return (
    <>
      {replyCount > 0 && (
        <span className="post-meta">
          <Plural value={replyCount} one="# reply" other="# replies" />
        </span>
      )}{' '}
      {likeCount > 0 && (
        <span className="post-meta">
          <Plural value={likeCount} one="# like" other="# likes" />
        </span>
      )}{' '}
      {repostCount > 0 && (
        <span className="post-meta">
          <Plural value={repostCount} one="# repost" other="# reposts" />
        </span>
      )}{' '}
      {quoteCount > 0 && (
        <span className="post-meta">
          <Plural value={quoteCount} one="# quote" other="# quotes" />
        </span>
      )}{' '}
      {createdAt && (
        <a
          className="post-meta"
          href={permalink}
          target="_blank"
          rel="noreferrer"
        >
          <time dateTime={createdAt}>
            {i18n.date(new Date(createdAt), {
              dateStyle: 'medium',
              timeStyle: 'short',
              hour12: true,
            })}
          </time>
        </a>
      )}
    </>
  );
}

const ACTIONS_TOOLTIP_DELAY = 300;
const SMALL_TEXT_SIZE_THRESHOLD = 100;
function PostActions({
  liked,
  likeCount,
  likeHandler,
  replyCount,
  replyHandler,
  quoteCount,
  quoteHandler,
  reposted,
  repostCount,
  repostHandler,
  postLink,
  postState,
  replyDisabled,
  quoteDisabled,
}) {
  const { i18n } = useLingui();
  const { agent } = useAuth();
  const loggedIn = !!agent?.did;

  const [menuOpen, setMenuOpen] = useState(false);
  const smallNumbers =
    likeCount > SMALL_TEXT_SIZE_THRESHOLD ||
    replyCount > SMALL_TEXT_SIZE_THRESHOLD ||
    repostCount > SMALL_TEXT_SIZE_THRESHOLD ||
    quoteCount > SMALL_TEXT_SIZE_THRESHOLD ||
    (likeCount || 0) +
      (replyCount || 0) +
      (repostCount || 0) +
      (quoteCount || 0) >
      SMALL_TEXT_SIZE_THRESHOLD;

  return (
    <div
      className={`actions ${menuOpen ? 'menu-open' : ''} ${smallNumbers ? 'small-numbers' : ''}`}
    >
      {!!likeHandler && (
        <TooltipTrigger delay={ACTIONS_TOOLTIP_DELAY}>
          <Button
            className={`${liked ? 'liked' : ''}`}
            onPress={likeHandler}
            isDisabled={!loggedIn}
          >
            {liked ? <IconHeartFilled size={16} /> : <IconHeart size={16} />}
            {likeCount > 0 && (
              <span className="count">
                {' '}
                {i18n.number(likeCount, STAT_NUMBER_FORMAT)}
              </span>
            )}
          </Button>
          <Tooltip>
            {liked ? <Trans>Unlike</Trans> : <Trans>Like</Trans>}
          </Tooltip>
        </TooltipTrigger>
      )}
      {!!replyHandler && (
        <TooltipTrigger delay={ACTIONS_TOOLTIP_DELAY}>
          <Button
            onPress={replyHandler}
            isDisabled={replyDisabled || !loggedIn}
          >
            {replyDisabled ? (
              <IconMessageCircleOff size={16} />
            ) : (
              <IconMessageCircle size={16} />
            )}
            {replyCount > 0 && (
              <span className="count">
                {' '}
                {i18n.number(replyCount, STAT_NUMBER_FORMAT)}
              </span>
            )}
          </Button>
          <Tooltip>
            <Trans>Reply</Trans>
          </Tooltip>
        </TooltipTrigger>
      )}
      {!!(repostHandler || quoteHandler) && (
        <TooltipTrigger delay={ACTIONS_TOOLTIP_DELAY}>
          <MenuTrigger
            onOpenChange={(open) => {
              setMenuOpen(open);
            }}
          >
            <Button
              className={reposted ? 'reposted' : ''}
              isDisabled={!loggedIn}
            >
              <IconRepeat size={16} stroke={reposted ? 3 : 2} />
              {(repostCount > 0 || quoteCount > 0) && (
                <span className="count">
                  {' '}
                  {repostCount > 0 &&
                    i18n.number(repostCount, STAT_NUMBER_FORMAT)}
                  {repostCount > 0 && quoteCount > 0 && '+'}
                  {quoteCount > 0 &&
                    i18n.number(quoteCount, STAT_NUMBER_FORMAT)}
                </span>
              )}
            </Button>
            <Popover>
              <Menu data-compact>
                <MenuItem data-icon onAction={repostHandler}>
                  {reposted ? (
                    <IconRepeatOff size={16} />
                  ) : (
                    <IconRepeat size={16} />
                  )}
                  {reposted ? <Trans>Unrepost</Trans> : <Trans>Repost</Trans>}
                </MenuItem>
                <MenuItem
                  data-icon
                  onAction={quoteHandler}
                  isDisabled={quoteDisabled}
                >
                  <IconQuote size={16} />
                  {quoteDisabled ? (
                    <Trans>Quote posts disabled</Trans>
                  ) : (
                    <Trans>Quote</Trans>
                  )}
                </MenuItem>
              </Menu>
            </Popover>
          </MenuTrigger>
          <Tooltip>
            {reposted ? (
              <Trans>Unrepost or Quote…</Trans>
            ) : (
              <Trans>Repost or Quote…</Trans>
            )}
          </Tooltip>
        </TooltipTrigger>
      )}
      {!!postLink && (
        <TooltipTrigger delay={ACTIONS_TOOLTIP_DELAY}>
          <RALink className="button" to={postLink} state={postState}>
            <IconArrowRight size={16} />
          </RALink>
          <Tooltip>
            <Trans>View post</Trans>
          </Tooltip>
        </TooltipTrigger>
      )}
    </div>
  );
}
