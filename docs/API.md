# API

Other tools can work with your files and links through an API key: a helpdesk that asks a
customer for files, a script that cleans up old shares, a backup job that lists what is there.

## Create a key

Open **Profile**, section **API keys**, and choose **New key**.

| Access      | What the key can do                                                      |
| ----------- | ------------------------------------------------------------------------ |
| Read only   | List files, folders, shares and receive links, and download files. Also `GET /api/v1/metrics` when the key belongs to an administrator. |
| Full access | Also create, change and delete files, folders, shares and receive links. |

A key acts as the user who created it and sees what that user sees. No key can reach
accounts, users, settings, two factor authentication or other keys, also not the key of an
administrator. The one exception is `GET /api/v1/metrics`, which only the key of an administrator
opens: see [MONITORING.md](MONITORING.md). Nor can a key reach the trash page or `/storage`. The
key is shown once. Amfora stores only a hash of it, so a lost key cannot be recovered: remove it
and create a new one. You can give a key an end date.

Two step sign in does not apply to a key, also not while it is required for users.

## Call the API

Send the key with every request, to `/api/v1/` on the address of your installation:

```bash
curl https://files.example.com/api/v1/auth/me \
  -H "Authorization: Bearer amf_..."
```

`X-API-Key: amf_...` works as well. Bodies and answers are JSON.

| Answer | Meaning                                                     |
| ------ | ----------------------------------------------------------- |
| 401    | No key, an unknown key, an expired key or an inactive user. |
| 403    | The key is valid but may not call this endpoint.            |
| 429    | Too many requests. `retry-after` says how long to wait.     |

## Endpoints

Read only keys:

| Method | Path                                         | Purpose                                                    |
| ------ | -------------------------------------------- | ---------------------------------------------------------- |
| GET    | `/api/v1/auth/me`                            | The user behind the key. Use it to test a connection.      |
| GET    | `/api/v1/files`                              | Files                                                      |
| GET    | `/api/v1/files/download-url?objectName=...`  | A download URL for one file                                |
| GET    | `/api/v1/files/download`                     | Download a file by the address the URL above hands out     |
| GET    | `/api/v1/folders`                            | Folders                                                    |
| GET    | `/api/v1/shares/me`                          | Shares                                                     |
| GET    | `/api/v1/shares/{id}`                        | One share                                                  |
| GET    | `/api/v1/reverse-shares`                     | Receive links, with the files received                     |
| GET    | `/api/v1/reverse-shares/{id}`                | One receive link                                           |
| GET    | `/api/v1/reverse-shares/files/{id}/download` | A download URL for a received file                         |
| GET    | `/api/v1/secrets`                            | Secrets you made: status and opening count, never the text |
| GET    | `/api/v1/secrets/limits`                     | What a new secret may ask for                              |
| GET    | `/api/v1/metrics`                            | Figures for monitoring. Only the key of an administrator. See [MONITORING.md](MONITORING.md) |

Full access keys can also call every other endpoint under `/api/v1/files`, `/api/v1/folders`,
`/api/v1/shares`, `/api/v1/reverse-shares` and `/api/v1/secrets`, except `GET /api/v1/secrets/stats`,
which is for administrators in a browser only. A secret is sealed by the
caller before it is sent; [SECRETS.md](SECRETS.md) has the recipe and test vectors. A request body may be at most 1 MB; uploads go to the
upload URL the API hands out, not through the API itself.

### Groups

A share can be limited to the members of a group (`groupId` when creating or changing a share, `null`
to open it to anyone with the link again). The user behind the key must be a member of that group, or an
administrator. Reading such a share, or downloading its files, works for the user behind the key only
when that user is a member, the maker of the share or an administrator; anything else answers 403 with
`code` `GROUP_NOT_MEMBER`.

## Things to know

- **Deleting a file or folder moves it to the trash.** Nothing leaves storage at once, and an
  item in the trash no longer shows in any list, in a share or through the API. It stays for the
  number of days set under Settings, Storage (30 by default), and counts toward the storage limit.
  Restoring and deleting for good are done in the web app, not through the API.
- **Registering an upload.** Ask for an upload URL, upload the file to it, then register it. The
  object must already be in storage, and its size is the one storage reports, not the one you
  send. A name that is not yours, or that is already in use, is refused with 400. When storage
  does not answer, you get 503 with "try again": repeat the call a moment later.
- **End dates.** An update of a share or receive link that does not send `expiration` leaves the
  end date as it is. Send `"expiration": null` to clear it. When the administrator has set a
  maximum lifetime for links, a date beyond it, or no date, is refused.
- **Files that are being checked.** With the [virus scan](VIRUS-SCAN.md) on, a file that is being
  checked or was found infected answers `423` with the code `FILE_BLOCKED_BY_SCAN` when you ask for its
  download URL or download it, also for a file received on a receive link. Delete is still allowed.

## Example: ask someone for files

Create a receive link, give it a readable address, and send that address to the customer.

```bash
curl -X POST https://files.example.com/api/v1/reverse-shares \
  -H "Authorization: Bearer amf_..." -H "Content-Type: application/json" \
  -d '{"name": "Ticket 1042", "description": "Logs for ticket 1042", "maxFiles": 10}'
# {"reverseShare": {"id": "cmu...", "name": "Ticket 1042", ...}}

curl -X POST https://files.example.com/api/v1/reverse-shares/cmu.../alias \
  -H "Authorization: Bearer amf_..." -H "Content-Type: application/json" \
  -d '{"alias": "ticket-1042"}'
```

The customer uploads at `https://files.example.com/r/ticket-1042`. What arrived is in the
`files` list of `GET /api/v1/reverse-shares/cmu...`.
