const fs = require('fs');

let boardCode = fs.readFileSync('packages/core/board.ts', 'utf8');
boardCode = boardCode.replace(
  'if (selected.length === 0) return [];',
  'if (selected.length === 0) return { kind: "success", data: [] };'
);
fs.writeFileSync('packages/core/board.ts', boardCode);

let watchCode = fs.readFileSync('app/api/cron/watch/route.ts', 'utf8');
watchCode = watchCode.replace(
  'boardRows: board.length,',
  'boardRows: board.kind === "success" ? board.data.length : 0,'
);
fs.writeFileSync('app/api/cron/watch/route.ts', watchCode);

let watcherCode = fs.readFileSync('jobs/watcher.ts', 'utf8');
watcherCode = watcherCode.replace(
  'const board = (await getBoardData(100)) as BoardRow[];',
  'const boardResult = await getBoardData(100);\n  const board = (boardResult.kind === "success" ? boardResult.data : []) as BoardRow[];'
);
fs.writeFileSync('jobs/watcher.ts', watcherCode);
