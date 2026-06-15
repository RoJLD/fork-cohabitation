#!/usr/bin/env node
/**
 * check-patch-lf.mjs — Sentinel Σ-PATCH-DIFF-LF-CANONICAL
 *
 * Doctrine : tout `patches/*.diff` doit être en LF.
 * CRLF fait FAIL global `git apply --3way` (faux-fail "0/N hunks"),
 * sur-estimant le conflict count de ~40 % (empirique workflow w8uk22bo7 R2,
 * bump GitNexus v1.6.5 → v1.6.7).
 *
 * Usage:
 *   node scripts/check-patch-lf.mjs <target_repo>           # check-only, exit 1 si CRLF
 *   node scripts/check-patch-lf.mjs --fix <target_repo>     # auto-normalize CRLF → LF in-place
 *   node scripts/check-patch-lf.mjs                         # défaut: scanne `../GitNexus`
 *
 * Cross-link Iron Rule: .agent/rules/active/factory_patch_diff_lf_canonical.mdc
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_TARGET = '../GitNexus';
const PATCH_EXTENSIONS = ['.diff', '.patch'];

export function findPatchFiles(patchesDir) {
  if (!existsSync(patchesDir) || !statSync(patchesDir).isDirectory()) return [];
  return readdirSync(patchesDir)
    .filter((name) => PATCH_EXTENSIONS.some((ext) => name.endsWith(ext)))
    .map((name) => join(patchesDir, name));
}

export function hasCRLF(buffer) {
  // Détecte CR (0x0D) suivi de LF (0x0A) — pattern CRLF Windows.
  for (let i = 0; i < buffer.length - 1; i++) {
    if (buffer[i] === 0x0d && buffer[i + 1] === 0x0a) return true;
  }
  return false;
}

export function normalizeLF(buffer) {
  // Strip tous les CR (0x0D) — sortie LF pure.
  const out = Buffer.alloc(buffer.length);
  let j = 0;
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] !== 0x0d) out[j++] = buffer[i];
  }
  return out.subarray(0, j);
}

export function scanRepo(targetRepo, { fix = false } = {}) {
  const patchesDir = resolve(targetRepo, 'patches');
  const offending = [];
  const fixed = [];
  const clean = [];

  const files = findPatchFiles(patchesDir);
  if (files.length === 0) {
    return { offending, fixed, clean, patchesDir, found: false };
  }

  for (const file of files) {
    const buf = readFileSync(file);
    if (hasCRLF(buf)) {
      if (fix) {
        const normalized = normalizeLF(buf);
        writeFileSync(file, normalized);
        fixed.push(relative(targetRepo, file));
      } else {
        offending.push(relative(targetRepo, file));
      }
    } else {
      clean.push(relative(targetRepo, file));
    }
  }

  return { offending, fixed, clean, patchesDir, found: true };
}

function printReport(result, { fix }) {
  const { offending, fixed, clean, patchesDir, found } = result;
  if (!found) {
    console.error(`[check-patch-lf] no patches/ directory at ${patchesDir}`);
    return 0;
  }
  console.log(`[check-patch-lf] scan ${patchesDir}`);
  for (const f of clean) console.log(`  CLEAN  ${f}`);
  if (fix) {
    for (const f of fixed) console.log(`  FIXED  ${f} (CRLF -> LF)`);
    return 0;
  }
  for (const f of offending) console.error(`  CRLF   ${f}  <-- violation Sigma-PATCH-DIFF-LF-CANONICAL`);
  if (offending.length > 0) {
    console.error(`\n[check-patch-lf] FAIL: ${offending.length} patch(es) in CRLF. Re-run with --fix to normalize.`);
    return 1;
  }
  console.log(`[check-patch-lf] OK: ${clean.length} patch(es) all LF.`);
  return 0;
}

function parseArgs(argv) {
  const args = { fix: false, target: DEFAULT_TARGET };
  for (const a of argv) {
    if (a === '--fix') args.fix = true;
    else if (!a.startsWith('--')) args.target = a;
  }
  return args;
}

// CLI entrypoint only when invoked directly (not when imported in tests).
const isMain = (() => {
  try {
    return fileURLToPath(import.meta.url) === resolve(process.argv[1] || '');
  } catch {
    return false;
  }
})();

if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  const target = resolve(process.cwd(), args.target);
  const result = scanRepo(target, { fix: args.fix });
  const code = printReport(result, { fix: args.fix });
  process.exit(code);
}
