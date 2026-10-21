// SPDX-License-Identifier: Apache-2.0
// Real installation demonstration. No fetch remapping, preloads or source-server imports.
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import console from 'node:console';
import { createHash } from 'node:crypto';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { tool, inventory } from './bundle.mjs';

const artifact = path.resolve(process.argv[2] ?? 'dist/crypto-intelligence-mcp-0.1.0.mcpb');
const room = await mkdtemp(path.join(tmpdir(), 'ci-independent-live-'));
const copied = path.join(room, path.basename(artifact));
await cp(artifact, copied);
const installed = path.join(room, 'installed');
assert.equal(await (await tool()).unpackExtension({ mcpbPath: copied, outputDir: installed, silent: true }), true);
await inventory(installed); // Reject symlinks: runtime cannot refer back to the checkout.
const manifest = JSON.parse(await readFile(path.join(installed, 'manifest.json'), 'utf8'));
const client = new Client({ name: 'independent-local-mcp-host', version: '1.0.0' });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: manifest.server.mcp_config.args.map((arg) => arg.replaceAll('${__dirname}', installed)),
  cwd: room,
  env: {},
  stderr: 'pipe',
});
try {
  await client.connect(transport);
  const tools = await client.listTools();
  assert.equal(tools.tools.length, 2);
  const catalog = await client.callTool({ name: 'ci_discover', arguments: {} });
  assert.ok(!catalog.isError);
  const metadata = JSON.parse(catalog.content[0].text);
  const products = [metadata, ...metadata.products];
  const results = [];
  for (const product of products) {
    const response = await client.callTool({ name: 'ci_request_claim', arguments: { productId: product.productId } });
    assert.ok(!response.isError);
    const value = JSON.parse(response.content[0].text);
    assert.equal(value.status, 'purchases_disabled');
    assert.equal(value.delivered, false);
    assert.equal(value.unsignedPreflight.readyToPurchase, false);
    assert.equal(value.unsignedPreflight.quoteRequested, false);
    assert.equal(value.unsignedPreflight.paymentSubmitted, false);
    results.push({
      productId: product.productId,
      scope: product.scope,
      price: product.price,
      evidenceDeadline: value.unsignedPreflight.evidenceDeadline,
      status: value.status,
      preflight: value.unsignedPreflight,
    });
  }
  console.log(
    JSON.stringify(
      {
        status: 'PASS',
        installed,
        artifactSha256: createHash('sha256')
          .update(await readFile(copied))
          .digest('hex'),
        tools: tools.tools.map((entry) => entry.name),
        publicGets: 3,
        quoteRequests: 0,
        signatures: 0,
        payments: 0,
        results,
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
  await transport.close();
}
