const fs = require('fs');
let code = fs.readFileSync('components/landing/Hero.tsx', 'utf8');

code = code.replace(
  'export function Hero({ rows }: { rows: LandingBoardRow[] }) {',
  'export function Hero({ rows, isRpcError }: { rows: LandingBoardRow[], isRpcError?: boolean }) {'
);

code = code.replace(
  'const quote = featured?.quote || \'—\';',
  'const quote = featured?.quote || \'—\';\n  if (isRpcError) {\n    return (\n      <header className="landing-hero">\n        <div className="landing-frame">\n          <h1 className="landing-h1">\n            You bought a memecoin.<br />\n            <span className="text-down">RPC connection unavailable.</span>\n          </h1>\n          <p className="landing-lede">The on-chain data provider is currently experiencing downtime or rate limits. Live pool data cannot be displayed at this moment. Please check back later.</p>\n          <div className="landing-exposure">\n            <span>status</span>\n            <strong className="text-down">Data unavailable</strong>\n          </div>\n          <ContractForm />\n        </div>\n      </header>\n    );\n  }'
);

fs.writeFileSync('components/landing/Hero.tsx', code);
