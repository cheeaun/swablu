import { Plural, Trans, useLingui } from '@lingui/react/macro';
import {
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import { Link, createFileRoute, useRouterState } from '@tanstack/react-router';
import punycode from 'punycode';
import { useEffect, useState } from 'react';
import { useTitle } from 'react-use';
import { toast } from 'sonner';
import Feed from '../components/Feed';
import FeedHeader from '../components/FeedHeader';
import { useAuth } from '../hooks/useAuth';
import { text2RichText2Components } from '../utils/text2Components';
import { handleToPermalink } from '../utils/url-helpers';
import Bar from '../components/Bar';

const authorFeedQueryOptions = ({ agent, actor, view }) =>
  queryOptions({
    queryKey: ['authorFeed', actor, { view }],
    queryFn: ({ pageParam }) =>
      agent.getAuthorFeed({
        actor,
        cursor: pageParam,
        filter:
          view === 'replies'
            ? 'posts_with_replies'
            : view === 'media'
              ? 'posts_with_media'
              : 'posts_and_author_threads',
        includePins: !view,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage?.data?.cursor,
  });

export const Route = createFileRoute('/profile/$actor')({
  // loader: ({ context, params }) =>
  //   context.queryClient.ensureInfiniteQueryData(
  //     authorFeedQueryOptions({
  //       agent: context.auth.agent,
  //       actor: params.actor,
  //     }),
  //   ),
  component: Profile,
});

export function Profile() {
  const { t } = useLingui();
  const { agent } = useAuth();
  const { actor } = Route.useParams();
  const { view } = Route.useSearch();
  const placeholderProfile = useRouterState({
    select: ({ location }) => location.state?.profile,
  });
  const query = useInfiniteQuery(
    authorFeedQueryOptions({
      agent,
      actor,
      view,
    }),
  );
  const profileQuery = useQuery({
    queryKey: ['profile', actor],
    queryFn: () => agent.getProfile({ actor }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  console.debug('PROFILE DATA', { query, profileQuery, agent });

  const profileData = profileQuery?.data?.data || placeholderProfile;
  const {
    avatar,
    banner,
    description,
    displayName,
    followersCount,
    followsCount,
    handle,
    postsCount,
    did: profileDid,
    viewer: { following, followedBy } = {},
  } = profileData || {};

  const trueHandle = handle ? punycode.toUnicode(handle) : null;
  const handleHasPuny = trueHandle !== handle;

  useTitle(trueHandle ? trueHandle : 'Profile');

  const [richDescription, setRichDescription] = useState(null);
  useEffect(() => {
    if (!description) return;
    text2RichText2Components({ text: description, agent }).then(
      (components) => {
        setRichDescription(components);
      },
    );
  }, [description, agent]);

  const signedIn = agent?.did;
  const isSelf = profileDid === agent?.did;

  const [currentFollowing, setCurrentFollowing] = useState(following);
  useEffect(() => {
    setCurrentFollowing(following);
  }, [following]);

  const { mutate: follow, isPending: isFollowPending } = useMutation({
    mutationFn: ({ did }) => agent.follow(did),
    onMutate: (variables) => {
      const { did } = variables;
      setCurrentFollowing(true);
      return { did };
    },
    onSuccess: (data, variables) => {
      console.debug('FOLLOW SUCCESS', { data, variables });
      toast.success(`Following @${trueHandle}`);
      setCurrentFollowing(true);
    },
    onError: (error, variables) => {
      console.debug('FOLLOW ERROR', { error, variables });
      setCurrentFollowing(false);
    },
  });

  const { mutate: unfollow, isPending: isUnfollowPending } = useMutation({
    mutationFn: ({ followUri }) => agent.deleteFollow(followUri),
    onMutate: (variables) => {
      const { followUri } = variables;
      setCurrentFollowing(false);
      return { followUri };
    },
    onSuccess: (data, variables) => {
      console.debug('UNFOLLOW SUCCESS', { data, variables });
      toast.success(`Unfollowed @${trueHandle}`);
      setCurrentFollowing(false);
    },
    onError: (error, variables) => {
      console.debug('UNFOLLOW ERROR', { error, variables });
      setCurrentFollowing(true);
    },
  });

  const displayNameHandle = displayName || trueHandle;
  const displayNameHandeIsLong = displayNameHandle?.length > 32;

  return (
    <main className="view-profile">
      <FeedHeader
        title={trueHandle ? trueHandle : 'Profile'}
        queryKey={['authorFeed', actor, { view }]}
        query={query}
      />
      {profileData && (
        <>
          {!!banner && (
            <div className="profile-banner">
              <img
                src={banner}
                alt=""
                loading="lazy"
                decoding="async"
                style={{ aspectRatio: '3 / 1' }}
                onLoad={(e) => {
                  // Set correct aspect ratio
                  e.target.style.aspectRatio = `${e.target.naturalWidth} / ${e.target.naturalHeight}`;
                }}
              />
            </div>
          )}
          <div className="profile-header">
            <div className="profile-avatar">
              <img
                src={avatar}
                alt=""
                width="100"
                height="100"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="profile-info">
              <div
                className={`profile-name ${displayNameHandeIsLong ? 'long' : ''}`}
              >
                <b>{displayNameHandle}</b>
              </div>
              <a
                className="profile-handle"
                href={handleToPermalink(handle)}
                target="_blank"
                rel="noreferrer"
              >
                @{trueHandle}
              </a>
              {handleHasPuny && <div className="profile-puny">{handle}</div>}
              <div className="profile-did">{profileDid}</div>
              {!!(richDescription || description) && (
                <div className="profile-description">
                  {richDescription || description}
                </div>
              )}
            </div>
            <div className="profile-stats">
              <div className="profile-stats-items">
                <span>
                  <Plural
                    value={followersCount}
                    one="# follower"
                    other="# followers"
                  />
                </span>
                <span>
                  <Plural value={followsCount} other="# following" />
                </span>
                <span>
                  <Plural value={postsCount} one="# post" other="# posts" />
                </span>
              </div>
              {signedIn && !isSelf && (
                <div className="profile-stats-meta">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentFollowing) {
                        unfollow({ followUri: following });
                      } else {
                        follow({ did: profileDid });
                      }
                    }}
                    disabled={isFollowPending || isUnfollowPending}
                  >
                    {currentFollowing
                      ? t`Unfollow`
                      : followedBy
                        ? t`Follow back`
                        : t`Follow`}
                  </button>{' '}
                  {(followedBy || currentFollowing) && '‒ '}
                  {followedBy && currentFollowing
                    ? t`Mutual`
                    : followedBy
                      ? t`Follows you`
                      : currentFollowing
                        ? t`Following`
                        : null}
                </div>
              )}
            </div>
          </div>
        </>
      )}
      <Bar as="ul" className="tab-bar" hidden={!profileData}>
        <li>
          <Link
            to="."
            className="button small"
            search={{
              view: undefined,
            }}
            activeOptions={{
              includeSearch: true,
              explicitUndefined: true,
            }}
          >
            <Trans>Posts</Trans>
          </Link>
        </li>
        <li>
          <Link to="." className="button small" search={{ view: 'replies' }}>
            <Trans>+ Replies</Trans>
          </Link>
        </li>
        <li>
          <Link to="." className="button small" search={{ view: 'media' }}>
            <Trans>Media</Trans>
          </Link>
        </li>
      </Bar>
      <Feed query={query} massageFeed={`profile-${actor}-${view}`} />
    </main>
  );
}
