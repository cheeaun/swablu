// Extracted from https://github.com/bluesky-social/social-app/blob/e01fc2fbaf5a381c273bf8dbe762882604301c0b/src/view/com/composer/state/composer.ts#L600

import { AppBskyRichtextFacet, UnicodeString } from '@atproto/api';

function toShortUrl(url) {
  try {
    const urlp = new URL(url);
    if (urlp.protocol !== 'http:' && urlp.protocol !== 'https:') {
      return url;
    }
    const path =
      (urlp.pathname === '/' ? '' : urlp.pathname) + urlp.search + urlp.hash;
    if (path.length > 15) {
      return `${urlp.host + path.slice(0, 13)}...`;
    }
    return urlp.host + path;
  } catch (e) {
    return url;
  }
}

function shortenLinks(rt) {
  if (!rt.facets?.length) {
    return rt;
  }
  rt = rt.clone();
  // enumerate the link facets
  if (rt.facets) {
    for (const facet of rt.facets) {
      const isLink = !!facet.features.find(AppBskyRichtextFacet.isLink);
      if (!isLink) {
        continue;
      }

      // extract and shorten the URL
      const { byteStart, byteEnd } = facet.index;
      const url = rt.unicodeText.slice(byteStart, byteEnd);
      const shortened = new UnicodeString(toShortUrl(url));

      // insert the shorten URL
      rt.insert(byteStart, shortened.utf16);
      // update the facet to cover the new shortened URL
      facet.index.byteStart = byteStart;
      facet.index.byteEnd = byteStart + shortened.length;
      // remove the old URL
      rt.delete(byteStart + shortened.length, byteEnd + shortened.length);
    }
  }
  return rt;
}

export default function getShortenedLength(rt) {
  return shortenLinks(rt).graphemeLength;
}
