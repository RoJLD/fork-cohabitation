import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CADENCE_DAYS = { daily: 1, weekly: 7, monthly: 30 };

export function cadenceDays(cadence) {
  return Object.prototype.hasOwnProperty.call(CADENCE_DAYS, cadence) ? CADENCE_DAYS[cadence] : null;
}

export function isDue(entry, nowMs) {
  if (!entry.lastWatch) return true;
  const days = cadenceDays(entry.cadence);
  if (days === null) return true; // cadence inconnue → toujours dû (conservateur)
  const last = Date.parse(entry.lastWatch);
  if (Number.isNaN(last)) return true;
  return nowMs - last >= days * 86400000;
}

export function dueRepos(registry, nowMs) {
  return registry.filter((e) => isDue(e, nowMs));
}

export function resolveRepo(registry, name) {
  const e = registry.find((r) => r.name === name);
  if (!e) throw new Error(`repo « ${name} » absent du registre`);
  return e;
}

export function loadRegistry(registryPath) {
  return JSON.parse(readFileSync(registryPath, 'utf8'));
}

export function resolveRepoPath(registryDir, entry) {
  return resolve(registryDir, entry.path);
}

export function entriesToClone(registry) {
  return registry
    .filter((e) => typeof e.gitUrl === 'string' && e.gitUrl.length > 0)
    .map((e) => ({ name: e.name, gitUrl: e.gitUrl, ref: e.ref || 'main' }));
}
