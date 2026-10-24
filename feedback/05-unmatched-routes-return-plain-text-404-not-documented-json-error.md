# Unmatched routes under /v0 return a plain-text "404 page not found", not the documented consistent JSON error format
Severity: normal
Area: API
## Steps to reproduce
1. Read the Error Handling page (docs.dreamdex.io → Developers → HTTP API → Error Handling): "All error responses use a consistent JSON format: { "status": ..., "name": ..., "description": ... }", and "The `Error-Name` response header also contains the error name for quick inspection without parsing the body."
2. Against the testnet (staging) API, request paths that do not match a route:
   - `GET https://stg.api.dreamdex.io/v0/definitely-not-a-route`
   - `GET https://stg.api.dreamdex.io/v0/markets/SOMI:USDso/orderbook` (the Market Data page says this per-market path 404s)
   - `GET https://stg.api.dreamdex.io/v0/orderbooks/SOMI:USDso` (same)
3. Control: trigger an API-level 404, e.g. `GET https://stg.api.dreamdex.io/v0/markets/SOM:USDso/volume`.
## Expected
Per the Error Handling page, every error response — including these 404s — uses the JSON format with `status`/`name`/`description` and an `Error-Name` header (presumably `name: "market_not_found"` or a generic not-found name for unmatched routes).
## Actual
All three unmatched-route requests return **HTTP 404 with a plain-text body** `404 page not found`, `Content-Type: text/plain`, and **no `Error-Name` header** — the Go HTTP mux default, outside the documented error contract. The control request shows the API can and does follow its own format for API-level errors: `GET /v0/markets/SOM:USDso/volume` → 404 with `Error-Name: market_not_found` and body `{"description":"market not found: SOM:USDso","name":"market_not_found","status":404}`.

The practical cost: a client that mistypes a path (the exact failure mode the Market Data page warns about for order books — "There is no per-market path... both 404") gets an unparseable text body and no error name, so generic error handling written against the documented contract breaks on the most common integration mistake. Authentic 401s follow the format too (`{"description":"authentication required","name":"unauthorized","status":401}` with header), so the gap is specific to routing-level 404s.
## Evidence
Captured 2026-10-24 against https://stg.api.dreamdex.io:
- `GET /v0/definitely-not-a-route` → 404, content-type text/plain, Error-Name header absent, body `404 page not found`.
- `GET /v0/markets/SOMI:USDso/orderbook` → 404, same plain-text body, no Error-Name header.
- `GET /v0/orderbooks/SOMI:USDso` → 404, same plain-text body, no Error-Name header.
- `GET /markets` (missing the required `/v0` prefix; the HTTP API overview says this returns a 404) → 404, same plain-text body.
- Control: `GET /v0/markets/SOM:USDso/volume` → 404 JSON `market_not_found` with `Error-Name: market_not_found`; `GET /v0/trades` without credentials → 401 JSON `unauthorized` with `Error-Name: unauthorized`.
## Environment
SDK version: n/a (raw HTTP), docs at docs.dreamdex.io (HTTP API → Error Handling, Market Data); network: Somnia Shannon testnet (staging API, chain 50312); wallet address: N/A — read-only testing, no wallet used
