const fs = require('fs');
let code = fs.readFileSync('packages/core/board.ts', 'utf8');

if (!code.includes('throw new Error("RPC data fetch failed for all pools");')) {
  code = code.replace(
    'return rows;',
    'if (selected.length > 0 && rows.length === 0) {\n    throw new Error("RPC data fetch failed for all pools");\n  }\n  return rows;'
  );
  fs.writeFileSync('packages/core/board.ts', code);
}
