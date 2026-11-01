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
2. Over SSH on the server:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/MurilloCaradeAzevedo/openGym/main/deploy/setup-server.sh | bash -s -- <domain>
   ```
3. Open `https://<domain>` and create your profile first: it becomes the admin (`FIRST_USER_ADMIN=1`).
4. Then set `INVITE_ONLY=1` in `~/opengym/.env` if only invited people should sign up, and
   `sudo docker compose -f docker-compose.yml -f deploy/compose.prod.yml up -d` again.

## Automatic deploys

GitHub → the fork → Settings:

- Actions: enable workflows for the fork.
- Secrets and variables → Actions → Secrets: `DEPLOY_HOST` (server IP), `DEPLOY_USER` (`ubuntu`),
  `DEPLOY_SSH_KEY` (the private half of a key used only by CI; its public half goes in the server's
  `~/.ssh/authorized_keys`).
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
