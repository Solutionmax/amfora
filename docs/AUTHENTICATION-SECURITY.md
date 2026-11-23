# Authentication boundary in 2.4.1

Browser sessions now have a revocable database row and an account credential version.
The upgrade intentionally invalidates old JWTs lacking these fields: users sign in again.
Logout revokes that session. Session issuance uses the account version that the
credential ceremony actually verified and checks it atomically with session creation;
a password reset or deactivation cannot turn a pending old proof into a new session.
Deactivation advances the version, so reactivation cannot revive an old session or
pending password-stage challenge. Logout reports a temporary failure if reading or
revoking persisted sessions fails; the UI retains signed-in state and asks you to retry. Password reset and password/email changes revoke all prior
sessions, trusted devices, login challenges and credential proofs. API keys retain their
independent scope, expiry, active-account and route checks; public shares retain their
password, expiry, grant and group rules. An invalid browser cookie is treated as a visitor
on a public route, so it cannot retain an owner bypass or block anonymous sharing.

External authentication requires `APP_URL` to name the public canonical origin.
Each provider's redirect URI must be exactly
`APP_URL/api/auth/providers/<provider-name>/callback`. Request Host and forwarded host
headers, caller-supplied state and redirect URIs never define an authorization redirect.
The browser must start and finish on the canonical origin: starting on a LAN IP and
returning to a different HTTPS host loses the browser-binding cookie and is rejected.
The binding cookie is HttpOnly, SameSite=Lax, Secure on HTTPS and lasts ten minutes.
State is persisted as a hash, bound to that browser and provider, checked for expiry
at callback, and consumed once before token exchange.

OIDC requires an issuer URL serving standard discovery metadata and a JWKS endpoint.
ID tokens undergo signature, issuer, audience and nonce validation using openid-client;
user-info subjects must match the validated ID token. Manual OAuth endpoints remain
supported. Manual OIDC endpoints without a discoverable issuer now fail with a precise
configuration error; do not weaken validation to make them work.

Sign-in identifies accounts by provider, pinned issuer and exact external subject.
An email match never links an existing account, including a verified email match.
Existing provider associations get their current issuer pinned once during seeding;
existing pins are retained on later restarts. A changed issuer cannot reuse old
associations. New auto-registration requires a verified email and respects autoRegister.
GitHub uses its verified email endpoint; Discord uses its verified claim. A provider
that supplies no verifiable email cannot auto-register an account.

Provider-only cross-site verification requires the canonical HTTPS origin. HTTP session
cookies remain SameSite=Strict, so they are not sent back from an external provider;
use the configured canonical HTTPS site for this step-up flow.

Changing your own password or email requires the current password or a separate fresh
passkey/provider ceremony. The profile form provides each available option. Verification
via a provider returns to the profile; enter the intended change after returning. The
proof stays in an HttpOnly cookie, expires after five minutes, is tied to that user,
session and credential version, and is consumed atomically by one sensitive change.
A session's issue time does not count as credential proof. Admin changes to another
account keep the active-admin management guard. Successful self-service changes renew
the current browser session and revoke all prior sessions/devices.

For direct LAN ingress leave `TRUST_CLIENT_IP_HEADERS` unset or set it to `false` in
both web and API processes. The web proxy will omit caller-supplied forwarding identity;
the API ignores CF-Connecting-IP for activity location and X-Real-IP for device records.
Requests then share the web proxy's API rate bucket, and location has reduced precision
(often Local network). Enable forwarding identity only behind private controlled ingress
that replaces forwarding headers and prevents direct clients from reaching the web port.
`TRUST_PROXY` must list actual trusted proxy addresses, never unrestricted true.

Browser mutation proxies compare serialized Origin to the validated request Host
authority (or the configured canonical origin with that same authority), independently
of Next middleware's internal 0.0.0.0 URL. Forwarded Host headers cannot define it.
Browser mutation proxies reject cross-origin requests and safelisted plain-text/form
submissions. JSON login requires application/json. Same-origin public upload/secret
mutations and explicit nonbrowser API clients retain their routes. Passkey UI also checks
the browser's actual secure context and WebAuthn support, so a canonical HTTPS APP_URL
does not advertise passkey registration from an insecure HTTP LAN page.

Real external-provider integration and physical authenticator ceremonies still need
operator testing. Automated tests use actual routes, disposable SQLite, signed OIDC
fixtures and virtual authenticators; they do not replace those physical/external checks.
