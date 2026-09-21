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
