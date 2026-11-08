# Production runbook

One Ubuntu server (Oracle Cloud Always Free ARM, or any VPS), HTTPS by Caddy, images from CI.

```
push to main ─► test.yml ─┐
              └► docker-publish.yml ─► ghcr.io/murillocaradeazevedo/opengym-{api,web}:edge
                                         └► deploy.yml (waits for test.yml) ─► ssh: pull + up -d ─► /api/health
server: caddy :443 ─► web (nginx) ─► api (node) ─► ./data      cron 03:30 ─► ~/opengym-backups (14 days)
```

## First install

1. Server: Ubuntu 24.04, ports 80 and 443 open in the cloud firewall, a DNS name pointing at it.
2. Over SSH on the server (the second argument is the public half of the CI deploy key; it is
   installed as a forced command that can only run `deploy/redeploy.sh`):
   ```bash
   curl -fsSL https://raw.githubusercontent.com/MurilloCaradeAzevedo/openGym/main/deploy/setup-server.sh | bash -s -- <domain> '<ssh-ed25519 ... opengym-github-actions>'
   ```
3. Open `https://<domain>`, create your profile, copy **Settings > Account > Account ID** into
   `ADMIN_UIDS=` in `~/opengym/.env` and run the setup line again. There is no
   `FIRST_USER_ADMIN` on purpose: on a public address a stranger could sign up first.
4. Set `INVITE_ONLY=1` in the same file if only invited people should sign up, and run it again.

## Automatic deploys

GitHub → the fork → Settings:

- Actions: enable workflows for the fork.
- Secrets and variables → Actions → Secrets: `DEPLOY_HOST` (server IP), `DEPLOY_USER` (`ubuntu`),
  `DEPLOY_SSH_KEY` (the private half of the CI key; setup-server.sh installs the public half),
  `DEPLOY_KNOWN_HOSTS` (the output of `ssh-keyscan <server IP>`, taken once from a machine you
  trust, so CI never trusts an impostor on first use).
- Each main commit is published as `sha-<commit>` besides `edge`; the deploy starts that exact
  tag, so a newer push cannot put untested images live.
- Variables: `DEPLOY_DOMAIN` (for the health check).
- Packages: after the first image build, make `opengym-api` and `opengym-web` public (Package
  settings → Change visibility), or log the server in with `docker login ghcr.io`.

## Day to day

| Task | Command (in `~/opengym`) |
|---|---|
| Logs | `sudo docker compose -f docker-compose.yml -f deploy/compose.prod.yml logs -f --tail 100 api` |
| Restart | `... up -d` |
| Pin a version | `IMAGE_TAG=1.4.3` in `.env`, then `... pull && ... up -d` |
| Backup now | `sudo OPENGYM_DIR=$PWD deploy/backup.sh` |
| Restore | stop the stack, `sudo tar -xzf ~/opengym-backups/data-<stamp>.tar.gz -C ~/opengym`, start it |

Backups stay on the server's disk. Copy `~/opengym-backups` somewhere else as well (another
machine, object storage): a disk that fails takes its own backups with it.
