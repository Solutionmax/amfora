# Amfora 1.2.0

Amfora 1.2.0 answers a question an owner could not answer before: was my file actually
collected? It also stops the dashboard hiding everything past the fifth row, and adds an
update check so an installation can tell you a new release exists.

## Download counts

- A file now carries a download count, visible to its owner in the file list and the grid.
  It is a plain number. No address, no user agent, no timestamp, nothing about who collected
  the file.
- The count is never part of a public share response, so a recipient cannot see how many
  others were there before them.
- Counted is the moment a download starts. Previews, embeds and the owner fetching their own
  file are excluded, as is a player seeking through a video. A second click within the same
  visit reuses the URL the first click was given, so it counts once; a fresh visit counts again.
- The share page used to print the page view count under a "Downloads" label. That label now
  reads Views, because a real download count exists.

## Dashboard

- Recent Uploads and Recent Shares page through the whole list five at a time. They already
  held every file and share, and cut the list to five, so the rest was in the browser with no
  way to reach it.
- The running version is shown at the bottom of the menu, and disappears with the existing
  setting that already hides it in the footer.

## Update checking

- An administrator sees in Settings whether a newer release exists. The release manifest is
  Ed25519 signed and names an image digest rather than a tag, so what an installation is told
  to run is exactly what was published.
- Checking is the only thing this does on its own. The request carries nothing about the
  installation, and an empty `AMFORA_UPDATE_URL` switches it off completely.
- Applying updates from the app is optional and needs a one time install on the host. The
  container is never given the Docker socket, which would be root on the host for an
  application that accepts public uploads. See `docs/OTA.md`.

## Before you upgrade

A `downloads` column is added to the file table at startup, with a default of zero. Existing
files therefore start at zero even if they were collected before this release: there is no
record of earlier downloads to recover.

Nothing else changes, and no configuration is required.

## Validation

Lint, TypeScript and the automated suites of both applications, including new unit tests for
download counting, preview URLs, release manifest verification and version comparison.
Verified against a live deployment behind a reverse proxy: a real click on a share page's
download button raises the count by one, a second click in the same visit does not, a reload
and another click does, a preview does not, and an owner fetching their own file does not.
The update path was exercised end to end in an isolated Compose project, including signature
refusal for a forged manifest and the database backup taken before the pull.
