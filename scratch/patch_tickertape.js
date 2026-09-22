const fs = require('fs');
let code = fs.readFileSync('components/landing/TickerTape.tsx', 'utf8');

code = code.replace(
  'const content = tape.length > 0 ? tape : <span>No live pool data</span>;',
  'const content = tape.length > 0 ? tape : <span>{rows.length === 0 ? "RPC unavailable" : "No live pool data"}</span>;'
);

fs.writeFileSync('components/landing/TickerTape.tsx', code);
