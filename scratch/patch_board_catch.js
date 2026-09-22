const fs = require('fs');
let code = fs.readFileSync('packages/core/board.ts', 'utf8');

code = code.replace(
  'const [allPools, registry] = await Promise.all([\n    getRobinhoodPools(100),\n    fetchRegistry(),\n  ]);',
  'let allPools, registry;\n  try {\n    [allPools, registry] = await Promise.all([\n      getRobinhoodPools(100),\n      fetchRegistry(),\n    ]);\n  } catch (error) {\n    return { kind: "error", reason: "pool_lookup_failed" };\n  }'
);

fs.writeFileSync('packages/core/board.ts', code);
