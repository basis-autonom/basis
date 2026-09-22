const fs = require('fs');
let code = fs.readFileSync('app/api/cron/watch/route.ts', 'utf8');

code = code.replace(
  'getBoardData(100),\n      getFloatBoardData(),\n    ]);\n\n    return NextResponse.json({',
  'getBoardData(100),\n      getFloatBoardData(),\n    ]);\n    if (board.kind === "error") throw new Error("RPC error");\n\n    return NextResponse.json({'
);

fs.writeFileSync('app/api/cron/watch/route.ts', code);
