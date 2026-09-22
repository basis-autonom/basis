const fs = require('fs');
let code = fs.readFileSync('app/api/cron/watch/route.ts', 'utf8');
code = code.replace(
  'import { runWatcher } from "@/jobs/watcher";',
  'import { runWatcher } from "@/jobs/watcher";\nimport { capturePoolSnapshots } from "@/packages/core/snapshots";'
);
code = code.replace(
  'const watcher = await runWatcher();',
  'const watcher = await runWatcher();\n    const snapshotsStored = await capturePoolSnapshots();'
);
fs.writeFileSync('app/api/cron/watch/route.ts', code);
