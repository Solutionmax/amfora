# Amfora 2.3.0

Three themes for the public pages.

- **Customization, Public pages**: pick Stage, Workbench or Seal. Sign-in, download (`/s`) and
  receive (`/r`) pages follow the choice for every visitor. Stored as `appPublicTheme` and served
  with the app info; existing installations keep Stage.
- **Stage**: the download page cover (or the accent) fills the screen with slow drifting light,
  the message sits on it in large white type with live facts, the card floats beside it. Now
  also on sign-in.
- **Workbench**: a calm sand bench with the sender's message and the facts as small fragments,
  the working card on a clean white panel.
- **Seal**: one centred card with the installation's mark as a seal on top and the facts in a
  status row below. The most neutral of the three and the best fit for a customer's own brand.
- Download and receive pages show a live countdown to the end date, the total size and the
  number of files. A single file is named once; several files keep the list with a download
  per item.
- Build: MinIO and mc are copied from the published 2.2.0 image (same binaries, pinned by
  digest), because quay.io no longer serves them without an account.

Image: `ghcr.io/solutionmax/amfora:2.3.0` (linux/amd64, linux/arm64).
