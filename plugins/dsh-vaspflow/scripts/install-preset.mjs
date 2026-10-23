#!/usr/bin/env node

/**
 * Explain how the bundled VASP preset reaches DSH.
 *
 * DSH 0.2 declares Agent presets as ordinary cordis entries
 * (`@deepseek-ai/dsh-agent-preset`) inside a bundle patch, and discovers them
 * from the profile's composed tree. It does NOT scan a preset directory, so
 * copying files into `$DSH_HOME/.agent-presets` has no effect on 0.2 hosts.
 *
 * The preset therefore ships as `preset/vasp.patch.yml`, listed in this
 * package's `dsh.bundle.patch`. Installing the bundle is all that is needed.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const patch = join(pluginRoot, 'preset', 'vasp.patch.yml');

if (!existsSync(patch)) {
  console.error(`Bundled preset patch not found: ${patch}`);
  process.exitCode = 1;
} else {
  const pkg = JSON.parse(readFileSync(join(pluginRoot, 'package.json'), 'utf8'));
  const patches = pkg.dsh?.bundle?.patch;
  const listed = Array.isArray(patches)
    ? patches.some((entry) => entry.includes('vasp.patch.yml'))
    : false;

  if (!listed) {
    console.error('preset/vasp.patch.yml is not listed in dsh.bundle.patch; the preset will not load.');
    process.exitCode = 1;
  } else {
    console.log('The VASP Agent preset ships inside this bundle and loads with it.');
    console.log(`  patch: ${patch}`);
    console.log('');
    console.log('No separate copy step is needed on DSH 0.2: presets are declared');
    console.log('through dsh.bundle.patch, not discovered from a preset directory.');
    console.log('Restart DSH, then choose “VASP 计算助手” when creating a session.');
  }
}
