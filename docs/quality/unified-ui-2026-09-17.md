# Unified application UI — 17 September 2026

The application now uses the product website's ivory background, white bordered surfaces, cobalt accents, Bricolage Grotesque headings and Jakarta body text. The changes cover navigation, dashboard, files, shares, receive links, settings, customization, profile, user management, login, password recovery, invitations and public transfers. Existing appearance controls and dark mode remain available.

## Verification

- Web lint and TypeScript checks passed; all 18 web unit tests passed.
- Production image built successfully. The final application source revision is `ec63ea6`.
- 42 layout checks passed across 14 public/workspace routes at desktop, mobile and 320 px dark mode. No horizontal document overflow, broken visible images or missing translation errors were found.
- 10 entry/setup checks passed, including anonymous root → login, authenticated root → dashboard and the empty-installation registration form.
- Share and receive-link QR codes were exported as PNG and decoded back to their exact URLs. The QR dialog fits 320 px.
- Shared links were copied and pasted back exactly, including the fallback on a real insecure HTTP origin where the Clipboard API is unavailable.
- The public download button produced a PDF whose SHA-256 matched the fixture. A public upload reached storage with the expected byte count.
- Settings and profile edits persisted and were restored. All settings/customization sections, theme switching, user search and mobile navigation passed.
- An alternate accent color survived reload; the selectable Amfora cobalt preset restored the default.
- Visual inspection caught a misleading dark-theme thumbnail. It was corrected and checked in both appearance modes on the final image.
- Four English screenshots were captured from the final production image using demonstration accounts and files.

SMTP delivery and external sign-in services were not exercised end to end: those services are not configured in this test installation. No authentication or storage logic was changed by this redesign.

## Build storage

The reported historical 12.35 GB cache and 25-image inventory were already gone when this task began: the default builder had 0 B cache and Docker had five images. This task does not claim that earlier cleanup.

The build wrapper now reuses layers, defaults to a local image load, and makes registry publishing explicit. A dedicated Amfora builder uses native garbage collection plus post-build pruning with a 4 GiB target for unused cache, a 1 GiB reserve and a 10 GiB free-space target. Active builds can exceed these targets temporarily. After the final build, the builder reported approximately 4.20 GB of cache. The second build reused ten cached steps.

The wrapper's local/publish modes, failed-build cleanup, invalid inputs and source-archive fallback passed an isolated command mock. `make clean` only prunes the dedicated cache; it does not stop containers or delete volumes/images. See [build and cache management](../deployment/build-cache.md).
