import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";

function dumpErr(e, depth = 0) {
  if (!e || depth > 6) return;
  console.log("  ".repeat(depth) + `${e.name ?? "Err"}: ${String(e.message ?? e).slice(0, 500)}`);
  if (e.cause) dumpErr(e.cause, depth + 1);
  if (e.details) console.log("  ".repeat(depth) + "details:", String(e.details).slice(0, 300));
}
const markets = new SomniaMarkets({
  chain: hidekiTestnet,
  indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql",
  addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES,
});
const BANK = "0x478769E1177C0773c43A593DCCc4Ad15F15F1394";
for (const [label, fn] of [
  ["client.getBlockNumber()", () => markets.client.getBlockNumber()],
  ["client.getPerpSystemConfig(BANK)", () => markets.client.getPerpSystemConfig(BANK)],
  ["client.getBlockNumber() again", () => markets.client.getBlockNumber()],
]) {
  try {
    const out = await fn();
    console.log(`OK ${label} ->`, typeof out === "object" ? JSON.stringify(out).slice(0, 200) : out);
  } catch (e) {
    console.log(`FAIL ${label}:`);
    dumpErr(e);
  }
}
process.exit(0);
