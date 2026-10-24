import { writeFileSync } from "node:fs";
const BASE = "https://stg.api.dreamdex.io";
async function probe(name, path) {
  try {
    const res = await fetch(BASE + path);
    const text = await res.text();
    console.log(`${name}: HTTP ${res.status} error-name=${res.headers.get("error-name")} body=${text.slice(0, 220).replace(/\s+/g, " ")}`);
    return { request: `GET ${BASE}${path}`, status: res.status, errorNameHeader: res.headers.get("error-name"), body: text.slice(0, 1500) };
  } catch (e) { console.log(`${name}: FETCH ERROR ${e?.message ?? e}`); return { fetchError: String(e?.message ?? e) }; }
}
const out = {};
out["tickers-bad-symbol"] = await probe("tickers-bad-symbol", "/v0/tickers?symbols=SOM:USDso");
out["tickers-comma"] = await probe("tickers-comma", "/v0/tickers?symbols=SOMI:USDso,WETH:USDso");
out["tickers-repeated"] = await probe("tickers-repeated", "/v0/tickers?symbols=SOMI:USDso&symbols=WETH:USDso");
const nowMs = Date.now();
const untilOk = nowMs - 31 * 60e3, sinceOk = untilOk - 3600e3;
out["volume-epoch-valid"] = await probe("volume-epoch-valid", `/v0/markets/SOMI:USDso/volume?since=${sinceOk}&until=${untilOk}`);
out["volume-epoch-until-now"] = await probe("volume-epoch-until-now", `/v0/markets/SOMI:USDso/volume?since=${nowMs - 3600e3}&until=${nowMs}`);
const untilSec = Math.floor(nowMs / 1000) - 31 * 60, sinceSec = untilSec - 3600;
out["volume-seconds-valid"] = await probe("volume-seconds-valid", `/v0/markets/SOMI:USDso/volume?since=${sinceSec}&until=${untilSec}`);
out["candles-7d-interval"] = await probe("candles-bad-value-2h", "/v0/markets/SOMI:USDso/candles?interval=2h");
writeFileSync(new URL("./evidence/http-probes-2.json", import.meta.url), JSON.stringify(out, null, 1));
console.log("DONE");
