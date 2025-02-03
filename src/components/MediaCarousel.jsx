import {
  IconX,
  IconZoomIn,
  IconZoomOut,
  IconArrowLeft,
  IconArrowRight,
} from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

export default function MediaCarousel(props) {
  const { images } = props;
  const [open, setOpen] = useState(false);
  const [openAll, setOpenAll] = useState(false);
  const [index, setIndex] = useState(0);
  const indexedThumb = useRef();
  const dialogRef = useRef();
  const imagesCount = images?.length || 0;
  if (!imagesCount) return null;
  const openDialog = (e, vtn) => {
    if (!document.startViewTransition) {
      setOpen(true);
      dialogRef.current?.showModal();
      setOpenAll(true);
    } else {
      e.target.style.viewTransitionName = vtn;
      document.startViewTransition(() => {
        e.target.style.viewTransitionName = '';
        flushSync(() => {
          setOpen(true);
        });
        dialogRef.current?.showModal();
        setOpenAll(true);
      });
    }
  };
  const closeDialog = () => {
    if (!document.startViewTransition) {
      setOpen(false);
      setOpenAll(false);
      dialogRef.current?.close();
    } else {
      indexedThumb.current?.focus();
      const vtn = `image-swoosh-${index}`;
      const transition = document.startViewTransition(() => {
        indexedThumb.current.style.viewTransitionName = vtn;
        flushSync(() => {
          setOpen(false);
          setOpenAll(false);
        });
        dialogRef.current?.close();
      });
      transition.ready.finally(() => {
        indexedThumb.current.style.viewTransitionName = '';
      });
    }
  };

  const carouselRef = useRef();

  return (
    <>
      {images.map((image, i) => (
        <img
          key={image.thumb}
          ref={i === index ? indexedThumb : null}
          tabIndex="0"
          role="button"
          className="post-image"
          onClick={(e) => {
            e.preventDefault();
            setIndex(i);
            openDialog(e, `image-swoosh-${i}`);
          }}
          src={image.thumb}
          alt={image.alt}
          width={image.aspectRatio?.width}
          height={image.aspectRatio?.height}
          loading="lazy"
          decoding="async"
          data-orientation={
            image.aspectRatio?.width < image.aspectRatio?.height
              ? 'portrait'
              : 'landscape'
          }
          style={{
            aspectRatio:
              image.aspectRatio?.width && image.aspectRatio?.height
                ? `${image.aspectRatio.width} / ${image.aspectRatio.height}`
                : undefined,
          }}
          onLoad={(e) => {
            const { naturalWidth, naturalHeight } = e.target;
            e.target.style.aspectRatio = `${naturalWidth} / ${naturalHeight}`;
          }}
        />
      ))}
      <dialog
        ref={dialogRef}
        // open={open}
        className="media-dialog"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            closeDialog();
          }
        }}
      >
        <div
          ref={carouselRef}
          className="media-carousel"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeDialog();
            }
          }}
          onScroll={(e) => {
            if (openAll) {
              // Set index based on current carousel snap position
              setIndex(
                Math.round(
                  (e.target.scrollLeft / e.target.scrollWidth) * imagesCount,
                ),
              );
            }
          }}
        >
          {open &&
            images.map(
              (image, i) =>
                ((open && i === index) || openAll) && (
                  <MediaCarouselItem
                    key={image.fullsize}
                    tabIndex="0"
                    showNext={i < imagesCount - 1}
                    showPrev={i > 0}
                    parentRef={carouselRef}
                  >
                    <img
                      // Load thumb first
                      src={index === i ? image.thumb : image.fullsize}
                      // Then load fullsize
                      data-src={image.fullsize}
                      onLoad={(e) => {
                        // Swap src on load
                        if (e.target.src !== e.target.dataset.src) {
                          e.target.src = e.target.dataset.src;
                        }
                        // Reset aspect ratio
                        const { naturalWidth, naturalHeight } = e.target;
                        e.target.style.aspectRatio = `${naturalWidth} / ${naturalHeight}`;
                      }}
                      alt={image.alt}
                      width={image.aspectRatio?.width}
                      height={image.aspectRatio?.height}
                      loading={index === i ? 'eager' : 'lazy'}
                      decoding={index === i ? 'sync' : 'async'}
                      style={{
                        viewTransitionName: `image-swoosh-${i}`,
                        aspectRatio:
                          image.aspectRatio?.width && image.aspectRatio?.height
                            ? `${image.aspectRatio.width} / ${image.aspectRatio.height}`
                            : undefined,
                      }}
                    />
                  </MediaCarouselItem>
                ),
            )}
        </div>
        <button
          type="button"
          onClick={closeDialog}
          aria-label="Close"
          className="media-dialog-close"
        >
          <IconX size={16} />
        </button>
      </dialog>
    </>
  );
}

function MediaCarouselItem(props) {
  const { children, parentRef, showNext, showPrev, ...otherProps } = props;
  const imageRef = useRef();
  const [zoomedIn, setZoomedIn] = useState(false);
  useEffect(() => {
    if (zoomedIn) {
      // Scroll to middle point of whole scroll viewport
      imageRef.current.scrollTo({
        top:
          imageRef.current.scrollHeight / 2 - imageRef.current.clientHeight / 2,
        left:
          imageRef.current.scrollWidth / 2 - imageRef.current.clientWidth / 2,
      });
    }
  }, [zoomedIn]);

  return (
    <div
      className={`post-dialog-image-container ${zoomedIn ? 'zoomed-in' : ''}`}
      {...otherProps}
    >
      <div ref={imageRef} className="post-dialog-image">
        {children}
      </div>
      <div className="post-dialog-image-actions">
        <button
          type="button"
          onClick={() => {
            if (document.startViewTransition) {
              document.startViewTransition(() => {
                setZoomedIn(!zoomedIn);
              });
            } else {
              setZoomedIn(!zoomedIn);
            }
          }}
        >
          {zoomedIn ? <IconZoomOut size={16} /> : <IconZoomIn size={16} />}
        </button>
        {showPrev && (
          <button
            type="button"
            onClick={() => {
              parentRef.current.scrollBy({
                left: -imageRef.current.clientWidth,
                behavior: 'smooth',
              });
            }}
          >
            <IconArrowLeft size={16} />
          </button>
        )}
        {showNext && (
          <button
            type="button"
            onClick={() => {
              parentRef.current.scrollBy({
                left: imageRef.current.clientWidth,
                behavior: 'smooth',
              });
            }}
          >
            <IconArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
