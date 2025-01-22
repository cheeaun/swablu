import { Plural, useLingui } from '@lingui/react/macro';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import punycode from 'punycode';
import { useState } from 'react';
import {
  Tooltip,
  Link as TooltipLink,
  TooltipTrigger,
} from 'react-aria-components';
import { parse } from 'tldts';
import { useAuth } from '../hooks/useAuth';
import { STAT_NUMBER_FORMAT } from '../utils/constants';

const MAX_HANDLE_LENGTH = 46;

export default function AuthorText({
  as,
  author,
  noTooltip = false,
  showAvatar = false,
  showName = false,
  children = null,
  hideTooltipAvatar = false,
  className,
}) {
  const { agent } = useAuth();
  const { did, avatar, displayName, handle, viewer } = author || {};
  const { following } = viewer || {};

  const [hovered, setHovered] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['profile', did],
    queryFn: () => agent.getProfile({ actor: did }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!did && hovered,
  });

  if (!did) return null;

  const profileData = profileQuery?.data?.data || null;

  const { publicSuffix } = /\./.test(handle)
    ? parse(handle, {
        allowPrivateDomains: true,
      })
    : {};

  const trueHandle = punycode.toUnicode(handle);
  const handleTooLong = trueHandle.length > MAX_HANDLE_LENGTH;
  const displayHandle = handleTooLong
    ? `${trueHandle.slice(0, MAX_HANDLE_LENGTH)}…`
    : trueHandle;
  if (handleTooLong) {
    noTooltip = false;
  }

  // Change "domain.com" to "domain.<span class="public-suffix">com</span>"
  const publicSuffixRe = new RegExp(`\.${publicSuffix}$`, 'i');
  const niceDisplayHandle =
    publicSuffix && !handleTooLong ? (
      <>
        <span className="domain-without-suffix">
          {displayHandle.replace(publicSuffixRe, '')}
        </span>
        <span className="public-suffix">.{publicSuffix}</span>
      </>
    ) : (
      displayHandle
    );

  const customChildren = typeof children === 'function';
  if (customChildren) {
    children = children({
      niceDisplayHandle,
    });
  }

  const linkChildren = children || (
    <>
      {showAvatar && avatar && (
        <>
          <img
            className="post-author-avatar"
            src={avatar}
            alt=""
            width={showName ? 46 : 16}
            height={showName ? 46 : 16}
            loading="lazy"
            decoding="async"
          />{' '}
        </>
      )}
      <span className="post-author-name">
        {showName && displayName ? (
          <>
            <span className="name">{displayName}</span>
            <br />
            {niceDisplayHandle}
          </>
        ) : following ? (
          displayName
        ) : (
          niceDisplayHandle
        )}
      </span>
    </>
  );

  const link = `/profile/${encodeURIComponent(did)}`;
  const linkClassName = children
    ? className || undefined
    : `post-author-link ${className || ''}`;

  if (as) {
    const Component = as;
    return <Component>{linkChildren}</Component>;
  }

  const theAuthor = profileData || author;

  if (noTooltip) {
    return (
      <Link className={linkClassName} to={link} state={{ profile: theAuthor }}>
        {linkChildren}
      </Link>
    );
  }

  return (
    <TooltipTrigger delay={600}>
      <TooltipLink
        className={linkClassName}
        href={`#${link}`}
        onHoverStart={() => {
          setHovered(true);
        }}
      >
        {linkChildren}
      </TooltipLink>
      {theAuthor?.did && theAuthor?.displayName && (
        <Tooltip placement="top start" crossOffset={showAvatar ? 8 : -12}>
          <TooltipContent
            author={profileData || author}
            customChildren={customChildren}
            showAvatar={!hideTooltipAvatar && !showAvatar}
          />
        </Tooltip>
      )}
    </TooltipTrigger>
  );
}

function TooltipContent({ author, showAvatar, customChildren }) {
  const { t, i18n } = useLingui();
  const actor = author?.did;
  if (!actor) return null;

  const {
    avatar,
    displayName,
    handle,
    followersCount,
    viewer: { followedBy, following } = {},
  } = author || {};

  if (!avatar && !displayName) return null;

  return (
    <div className="author-tooltip-content">
      {showAvatar && avatar && (
        <img
          className="post-author-avatar"
          src={avatar}
          alt=""
          width={24}
          height={24}
          loading="lazy"
          decoding="async"
        />
      )}
      {following && !customChildren
        ? handle
        : !!displayName && <b>{displayName}</b>}
      {(followedBy || following) && (
        <span className="meta">
          {followedBy && following
            ? t`Mutual`
            : followedBy
              ? t`Follows you`
              : t`Following`}
        </span>
      )}
      {followersCount > 1 && (
        <span className="meta meta-lazy">
          <Plural
            value={followersCount}
            one={`${i18n.number(followersCount, STAT_NUMBER_FORMAT)} follower`}
            other={`${i18n.number(followersCount, STAT_NUMBER_FORMAT)} followers`}
          />
        </span>
      )}
    </div>
  );
}
