# Amfora 2.1.0

Your own picture on every download page, and videos that download instead of play.

## Download page cover

- Customization has a new **Download page** section. Upload one image and it becomes the cover
  at the top of every download page, with the file name over it. Without a cover the page shows
  your accent colour with a large icon for the file type.
- Files from a share are never used as the cover any more.

## No playing in the browser

- New switch **Play video and audio on download pages**, **off by default**, also for existing
  installations. While it is off, download pages show no play button and no Preview button for
  video and audio, and the server refuses to stream them to visitors. Downloading works as
  always; images, PDFs and text keep their preview; you still preview your own files in the
  workspace.

## Link previews

- When a download or receive link is pasted into WhatsApp, Slack or similar apps, the preview
  image is your cover. Without a cover it is the new **Default link preview image** you can upload
  under Customization, then your logo, then the Amfora card. A file from the share is never shown.
- Apps cache previews, so a link that was already shared may keep its old image for a while.

Both images are part of the free version. Uploads are checked by content (PNG, JPEG, WebP, GIF,
AVIF), at least 600 px wide, up to 3 MB.

## Update

With over the air updates, install 2.1.0 from the admin area. Otherwise set the version in your
compose file and run `docker compose pull && docker compose up -d`. Existing installations start
with playing switched off; turn it on under Customization if you want it.

Image: `ghcr.io/solutionmax/amfora:2.1.0` (linux/amd64, linux/arm64).
