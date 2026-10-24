# WebSocket error message shape does not match the Real-Time Feed docs
Severity: normal
Area: API
## Steps to reproduce
1. Connect to the testnet WebSocket feed (wss://api.hideki2.infra.testnet.somnia.network/ws).
2. Send a subscribe message for a non-existent channel, e.g. channel "nope-channel".
3. Read the error message returned by the server.
## Expected
Per the Real-Time Feed documentation's error message table, an error message carries `channel: "error"` as a required field, and the documented fields do not include an `errorName` field.
## Actual
The server returns an error message with no `channel` field at all, and with an undocumented `errorName` field instead:
{"type":"error","errorName":"unknown_channel","message":"unknown channel: nope-channel"}
## Evidence
Raw WebSocket capture (evidence/ws-feed.json in the exploration log), same session:
- Subscribe: {"channel":"orderbook","type":"subscribed","symbols":["SOMI:USDso"]} followed by a normal snapshot message — the feed itself works as documented.
- Error reply to the unknown-channel subscribe: {"type":"error","errorName":"unknown_channel","message":"unknown channel: nope-channel"}
The `type: "error"` value matches the docs; the field set does not (missing required `channel`, extra undocumented `errorName`).
## Environment
SDK version: @somnia-chain/markets-sdk 0.32.1 (raw WebSocket used for this check), network (Somnia Tokyo testnet), wallet address: N/A — read-only testing, no wallet used
