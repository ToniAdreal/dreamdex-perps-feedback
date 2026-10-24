// On-chain read-only verification via viem HTTP transport (proxy-aware fetch).
// No wallet, no signer, eth_call only.
import { createPublicClient, http } from "viem";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
import * as ReadsAbi from "./node_modules/@somnia-chain/markets-sdk/dist/readsAbi.js";
import { readFileSync, writeFileSync } from "node:fs";

const RPC = "https://api.hideki2.infra.testnet.somnia.network";
const client = createPublicClient({ chain: hidekiTestnet, transport: http(RPC) });
const J = (_, v) => (typeof v === "bigint" ? v.toString() : v);

const BANK = "0x478769E1177C0773c43A593DCCc4Ad15F15F1394";
const cfg = await client.readContract({ address: BANK, abi: ReadsAbi.marginBankReadAbi, functionName: "getSystemConfig" });
const cfgOut = {
  marginBank: cfg.marginBank, collateralToken: cfg.collateralToken, perpPoolFactory: cfg.perpPoolFactory,
  liquidationEngine: cfg.liquidationEngine, insuranceFund: cfg.insuranceFund, feeRecipient: cfg.feeRecipient,
  maxLeverageLimit: cfg.maxLeverageLimit?.toString(), fullyWired: cfg.fullyWired,
};
console.log("getSystemConfig:", JSON.stringify(cfgOut, null, 1));
writeFileSync(new URL("./evidence/system-config.json", import.meta.url), JSON.stringify(cfgOut, null, 2));

const markets = JSON.parse(readFileSync(new URL("./evidence/markets.json", import.meta.url), "utf8"));
const rows = [];
for (const m of markets) {
  const pool = m.poolAddress;
  const [params, bookParams, oi] = await Promise.all([
    client.readContract({ address: pool, abi: ReadsAbi.perpPoolReadAbi, functionName: "getPerpPoolParameters" }),
    client.readContract({ address: pool, abi: ReadsAbi.perpPoolReadAbi, functionName: "getOrderBookParameters" }),
    client.readContract({ address: pool, abi: ReadsAbi.perpPoolReadAbi, functionName: "getOpenInterest" }),
  ]);
  const row = {
    symbol: m.baseSymbol, baseDecimals: m.baseDecimals, pool,
    initialMarginBps: params.initialMarginBps.toString(), maintenanceMarginBps: params.maintenanceMarginBps.toString(),
    maxOpenInterestRaw: params.maxOpenInterest.toString(),
    maxOpenInterest: Number(params.maxOpenInterest) / 10 ** m.baseDecimals,
    maxPositionSizeRaw: params.maxPositionSize.toString(),
    takerFeeBpsTimes1k: params.takerFeeBpsTimes1k.toString(), makerFeeBpsTimes1k: params.makerFeeBpsTimes1k.toString(),
    bookTickSize: bookParams.tickSize.toString(), bookMinQuantity: bookParams.minQuantity.toString(), bookLotSize: bookParams.lotSize.toString(),
    onchainOpenInterestRaw: oi.toString(), onchainOpenInterest: Number(oi) / 10 ** m.baseDecimals,
    indexerOpenInterest: Number(m.openInterest) / 10 ** m.baseDecimals,
    indexerTickSize: m.tickSize, indexerMinQuantity: m.minQuantity, indexerLotSize: m.lotSize,
  };
  rows.push(row);
  console.log(`${row.symbol}: imBps=${row.initialMarginBps} mmBps=${row.maintenanceMarginBps} maxOI=${row.maxOpenInterest} onchainOI=${row.onchainOpenInterest} indexerOI=${row.indexerOpenInterest} takerFee=${row.takerFeeBpsTimes1k} makerFee=${row.makerFeeBpsTimes1k} bookTick=${row.bookTickSize} bookMin=${row.bookMinQuantity} bookLot=${row.bookLotSize}`);
}
writeFileSync(new URL("./evidence/pool-params.json", import.meta.url), JSON.stringify(rows, J, 2));
console.log("DONE");
