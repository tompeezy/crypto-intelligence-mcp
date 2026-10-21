// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CiDiscoveryClient } from '../src/client.mjs';
import { discovery, fixture } from './fixtures.mjs';

test('real HTTP discovery and repeated guarded requests retain citations and issue GETs only', async (t) => {
  const f = await fixture(t);
  const api = new CiDiscoveryClient({ fetchImpl: f.fetchImpl });
  assert.deepEqual(await api.discover(), discovery());
  for (let i = 0; i < 2; i++) {
    const result = await api.requestClaim('strategy-historical-btc-treasury-comparison');
    assert.equal(result.status, 'purchases_disabled');
    assert.equal(result.delivered, false);
    assert.deepEqual(result.product, discovery().products[0]);
  }
  assert.equal(f.calls.length, 3);
  for (const call of f.calls) {
    assert.equal(call.method, 'GET');
    assert.equal(call.headers['payment-signature'], undefined);
    assert.equal(call.headers.authorization, undefined);
    assert.equal(call.headers.cookie, undefined);
  }
});

for (const [name, mutate] of [
  [
    'missing treasury',
    (o) => {
      o.products = [];
    },
  ],
  [
    'missing root ID',
    (o) => {
      delete o.productId;
    },
  ],
  [
    'duplicated root ID',
    (o) => {
      o.products = [{ ...o, products: [] }];
    },
  ],
  [
    'extra unexpected product',
    (o) => {
      o.products.push({ ...o.products[0], productId: 'unexpected-product' });
    },
  ],
  [
    'missing products array',
    (o) => {
      delete o.products;
    },
  ],
  [
    'null products array',
    (o) => {
      o.products = null;
    },
  ],
  [
    'object products catalog',
    (o) => {
      o.products = {};
    },
  ],
  [
    'string products catalog',
    (o) => {
      o.products = 'not-a-catalog';
    },
  ],
  [
    'null product entry',
    (o) => {
      o.products = [null];
    },
  ],
  [
    'wrong chain',
    (o) => {
      o.price.network = 'eip155:1';
    },
  ],
  [
    'wrong token',
    (o) => {
      o.price.token = '0x1234';
    },
  ],
  [
    'wrong recipient',
    (o) => {
      o.price.recipient = '0x1234';
    },
  ],
  [
    'wrong price',
    (o) => {
      o.price.atomicAmount = '50000';
    },
  ],
  [
    'wrong purchase URL',
    (o) => {
      o.purchase.url = 'https://example.org/';
    },
  ],
  [
    'wrong binding',
    (o) => {
      o.authorizationBinding = 'random-nonce';
    },
  ],
  [
    'missing deadline',
    (o) => {
      delete o.evidenceExpiresAt;
    },
  ],
  [
    'unknown product',
    (o) => {
      o.products[0].productId = 'new-product';
    },
  ],
  [
    'duplicate product',
    (o) => {
      o.products.push(o.products[0]);
    },
  ],
  [
    'wrong treasury price',
    (o) => {
      o.products[0].price.atomicAmount = '10000';
    },
  ],
]) {
  test(`rejects ${name} without a second request`, async (t) => {
    const offer = discovery();
    mutate(offer);
    const f = await fixture(t, (_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(offer));
    });
    await assert.rejects(new CiDiscoveryClient({ fetchImpl: f.fetchImpl }).discover(), /ci_discovery_invalid/);
    assert.equal(f.calls.length, 1);
  });
}

for (const status of [302, 402, 500]) {
  test(`HTTP ${status} cannot trigger redirect, quote handling or retry`, async (t) => {
    const f = await fixture(t, (_req, res) => {
      res.writeHead(status, { location: '/unexpected', 'content-type': 'application/json' });
      res.end('{}');
    });
    await assert.rejects(new CiDiscoveryClient({ fetchImpl: f.fetchImpl }).discover());
    assert.equal(f.calls.length, 1);
  });
}

test('expired evidence and newly available product never deliver or submit a payment', async (t) => {
  const offer = discovery();
  offer.available = true;
  const f = await fixture(t, (_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(offer));
  });
  const current = new CiDiscoveryClient({ fetchImpl: f.fetchImpl, now: () => new Date('2026-10-21T00:00:00Z') });
  assert.equal((await current.requestClaim('ci-erc20-zero-transfer-v1')).status, 'payment_not_supported');
  const expired = new CiDiscoveryClient({ fetchImpl: f.fetchImpl, now: () => new Date('2026-10-24T04:23:52.250Z') });
  const result = await expired.requestClaim('ci-erc20-zero-transfer-v1');
  assert.equal(result.status, 'evidence_expired');
  assert.equal(result.delivered, false);
  assert.ok(f.calls.every((c) => c.method === 'GET'));
});

test('response byte limit and invalid JSON fail closed', async (t) => {
  const f = await fixture(t, (_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('x'.repeat(200));
  });
  await assert.rejects(new CiDiscoveryClient({ fetchImpl: f.fetchImpl, maxBytes: 100 }).discover(), /too_large/);
  await assert.rejects(new CiDiscoveryClient({ fetchImpl: f.fetchImpl }).discover(), /invalid/);
});

test('timeout aborts a stalled response without retry', async (t) => {
  const f = await fixture(t, () => {});
  await assert.rejects(new CiDiscoveryClient({ fetchImpl: f.fetchImpl, timeoutMs: 100 }).discover(), /network_error/);
  assert.equal(f.calls.length, 1);
});

test('unknown product is rejected before network access', async (t) => {
  const f = await fixture(t);
  await assert.rejects(new CiDiscoveryClient({ fetchImpl: f.fetchImpl }).requestClaim('arbitrary'), /product_unknown/);
  assert.equal(f.calls.length, 0);
});
