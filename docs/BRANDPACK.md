# Brandpack

A brandpack is what a paying customer receives for the white-label tier: a short signed
string that tells an Amfora installation it may run without the "Powered by Amfora"
credit and with the paid customization switched on.

## What it unlocks

| Setting | Free | With a brandpack |
| --- | --- | --- |
| Name, description, logo, favicon | yes | yes |
| Accent colour, corner radius, font | yes | yes |
| "Powered by Amfora" credit | always shown | can be hidden |
| Public-page background image | no | yes |
| Custom CSS | no | yes |

Everything else in the product is identical. The Apache licence and the `NOTICE` file
are not affected: a brandpack removes the SolutionMAX brand from the interface, not the
licence from the source.

## Terms

- One organisation, unlimited installations of that organisation.
- Never expires, also not across major versions.
- Not bound to a domain; the signature is the whole check.
- Not transferable and not for resale.

## How it works

The pack is `base64url(payload).base64url(signature)`, signed with Ed25519, the same
shape as the update manifest. The payload is:

```json
{ "purpose": "amfora-brandpack", "organisation": "Acme B.V.", "issuedAt": "2026-09-21" }
```

The server verifies the pack with the public key in `AMFORA_BRANDPACK_PUBLIC_KEY`
(`apps/server/src/env.ts`, shipped as a default) every time `/app/info` is served.
Without a valid pack the response carries `appHideCredit: false`, `appBackground: false`
and `appCustomCss: ""`, whatever an admin stored. Activating a pack later switches the
stored values on without re-entering anything. The `purpose` field keeps a release
manifest from being replayed as a brandpack and the other way round.

## Issuing one

On the vendor machine only:

```bash
node infra/sign-brandpack.js "Acme B.V." 2026-09-21
```

The secret lives in `/root/secrets/amfora-brandpack-secret.hex` (mode 600) and never
enters a repository, a container image or a chat. Send the printed string to the
customer; they paste it under Customization, Brandpack, Activate.

## Endpoints

| Method | Path | Who | Does |
| --- | --- | --- | --- |
| `PUT` | `/app/brandpack` | admin | verifies and stores the pack, 400 when it does not verify |
| `DELETE` | `/app/brandpack` | admin | removes it; paid customization switches off |
| `GET` | `/app/background` | public | streams the background image or 404 |
| `POST` | `/app/background` | admin | uploads an image (max 3 MB, stored as WebP under `branding/`) |
| `DELETE` | `/app/background` | admin | removes it |

Custom CSS is stored through the normal config endpoint as `appCustomCss` and is
sanitised on the way out: `@import`, `expression(`, `behavior:` and `url(` to anything
that is not a same-origin path or an image data URI are removed, and the size is capped
at 20 kB.

## Selling and delivery

The sales page is `site/brandpack/index.html` (`https://amfora.solutionmax.net/brandpack/`),
the terms are `site/legal.html#terms` with a Spanish consumer version at `site/sales-es.html`,
and the delivery email lives in `infra/mail/`:

| File | Purpose |
| --- | --- |
| `infra/mail/brandpack-issued.html` | the email a customer gets, HTML, inline CSS, placeholders `{{organisation}}`, `{{key}}`, `{{order_reference}}`, `{{issued_at}}`, `{{terms_version}}` |
| `infra/mail/brandpack-issued.txt` | the plain-text alternative, first line is the subject |
| `infra/mail/amfora-terms-<date>.txt` | the terms as sold, attached to the email; a new version is a new file, old ones stay |

Sales run through the shared licence portal (`pharos-portal`, Laravel on edge-01), served
under `https://amfora.solutionmax.net/account`. The buy buttons open
`/account/buy/amfora-brandpack` and `/account/buy/amfora-setup`: a Stripe Checkout with the
organisation name as a required field, the terms acceptance, and for the brandpack the
express consent to immediate delivery. On `checkout.session.completed` the portal signs the
pack for that organisation with the Amfora key (mounted read-only in the container), stores
the licence, mails the key with the terms attached (the portal's own Blade version of the
template above), and keeps the Stripe session id with the accepted terms version. Customers
fetch their keys again at `/account` with a sign-in link. A pack can still be signed by hand
with `node infra/sign-brandpack.js "<organisation>"` for a sale by invoice.

What the signer needs on the machine that sends: the Ed25519 secret as a mounted read-only
file, never in the image and never in git. The public half ships in `env.ts`; changing the
key pair means every issued pack stops verifying, so the secret is backed up, not rotated.
