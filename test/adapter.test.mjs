// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CiDiscoveryClient } from '../src/client.mjs';
import { discovery } from './fixtures.mjs';

test('disabled offer is not delivered or paid and retains its exact metadata', async () => {
  const offer = {
    productId: 'ci-erc20-zero-transfer-v1',
    available: false,
    claim: 'ERC-20 specifies that a zero-value transfer must emit a Transfer event.',
    scope: 'One specification claim only.',
    price: {
      atomicAmount: '10000',
      decimals: 6,
      network: 'eip155:8453',
      token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      recipient: '0x8C2B40b9AbB3Da30f5f295c980fe2344E1965F77',
    },
    purchase: { method: 'POST', url: 'https://ci-production-api.onrender.com/api/v1/paid-claims/verify' },
    authorizationBinding: 'quote-nonce-v1',
    evidenceExpiresAt: '2026-10-24T04:23:52.250Z',
    supportingCitations: [{ sourceUrl: 'https://eips.ethereum.org/EIPS/eip-20', locator: 'transfer' }],
    limitations: ['Not a deployed token safety assessment.'],
    products: discovery().products,
  };
  const calls = [];
  const api = new CiDiscoveryClient({
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return new globalThis.Response(JSON.stringify(offer), { headers: { 'content-type': 'application/json' } });
    },
  });
  const result = await api.requestClaim('ci-erc20-zero-transfer-v1');
  assert.equal(result.status, 'purchases_disabled');
  assert.equal(result.delivered, false);
  assert.deepEqual(result.product, offer);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.method, 'GET');
  assert.equal(calls[0].init.redirect, 'error');
  assert.equal(calls[0].url, 'https://ci-production-api.onrender.com/api/v1/paid-claims');
});

test('unsigned readiness reports terms and blockers without a quote or authorization', async () => {
  const offer = discovery();
  const api = new CiDiscoveryClient({
    now: () => new Date('2026-10-21T12:00:00Z'),
    fetchImpl: async () =>
      new globalThis.Response(JSON.stringify(offer), { headers: { 'content-type': 'application/json' } }),
  });
  for (const productId of ['ci-erc20-zero-transfer-v1', 'strategy-historical-btc-treasury-comparison']) {
    const result = await api.requestClaim(productId);
    assert.equal(result.unsignedPreflight.productId, productId);
    assert.equal(result.unsignedPreflight.readyToPurchase, false);
    assert.equal(result.unsignedPreflight.quoteRequested, false);
    assert.equal(result.unsignedPreflight.authorizationPrepared, false);
    assert.equal(result.unsignedPreflight.signatureCreated, false);
    assert.equal(result.unsignedPreflight.paymentSubmitted, false);
    assert.equal(result.unsignedPreflight.authorizationBinding, 'quote-nonce-v1');
    assert.equal(result.unsignedPreflight.price.network, 'eip155:8453');
    assert.ok(result.unsignedPreflight.blockers.includes('purchases_disabled'));
    assert.ok(result.unsignedPreflight.blockers.includes('quote_bound_client_required'));
    assert.equal('nonce' in result.unsignedPreflight, false);
    assert.equal('typedData' in result.unsignedPreflight, false);
  }
});
