# Amfora 2.3.0

A calmer interface, three themes for the public pages, secrets, an activity log and an API.

## New

- **Secrets**: send a password or key behind a link that destroys itself. The text is encrypted
  in the browser and the key lives in the link, so the server cannot read it. You choose how long
  the link lives and how often it may be opened; a passphrase is optional. An administrator can
  open `/secret` to visitors without an account (off by default, with its own limits).
  See [SECRETS.md](SECRETS.md).
- **Activity**: what happened to your links and your account, per user, everyone for an
  administrator, with a CSV export. Each line can say where a visitor was, from a place database
  you supply; the address itself is never stored. See [ACTIVITY.md](ACTIVITY.md).
- **Emails to the maker**: when a share is downloaded, three days before a share or receive link
  ends, and when a secret is opened.
- **Webhooks**: one signed call when files are received, a share is downloaded or a secret is
  opened.
- **API keys**: read only or full access keys for other tools, under `/api/v1`.
  See [API.md](API.md).
- **Your own storage**: a user sees their use against their own limit, in the sidebar and on the
  dashboard.
- **Three themes for the public pages**: Stage, Workbench or Seal, chosen in Customization.
  Sign-in, download (`/s`), receive (`/r`) and secret (`/x`) pages follow the choice.

## Changed

- Every signed-in page has the new calm layout: one sidebar, lists with a detail view for shares
  and receive links, status tags, and empty, loading and error states. Five languages: English,
  Dutch, German, French and Spanish.
- Download and receive pages show a live countdown to the end date, the total size and the number
  of files, and name your organisation as the sender.
- Settings and sign-in load far less script (about 1 MB instead of 39 MB on a cold visit).
- Behind Cloudflare, rate limits count the visitor named in `CF-Connecting-IP` when
  `TRUST_CLIENT_IP_HEADERS` and `TRUST_PROXY` are set.

## Upgrading

The database gains three tables and a few settings; the update applies them. Nothing is switched
on that was not there before: secrets without an account, webhooks and the secret opened email
start off.

- Build: MinIO and mc are copied from the published 2.2.0 image (same binaries, pinned by
  digest), because quay.io no longer serves them without an account.

Image: `ghcr.io/solutionmax/amfora:2.3.0` (linux/amd64, linux/arm64).
