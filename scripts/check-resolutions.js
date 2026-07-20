/*
 * Copyright (c) 2018-2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */
//
// Analyzes package.json resolutions against yarn.lock.
// For each resolution, shows:
//   - resolved version(s) in the lock
//   - all ranges that request the package (from headers + dependency blocks)
//   - any "older" ranges that the resolution is currently overriding
//
// Usage: node scripts/check-resolutions.js
//   or:  yarn resolutions:check

'use strict';

const fs = require('fs');
const path = require('path');
const semver = require('semver');

const ROOT = path.resolve(__dirname, '..');
const lockPath = path.join(ROOT, 'yarn.lock');
const pkgPath = path.join(ROOT, 'package.json');

const lockContent = fs.readFileSync(lockPath, 'utf8');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const resolutions = pkg.resolutions || {};

// ---------------------------------------------------------------------------
// Parse yarn.lock
// Collect, per package name:
//   allRanges  : every range string that appears (header identifiers + dep blocks)
//   resolvedVersions : every resolved version string
// ---------------------------------------------------------------------------
const allRanges = {};     // pkgName -> Set<rangeString>
const resolvedVersions = {}; // pkgName -> Set<versionString>

function addRange(name, range) {
  if (!allRanges[name]) allRanges[name] = new Set();
  allRanges[name].add(range.replace(/^npm:/, ''));
}
function addVersion(name, version) {
  if (!resolvedVersions[name]) resolvedVersions[name] = new Set();
  resolvedVersions[name].add(version);
}

const lines = lockContent.split('\n');
let currentPkgNames = [];
let inDepsBlock = false;
let depsIndentLevel = 0;

for (const line of lines) {
  if (line.startsWith('#') || line.trim() === '') {
    inDepsBlock = false;
    continue;
  }

  if (!line.startsWith(' ') && !line.startsWith('\t')) {
    // Header line: `"pkg@r1, pkg@r2":` or `pkg@range:`
    inDepsBlock = false;
    currentPkgNames = [];
    const header = line.replace(/:$/, '').trim().replace(/^"|"$/g, '');
    for (const id of header.split(/, /)) {
      const at = id.trim().lastIndexOf('@');
      if (at <= 0) continue;
      const name = id.trim().substring(0, at);
      const range = id.trim().substring(at + 1);
      currentPkgNames.push(name);
      addRange(name, range);
    }
    continue;
  }

  const trimmed = line.trimStart();
  const indent = line.length - trimmed.length;

  // Detect version line
  const vMatch = trimmed.match(/^version:\s+"?([^"\s]+)"?/);
  if (vMatch) {
    for (const n of currentPkgNames) addVersion(n, vMatch[1]);
    continue;
  }

  // Detect dependencies block
  if (trimmed.match(/^(dependencies|peerDependencies):/)) {
    inDepsBlock = true;
    depsIndentLevel = indent;
    continue;
  }

  if (inDepsBlock) {
    if (indent <= depsIndentLevel) {
      inDepsBlock = false;
      // Fall through to process this line if it's another block header
    } else {
      // Dependency entry: `  depName: "npm:^x.y.z"` (possibly quoted name)
      const m = trimmed.match(/^"?([^":]+)"?:\s+"?([^"]+)"?/);
      if (m) {
        const depName = m[1].trim();
        const depRange = m[2].trim();
        addRange(depName, depRange);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// For each resolution, classify and report
// ---------------------------------------------------------------------------

function extractPkgName(resKey) {
  // "ajv@^6.0.0" => "ajv"
  if (!resKey.startsWith('@') && resKey.includes('@')) {
    return resKey.split('@')[0];
  }
  // "@scope/pkg@^1.0.0" => "@scope/pkg"
  if (resKey.startsWith('@')) {
    const rest = resKey.slice(1);
    const idx = rest.indexOf('@');
    return idx > 0 ? '@' + rest.substring(0, idx) : resKey;
  }
  return resKey;
}

function minVersion(range) {
  try {
    const min = semver.minVersion(range);
    return min ? min.version : null;
  } catch {
    return null;
  }
}

const safe = [];
const needed = [];
const unknown = [];

for (const [resKey, forced] of Object.entries(resolutions)) {
  const pkgName = extractPkgName(resKey);
  const ranges = [...(allRanges[pkgName] || [])];
  const versions = [...(resolvedVersions[pkgName] || [])];
  const forcedMin = minVersion(forced);

  // Find ranges whose minimum satisfying version is lower than the forced minimum
  const olderRanges = forcedMin
    ? ranges.filter(r => {
        const rMin = minVersion(r);
        if (!rMin) return false;
        return semver.lt(rMin, forcedMin);
      })
    : [];

  const entry = { resKey, forced, pkgName, versions, ranges, olderRanges };

  if (ranges.length === 0) {
    unknown.push(entry);
  } else if (olderRanges.length > 0) {
    needed.push(entry);
  } else {
    safe.push(entry);
  }
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const W = (s) => process.stdout.write(s);

W('\n=== Resolutions analysis ===\n');
W(`  Total: ${Object.keys(resolutions).length}  |  `);
W(`needed: ${needed.length}  |  `);
W(`possibly removable: ${safe.length}  |  `);
W(`not found in lock: ${unknown.length}\n`);

if (needed.length > 0) {
  W('\n⚠️  KEEP — overrides older ranges that would resolve to a lower version:\n');
  for (const { resKey, forced, versions, olderRanges } of needed) {
    W(`\n  [${resKey}]  =>  ${forced}\n`);
    W(`    resolved: ${versions.join(', ')}\n`);
    W(`    older ranges overridden: ${olderRanges.join(', ')}\n`);
  }
}

if (safe.length > 0) {
  W('\n✅ POSSIBLY REMOVABLE — no older ranges found (verify with --immutable before removing):\n');
  for (const { resKey, forced, versions, ranges } of safe) {
    W(`\n  [${resKey}]  =>  ${forced}\n`);
    W(`    resolved: ${versions.join(', ')}\n`);
    W(`    ranges in lock: ${ranges.join(', ')}\n`);
  }
}

if (unknown.length > 0) {
  W('\n❓ NOT FOUND IN LOCK — package may have been removed:\n');
  for (const { resKey, forced } of unknown) {
    W(`\n  [${resKey}]  =>  ${forced}\n`);
  }
}

W('\nNote: "possibly removable" entries must be verified with:\n');
W('  yarn install --immutable  (after removing the entry from package.json)\n\n');
