# Amfora 2.3.1

A fix release. Update if you delete shares in bulk.

## Fixed

- **Deleting several shares at once works again.** Selecting a handful of shares and deleting
  them removed one or two and then reported "Failed to delete shares". The deletes collided in
  the database. The server now takes database work in turn, and the page deletes the selection
  one share after another. After a failure the list reloads, so trying again no longer stops at
  once on shares that were already gone.
- **The storage meter of an administrator counts what Amfora holds.** It showed the whole disk,
  so backups or another program on the same disk looked like Amfora's use. Used is now the files
  in Amfora for every user; the total is that plus the free room on the disk. Other users keep
  their own meter: their files against their limit.

## New

- **Select all on the Shares page.** In selection mode the bar above the list starts with a box
  that picks every share the list shows, so with a search term or the Expired tab only those.

## Upgrading

No change to the database or to settings.

With over the air updates, install 2.3.1 from the admin area. Otherwise set the version in your
compose file and run `docker compose pull && docker compose up -d`. Your data stays in place.

Image: `ghcr.io/solutionmax/amfora:2.3.1` (linux/amd64, linux/arm64).
