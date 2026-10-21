// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { buildBundle, inventory, tool } from '../scripts/bundle.mjs';

test('actual MCPB installs outside checkout and negotiates without source or dev dependencies', async (t) => {
  const { artifact, report } = await buildBundle();
  const room = await mkdtemp(path.join(tmpdir(), 'ci-mcp-cleanroom-'));
  const copied = path.join(room, path.basename(artifact));
  await cp(artifact, copied);
  const installed = path.join(room, 'installed');
  assert.equal(await (await tool()).unpackExtension({ mcpbPath: copied, outputDir: installed, silent: true }), true);
  const files = await inventory(installed);
  assert.deepEqual(files, report.files);
  assert.ok(files.length > 3);
  assert.ok(
    files.every(
      (f) => !/(^|\/)(?:\.env[^/]*|\.git|infrastructure|tests?|__tests__|fixtures|benchmarks)(\/|$)/i.test(f.path),
    ),
  );
  assert.ok(!files.some((f) => f.path.includes('@anthropic-ai') || f.path.includes('@modelcontextprotocol/client')));
  assert.equal(report.runtimePackages.zod, '4.6.7');
  const manifest = JSON.parse(await readFile(path.join(installed, 'manifest.json'), 'utf8'));
  assert.equal(manifest.license, 'Apache-2.0');
  for (const file of ['LICENSE', 'NOTICE', 'THIRD-PARTY-NOTICES.md'])
    assert.ok(files.some((entry) => entry.path === file));
  for (const name of Object.keys(report.runtimePackages))
    assert.ok(files.some((entry) => entry.path === `node_modules/${name}/LICENSE`));
  assert.equal(manifest.author.email, undefined);
  const args = manifest.server.mcp_config.args.map((arg) => arg.replaceAll('${__dirname}', installed));
  const client = new Client({ name: 'independent-artifact-install', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args, cwd: room, env: {}, stderr: 'pipe' });
  let stderr = '';
  transport.stderr?.on('data', (chunk) => {
    stderr += chunk.toString();
  });
  t.after(async () => {
    await client.close();
    await transport.close();
  });
  await client.connect(transport);
  const tools = await client.listTools();
  assert.deepEqual(tools.tools.map((entry) => entry.name).sort(), ['ci_discover', 'ci_request_claim']);
  assert.ok(tools.tools.every((entry) => entry.annotations.readOnlyHint && !entry.annotations.destructiveHint));
  assert.equal(stderr, '');
});
