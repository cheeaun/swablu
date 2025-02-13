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
import { throttle } from 'throttle-debounce';

const INTERSECTION_THRESHOLD = [0, 0.25, 0.5, 0.75, 1];

export default function RichEmbed({ embed }) {
  const hasEmbed = !!embed;
  if (!hasEmbed) return null;

  const hasImages =
    (/embed\.images/i.test(embed?.$type) && embed?.images) ||
    (embed?.media && /embed\.images/i.test(embed.media.$type));
  const hasVideo =
    (/embed\.video/i.test(embed?.$type) && embed?.playlist) ||
    (embed?.media && /embed\.video/i.test(embed.media.$type));
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
  const hasFeed = /generatorView/i.test(embed?.record?.$type);
  const hasList = /listView/i.test(embed?.record?.$type);

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
    !hasFeed &&
    !hasList;

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
      {hasList && <ListEmbed embed={embed} />}
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
    if (!gifRef.current) return;
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

const intersectingVideos = new Set();
let playingVideo = null;
let globalMuted = true;
let globalVolume = 1;

const videoIntersectionObserver = new IntersectionObserver(
  (entries) => {
    console.log('INTERSECTING VIDEOS', entries);
    entries.forEach((entry) => {
      const video = entry.target;
      if (entry.isIntersecting) {
        intersectingVideos.add(video);
        // Swap the src and data-src
        if (!video.src) {
          video.src = video.dataset.src;
          video.load();
        }
        throttledPlayVideo();
      } else {
        intersectingVideos.delete(video);
        video.src = '';
        video.load();
      }
    });
  },
  {
    rootMargin: '50%',
    threshold: [0.5, 1],
  },
);

const playVideo = (video, { muted } = {}) => {
  const hasMuted = typeof muted === 'boolean';
  if (video?.play && video !== playingVideo) {
    console.log('PLAY VIDEO', { video, playingVideo, muted });
    video.play();
    video.muted = hasMuted ? muted : globalMuted;
    if (hasMuted) globalMuted = muted;
    video.volume = globalVolume;
    return;
  }

  // Clean-up disconnected videos
  intersectingVideos.forEach((video) => {
    if (!video.isConnected) {
      intersectingVideos.delete(video);
    }
  });

  const videosCount = intersectingVideos.size;
  if (videosCount === 1 && intersectingVideos.has(playingVideo)) {
    console.log('PLAY VIDEO (DO NOTHING)', { video, playingVideo, muted });
    // Do nothing
    if (playingVideo?.paused) {
      playingVideo.play();
    }
    return;
  }
  if (videosCount) {
    // Get the video nearest to center of viewport
    const { innerHeight: winHeight, innerWidth: winWidth } = window;
    // const centerPoint = winHeight / 2;
    const centerPoint = [winHeight / 2, winWidth / 2];
    const firstVideo = intersectingVideos.values().next().value;
    const centerVideo =
      videosCount === 1
        ? firstVideo
        : Array.from(intersectingVideos).reduce((prev, curr) => {
            const prevRect = prev.getBoundingClientRect();
            // const prevCenter = prevRect.top + prevRect.height / 2;
            const prevCenter = [
              prevRect.top + prevRect.height / 2,
              prevRect.left + prevRect.width / 2,
            ];
            const currRect = curr.getBoundingClientRect();
            // const currCenter = currRect.top + currRect.height / 2;
            const currCenter = [
              currRect.top + currRect.height / 2,
              currRect.left + currRect.width / 2,
            ];
            // return Math.abs(currCenter - centerPoint) <
            //   Math.abs(prevCenter - centerPoint)
            //   ? curr
            //   : prev;
            const prevDistance = Math.sqrt(
              (prevCenter[0] - centerPoint[0]) ** 2 +
                (prevCenter[1] - centerPoint[1]) ** 2,
            );
            const currDistance = Math.sqrt(
              (currCenter[0] - centerPoint[0]) ** 2 +
                (currCenter[1] - centerPoint[1]) ** 2,
            );
            return currDistance < prevDistance ? curr : prev;
          }, firstVideo);

    // Pause all non-center videos
    if (videosCount > 1) {
      intersectingVideos.forEach((video) => {
        if (video !== centerVideo) {
          video.pause();
        }
      });
    }

    if (centerVideo !== playingVideo) {
      console.log('PLAY VIDEO', {
        centerVideo,
        muted,
        playingVideo,
        intersectingVideos,
      });
      centerVideo.play();
      centerVideo.muted = hasMuted ? muted : globalMuted;
      if (hasMuted) globalMuted = muted;
      centerVideo.volume = globalVolume;
    }
  }
};
const throttledPlayVideo = throttle(
  600,
  () => {
    playVideo(null, {
      muted: globalMuted,
    });
  },
  {
    noLeading: true,
  },
);
document.addEventListener(
  'scroll',
  () => {
    throttledPlayVideo();
  },
  { passive: true },
);

function Video({ embed }) {
  if (embed?.media) embed = embed.media;
  const videoRef = useRef();

  // React's famous video[muted] bug
  // https://github.com/facebook/react/issues/10389
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.defaultMuted = true;
    videoRef.current.muted = true;
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const handlePlay = () => {
      console.log('ONPLAY');
      if (playingVideo && playingVideo !== video) {
        playingVideo.pause();
      }
      playingVideo = video;
    };
    video.addEventListener('play', handlePlay);
    const handlePause = (e) => {
      console.log('ONPAUSE', e);
      if (playingVideo === video) {
        playingVideo = null;
      }
      // playingVideo = null;
    };
    video.addEventListener('pause', handlePause);
    const handleVolumeChange = (e) => {
      globalVolume = e.target.volume;
      // globalMuted = e.target.muted;
    };
    video.addEventListener('volumechange', handleVolumeChange);
    videoIntersectionObserver.observe(video);
    return () => {
      intersectingVideos.delete(video);
      videoIntersectionObserver.unobserve(video);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, []);

  return (
    <media-controller
      gesturesdisabled
      class="post-video"
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
      onClick={(e) => {
        console.log('MEDIA CONTROLLER CLICK', e, videoRef.current.paused);
        // if it's a click on media-control-bar, don't do anything
        if (e.target?.closest('media-control-bar')) return;
        console.log('MEDIA CONTROLLER CLICK 2', e, videoRef.current.paused);
        // If video is playing, if muted, unmute, else mute and pause
        if (videoRef.current.paused) {
          console.log('MEDIA CONTROLLER CLICK 3', e, videoRef.current.paused);
          // videoRef.current.play();
          playVideo(videoRef.current, {
            muted: false,
          });
        } else {
          if (videoRef.current.muted) {
            videoRef.current.muted = false;
            globalMuted = false;
          } else {
            videoRef.current.pause();
            videoRef.current.muted = true;
            globalMuted = true;
          }
        }
      }}
    >
      {embed.thumbnail && (
        <img className="post-video-bg" src={embed.thumbnail} alt="" />
      )}
      <hls-video
        ref={videoRef}
        // src={embed.playlist}
        data-src={embed.playlist}
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
        <media-mute-button
          onClick={() => {
            globalMuted = videoRef.current.muted;
          }}
        />
        <media-pip-button />
        <media-fullscreen-button />
      </media-control-bar>
    </media-controller>
  );
}

function ListEmbed({ embed }) {
  const { record } = embed || {};
  const { creator, description, name, uri } = record || {};
  // I know this is not "external", maybe need better class name
  return (
    <Link to={`/list/${encodeURIComponent(uri)}`} className="post-external">
      <div className="post-external-body">
        <div className="post-external-title">{name}</div>
        <div className="post-external-description">
          List by <AuthorText author={creator} as="b" />
          <br />
          {description}
        </div>
      </div>
    </Link>
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
