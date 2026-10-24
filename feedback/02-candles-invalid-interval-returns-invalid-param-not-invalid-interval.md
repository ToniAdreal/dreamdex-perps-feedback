# Documented error name `invalid_interval` is never returned for a bad candle interval — the API returns `invalid_param`
Severity: normal
Area: API
## Steps to reproduce
1. Read the Error Handling page (docs.dreamdex.io → Developers → HTTP API → Error Handling), "Validation (400)" table: it documents `invalid_interval` — "Unsupported candle interval". The page also says the `name` field "is stable and intended for programmatic error handling".
2. Against the testnet (staging) API, request a candle series with an unsupported interval:
   - `GET https://stg.api.dreamdex.io/v0/markets/SOMI:USDso/candles?interval=banana`
   - `GET https://stg.api.dreamdex.io/v0/markets/SOMI:USDso/candles?interval=2h`
3. Control: `GET https://stg.api.dreamdex.io/v0/markets/SOMI:USDso/candles?interval=1m`.
## Expected
HTTP 400 with `"name": "invalid_interval"`, per the Error Handling table.
## Actual
Both bad-interval requests return HTTP 400 with `"name": "invalid_param"` (also in the `Error-Name` header), and the description embeds the raw OpenAPI schema dump:

`{"description":"parameter \"interval\" in query has an error: value is not one of the allowed values [\"1m\",\"5m\",\"15m\",\"1h\",\"4h\",\"1d\"]\nSchema:\n {\n \"enum\": [...]\n ...","name":"invalid_param","status":400}`

So a client that switches on the documented `invalid_interval` name will never match it on this endpoint — every unsupported interval (nonsense values and plausible-but-unsupported ones like `2h` alike) surfaces as the generic `invalid_param`. The control request with `interval=1m` returns HTTP 200 with candle data, so the endpoint itself works; only the error name differs from the documentation.
## Evidence
Captured 2026-10-24 against https://stg.api.dreamdex.io:
- `GET /v0/markets/SOMI:USDso/candles?interval=banana` → 400, `Error-Name: invalid_param`, body as above (allowed values listed by the API itself: 1m, 5m, 15m, 1h, 4h, 1d).
- `GET /v0/markets/SOMI:USDso/candles?interval=2h` → 400, `Error-Name: invalid_param`, same description shape.
- `GET /v0/markets/SOMI:USDso/candles?interval=1m` → 200, `{"candles":[{"close":"0.1783","high":"0.1788","low":"0.1783","open":"0.1787","timestamp":1792833600000,"volume":"150"}, ...]}`.
## Environment
SDK version: n/a (raw HTTP), docs at docs.dreamdex.io (HTTP API → Error Handling); network: Somnia Shannon testnet (staging API, chain 50312); wallet address: N/A — read-only testing, no wallet used
