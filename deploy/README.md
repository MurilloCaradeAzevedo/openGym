# Production runbook

One Ubuntu server (Oracle Cloud Always Free ARM, or any VPS), HTTPS by Caddy, images from CI.

```
push to main ─► test.yml ─┐
              └► docker-publish.yml ─► ghcr.io/murillocaradeazevedo/opengym-{api,web}:sha-<commit> (and :edge)
                                         └► deploy.yml (waits for test.yml of that commit)
                                              ─► ssh: sudo opengym-deploy <commit> ─► /api/health
server: caddy :443 ─► web (nginx) ─► api (node) ─► ./data      cron 03:30 ─► ~/opengym-backups (14 days)
```

## First install

1. Server: Ubuntu 24.04, ports 80 and 443 open in the cloud firewall, a DNS name pointing at it.
2. On your own machine, pick the commit to install and note the script's checksum:
   ```bash
   git fetch origin && C=$(git rev-parse origin/main)
   git show "$C:deploy/setup-server.sh" | sha256sum
   ```
3. Over SSH on the server, fetch the script from that exact commit (not from a branch), check it
   against the checksum from step 2, then run it:
   ```bash
   C=<commit id>
   curl -fsSLo setup-server.sh "https://raw.githubusercontent.com/MurilloCaradeAzevedo/openGym/$C/deploy/setup-server.sh"
   echo "<sha256 from step 2>  setup-server.sh" | sha256sum -c -
   COMMIT=$C bash setup-server.sh <domain>
   ```
   Docker comes from Docker's own apt repository; the script stops if its signing key does not
   match the published fingerprint.
4. The generated `~/opengym/.env` is closed by default: `INVITE_ONLY=1`, `ALLOW_GUEST=0`. On a
   server with no profile yet, the script opens sign-up once, for 15 minutes (`SIGNUP_MINUTES`),
   and waits. Open `https://<domain>` right away and create your profile: it becomes the admin
   (`FIRST_USER_ADMIN=1`). Sign-up then closes again; everyone else joins with an invite code from
   the admin dashboard. No profile in time? Run the script again.
5. Once you have a passkey, set `PASSWORD_LOGIN=0` in `.env` unless friends still sign in with a
   password, and `sudo docker compose -f docker-compose.yml -f deploy/compose.prod.yml up -d`.

The script also installs two root-owned files: `/usr/local/sbin/opengym-backup` (a copy of
`deploy/backup.sh`, run by root's cron) and `/usr/local/sbin/opengym-deploy` (what CI calls). Root
never runs a file from the login user's checkout. Run the script again after it changes, so those
copies follow.

## Automatic deploys

Each deploy runs exactly the commit whose tests passed: `opengym-deploy <commit>` checks out that
commit, re-installs the backup script, pulls the images tagged `sha-<commit>` and writes that tag
to `IMAGE_TAG` in `.env`. Nothing runs `:edge`.

GitHub → the fork → Settings:

- Actions: enable workflows for the fork.
- Environments → `production`: add yourself as a required reviewer, and limit it to the `main`
  branch. Each deploy then waits for your approval.
- Secrets (put them on the `production` environment):
  - `DEPLOY_HOST`: server IP or name.
  - `DEPLOY_USER`: the deploy account (see below; `ubuntu` if you skip it).
  - `DEPLOY_SSH_KEY`: the private half of a key used only by CI.
  - `DEPLOY_KNOWN_HOSTS`: the server's host key line. CI checks the server against it
    (`StrictHostKeyChecking=yes`) and refuses to deploy without it. Take it from the server
    itself, not over the network: on the server run
    `awk -v h=<DEPLOY_HOST> '{print h, $1, $2}' /etc/ssh/ssh_host_ed25519_key.pub`.
    Change it when the server is rebuilt.
- Variables: `DEPLOY_DOMAIN` (for the health check).
- Packages: after the first image build, make `opengym-api` and `opengym-web` public (Package
  settings → Change visibility), or log the server in with `docker login ghcr.io`.

### Limit what the deploy key can do

Give CI its own account that can run the deploy and nothing else:

```bash
sudo adduser --disabled-password --gecos '' deploy
echo 'deploy ALL=(root) NOPASSWD: /usr/local/sbin/opengym-deploy' | sudo tee /etc/sudoers.d/opengym-deploy
sudo chmod 0440 /etc/sudoers.d/opengym-deploy && sudo visudo -c
sudo install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
```

In `/home/deploy/.ssh/authorized_keys` (owner `deploy`, mode 600), one line with the CI public key:

```
command="sudo /usr/local/sbin/opengym-deploy \"$SSH_ORIGINAL_COMMAND\"",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding ssh-ed25519 AAAA... ci-deploy
```

Then set `DEPLOY_USER=deploy`. The forced command ignores whatever else is asked over that key;
the deploy script only accepts a 40-character commit id.

## Day to day

| Task | Command (in `~/opengym`) |
|---|---|
| Logs | `sudo docker compose -f docker-compose.yml -f deploy/compose.prod.yml logs -f --tail 100 api` |
| Restart | `... up -d` |
| Deploy a commit by hand | `sudo /usr/local/sbin/opengym-deploy <40-character commit id>` (its images must exist) |
| Pin a version | `IMAGE_TAG=1.4.3` in `.env`, then `... pull && ... up -d` |
| Backup now | `sudo OPENGYM_DIR=$PWD /usr/local/sbin/opengym-backup` |
| Restore | stop the stack, `sudo tar -xzf ~/opengym-backups/data-<stamp>.tar.gz -C ~/opengym`, start it |

Backups stay on the server's disk. Copy `~/opengym-backups` somewhere else as well (another
machine, object storage): a disk that fails takes its own backups with it.
