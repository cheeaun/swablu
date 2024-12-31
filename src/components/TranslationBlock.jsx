import { useEffect, useRef, useState } from 'react';
import { useIntersection } from 'react-use';
import pThrottle from 'p-throttle';
import { IconLanguage } from '@tabler/icons-react';
import { useDebounce } from 'react-use';

export default function TranslationBlock({ text, detectedLangCode }) {
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

  const [inlineTranslation, setInlineTranslation] = useState(null);
  useEffect(() => {
    if (!isIntersecting) return;
    (async () => {
      try {
        const json = await translateText(text, {
          detectedLangCode,
        });
        if (json) {
          const translation = json.translation.replace(/\n{2,}/g, '\n');
          setInlineTranslation(translation);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [text, detectedLangCode, isIntersecting]);

  if (!inlineTranslation)
    return (
      <div
        ref={intersectRef}
        className="post-inline-translation-intersection"
      />
    );

  return (
    <div className="post-inline-translation">
      <IconLanguage size={16} />
      <div>{inlineTranslation}</div>
    </div>
  );
}

const throttle = pThrottle({
  limit: 1,
  interval: 1000,
});
const INSTANCE = 'lingva.phanpy.social';
// e.g. /api/v1/:source/:target/:query
const translateText = throttle(async (text, { detectedLangCode }) => {
  if (!text) return null;
  if (!detectedLangCode) return null;
  console.log('TRANSLATE', { text, detectedLangCode });
  const result = await fetch(
    `https://${INSTANCE}/api/v1/auto/${detectedLangCode}/${encodeURIComponent(text)}`,
  );
  const json = await result.json();
  if (json.info?.detectedSource === detectedLangCode) return null;
  return json;
});
