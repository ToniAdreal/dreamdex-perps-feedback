// Public WebSocket feed probe (read-only): ping/pong, orderbook subscribe, unknown channel.
import { writeFileSync } from "node:fs";
const ws = new WebSocket("wss://stg.api.dreamdex.io/v0/ws/public");
const log = [];
const done = (code) => { writeFileSync(new URL("./evidence/ws-feed.json", import.meta.url), JSON.stringify(log, null, 1)); console.log(JSON.stringify(log, null, 1).slice(0, 2000)); process.exit(code); };
const to = setTimeout(() => { log.push({ event: "timeout-20s" }); done(2); }, 20000);
ws.onopen = () => {
  log.push({ event: "open" });
  ws.send(JSON.stringify({ operation: "ping" }));
  ws.send(JSON.stringify({ operation: "subscribe", channel: "orderbook", params: { symbols: ["SOMI:USDso"] } }));
  ws.send(JSON.stringify({ operation: "subscribe", channel: "nope-channel", params: {} }));
};
let msgs = 0;
ws.onmessage = (ev) => {
  const s = String(ev.data);
  log.push({ event: "message", data: s.slice(0, 700) });
  if (++msgs >= 5) { clearTimeout(to); ws.close(); done(0); }
};
ws.onerror = (e) => { log.push({ event: "error", data: String(e.message ?? e.type) }); };
ws.onclose = (e) => { log.push({ event: "close", code: e.code }); if (msgs < 5) { clearTimeout(to); done(0); } };
