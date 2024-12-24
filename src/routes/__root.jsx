import {
  Outlet,
  ScrollRestoration,
  createRootRouteWithContext,
  redirect,
} from '@tanstack/react-router';
import { Toaster } from 'sonner';
import { Composer } from '../components/Composer';
import NavGlobal, { NavGlobal2 } from '../components/NavGlobal';
import { makeRecordUri } from '../utils/url-helpers';

export const Route = createRootRouteWithContext()({
  beforeLoad: async (params) => {
    console.log('ROOT BEFORE LOAD', params);
    const pathname = params?.location?.pathname;
    if (/^\/https?:\//.test(pathname)) {
      let url = pathname?.replace(/^\//, '');
      // If url looks like http:/test , change to https://test (double-slash)
      if (!/^https:\/\//.test(url)) {
        url = url.replace(/^http:/, 'https://');
      }
      const urlObj = new URL(url);
      console.log(urlObj.pathname);
      // e.g. /profile/ladykalana.bsky.social/post/3lakrc2au3k2y
      const [_, handle, rkey] =
        urlObj.pathname.match(/\/?profile\/([^/]+)\/post\/([^\/]+)/i) || [];
      if (handle && rkey) {
        const uri = makeRecordUri(handle, 'app.bsky.feed.post', rkey);
        console.log('RECORD URI', uri);
        throw redirect({
          code: 301,
          to: `/post/${encodeURIComponent(uri)}`,
        });
      }
      // e.g. /profile/ladykalana.bsky.social
      {
        const [_, handle] = urlObj.pathname.match(/\/?profile\/([^/]+)/i) || [];
        const { agent } = params.context.auth;
        if (handle) {
          const res = await agent.resolveHandle({ handle });
          const { did } = res.data;
          if (did) {
            throw redirect({
              code: 301,
              to: `/profile/${encodeURIComponent(did)}`,
            });
          }
        }
      }
    }
  },
  component: () => (
    <>
      <NavGlobal />
      <Outlet />
      <NavGlobal2 />
      <Toaster
        position="bottom-left"
        theme="system"
        pauseWhenPageIsHidden
        richColors
      />
      <Composer />
      <ScrollRestoration />
    </>
  ),
  errorComponent: (error) => <h1>{error.message}</h1>,
});
