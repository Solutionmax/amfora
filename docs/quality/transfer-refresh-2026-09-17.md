# Public transfer visual refresh — 17 September 2026

The upload and download pages now share the SolutionMAX navy-and-blue visual
identity: a branded illustrated panel, Archivo headings, Public Sans body text,
clearer file metadata, a stronger dropzone and prominent transfer actions.
Typography is scoped to these pages. Installation logos, custom primary colours,
custom body fonts, dark mode and all existing transfer handlers remain supported.

## Validation

- Web lint, TypeScript and 18 unit tests passed.
- Production image: `amfora:1.0.0-transfer-refresh-20260917`, app revision `34fb7d5`.
- 56 browser checks passed against that image, covering both transfer directions
  at 320, 390, 768, 920, 1024 and 1440 pixels, light/dark themes, missing,
  inactive, expired and password-protected links, custom fonts and custom colour.
- Downloaded the sample PDF through its button and verified its SHA-256.
- Bulk download completed; a real public upload persisted the expected byte count.
- Independent review found no blocking issues.

## Screenshots

The canonical product images live in `site/assets/screenshots/`. Captures use the
production image and a separate demonstration database. Website image links,
social preview metadata and README image URLs use the `transfer-refresh-20260917`
cache version. No customer data is used in the product screenshots.

## Operations

Application rollback image: `amfora:1.0.0-unified-ui-20260917`. The deployment
backs up the Compose file and persistent application data before replacing the
image; there are no schema changes or production appearance-setting changes.
The marketing website is deployed separately using its existing release symlink.
