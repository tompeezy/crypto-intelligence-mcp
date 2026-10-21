// SPDX-License-Identifier: Apache-2.0
import { z } from 'zod';

export const DISCOVERY_URL = 'https://ci-production-api.onrender.com/api/v1/paid-claims';
export const PRODUCT_IDS = /** @type {const} */ ([
  'ci-erc20-zero-transfer-v1',
  'strategy-historical-btc-treasury-comparison',
]);
const purchaseUrl = `${DISCOVERY_URL}/verify`;
const date = z.string().datetime({ offset: true });
const offerSchema = z
  .object({
    productId: z.enum(PRODUCT_IDS),
    available: z.boolean(),
    scope: z.string().min(1),
    authorizationBinding: z.literal('quote-nonce-v1'),
    price: z
      .object({
        atomicAmount: z.enum(['10000', '50000']),
        decimals: z.literal(6),
        network: z.literal('eip155:8453'),
        token: z.string().refine((v) => v.toLowerCase() === '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'),
        recipient: z.string().refine((v) => v.toLowerCase() === '0x8c2b40b9abb3da30f5f295c980fe2344e1965f77'),
      })
      .passthrough(),
    purchase: z.object({ method: z.literal('POST'), url: z.literal(purchaseUrl) }).passthrough(),
    evidenceExpiresAt: date.nullable().optional(),
    evidenceExpiryCeiling: date.optional(),
  })
  .passthrough();

export class CiDiscoveryClient {
  /** @param {{fetchImpl?: typeof globalThis.fetch, now?: () => Date, timeoutMs?: number, maxBytes?: number}} [options] */
  constructor(options = {}) {
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.now = options.now ?? (() => new Date());
    this.timeoutMs = options.timeoutMs ?? 15000;
    this.maxBytes = options.maxBytes ?? 65536;
  }

  async discover() {
    // One fixed GET. No cookies, authorization, request body, redirects or retry.
    const response = await this.fetchImpl(DISCOVERY_URL, {
      method: 'GET',
      redirect: 'error',
      credentials: 'omit',
      headers: { accept: 'application/json' },
      signal: globalThis.AbortSignal.timeout(this.timeoutMs),
    }).catch(() => {
      throw new Error('ci_discovery_network_error');
    });
    if (response.status !== 200 || !response.headers.get('content-type')?.startsWith('application/json')) {
      await response.body?.cancel();
      throw new Error('ci_discovery_unavailable');
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error('ci_discovery_invalid');
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > this.maxBytes) throw new Error('ci_discovery_too_large');
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    let discovery;
    try {
      discovery = JSON.parse(new globalThis.TextDecoder('utf-8', { fatal: true }).decode(bytes));
      if (discovery.productId !== PRODUCT_IDS[0] || !Array.isArray(discovery.products)) throw new Error();
      const offers = [discovery, ...discovery.products];
      const seen = new Set();
      for (const item of offers) {
        const offer = offerSchema.parse(item);
        if (seen.has(offer.productId)) throw new Error();
        seen.add(offer.productId);
        const treasury = offer.productId === PRODUCT_IDS[1];
        if (offer.price.atomicAmount !== (treasury ? '50000' : '10000')) throw new Error();
        if (treasury ? !offer.evidenceExpiryCeiling : !offer.evidenceExpiresAt) throw new Error();
      }
      if (seen.size !== PRODUCT_IDS.length || PRODUCT_IDS.some((id) => !seen.has(id))) throw new Error();
    } catch {
      throw new Error('ci_discovery_invalid');
    }
    // Return original JSON, not a reduced projection: preserve citations and restrictions.
    return discovery;
  }

  /** @param {string} productId */
  async requestClaim(productId) {
    if (!PRODUCT_IDS.some((id) => id === productId)) throw new Error('ci_product_unknown');
    const discovery = await this.discover();
    const product = [discovery, ...discovery.products].find((p) => p.productId === productId);
    if (!product) throw new Error('ci_product_unlisted');
    const deadlines = [product.evidenceExpiresAt, product.evidenceExpiryCeiling].filter(Boolean).map(Date.parse);
    const expired = deadlines.length > 0 && Math.min(...deadlines) <= this.now().getTime();
    return {
      status: !product.available ? 'purchases_disabled' : expired ? 'evidence_expired' : 'payment_not_supported',
      delivered: false,
      evidenceStatus: expired ? 'expired' : 'advertised_deadline_only',
      message:
        'No claim was purchased or delivered. This read-only adapter cannot obtain a quote or authorize payment. Availability is not proof of evidence approval; use the separately reviewed quote-bound client only after explicit authorization.',
      unsignedPreflight: {
        productId,
        readyToPurchase: false,
        price: product.price,
        authorizationBinding: product.authorizationBinding,
        evidenceDeadline: new Date(Math.min(...deadlines)).toISOString(),
        blockers: [
          ...(!product.available ? ['purchases_disabled'] : []),
          ...(expired ? ['evidence_expired'] : []),
          'quote_bound_client_required',
          'read_only_adapter',
        ],
        quoteRequested: false,
        authorizationPrepared: false,
        signatureCreated: false,
        paymentSubmitted: false,
      },
      product,
    };
  }
}
