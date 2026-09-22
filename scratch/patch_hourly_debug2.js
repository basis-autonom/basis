const fs = require('fs');
let code = fs.readFileSync('app/api/split/[ca]/hourly/route.ts', 'utf8');

code = code.replace(
  'feedReadFailed = true;\n    console.log("feedReadFailed! Error in catch block");',
  'feedReadFailed = true;\n    console.log("feedReadFailed! Error in catch block:", e);'
);

code = code.replace(
  'console.log("decimalsFailed:", decimalsFailed, "token0:", token0Decimals, "token1:", token1Decimals);',
  'console.log("decimalsFailed:", decimalsFailed, "token0:", token0Decimals, "token1:", token1Decimals, "RAW:", decimalResults);'
);

fs.writeFileSync('app/api/split/[ca]/hourly/route.ts', code);
