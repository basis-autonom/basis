const fs = require('fs');

let topbar = fs.readFileSync('components/shell/Topbar.tsx', 'utf8');
topbar = topbar.replace(
  '<div\n            className="flex items-center border border-line2 rounded-[4px]"\n            style={{ gap: 7, padding: "4px 9px" }}\n          >\n            <span\n              className="block rounded-full bg-up flex-shrink-0"\n              style={{\n                width: 5,\n                height: 5,\n                boxShadow: "0 0 6px var(--color-up)",\n              }}\n            />\n            Robinhood Chain\n          </div>',
  `<a\n            href="https://robinhoodchain.blockscout.com"\n            target="_blank"\n            rel="noreferrer"\n            className="flex items-center border border-up/30 bg-up/10 text-up rounded-full transition-colors hover:border-up/60"\n            style={{ gap: 6, padding: "3px 10px", fontWeight: 500 }}\n            title="View on Robinhood Chain Explorer"\n          >\n            <span\n              className="block rounded-full bg-up flex-shrink-0"\n              style={{\n                width: 6,\n                height: 6,\n                boxShadow: "0 0 8px var(--color-up)",\n              }}\n            />\n            LIVE · Robinhood Chain Mainnet\n          </a>`
);
fs.writeFileSync('components/shell/Topbar.tsx', topbar);

let landingNav = fs.readFileSync('components/landing/LandingNav.tsx', 'utf8');
landingNav = landingNav.replace(
  '<div className="landing-nav-links">\n          <Link href="/terminal">Terminal</Link>',
  '<div className="landing-nav-links">\n          <a\n            href="https://robinhoodchain.blockscout.com"\n            target="_blank"\n            rel="noreferrer"\n            className="hidden sm:flex items-center border border-up/30 bg-up/10 text-up rounded-full transition-colors hover:border-up/60 font-mono text-[11px]"\n            style={{ gap: 6, padding: "3px 10px", fontWeight: 500, marginRight: 8 }}\n            title="View on Robinhood Chain Explorer"\n          >\n            <span\n              className="block rounded-full bg-up flex-shrink-0"\n              style={{\n                width: 6,\n                height: 6,\n                boxShadow: "0 0 8px var(--color-up)",\n              }}\n            />\n            LIVE · Robinhood Chain Mainnet\n          </a>\n          <Link href="/terminal">Terminal</Link>'
);
fs.writeFileSync('components/landing/LandingNav.tsx', landingNav);

