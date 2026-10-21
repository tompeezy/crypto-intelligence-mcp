// SPDX-License-Identifier: Apache-2.0
// Test-only subprocess entry. The shipped CLI has no URL override or test mode.
import process from 'node:process';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { CiDiscoveryClient } from '../src/client.mjs';
import { createCiServer } from '../src/server.mjs';

const endpoint = process.argv[2];
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(endpoint)) throw new Error('fixture_endpoint_required');
serveStdio(() =>
  createCiServer(new CiDiscoveryClient({ fetchImpl: (_url, init) => globalThis.fetch(endpoint, init) })),
);
