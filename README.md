# fork-cohabitation

Outillage générique pour faire cohabiter un fork avec son upstream : dry-run de bump,
garde de dérive de patches, et veille de releases — piloté par une config par-repo
et un registre multi-repo. Extrait du mécanisme de cohabitation de gitnexus (voir
`../gitnexus/docs/superpowers/specs/2026-05-29-*`).

---

## Usage

### `cohabit drift <repo>`

Vérifie que les diffs commités (`additive-files.diff` / `inplace-edits.diff`) sont
synchrones avec le clone upstream local déclaré dans la config du repo.

```bash
cohabit drift gitnexus
```

Codes de sortie :
- `0` — propre, aucune dérive
- `1` — dérive détectée (les diffs commités ne reflètent plus le clone)

### `cohabit bump <repo> <tag>`

Lance un dry-run de bump vers un tag upstream cible. Clone l'upstream dans un
répertoire jetable, applique `additive-files.diff` (doit être propre), tente
`inplace-edits.diff` avec `--3way`, et écrit un rapport par fichier
(`clean` / `conflict` / `fail`). Ne touche pas le clone de travail.

```bash
cohabit bump gitnexus v1.7.0
```

Le rapport est écrit dans le répertoire de patches du repo (ex.
`patches/bump-dry-run-v1.7.0.md`). C'est la porte go/no-go avant tout bump réel.

### `cohabit watch <repo>|--all|--due`

Vérifie si une release stable plus récente que le pin actuel existe en upstream.

```bash
cohabit watch gitnexus       # vérifie un repo précis
cohabit watch --all          # vérifie tous les repos enregistrés
cohabit watch --due          # vérifie uniquement les repos dont la cadence est échue
```

Codes de sortie :
- `0` — à jour, aucune release plus récente
- `10` — alerte : une release stable `vX.Y.Z` plus récente existe
- `2` — erreur (config manquante, réseau, etc.)

---

## Onboarder un repo

### 1. Ajouter `cohabitation.config.json` dans le repo

Ce fichier déclare les chemins et paramètres propres à ce fork.

Champs requis :

| Champ | Description |
|---|---|
| `upstreamUrl` | URL git de l'upstream (ex. `https://github.com/org/repo.git`) |
| `cloneDir` | Chemin relatif (depuis la racine du repo) du clone upstream local |
| `additiveDiff` | Chemin relatif du diff pour les fichiers neufs (ex. `patches/additive-files.diff`) |
| `inplaceDiff` | Chemin relatif du diff pour les édits in-place (ex. `patches/inplace-edits.diff`) |
| `pinFile` | Fichier contenant le pin de version actuel (ex. `Dockerfile.cli`) |
| `pinPattern` | Regex pour extraire le tag/version depuis `pinFile` (ex. `"v(\\d+\\.\\d+\\.\\d+)"`) |

Exemple minimal :

```json
{
  "upstreamUrl": "https://github.com/abhigyanpatwari/gitnexus.git",
  "cloneDir": "upstream",
  "additiveDiff": "patches/additive-files.diff",
  "inplaceDiff": "patches/inplace-edits.diff",
  "pinFile": "Dockerfile.cli",
  "pinPattern": "v(\\d+\\.\\d+\\.\\d+)"
}
```

### 2. Ajouter une entrée dans `repos.json`

Le registre multi-repo central de `fork-cohabitation`.

Champs requis :

| Champ | Description |
|---|---|
| `name` | Identifiant court du repo (utilisé par les commandes `cohabit`) |
| `path` | Chemin absolu vers la racine du repo sur le disque |
| `tier` | Priorité de surveillance (`1` = critique, `2` = standard, `3` = best-effort) |
| `cadence` | Fréquence de vérification recommandée pour `cohabit watch --due` (ex. `"weekly"`, `"monthly"`) |

Exemple minimal :

```json
[
  {
    "name": "gitnexus",
    "path": "C:/Users/rdenis/VScode/gitnexus",
    "tier": 1,
    "cadence": "weekly"
  }
]
```

---

## Contrat de cohabitation

### Règle de bump conservative

On ne bumpe que vers des releases stables `vX.Y.Z`. On ne suit jamais `main` ni
aucune branche de développement. Avant tout bump réel :

1. Lancer `cohabit bump <repo> <tag>` en dry-run et vérifier le rapport (objectif :
   0 conflit, quelques `fail` acceptables si les fichiers en cause sont gérables
   manuellement).
2. Le dry-run est la porte go/no-go : un bump ne commence que si le rapport est
   satisfaisant.

### Gardes de surveillance

Deux gardes complémentaires couvrent le contrat :

- **Dérive interne** (`cohabit drift`) — détecte quand les diffs commités
  (`additive-files.diff` / `inplace-edits.diff`) ne correspondent plus au clone
  upstream local. A lancer avant tout commit touchant le répertoire upstream.
- **Veille de releases** (`cohabit watch`) — détecte quand une release stable
  upstream plus récente que le pin actuel existe. A lancer périodiquement (ou
  laisser le cron/CI s'en charger).

### Références

- Contrat de cohabitation d'origine (gitnexus) :
  `../gitnexus/docs/superpowers/specs/2026-05-29-upstream-cohabitation-contract-design.md`
- Spec d'extraction vers cet outil générique (Phase 3) :
  `../gitnexus/docs/superpowers/specs/2026-05-29-fork-cohabitation-extraction-design.md`
