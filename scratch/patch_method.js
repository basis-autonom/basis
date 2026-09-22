const fs = require('fs');

let code = fs.readFileSync('components/method/MethodView.tsx', 'utf8');

code = code.replace(
  '<div className="method-page">\n      <header className="method-header">\n        <div>\n          <h1>Method</h1>\n          <p>Every number on Basis, and exactly where it comes from</p>\n        </div>\n        <div className="method-stat"><span>Chain</span><strong>Robinhood Chain</strong></div>\n        <div className="method-stat"><span>Mode</span><strong>read-only</strong></div>\n      </header>',
  `<div className="flex flex-col h-full overflow-hidden">\n      <div className="flex items-center border-b border-line bg-pane sticky top-0 z-10 whitespace-nowrap overflow-x-auto flex-shrink-0" style={{ gap: "22px", padding: "0 18px", height: 58, minWidth: "100%" }}>\n        <div>\n          <h1 className="text-[16px] font-semibold text-fg">Method</h1>\n          <div className="text-[12px] text-fg3">Every number on Basis, and exactly where it comes from</div>\n        </div>\n\n        <div className="flex flex-col flex-shrink-0">\n          <div className="text-[10px] text-fg3">Chain</div>\n          <div className="font-mono text-[13px] text-fg mt-[2px]">Robinhood Chain</div>\n        </div>\n\n        <div className="flex flex-col flex-shrink-0">\n          <div className="text-[10px] text-fg3">Mode</div>\n          <div className="font-mono text-[13px] text-fg mt-[2px]">read-only</div>\n        </div>\n      </div>`
);

code = code.replace(
  '<section className="method-grid">',
  '<div className="flex-1 overflow-y-auto"><section className="method-grid">'
);

code = code.replace(
  '      </section>\n    </div>',
  '      </section>\n    </div></div>'
);

fs.writeFileSync('components/method/MethodView.tsx', code);
