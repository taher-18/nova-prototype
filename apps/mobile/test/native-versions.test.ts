/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Expo Go ships fixed native versions of these packages. If npm installs a
 * different version (often indirectly, e.g. through expo-router), the app
 * crashes at launch with errors like "Cannot find native module". Pin any
 * mismatch with `overrides` in the root package.json.
 */
const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const expoDir = dirname(require.resolve('expo/package.json'));
const expected: Record<string, string> = JSON.parse(readFileSync(join(expoDir, 'bundledNativeModules.json'), 'utf8'));
const semver = require('semver') as { satisfies(version: string, range: string): boolean };

function installedVersion(name: string): string | null {
  // Resolve the way Metro does from the app: local node_modules, then the workspace root.
  for (const dir of [join(here, '..', 'node_modules'), join(here, '..', '..', '..', 'node_modules')]) {
    const pkg = join(dir, name, 'package.json');
    if (existsSync(pkg)) return JSON.parse(readFileSync(pkg, 'utf8')).version;
  }
  return null;
}

describe('native module versions', () => {
  it('match what Expo Go for this SDK ships', () => {
    const mismatches = Object.entries(expected).flatMap(([name, range]) => {
      const version = installedVersion(name);
      return version && !semver.satisfies(version, range) ? [`${name}@${version} (Expo expects ${range})`] : [];
    });
    expect(mismatches).toEqual([]);
  });
});
