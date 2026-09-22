# Security policy

## Reporting a vulnerability

Please do not open a public issue for a security problem. Mail
**mail@solutionmax.net** with a description, the Amfora version (the admin
area shows it) and, if you can, the steps to reproduce. You get an answer
within three working days, and a fix is released as a patch version with the
issue named in the release notes.

## Supported versions

Only the latest release gets security fixes. Installations with over the air
updates enabled can install it from the admin area; others run
`docker compose pull && docker compose up -d`.

## Scope

In scope: the Amfora server and web app in this repository, the published
image `ghcr.io/solutionmax/amfora`, and the installer at
`https://amfora.solutionmax.net/get`. Problems in the bundled MinIO binaries
belong upstream, but tell us too so we can ship the fixed version.
