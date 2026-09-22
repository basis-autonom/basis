const fs = require('fs');
let code = fs.readFileSync('packages/core/attribution.ts', 'utf8');

code = code.replace(
  'const rows = await getBoardData(3);\n    return rows\n      .filter(',
  'const result = await getBoardData(3);\n    if (result.kind === "error") return [];\n    return result.data\n      .filter('
);

fs.writeFileSync('packages/core/attribution.ts', code);
