# Amfora 2.0.1

A security and install release. Update if you run 2.0.0.

## Security

- The brandpack key is built into the server. `AMFORA_BRANDPACK_PUBLIC_KEY` no longer exists,
  so a key pair of your own and a self signed pack are refused by the published image.
- Administrator checks read the account from the database on every request. A demoted or
  deactivated administrator loses access at once, instead of when the one day session ends.
  This covers the app settings, updates, users, invitations and the storage overview.
- The unused `/s3/*` routes are gone. They offered presigned upload and download links and a
  delete for any object without a session; the web app never called them and the API port is
  not published by default, but they no longer exist to be reached.
- Tests for the administrator guard (including the first run exception), for these routes and
  for the attachment rule that keeps uploaded HTML and SVG from running in the browser.

## Install

- The installer pulls the published image by default, pinned to the current release: Docker
  with Compose v2 is all you need, and a new install starts in about a minute instead of a
  twenty minute build. `--source` still builds, now from the release tag instead of the tip of
  the branch.
- `docker-compose.yaml` in the repository uses the published image; set `AMFORA_IMAGE` to run
  your own build.
- The README and the docs explain how to update.

## Website

- The site can be found by search engines, has a sitemap, a proper link preview image and
  icons, loads its screenshots lazily and no longer trips its own content security policy.
- New page: moving from Palmr (`/palmr/`).
- Buying the brandpack or setup opens a confirmation page first; only its button starts a
  Stripe checkout, so link previews and crawlers no longer create payment sessions.

## Update

With over the air updates, install 2.0.1 from the admin area. Otherwise set the version in your
compose file and run `docker compose pull && docker compose up -d`. Your data stays in place.

Image: `ghcr.io/solutionmax/amfora:2.0.1` (linux/amd64, linux/arm64).
