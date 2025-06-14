/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

// Import Routes

import { Route as rootRoute } from './routes/__root';
import { Route as SearchImport } from './routes/search';
import { Route as NotificationsImport } from './routes/notifications';
import { Route as LoginImport } from './routes/login';
import { Route as AboutImport } from './routes/about';
import { Route as IndexImport } from './routes/index';
import { Route as TagTagImport } from './routes/tag.$tag';
import { Route as ProfileActorImport } from './routes/profile.$actor';
import { Route as PostUriImport } from './routes/post.$uri';
import { Route as ListUriImport } from './routes/list.$uri';
import { Route as FeedUriImport } from './routes/feed.$uri';

// Create/Update Routes

const SearchRoute = SearchImport.update({
  id: '/search',
  path: '/search',
  getParentRoute: () => rootRoute,
});

const NotificationsRoute = NotificationsImport.update({
  id: '/notifications',
  path: '/notifications',
  getParentRoute: () => rootRoute,
});

const LoginRoute = LoginImport.update({
  id: '/login',
  path: '/login',
  getParentRoute: () => rootRoute,
});

const AboutRoute = AboutImport.update({
  id: '/about',
  path: '/about',
  getParentRoute: () => rootRoute,
});

const IndexRoute = IndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRoute,
});

const TagTagRoute = TagTagImport.update({
  id: '/tag/$tag',
  path: '/tag/$tag',
  getParentRoute: () => rootRoute,
});

const ProfileActorRoute = ProfileActorImport.update({
  id: '/profile/$actor',
  path: '/profile/$actor',
  getParentRoute: () => rootRoute,
});

const PostUriRoute = PostUriImport.update({
  id: '/post/$uri',
  path: '/post/$uri',
  getParentRoute: () => rootRoute,
});

const ListUriRoute = ListUriImport.update({
  id: '/list/$uri',
  path: '/list/$uri',
  getParentRoute: () => rootRoute,
});

const FeedUriRoute = FeedUriImport.update({
  id: '/feed/$uri',
  path: '/feed/$uri',
  getParentRoute: () => rootRoute,
});

// Create and export the route tree

const rootRouteChildren = {
  IndexRoute: IndexRoute,
  AboutRoute: AboutRoute,
  LoginRoute: LoginRoute,
  NotificationsRoute: NotificationsRoute,
  SearchRoute: SearchRoute,
  FeedUriRoute: FeedUriRoute,
  ListUriRoute: ListUriRoute,
  PostUriRoute: PostUriRoute,
  ProfileActorRoute: ProfileActorRoute,
  TagTagRoute: TagTagRoute,
};

export const routeTree = rootRoute._addFileChildren(rootRouteChildren);

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.jsx",
      "children": [
        "/",
        "/about",
        "/login",
        "/notifications",
        "/search",
        "/feed/$uri",
        "/list/$uri",
        "/post/$uri",
        "/profile/$actor",
        "/tag/$tag"
      ]
    },
    "/": {
      "filePath": "index.jsx"
    },
    "/about": {
      "filePath": "about.jsx"
    },
    "/login": {
      "filePath": "login.jsx"
    },
    "/notifications": {
      "filePath": "notifications.jsx"
    },
    "/search": {
      "filePath": "search.jsx"
    },
    "/feed/$uri": {
      "filePath": "feed.$uri.jsx"
    },
    "/list/$uri": {
      "filePath": "list.$uri.jsx"
    },
    "/post/$uri": {
      "filePath": "post.$uri.jsx"
    },
    "/profile/$actor": {
      "filePath": "profile.$actor.jsx"
    },
    "/tag/$tag": {
      "filePath": "tag.$tag.jsx"
    }
  }
}
ROUTE_MANIFEST_END */
