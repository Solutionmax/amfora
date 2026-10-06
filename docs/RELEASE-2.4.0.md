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

- **Clear the activity log.** Administrators get a Clear log button on the Activity page, with a
  confirmation. Every line goes; one line stays, saying who cleared the log and when. Only
  administrators see that line.
- **Receive links in the activity log.** Making a receive link and deleting one now write a line,
  like shares do.
- **The logo in emails.** Every email the server sends shows the logo of the installation at the
  top, in front of the name. It is attached to the message itself as a PNG, so it shows in every
  mail program, also where the installation cannot be reached from outside. Without a logo the
  name stays as text.
- **One look for every email.** The password reset, "shared with you", "files received" and the
  activity emails now share one calm layout, and every email also has a plain text version.
  Under the card is one quiet line "Powered by Amfora", which replaces the old "Powered by
  SolutionMAX" of two of these emails. A brandpack that hides the credit hides it here too.

- **A storage limit per user.** Administrators can set a limit for one user in the user form on
  the Users page (a number with MB, GB or TB). Empty means the default of the installation, which
  is shown in the field. Uploads, files taken from a receive link, and the ring in the menu all
  follow that limit. Only administrators can set it; nobody can change their own.
- **Default and maximum lifetime for links.** Two settings under Settings, Storage, in whole
  days (0 means none). The dialogs for a new share and a new receive link start with the default
  end date, and the date picker stops at the maximum. The server refuses a longer date, or no
  date while a maximum is set, also for API keys. A link that already runs longer keeps its end
  date and can still be renamed. A default longer than the maximum is refused in Settings. Secrets
  keep their own bounds.

- **A trash for files and folders.** Deleting in the workspace no longer removes anything: the
  file or folder (with everything in it) moves to the new Trash page under Files. The page lists
  what you deleted, with where it was, when, how many days are left and its size. Restore puts it
  back where it was, or at the top level when its folder is gone or also in the trash, and adds a
  number to the name when that name is taken. Delete for good, and Empty trash, are the only
  places where files leave storage. Something you deleted on its own earlier stays in the trash
  when its folder is restored. Deleted items do not show anywhere else: not in lists, search or
  the dashboard, not in a share (the share itself stays) and not through the API. The trash
  counts toward the storage limit. Everybody sees only their own trash.
  Empty trash answers at once and runs on the server, the page shows that it is emptying and says
  how many items storage refused (they stay). A file is only registered under a name that starts
  with your own user id, as the upload routes hand it out, and never under a name that is already
  in use; nothing can be put into a folder that has a folder in the trash above it.
- **The trash empties itself.** Once a day, items that have been in the trash longer than the
  setting `trashRetentionDays` (Settings, Storage, default 30 days, at least 1) are deleted for
  good.
- **Ended links can leave the list by themselves.** The setting `expiredLinkRetentionDays`
  (Settings, Storage, default 0 which means never, so nothing changes on an upgrade) removes shares
  whose end date passed that many days ago. Only the link goes, with its alias, recipients and
  security: the files and folders it pointed to stay in the workspace. An ended receive link goes
  only when it holds no files; one with files stays. Each removal writes the usual line in the
  activity log, saying it was cleaned up automatically.
- **Two step sign in can be asked for.** The setting `twoFactorRequired` (Settings, Security: Not
  required, Administrators or Everyone, default Not required) makes the chosen users set up two
  step sign in or a passkey. Turning it on signs nobody out. A user who has neither can still sign
  in, but the server answers every route except the set up path with 403 and the code
  `TWO_FACTOR_SETUP_REQUIRED`, and the web app takes them to a set up page and back to where they
  were going. API keys are not affected, and neither are users who sign in through an external
  provider: that provider is responsible for the second step. Public pages (a share link, a
  receive link, a secret) keep working for such a user and treat them as a visitor. Locked out (the
  only administrator lost the authenticator)? Start the server with `TWO_FACTOR_REQUIRED=off`: it
  wins over the setting, Settings shows it as set by the server configuration; sign in, repair,
  remove the variable. One accepted limit: somebody who has only the password can set up their
  own second step while the requirement applies and the owner has none yet, as with any "set up at
  next sign in" rule.
- **Reset the two step sign in of somebody else.** On the Users page an administrator can switch
  off the two step sign in of another user (secret, backup codes and trusted devices go, passkeys
  stay). It is not possible for yourself. The activity log shows who did it and for whom.
- **Passkeys.** Sign in with a passkey from the sign in page: no password and no code. Add and
  remove passkeys on the profile page; both ask for the password. Passkeys need an https address
  or `localhost` (`APP_URL`); elsewhere the buttons are not shown. A passkey counts as two step
  sign in for the setting above. Failed passkey sign ins count towards the same limit as wrong
  passwords and show in the activity log, and so does a wrong password when adding or removing a
  passkey or switching two step sign in off. With password sign in switched off passkeys are not
  offered.
- **Notifications in the app.** A grey bell in the menu (and in the top bar on a phone) shows a
  small count when something is new. Opening it lists the latest 20: your share was downloaded,
  files came in on your receive link, your secret was opened, a share or receive link ends within
  three days, and your storage reached 90 percent of your limit (once, until it drops below again).
  Opening the panel marks everything as seen. There is no separate store: a notification is a line
  of the activity log that belongs to you and was not done by yourself, so it lives as long as the
  log keeps that line, and clearing the log clears the bell. Two new line types appear in the
  Activity page as well: a link that ends soon (written once per link and end date, whether or not
  the reminder mail is on) and storage almost full. The new column `notificationsSeenAt` on the
  user is the only database change. API: `GET /notifications`, `GET /notifications/count`,
  `POST /notifications/seen`, each only for your own.

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
- **An API update that does not send `expiration` no longer clears the end date.** Send
  `null` to clear it. This holds for shares and for receive links.

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

Files and folders get an optional `deletedAt` column, and two new tables hold passkeys and their short lived challenges, all added by the first start. The first start also removes the setting of the switch, the
sign-in providers that were never set up, and the old default font.

With over the air updates, install 2.4.0 from the admin area. Otherwise set the version in your
compose file and run `docker compose pull && docker compose up -d`. Your data stays in place.

Image: `ghcr.io/solutionmax/amfora:2.4.0` (linux/amd64, linux/arm64).
