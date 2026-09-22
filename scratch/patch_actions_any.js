const fs = require('fs');
let code = fs.readFileSync('app/api/actions/route.ts', 'utf8');

code = code.replace(
  'return logs.flatMap((log) => {',
  'return logs.flatMap((log: any) => {'
);
code = code.replace(
  'history.flatMap((row) => row.blockNumber == null ? [] : [row.blockNumber]),',
  'history.flatMap((row: any) => row.blockNumber == null ? [] : [row.blockNumber]),'
);
code = code.replace(
  'blockDates.set(blockNumber, Number(block.timestamp) * 1000);',
  'blockDates.set(blockNumber as bigint, Number(block.timestamp) * 1000);'
);
code = code.replace(
  'history.some((row) => row.address.toLowerCase() === token.address.toLowerCase()),',
  'history.some((row: any) => row.address.toLowerCase() === token.address.toLowerCase()),'
);
code = code.replace(
  'const historyRows: HistoryRow[] = history.map((row) => {',
  'const historyRows: HistoryRow[] = history.map((row: any) => {'
);

fs.writeFileSync('app/api/actions/route.ts', code);
