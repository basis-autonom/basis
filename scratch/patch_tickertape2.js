const fs = require('fs');
let code = fs.readFileSync('components/landing/TickerTape.tsx', 'utf8');
code = code.replace(
  'export function TickerTape({ rows }: { rows: LandingBoardRow[] }) {',
  'export function TickerTape({ rows, isRpcError }: { rows: LandingBoardRow[], isRpcError?: boolean }) {'
);
code = code.replace(
  'const content = tape.length > 0 ? tape : <span>{rows.length === 0 ? "RPC unavailable" : "No live pool data"}</span>;',
  'const content = tape.length > 0 ? tape : <span>{isRpcError ? "RPC connection unavailable" : "No live pool data"}</span>;'
);
fs.writeFileSync('components/landing/TickerTape.tsx', code);

let pageCode = fs.readFileSync('app/page.tsx', 'utf8');
pageCode = pageCode.replace(
  '<TickerTape rows={board} />',
  '<TickerTape rows={board} isRpcError={isRpcError} />'
);
fs.writeFileSync('app/page.tsx', pageCode);
