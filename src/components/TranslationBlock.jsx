import { useEffect, useRef, useState } from 'react';
import { useIntersection } from 'react-use';
import pThrottle from 'p-throttle';
import { IconLanguage } from '@tabler/icons-react';
import { useDebounce, useIdle } from 'react-use';

const CACHE_LIMIT = 100;
const translationsStore = {
  cache: new Map(),
  get(key) {
    return this.cache.get(key);
  },
  set(key, value) {
    this.cache.set(key, value);
    if (this.cache.size > CACHE_LIMIT) {
      this.cache.delete(this.cache.keys().next().value);
    }
  },
};

export default function TranslationBlock({ text, detectedLangCode }) {
  const isIdle = useIdle(1_000);
  const intersectRef = useRef();
  const intersection = useIntersection(intersectRef, {
    trackVisibility: true,
    delay: 100,
    threshold: 1,
  });
  const [isIntersecting, setIsIntersecting] = useState(false);
  useDebounce(
    () => {
      setIsIntersecting(!!intersection?.isIntersecting);
    },
    1000,
    [intersection?.isIntersecting],
  );

  const existingTranslation = translationsStore.get(text);
  const [inlineTranslation, setInlineTranslation] = useState(
    existingTranslation || null,
  );
  useEffect(() => {
    if (inlineTranslation) return;
    if (!isIntersecting) return;
    if (!isIdle) return;
    (async () => {
      try {
        const json = await translateText(text, {
          detectedLangCode,
        });
        if (json) {
          const translation = json.translation.replace(/\n{2,}/g, '\n');
          setInlineTranslation(translation);
          translationsStore.set(text, translation);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [text, detectedLangCode, isIntersecting, isIdle]);

  if (!inlineTranslation)
    return (
      <div
        ref={intersectRef}
        className="post-inline-translation-intersection"
      />
    );

  return (
    <div
      className={`post-inline-translation ${existingTranslation ? 'translated' : ''}`}
    >
      <IconLanguage size={16} />
      <div>{inlineTranslation}</div>
    </div>
  );
}

const throttle = pThrottle({
  limit: 1,
  interval: 1000,
});
const INSTANCE = 'simplytranslate.org';
const translateText = throttle(async (text, { detectedLangCode }) => {
  if (!text) return null;
  if (!detectedLangCode) return null;
  console.log('TRANSLATE', { text, detectedLangCode });
  const result = await fetch(
    `https://${INSTANCE}/api/translate?from=auto&to=en&text=${encodeURIComponent(
      text,
    )}`,
  );
  const json = await result.json();
  if (json?.source_language === detectedLangCode) {
    return null;
  }
  return {
    translation: json.translated_text,
  };
});
