# Amfora v1.0 security repair and release

> Execute the approved audit remediation in place on the existing amfora branch. User explicitly authorized all fixes and v1.0 publishing; no further design/release approval required.

Goal: close the reproduced audit failures, preserve working transfers, publish tested v1.0.0.
Architecture: existing Fastify/Prisma SQLite API and Next proxy; server-issued upload grants and login challenges bind browser operations to server authorization. Native crypto, transactions and existing storage SDK; no new service.
Spec: /root/amfora-v1-audit-20260917/AUDIT.md and LUNA-AUDIT.md.

- [x] Download access: regression expired/exhausted/password/private/mixed shares; authorize all download paths consistently; retain legitimate final allowed view with scoped short-lived access if needed.
- [x] Uploads: server-generated keys, signed/DB-bound upload authorization, metadata/HEAD validation, atomic quota enforcement; single and multipart flows including part/complete/abort all use bound keys. Regression arbitrary keys, nonexistent object, forged size, repeated registration, expired grants.
- [x] Authentication: expiring single-use password-stage challenge for2FA; remove spoofable trusted-device fingerprint authorization in favor of random protected cookie. Test missing/expired/replayed challenge, normal2FA and backup codes.
- [x] Providers/reset: active admin required on every provider management endpoint; redact secrets while preserving edits. Canonical APP_URL for reset mails, HTML escaping; fail closed absent URL. Luna owns this bounded slice.
- [x] Proxy/rate: no arbitrary forwarded identity by default; explicit trusted ingress opt-in and account-scoped credential throttles. Document safe HTTPS configuration, privateAPI and Secure cookies.
- [x] Dependencies: targeted supported patched versions; refreshed lockfiles, zero actionable production audit findings or explicit justified non-applicability. No blanket latest major upgrades.
- [ ] Verification: lint/types/tests, production Dockerbuild, isolated exploit regressions and normal browser transfers/login; localmail and multipart checks. Independent review by the same Luna agent.
- [ ] Release: update security/release docs, commit/push amfora, CI green, publish v1.0.0 annotated tag/GitHub release and container workflow if configured; deploy tested image with backup and verify live health/data.
