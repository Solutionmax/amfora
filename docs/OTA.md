# Over the air updates

Amfora can tell an administrator that a new release exists, and optionally apply it.
Both halves are off by default in the sense that the second one needs a deliberate
install on the host; neither is required to run Amfora.

## How an update is trusted

The vendor publishes a manifest at `https://amfora.solutionmax.net/releases/latest.json`:

```
base64url({"purpose":"amfora-release","version":"1.2.0","image":"ghcr.io/solutionmax/amfora",
           "digest":"sha256:…","notes":"…","released_at":"2026-09-21"}) . base64url(signature)
```

It is signed with Ed25519. The public half ships in the image, so an installation
verifies the manifest before believing a word of it. Without that signature, anyone who
could answer for the update host could point an installation at a different image.

Two things make the signature meaningful:

- The manifest names an **image digest**, not a tag. The host pulls that digest, so the
  bytes that run are the bytes that were signed, and a later restart runs the same ones.
- `purpose` is checked, so a signed manifest for a sibling product cannot be replayed as
  an Amfora release.

## Checking only

The app fetches and verifies the manifest, caches the answer for six hours, and shows the
result in Settings. Nothing else happens; there is no phone home beyond that request, and
it carries no information about the installation.

| Variable | Default | Meaning |
| --- | --- | --- |
| `AMFORA_UPDATE_URL` | the vendor manifest | Empty switches update checking off completely |
| `AMFORA_UPDATE_CHECK` | `true` | `false` switches it off while keeping the URL |
| `AMFORA_RELEASE_PUBLIC_KEY` | vendor key | Set this if you sign your own releases |
| `AMFORA_OTA_DIR` | `/app/server/ota` | Where the app looks for the host side |

`GET /update/status` and `POST /update/apply` are administrator only, with no first run
exception: an installation that has not been set up yet exposes neither.

## Applying from the app

The container never runs Docker. Giving a container the Docker socket is giving it root on
the host, which for a file sharing application that accepts public uploads is not a trade
worth making. Instead:

1. An administrator presses **Update now**.
2. The app writes `update.trigger` into a directory shared with the host, containing the
   version, image and digest it verified.
3. A systemd path unit on the host notices the file and runs `ota/apply.sh`.
4. That script **fetches and verifies the manifest again**, because the trigger was written
   by the application that is about to be replaced. The trigger is a request, not an order.
5. It backs up the database, pulls the signed digest, pins it in `docker-compose.yaml` and
   restarts the service.

Install it on the host, once:

```bash
sudo COMPOSE_DIR=/opt/amfora bash ota/install-ota.sh
```

Then add the shared directory to your Compose file and bring the service back up:

```yaml
    volumes:
      - /opt/amfora/ota-state:/app/server/ota
```

Without this, Settings still reports that an update exists and says that applying it needs
the host side. That is the intended state for anyone who would rather update by hand.

## Backups and going back

Every update writes `ota-backups/amfora-<timestamp>-before-<version>.tgz` (the Prisma
directory, which holds the database) plus a `.txt` beside it naming the image that was
running. The newest three are kept; `KEEP_BACKUPS=0` keeps all of them.

Rolling back is deliberate work, not a button. A newer image runs `prisma db push` at
startup, so the schema moves forward on its own; moving back does not. Restore the backup
**and** pin the previous image, in that order.

## Logs

Everything the host side does is appended to `ota-state/update.log`, including the reason
an update was refused. A refusal leaves the installation exactly as it was and clears the
trigger, so the app does not sit in "updating" forever.

## Releasing (vendor side)

```bash
bash infra/release-manifest.sh 1.2.0 "One line of release notes"
```

It reads the digest back from the registry, so the manifest can only point at an image
that was really published under that tag, then signs it with the key named by
`AMFORA_RELEASE_SECRET_FILE`. The private key never ships in the image.
