const fs = require('fs');
let code = fs.readFileSync('packages/core/board.ts', 'utf8');

code = code.replace(
  'export async function getBoardData(limit = 25) {',
  'export type BoardResult = { kind: "success"; data: any[] } | { kind: "error"; reason: "rpc_unavailable" | "pool_lookup_failed" };\n\nexport async function getBoardData(limit = 25): Promise<BoardResult> {'
);

code = code.replace(
  '    if (error instanceof PoolLookupUnavailableError) {\n      throw error;\n    }\n    return [];\n  }',
  '    if (error instanceof PoolLookupUnavailableError) {\n      return { kind: "error", reason: "pool_lookup_failed" };\n    }\n    return { kind: "success", data: [] };\n  }'
);

code = code.replace(
  'if (selected.length > 0 && rows.length === 0) {\n    throw new Error("RPC data fetch failed for all pools");\n  }\n  return rows;',
  'if (selected.length > 0 && rows.length === 0) {\n    return { kind: "error", reason: "rpc_unavailable" };\n  }\n  return { kind: "success", data: rows };'
);

fs.writeFileSync('packages/core/board.ts', code);
