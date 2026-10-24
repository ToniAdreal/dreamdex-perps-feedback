// Read-only HTTP API probes against dreamDEX staging (Somnia Shannon testnet).
// GET only. No auth, no signing, no order endpoints called with POST/PATCH/DELETE.
import { writeFileSync } from "node:fs";

const BASE = "https://stg.api.dreamdex.io";
const probes = [
  ["markets", "/v0/markets"],
  ["currencies", "/v0/currencies"],
  ["orderbooks-single", "/v0/orderbooks?symbols=SOMI:USDso"],
  ["orderbooks-comma", "/v0/orderbooks?symbols=SOMI:USDso,WETH:USDso"],
  ["orderbooks-repeated", "/v0/orderbooks?symbols=SOMI:USDso&symbols=WETH:USDso"],
  ["orderbooks-bad-symbol", "/v0/orderbooks?symbols=SOM:USDso"],
  ["orderbook-per-market-path", "/v0/markets/SOMI:USDso/orderbook"],
  ["orderbook-path-form", "/v0/orderbooks/SOMI:USDso"],
  ["no-v0-prefix", "/markets"],
  ["tickers-all", "/v0/tickers"],
  ["tickers-one-market", "/v0/markets/SOMI:USDso/tickers"],
  ["trades", "/v0/markets/SOMI:USDso/trades"],
  ["candles-1m", "/v0/markets/SOMI:USDso/candles?interval=1m"],
  ["candles-bad-interval", "/v0/markets/SOMI:USDso/candles?interval=banana"],
  ["volume-default", "/v0/markets/SOMI:USDso/volume"],
  ["volume-bad-market", "/v0/markets/SOM:USDso/volume"],
  ["auth-nonce", "/v0/auth/nonce"],
  ["private-trades-noauth", "/v0/trades"],
  ["private-orders-noauth", "/v0/markets/SOMI:USDso/orders"],
  ["unknown-route", "/v0/definitely-not-a-route"],
];
const out = {};
for (const [name, path] of probes) {
  try {
    const res = await fetch(BASE + path);
    const text = await res.text();
    out[name] = {
      request: `GET ${BASE}${path}`,
      status: res.status,
      errorNameHeader: res.headers.get("error-name"),
      contentType: res.headers.get("content-type"),
      body: text.slice(0, 1500),
    };
    console.log(`${name}: HTTP ${res.status} error-name=${res.headers.get("error-name")} body=${text.slice(0, 160).replace(/\s+/g, " ")}`);
  } catch (e) {
    out[name] = { request: `GET ${BASE}${path}`, fetchError: String(e?.message ?? e) };
    console.log(`${name}: FETCH ERROR ${e?.message ?? e}`);
  }
}
// Volume with an `until` newer than 30 minutes ago (docs: must be rejected)
const now = new Date().toISOString();
const since = new Date(Date.now() - 3600e3).toISOString();
const p = `/v0/markets/SOMI:USDso/volume?since=${encodeURIComponent(since)}&until=${encodeURIComponent(now)}`;
try {
  const res = await fetch(BASE + p);
  const text = await res.text();
  out["volume-until-too-new"] = { request: `GET ${BASE}${p}`, status: res.status, errorNameHeader: res.headers.get("error-name"), body: text.slice(0, 1500) };
  console.log(`volume-until-too-new: HTTP ${res.status} error-name=${res.headers.get("error-name")} body=${text.slice(0, 200).replace(/\s+/g, " ")}`);
} catch (e) {
  console.log("volume-until-too-new FETCH ERROR", e?.message ?? e);
}
writeFileSync(new URL("./evidence/http-probes.json", import.meta.url), JSON.stringify(out, null, 1));
console.log("DONE");
