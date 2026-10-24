# Docs say unknown/comma-joined `symbols` are silently skipped (empty []); the API returns 400 invalid_param
Severity: normal
Area: API
## Steps to reproduce
1. Read the Market Data page (docs.dreamdex.io → Developers → HTTP API → Market Data), "Order book depth" section. It says, verbatim: "Unknown or malformed symbols are silently skipped rather than erroring, so a serialization mismatch shows up as an empty `[]` rather than a 4xx", and its comma-separated example is annotated "Wrong — parsed as one literal symbol "SOMI:USDso,WETH:USDso", which matches no market and is silently skipped, so the response is []". The same page says of `GET /v0/tickers`: "unknown symbols are silently skipped".
2. Against the testnet (staging) API the same page points to, run:
   - `GET https://stg.api.dreamdex.io/v0/orderbooks?symbols=SOMI:USDso,WETH:USDso`
   - `GET https://stg.api.dreamdex.io/v0/orderbooks?symbols=SOM:USDso`
   - `GET https://stg.api.dreamdex.io/v0/tickers?symbols=SOM:USDso`
   - `GET https://stg.api.dreamdex.io/v0/tickers?symbols=SOMI:USDso,WETH:USDso`
3. Compare with the repeated-key form, e.g. `GET https://stg.api.dreamdex.io/v0/orderbooks?symbols=SOMI:USDso&symbols=WETH:USDso`.
## Expected
Per the docs: HTTP 200 with the unknown/comma-joined symbols silently skipped — an empty array for the comma case, and the valid subset otherwise. No 4xx.
## Actual
All four unknown/comma requests return **HTTP 400** with error name `invalid_param` (also present in the `Error-Name` response header):
- comma-joined orderbooks: `{"context":{"invalid_symbols":["SOMI:USDso,WETH:USDso"]},"description":"unknown market symbols: SOMI:USDso,WETH:USDso","name":"invalid_param","status":400}`
- unknown symbol on orderbooks and on tickers: same shape, `"unknown market symbols: SOM:USDso"`.

The repeated-key form works as documented (HTTP 200, both books/tickers returned). So the repeated-key guidance in the docs is right, but the "silently skipped / empty []" behaviour described in three places on the Market Data page does not happen on the testnet API — clients that follow the docs and treat a bad symbol as a skippable no-op will instead get a hard 400 for the whole request. (The Trading page repeats the same "unknown symbols are silently skipped" wording for `GET /v0/orders`; that endpoint needs authentication so it was not exercised here.)
## Evidence
Captured 2026-10-24 against https://stg.api.dreamdex.io (Somnia Shannon testnet API):
- `GET /v0/orderbooks?symbols=SOMI:USDso,WETH:USDso` → 400, `Error-Name: invalid_param`, body as above.
- `GET /v0/orderbooks?symbols=SOM:USDso` → 400, `Error-Name: invalid_param`, body `{"context":{"invalid_symbols":["SOM:USDso"]},"description":"unknown market symbols: SOM:USDso","name":"invalid_param","status":400}`.
- `GET /v0/tickers?symbols=SOM:USDso` → 400, same body shape. `GET /v0/tickers?symbols=SOMI:USDso,WETH:USDso` → 400, same body shape.
- Control: `GET /v0/orderbooks?symbols=SOMI:USDso&symbols=WETH:USDso` → 200 with both order books; `GET /v0/tickers?symbols=SOMI:USDso&symbols=WETH:USDso` → 200 with both tickers. `GET /v0/markets` → 200 listing exactly the documented testnet symbols (SOMI:USDso, WBTC:USDso, WETH:USDso), so the symbols used above are the live ones.
## Environment
SDK version: n/a (raw HTTP), docs at docs.dreamdex.io (HTTP API → Market Data); network: Somnia Shannon testnet (staging API, chain 50312); wallet address: N/A — read-only testing, no wallet used
