# Meta Placement Preview

Browser-based Meta placement preview for images and video. Uploads stay in the visitor's browser and are not stored or sent to a server.

Live site: <https://hain-uk.github.io/meta-placement-preview/>

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The production build is written to `docs/`, which GitHub Pages publishes from the `main` branch.

## Indexing

The page includes `noindex`, `nofollow`, `noarchive`, `nosnippet` and `noimageindex` directives that ask compliant search engines not to index it. The GitHub Pages URL and repository are still public; these directives are not access control.
