# deploy/ — Cluster Deployment Guide

This directory contains deployment recipes for running `cohabit watch --due`
on a schedule in a containerized environment.

---

## Building the image

```bash
docker build -t fork-cohabitation:dev .
```

The image is based on `node:22-bookworm-slim` with `git` and `ca-certificates`
installed. The entrypoint runs `cohabit bootstrap` on start, then delegates to
the CLI.

Published image reference: `ghcr.io/rojld/fork-cohabitation:latest`

---

## The writable `/work` volume

`COHABIT_REGISTRY` is set to `/work/repos.json` inside the container. The
`/work` directory must be a **writable persistent volume** — it stores:

- `repos.json` — the registry (read on every run, `lastWatch` written back
  after a successful watch)
- The repo checkouts managed by `cohabit bootstrap` (cloned relative to the
  registry via `path: "./<name>"`)

**Do not use a read-only ConfigMap** for `/work/repos.json` directly. Copy the
ConfigMap content to the writable PVC once (e.g. an init container or a one-off
`kubectl cp`), then let `cohabit` rewrite it from there.

---

## Registry entry modes

Two ways to populate `/work` with repositories:

### 1. `gitUrl` — clone-on-start (recommended for cluster)

Add `gitUrl` (and optionally `ref`) to the registry entry. The entrypoint runs
`cohabit bootstrap` which clones or updates each entry with a `gitUrl`.

```json
{
  "name": "gitnexus",
  "path": "./gitnexus",
  "tier": "normal",
  "cadence": "weekly",
  "lastWatch": null,
  "gitUrl": "https://github.com/RoJLD/gitnexus.git",
  "ref": "deployment"
}
```

`path` should be `"./<name>"` for cloned entries (relative to the registry dir).

### 2. Mounted checkout — no `gitUrl`

Omit `gitUrl` and mount a pre-existing repo checkout under `/work`. Set `path`
to the corresponding relative path (e.g. `"./gitnexus"`). The entry is watched
for releases but not cloned by the entrypoint.

---

## Two-level cadence gating

The cron fires frequently (daily recommended). Fine-grained gating is done by
the registry's `cadence` field + `--due`:

- `"daily"` — watched every cron run
- `"weekly"` — watched once per week (last watch > 7 days ago)
- `"monthly"` — watched once per month (last watch > 30 days ago)

Repos whose cadence hasn't elapsed are silently skipped by `watch --due`.

---

## Exit code semantics

| Code | Meaning |
|------|---------|
| `0`  | All watched repos are up-to-date |
| `10` | Alert: at least one repo has a newer stable release upstream |
| `2`  | Error (missing config, network failure, etc.) |

Exit 10 causes a CronJob run to appear as **failed** in Kubernetes — this is
intentional. A failed CronJob run is the alert signal. Check
`kubectl describe cronjob cohabit-watch` and the pod logs to see which repo
triggered the alert.

---

## Auth for private git clones

For `gitUrl` entries pointing to private repos, inject credentials at runtime.
Two common approaches:

### `.netrc` file (simplest)

Mount a secret containing a `.netrc` file into the container's home directory:

```yaml
volumeMounts:
  - name: netrc
    mountPath: /root/.netrc
    subPath: .netrc
    readOnly: true
```

### `GIT_ASKPASS` script

Set a `GIT_ASKPASS` environment variable pointing to a script that echoes the
token. Inject the token via a Kubernetes Secret as an env var.

---

## Deployment recipes

### Kubernetes (reference)

```bash
# 1. Create the PVC
kubectl apply -f deploy/kubernetes/pvc.yaml

# 2. Seed repos.json on the PVC (one-off, adapt to your cluster)
#    e.g. use an init pod that mounts the PVC and writes the file.
#    See deploy/kubernetes/configmap-repos.example.yaml as a starting point.

# 3. Deploy the CronJob
kubectl apply -f deploy/kubernetes/cronjob.yaml
```

The CronJob fires daily at 06:00 (UTC). Adjust `schedule` in `cronjob.yaml`
as needed. `concurrencyPolicy: Forbid` prevents overlapping runs.

### Docker Compose

```bash
# One-off run (e.g. triggered by a host cron):
docker compose -f deploy/docker-compose/docker-compose.yml run --rm cohabit
```

The `work` named volume persists `repos.json` and clones between runs.
Seed `repos.json` into the volume before the first run:

```bash
docker compose -f deploy/docker-compose/docker-compose.yml run --rm \
  -v "$(pwd)/repos.json:/seed/repos.json:ro" \
  --entrypoint sh cohabit -c "cp /seed/repos.json /work/repos.json"
```

### crontab / systemd

Copy `deploy/crontab/cohabit-watch.sh` to `/srv/cohabit/cohabit-watch.sh`,
adapt `COHABIT_IMAGE` and `WORK_DIR`, then:

**crontab:**
```bash
crontab -e   # paste the line from deploy/crontab/crontab.example
```

**systemd timer:**
```bash
sudo cp deploy/crontab/cohabit-watch.service /etc/systemd/system/
sudo cp deploy/crontab/cohabit-watch.timer   /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now cohabit-watch.timer
```
