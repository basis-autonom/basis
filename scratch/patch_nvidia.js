const fs = require('fs');
// Wait, I just deleted scratch/ folder. Let me recreate it.
if (!fs.existsSync('scratch')) fs.mkdirSync('scratch');

let code = fs.readFileSync('app/(terminal)/c/[ca]/page.tsx', 'utf8');

code = code.replace(
  'came from Nvidia.',
  'came from {displayStockName}.'
);

fs.writeFileSync('app/(terminal)/c/[ca]/page.tsx', code);
