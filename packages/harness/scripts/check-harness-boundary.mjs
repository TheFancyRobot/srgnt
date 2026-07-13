#!/usr/bin/env node
/**
 * Package-boundary check for @srgnt/harness (ARCH-0009 invariant):
 * this package is pure Node — it must never import Electron or reach into
 * @srgnt/runtime / @srgnt/desktop. Fails `pnpm lint` on any violation, in
 * source imports or in package.json dependencies.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const FORBIDDEN = ['electron', '@srgnt/runtime', '@srgnt/desktop'];

const isForbidden = (specifier) =>
  FORBIDDEN.some((name) => specifier === name || specifier.startsWith(`${name}/`));

// import ... from '...', export ... from '...', import('...'), require('...')
const IMPORT_PATTERNS = [
  /\bimport\s+(?:[\s\S]*?\bfrom\s+)?['"]([^'"]+)['"]/g,
  /\bexport\s+[\s\S]*?\bfrom\s+['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(path);
    } else if (/\.(ts|mts|cts|js|mjs|cjs)$/.test(entry.name)) {
      yield path;
    }
  }
}

const violations = new Set();

for (const file of walk(join(packageRoot, 'src'))) {
  const source = readFileSync(file, 'utf8');
  for (const pattern of IMPORT_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      if (isForbidden(specifier)) {
        violations.add(`${relative(packageRoot, file)}: forbidden import '${specifier}'`);
      }
    }
  }
}

const pkg = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
  for (const dep of Object.keys(pkg[field] ?? {})) {
    if (isForbidden(dep)) {
      violations.add(`package.json ${field}: forbidden dependency '${dep}'`);
    }
  }
}

if (violations.size > 0) {
  console.error('@srgnt/harness boundary check FAILED (pure Node — no Electron, no runtime/desktop):');
  for (const violation of violations) {
    console.error(`  - ${violation}`);
  }
  process.exit(1);
}

console.log('@srgnt/harness boundary check passed.');
