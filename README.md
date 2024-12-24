Swablu
===

Experimental opinionated web client for [Bluesky](https://bsky.social).

🗣️ Pronunciation: **/ˈswɑːbluː/** (**SWAHB-loo**) ([source](https://pokemonlp.fandom.com/wiki/Pok%C3%A9mon_Pronunciation_Guide/Generation_III))

> [!WARNING]
> This project is in early development. Features are incomplete. Bugs are expected. Experimental designs are subject to change.

Noticeably missing or partially-implemented features, in no particular order:

- [ ] Moderation (reporting, blocking, muting, etc.)
- [ ] Muted words (filtering posts)
- [ ] Video upload
- [ ] GIF picker
- [ ] Starter Packs UI
- [ ] Feeds management
- [ ] Labels
- [ ] Chat
- [ ] Search
- [ ] Push notifications
- [ ] Lexicons?
- [ ] *And many, many more…*

Technologies
---

- [Vite](https://vite.dev/) - Build tool
  - [LightningCSS](https://lightningcss.dev/) (experimental) - CSS transformer, bundler & minifier
- [React](https://reactjs.org/) - UI library
- [TanStack Router](https://tanstack.com/router/) - Routing library
- [TanStack Query](https://tanstack.com/query/) - Data fetching library
- [@atproto/oauth-client-browser](https://github.com/bluesky-social/atproto/tree/main/packages/oauth/oauth-client-browser) - atproto OAuth Client for the Browser
- [@atproto/api](https://github.com/bluesky-social/atproto/tree/main/packages/api) - API client for ATProtocol servers
- [Lingui](https://lingui.dev/) - Internationalization
- [Media Chrome](https://www.media-chrome.org/) - Media player
- [React Aria](https://react-spectrum.adobe.com/react-aria/) - Accessible components
- [Tabler Icons](https://tabler.io/icons) - Icon library
- [Tiptap](https://tiptap.dev/product/editor) - Rich text editor
- [react-use](https://github.com/streamich/react-use) - React hooks
- [Biome](https://biomejs.dev/) - Code formatter & linter
  - [Prettier](https://prettier.io/) - Code formatter for CSS because Biome doesn't support it yet

Design
---

Bits and pieces inspired by:

- [Phanpy](https://phanpy.social/) - web client for Mastodon
- [Threads](https://threads.net/)
- [Bluesky](https://bsky.social/)

Mascot
---

[Swablu](https://bulbapedia.bulbagarden.net/wiki/Swablu_(Pok%C3%A9mon)) is a dual-type Normal/Flying Pokémon.

License
---

[MIT](https://cheeaun.mit-license.org/).