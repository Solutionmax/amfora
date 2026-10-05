# Amfora 2.4.0

Release notes inside the app, a notice when an update waits, and a shorter list of sign-in
providers.

## New

- **Release notes in Settings.** The line with the version now tells what the version you run
  brought. When an update is waiting, what it brings is shown next to the Install button, read
  from the signed release, with a link to the full notes.
- **A notice when an update is available.** Administrators see it at the bottom of the menu,
  under the storage meter and their name. It leads to Settings. Other users never see it and
  their browser never asks for it.

## Changed

- **The storage meter in the menu is a ring.** Next to it: what is in use and what is still
  free. Close to a limit the ring and the line under the amount turn amber, at the limit red.
  Without a limit there is no ring, only the amount.
- **External sign-in starts with Authentik, GitHub and Google.** On an upgrade, a provider from
  the old list that was never set up leaves it. A provider with client details, one that is
  switched on, or one that somebody has signed in with stays and keeps working. Any other
  OpenID Connect or OAuth 2.0 service is still added with Add provider.
- **Opening a sign-in provider no longer downloads every icon set.** The form pulled in about
  13 MB of script for the icon picker. It now loads when you press the icon field.

- **The preview under Customization is the real download page.** It used to be a drawing of
  one theme. It now shows the page a visitor gets, scaled down, in the theme you pick, with the
  name, colour, corners and font of what you are editing, before you save. Press it to see it
  large.

## Fixed

- **A font chosen under Customization is applied again.** The choice was saved but the pages
  kept the default font. Versions before 2.3 stored a default font that is no longer included;
  it showed in the list under its internal name. It now shows as Default, and the first start
  of 2.4.0 clears that old value.

- **The selection bar on the Shares page only acts on shares you can see.** Shares ticked
  before you changed the filter or typed a search stayed in the selection and were still
  deleted or downloaded. The bar now counts, deletes and downloads only the ticked shares that
  are in the list.
- **Deleting many files and folders at once no longer fails halfway.** The items are deleted one
  after the other, the rest carries on when one fails, and you are told how many could not be
  deleted.
- **Email switches follow the administrator.** When the administrator has download or expiry
  emails off, the switch on a share or receive link shows off and cannot be changed, with a
  line that says why. Nothing changes in what the server sends.
- **The numbers on the Activity filters follow the search term.** They used to count every
  event whatever you searched for.

## Removed

- **The switch "Play video and audio on download pages".** It is gone from Settings and from
  Customization. Download pages offer video and audio as a download; images, PDFs and text
  keep their preview. An installation that had the switch on stops playing them. Your own
  files still play in your workspace.

## Upgrading

No change to the database layout. The first start removes the setting of the switch, the
sign-in providers that were never set up, and the old default font.

With over the air updates, install 2.4.0 from the admin area. Otherwise set the version in your
compose file and run `docker compose pull && docker compose up -d`. Your data stays in place.

Image: `ghcr.io/solutionmax/amfora:2.4.0` (linux/amd64, linux/arm64).
