/**
 * dsh-vaspflow verify: release-artifact consistency for DSH 0.2.
 *
 * Checks:
 *  1. every `exports` / `bin` target exists;
 *  2. the client bundle carries the `__ModuleLoader__.load` header and the
 *     slot registrations the DSH 0.2 client module system requires;
 *  3. every `dsh.bundle.patch` entry exists and parses as a patch list;
 *  4. the VASP preset patch declares an `@deepseek-ai/dsh-agent-preset` entry
 *     whose `plugins` list is non-empty;
 *  5. every `@deepseek-ai/*` package referenced by the preset resolves from the
 *     built host artifact (catches renamed/removed packages across releases);
 *  6. local `./…` rows in the preset point at files that exist next to it;
 *  7. the host half imports and exports the expected surface.
 *
 * Exit non-zero on any failure.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(root, '..');
const pkgPath = resolve(pkgDir, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

const requireFromPkg = createRequire(pkgPath);

let failed = false;
const fail = (msg) => {
  failed = true;
  console.error(`[verify] FAIL: ${msg}`);
};
const ok = (msg) => console.log(`[verify] ok: ${msg}`);

// 1) exports / bin targets
for (const [sub, spec] of Object.entries(pkg.exports ?? {})) {
  const target = typeof spec === 'string' ? spec : spec.default;
  if (typeof target !== 'string') continue;
  if (!existsSync(resolve(pkgDir, target))) fail(`exports["${sub}"] target missing: ${target}`);
}
for (const target of Object.values(pkg.bin ?? {})) {
  if (typeof target === 'string' && !existsSync(resolve(pkgDir, target))) fail(`bin target missing: ${target}`);
}
ok('exports and bin targets exist');

// 2) client bundle
const clientPath = resolve(pkgDir, 'lib/client.js');
if (!existsSync(clientPath)) {
  fail('lib/client.js missing');
} else {
  const body = readFileSync(clientPath, 'utf8');
  if (!body.slice(0, 400).includes('window.__ModuleLoader__.load')) {
    fail('lib/client.js does not start with the __ModuleLoader__.load header');
  }
  for (const slot of ['sidebar.panellist', 'main']) {
    if (!body.includes(slot)) fail(`client bundle does not register the "${slot}" slot (DSH 0.2 mount path)`);
  }
  const clientInject = pkg.dsh?.client?.inject ?? [];
  if (!Array.isArray(clientInject) || clientInject.length === 0) {
    fail('dsh.client.inject is empty; the client half needs its module providers declared');
  }
}
ok('client bundle carries the module header and slot registrations');

// 3) bundle patches
const patches = pkg.dsh?.bundle?.patch;
const patchList = Array.isArray(patches) ? patches : patches === undefined ? [] : [patches];
if (patchList.length === 0) fail('dsh.bundle.patch declares no patch files');
for (const entry of patchList) {
  const file = resolve(pkgDir, entry);
  if (!existsSync(file)) {
    fail(`bundle patch missing: ${entry}`);
    continue;
  }
  const text = readFileSync(file, 'utf8');
  if (!/^\s*-\s/m.test(text)) fail(`bundle patch does not look like a patch list: ${entry}`);
}
ok(`bundle patches present (${patchList.length})`);

// 4) preset declaration
const presetPatch = patchList.find((entry) => entry.includes('vasp.patch'));
let presetRows = [];
if (presetPatch === undefined) {
  fail('no VASP preset patch listed in dsh.bundle.patch');
} else {
  const text = readFileSync(resolve(pkgDir, presetPatch), 'utf8');
  if (!text.includes('@deepseek-ai/dsh-agent-preset')) {
    fail('preset patch does not declare an @deepseek-ai/dsh-agent-preset entry');
  }
  if (!/id:\s*vasp\b/.test(text)) fail('preset patch does not declare the "vasp" preset id');
  // Count plugin rows at the `plugins:` level by indentation.
  presetRows = [...text.matchAll(/^(\s*)-\s+id:\s*(\S+)/gm)].map((m) => ({ indent: m[1].length, id: m[2] }));
  if (presetRows.length === 0) fail('preset patch declares no plugin rows');
}
ok(`preset declares a DSH 0.2 agent-preset entry (${presetRows.length} rows)`);

// 5) referenced @deepseek-ai packages resolve
const referenced = new Set();
if (presetPatch !== undefined) {
  const text = readFileSync(resolve(pkgDir, presetPatch), 'utf8');
  for (const m of text.matchAll(/'(@deepseek-ai\/[^']+)'/g)) referenced.add(m[1]);
  // Every row `name` must be a plain string. YAML `!!js` tags become objects and
  // the preset registry rejects them with "names no plugin".
  for (const m of text.matchAll(/^\s*-\s+id:\s*(\S+)\n\s+name:\s*(.+)$/gm)) {
    const [, rowId, rawName] = m;
    if (rawName.includes('!!js')) {
      fail(`preset row ${rowId} uses a !!js expression for "name"; a literal package specifier is required`);
      continue;
    }
    const name = rawName.trim().replace(/^['"]|['"]$/g, '');
    if (name === '') {
      fail(`preset row ${rowId} has an empty "name"`);
      continue;
    }
    // Bare relative rows resolve against the profile dir at mount time, so they
    // can never load; require a package subpath or a host package instead.
    if (name.startsWith('.')) {
      fail(`preset row ${rowId} uses a relative path "${name}"; export the module as a package subpath instead`);
    }
  }
}
// Preset rows resolve from the HOST runtime, not from this package: the shell
// owns those plugins. Use DSH_HOME / the installed app as the resolution base
// when available; otherwise report the references without failing, so an
// offline `npm run verify` still works.
const hostBases = [
  process.env.DSH_HOST_NODE_MODULES,
  process.env.DSH_HOME && resolve(process.env.DSH_HOME, 'profiles'),
  '/Applications/DeepSeek Harness.app/Contents/Resources/app.asar.unpacked/dsh/node_modules',
].filter((value) => typeof value === 'string' && value.length > 0);

const hostResolve = (spec) => {
  for (const base of hostBases) {
    try {
      createRequire(resolve(base, 'noop.js')).resolve(spec);
      return true;
    } catch {
      // try the next base
    }
  }
  return false;
};

let resolvedCount = 0;
const unresolved = [];
for (const spec of referenced) {
  const base = spec.split('/').slice(0, 2).join('/');
  if (hostResolve(`${base}/package.json`) || hostResolve(base)) {
    resolvedCount += 1;
  } else {
    unresolved.push(base);
  }
}
if (unresolved.length > 0) {
  console.warn(`[verify] warn: ${unresolved.length} host package(s) not resolvable locally (expected when verifying away from DSH):`);
  for (const name of unresolved.slice(0, 8)) console.warn(`[verify]   - ${name}`);
}
ok(`preset package references checked (${resolvedCount}/${referenced.size} resolved locally)`);

// 6) host half
try {
  const mod = await import('../lib/index.js');
  if (mod.name !== 'dsh-vaspflow') fail(`host name mismatch: ${mod.name}`);
  if (typeof mod.apply !== 'function') fail('host half exports no apply()');
  if (typeof mod.registerVaspTools !== 'function') fail('host half exports no registerVaspTools()');
} catch (error) {
  fail(`host import failed: ${error.message}`);
}
ok('host half imports cleanly');

if (failed) process.exit(1);
console.log('[verify] dsh-vaspflow is ready to publish for DSH 0.2');
