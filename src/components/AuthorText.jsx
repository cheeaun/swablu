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
  const { did, avatar, displayName, handle } = author || {};

  const [hovered, setHovered] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['profile', did],
    queryFn: () => agent.getProfile({ actor: did }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!did && hovered,
  });

  if (!did) return null;

  const profileData = profileQuery?.data?.data || null;

  const { publicSuffix } = parse(handle, {
    allowPrivateDomains: true,
  });

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

  if (typeof children === 'function') {
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

  if (noTooltip) {
    return (
      <Link className={linkClassName} to={link}>
        {linkChildren}
      </Link>
    );
  }

  const theAuthor = profileData || author;

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
            showAvatar={!hideTooltipAvatar && !showAvatar}
          />
        </Tooltip>
      )}
    </TooltipTrigger>
  );
}

function TooltipContent({ author, showAvatar }) {
  const { t, i18n } = useLingui();
  const actor = author?.did;
  if (!actor) return null;

  const {
    avatar,
    displayName,
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
      {!!displayName && <b>{displayName}</b>}
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
