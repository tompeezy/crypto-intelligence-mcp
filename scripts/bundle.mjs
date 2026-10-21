// SPDX-License-Identifier: Apache-2.0
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cp, mkdir, mkdtemp, readFile, readdir, writeFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import process from 'node:process';
import console from 'node:console';

export const root = fileURLToPath(new globalThis.URL('../', import.meta.url));
export async function tool() {
  // Build-only override for an isolated tool install; never bundled or passed to the server.
  return process.env.CI_MCPB_TOOL_PATH
    ? import(pathToFileURL(path.resolve(process.env.CI_MCPB_TOOL_PATH)).href)
    : import('@anthropic-ai/mcpb');
}
export async function inventory(dir, prefix = '') {
  const result = [];
  for (const name of (await readdir(dir)).sort()) {
    const absolute = path.join(dir, name);
    const relative = prefix + name;
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink()) throw new Error('bundle_symlink_rejected');
    if (stat.isDirectory()) result.push(...(await inventory(absolute, relative + '/')));
    else
      result.push({
        path: relative,
        sha256: createHash('sha256')
          .update(await readFile(absolute))
          .digest('hex'),
      });
  }
  return result;
}
export async function buildBundle() {
  const api = await tool();
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const dist = path.join(root, 'dist');
  await mkdir(dist, { recursive: true });
  const stage = await mkdtemp(path.join(dist, 'stage-'));
  await mkdir(path.join(stage, 'server'));
  for (const name of ['client.mjs', 'server.mjs', 'stdio.mjs']) {
    await cp(path.join(root, 'src', name), path.join(stage, 'server', name));
  }
  for (const name of [
    'manifest.json',
    'README.md',
    'DISTRIBUTION-NOTICE.md',
    'LICENSE',
    'NOTICE',
    'THIRD-PARTY-NOTICES.md',
  ]) {
    await cp(path.join(root, name), path.join(stage, name));
  }
  await writeFile(
    path.join(stage, 'package.json'),
    JSON.stringify(
      {
        name: pkg.name,
        version: pkg.version,
        private: true,
        license: pkg.license,
        repository: pkg.repository,
        type: 'module',
        engines: pkg.engines,
        dependencies: pkg.dependencies,
      },
      null,
      2,
    ) + '\n',
  );
  const seen = new Map();
  async function dependency(name, base) {
    let location = createRequire(path.join(base, 'package.json')).resolve(name);
    let metadata;
    while (true) {
      try {
        metadata = JSON.parse(await readFile(path.join(location, 'package.json'), 'utf8'));
        if (metadata.name === name) break;
      } catch {
        /* Resolve the owning package, including packages with restricted exports. */
      }
      const parent = path.dirname(location);
      if (parent === location) throw new Error('runtime_package_missing');
      location = parent;
    }
    if (seen.has(name)) {
      if (seen.get(name) !== metadata.version) throw new Error('runtime_version_conflict');
      return;
    }
    seen.set(name, metadata.version);
    // Copy only installed production packages, never sibling dependencies or checkout files.
    await cp(location, path.join(stage, 'node_modules', name), {
      recursive: true,
      dereference: false,
      filter: (source) =>
        source === location ||
        !['node_modules', '.git', 'test', 'tests', '__tests__', 'fixtures', 'benchmarks'].includes(
          path.basename(source),
        ),
    });
    for (const child of Object.keys({ ...metadata.dependencies, ...metadata.peerDependencies })) {
      await dependency(child, location);
    }
  }
  for (const name of Object.keys(pkg.dependencies)) await dependency(name, root);
  if (!api.validateManifest(stage)) throw new Error('manifest_invalid');
  const artifact = path.join(dist, `crypto-intelligence-mcp-${pkg.version}.mcpb`);
  if (!(await api.packExtension({ extensionPath: stage, outputPath: artifact, silent: true })))
    throw new Error('pack_failed');
  const sha256 = createHash('sha256')
    .update(await readFile(artifact))
    .digest('hex');
  const unpacked = await mkdtemp(path.join(dist, 'verified-'));
  if (!(await api.unpackExtension({ mcpbPath: artifact, outputDir: unpacked, silent: true })))
    throw new Error('unpack_failed');
  const report = {
    artifact: path.basename(artifact),
    sha256,
    runtimePackages: Object.fromEntries(seen),
    files: await inventory(unpacked),
  };
  await writeFile(artifact + '.inventory.json', JSON.stringify(report, null, 2) + '\n');
  return { artifact, report };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { artifact, report } = await buildBundle();
  console.log(JSON.stringify({ artifact, sha256: report.sha256, runtimePackages: report.runtimePackages }));
}
