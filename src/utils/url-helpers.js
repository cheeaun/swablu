import { AtUri } from '@atproto/api';

const BSKY_APP_HOST = 'https://bsky.app';
export function postUriToPermalink(uri, options) {
  try {
    const { hostname, rkey } = new AtUri(uri);
    const handleOrDid = options?.handle || hostname;
    return `${BSKY_APP_HOST}/profile/${handleOrDid}/post/${rkey}`;
  } catch {
    return undefined;
  }
}

export function handleToPermalink(handle) {
  return `${BSKY_APP_HOST}/profile/${handle}`;
}

export function makeRecordUri(didOrName, collection, rkey) {
  const urip = new AtUri('at://host/');
  urip.host = didOrName;
  urip.collection = collection;
  urip.rkey = rkey;
  return urip.toString();
}
