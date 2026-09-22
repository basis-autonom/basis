const fs = require('fs');
let code = fs.readFileSync('components/hours/MarketHoursView.tsx', 'utf8');
code = code.replace(
  'aggregateState === "closed"',
  'aggregateState === "frozen"'
);
fs.writeFileSync('components/hours/MarketHoursView.tsx', code);
