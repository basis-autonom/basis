const fs = require('fs');
let code = fs.readFileSync('app/api/split/[ca]/hourly/route.ts', 'utf8');
code = code.replace(
  'type HistoricalSlot = { slot: Slot0 | null; failed: boolean };',
  'type HistoricalSlot = { slot: Slot0 | null; failed: boolean; snapshotTs?: number };'
);
fs.writeFileSync('app/api/split/[ca]/hourly/route.ts', code);
