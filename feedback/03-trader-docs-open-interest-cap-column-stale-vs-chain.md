# Trader docs "Open interest cap" column disagrees with the on-chain cap for 20 of 21 markets; live OI already exceeds the documented cap on 3 markets
Severity: normal
Area: docs
## Steps to reproduce
1. Read the Markets table on the trader docs page "Perps on Testnet" (app.testnet.dreamdex.io → Docs → Trading → Perps on Testnet), column "Open interest cap". The note under the table says: "These figures are read from the live markets and can be retuned at any time."
2. For each market's pool contract (addresses from `client.listPerpMarkets()` in @somnia-chain/markets-sdk 0.32.1, or the indexer), call the read-only `getPerpPoolParameters()` and compare its `maxOpenInterest` (converted with the market's `baseDecimals`) with the documented cap.
3. Also call `getOpenInterest()` on the BTC, XRP and NEAR pools and compare with the documented caps.
## Expected
The documented cap equals the pool's live `maxOpenInterest` (the page says the figures are read from the live markets), and live open interest can never exceed a market-wide cap.
## Actual
The documented cap differs from the on-chain `maxOpenInterest` for 20 of 21 markets, by exact multiples — the four 20x markets are documented at exactly half the chain value, sixteen markets at exactly a quarter, and only TAO matches:

| Market | Docs cap | On-chain maxOpenInterest | Ratio |
| --- | --- | --- | --- |
| BTC-PERP | 246.81545 | 493.6309 | 2.0000 |
| ETH-PERP | 3,995.6125 | 7,991.225 | 2.0000 |
| HYPE-PERP | 23,812.72 | 47,625.44 | 2.0000 |
| SOL-PERP | 47,654.44 | 95,308.88 | 2.0000 |
| XRP-PERP | 344,632 | 1,378,528 | 4.0000 |
| ADA-PERP | 2,254,678 | 9,018,712 | 4.0000 |
| AVAX-PERP | 66,672.2 | 266,688.8 | 4.0000 |
| BNB-PERP | 693.975 | 2,775.9 | 4.0000 |
| DOGE-PERP | 5,613,590 | 22,454,360 | 4.0000 |
| LINK-PERP | 42,643.6 | 170,574.4 | 4.0000 |
| NEAR-PERP | 250,410 | 1,001,640 | 4.0000 |
| SUI-PERP | 635,009 | 2,540,036 | 4.0000 |
| XLM-PERP | 2,677,780 | 10,711,120 | 4.0000 |
| 1000PEPE-PERP | 130,285,600 | 521,142,400 | 4.0000 |
| LIT-PERP | 138,896.6 | 555,586.4 | 4.0000 |
| PUMP-PERP | 87,993,700 | 351,974,800 | 4.0000 |
| VVV-PERP | 21,786.14 | 87,144.56 | 4.0000 |
| WLD-PERP | 1,264,000 | 5,056,000 | 4.0000 |
| ZEC-PERP | 420 | 1,680 | 4.0000 |
| ZRO-PERP | 250,599.5 | 1,002,398 | 4.0000 |
| TAO-PERP | 2,185.491 | 2,185.491 | 1.0000 |

Stronger still, live open interest already exceeds the documented "market-wide" cap on three markets, which is impossible if the documented number were the live cap: BTC open interest 341.39354 BTC vs documented cap 246.81545 BTC; XRP 845,805.4 XRP vs 344,632 XRP; NEAR 256,857.7 NEAR vs 250,410 NEAR.

Every other column of the same table was verified against the chain/indexer and matches (price tick, min size, max leverage from `initialMarginBps`, maintenance margin = half of initial, maker/taker fees 0) — only this column is off, which suggests the caps were retuned on-chain (×2 / ×4) after the docs snapshot was generated, and the page was not regenerated.
## Evidence
Read-only eth_calls against the Hideki testnet RPC (https://api.hideki2.infra.testnet.somnia.network), 2026-10-24 (~10:5x UTC, head block timestamp 1792839430):
- BTC pool `0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0`: `getPerpPoolParameters()` → maxOpenInterest raw 49363090000 (8 base decimals = 493.6309 BTC); `getOpenInterest()` → 341.39354 BTC. The indexer row for the same pool (via SDK `listPerpMarkets()` and raw GraphQL) agrees: openInterest 34139354000 raw.
- XRP pool `0x7058579f3248559963f79adb937c6de9f953e060`: maxOpenInterest 1,378,528 XRP; open interest 845,805.4 XRP.
- NEAR pool `0x1cd15ae8bff0fe0a7f49233be8b90734775ba454`: maxOpenInterest 1,001,640 NEAR; open interest 256,857.7 NEAR.
- Full 21-market parameter dump (initialMarginBps, maintenanceMarginBps, maxOpenInterest, maxPositionSize, fees, book parameters) captured in one pass; ratios above are computed from those raw values, not rounded from the docs.
## Environment
SDK version: @somnia-chain/markets-sdk 0.32.1 (market/pool discovery), cross-checked with raw eth_call via viem; network: Somnia Tokyo testnet (Hideki, chain 50383); wallet address: N/A — read-only testing, no wallet used
