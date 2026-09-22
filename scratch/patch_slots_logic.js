const fs = require('fs');

let code = fs.readFileSync('app/api/split/[ca]/hourly/route.ts', 'utf8');

// Replace return { slot: slot0, failed: false }; with return { slot: slot0, failed: false, snapshotTs: matching.timestamp.getTime() };
code = code.replace(
  'return { slot: slot0, failed: false };',
  'return { slot: slot0, failed: false, snapshotTs: matching.timestamp.getTime() };'
);

// Replace fetchFailed condition
code = code.replace(
  'const fetchFailed = decimalsFailed || slots[index].failed || slots[sampleIndex].failed || feedReadFailed;',
  'const fetchFailed = decimalsFailed || slots[index].failed || slots[sampleIndex].failed || feedReadFailed || (slots[index].snapshotTs && slots[index].snapshotTs === slots[sampleIndex].snapshotTs);'
);

fs.writeFileSync('app/api/split/[ca]/hourly/route.ts', code);
