# API

Other tools can work with your files and links through an API key: a helpdesk that asks a
customer for files, a script that cleans up old shares, a backup job that lists what is there.

## Create a key

Open **Profile**, section **API keys**, and choose **New key**.

| Access      | What the key can do                                                      |
| ----------- | ------------------------------------------------------------------------ |
| Read only   | List files, folders, shares and receive links, and download files.       |
| Full access | Also create, change and delete files, folders, shares and receive links. |

A key acts as the user who created it and sees what that user sees. No key can reach
accounts, users, settings, two factor authentication or other keys, also not the key of an
administrator. The key is shown once. Amfora stores only a hash of it, so a lost key cannot
be recovered: remove it and create a new one. You can give a key an end date.

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
| GET    | `/api/v1/folders`                            | Folders                                                    |
| GET    | `/api/v1/shares/me`                          | Shares                                                     |
| GET    | `/api/v1/shares/{id}`                        | One share                                                  |
| GET    | `/api/v1/reverse-shares`                     | Receive links, with the files received                     |
| GET    | `/api/v1/reverse-shares/{id}`                | One receive link                                           |
| GET    | `/api/v1/reverse-shares/files/{id}/download` | A download URL for a received file                         |
| GET    | `/api/v1/secrets`                            | Secrets you made: status and opening count, never the text |
| GET    | `/api/v1/secrets/limits`                     | What a new secret may ask for                              |

Full access keys can also call every other endpoint under `/api/v1/files`, `/api/v1/folders`,
`/api/v1/shares`, `/api/v1/reverse-shares` and `/api/v1/secrets`. A secret is sealed by the
caller before it is sent; [SECRETS.md](SECRETS.md) has the recipe and test vectors. A request body may be at most 1 MB; uploads go to the
upload URL the API hands out, not through the API itself.

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
