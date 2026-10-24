# dreamDEX Perps — Read-Only SDK/API Exploration & Feedback Reports

Read-only integration exploration and feedback reports for the **dreamDEX Perps**
testnet (Somnia Tokyo / Hideki testnet), prepared for the
[dreamDEX Perps Builder Bounty on DoraHacks](https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail)
(Feedback track).

This repository is the proof-of-build accompanying a whitelist request for that
bounty: it contains the actual exploration scripts that were run against the
dreamDEX Markets SDK and public APIs, the raw captures they produced, and six
reproducible feedback reports drafted from that evidence.

## Safety / scope note

- **No wallet was created, nothing was signed, and no orders were placed.**
  All work in this repository is read-only.
- The SDK is constructed **without a `privateKey`** (see `explore-sdk.mjs`),
  so no wallet exists in the process.
- **No security issues are included in this repository.** Any security issue
  would be reported privately to the organizer, never in a public repo.

## How the Markets SDK was used

Dependency: `@somnia-chain/markets-sdk` **0.32.1** (see `package.json`).

`explore-sdk.mjs` follows the documented Connect snippet (with `privateKey`
intentionally omitted for read-only mode):

- `new SomniaMarkets({ chain: hidekiTestnet, indexerUrl, addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES })`
  — chain definition imported from `@somnia-chain/markets-sdk/chains`
- `markets.client.listPerpMarkets()` — returned **21 markets** (raw capture:
  `evidence/markets.json`; count verified from that file)
- `markets.client.getPerpSystemConfig(btc.marginBank)`
- `markets.client.getMarketStats24h({ pool: btc.poolAddress })`
- `markets.client.getFundingRateHistory(btc.poolAddress, { limit: 5 })`

`probe-sdk-chain.mjs` additionally probes `client.getBlockNumber()` and
`client.getPerpSystemConfig(BANK)` via the same SDK client.

Supporting read-only checks (not SDK client calls):

- `explore-viem.mjs` — `eth_call`-only verification via `viem`'s public client
  (using ABIs from the Markets SDK package) against every pool: pool
  parameters, order-book parameters, and open interest, compared with the
  indexer rows and the trader docs. *Note: the `viem` version used for the
  original run was not recorded in the source scripts, so it is intentionally
  not pinned in `package.json`.*
- `explore-http.mjs` / `explore-http2.mjs` — GET-only probes of the staging
  HTTP API (`https://stg.api.dreamdex.io/v0/...`): markets, currencies,
  orderbooks, tickers, candles, volume, auth nonce, and error shapes.
- `explore-ws.mjs` — public WebSocket feed probe: ping/pong, orderbook
  subscribe, and unknown-channel error shape.

Raw captures from these runs are in `evidence/` (markets, pool params, system
config, voucher campaign, HTTP probes, WebSocket feed, RPC checks, BTC book /
funding / 24h stats, and a GraphQL perp-markets replay).

## Run the SDK exploration

Requires Node.js (the scripts use top-level `await`, global `fetch`, and the
global `WebSocket`).

```bash
npm install
node explore-sdk.mjs
```

`explore-sdk.mjs` writes its captures into `evidence/` next to the script
(`markets.json`, `rpc-checks.json`, `system-config.json`,
`btc-stats24h.json`, `btc-funding-history.json`). The HTTP and WebSocket probes
can be run the same way (`node explore-http.mjs`, `node explore-ws.mjs`);
`explore-viem.mjs` additionally requires `viem` (see the note above).

## Feedback reports

All six items are honestly rated severity **`normal`** — no critical/major
evidence was found, and none was claimed. Full reports are in `feedback/`.

| # | File | Summary |
| --- | --- | --- |
| 1 | `feedback/01-orderbooks-tickers-unknown-symbols-not-silently-skipped.md` | Docs say unknown/comma-joined `symbols` are "silently skipped" returning `[]`; the staging API returns 400 `invalid_param` for both `/v0/orderbooks` and `/v0/tickers`. |
| 2 | `feedback/02-candles-invalid-interval-returns-invalid-param-not-invalid-interval.md` | Error Handling docs list `invalid_interval` for unsupported candle intervals; the API returns `invalid_param` (with a raw schema dump) for `interval=banana` and `interval=2h`. |
| 3 | `feedback/03-trader-docs-open-interest-cap-column-stale-vs-chain.md` | Trader docs' "Open interest cap" column does not match on-chain `maxOpenInterest` (matches only TAO); live OI already exceeds the documented cap on BTC, XRP, and NEAR. |
| 4 | `feedback/04-position-cap-is-not-a-tenth-of-open-interest-cap.md` | Docs claim the per-account position cap is "a tenth of the open interest cap on most markets"; on-chain `maxPositionSize/maxOpenInterest` is 5% on 12 markets, 2.5% on 6, 10% on 1, ~20% on BTC, and 25% on ZEC. |
| 5 | `feedback/05-unmatched-routes-return-plain-text-404-not-documented-json-error.md` | Docs say all error responses use the JSON `{status,name,description}` format plus an `Error-Name` header; unmatched routes under `/v0` return text/plain `404 page not found` with neither. |
| 6 | `feedback/06-ws-error-message-shape-mismatch.md` | WebSocket error messages omit the docs-required `channel` field and instead carry an undocumented `errorName` field. |

Areas verified as consistent with the docs (no report filed) are summarized in
the evidence and scripts: SDK market listing vs. the GraphQL indexer, contract
addresses and `getSystemConfig()` vs. the dev-docs table, base-decimals,
tick/min/leverage/margin columns, funding window/interval, and the paper USDso
voucher campaign parameters.

## Bounty

- Bounty page: https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail
- Track: Feedback
- Network: Somnia Tokyo / Hideki testnet (perps testnet; paper funds only)

## License

MIT — see `LICENSE`.
