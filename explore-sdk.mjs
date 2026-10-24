// Read-only exploration of dreamDEX perps testnet via @somnia-chain/markets-sdk 0.32.1
// No privateKey is configured anywhere: no wallet exists in this process.
import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
import { writeFileSync } from "node:fs";

const INDEXER = "https://hideki-dev.smk.somnia.host/v1/graphql";
const RPC = "https://api.hideki2.infra.testnet.somnia.network";
const ev = (name, obj) =>
  writeFileSync(new URL(`./evidence/${name}`, import.meta.url), JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));

const timeout = (p, ms, label) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`TIMEOUT ${label} after ${ms}ms`)), ms))]);

async function attempt(label, fn) {
  try {
    const out = await timeout(fn(), 45000, label);
    console.log(`OK   ${label}`);
    return { ok: true, out };
  } catch (e) {
    console.log(`FAIL ${label}: ${e?.name ?? "Error"}: ${String(e?.message ?? e).slice(0, 400)}`);
    return { ok: false, error: `${e?.name ?? "Error"}: ${String(e?.message ?? e).slice(0, 1000)}` };
  }
}

// ---- Raw JSON-RPC checks (HTTP) ----
async function rpc(method, params = []) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const text = await res.text();
  return { status: res.status, body: text };
}
const rpcOut = {};
rpcOut.chainId = await attempt("rpc eth_chainId", () => rpc("eth_chainId"));
rpcOut.blockNumber = await attempt("rpc eth_blockNumber", () => rpc("eth_blockNumber"));
const DOC_CONTRACTS = {
  MarginBank: "0x478769E1177C0773c43A593DCCc4Ad15F15F1394",
  Collateral_USDso: "0xed7993A74dAe1e6656B704A424DcD8711aAf4F72",
  PerpPoolFactory: "0xE631fAEE547baeE07353E290f0562ea67d856560",
  LiquidationEngine: "0xA66d3C24Ad4a389d863846905D8173e1017e9F4D",
  InsuranceFund: "0x50826894D47C6D4f3BeA38BFDC7Dc5c5be171b80",
  VoucherDistributor: "0x2ACD9EFdA721450906bfE1bef3edE269636E42C4",
  OperatorPermissionsRegistry: "0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE8D3a",
};
rpcOut.getCode = {};
for (const [name, addr] of Object.entries(DOC_CONTRACTS)) {
  const r = await rpc("eth_getCode", [addr, "latest"]);
  const code = JSON.parse(r.body).result ?? "";
  rpcOut.getCode[name] = { address: addr, codeLengthBytes: (code.length - 2) / 2 };
  console.log(`code ${name}: ${(code.length - 2) / 2} bytes`);
}
ev("rpc-checks.json", rpcOut);

// ---- SDK read-only (docs Connect snippet, privateKey omitted) ----
const markets = new SomniaMarkets({
  chain: hidekiTestnet,
  indexerUrl: INDEXER,
  addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES,
  // privateKey intentionally omitted -> read-only
});
console.log("walletAddress:", markets.walletAddress ?? null);

const lm = await attempt("client.listPerpMarkets()", () => markets.client.listPerpMarkets());
if (lm.ok) {
  ev("markets.json", lm.out);
  console.log(`markets count: ${lm.out.length}`);
  for (const m of lm.out) {
    console.log(
      [m.baseSymbol, "baseDec=" + m.baseDecimals, "quoteDec=" + m.quoteDecimals, "tick=" + m.tickSize, "lot=" + m.lotSize,
       "minQty=" + m.minQuantity, "imBps=" + m.initialMarginBps, "pool=" + m.poolAddress, "bank=" + m.marginBank,
       "quote=" + m.quoteToken, "mark=" + m.markPrice, "fundingWin=" + m.fundingWindowSec].join(" | ")
    );
  }
  const btc = lm.out.find((m) => m.baseSymbol === "BTC");
  if (btc) {
    const sc = await attempt("client.getPerpSystemConfig(btc.marginBank)", () => markets.client.getPerpSystemConfig(btc.marginBank));
    if (sc.ok) { ev("system-config.json", sc.out); console.log("systemConfig:", JSON.stringify(sc.out)); }
    const stats = await attempt("client.getMarketStats24h({pool: btc.poolAddress})", () => markets.client.getMarketStats24h({ pool: btc.poolAddress }));
    if (stats.ok) { ev("btc-stats24h.json", stats.out); console.log("stats24h:", JSON.stringify(stats.out, (_,v)=>typeof v==="bigint"?v.toString():v).slice(0, 600)); }
    const frh = await attempt("client.getFundingRateHistory(btc.poolAddress, {limit:5})", () => markets.client.getFundingRateHistory(btc.poolAddress, { limit: 5 }));
    if (frh.ok) { ev("btc-funding-history.json", frh.out); console.log("fundingHistory entries:", frh.out.length); }
    if (typeof markets.client.getPerpState === "function") {
      const ps = await attempt("client.getPerpState(btc.poolAddress)", () => markets.client.getPerpState(btc.poolAddress));
      if (ps.ok) { ev("btc-perp-state.json", ps.out); console.log("perpState:", JSON.stringify(ps.out, (_,v)=>typeof v==="bigint"?v.toString():v).slice(0, 600)); }
    } else {
      console.log("client.getPerpState is not a function on the client");
    }
    // Order book attempts (read-only chain reads)
    const bookTries = [
      ["client.getBookLevels(btc.poolAddress)", () => markets.client.getBookLevels(btc.poolAddress)],
      ["client.getBookLevels({pool})", () => markets.client.getBookLevels({ pool: btc.poolAddress })],
      ["client.getBookTops({pool})", () => markets.client.getBookTops({ pool: btc.poolAddress })],
    ];
    for (const [label, fn] of bookTries) {
      if (typeof markets.client[label.split("(")[0].split(".")[1]] !== "function") { console.log(`SKIP ${label}: not a function`); continue; }
      const b = await attempt(label, fn);
      if (b.ok) { ev("btc-book.json", b.out); console.log("book sample:", JSON.stringify(b.out, (_,v)=>typeof v==="bigint"?v.toString():v).slice(0, 600)); break; }
    }
  }
}
console.log("DONE");
process.exit(0);
