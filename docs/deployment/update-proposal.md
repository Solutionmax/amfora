# Amfora update proposal

Status: feasibility review, not an implemented updater.

## Existing behavior

Amfora is a Docker application with SQLite and bundled MinIO data in a persistent mount, or external S3 storage. Startup applies database schema changes. The current CI builds and tests an image but does not publish releases. The build wrapper can explicitly push images; a tested release pipeline is still needed. The website installation command builds from the maintained private branch and requires authenticated source access.

Pharos checks a signed release manifest and exposes current/latest version information. Its shared-hosting installation can replace its own files; Docker installations are managed on the host. Amfora should follow the Docker model, not copy the PHP archive updater.

## Recommended first version

1. Publish tested, versioned images and release notes through a controlled release workflow. Pin deployments to an immutable image digest. Authenticate private GHCR pulls on the host; repository and package access are separate concerns.
2. Add an administrator-only Updates page: installed version, latest compatible version, release notes, last check and explicit unavailable/unauthorized states. Check a signed release manifest with a pinned verification key; no arbitrary image URLs from the browser.
3. Start with an operator-run host update command. Validate image/manifest, disk space, Docker/Compose versions and supported installation layout. Acquire a lock, download before downtime, drain uploads and stop writes, then take a consistent database/configuration/storage backup. External S3 needs its own coordinated versioning/snapshot plan.
4. Replace only the Amfora service, apply migrations, and check both application and storage health. Keep the previous image and matching backup. If migrations changed data, reverting only the image is insufficient: restore the compatible database/configuration/storage snapshot before reopening writes. Test failed migrations and failed health checks in staging.
5. Add an optional narrowly scoped host worker for an admin-triggered update after the command is proven. Use authenticated, fixed operations and persist progress across container restarts. The web app must not get the Docker socket or arbitrary host command execution. Scheduled updates should be opt-in with a maintenance window.

## Before enabling automatic updates

Prove fresh installation, upgrade with existing users/files/shares, transfer interruption handling, backup restore, concurrent update refusal, invalid signatures, unavailable registry, disk exhaustion, failure recovery and data-preserving rollback. Support the official Compose layout first; custom installations stay operator-managed. Retain only bounded build cache and a documented number of backups/images; never prune user volumes.

## Scope of this change

Website install/source/support links only. No update worker, release publishing, automatic updates or application deployment was enabled.

References: Pharos `app/Services/Updater.php` and `SelfUpdater.php`; Amfora `infra/server-start.sh`, `infra/build-docker.sh`, `docker-compose.yaml` and `.github/workflows/ci.yml`.

- https://docs.docker.com/engine/security/
- https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
