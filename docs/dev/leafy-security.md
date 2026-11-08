# Leafy: what is public, what is secret, and how the server is locked down

Leafy is open source (AGPL), so the **code is public on purpose**. Security cannot depend on the
code being hidden. It depends on four things staying out of the repository and out of the browser.

## 1. Never in the repository

| Secret | Lives in | Guard |
|---|---|---|
| Server `.env`, VAPID keys, session `secret`, user data | the server's `data/` and `.env` | `.gitignore`, `scripts/check-secrets.mjs` |
| Android signing key and its password | the release machine, outside the repo | `.gitignore` (`*.keystore`, `keystore-password*`) |
| Cloud config (`google-services.json`) and API keys | local files and server env | `.gitignore`, the scanner |
| DuckDNS token, SSH keys | the owner's accounts and `~/.ssh` | the scanner (DuckDNS URL, private keys) |
| Test accounts | `.claude/` (ignored) | `.gitignore` |

Turn the commit guard on once per clone: `git config core.hooksPath .githooks`. It scans the staged
changes and refuses a commit that carries a key, a token, a `NAME_SECRET=value` line or a forbidden
file. Run it on everything with `node scripts/check-secrets.mjs --all`. A line that is a safe example
can carry `secret-scan: allow`.

If a secret is ever committed, **rotating it is the fix**, not deleting the commit: the old value
stays in the history and in every clone.

## 2. Paid features and the AI coach run on the server

The app code is public, so anything the browser decides can be changed by whoever runs their own
copy. That makes `can(plan, feature)` (`frontend/src/lib/leafy/plan.ts`) a **display rule only**.
When a premium feature exists, the server must check the person's plan before it answers, and the
coach's model key must stay in the server's environment, never in a client bundle or a response.

## 3. The server

Already in place in openGym: passkeys, signed session cookie, CSRF check, rate limits on sign-up and
password routes, a strict Content-Security-Policy, `X-Frame-Options: DENY`, `nosniff`, user files kept
outside the web root, state written temp-then-rename.

Added for Leafy:
- `deploy/Caddyfile`: HSTS for a year and a Permissions-Policy that turns off camera, microphone,
  location, payment and USB; the `Server` header is dropped.

On the VM (`~/opengym/.env`), the public instance should run with:

```
INVITE_ONLY=1      # new profiles need a code the admin generates
ALLOW_GUEST=0      # no anonymous guest profiles on a server
```

`FIRST_USER_ADMIN` only acts while there are no users, so leaving it is harmless. Keep
`PASSWORD_LOGIN` off once the owner has a passkey. `chmod 600 .env`.

Host hygiene: `unattended-upgrades` for security patches, `fail2ban` for SSH, SSH reachable only
through Google's IAP range, ports 80 and 443 only for the web, and the nightly `deploy/backup.sh`.

## 4. What the exercise media licence still forbids

The Gym visual stills and animations are not AGPL. Only the 180 px files may be in the repository,
the demo or a server. Never commit, serve or feed larger sizes to an AI tool. The Leafy figure is
our own drawing and does not use them.
