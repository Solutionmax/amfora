# Amfora 1.1.0

Amfora 1.1.0 repairs link previews. Every share and reverse share link pasted into a chat now carries a real preview image instead of a broken one, and a share holding a single image can show that image as its own preview.

## Link previews

- `og:image` no longer carries the app logo verbatim. An uploaded logo is stored as a `data:` URI, and unfurl bots fetch preview images over HTTP, so Slack, WhatsApp, Discord and LinkedIn rendered a broken image for every link. Previews are now always an absolute URL.
- Anything that is not an `http` or `https` logo falls back to a bundled 1200x630 card. This also corrects a square logo being announced as a wide `summary_large_image` preview.
- A share that holds exactly one image can use that image as its preview. Reverse share links keep the card, since they hold no content when the link is shared.

## Preview safety

Unfurl bots are anonymous, and their result is rendered in whatever channel the link was pasted into. A share only qualifies for a file preview when it carries no password, has not expired, sets no view limit, holds no folders, holds exactly one file, that file is an image, and it is at most 5 MB. Password protected shares fall back to the card, so content never reaches a channel before the recipient has entered the password. View limited shares are excluded as well, so a bot cannot spend one of the owner's permitted views.

## Operator notes

`STORAGE_URL` must be an address the visitor's browser can reach, not only the container. An internal address produces a working share page whose download and upload both fail for anyone outside the network. This was already documented, and the startup error for a missing value now matters more with previews in play, since the preview URL is fetched by third party services.

## Validation

Lint, TypeScript, and the automated test suites of both applications, including new unit tests for preview eligibility and preview URL construction. Verified against a live deployment behind a reverse proxy: a video share falls back to the card, an image share serves the image to an anonymous client identifying as an unfurl bot, and adding a password moves that same share back to the card while the direct download returns 401.
