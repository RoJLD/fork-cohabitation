import { dueRepos } from './registry.mjs';

// PURE : choisit les repos cibles selon les options de la commande watch.
// Sépare la logique de sélection de l'I/O (registre, horloge) pour la rendre
// testable en isolation sans toucher au disque ni au CLI.
//
// opts :
//   - { all: true }           → renvoie le registre entier
//   - { due: true }           → renvoie les entrées dont la cadence est échue (cf. registry.isDue)
//   - { name: '<repo>' }      → renvoie l'entrée nommée (filtre exact)
//   - {}                      → renvoie [] (no-op explicite, le caller doit afficher l'usage)
export function selectWatchTargets(registry, opts, nowMs) {
  if (opts.all) return registry;
  if (opts.due) return dueRepos(registry, nowMs);
  if (opts.name) return registry.filter((e) => e.name === opts.name);
  return [];
}
