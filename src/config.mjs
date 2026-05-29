import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REQUIRED = ['upstreamUrl', 'additiveDiff', 'inplaceDiff', 'pinFile', 'pinPattern'];

export function validateConfig(obj) {
  const errors = [];
  for (const k of REQUIRED) {
    if (typeof obj[k] !== 'string' || obj[k].length === 0) errors.push(`champ requis manquant ou vide : ${k}`);
  }
  if (typeof obj.pinPattern === 'string') {
    try { new RegExp(obj.pinPattern); } catch { errors.push(`pinPattern n'est pas une regex valide : ${obj.pinPattern}`); }
  }
  return errors;
}

export function normalizeConfig(obj) {
  return { cloneDir: 'upstream', ...obj };
}

export function loadConfig(repoPath) {
  const p = resolve(repoPath, 'cohabitation.config.json');
  const raw = JSON.parse(readFileSync(p, 'utf8'));
  const errors = validateConfig(raw);
  if (errors.length) throw new Error(`config invalide (${p}) :\n  ${errors.join('\n  ')}`);
  return normalizeConfig(raw);
}
