# Amfora 2.0.0

A new interface, front and back, and a white-label model that runs on the server.

## New interface

- Public pages (sign-in, download, receive, recovery, invitations) are built as a statement
  column and a floating panel on a soft colour wash in the installation's accent. Downloads
  open with a cover: an image file is its own cover, anything else gets the accent gradient.
  Files are listed as a manifest with type tiles, sublines and a total line.
- The workspace has a tinted sidebar, a page header with a subline, and the same panels and
  tables everywhere. The dashboard greets by time of day, opens with "Send files" and
  "Receive files", and shows storage, shares, downloads and files in one strip.
- Family palette shared with the other SolutionMAX products: accent `#0079D2`, ink
  `#0C1626`. Archivo for headings, Public Sans for text, JetBrains Mono for numbers.
  Light and dark are both finished.
- The postal artwork, envelopes, stamps and quotes are gone. The uploaded logo replaces the
  mark everywhere, including the favicon and link previews.

## Appearance on the server

- Name, description, logo, accent colour, corner radius and font were already stored per
  installation. The public-page background, the custom CSS and the credit setting now are too;
  nothing brand-related lives in the browser any more.
- New endpoints: `GET/POST/DELETE /app/background`, `PUT/DELETE /app/brandpack`. The web app
  serves the logo at `/api/app/logo` and the background at `/api/app/background`.
- Defaults changed for new installations: accent `#0079d2` (was `#1757e8`), radius `0.5rem`
  (was `0.75rem`), no default logo (the mark is drawn). Existing installations keep their
  stored colour and radius; the 1.x default logo is recognised and reset so the mark shows.

## Brandpack

- A brandpack is a signed string a customer pastes under Customization. With a valid one the
  installation can hide "Powered by Amfora", set a background image for the public pages and
  add custom CSS. Without one those settings are ignored by the server, whatever is stored.
- Custom CSS is sanitised: `@import`, outside `url(`, `expression(` and `behavior:` are
  removed, size capped at 20 kB. See `docs/BRANDPACK.md`.

## Upgrading

Pull the image or press Update. `prisma db push` adds nothing new; three app configs are
seeded on start. No data changes. The customization page is new; the theme switch moved to
the sidebar, and the per-browser background colours were dropped in favour of the server-side
background image.
