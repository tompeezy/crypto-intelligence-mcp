// SPDX-License-Identifier: Apache-2.0
import { createServer } from 'node:http';
import { once } from 'node:events';

export function discovery() {
  const base = {
    available: false,
    scope: 'Bounded source-backed evidence; not investment advice.',
    authorizationBinding: 'quote-nonce-v1',
    purchase: { method: 'POST', url: 'https://ci-production-api.onrender.com/api/v1/paid-claims/verify' },
    price: {
      atomicAmount: '10000',
      decimals: 6,
      network: 'eip155:8453',
      token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      recipient: '0x8C2B40b9AbB3Da30f5f295c980fe2344E1965F77',
    },
    evidenceExpiresAt: '2026-10-24T04:23:52.250Z',
    limitations: ['Specification/as-filed scope only.'],
    citations: [{ url: 'https://example.org/fixture-source', note: 'Synthetic fixture only.' }],
  };
  return {
    ...base,
    productId: 'ci-erc20-zero-transfer-v1',
    products: [
      {
        ...base,
        productId: 'strategy-historical-btc-treasury-comparison',
        evidenceExpiresAt: null,
        evidenceExpiryCeiling: '2026-10-27T00:00:00Z',
        price: { ...base.price, atomicAmount: '50000' },
      },
    ],
  };
}

export async function fixture(t, handler) {
  const calls = [];
  const server = createServer((req, res) => {
    calls.push({ method: req.method, path: req.url, headers: req.headers });
    if (handler) return handler(req, res);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(discovery()));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  return { calls, url, fetchImpl: async (_canonicalUrl, init) => globalThis.fetch(url, init) };
}
