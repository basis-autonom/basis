const fs = require('fs');
let code = fs.readFileSync('app/api/split/[ca]/hourly/route.ts', 'utf8');
code = code.replace(
  'console.log("feedReadFailed! Error in catch block:", e);',
  'console.log("feedReadFailed! Error in catch block:", error);'
);
fs.writeFileSync('app/api/split/[ca]/hourly/route.ts', code);

let actionsCode = fs.readFileSync('app/api/actions/route.ts', 'utf8');
actionsCode = actionsCode.replace(
  'import { publicClient as robinhoodClient } from "@/packages/core/chain";',
  'import { client as robinhoodClient } from "@/packages/core/chain";'
);
fs.writeFileSync('app/api/actions/route.ts', actionsCode);
