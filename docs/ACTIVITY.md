# Activity, notifications and webhooks

## Activity

**Activity** in the menu shows what happened to your links and your account: a share opened or
downloaded, a wrong password, files received, a secret opened, a sign in. A user sees their own
links, an administrator sees everyone. **Export CSV** gives the same list as a file.

Activity is kept for 90 days by default (**Settings**, tab **Security**, block **Activity**).

### Where

Each line can say where a visitor was, as a city and country. The address itself is never
stored: it is turned into a place and then dropped.

Places need a database, which Amfora does not ship. Any city or country database in MaxMind
format (`.mmdb`) works. The free [DB-IP City Lite](https://db-ip.com/db/download/ip-to-city-lite)
is a good start; its license asks for a credit, which Amfora shows on the Activity page while
that database is in use.

```bash
mkdir -p ./data/geoip
curl -L "https://download.db-ip.com/free/dbip-city-lite-$(date +%Y-%m).mmdb.gz" | gunzip > ./data/geoip/city.mmdb
```

Amfora looks for `geoip/city.mmdb` in its data directory; `GEOIP_DATABASE` points it elsewhere.
Restart after replacing the file. Without a database, private addresses show as "Local network"
and everything else as unknown.

Behind a reverse proxy the server only sees the proxy. Set `TRUST_CLIENT_IP_HEADERS=true` for
the web process when your ingress replaces incoming forwarding headers; behind Cloudflare the
visitor then comes from `CF-Connecting-IP`. This setting alone changes what the log says. Rate
limits count per visitor once `TRUST_PROXY` is set as well; see the README.

**Settings** lets you choose city and country, country only, or no place at all.

## Emails to the maker

All need outgoing email (**Settings**, tab **Email**) and can be switched off for the whole
installation in the block **Notifications**.

| Email            | Asked for                                  | Sent                                              |
| ---------------- | ------------------------------------------ | ------------------------------------------------- |
| Share downloaded | Per share: "Tell me when it is downloaded" | Once per visitor per hour, however many files     |
| Expiry reminder  | Per share or receive link: "Remind me"     | Three days before the end date, once per end date |
| Secret opened    | For everyone, by the administrator         | Each time a secret is opened. Never its text.     |

## Webhooks

**Settings**, tab **Security**, block **Webhooks**: one address, and a switch per event.

| Event                    | `data`                                                            |
| ------------------------ | ----------------------------------------------------------------- |
| `receive.files_received` | `receiveLinkId`, `receiveLink`, `from`, `files`, `bytes`, `place` |
| `share.downloaded`       | `shareId`, `share`, `file`, `place`                               |
| `secret.opened`          | `secretId`, `secret`, `opens`, `maxOpens`, `place`                |

Each call is a `POST` with a JSON body `{ "event": "...", "at": "<ISO time>", "data": { ... } }`
and a header `X-Amfora-Signature: sha256=<hex>`: the HMAC-SHA256 of the raw body with the key
shown in Settings. Check it before you trust a call:

```js
const expected =
  "sha256=" + crypto.createHmac("sha256", key).update(rawBody).digest("hex");
const ok = crypto.timingSafeEqual(
  Buffer.from(expected),
  Buffer.from(request.headers["x-amfora-signature"]),
);
```

Calls time out after five seconds and are not repeated. A failing address never slows a visitor.
