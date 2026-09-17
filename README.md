<p align="center">
  <img src="apps/web/public/art/vault.jpg" alt="" width="100%" />
</p>

# Amfora

Amfora is a self hosted place to send and receive files. You run it on your own
server, you keep the files, and the people you send a link to need nothing but a
browser. No account, no app, no upload limit set by somebody else.

It is a maintained fork of [Palmr](https://github.com/kyantech/Palmr), which its
author archived in February 2026. See [NOTICE](NOTICE) for the attribution.

## What it does

- **Send.** Put files in a vessel, share one link. Set a password, an expiry date
  or a maximum number of views if the link should not live forever.
- **Receive.** Publish a receive link and let somebody send files to you, without
  giving them an account on your server.
- **Keep.** Files live in your own storage: built in, or any S3 compatible bucket
  you already pay for.
- **Look like you.** Name, logo, accent colour, font and corner radius are set per
  installation, on the server, so every visitor sees the same thing.

## Run it

```bash
git clone https://github.com/raym0nz82/amfora.git
cd amfora
docker compose up -d
```

Then open <http://localhost:5487>. The first run creates the database, seeds the
default settings and prints the initial administrator credentials in the log.

`STORAGE_URL` in `docker-compose.yaml` must be the address the **browser** uses to
reach storage, not the address the container uses. On a LAN that is something like
`http://192.168.1.10:9379`; behind a reverse proxy it is your public HTTPS URL.

### Building the image yourself

```bash
docker buildx build --load -t amfora:local .
```

`buildx` is required: the Dockerfile uses heredoc `COPY`, which the classic builder
does not understand.

## Configuration

Everything is optional except `STORAGE_URL`.

| Variable | Default | What it does |
|---|---|---|
| `STORAGE_URL` | none | Address the browser uses for storage. Required with internal storage. |
| `SECURE_SITE` | `false` | Set to `true` behind an HTTPS reverse proxy. Also enables HSTS. |
| `DEFAULT_LANGUAGE` | `en-US` | Interface language for new visitors. |
| `AMFORA_UID` / `AMFORA_GID` | `1001` | User and group the container writes files as. |
| `ENABLE_S3` | `false` | Use an external S3 bucket instead of internal storage. |
| `S3_DISABLE_CHECKSUMS` | `false` | Set to `true` for Cloudflare R2, which rejects the default checksum. |
| `CORS_ORIGINS` | empty | Origins allowed to call the API from a browser. Leave empty unless you built your own frontend. |
| `TRUST_PROXY` | `true` | Set to `false` when the server is exposed without a reverse proxy in front of it. |
| `RATE_LIMIT_MAX` | `600` | Requests per minute per IP across all routes. |
| `RATE_LIMIT_SHARE_PASSWORD` | `10` | Password attempts per minute per IP on a share. |
| `RATE_LIMIT_CREDENTIALS` | `10` | Login, two factor and reset attempts per minute per IP. |
| `PRESIGNED_URL_EXPIRATION` | `3600` | Seconds an upload or download URL stays valid. |

The full list of S3 variables is in `docker-compose.yaml`.

## Security notes for operators

- Put the instance behind HTTPS and set `SECURE_SITE=true`.
- Do not publish port `3333`. The API is reached from inside the container.
- Share passwords travel in the `x-share-password` header, never in a URL, so they
  stay out of your proxy's access logs.
- The database holds password hashes and the JWT secret and is written `0600`. Keep
  it that way if you move the data directory around.
- Back up `/app/server` from the volume. It holds the database and every uploaded file.

## Upgrading from an installation named Palmr

The container renames `prisma/palmr.db` to `prisma/amfora.db` on first start and
keeps using an existing `palmr-files` bucket rather than creating an empty new one.
Set `AMFORA_UID` and `AMFORA_GID` where you previously set `PALMR_UID` and `PALMR_GID`.

## Development

```bash
pnpm install                      # in apps/web and apps/server
cd apps/server && pnpm dev        # API on :3333
cd apps/web    && pnpm dev        # web on :3000
cd apps/server && pnpm test       # server checks
```

Run `pnpm prettier --write "src/**/*.tsx"` in `apps/web` before building: the build
runs ESLint with the Prettier rule and fails on formatting.

## Licence

Apache 2.0, see [LICENSE](LICENSE). The bundled `minio` and `mc` binaries are
AGPL-3.0 and are redistributed unmodified; see [NOTICE](NOTICE).
