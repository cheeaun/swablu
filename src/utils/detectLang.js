import {
  multipleDetect,
  fromUrl,
  fromStorage,
  fromNavigator,
} from '@lingui/detect-locale';

const DEFAULT_FALLBACK = () => 'en';

export default function detectLang() {
  const result = multipleDetect(
    fromUrl('lang'),
    fromStorage('lang'),
    fromNavigator(),
    DEFAULT_FALLBACK,
  );
  return result;
}
