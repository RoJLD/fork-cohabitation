# Watch planifié portable-cluster (Phase 4)

> Spec de design — 2026-05-29. Rend `fork-cohabitation` déployable pour exécuter
> `cohabit watch --due` sur un schedule de cluster, portable Kubernetes (référence)
> / Docker Compose / crontab-systemd. Origine : item différé du contrat de
> cohabitation (gitnexus `docs/superpowers/specs/2026-05-29-upstream-cohabitation-contract-design.md` §3.4, B-ii/iii).

## 1. Contexte / problème

`fork-cohabitation` expose un CLI `cohabit` (drift / bump / watch) piloté par un
registre `repos.json` + une config par repo. La veille release (`cohabit watch
--due`) doit tourner **planifiée**, et la cible de déploiement est un **cluster**
(la mienne : Kubernetes). Il faut supporter plusieurs orchestrateurs selon les
utilisateurs (k8s, Docker Compose, crontab/systemd).

Deux faits cadrent le design :
- Le CLI n'est pas containerisé, et `watch` a besoin de `git` (fait `git ls-remote`).
- **Arête de généralisation** : `repos.json` ne contient qu'un `path` **local**
  (`../gitnexus`), inadapté à un conteneur de cluster où les repos suivis ne sont
  pas sur le disque. De plus `watch` **réécrit `lastWatch`** → le registre doit
  vivre sur un stockage **inscriptible et persistant**, pas un ConfigMap read-only.

## 2. Goal

Un dossier `deploy/` + les ajustements CLI minimaux pour que `cohabit watch --due`
s'exécute sur un schedule, dans un conteneur, sur les trois familles
d'orchestrateurs, avec Kubernetes comme référence. Le conteneur peut soit **cloner**
les repos suivis (registre enrichi d'un `gitUrl`), soit lire des checkouts **montés**.

## 3. Design

### 3.1 Containeriser le CLI
`Dockerfile` : base `node:22-bookworm-slim`, `apt-get install -y --no-install-recommends git ca-certificates`, `npm ci --omit=dev`, copie `src/ bin/ package*.json`, entrypoint `deploy/entrypoint.sh`. `.dockerignore` exclut `node_modules`, `tests`, `docs`, `.git`. Image utilisable en one-shot (`cohabit watch --due`).

### 3.2 Registre enrichi + CLI configurable (code)
- **Registre** : entrée `repos.json` gagne deux champs optionnels :
  `gitUrl` (clone HTTPS/SSH) et `ref` (branche/tag, défaut `"main"`). Les entrées
  sans `gitUrl` restent en mode « monté » (lecture du `path`). `registry.mjs`
  valide : `gitUrl` absent OU chaîne non vide ; `ref` chaîne si présent.
- **CLI** (`bin/cohabit.mjs`) : le chemin du registre devient **configurable par
  env** `COHABIT_REGISTRY` (défaut : `repos.json` à la racine app, comportement
  actuel inchangé). Et `repoPathOf` résout désormais `entry.path` **relativement au
  dossier contenant `repos.json`** (et non plus à la racine app) — robuste pour un
  registre monté dans `/work`. Fonction pure `resolveRepoPath(registryDir, entry)`
  testée.

### 3.3 Entrypoint : clone-or-mount + volume inscriptible
`deploy/entrypoint.sh` (POSIX sh) :
1. `COHABIT_HOME` (défaut `/work`) = volume inscriptible monté contenant `repos.json`.
2. Pour chaque entrée du registre ayant un `gitUrl` : si `<COHABIT_HOME>/<name>`
   existe → `git -C … fetch --depth 1 origin <ref> && git checkout`/reset ; sinon
   `git clone --depth 1 --branch <ref> <gitUrl> <COHABIT_HOME>/<name>`. Les entrées
   sans `gitUrl` sont supposées déjà présentes (montées).
3. `exec node /app/bin/cohabit.mjs "$@"` avec `COHABIT_REGISTRY=$COHABIT_HOME/repos.json`.
La logique « quelles entrées cloner » est une fonction pure `entriesToClone(registry)`
testée ; le shell n'orchestre que les appels git.

### 3.4 Cadence à deux étages
Le cron du cluster fire **fréquemment** (recommandé : quotidien) ; le gating fin par
repo est assuré par le `cadence` du registre + `--due` (déjà implémenté). Le schedule
cron n'encode donc pas la cadence par repo — il fire « assez souvent » et `--due`
filtre. Documenté dans `deploy/README.md`.

### 3.5 Exit 10 = signal d'alerte
`watch` sort 10 si une release plus récente existe. En CronJob, exit≠0 → run *failed*
→ visible/alertable par le monitoring du cluster. On garde ce comportement comme
mécanisme d'alerte « gratuit » ; `deploy/README.md` explique comment le traiter
(ne pas paginer, ou au contraire alerter dessus).

### 3.6 Artefacts `deploy/`
- `deploy/kubernetes/` — **référence** : `cronjob.yaml` (CronJob `schedule: "0 6 * * *"`,
  image, `args: ["watch","--due"]`, `COHABIT_HOME`), `pvc.yaml` (volume inscriptible
  pour `repos.json` + clones), `configmap-repos.example.yaml` (exemple de `repos.json`
  via ConfigMap pour le bootstrap initial, copié vers le PVC inscriptible au 1ᵉʳ run).
- `deploy/docker-compose/` — `docker-compose.yml` (service `cohabit` + un sidecar cron,
  pattern cohérent avec la stack gitnexus) + volume nommé pour `/work`.
- `deploy/crontab/` — `cohabit-watch.sh` (wrapper `docker run`/`node`), une ligne
  crontab d'exemple, et `cohabit-watch.service` + `cohabit-watch.timer` systemd.
- `deploy/README.md` — les 3 familles, l'exigence de volume inscriptible, le mode
  clone (`gitUrl`) vs monté, les besoins réseau + auth git (token/clé en secret),
  la cadence à deux étages, et la sémantique exit-10. Kubernetes = référence.

### Alternatives considérées
- **`gitUrl` clone seul** ou **volume monté seul** — écartés : l'utilisateur veut les
  deux (flexibilité selon les déploiements).
- **ConfigMap read-only pour le registre** — écarté : `lastWatch` est réécrit, il faut
  de l'inscriptible (PVC/volume).
- **Encoder la cadence dans le cron** — écarté : doublonne le `cadence` du registre ;
  le modèle « cron fréquent + `--due` » est plus simple et déjà supporté.

## 4. Scope boundaries

**Dans le périmètre :** Dockerfile + `.dockerignore` ; extension registre `gitUrl`/`ref`
+ ajustements CLI (`COHABIT_REGISTRY`, résolution relative au registre) ; `entrypoint.sh`
+ `entriesToClone` ; les artefacts `deploy/` des 3 familles + `deploy/README.md` ;
tests des nouvelles fonctions pures.

**Hors périmètre :** déploiement réel sur un cluster (l'opérateur) ; backend de
métriques/alerting ; gestion de secrets au-delà de la doc ; un registre central
hébergé / UI multi-repo ; CI qui build+push l'image (peut suivre).

## 5. Open questions

- **Build & publication de l'image** : qui build/push (`docker build` manuel vs un job
  CI) et vers quel registry. Différé — la CI de build d'image peut suivre.
- **Auth git pour clone privé** : la doc montrera token via secret monté ; la forme
  exacte (k8s Secret → env `GIT_ASKPASS` vs `.netrc`) à figer à l'usage.
- **Bootstrap du PVC** : copier `repos.json` du ConfigMap vers le PVC au 1ᵉʳ run
  (initContainer) vs pré-remplir — recette documentée, pas d'automatisation imposée.

## Vérification

- `docker build` réussit ; `docker run … cohabit watch --due` s'exécute (avec un
  `/work` monté contenant un `repos.json` de test).
- `resolveRepoPath` + `entriesToClone` couverts en unit tests.
- CLI inchangé hors conteneur : `COHABIT_REGISTRY` absent → comportement actuel
  (les 30 tests existants restent verts).
- Manifestes k8s valides (`kubectl --dry-run=client` ou un linter YAML).
