const fs = require('fs');

let code = fs.readFileSync('components/actions/CorporateActionsView.tsx', 'utf8');

code = code.replace(
  '<div className="actions-page">\n      <header className="actions-header">\n        <div>\n          <h1>Corporate actions</h1>\n          <p>Dividends and splits, read from the token multiplier before they take effect</p>\n        </div>\n        <div className="actions-stat"><span>Scheduled</span><strong>{data ? scheduled.length : "—"}</strong></div>\n        <div className="actions-stat"><span>Since chain launch</span><strong>{data?.historyStatus === "complete" ? history.length : "—"}</strong></div>\n        <div className="actions-stat"><span>Pools exposed</span><strong>{rows.length || "—"}</strong></div>\n        <p className="actions-header-note">Scheduled and history are read from all 194 stock tokens on this chain. Pools exposed counts the active memecoin pools among them.</p>\n      </header>',
  `<div className="flex flex-col h-full overflow-hidden">\n      <div className="flex items-center border-b border-line bg-pane sticky top-0 z-10 whitespace-nowrap overflow-x-auto flex-shrink-0" style={{ gap: "22px", padding: "0 18px", height: 58, minWidth: "100%" }}>\n        <div>\n          <h1 className="text-[16px] font-semibold text-fg">Corporate actions</h1>\n          <div className="text-[12px] text-fg3">Dividends and splits, read from the token multiplier before they take effect</div>\n        </div>\n\n        <div className="flex flex-col flex-shrink-0">\n          <div className="text-[10px] text-fg3">Scheduled</div>\n          <div className="font-mono text-[13px] text-fg mt-[2px]">{data ? scheduled.length : "—"}</div>\n        </div>\n\n        <div className="flex flex-col flex-shrink-0">\n          <div className="text-[10px] text-fg3">Since chain launch</div>\n          <div className="font-mono text-[13px] text-fg mt-[2px]">{data?.historyStatus === "complete" ? history.length : "—"}</div>\n        </div>\n\n        <div className="flex flex-col flex-shrink-0">\n          <div className="text-[10px] text-fg3">Pools exposed</div>\n          <div className="font-mono text-[13px] text-fg mt-[2px]">{rows.length || "—"}</div>\n        </div>\n      </div>`
);

code = code.replace(
  '<section className="actions-grid">',
  '<div className="flex-1 overflow-y-auto"><section className="actions-grid">'
);

code = code.replace(
  '      </section>\n    </div>',
  '      </section>\n    </div></div>'
);

fs.writeFileSync('components/actions/CorporateActionsView.tsx', code);
