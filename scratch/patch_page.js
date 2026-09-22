const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

code = code.replace(
  'let board: LandingBoardRow[] = [];',
  'let board: LandingBoardRow[] = [];\n  let isRpcError = false;'
);

code = code.replace(
  'console.error("Error fetching landing board data", error);',
  'console.error("Error fetching landing board data", error);\n    isRpcError = true;'
);

code = code.replace(
  '<Hero rows={board} />',
  '<Hero rows={board} isRpcError={isRpcError} />'
);

fs.writeFileSync('app/page.tsx', code);
