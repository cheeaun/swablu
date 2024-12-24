import { useEffect, useRef, useState } from 'react';

const postMetaStore = new Map();
const postMetaSubs = new Map();

// Debugging
window.__POST_META_STORE__ = postMetaStore;
window.__POST_META_SUBS__ = postMetaSubs;

export default function usePostMeta(uri, meta) {
  const [, rerender] = useState();
  const postMeta = postMetaStore.get(uri) || meta;

  // Keep track of subscribers
  const subID = useRef(postMetaSubs.get(uri)?.length || 0);

  useEffect(() => {
    // console.log('POST META EFFECT', { uri, meta });
    // Set initial value
    postMetaStore.set(uri, meta);

    // Subscribe
    const subs = postMetaSubs.get(uri) || [];
    if (!subs[subID.current]) {
      // Only add if not already subscribed
      subs.push(() => rerender({}));
      postMetaSubs.set(uri, subs);
    }

    return () => {
      // Unsubscribe
      const subs = postMetaSubs.get(uri) || [];
      subs.splice(subID.current, 1);
      postMetaSubs.set(uri, subs);

      // Remove if no subscribers
      if (!subs.length) {
        postMetaStore.delete(uri);
        postMetaSubs.delete(uri);
      }
    };
  }, [uri]);

  function setPostMeta(uri, newMeta) {
    const prevMeta = postMetaStore.get(uri);
    postMetaStore.set(uri, {
      ...prevMeta,
      ...newMeta,
    });

    // Re-render all subscribers
    const subs = postMetaSubs.get(uri) || [];
    subs.forEach((sub) => sub());
  }

  return [postMeta, setPostMeta];
}
