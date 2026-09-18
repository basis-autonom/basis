import { keccak256, toBytes } from "viem";

const rpcUrl = process.env.RPC_URL?.trim();
if (!rpcUrl) throw new Error("RPC_URL is required.");

const addresses = {
  MSFT: "0xe93237C50D904957Cf27E7B1133b510C669c2e74",
  GOOGL: "0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3",
  JNJ: "0x03DfbBE0AC4E7bCDaFd08eD41A400326B77D8c80",
  IBM: "0x980dcf6766FA79f5Cf0c4AAdb3ab477ff15a9619",
  NVDA: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC",
} as const;

const selectors = {
  uiMultiplier: keccak256(toBytes("uiMultiplier()" )).slice(0, 10),
  newUIMultiplier: keccak256(toBytes("newUIMultiplier()" )).slice(0, 10),
  effectiveAt: keccak256(toBytes("effectiveAt()" )).slice(0, 10),
};

const eventSignature = "UIMultiplierUpdated(uint256,uint256,uint256)";
const eventTopic = keccak256(toBytes(eventSignature));

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(rpcUrl!, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  const body = await response.json() as { result?: T; error?: unknown };
  if (!response.ok || body.error) throw new Error(`${method}: ${JSON.stringify(body.error)}`);
  return body.result as T;
}

async function tryRpc<T>(method: string, params: unknown[]) {
  try {
    return { ok: true as const, result: await rpc<T>(method, params) };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : String(error) };
  }
}

function decodeUint(hex: string): string {
  return BigInt(hex).toString();
}

async function inspect(symbol: string, address: string, toBlock: string) {
  const [ui, newUi, effective, matchingLogs, allLogs] = await Promise.all([
    tryRpc<string>("eth_call", [{ to: address, data: selectors.uiMultiplier }, "latest"]),
    tryRpc<string>("eth_call", [{ to: address, data: selectors.newUIMultiplier }, "latest"]),
    tryRpc<string>("eth_call", [{ to: address, data: selectors.effectiveAt }, "latest"]),
    tryRpc<unknown[]>("eth_getLogs", [{ address, topics: [eventTopic], fromBlock: "0x0", toBlock }]),
    // No topic filter: inspect the contract's actual emitted topics independently.
    tryRpc<unknown[]>("eth_getLogs", [{ address, fromBlock: "0x0", toBlock }]),
  ]);

  const uiRaw = ui.ok ? ui.result : null;
  const newUiRaw = newUi.ok ? newUi.result : null;
  const effectiveRaw = effective.ok ? effective.result : null;
  const matchingLogResult = matchingLogs.ok ? matchingLogs.result : [];
  const allLogResult = allLogs.ok ? allLogs.result : [];

  return {
    symbol,
    address,
    uiMultiplierRaw: uiRaw,
    uiMultiplier: uiRaw == null ? null : Number(decodeUint(uiRaw)) / 1e18,
    newUIMultiplierRaw: newUiRaw,
    newUIMultiplier: newUiRaw == null ? null : Number(decodeUint(newUiRaw)) / 1e18,
    effectiveAtRaw: effectiveRaw,
    effectiveAt: effectiveRaw == null ? null : new Date(Number(decodeUint(effectiveRaw)) * 1000).toISOString(),
    uiMultiplierCallError: ui.ok ? null : ui.error,
    newUIMultiplierCallError: newUi.ok ? null : newUi.error,
    effectiveAtCallError: effective.ok ? null : effective.error,
    matchingUIMultiplierUpdatedLogs: matchingLogResult,
    matchingLogCount: matchingLogResult.length,
    matchingLogsError: matchingLogs.ok ? null : matchingLogs.error,
    allLogs: allLogResult,
    allLogCount: allLogResult.length,
    allLogsError: allLogs.ok ? null : allLogs.error,
  };
}

const latestBlock = await rpc<string>("eth_blockNumber", []);
const completed = await Promise.all(
  Object.entries(addresses)
    .filter(([symbol]) => symbol !== "NVDA")
    .map(([symbol, address]) => inspect(symbol, address, latestBlock)),
);
const nvda = await inspect("NVDA", addresses.NVDA, latestBlock);

console.log(JSON.stringify({
  rpc: new URL(rpcUrl).hostname,
  latestBlock,
  eventSignature,
  eventTopic,
  selectors,
  completed,
  nvda,
}, null, 2));
