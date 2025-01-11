import { RichText } from '@atproto/api';
import {
  IconLayoutBottombarCollapse,
  IconLayoutNavbarCollapse,
  IconLibraryPhoto,
  IconMovie,
  IconTrashX,
  IconX,
  IconDots,
  IconSparkles,
} from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import equal from 'fast-deep-equal';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Form,
  TextArea,
  Popover,
  DialogTrigger,
  Dialog,
  CheckboxGroup,
  Checkbox,
  Menu,
  MenuItem,
  MenuTrigger,
} from 'react-aria-components';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import AuthorText from './AuthorText';
import RichPost from './RichPost';
import Editor from './Editor';
import { LANGUAGES_MAP_CODE2 } from '../utils/languages';
import drafts from '../utils/drafts-store';

const ComposerInstances = new Map();
let rerenderComposer = () => {};
const MAX_IMAGES = 4;
const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/webm',
  'video/quicktime',
  'image/gif',
];
const MAX_GRAPHEME_LENGTH = 300;
const DEFAULT_LANGUAGES = ['en'];

const ComposerInstance = memo(
  ({ id, data }) => {
    console.log('COMPOSER INSTANCE', { id, data });
    const {
      record,
      replyPreview = null,
      quotePreview = null,
      text: prevText,
      languages: prevLanguages,
      images: prevImages,
      video: prevVideo,
      _collapsed: prevCollapsed,
    } = data;
    const { agent } = useAuth();

    const [images, setImages] = useState(prevImages || []);
    const [isPosting, setIsPosting] = useState(false);
    const hasImages = images.length > 0;
    const hasMaxImages = images.length >= MAX_IMAGES;
    const [video, setVideo] = useState(prevVideo || null);
    const [selectedLanguages, setSelectedLanguages] = useState(
      prevLanguages || DEFAULT_LANGUAGES,
    );

    const formRef = useRef();
    const formHandler = (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const text = formData.get('text');
      console.log('FORM DATA', { text, data });
      if (text) {
        (async () => {
          const toastId = toast(id);
          try {
            const payload = {};
            if (text) {
              const rt = new RichText({ text });
              await rt.detectFacets(agent);
              // const data = {
              //   text: rt.text,
              //   facets: rt.facets,
              //   ...record,
              // };
              payload.text = rt.text;
              payload.facets = rt.facets;
            }
            if (record) {
              Object.assign(payload, record);
            }
            if (selectedLanguages.length) {
              payload.langs = selectedLanguages;
            }
            setIsPosting(true);
            if (hasImages) {
              const imageFiles = images.map((file, i) => {
                const alt = formData.get(`image-alt-${i}`);
                const dimension = formData.get(`image-dimension-${i}`);
                const [width, height] = dimension.split('x').map(Number);
                return { file, alt, width, height };
              });
              let payloadImages;
              if (
                payload.embed?.record &&
                payload.embed.$type === 'app.bsky.embed.record'
              ) {
                payload.embed = {
                  $type: 'app.bsky.embed.recordWithMedia',
                  record: payload.embed,
                  media: {
                    $type: 'app.bsky.embed.images',
                    images: [],
                  },
                };
                payloadImages = payload.embed.media.images;
              } else {
                payload.embed = { $type: 'app.bsky.embed.images', images: [] };
                payloadImages = payload.embed.images;
              }
              for (const { file, alt, width, height } of imageFiles) {
                const blob = file instanceof Blob ? file : new Blob([file]);
                toast.loading(
                  file?.name ? `Uploading ${file.name}…` : 'Uploading image…',
                  {
                    id: toastId,
                  },
                );
                const imageResult = await agent.uploadBlob(blob);
                console.log('IMAGE RESULT', file, imageResult);
                payloadImages.push({
                  alt: alt || '',
                  image: imageResult.data.blob.original,
                  aspectRatio: {
                    width,
                    height,
                  },
                });
              }
            } else if (video) {
              // TODO: In progress, this doesn't work yet
              const blob = video instanceof Blob ? video : new Blob([video]);
              toast.loading(
                video?.name ? `Uploading ${video.name}…` : 'Uploading video…',
                {
                  id: toastId,
                },
              );
              const videoResult = await agent.app.bsky.video.uploadVideo(blob);
              console.log('VIDEO RESULT', videoResult);
            }
            toast.loading('Posting…', {
              id: toastId,
            });
            const result = await agent.post(payload);
            console.log('POST RESULT', result);
            toast.success('Posted!', {
              id: toastId,
              action: (
                <Link
                  to={`/post/${encodeURIComponent(result.uri)}`}
                  data-button
                  className="button"
                >
                  View
                </Link>
              ),
            });
            closeHandler(true);
          } catch (error) {
            console.error(error);
            toast.error('Failed to post', {
              id: toastId,
            });
          } finally {
            setIsPosting(false);
          }
        })();
      }
    };

    const isDirty = useCallback(() => {
      // Check if the form has any changes
      const formData = new FormData(formRef.current);
      const text = formData.get('text');
      if (text) return true;
      if (images.length > 0) return true;
      if (video) return true;
      return false;
    }, [images, video]);

    const closeHandler = (bypassDirtyCheck) => {
      if (!bypassDirtyCheck && isDirty()) {
        if (!window.confirm('Discard changes?')) return;
      }
      ComposerInstances.delete(id);
      drafts.del(id);
      rerenderComposer();
    };

    const dialogRef = useRef();
    const focusHandler = () => {
      dialogRef.current?.scrollIntoView({
        behavior: 'smooth',
        inline: 'nearest',
      });
    };

    const [collapsed, setCollapsed] = useState(prevCollapsed || false);
    useEffect(() => {
      drafts.update(id, (val) => ({
        ...val,
        _collapsed: collapsed,
      }));
    }, [collapsed, id]);

    const handleImageChange = useCallback(
      (e) => {
        const files = Array.from(e.target.files);
        if (files.length + images.length > 4) {
          toast.error('You can only upload up to 4 images.');
          return;
        }
        setImages((prevImages) => [...prevImages, ...files]);

        // Clear the file input
        e.target.value = '';
      },
      [images],
    );

    const handleVideoChange = useCallback((e) => {
      const file = e.target.files[0];
      if (file) {
        if (SUPPORTED_VIDEO_TYPES.includes(file.type)) {
          setVideo(file);
        }

        e.target.value = '';
      }
    }, []);

    const imageInputFileRef = useRef();
    const openImagePicker = () => {
      imageInputFileRef.current.click();
    };

    const videoInputFileRef = useRef();
    const openVideoPicker = () => {
      videoInputFileRef.current.click();
    };

    const textareaRef = useRef();
    const charCountRef = useRef();

    const editorTextRef = useRef(prevText || '');
    useEffect(() => {
      drafts.update(id, (val) => ({
        ...val,
        text: editorTextRef.current,
        languages: selectedLanguages,
        images,
        video,
        record,
        replyPreview,
        quotePreview,
      }));
    }, [record, images, video, replyPreview, quotePreview, selectedLanguages]);

    return (
      <dialog
        open
        className={`composer-dialog ${collapsed ? 'collapsed' : ''}`}
        ref={dialogRef}
        onFocus={focusHandler}
        data-id={id}
      >
        <div className="composer-instance">
          <div className="composer-header">
            <div className="composer-flex">
              {replyPreview?.author ? (
                <>
                  Replying to <AuthorText author={replyPreview.author} />
                </>
              ) : quotePreview?.author ? (
                <>
                  Quoting <AuthorText author={quotePreview.author} />
                </>
              ) : (
                <i style={{ opacity: 0.6 }}>New post</i>
              )}
            </div>
            <div className="loader" hidden={!isPosting} />
            <Button
              className="composer-collapse-button small"
              onPress={() => {
                setCollapsed(!collapsed);
                if (collapsed) {
                  dialogRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    inline: 'nearest',
                  });
                }
              }}
            >
              {collapsed ? (
                <IconLayoutNavbarCollapse size={16} />
              ) : (
                <IconLayoutBottombarCollapse size={16} />
              )}
            </Button>
            <Button
              onPress={() => {
                closeHandler();
              }}
              className="small"
              disabled={isPosting}
            >
              <IconX size={16} />
            </Button>
          </div>
          <Form ref={formRef} className="composer-body" onSubmit={formHandler}>
            {replyPreview && (
              <div className="composer-reply-preview">
                <RichPost post={replyPreview} small preview />
              </div>
            )}
            <TextArea
              ref={textareaRef}
              name="text"
              // autoFocus
              // disabled={isPosting}
              // placeholder={
              //   replyPreview || quotePreview ? '' : 'What are you doing?'
              // }
              hidden
            />
            <Editor
              defaultText={prevText}
              disabled={isPosting}
              onUpdate={({ editor }) => {
                const text = editor.getText();
                textareaRef.current.value = text || '';
                const rt = new RichText({ text });
                const charCount = rt.graphemeLength;
                charCountRef.current.textContent = `${MAX_GRAPHEME_LENGTH - charCount}`;
                editorTextRef.current = text;
                drafts.update(id, (val) => ({
                  ...val,
                  text,
                }));
              }}
              placeholder={
                replyPreview || quotePreview ? '' : 'What are you doing?'
              }
              items={async ({ query }) => {
                if (!query) return [];
                try {
                  const results =
                    await agent.app.bsky.actor.searchActorsTypeahead({
                      q: query,
                      limit: 8,
                    });
                  const { actors = [] } = results.data;
                  if (actors.length) {
                    return actors;
                  }
                } catch (error) {
                  console.error(error);
                }
                return [];
              }}
            />
            {images.length > 0 && (
              <div className="composer-images">
                {images.map((file, i) => (
                  <div key={`${i}-${file.type}`} className="composer-image">
                    <img
                      src={URL.createObjectURL(file)}
                      alt=""
                      width={80}
                      height={80}
                      onLoad={(e) => {
                        // Get natural width and height
                        const { naturalWidth, naturalHeight } = e.target;
                        document.querySelector(
                          `input[name="image-dimension-${i}"]`,
                        ).value = `${naturalWidth}x${naturalHeight}`;
                      }}
                    />
                    <input type="hidden" name={`image-dimension-${i}`} />
                    <TextArea
                      name={`image-alt-${i}`}
                      placeholder="Image description"
                      disabled={isPosting}
                      defaultValue={data[`images-alt-${i}`] || undefined}
                      onChange={(e) => {
                        const alt = e.target.value;
                        drafts.update(id, (val) => ({
                          ...val,
                          [`images-alt-${i}`]: alt,
                        }));
                      }}
                    />
                    <div className="composer-image-action">
                      <MenuTrigger>
                        <Button className="small">
                          <IconDots size={16} />
                        </Button>
                        <Popover>
                          <Menu>
                            <MenuItem
                              data-icon
                              onAction={async () => {
                                const imageId = `${i}-${file.type}-${file.name}-${Date.now()}`;
                                const toastId = toast(imageId);
                                toast.loading(
                                  'Attempting to describe image. Please wait…',
                                  {
                                    id: toastId,
                                  },
                                );
                                try {
                                  const { description } =
                                    await describeImage(file);
                                  toast.dismiss(toastId);
                                  // Fill the textarea for image-alt-${i} with description
                                  formRef.current[`image-alt-${i}`].value =
                                    description;
                                  // Better way is to trigger 'change' event on textarea, but React makes it difficult
                                  drafts.update(id, (val) => ({
                                    ...val,
                                    [`images-alt-${i}`]: description,
                                  }));
                                } catch (error) {
                                  console.error(error);
                                  toast.error('Failed to describe image', {
                                    id: toastId,
                                  });
                                }
                              }}
                            >
                              <IconSparkles size={16} />
                              Describe image
                            </MenuItem>
                            <MenuItem
                              data-icon
                              onAction={() => {
                                setImages((prevImages) =>
                                  prevImages.filter((_, index) => index !== i),
                                );
                                drafts.update(id, (val) => ({
                                  ...val,
                                  [`images-alt-${i}`]: undefined,
                                }));
                              }}
                            >
                              <IconTrashX size={16} />
                              Remove
                            </MenuItem>
                          </Menu>
                        </Popover>
                      </MenuTrigger>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!!video && (
              <div className="composer-video">
                {video.type === 'image/gif' ? (
                  <img
                    src={URL.createObjectURL(video)}
                    alt=""
                    width={80}
                    height={80}
                  />
                ) : (
                  <video
                    src={`${URL.createObjectURL(video)}#t=0.001`}
                    preload="metadata"
                    disablePictureInPicture
                    disableRemotePlayback
                    muted
                    width={80}
                    height={80}
                  />
                )}
                <TextArea
                  name="video-alt"
                  placeholder="Video description"
                  disabled={isPosting}
                  defaultValue={data['video-alt'] || undefined}
                  onChange={(e) => {
                    const alt = e.target.value;
                    drafts.update(id, (val) => ({
                      ...val,
                      'video-alt': alt,
                    }));
                  }}
                />
                <div className="composer-video-action">
                  <Button
                    type="button"
                    className="small"
                    disabled={isPosting}
                    onPress={() => {
                      setVideo(null);
                      drafts.update(id, (val) => ({
                        ...val,
                        'video-alt': undefined,
                      }));
                    }}
                  >
                    <IconTrashX size={16} />
                  </Button>
                </div>
              </div>
            )}
            {quotePreview && (
              <div className="composer-quote-preview">
                <RichPost post={quotePreview} small preview />
              </div>
            )}
            <input
              type="file"
              ref={imageInputFileRef}
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />
            <input
              type="file"
              ref={videoInputFileRef}
              accept={SUPPORTED_VIDEO_TYPES.join(',')}
              style={{ display: 'none' }}
              onChange={handleVideoChange}
            />
            <div className="composer-form-footer">
              <button
                type="button"
                onClick={openImagePicker}
                disabled={isPosting || hasMaxImages}
              >
                <IconLibraryPhoto size={16} />
              </button>
              <button
                type="button"
                onClick={openVideoPicker}
                disabled={isPosting || hasMaxImages}
                hidden // TODO: Hide video upload for now
              >
                <IconMovie size={16} />
              </button>
              <div className="composer-flex" />
              <span className="composer-char-count" ref={charCountRef} />
              <DialogTrigger>
                <Button
                  type="button"
                  disabled={isPosting}
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flexShrink: 1,
                    justifyContent: 'flex-start',
                  }}
                >
                  {selectedLanguages.length
                    ? LANGUAGES_MAP_CODE2[selectedLanguages[0]].name
                    : '??'}
                  {selectedLanguages.length > 1
                    ? ` +${selectedLanguages.length - 1}`
                    : ''}
                </Button>
                <Popover
                  style={{
                    width: '28em',
                  }}
                >
                  <Dialog className="composer-languages-dialog">
                    <div className="composer-languages-header">
                      <h3>Choose post languages</h3>
                    </div>
                    <div className="composer-languages-list">
                      <CheckboxGroup
                        value={selectedLanguages}
                        onChange={setSelectedLanguages}
                        isInvalid={selectedLanguages.length === 0}
                        aria-label="Languages"
                      >
                        {Object.entries(LANGUAGES_MAP_CODE2).map(
                          ([code, lang]) =>
                            code && (
                              <Checkbox key={code} value={code} data-icon>
                                <div className="checkbox">
                                  <svg viewBox="0 0 18 18" aria-hidden="true">
                                    <polyline points="1 9 7 14 15 4" />
                                  </svg>
                                </div>
                                {lang.name}
                              </Checkbox>
                            ),
                        )}
                      </CheckboxGroup>
                    </div>
                    <div className="composer-languages-footer">
                      {selectedLanguages.length > 0 &&
                        selectedLanguages
                          .map((code) => LANGUAGES_MAP_CODE2[code].name)
                          .join(' ⸱ ')}
                    </div>
                  </Dialog>
                </Popover>
              </DialogTrigger>
              <Button
                type="submit"
                disabled={isPosting}
                className="button-primary"
              >
                {replyPreview ? 'Reply' : quotePreview ? 'Quote' : 'Post'}
              </Button>
            </div>
          </Form>
        </div>
      </dialog>
    );
  },
  (oldProps, newProps) => {
    // Only re-render if the id is not the same
    return oldProps.id === newProps.id;
  },
);

function _Composer() {
  const [_, rerender] = useState();
  rerenderComposer = () => rerender({});
  const [isComposing, setIsComposing] = useState(ComposerInstances.size > 0);
  const containerRef = useRef();

  useEffect(() => {
    (async () => {
      try {
        const entries = await drafts.entries();
        console.log('COMPOSER ENTRIES', entries);
        if (entries.length) {
          for (const entry of entries) {
            const [id, data] = entry;
            ComposerInstances.set(id, data);
          }
          setIsComposing(true);
        }
      } catch (error) {
        console.error(error);
      }
    })();
  }, []);

  console.log('COMPOSER', { isComposing });
  useEffect(() => {
    // Scroll to end horizontally
    if (isComposing) {
      setTimeout(() => {
        containerRef.current.scrollTo({
          left: containerRef.current.scrollWidth,
          behavior: 'smooth',
        });
      }, 200);
    } else if (ComposerInstances.size > 0) {
      setIsComposing(true);
    }
  }, [isComposing, _]);

  if (!isComposing) return null;

  return (
    <div className="dialogs-container" ref={containerRef}>
      {Array.from(ComposerInstances).map(([key, value]) => {
        return <ComposerInstance key={key} id={key} data={value} />;
      })}
    </div>
  );
}
export const Composer = memo(_Composer);

// record is Partial<AppBskyFeedPost.Record> & Omit<AppBskyFeedPost.Record, 'createdAt'>
// replyPreview is whole post object that is being replied to
// quotePreview is whole post object that is being quoted
/**
 * @typedef {import('@atproto/api').AppBskyFeedPost.Record} PostRecord
 * @param {Partial<PostRecord> & Omit<PostRecord, 'createdAt'>} record
 */
export function compose({ record, replyPreview, quotePreview }) {
  console.log('COMPOSE', { record, replyPreview, quotePreview });

  // Check if an instance for the record already exists
  for (const [key, value] of ComposerInstances) {
    const { record: existingRecord } = value;
    if (equal(record, existingRecord)) {
      console.log('COMPOSER EXISTING INSTANCE', {
        key,
        record,
        existingRecord,
      });
      // Focus on the existing instance dialog
      const dialog = document.querySelector(
        `.composer-dialog[data-id="${key}"]`,
      );
      if (dialog) {
        dialog.focus();
        dialog.scrollIntoView({ behavior: 'smooth', inline: 'nearest' });
        // If collapsed, expand it
        if (dialog.classList.contains('collapsed')) {
          // Click the collapse button to expand
          const collapseButton = dialog.querySelector(
            '.composer-collapse-button',
          );
          collapseButton?.click();
        }
      }
      return;
    }
  }

  const id = Math.random().toString(36).slice(2);
  ComposerInstances.set(id, { record, replyPreview, quotePreview });
  rerenderComposer();
}

const API_URL = 'https://img-alt.phanpy.social';
async function describeImage(file) {
  const body = new FormData();
  body.append('image', file);
  const response = await fetch(API_URL, { method: 'POST', body });
  const json = await response.json();
  return json;
}
