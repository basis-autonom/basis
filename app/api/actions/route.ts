import { NextResponse } from "next/server";
import {
  decodeAbiParameters,
  parseAbi,
  type Address,
} from "viem";
import { publicClient as robinhoodClient } from "@/packages/core/chain";

export const dynamic = "force-dynamic";

const actionAbi = [
  {
    inputs: [],
    name: "uiMultiplier",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "newUIMultiplier",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "effectiveAt",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
const updateEventAbi = parseAbi(["event UIMultiplierUpdated(uint256,uint256)"]);

type Asset = {
  tokenSymbol?: string;
  tokenName?: string;
  deployments?: Array<{ chainId?: number; contractAddress?: string }>;
};

type TokenSnapshot = {
  address: Address;
  symbol: string;
  name: string;
  currentMultiplier: number | null;
  pendingMultiplier: number | null;
  effectiveAt: number | null;
  totalSupply: string | null;
};

type HistoryRow = {
  symbol: string;
  address: Address;
  type: "Dividend" | "Split" | null;
  oldMultiplier: number | null;
  newMultiplier: number | null;
  valueChange: number | null;
  date: number | null;
};

const ACTIONS_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Corporate-action read timed out.")), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function rawMultiplier(value: unknown) {
  if (typeof value !== "bigint") return null;
  return Number(value) / 1e18;
}

function classify(oldValue: number | null, newValue: number | null) {
  if (oldValue == null || newValue == null || oldValue <= 0 || newValue <= 0) return null;
  const ratio = newValue / oldValue;
  return ratio >= 2 || ratio <= 0.5 ? ("Split" as const) : ("Dividend" as const);
}

async function readAssets(): Promise<Asset[]> {
  const response = await fetch("https://api.robinhood.com/rhj/assets", {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("The official stock-token registry returned an error.");
  const body = (await response.json()) as { assets?: Asset[] };
  if (!Array.isArray(body.assets)) throw new Error("The official stock-token registry returned an invalid response.");
  return body.assets;
}

async function readHistory(tokens: TokenSnapshot[], toBlock: bigint) {
  if (tokens.length === 0) return [];

  const tokensByAddress = new Map(
    tokens.map((token) => [token.address.toLowerCase(), token]),
  );
  const logs = await robinhoodClient.getLogs({
    address: tokens.map((token) => token.address),
    event: updateEventAbi[0],
    fromBlock: 0n,
    // Resolve latest first so the response records the exact complete range
    // that was queried instead of relying on an RPC's implicit latest tag.
    toBlock,
  });

  return logs.flatMap((log) => {
    const token = tokensByAddress.get(log.address.toLowerCase());
    if (!token) return [];

    const [oldRaw, newRaw] = decodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }],
      log.data,
    );
    const oldMultiplier = rawMultiplier(oldRaw);
    const newMultiplier = rawMultiplier(newRaw);
    return [{
      symbol: token.symbol,
      address: token.address,
      type: classify(oldMultiplier, newMultiplier),
      oldMultiplier,
      newMultiplier,
      valueChange:
        oldMultiplier != null && newMultiplier != null && oldMultiplier > 0
          ? (newMultiplier / oldMultiplier - 1) * 100
          : null,
      date: null,
      blockNumber: log.blockNumber,
    }];
  });
}

async function readActions() {
  try {
    const assets = await readAssets();
    const tokens = assets.flatMap((asset) => {
      const deployment = asset.deployments?.find(
        (item) => item.chainId === 4663 && item.contractAddress,
      );
      if (!deployment?.contractAddress || !asset.tokenSymbol) return [];
      return [{
        address: deployment.contractAddress.toLowerCase() as Address,
        symbol: asset.tokenSymbol,
        name: asset.tokenName || asset.tokenSymbol,
      }];
    });

    const calls = tokens.flatMap((token) =>
      ["uiMultiplier", "newUIMultiplier", "effectiveAt", "totalSupply"].map(
        (functionName) => ({
          address: token.address,
          abi: actionAbi,
          functionName,
        }),
      ),
    );
    const results = await robinhoodClient.multicall({ contracts: calls });
    const snapshots: TokenSnapshot[] = tokens.map((token, index) => {
      const resultAt = (offset: number) => results[index * 4 + offset];
      const current = resultAt(0);
      const pending = resultAt(1);
      const effective = resultAt(2);
      const supply = resultAt(3);
      const effectiveRaw = effective?.status === "success" && typeof effective.result === "bigint"
        ? Number(effective.result)
        : null;
      return {
        ...token,
        currentMultiplier: current?.status === "success" ? rawMultiplier(current.result) : null,
        pendingMultiplier: pending?.status === "success" ? rawMultiplier(pending.result) : null,
        effectiveAt: effectiveRaw && effectiveRaw > 0 ? effectiveRaw * 1000 : null,
        totalSupply: supply?.status === "success" && typeof supply.result === "bigint"
          ? supply.result.toString()
          : null,
      };
    });

    const now = Date.now();
    const scheduled = snapshots.filter(
      (token) =>
        token.effectiveAt != null &&
        token.effectiveAt > now &&
        token.currentMultiplier != null &&
        token.pendingMultiplier != null &&
        token.pendingMultiplier !== token.currentMultiplier,
    );

    let history: Awaited<ReturnType<typeof readHistory>> = [];
    let historyUnavailable = false;
    let historyToBlock: bigint | null = null;
    try {
      historyToBlock = await robinhoodClient.getBlockNumber();
      history = await readHistory(snapshots, historyToBlock);
    } catch (error) {
      historyUnavailable = true;
      console.error("Corporate-action history read failed:", error);
    }
    const blockNumbers = [...new Set(
      history.flatMap((row) => row.blockNumber == null ? [] : [row.blockNumber]),
    )];
    const blockDates = new Map<bigint, number>();
    await Promise.all(blockNumbers.map(async (blockNumber) => {
      try {
        const block = await robinhoodClient.getBlock({ blockNumber });
        blockDates.set(blockNumber, Number(block.timestamp) * 1000);
      } catch {
        // A missing block timestamp makes only this event's date unknown.
      }
    }));

    const historyRows: HistoryRow[] = history.map((row) => ({
      symbol: row.symbol,
      address: row.address,
      type: row.type,
      oldMultiplier: row.oldMultiplier,
      newMultiplier: row.newMultiplier,
      valueChange: row.valueChange,
      date: row.blockNumber == null ? null : blockDates.get(row.blockNumber) ?? null,
    }));

    return NextResponse.json({
      kind: "success",
      tokens: snapshots,
      scheduled,
      history: historyRows,
      historyStatus: historyUnavailable ? "partial" : "complete",
      // Audit metadata: complete means one successful getLogs query from
      // genesis through the resolved latest block. A null end block is
      // intentionally partial; the endpoint never calls that complete.
      historyRange: {
        fromBlock: "0",
        toBlock: historyToBlock?.toString() ?? null,
        complete: !historyUnavailable && historyToBlock != null,
      },
    });
  } catch (error) {
    return NextResponse.json({
      kind: "error",
      source: "registry-or-chain",
      message: error instanceof Error ? error.message : "The on-chain corporate-action read failed.",
    }, { status: 503 });
  }
}

export async function GET() {
  try {
    return await withTimeout(readActions(), ACTIONS_TIMEOUT_MS);
  } catch (error) {
    return NextResponse.json({
      kind: "error",
      source: "timeout",
      message: error instanceof Error
        ? error.message
        : "The on-chain corporate-action read timed out.",
    }, { status: 503 });
  }
}
