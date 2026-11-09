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

Safe by default on a fresh install (`deploy/setup-server.sh`, details in `deploy/README.md`):

```
INVITE_ONLY=1      # new profiles need a code the admin generates
ALLOW_GUEST=0      # no anonymous guest profiles on a server
FIRST_USER_ADMIN=1 # only acts while there are no profiles at all
PASSWORD_LOGIN=1   # set it to 0 once the owner has a passkey
```

- The generated `.env` is written with mode 600 and always carries `INVITE_ONLY=1` and
  `ALLOW_GUEST=0`; `deploy/compose.prod.yml` uses the same values when an older `.env` lacks them.
  Invite-only also blocks the very first sign-up, so the script opens sign-up once, for 15 minutes,
  only while the server has no profile: the owner signs up then and becomes the admin.
- The script is fetched from a pinned commit and checked with `sha256sum -c`, not piped from a
  branch. Docker comes from Docker's apt repository with a `signed-by` keyring whose fingerprint
  is checked.
- Root never runs a file the login user can edit: cron runs `/usr/local/sbin/opengym-backup` and
  CI calls `/usr/local/sbin/opengym-deploy`, both root-owned copies, re-installed on each deploy
  (the backup) or each run of the setup script (both).
- Deploys are pinned: images get a `sha-<commit>` tag, and the deploy checks out the commit whose
  tests passed and runs exactly that tag, never `:edge`.
- CI reaches the server only with a known host key (`DEPLOY_KNOWN_HOSTS`,
  `StrictHostKeyChecking=yes`). The deploy key should be limited to the deploy script with a forced
  `command=` and `no-pty,no-port-forwarding,no-agent-forwarding`, the deploy account's sudo limited
  to that one script, and the `production` environment should require the owner's approval.
- `node scripts/check-secrets.mjs --all` runs in CI on every change (`test.yml`). It also refuses
  `*.env` files with any prefix and JSON values under `token`, `secret`, `password` or `api_key`.

Host hygiene: `unattended-upgrades` for security patches, `fail2ban` for SSH, SSH reachable only
through Google's IAP range, ports 80 and 443 only for the web, and the nightly backup.

## 4. What the exercise media licence still forbids

The Gym visual stills and animations are not AGPL. Only the 180 px files may be in the repository,
the demo or a server. Never commit, serve or feed larger sizes to an AI tool. The Leafy figure is
our own drawing and does not use them.
