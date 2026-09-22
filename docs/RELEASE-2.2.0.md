# Amfora 2.2.0

Updating shows its progress, step by step.

- **Update now** opens a progress dialog, the same one Pharos and Ostia show: update requested,
  handing over to the server, checking the signed release, backing up your data, downloading
  the new version, restarting Amfora, checking that it is healthy. A spinner marks the current
  step, finished steps get a green check, the elapsed time runs in the corner. It ends with
  "installed" and a Reload button, or with the reason it stopped while the previous version
  keeps running.
- It keeps going while Amfora restarts, and opens again when you come back to Settings during
  an install.
- No change on the host: the app reads the progress from the update log the host side already
  writes, so existing over the air installations get the dialog without reinstalling anything.
- New admin route `GET /update/progress`.

The dialog belongs to the version that runs the update, so you see it from the update after
this one.

Image: `ghcr.io/solutionmax/amfora:2.2.0` (linux/amd64, linux/arm64).
