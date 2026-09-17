# Product website verification — September 17, 2026

The English product website and documentation are deployed at
https://amfora.solutionmax.net. The GitHub repository remains private and
`amfora` is its default branch. The website and file-sharing application are
separate deployments.

## Verified

- 36 browser checks on localhost and 36 on the HTTPS domain: desktop 1440px,
  tablet 768px, mobile 390px and compact 320px; no horizontal overflow;
  English document language; single main/heading; local fonts.
- Mobile menu opens and closes, including Escape and focus return.
- All four screenshot tabs work; arrow keys and End move through them.
- FAQ opens; documentation code buttons copy actual text, verified by pasting
  the clipboard back into a temporary field and comparing it exactly.
- 72 internal references resolve, including documentation anchors and images.
- 25 live HTTP checks: website files match source SHA-256, expected 404 page,
  HTTP redirects to HTTPS, indexing/security headers, and three existing VPS
  sites still return 200.
- Origin has a valid Let's Encrypt certificate for the hostname.
- Four actual application screenshots captured at 1440×1000 from an isolated
  installation using example names and content. WebP files contain no EXIF.
- Primary action contrast: white on #0074c7 = 4.86:1.
- JavaScript syntax check, formatting and Git whitespace check pass.

## Scope

This checks the product website. It does not re-run all file-sharing app
workflows; that application's previous UI and API verification is separate.
There is no public hosted app demo or public prebuilt image in this preview.
`noindex` discourages indexing but does not restrict access to the website.

## Operations

The site is static and has no database or added server process. Caddy serves
an immutable release through `/var/www/amfora/current`. The previous Caddyfile
was backed up before adding the isolated host block. Deployment and rollback
instructions are in `docs/deployment/product-website.md`.
