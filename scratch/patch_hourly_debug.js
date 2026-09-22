const fs = require('fs');
let code = fs.readFileSync('app/api/split/[ca]/hourly/route.ts', 'utf8');

code = code.replace(
  'const decimalsFailed = token0Decimals === null || token1Decimals === null;',
  'const decimalsFailed = token0Decimals === null || token1Decimals === null;\nconsole.log("decimalsFailed:", decimalsFailed, "token0:", token0Decimals, "token1:", token1Decimals);'
);

code = code.replace(
  'feedReadFailed = true;\n  }',
  'feedReadFailed = true;\n    console.log("feedReadFailed! Error in catch block");\n  }'
);

code = code.replace(
  'const ratios = slots.map(',
  'console.log("slots failed count:", slots.filter(s => s.failed).length, "out of", slots.length);\n  const ratios = slots.map('
);

fs.writeFileSync('app/api/split/[ca]/hourly/route.ts', code);
