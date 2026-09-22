const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

code = code.replace(
  'board = await getBoardData(25);',
  'const result = await getBoardData(25);\n    if (result.kind === "error") {\n      isRpcError = true;\n    } else {\n      board = result.data;\n    }'
);

fs.writeFileSync('app/page.tsx', code);
