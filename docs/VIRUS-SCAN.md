# Virus scan

Amfora can check every uploaded file with [ClamAV](https://www.clamav.net/). It is **off unless
you set `CLAMAV_HOST`**. Without it nothing in Amfora looks or behaves differently.

## How it works

Files go straight from the browser to storage, so Amfora scans **after** the upload:

1. The file is registered. With the scan on, it gets the status `pending`.
2. A queue inside the Amfora server takes the pending files one at a time, reads each one from
   storage and streams it to clamd over TCP (the `INSTREAM` command, no extra software needed).
3. The status becomes `clean`, `infected`, `skipped` or `error`. At every start Amfora picks up
   the files that were still pending.

This holds for files in a workspace and for files received on a receive link. Copying a received
file to your own files keeps its status.

| Status     | What it means                                              | Download, preview and sharing |
| ---------- | ---------------------------------------------------------- | ----------------------------- |
| `pending`  | Waiting for the scan. Shown as "Being checked".            | Blocked for everybody         |
| `infected` | clamd found something. Shown as "Blocked: name".           | Blocked for everybody         |
| `clean`    | Nothing found. Nothing is shown.                           | Allowed                       |
| `skipped`  | Larger than `CLAMAV_MAX_SIZE_MB`. Shown as "Not checked".  | Allowed                       |
| `error`    | The scanner could not be reached or failed. "Not checked". | Allowed                       |

"Blocked for everybody" includes the owner: the owner can only delete the file. The answer of the
server is `423` with the code `FILE_BLOCKED_BY_SCAN`. A broken scanner never takes the
installation down, which is why `error` does not block. An infected file can be moved to the
trash and removed like any other; restoring it keeps its status.

When a file is infected, Amfora writes a line in the activity log of the owner (it shows in the
bell as well) and sends an email to the owner and to every active administrator, if email is on.

## Set it up

Add a `clamav` service next to Amfora and point Amfora at it:

```yaml
services:
  amfora:
    environment:
      CLAMAV_HOST: "clamav"
      # CLAMAV_PORT: "3310"
      # CLAMAV_MAX_SIZE_MB: "100"

  clamav:
    image: clamav/clamav:stable
    container_name: amfora-clamav
    environment:
      CLAMD_CONF_StreamMaxLength: "100M" # at least CLAMAV_MAX_SIZE_MB
    volumes:
      - clamav_data:/var/lib/clamav
    restart: unless-stopped
    mem_limit: 2g

volumes:
  clamav_data:
```

The same snippet is in `docker-compose.yaml`, commented out.

| Variable             | Default | Meaning                                                 |
| -------------------- | ------- | ------------------------------------------------------- |
| `CLAMAV_HOST`        | unset   | Address of clamd. Unset means no scanning at all.       |
| `CLAMAV_PORT`        | `3310`  | The TCP port of clamd.                                  |
| `CLAMAV_MAX_SIZE_MB` | `100`   | Larger files are not scanned and show as "Not checked". |

## What to know

- **Memory.** ClamAV needs about 1.2 GB, mostly for its signatures. Give the container 2 GB.
  The first start downloads the signatures and takes a few minutes; files uploaded meanwhile
  stay "Being checked" or become `error` when clamd is not ready yet.
- **Scan after upload.** A file is in storage before it is checked. It is only blocked in
  Amfora: do not give other tools direct access to the storage bucket.
- **Size limit.** clamd refuses a stream larger than its own `StreamMaxLength` (25 MB by default,
  100 MB in the snippet above). Keep it at least as large as `CLAMAV_MAX_SIZE_MB`, otherwise
  those files get the status `error`.
- **One at a time.** Large files take a while and the ones behind them wait.
- **Files from before.** Files uploaded before you switched the scan on have no status and
  are not scanned. There is no rescan.
- **Retry.** A file with status `error` is not tried again. Upload it again or leave it.
- **Switching it off.** Remove `CLAMAV_HOST` and restart. Files that were still pending are open
  again and show nothing; infected files stay blocked.

The figures for [monitoring](MONITORING.md) include `amfora_scan_enabled` and the number of
files per status.
