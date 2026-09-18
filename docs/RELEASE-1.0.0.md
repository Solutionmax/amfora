# Amfora 1.0.0

Amfora's first stable release brings the unified website, login, upload and download design, refreshed product screenshots, and the security fixes verified during the release audit.

## Security changes

- Expired and exhausted shares no longer authorize direct file downloads. A short lived, signed cookie lets a visitor finish the final permitted view. Folder shares include authorized descendants and exclude unrelated folders.
- Public uploads receive server selected temporary keys. Registration verifies the stored object, declared size, file extension, required metadata, and current share limits. Accepted files move to a separate private key; replaying an old upload URL cannot overwrite them. Concurrent registrations enforce the file count limit transactionally.
- Public multipart operations are bound to their upload grant. Authenticated multipart operations verify the owner's object prefix.
- Two factor login requires an expiring, single use challenge issued after a correct password. Remembered devices use random, hashed tokens in protected cookies.
- Authentication provider management always requires an active administrator. Provider secrets are omitted from responses; blank edits preserve existing secrets.
- Password reset mail uses the operator's canonical `APP_URL`. Email templates escape supplied names and filenames.
- The API listens on loopback by default. Forwarded client identity is ignored unless explicitly configured for a trusted ingress.
- Production JavaScript dependencies were upgraded; both application package audits returned zero known vulnerabilities on 17 September 2026.

## Upgrade notes

Back up application data before upgrading. Startup adds the upload grant and login challenge tables. Existing remembered devices must authenticate again. Set `APP_URL` to the actual application origin before using password reset mail.

Custom clients must send `filename`, `extension`, and `size` to public upload authorization endpoints and use the returned `objectName`. Multipart creation also requires `size`. Two factor clients must pass the password step's `challengeId` to the OTP endpoint.

For a public installation, configure HTTPS for both the app and storage, set `SECURE_SITE=true`, and restrict direct access to the API. Enable forwarded header trust only behind an ingress that overwrites those headers. See README for configuration.

## Validation scope

Release validation covers lint, TypeScript, automated regression tests, installer checks, a production container build, isolated upload/download and authentication regressions, real multipart storage transfers, concurrent quota enforcement, local SMTP delivery, and desktop/mobile browser checks.

This is a bounded application review, not a guarantee that all vulnerabilities are absent. External identity providers and external SMTP services depend on deployment specific credentials and configuration. The automated package audit covers JavaScript production dependencies; it does not certify the bundled storage binaries or host operating system. Transfers larger than 5 GiB were not exercised during this release check.
