#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadConfig } from '../src/config.mjs';
import { loadRegistry, resolveRepo, dueRepos } from '../src/registry.mjs';
import { runDrift } from '../src/drift.mjs';
import { runReleaseWatch } from '../src/release-watch.mjs';
import { runBump, formatBumpReport } from '../src/bump.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = resolve(ROOT, 'repos.json');

// PURE : choisit les repos cibles selon les options.
export function selectWatchTargets(registry, opts, nowMs) {
  if (opts.all) return registry;
  if (opts.due) return dueRepos(registry, nowMs);
  if (opts.name) return registry.filter((e) => e.name === opts.name);
  return [];
}

function repoPathOf(entry) { return resolve(ROOT, entry.path); }

function cmdDrift(name) {
  const entry = resolveRepo(loadRegistry(REGISTRY), name);
  const { drifted, reports } = runDrift(repoPathOf(entry), loadConfig(repoPathOf(entry)));
  for (const r of reports) {
    if (r.missing.length || r.extra.length || r.contentDrift) {
      console.error(`DÉRIVE — ${r.diff}:`);
      r.missing.forEach((f) => console.error(`  + ${f}`));
      r.extra.forEach((f) => console.error(`  - ${f}`));
      if (!r.missing.length && !r.extra.length && r.contentDrift) console.error('  (contenu divergent)');
    } else { console.log(`${r.diff}: OK`); }
  }
  process.exit(drifted ? 1 : 0);
}

function cmdBump(name, target) {
  const entry = resolveRepo(loadRegistry(REGISTRY), name);
  const { results } = runBump(repoPathOf(entry), loadConfig(repoPathOf(entry)), target);
  console.log(formatBumpReport(target, results));
}

function cmdWatch(opts) {
  const reg = loadRegistry(REGISTRY);
  const targets = selectWatchTargets(reg, opts, Date.now());
  let alert = false;
  for (const entry of targets) {
    try {
      const r = runReleaseWatch(repoPathOf(entry), loadConfig(repoPathOf(entry)));
      if (r.upToDate) console.log(`${entry.name} : à jour (${r.latest}).`);
      else { alert = true; console.log(`${entry.name} : ALERTE pin ${r.pinned} → ${r.latest} (nouveaux : ${r.newer.join(', ')}).`); }
      entry.lastWatch = new Date().toISOString();
    } catch (e) { console.error(`${entry.name} : erreur — ${e.message}`); }
  }
  writeFileSync(REGISTRY, JSON.stringify(reg, null, 2) + '\n');
  process.exit(alert ? 10 : 0);
}

function main(argv) {
  const [cmd, a, b] = argv;
  if (cmd === 'drift' && a) return cmdDrift(a);
  if (cmd === 'bump' && a && b) return cmdBump(a, b);
  if (cmd === 'watch') {
    if (a === '--all') return cmdWatch({ all: true });
    if (a === '--due') return cmdWatch({ due: true });
    if (a) return cmdWatch({ name: a });
  }
  console.error('usage: cohabit drift <repo> | bump <repo> <tag> | watch <repo>|--all|--due');
  process.exit(2);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
