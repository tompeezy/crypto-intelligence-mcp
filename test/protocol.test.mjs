// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { discovery, fixture } from './fixtures.mjs';

test('official SDK stdio handshake, tools, disabled result and strict arguments', async (t) => {
  const f = await fixture(t);
  const client = new Client({ name: 'ci-regression', version: '0.0.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new globalThis.URL('./fixture-server.mjs', import.meta.url)), f.url],
    env: {},
    stderr: 'pipe',
  });
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
  assert.deepEqual(tools.tools.map((tool) => tool.name).sort(), ['ci_discover', 'ci_request_claim']);
  const offer = await client.callTool({ name: 'ci_discover', arguments: {} });
  assert.equal(offer.isError, undefined);
  assert.deepEqual(JSON.parse(offer.content[0].text), discovery());
  const request = await client.callTool({
    name: 'ci_request_claim',
    arguments: { productId: 'strategy-historical-btc-treasury-comparison' },
  });
  const result = JSON.parse(request.content[0].text);
  assert.equal(result.status, 'purchases_disabled');
  assert.equal(result.delivered, false);
  const count = f.calls.length;
  for (const args of [{ productId: 'unknown' }, { productId: 'ci-erc20-zero-transfer-v1', unexpected: 'reject' }]) {
    const invalid = await client.callTool({ name: 'ci_request_claim', arguments: args });
    assert.equal(invalid.isError, true);
  }
  assert.equal(f.calls.length, count);
  assert.equal(stderr, '');
});

test('official SDK error result does not leak untrusted upstream response text', async (t) => {
  const f = await fixture(t, (_req, res) => {
    res.writeHead(500);
    res.end('UNTRUSTED_RESPONSE_DO_NOT_EXPOSE');
  });
  const client = new Client({ name: 'ci-regression', version: '0.0.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new globalThis.URL('./fixture-server.mjs', import.meta.url)), f.url],
    env: {},
    stderr: 'pipe',
  });
  t.after(async () => {
    await client.close();
    await transport.close();
  });
  await client.connect(transport);
  const result = await client.callTool({ name: 'ci_discover', arguments: {} });
  assert.equal(result.isError, true);
  assert.doesNotMatch(JSON.stringify(result), /UNTRUSTED_RESPONSE/);
  assert.equal(f.calls.length, 1);
});

test('both MCP tools reject an incomplete catalog without delivery or POSTs', async (t) => {
  const offer = discovery();
  offer.products = [];
  const f = await fixture(t, (_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(offer));
  });
  const client = new Client({ name: 'ci-catalog-regression', version: '0.0.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new globalThis.URL('./fixture-server.mjs', import.meta.url)), f.url],
    env: {},
    stderr: 'pipe',
  });
  t.after(async () => {
    await client.close();
    await transport.close();
  });
  await client.connect(transport);
  for (const request of [
    { name: 'ci_discover', arguments: {} },
    { name: 'ci_request_claim', arguments: { productId: 'ci-erc20-zero-transfer-v1' } },
  ]) {
    const result = await client.callTool(request);
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /No claim was delivered and no payment action was taken/);
  }
  assert.equal(f.calls.length, 2);
  assert.ok(f.calls.every((call) => call.method === 'GET'));
});
