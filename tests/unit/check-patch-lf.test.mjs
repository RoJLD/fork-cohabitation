import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hasCRLF, normalizeLF, findPatchFiles, scanRepo } from '../../scripts/check-patch-lf.mjs';

let workdir;

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), 'check-patch-lf-'));
});

afterEach(() => {
  rmSync(workdir, { recursive: true, force: true });
});

describe('hasCRLF', () => {
  it('detects CRLF in buffer', () => {
    expect(hasCRLF(Buffer.from('a\r\nb\r\nc'))).toBe(true);
  });
  it('returns false on pure LF', () => {
    expect(hasCRLF(Buffer.from('a\nb\nc'))).toBe(false);
  });
  it('returns false on empty buffer', () => {
    expect(hasCRLF(Buffer.from(''))).toBe(false);
  });
  it('returns false on lone CR (no LF after)', () => {
    expect(hasCRLF(Buffer.from('a\rb'))).toBe(false);
  });
});

describe('normalizeLF', () => {
  it('strips CR before LF', () => {
    expect(normalizeLF(Buffer.from('a\r\nb\r\n')).toString()).toBe('a\nb\n');
  });
  it('strips all CR (defensive — even lone)', () => {
    expect(normalizeLF(Buffer.from('a\rb\r')).toString()).toBe('ab');
  });
  it('idempotent on LF-only input', () => {
    expect(normalizeLF(Buffer.from('a\nb\n')).toString()).toBe('a\nb\n');
  });
});

describe('findPatchFiles', () => {
  it('finds .diff and .patch files', () => {
    const dir = join(workdir, 'patches');
    mkdirSync(dir);
    writeFileSync(join(dir, 'a.diff'), '');
    writeFileSync(join(dir, 'b.patch'), '');
    writeFileSync(join(dir, 'c.txt'), '');
    expect(findPatchFiles(dir).sort()).toEqual([join(dir, 'a.diff'), join(dir, 'b.patch')]);
  });
  it('returns empty when no patches dir', () => {
    expect(findPatchFiles(join(workdir, 'nope'))).toEqual([]);
  });
});

describe('scanRepo', () => {
  it('reports CRLF offending in check-only mode', () => {
    const patches = join(workdir, 'patches');
    mkdirSync(patches);
    writeFileSync(join(patches, 'bad.diff'), 'a\r\nb\r\n');
    writeFileSync(join(patches, 'good.diff'), 'a\nb\n');
    const r = scanRepo(workdir);
    expect(r.offending).toEqual(['patches/bad.diff'.replace(/\//g, require('node:path').sep)] );
    expect(r.clean.length).toBe(1);
    expect(r.fixed).toEqual([]);
  });

  it('normalizes CRLF -> LF with --fix', () => {
    const patches = join(workdir, 'patches');
    mkdirSync(patches);
    const badPath = join(patches, 'bad.diff');
    writeFileSync(badPath, 'a\r\nb\r\n');
    const r = scanRepo(workdir, { fix: true });
    expect(r.fixed.length).toBe(1);
    expect(readFileSync(badPath, 'utf8')).toBe('a\nb\n');
  });

  it('flags found=false when no patches dir', () => {
    const r = scanRepo(workdir);
    expect(r.found).toBe(false);
  });

  it('idempotent on already-LF repo', () => {
    const patches = join(workdir, 'patches');
    mkdirSync(patches);
    writeFileSync(join(patches, 'good.diff'), 'a\nb\n');
    const r1 = scanRepo(workdir);
    expect(r1.offending).toEqual([]);
    const r2 = scanRepo(workdir, { fix: true });
    expect(r2.fixed).toEqual([]);
  });
});
