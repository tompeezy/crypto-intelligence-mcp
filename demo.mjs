// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const client = new Client({ name: 'ci-discovery-demo', version: '0.1.0' });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [fileURLToPath(new globalThis.URL('./src/stdio.mjs', import.meta.url))],
  // Do not inherit operator credentials or Node preloading options into the child.
  env: {},
  stderr: 'pipe',
});
try {
  await client.connect(transport);
  const tools = await client.listTools();
  assert.deepEqual(tools.tools.map((t) => t.name).sort(), ['ci_discover', 'ci_request_claim']);
  const discovery = await client.callTool({ name: 'ci_discover', arguments: {} });
  assert.ok(!discovery.isError, 'live discovery must succeed');
  globalThis.console.log(JSON.stringify(discovery, null, 2));
  for (const productId of ['ci-erc20-zero-transfer-v1', 'strategy-historical-btc-treasury-comparison']) {
    const result = await client.callTool({ name: 'ci_request_claim', arguments: { productId } });
    assert.ok(!result.isError, 'request must return a verified discovery result');
    const text = result.content.find((c) => c.type === 'text');
    assert.ok(text?.type === 'text');
    const value = JSON.parse(text.text);
    assert.equal(value.status, 'purchases_disabled', 'demo expects disabled purchases');
    assert.equal(value.delivered, false);
    globalThis.console.log(JSON.stringify(value, null, 2));
  }
} finally {
  await client.close();
  await transport.close();
}
