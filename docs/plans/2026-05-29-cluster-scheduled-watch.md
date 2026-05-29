# Cluster-Portable Scheduled Watch (Phase 4) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre `cohabit watch --due` exécutable sur un schedule de cluster, containerisé, portable Kubernetes (référence) / Docker Compose / crontab-systemd.

**Architecture:** Petits ajustements CLI (registre configurable par env + résolution relative au registre + clone-on-start via un champ `gitUrl`), un `Dockerfile` + `entrypoint.sh`, et un dossier `deploy/` avec une recette par orchestrateur. Le cron fire souvent ; le `cadence` du registre + `--due` font le gating fin. Spec : `docs/specs/2026-05-29-cluster-scheduled-watch-design.md`.

**Tech Stack:** Node ESM `.mjs`, Vitest ^2.1.9, Docker (`node:22-bookworm-slim` + git), Kubernetes CronJob, docker-compose, crontab/systemd.

**Pré-requis :** repo `c:\Users\rdenis\VScode\fork-cohabitation\`, branche `main`, remote `origin` HTTPS. Identité git `roblastar@live.fr` (vérifier avant chaque commit). `npm test` = Vitest. Ne pas casser les 30 tests existants. Stager des chemins explicites. Jamais `--no-verify`/amend/force-push. Commits poussés sur `main` (dépôt solo, pas de flux PR).

---

## File Structure

**Modifiés :** `src/registry.mjs` (+`resolveRepoPath`, `entriesToClone`), `bin/cohabit.mjs` (env `COHABIT_REGISTRY`, `repoPathOf` via `resolveRepoPath`, commande `bootstrap`), `package.json` (script `bootstrap`), `README.md` + `AGENTS.md` (champs registre), `CHANGELOG.md`, `docs/roadmap.md`.

**Créés :** `Dockerfile`, `.dockerignore`, `deploy/entrypoint.sh`, `deploy/kubernetes/{cronjob.yaml,pvc.yaml,configmap-repos.example.yaml}`, `deploy/docker-compose/docker-compose.yml`, `deploy/crontab/{cohabit-watch.sh,crontab.example,cohabit-watch.service,cohabit-watch.timer}`, `deploy/README.md`, `tests/unit/registry-cluster.test.mjs`.

---

## Task 1: `registry.mjs` — `resolveRepoPath` + `entriesToClone` (pur, TDD)

**Files:** Modify `src/registry.mjs`; Create `tests/unit/registry-cluster.test.mjs`.

- [ ] **Step 1: Test (échoue)** — `tests/unit/registry-cluster.test.mjs`:
```js
import { describe, it, expect } from 'vitest';
import { resolveRepoPath, entriesToClone } from '../../src/registry.mjs';
import { resolve } from 'node:path';

describe('resolveRepoPath', () => {
  it('résout entry.path relativement au dossier du registre', () => {
    expect(resolveRepoPath('/work', { path: './gitnexus' })).toBe(resolve('/work', './gitnexus'));
  });
});

describe('entriesToClone', () => {
  it('ne garde que les entrées avec gitUrl, ref défaut main', () => {
    const reg = [
      { name: 'a', path: './a', gitUrl: 'https://x/a.git' },
      { name: 'b', path: '../b' }, // monté, pas de gitUrl
      { name: 'c', path: './c', gitUrl: 'https://x/c.git', ref: 'v1.2.3' },
    ];
    expect(entriesToClone(reg)).toEqual([
      { name: 'a', gitUrl: 'https://x/a.git', ref: 'main' },
      { name: 'c', gitUrl: 'https://x/c.git', ref: 'v1.2.3' },
    ]);
  });
  it('renvoie [] si aucune entrée n’a de gitUrl', () => {
    expect(entriesToClone([{ name: 'b', path: '../b' }])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, FAIL** — `npm test -- registry-cluster`.

- [ ] **Step 3: Implémenter dans `src/registry.mjs`** — ajouter en tête l'import `resolve` puis les deux fonctions :
```js
import { resolve } from 'node:path';
// (garder l'import existant de readFileSync depuis node:fs)

export function resolveRepoPath(registryDir, entry) {
  return resolve(registryDir, entry.path);
}

export function entriesToClone(registry) {
  return registry
    .filter((e) => typeof e.gitUrl === 'string' && e.gitUrl.length > 0)
    .map((e) => ({ name: e.name, gitUrl: e.gitUrl, ref: e.ref || 'main' }));
}
```

- [ ] **Step 4: Run, PASS** — `npm test -- registry-cluster` (3 cas) ; puis `npm test` (les 30 + 3 = 33).

- [ ] **Step 5: Commit**
```bash
git config user.email   # roblastar@live.fr else STOP
git add src/registry.mjs tests/unit/registry-cluster.test.mjs
git commit -m "feat(registry): resolveRepoPath (relative to registry dir) + entriesToClone (gitUrl/ref)"
```

---

## Task 2: `bin/cohabit.mjs` — registre configurable + commande `bootstrap`

**Files:** Modify `bin/cohabit.mjs`, `package.json`.

**Contexte :** aujourd'hui `bin/cohabit.mjs` a `const REGISTRY = resolve(ROOT, 'repos.json')` et `repoPathOf(entry) = resolve(ROOT, entry.path)`. On rend le registre configurable par env et on résout les chemins relativement au registre, puis on ajoute `bootstrap` (clone/maj des entrées `gitUrl`). LIRE le fichier d'abord pour insérer proprement.

- [ ] **Step 1: Modifier les imports + constantes** dans `bin/cohabit.mjs` :
  - S'assurer que ces imports existent (ajouter ce qui manque) : `import { writeFileSync, existsSync } from 'node:fs';`, `import { execFileSync } from 'node:child_process';`, et depuis `../src/registry.mjs` ajouter `resolveRepoPath, entriesToClone` à l'import existant (`loadRegistry, resolveRepo, dueRepos`).
  - Remplacer la constante registre :
    ```js
    const REGISTRY = process.env.COHABIT_REGISTRY
      ? resolve(process.env.COHABIT_REGISTRY)
      : resolve(ROOT, 'repos.json');
    ```
  - Remplacer `repoPathOf` :
    ```js
    function repoPathOf(entry) { return resolveRepoPath(dirname(REGISTRY), entry); }
    ```

- [ ] **Step 2: Ajouter la commande `bootstrap`** (avant `main`) :
```js
function cmdBootstrap() {
  const reg = loadRegistry(REGISTRY);
  const dir = dirname(REGISTRY);
  for (const c of entriesToClone(reg)) {
    const dest = resolve(dir, c.name);
    if (existsSync(dest)) {
      execFileSync('git', ['-C', dest, 'fetch', '--depth', '1', 'origin', c.ref], { stdio: 'inherit' });
      execFileSync('git', ['-C', dest, 'checkout', c.ref], { stdio: 'inherit' });
    } else {
      execFileSync('git', ['clone', '--depth', '1', '--branch', c.ref, c.gitUrl, dest], { stdio: 'inherit' });
    }
    console.log(`bootstrap : ${c.name} @ ${c.ref}`);
  }
}
```

- [ ] **Step 3: Router `bootstrap`** dans `main(argv)` (avant le bloc usage) :
```js
  if (cmd === 'bootstrap') return cmdBootstrap();
```
Et étendre la ligne d'usage : `... | bootstrap`.

- [ ] **Step 4: `package.json`** — ajouter un script `"bootstrap": "node bin/cohabit.mjs bootstrap"` à côté de `watch:due`/`watch:all`.

- [ ] **Step 5: Vérifier** — `npm test` (les 33 tests restent verts ; `selectWatchTargets` inchangé). Vérifier le no-conteneur : `node bin/cohabit.mjs` sans `COHABIT_REGISTRY` doit imprimer l'usage (exit 2) — le comportement par défaut est préservé. Vérifier l'usage inclut `bootstrap`.

- [ ] **Step 6: Commit**
```bash
git config user.email   # roblastar@live.fr else STOP
git add bin/cohabit.mjs package.json
git commit -m "feat(cli): COHABIT_REGISTRY env + registry-relative paths + bootstrap (clone gitUrl entries)"
```

---

## Task 3: `Dockerfile` + `.dockerignore` + `deploy/entrypoint.sh`

**Files:** Create `Dockerfile`, `.dockerignore`, `deploy/entrypoint.sh`.

- [ ] **Step 1: `deploy/entrypoint.sh`**
```sh
#!/bin/sh
# Bootstrap (clone/maj des repos suivis ayant un gitUrl) puis lance le CLI.
set -e
node /app/bin/cohabit.mjs bootstrap
exec node /app/bin/cohabit.mjs "$@"
```

- [ ] **Step 2: `.dockerignore`**
```
node_modules
tests
docs
.git
.github
*.log
```

- [ ] **Step 3: `Dockerfile`**
```dockerfile
FROM node:22-bookworm-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY bin/ ./bin/
COPY src/ ./src/
COPY deploy/entrypoint.sh ./deploy/entrypoint.sh
RUN chmod +x ./deploy/entrypoint.sh
# Registre + repos suivis vivent sur un volume inscriptible monté en /work.
ENV COHABIT_REGISTRY=/work/repos.json
ENTRYPOINT ["/app/deploy/entrypoint.sh"]
CMD ["watch", "--due"]
```

- [ ] **Step 4: Vérifier le build (si Docker dispo)** — `docker build -t fork-cohabitation:dev .`
Expected : build OK. Si Docker absent dans l'environnement, vérifier au minimum que `deploy/entrypoint.sh` est du sh valide (`sh -n deploy/entrypoint.sh`) et NOTER que le `docker build` reste à lancer sur une machine Docker.

- [ ] **Step 5: Commit**
```bash
git config user.email   # roblastar@live.fr else STOP
git add Dockerfile .dockerignore deploy/entrypoint.sh
git commit -m "feat(deploy): containerize cohabit (node:22 + git) with bootstrap entrypoint"
```

---

## Task 4: `deploy/kubernetes/` — CronJob de référence

**Files:** Create `deploy/kubernetes/cronjob.yaml`, `pvc.yaml`, `configmap-repos.example.yaml`.

- [ ] **Step 1: `deploy/kubernetes/pvc.yaml`**
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: cohabit-work
spec:
  accessModes: ["ReadWriteOnce"]
  resources:
    requests:
      storage: 1Gi
```

- [ ] **Step 2: `deploy/kubernetes/configmap-repos.example.yaml`** (bootstrap initial du registre ; copié vers le PVC inscriptible au 1er run — voir README)
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cohabit-repos
data:
  repos.json: |
    [
      {
        "name": "gitnexus",
        "path": "./gitnexus",
        "tier": "normal",
        "cadence": "weekly",
        "lastWatch": null,
        "gitUrl": "https://github.com/RoJLD/gitnexus.git",
        "ref": "deployment"
      }
    ]
```

- [ ] **Step 3: `deploy/kubernetes/cronjob.yaml`**
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cohabit-watch
spec:
  schedule: "0 6 * * *"          # quotidien 06:00 ; le gating fin par repo est fait par --due
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 0
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: cohabit
              image: ghcr.io/rojld/fork-cohabitation:latest
              args: ["watch", "--due"]   # exit 10 si une release plus récente existe (run failed = alerte)
              env:
                - name: COHABIT_REGISTRY
                  value: /work/repos.json
              volumeMounts:
                - name: work
                  mountPath: /work
          volumes:
            - name: work
              persistentVolumeClaim:
                claimName: cohabit-work
```

- [ ] **Step 4: Vérifier la validité YAML** — si `kubectl` dispo : `kubectl apply --dry-run=client -f deploy/kubernetes/` ; sinon valider que chaque fichier parse en YAML (`node -e "require('node:fs').readdirSync('deploy/kubernetes').forEach(f=>console.log(f))"` n'est pas une validation — utiliser un parse YAML si dispo, sinon relecture manuelle). NOTER si la validation kubectl reste à faire.

- [ ] **Step 5: Commit**
```bash
git config user.email   # roblastar@live.fr else STOP
git add deploy/kubernetes/
git commit -m "feat(deploy/k8s): reference CronJob + PVC + repos ConfigMap example"
```

---

## Task 5: `deploy/docker-compose/`

**Files:** Create `deploy/docker-compose/docker-compose.yml`.

- [ ] **Step 1: `deploy/docker-compose/docker-compose.yml`**
```yaml
# Lance cohabit watch --due à la demande / via un cron hôte :
#   docker compose -f deploy/docker-compose/docker-compose.yml run --rm cohabit
# Ou planifié par crontab hôte (voir deploy/crontab/). Le volume nommé `work`
# persiste repos.json + les clones (lastWatch réécrit).
services:
  cohabit:
    build:
      context: ../..
      dockerfile: Dockerfile
    image: fork-cohabitation:dev
    environment:
      COHABIT_REGISTRY: /work/repos.json
    volumes:
      - work:/work
    # commande par défaut = ["watch","--due"] (CMD de l'image)
volumes:
  work:
```

- [ ] **Step 2: Vérifier** — `sh -n` n'est pas pertinent (YAML) ; si `docker compose` dispo : `docker compose -f deploy/docker-compose/docker-compose.yml config` (valide la syntaxe). Sinon relecture + NOTER la validation à faire.

- [ ] **Step 3: Commit**
```bash
git config user.email   # roblastar@live.fr else STOP
git add deploy/docker-compose/
git commit -m "feat(deploy/compose): cohabit service + named work volume"
```

---

## Task 6: `deploy/crontab/` — wrapper + crontab + systemd

**Files:** Create `deploy/crontab/cohabit-watch.sh`, `crontab.example`, `cohabit-watch.service`, `cohabit-watch.timer`.

- [ ] **Step 1: `deploy/crontab/cohabit-watch.sh`**
```sh
#!/bin/sh
# Wrapper de planification : lance cohabit watch --due dans le conteneur.
# Adapter COHABIT_IMAGE et le chemin du volume hôte de travail (WORK_DIR).
set -e
COHABIT_IMAGE="${COHABIT_IMAGE:-ghcr.io/rojld/fork-cohabitation:latest}"
WORK_DIR="${WORK_DIR:-/srv/cohabit/work}"
exec docker run --rm \
  -v "$WORK_DIR:/work" \
  -e COHABIT_REGISTRY=/work/repos.json \
  "$COHABIT_IMAGE" watch --due
```

- [ ] **Step 2: `deploy/crontab/crontab.example`**
```
# cohabit watch --due, tous les jours à 06:00 (le gating par repo est fait par --due)
0 6 * * * /srv/cohabit/cohabit-watch.sh >> /var/log/cohabit-watch.log 2>&1
```

- [ ] **Step 3: `deploy/crontab/cohabit-watch.service`**
```ini
[Unit]
Description=cohabit watch --due (fork-cohabitation release watch)
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
ExecStart=/srv/cohabit/cohabit-watch.sh
```

- [ ] **Step 4: `deploy/crontab/cohabit-watch.timer`**
```ini
[Unit]
Description=Run cohabit watch --due daily

[Timer]
OnCalendar=*-*-* 06:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

- [ ] **Step 5: Vérifier** — `sh -n deploy/crontab/cohabit-watch.sh` (sh valide). Relecture des unités systemd.

- [ ] **Step 6: Commit**
```bash
git config user.email   # roblastar@live.fr else STOP
git add deploy/crontab/
git commit -m "feat(deploy/crontab): docker-run wrapper + crontab example + systemd timer/service"
```

---

## Task 7: `deploy/README.md` + docs (registre, roadmap, changelog)

**Files:** Create `deploy/README.md`; Modify `README.md`, `AGENTS.md`, `CHANGELOG.md`, `docs/roadmap.md`.

- [ ] **Step 1: `deploy/README.md`** — couvrir :
  - Build de l'image : `docker build -t fork-cohabitation:dev .`
  - Le **volume inscriptible** `/work` : contient `repos.json` + les clones/checkouts ; `lastWatch` y est réécrit (donc pas un ConfigMap read-only).
  - Deux modes de peuplement : **`gitUrl`** dans une entrée (clone-on-start par `entrypoint.sh` → `bootstrap`) **ou** repo **monté** (entrée sans `gitUrl`, `path` pointant vers un checkout fourni). Pour une entrée clonée, `path` = `./<name>`.
  - Cadence à deux étages : le cron fire souvent (quotidien recommandé), `--due` filtre par `cadence` du registre.
  - Sémantique de sortie : 0 à jour / **10 = alerte** (release plus récente → run *failed* = signal d'alerte du cluster) / 2 erreur.
  - Auth git pour clones privés : monter un token/clé en secret (montrer une approche, ex. `GIT_ASKPASS` ou `.netrc` monté).
  - Les **trois recettes** : `kubernetes/` (référence), `docker-compose/`, `crontab/` — avec la commande de déploiement de chacune.

- [ ] **Step 2: `README.md` + `AGENTS.md`** — dans la section « Onboarder un repo » du README (table `repos.json`), ajouter les deux champs optionnels : `gitUrl` (URL de clone pour déploiement cluster) et `ref` (branche/tag, défaut `main`). Mentionner `cohabit bootstrap` (clone/maj des entrées `gitUrl`). Ajouter dans `AGENTS.md` la commande `bootstrap` à la liste des commandes.

- [ ] **Step 3: `CHANGELOG.md`** — sous `## [Unreleased]`, ajouter : containerisation (`Dockerfile`) + recettes de déploiement `deploy/` (k8s/compose/crontab) ; champ registre `gitUrl`/`ref` + `cohabit bootstrap` ; `COHABIT_REGISTRY` configurable.

- [ ] **Step 4: `docs/roadmap.md`** — marquer le watch planifié cluster comme livré ; pointer vers `docs/specs/2026-05-29-cluster-scheduled-watch-design.md`.

- [ ] **Step 5: Vérification**
```bash
grep -n "gitUrl" README.md AGENTS.md deploy/README.md   # >=1 chacun
grep -rn "COHABIT_REGISTRY" deploy/README.md             # >=1
```

- [ ] **Step 6: Commit**
```bash
git config user.email   # roblastar@live.fr else STOP
git add deploy/README.md README.md AGENTS.md CHANGELOG.md docs/roadmap.md
git commit -m "docs(deploy): deployment guide (k8s/compose/crontab) + registry gitUrl/ref + roadmap/changelog"
```

- [ ] **Step 7: Push tout**
```bash
git push origin main 2>&1 | tail -5
```
(HTTPS + Git Credential Manager ; si auth échoue/hangs, noter que les commits sont locaux et que le push reste à finaliser — ne pas bloquer.)

---

## Self-Review (auteur du plan)

- **Couverture du spec :** §3.1 Dockerfile → Task 3 ; §3.2 registre `gitUrl`/`ref` + CLI env/résolution → Tasks 1-2 ; §3.3 entrypoint clone-or-mount + volume → Tasks 2-3 ; §3.4 cadence deux étages → documenté Tasks 4/7 ; §3.5 exit-10 → documenté Tasks 4/7 ; §3.6 artefacts deploy/ (k8s/compose/crontab + README) → Tasks 4-7. Hors-scope §4 (build/push image CI, déploiement réel, secrets backend) → pas de tâche, conforme.
- **Placeholders :** aucun ; tout le code/manifeste est complet. Les vérifications « si Docker/kubectl absent » donnent une alternative concrète (`sh -n`, parse YAML, relecture) + une note de suivi — pas un placeholder.
- **Cohérence des signatures :** `resolveRepoPath(registryDir, entry)` et `entriesToClone(registry)→[{name,gitUrl,ref}]` cohérents entre registry.mjs (Task 1), son test, et l'usage dans `bin/cohabit.mjs` (Task 2 : `repoPathOf` via `resolveRepoPath(dirname(REGISTRY), entry)`, `cmdBootstrap` via `entriesToClone`). `COHABIT_REGISTRY` cohérent entre CLI (Task 2), Dockerfile/entrypoint (Task 3), et tous les manifestes deploy (Tasks 4-6). `path: "./<name>"` pour les entrées clonées cohérent entre le ConfigMap exemple (Task 4) et la doc (Task 7).

> **Note :** `git push` final en Task 7 (dépôt solo, `main` = branche de travail, pas de flux PR — cohérent avec le push initial autorisé). Validation `docker build` / `kubectl --dry-run` peut rester à faire si ces outils ne sont pas dans l'environnement d'exécution — à signaler dans le résumé.
