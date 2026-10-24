# Docs say the per-account position cap is "a tenth of the open interest cap on most markets" — on-chain it is 5% on 12 markets, 2.5% on 6, and a tenth on only 1
Severity: normal
Area: docs
## Steps to reproduce
1. Read the two statements:
   - Trader docs, "Perps on Testnet" page, note under the Markets table: "A single account is capped at a tenth of it [the market's open interest cap] on most markets."
   - Developer docs, "Perps on Testnet for Developers" page, Common pitfalls: "Each account has a position cap per market, a tenth of the market's open interest cap on most markets."
2. For each market's pool, call the read-only `getPerpPoolParameters()` and compute `maxPositionSize / maxOpenInterest` (both raw base units, so the market's decimals cancel).
## Expected
The ratio is 10% on most markets, per both docs pages.
## Actual
The ratio is 10% on exactly **one** market (TAO). Grouping all 21 markets by the captured on-chain values:

- **5% (12 markets):** ETH 399.5612/7,991.225; HYPE 2,381.27/47,625.44; SOL 4,765.44/95,308.88; XRP 68,926.4/1,378,528; ADA 450,934/9,018,712; AVAX 13,334.4/266,688.8; LINK 8,528.6/170,574.4; SUI 127,000/2,540,036; XLM 535,556/10,711,120; DOGE 1,122,700/22,454,360; NEAR 50,000/1,001,640 (≈4.99%); BNB 140/2,775.9 (≈5.04%).
- **2.5% (6 markets):** 1000PEPE 13,028,500/521,142,400; LIT 13,889.6/555,586.4; PUMP 8,799,300/351,974,800; VVV 2,178.61/87,144.56; WLD 126,400/5,056,000; ZRO 25,059.9/1,002,398.
- **10% (1 market):** TAO 218.549/2,185.491.
- **20.26% (1 market):** BTC 100/493.6309.
- **25% (1 market):** ZEC 420/1,680.

A builder who trusts the "tenth" rule will misjudge the maximum position on 20 of 21 markets — expecting twice as much room as the real cap on the 5% and 2.5% markets, and half or less of the real cap on BTC and ZEC. The SDK's `getMaxPerpOrderSize` returns the real `maxPositionSize`, so this is purely a prose fix in both docs pages (the on-chain pattern looks tier-based — 5% on the 20x/10x markets, 2.5% on most 5x markets, with BTC, ZEC and TAO as exceptions).
## Evidence
Read-only eth_calls to `getPerpPoolParameters()` on all 21 perp pools via the Hideki testnet RPC (https://api.hideki2.infra.testnet.somnia.network), 2026-10-24. Example raw values: BTC pool `0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0` → maxPositionSize raw 10000000000 (100 BTC, 8 decimals), maxOpenInterest 493.6309 BTC. ZEC pool `0x2a73129f26917124bd2a47a9b355c395c537f050` → maxPositionSize 420 ZEC, maxOpenInterest 1,680 ZEC. TAO pool `0xd9b6a347a3ae9fd6ba21179d3343f2c8a922f697` → maxPositionSize 218.549 TAO, maxOpenInterest 2,185.491 TAO. Full 21-pool parameter dump captured in one pass.
## Environment
SDK version: @somnia-chain/markets-sdk 0.32.1 (pool discovery via `listPerpMarkets`), parameters read with raw eth_call via viem; network: Somnia Tokyo testnet (Hideki, chain 50383); wallet address: N/A — read-only testing, no wallet used
