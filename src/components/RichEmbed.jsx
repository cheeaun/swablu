import { AtUri } from '@atproto/api';
import { Link } from '@tanstack/react-router';
import 'hls-video-element';
import 'media-chrome';
import { useEffect, useRef } from 'react';
import { useIntersection } from 'react-use';
import AuthorText from './AuthorText';
import MediaCarousel from './MediaCarousel';
import RichPost from './RichPost';
import { IconArrowRight } from '@tabler/icons-react';

const INTERSECTION_THRESHOLD = [0.75, 0.9, 1];

export default function RichEmbed({ embed }) {
  const hasEmbed = !!embed;
  if (!hasEmbed) return null;

  const hasImages =
    (/embed\.images/i.test(embed?.$type) && embed?.images) ||
    (embed?.media && /embed\.images/i.test(embed.media.$type));
  const hasVideo = /embed\.video/i.test(embed?.$type) && embed?.playlist;
  const hasQuote =
    /embed\.record/i.test(embed?.$type) &&
    (embed.record?.value || embed.record?.record?.value);
  const hasNotFoundQuote =
    /embed\.record/i.test(embed?.$type) && embed.record?.notFound;
  const hasBlocked =
    /embed\.record/i.test(embed?.$type) && embed.record?.blocked;
  const hasExternal =
    /embed\.external/i.test(embed?.$type) && embed?.external?.uri;
  const hasGIF = hasExternal && /\.gif($|\?)/i.test(embed.external.uri);
  const hasStarterPack = /starterPack/i.test(embed?.record?.$type);
  const hasFeed = /feed\.defs/i.test(embed?.record?.$type);

  // For debugging
  const hasUnrenderedEmbed =
    hasEmbed &&
    !hasImages &&
    !hasVideo &&
    !hasQuote &&
    !hasExternal &&
    !hasNotFoundQuote &&
    !hasBlocked &&
    !hasGIF &&
    !hasStarterPack &&
    !hasFeed;

  return (
    <>
      {hasUnrenderedEmbed && <mark>EMBED: {embed.$type}</mark>}
      {hasImages && (
        <div
          className={`post-images ${(embed.images || embed.media.images).length > 1 ? 'multiple' : ''}`}
        >
          <MediaCarousel images={embed.images || embed.media.images} />
        </div>
      )}
      {hasVideo && (
        <div className="post-immersive">
          <Video embed={embed} />
        </div>
      )}
      {hasQuote && (
        <blockquote className="post-quote">
          <RichPost
            post={embed?.record?.record ? embed?.record : embed}
            small
            showFooter
          />
          <Link
            to={`/post/${encodeURIComponent(embed?.record?.record?.uri || embed.record.uri)}`}
            className="small button post-quote-view-action"
            state={{ post: embed?.record?.record ? embed?.record : embed }}
          >
            View post <IconArrowRight size={16} />
          </Link>
        </blockquote>
      )}
      {hasNotFoundQuote && (
        <blockquote className="post-quote">
          <div className="post small">ℹ️ Deleted</div>
        </blockquote>
      )}
      {hasBlocked && (
        <blockquote className="post-quote">
          <div className="post small">ℹ️ Blocked</div>
        </blockquote>
      )}
      {hasFeed && <FeedEmbed embed={embed} />}
      {hasStarterPack && <StarterPackEmbed embed={embed} />}
      {hasGIF ? (
        <div>
          <Gif embed={embed} />
        </div>
      ) : (
        hasExternal && (
          <a
            className="post-external"
            href={embed?.external?.uri}
            target="_blank"
            rel="noreferrer"
          >
            {embed?.external?.thumb && (
              <div className="post-external-thumb">
                <img
                  className=""
                  src={embed?.external?.thumb}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </div>
            )}
            <div className="post-external-body">
              <div className="post-external-domain">
                {new URL(embed?.external?.uri).hostname.replace(/^www\./, '')}
              </div>
              <div className="post-external-title">
                {embed?.external?.title || embed?.external?.uri}
              </div>
              {embed?.external?.description &&
                embed?.external?.description !== embed?.external?.title && (
                  <div className="post-external-description">
                    {embed?.external?.description}
                  </div>
                )}
            </div>
          </a>
        )
      )}
    </>
  );
}

function Gif({ embed }) {
  const gifRef = useRef();

  // React's famous video[muted] bug
  // https://github.com/facebook/react/issues/10389
  useEffect(() => {
    gifRef.current.defaultMuted = true;
    gifRef.current.muted = true;
  }, []);

  const videoObj = parseTenorGif(embed.external.uri);
  const intersection = useIntersection(gifRef, {
    threshold: INTERSECTION_THRESHOLD,
  });
  useEffect(() => {
    if (!videoObj?.uri) return;
    try {
      if (intersection?.isIntersecting) {
        gifRef.current?.play();
      } else {
        gifRef.current?.pause();
      }
    } catch (e) {}
  }, [intersection?.isIntersecting]);

  if (videoObj?.uri) {
    return (
      <media-controller
        nohotkeys
        class="post-gif"
        style={{
          aspectRatio:
            videoObj?.width && videoObj?.height
              ? `${videoObj.width} / ${videoObj.height}`
              : undefined,
          width: videoObj?.width,
          maxWidth: '100%',
        }}
      >
        <video
          ref={gifRef}
          src={videoObj.uri}
          poster={embed.external?.thumb}
          width={videoObj?.width}
          height={videoObj?.height}
          slot="media"
          crossOrigin="true"
          preload="metadata"
          playsInline
          // muted
          loop
          disablePictureInPicture
          disableRemotePlayback
        />
      </media-controller>
    );
  }

  if (/\.gif($|\?)/i.test(embed.external.uri)) {
    return (
      <img
        src={embed.external.uri}
        alt={embed.external?.description || ''}
        title={embed.external?.title || undefined}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return null;
}

function Video({ embed }) {
  const videoRef = useRef();

  // React's famous video[muted] bug
  // https://github.com/facebook/react/issues/10389
  useEffect(() => {
    videoRef.current.defaultMuted = true;
    videoRef.current.muted = true;
  }, []);

  const intersection = useIntersection(videoRef, {
    // trackVisibility: true,
    // delay: 100,
    threshold: INTERSECTION_THRESHOLD,
  });
  useEffect(() => {
    try {
      if (intersection?.isIntersecting) {
        videoRef.current?.play();
      } else if (document.pictureInPictureElement !== videoRef.current) {
        videoRef.current?.pause();
      }
    } catch (e) {
      console.warn(e);
    }
  }, [intersection?.isIntersecting]);

  return (
    <media-controller
      class={`post-video ${intersection?.isIntersecting ? 'intersecting' : 'not-intersecting'}`}
      data-orientation={
        embed.aspectRatio?.width < embed.aspectRatio?.height
          ? 'portrait'
          : 'landscape'
      }
      style={{
        aspectRatio: `${embed.aspectRatio?.width} / ${embed.aspectRatio?.height}`,
        '--width': embed.aspectRatio?.width,
        '--height': embed.aspectRatio?.height,
        width: embed.aspectRatio?.width,
        maxWidth: '100%',
      }}
    >
      <hls-video
        ref={videoRef}
        src={embed.playlist}
        poster={embed.thumbnail}
        width={embed.aspectRatio?.width}
        height={embed.aspectRatio?.height}
        slot="media"
        crossorigin
        preload="metadata"
        playsinline
        // muted
        loop
      />
      {/* <media-play-button slot="centered-chrome" notooltip /> */}
      <media-control-bar>
        <media-play-button />
        <media-time-display showduration notoggle />
        <media-time-range />
        <media-mute-button />
        <media-pip-button />
        <media-fullscreen-button />
      </media-control-bar>
    </media-controller>
  );
}

function FeedEmbed({ embed }) {
  const { record } = embed || {};
  const { creator, description, displayName, uri } = record || {};
  // I know this is not "external", maybe need better class name
  return (
    <Link to={`/feed/${encodeURIComponent(uri)}`} className="post-external">
      <div className="post-external-body">
        <div className="post-external-title">{displayName}</div>
        <div className="post-external-description">
          Feed by <AuthorText author={creator} as="b" />
          <br />
          {description}
        </div>
      </div>
    </Link>
  );
}

function StarterPackEmbed({ embed }) {
  const { record } = embed || {};
  const { name, description, uri } = record?.record || {};
  const author = record?.creator || {};
  const urip = new AtUri(record.uri);
  const { rkey } = urip;
  const url = `https://bsky.app/starter-pack/${author?.handle}/${rkey}`;
  const thumbURL = `https://ogcard.cdn.bsky.app/start/${author.did}/${rkey}`;
  return (
    <a
      className="post-starter-pack post-external"
      href={url}
      target="_blank"
      rel="noreferrer"
    >
      <div className="post-external-thumb">
        <img
          className=""
          src={thumbURL}
          alt=""
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="post-external-body">
        <div className="post-external-domain">bsky.app</div>
        <div className="post-external-title">{name}</div>
        <div className="post-external-description">
          Starter pack by <AuthorText author={author} as="b" />
          <br />
          {description}
        </div>
      </div>
    </a>
  );
}

// https://github.com/bluesky-social/social-app/blob/704e36c2801c4c06a3763eaef90c6a3e532a326d/src/lib/strings/embed-player.ts#L520-L570
function parseTenorGif(url) {
  const urlp = new URL(url);
  if (urlp.hostname !== 'media.tenor.com') return null;

  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  let [_, id, filename] = urlp.pathname.split('/');
  if (!id || !filename || !id.includes('AAAAC')) return null;

  id = id.replace('AAAAC', isSafari ? 'AAAP1' : 'AAAP3');
  filename = filename.replace('.gif', isSafari ? '.mp4' : '.webm');

  return {
    uri: `https://t.gifs.bsky.app/${id}/${filename}`,
    width: Number(urlp.searchParams.get('ww')) || null,
    height: Number(urlp.searchParams.get('hh')) || null,
  };
}
