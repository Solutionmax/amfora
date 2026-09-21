# Amfora 2.0: new interface and white-label model

Approved by Raymon on 21 September 2026 on the basis of the clickable mockup in
`/root/amfora-brand-20260921/mockup/amfora-ui-mockup.html` (screens: login, download,
upload, dashboard, files, customization; brands: Amfora free, Acme brandpack; light and dark).
The mockup is the visual source of truth; this document records the decisions and the
model behind it so the build can be planned and checked.

## Goal

Replace the current "postal" interface (envelopes, stamps, Delphic quotes) with a warm,
product-led interface that a customer can run under their own name. Every surface reads
`appName`, `appLogo` and the accent colour from the server; the Amfora brand is present only
in the "Powered by Amfora" credit, which a paid brandpack removes.

## Decisions

| Topic | Decision |
| --- | --- |
| Direction | Business product with warmth: soft colour washes in the accent, floating panels, large display headings, files as the centre |
| Public layout | Two columns on desktop: personal statement left, floating panel right. Stacked on mobile |
| Admin layout | Sidebar 240 px, tinted at the top, active item as a white card with accent bar |
| Playful elements | All removed: envelopes, stamps, seals, Delphic quotes, "Send something good" card |
| Themes | Light and dark, both finished; theme stays per browser |
| Palette | Family palette (Portalis, Pharos): accent `#0079D2`, ink `#0C1626`, background `#F6F9FD` |
| Type | Archivo (display), Public Sans (body), JetBrains Mono (numbers). Bricolage and Plus Jakarta removed |
| Radius default | 8 px (was 16). Existing installations keep their stored value |
| Free customization | Name, description, logo, accent colour, radius, **font from the list** |
| Brandpack (paid) | Credit removed, public-page background image, custom CSS. Own woff2 upload is a later paid addition |
| Video cover | Image files are their own cover; video and other files get an accent gradient with a play button that opens the existing preview. No ffmpeg |
| Version | 2.0.0 |
| Delivery | Local commits only, staging container first, no push until Raymon approves |

## Design system

All tokens live in `apps/web/src/app/globals.css` as CSS custom properties; Tailwind 4 reads
them through `@theme inline`. Component APIs in `components/ui/*` stay the same so pages keep
calling them; only their styling changes.

### Colour

| Token | Light | Dark |
| --- | --- | --- |
| `--primary` | installation accent, default `#0079D2` | derived: lightened for contrast, default `#3B9CF0` |
| `--primary-soft` | 10 % tint of primary on surface | 25 % tint on surface |
| `--ink` / `--foreground` | `#0C1626` | `#E6EDF7` |
| `--ink-2`, `--ink-3` | `#46566B`, `#667085` | `#B4C0D3`, `#8A97AD` |
| `--background` | `#F6F9FD` | `#0B1220` |
| `--surface`, `--surface-2` | `#FFFFFF`, `#F1F5FA` | `#121C2E`, `#182540` |
| `--line`, `--line-2` | `#E3E9F2`, `#CBD5E1` | `#22304A`, `#33456A` |
| status ok / warn / bad / info | green, amber, red, blue pairs (solid + soft) | same, lifted |

The accent is used for: primary buttons, active navigation, links, focus rings, selection
bar, file-type tiles' default, colour washes. Nothing else.

Colour washes (`.stage` in the mockup): two radial gradients in the accent plus an SVG noise
layer at 35 % soft-light. Public pages: full page. Admin: main area only, lighter.

### Type and measure

Display 44/34/28/20 px semibold, tight tracking. Body 14 px, small 12/13 px. Mono for sizes,
counts, storage, version. Field and button 40 px, compact 32 px, primary CTA on public pages
48 px, table row 48 px. Spacing on a 4 px scale. Radius token drives buttons and fields;
panels use `radius + 10px`, tiles `radius + 2px`.

### Signature elements

- **File list with type tiles**: 40 px coloured tile per type (video violet, document red,
  archive amber, image green, other accent), name plus a subline (type, pages, item count),
  size in mono right-aligned, dashed total line underneath.
- **Floating panel**: white surface, hairline border, layered shadow, opens with a cover.
- **Statement column**: display heading with the second line in the accent, quote block with
  a 2 px accent bar, fact chips with blur.
- **Hero tiles** on the dashboard: "Send files" in accent gradient with grain, "Receive
  files" on white.

### Motion

150 ms, opacity and transform only, respects `prefers-reduced-motion`. Panel fade-in on
public pages, row hover, button press. Nothing else.

## Shells

### Public shell (`components/brand/transfer-shell.tsx`, rewritten)

Header: brand (BrandMark + name) left, language and theme right. Main: `.split` grid
`minmax(0,1fr) minmax(0,520px)`, gap 56, stacked under 900 px. Footer: `BrandCredit`, or the
installation name when the credit is off. Props: `statement` (ReactNode), `children`
(panel content), `cover?` (ReactNode for the panel head).

Used by: login, forgot password, reset password, invite registration, download `/s/`,
receive `/r/`, share password prompt, share not found / expired / inactive, OAuth callbacks.

### Admin shell (`components/layout/app-sidebar.tsx` plus page header)

Sidebar: brand, primary nav (Dashboard, Files, Shares, Receive links), "Admin" group (Users,
Customization, Settings), footer with storage meter in a block, user row with sign out,
language, theme, version (respects `hideVersion`). Mobile: existing sheet drawer, restyled.
Main: 32/40 px padding, page header with title, subline and actions.

## Screens

Every existing page is recomposed in the new shells. Hooks, forms, validation, endpoints and
proxy routes are untouched.

| Screen | Notes |
| --- | --- |
| Login | Statement "Welcome back." plus `appDescription` as the quote and three fixed, translated trust points. Panel: providers, divider, fields, CTA. First-run admin form uses the same panel |
| Download `/s/` | Statement: sender avatar and name, "N files, ready for you.", message as quote, chips (password verified, expiry, size). Panel: cover, file list, total with download count, "Download all" plus "Preview", note line |
| Receive `/r/` | Statement: eyebrow "Receive link", "Send your files to {owner}.", owner description as quote, chips (limits, open until, encrypted in transit). Panel: dropzone with stacked-cards art, queue with per-file bars, progress ring block, name/email/message, CTA |
| Password prompt, not found, expired, inactive | Same shell, panel carries the state; statement explains what to do |
| Dashboard | Greeting by time of day, subline with live counts, two hero tiles, four-figure stats strip, Recent shares and Recent uploads with type tiles (pagination kept) |
| Files | Header with count and size, search, type chips, selection bar in accent, table with tiles, hover actions, pagination footer, empty state |
| Shares, Receive links, Users | Same table language; status badges semantic; dialogs restyled |
| Settings, Profile | Existing tabs, sections get an icon tile heading |
| Customization | Sections Brand, Colour and shape, Brandpack (locked bar with price when no pack; active bar plus fields when valid), live preview panel of the download page |

Copy: sentence case, plain verbs, buttons name the action ("Download all", "Send 2 files",
"Save changes"). New strings go into `messages/en-US.json` and are translated into the other
22 locales in the same change so the key-equality check in CI stays green.

## Brand model

All appearance state is server-side in app configs and served publicly by `GET /app/info`.
Nothing brand-related stays in localStorage any more (the current background picker moves).

| Config key | Free | Type | Notes |
| --- | --- | --- | --- |
| `appName`, `appDescription`, `appLogo` | yes | existing | |
| `appPrimaryColor`, `appRadius`, `appFontFamily` | yes | existing | defaults change to `#0079D2`, `0.5rem`; font list unchanged |
| `appBackground` | **pack** | object name in storage | uploaded via `POST /app/background`, max 3 MB, converted to webp like the logo, served by `GET /api/app/background` |
| `appCustomCss` | **pack** | string, max 20 kB | sanitised on save: `@import`, `url(` to non-relative targets, `expression(`, `behavior:` removed. Injected last in `<head>` |
| `appHideCredit` | **pack** | `"true"`/`"false"` | |
| `appBrandpack` | | signed string | `base64url(payload).base64url(signature)`, Ed25519 |

Server-side gating in `AppService.getAppInfo()`: verify `appBrandpack`; when absent or invalid
the response carries `appBackground: null`, `appCustomCss: ""`, `appHideCredit: false` and
`brandpack: null`, whatever the stored values are. Valid: `brandpack: { organisation, issuedAt }`
plus the paid values. An invalid pack logs one warning line at startup and on each save.

Brandpack verification reuses `modules/update/manifest.ts` with `purpose: "amfora-brandpack"`,
payload `{ purpose, organisation, issuedAt }`. Key pair `/root/secrets/amfora-brandpack-{secret,public}.hex`;
the public half is the default of `AMFORA_BRANDPACK_PUBLIC_KEY` in `env.ts`. Signing script
`infra/sign-brandpack.js`, modelled on `sign-release.js`. Packs never expire and are not bound
to a domain.

Web: `useAppInfo` gains the new fields; a `BrandStyle` component writes `--primary`,
`--radius`, `--font-*`, and the background image; `BrandCredit` hides itself when
`appHideCredit` is true and a pack is valid; the customization page shows the locked bar,
the purchase link (`https://amfora.solutionmax.net/brandpack`, page comes in phase 3 of the
white-label plan) and a paste field for the pack.

## Security

- Custom CSS and background are admin-only and pack-gated on the server. CSS sanitiser has
  tests for `@import`, external `url(`, and `expression(`.
- Background image: same MIME and size checks as the logo; stored in the bucket under
  `app/background.webp`, never as a data URI.
- No new public endpoints beyond `GET /api/app/background` (bytes) and the existing
  `GET /api/app/logo`.
- Rate limits, CORS, share password header, download counting: unchanged.

## Testing

- Unit: `manifest` reuse for brandpack (valid, wrong purpose, tampered), CSS sanitiser,
  `getAppInfo` gating (stored paid values ignored without pack), greeting by hour,
  cover selection (image vs other).
- Existing: 27 web and 56 server tests keep passing; ESLint, tsc, Prettier.
- Browser, on the staging container: every screen in light and dark, at 1440 and 390 px,
  with and without a logo, with and without a valid pack; real upload and download; QR;
  clipboard; first-run admin form; share password, expired and not-found states.
- Build: production Docker image via `infra/build-docker.sh`.

## Delivery

1. Local commits on `amfora`, in this order: tokens and primitives; public shell and public
   pages; admin shell and admin pages; brand model, endpoints and gating; brandpack signing
   and customization page; translations; version 2.0.0 and release notes.
2. Staging container `amfora-brand-stage` on `:15487` rebuilt after each step; Raymon tests.
3. No push, no tag, no live deployment until Raymon says so. Live stays on 1.2.0.
4. After approval: push, tag `v2.0.0`, release flow from `AMFORA.md`, then website
   screenshots and docs, then the live OTA.

## Out of scope

Video thumbnails, own font upload, the sales page and Stripe link (white-label phase 3),
the support tier (phase 4), any change to sharing, storage, auth or update logic.
