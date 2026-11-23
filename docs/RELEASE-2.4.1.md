# Amfora 2.4.1

A security release after a full review of signing in and of file storage. Please update soon.
After the update everybody signs in once more.

## Security

- **Signing out really ends the session.** Every browser session is now a record on the server
  that can be withdrawn. Signing out, a password reset, a new password or email address and
  switching an account off all end the sessions that existed before. Old sessions from before
  this update are not accepted any more, so everybody signs in again once.
- **Changing your password or email asks who you are.** You confirm with your current password,
  or with a passkey or your external provider when you have no password.
- **Invitations, password reset links and recovery codes work once.** Two requests at the same
  moment can no longer both use the same one.
- **External sign in is stricter.** The sign in must end in the browser that started it and at the
  provider that was asked. An account is found by provider, issuer and the provider's own user
  id; the same email address alone no longer links to an existing account. OpenID Connect
  providers are checked through their discovery document: signature, issuer, audience and nonce.
- **Requests from other sites are refused.** The browser parts of the app only accept changes
  that come from the app's own address. API keys keep working as documented.
- **An upload is sealed when it is registered.** The file is copied to a private name that cannot
  be written again, so a still valid upload address can not change a file afterwards. Files from
  earlier versions are sealed at the first start, with their name and content unchanged.
- **Limits count everything.** Uploads that are still running and files received through a
  receive link count toward the storage limit of the owner, also when several happen at once.
- Updated libraries: nodemailer, sharp and axios. The audit of the production dependencies
  reports nothing open for server and web.

## Fixed

- An upload that does not fit in your storage is refused with the reason and what is still free.
  Through the API this was an "Internal server error".
- The hint under New password said other sessions stay signed in. They are signed out.
- Deleting an account or a receive link also removes its unfinished uploads from storage.
- A removal from storage that fails is kept and tried again, instead of leaving the file behind.
- The storage meter measures the folder the files are really in.
- Passkeys are only offered where the browser allows them: on https or on localhost.

## For API clients

- Give `size` when you ask for an upload address (`/api/v1/files/presigned-url` and the multipart
  start). Without it Amfora reserves the largest allowed file size against your storage limit
  until the upload is registered, which can refuse an upload on an account with a small limit.

## For external sign in

- Set `APP_URL` to the public address of your installation. The redirect address at your provider
  must be exactly `APP_URL/api/auth/providers/<provider-name>/callback`.
- An OpenID Connect provider needs an issuer address with a discovery document. More in
  [docs/AUTHENTICATION-SECURITY.md](AUTHENTICATION-SECURITY.md).

## Upgrading

The first start adds tables and columns to the database and seals existing files; your data,
users and settings stay in place. This can take a moment on an installation with many files.
Everybody signs in once more. To go back to 2.4.0 you need the database backup from before
the update: the over the air update makes one by itself.

With over the air updates, install 2.4.1 from the admin area. Otherwise set the version in your
compose file and run `docker compose pull && docker compose up -d`.

Image: `ghcr.io/solutionmax/amfora:2.4.1` (linux/amd64, linux/arm64).
