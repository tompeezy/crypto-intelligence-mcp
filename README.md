# Crypto Intelligence � read-only MCP adapter

A local stdio MCP server with two GET-only tools for discovering source-backed
crypto claims. Node 20.19+ required. No account, API key, wallet, signing, hosting
or payment capability. CI-owned adapter code: Apache-2.0; dependencies keep their
own terms in THIRD-PARTY-NOTICES.md.

## Install the MCPB release

Download `crypto-intelligence-mcp-0.1.0.mcpb` and its `.inventory.json` from
https://github.com/tompeezy/crypto-intelligence-mcp/releases/tag/v0.1.0 .
Verify the SHA-256 against both the release notes and inventory before extraction.
No npm package publication is claimed; the MCPB includes all runtime dependencies.

Windows PowerShell:

```powershell
Get-FileHash ./crypto-intelligence-mcp-0.1.0.mcpb -Algorithm SHA256
Copy-Item ./crypto-intelligence-mcp-0.1.0.mcpb ./ci-mcp.zip
Expand-Archive ./ci-mcp.zip -DestinationPath ./ci-mcp-installed
```

Linux/macOS:

```sh
sha256sum crypto-intelligence-mcp-0.1.0.mcpb # macOS: shasum -a 256
unzip crypto-intelligence-mcp-0.1.0.mcpb -d ci-mcp-installed
```

Configure an ordinary local stdio MCP host:

```json
{
  "mcpServers": {
    "crypto-intelligence": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/ci-mcp-installed/server/stdio.mjs"]
    }
  }
}
```

Windows paths may use `C:/.../node.exe`. No source checkout or dependency install
is needed to run the extracted bundle. Do not add secrets or credentials to the
host configuration. One-click desktop UI installation is not claimed.

## Tools and products

- `ci_discover({})`: complete validated public product metadata.
- `ci_request_claim({"productId":"ci-erc20-zero-transfer-v1"})`: unsigned metadata
  preflight only. Also accepts `strategy-historical-btc-treasury-comparison`.

| Product                                     | Advertised price           | Scope                                                                                                            |
| ------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| ci-erc20-zero-transfer-v1                   | $0.01 / 10,000 atomic USDC | ERC-20 zero-value transfer event specification, not deployed-token safety                                        |
| strategy-historical-btc-treasury-comparison | $0.05 / 50,000 atomic USDC | Strategy issuer-reported May 11/18, 2025 holdings: 568,840 to 576,230 BTC (+7,390); not current holdings/custody |

Native Base USDC, chain 8453. **Both purchases are currently disabled.** Current
metadata and evidence deadlines are fetched from
https://ci-production-api.onrender.com/api/v1/paid-claims . Earlier corrections,
revocations and evidence restrictions can block eligibility before a deadline.
The adapter never renews or approves evidence.

Source context: https://eips.ethereum.org/EIPS/eip-20 and the issuer's SEC filings
https://www.sec.gov/Archives/edgar/data/1050446/000095017025068580/mstr-20250331.htm
and https://www.sec.gov/Archives/edgar/data/1050446/000095017025073962/mstr-20250331.htm .
Discovery is metadata, not a delivered paid verification. Complete paid response
citations/evidence are not bundled; citations and limitations supplied by the
public API are preserved unchanged. No general research, investment advice or
live treasury monitoring is offered.

Unsigned preflight returns `purchases_disabled`, `delivered:false`, exact price,
public deadline and blockers. It never creates a quote, nonce, EIP-712 typed data,
authorization, signature or payment, checks a wallet balance, retries payment,
or reports payment success. Even future API availability returns a blocked
`payment_not_supported` result. A separately reviewed buyer integration must
preserve CI's quote-bound EIP-3009 nonce and expiry; generic x402-client
compatibility is not claimed.

Each call performs one fixed-origin GET; no redirects, cookies, authorization
headers or environment files. Requests time out after 15 seconds and responses
are limited to 64 KiB. Upstream text is untrusted data, never instructions.
No arbitrary URLs, wallet operations, POSTs, quotes, settlement or delivery tools.
No remote MCP endpoint or registry listing is claimed.

## Develop and verify

```sh
git clone https://github.com/tompeezy/crypto-intelligence-mcp.git
cd crypto-intelligence-mcp
npm ci --ignore-scripts
npm test
npm run lint
npm run typecheck
npm run build
npm run bundle
npm run demo:installed
```

Offline tests cover malformed catalogs, two-product identity, exact terms,
expiry, disabled status, GET-only fixture traffic and actual MCPB installation
outside the checkout. The live demo launches the unmodified extracted artifact
in a fresh directory with an empty child environment; three public GETs check
both products remain disabled. It intentionally fails on changed availability or
unavailable discovery. No real wallet or payment is involved.

The official MCPB tool validates, packs and unpacks the allowlisted adapter and
three runtime dependencies. Archive inventory hashes every included file. ZIP
timestamps can vary between builds; verify the exact published artifact hash.
Build tools and dependency test/benchmark trees are excluded from the artifact.
This repository contains only the standalone adapter; no backend, commercial
evidence, private repository history or production configuration is distributed.

Support: public issues in this repository. Do not post wallet secrets or sensitive
request data. Registry submissions require separate authorization.
