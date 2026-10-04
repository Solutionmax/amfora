# Secrets

A secret is a short text, usually a password or a key, behind a link that can be opened a set
number of times. After the last opening, or when its time runs out, the text is destroyed.

## For users

Open **Secrets** and choose **New**. Paste the text, pick how long the link lives and how often
it may be opened, and optionally set a passphrase. Copy the link straight away: it is shown
once. The key is part of the link and never reaches the server, so nobody can show it again,
also not an administrator. Lost the link? Delete the secret and make a new one.

The list keeps a record of every secret you made: waiting, used up, expired, or destroyed
after three wrong passphrases. The text itself is never in that list.

The reader opens the link and presses **Show the secret**. Loading the page costs nothing, so
a chat app that fetches the link for a preview does not use it up.

## For administrators

**Settings**, tab **Security**:

| Setting                                | Default | Meaning                                         |
| -------------------------------------- | ------- | ----------------------------------------------- |
| Allow secrets without an account       | off     | Opens `/secret` to anyone who knows the address |
| Longest expiry (without an account)    | 7 days  |                                                 |
| Most times opened (without an account) | 3       |                                                 |
| Longest text (without an account)      | 5000    | Characters                                      |
| Limit per visitor                      | 10      | New secrets per hour, see the note on addresses |
| Longest expiry (signed in)             | 30 days |                                                 |
| Most times opened (signed in)          | 10      |                                                 |

While secrets without an account are on, the sign-in page links to `/secret`, and Settings
shows the address and how many of these secrets are waiting. That number is all there is: they
cannot be read or listed.

The limit per visitor counts per address. Behind a reverse proxy every visitor shares one
address unless `TRUST_PROXY` and `TRUST_CLIENT_IP_HEADERS` are set as described in the README.

## How it is sealed

Everything below happens in the browser, or in your own code when you use the API.

1. `linkKey`: 32 random bytes. `nonce`: 12 random bytes. Both fresh for every secret.
2. With a passphrase: `stretched = PBKDF2-HMAC-SHA256(passphrase, salt = linkKey, 100000 rounds, 32 bytes)`,
   the passphrase in Unicode form NFKC, as UTF-8. Without one, `stretched` is empty.
3. `master = linkKey || stretched`.
4. Three values with HKDF-SHA256, no salt, 32 bytes each:
   - `sealKey = HKDF(master, info = "amfora secret seal v1")`
   - `verifier = HKDF(master, info = "amfora secret open v1")`
   - `proof = HKDF(linkKey, info = "amfora secret link v1")`
5. `sealed = AES-256-GCM(sealKey, nonce, text as UTF-8)`, no additional data, the 16 byte tag
   at the end. `ciphertext = nonce || sealed`.
6. `ciphertext`, `proof` and `verifier` go to the server as base64url without padding. The
   link is `https://<host>/x/<id>#<linkKey as base64url>`.

The server stores the ciphertext and SHA-256 of proof and verifier. To open, a reader sends
proof and verifier. A wrong proof costs nothing and tells nothing: the id alone, which shows up
in logs and link previews, cannot harm a secret. A right proof with a wrong verifier is a wrong
passphrase; three of those destroy the secret.

### Test vectors

`linkKey` = bytes `00 01 02 … 1f`, `nonce` = bytes `a0 a1 … ab`, text `correct horse battery staple`.

|            | Without passphrase                                                            | Passphrase `tr0ub4dor&3`                                                      |
| ---------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| ciphertext | `oKGio6SlpqeoqaqrrTsMkL0otDO9_ALWzXJqEUf-4FiIWrxOSQj4inqkxK786onBNqeHPggRtT0` | `oKGio6SlpqeoqaqrgPSx4UlJ-ZW29TL68Tl9ONWXl1cIsL72UY4RHo2wCZhXFjXghagWmw7x-Q8` |
| proof      | `85rt_VP8VFLKanVz6SPmQBNSD4RI9MKaQYN6RA2BhXE`                                 | the same                                                                      |
| verifier   | `UCKs6tYJgWyoxcqQZV5bwmNX6LaFnehl92JAcoqvs8o`                                 | `DzZtEhjlHA7MBvRBtFSDGeNxMX0SrJCfWRBBulFllRI`                                 |

## API

A full access API key can make and delete secrets, a read only key can list them. See
[API.md](API.md) for keys.

```bash
curl https://files.example.com/api/v1/secrets \
  -H "Authorization: Bearer amf_..." -H "Content-Type: application/json" \
  -d '{"ciphertext":"...","proof":"...","verifier":"...","hasPassphrase":false,
       "label":"Database password","expiresInHours":168,"maxOpens":1}'
```

The answer holds `id` and `expiresAt`; build the link from the id and your own `linkKey`.

| Method | Path                     | Key  | Purpose                                     |
| ------ | ------------------------ | ---- | ------------------------------------------- |
| GET    | `/api/v1/secrets`        | read | Your secrets: status, opening count, expiry |
| GET    | `/api/v1/secrets/limits` | read | Longest expiry, most openings, longest text |
| POST   | `/api/v1/secrets`        | full | Store a sealed secret                       |
| DELETE | `/api/v1/secrets/{id}`   | full | Delete one; its link stops working at once  |

Opening a secret needs no key and no account: `GET /api/secrets/{id}/status` and
`POST /api/secrets/{id}/open` with `proof` and `verifier`.
