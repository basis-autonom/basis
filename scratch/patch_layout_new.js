const fs = require('fs');
let code = fs.readFileSync('app/(terminal)/layout.tsx', 'utf8');

code = code.replace(
  'boardRows = await getBoardData(12);',
  'const result = await getBoardData(12);\n    if (result.kind === "error") {\n      isRpcError = true;\n    } else {\n      boardRows = result.data;\n    }'
);

fs.writeFileSync('app/(terminal)/layout.tsx', code);
