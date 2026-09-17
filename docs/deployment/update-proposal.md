# Amfora updates — update-only proposal

Status: feasibility review, not an implemented updater. User decision: updates only, no automatic backups or backup prerequisite.

## Current implementation

Amfora runs in Docker, with SQLite and bundled storage on a persistent mount or external S3. Startup applies schema changes. CI tests/builds images but does not publish a release channel. The private-source installation command builds locally.

Pharos separates its shared-hosting file updater from host-managed Docker updates. Amfora should use the Docker approach.

## Proposed update flow

1. Publish tested versioned images and a signed release manifest containing an immutable image digest, compatibility information and release notes. Keep registry credentials on the host while images remain private.
2. Show installed/latest versions, release notes and check status in an administrator-only Updates page.
3. On an explicit update request, a narrowly scoped host updater acquires a lock, verifies the release, checks disk space and compatibility, and downloads the image before interrupting service.
4. Wait for active transfers or let the administrator choose a maintenance window. Replace only the Amfora service using its existing configuration and data mounts. No snapshots, database copies, storage backups or backup jobs are created.
5. Apply supported migrations and check application/storage health. Report completion or the exact failed stage. Keep the previous image for diagnostics or a compatible image-only rollback; do not promise data rollback. If a migration changes data incompatibly, recovery requires a forward fix or a separately operator-managed recovery process.

Start with a host command, then connect the proven operation to the admin button. Do not mount the Docker socket into the web app or accept arbitrary shell commands/image URLs. Scheduled updates remain opt-in.

## Verification before enabling

Test a fresh installation and an upgrade with existing users/files/shares; interrupted transfers; concurrent update refusal; signature validation; unavailable registry; low disk; failed migration; unhealthy replacement; and compatibility-gated image rollback. Assert that the updater makes no backups, preserves configured data mounts and never prunes user volumes. Support the official Compose layout first, with custom installations operator-managed.

## Scope of this change

The website now leads with installation, and GitHub has a branded README banner. This document replaces the earlier backup-based proposal. No updater, automatic update schedule or image publishing is enabled yet.

References: Pharos `app/Services/Updater.php`; Amfora `infra/server-start.sh`, `infra/build-docker.sh`, `docker-compose.yaml` and `.github/workflows/ci.yml`.
