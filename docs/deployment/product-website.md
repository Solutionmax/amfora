# Product website operations

The English Amfora product website is served by the existing Caddy service on
the Contabo VPS. `amfora.solutionmax.net` is proxied through Cloudflare. The
site does not expose the separately hosted Amfora application or its storage.

## Files and releases

- Source: `site/` in the private `raym0nz82/amfora` repository, branch `amfora`.
- Caddy: `/etc/caddy/Caddyfile`, isolated `amfora.solutionmax.net` block.
- Releases: `/var/www/amfora/releases/<release>`.
- Active site: `/var/www/amfora/current`, a symlink to an immutable release.
- A deployment receipt in each release records the source revision and date.

Build-free deployment: copy only the public site tree into a new release
folder, verify its files, then atomically replace the `current` symlink. Keep
previous releases for rollback. Do not copy Git metadata, application data,
operator notes, secrets or local browser artifacts into the public tree.

For Caddy configuration changes, first back up the existing Caddyfile, run
`caddy validate --config /etc/caddy/Caddyfile`, then reload Caddy. A failed
validation must leave the running configuration and active site untouched.

## Verification

Check HTTP redirects to HTTPS, the landing page, `/docs/`, all local assets,
`/robots.txt`, and a random missing URL (404). Check the certificate and
noindex/CSP headers. Browser-check desktop, tablet and mobile navigation,
all send/collect walkthrough stages, keyboard navigation, example-link copying, documentation search, FAQ disclosure and code copying.
Confirm other Caddy sites still respond normally after configuration changes.

The site is public for testing. `noindex` is not authentication. GitHub remains
private and a visitor without repository access may see GitHub's 404 page.

## Rollback

Point `current` back at the previous release using a temporary symlink and
an atomic rename. No Caddy reload is needed for a content-only rollback.
For the first deployment, remove only the Amfora host block from the current
Caddyfile, validate, then reload. Do not blindly restore an old full Caddyfile
if other sites have changed since that backup.

## Assets and licenses

The glass amphora is the original Amfora artwork already used by the app.
Screenshots are real app captures with demo data in an isolated installation.
Bricolage Grotesque and Plus Jakarta Sans are self-hosted; their SIL OFL license
files live beside the font assets. Application and bundled-program attribution
is available at `/LICENSE`, `/NOTICE` and `/licenses/AGPL-3.0.txt`.
