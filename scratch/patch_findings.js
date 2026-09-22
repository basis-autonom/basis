const fs = require('fs');

let code = fs.readFileSync('components/findings/FindingsPanel.tsx', 'utf8');
code = code.replace(
  '<div className="flex w-[116px] flex-shrink-0 items-start justify-between border-r border-line px-[12px]! pt-[13px]">\n        <h2\n          id="findings-heading"\n          className="font-mono text-[10px] uppercase tracking-[0.09em] text-fg3 "\n        >\n          Findings\n        </h2>\n        <span className="font-mono text-[10px] text-fg3">\n          {state.status === "ready" ? state.findings.length : "—"}\n        </span>\n      </div>',
  `<div className="flex w-[160px] flex-shrink-0 items-start justify-between border-r border-up/20 bg-up/[0.02] px-[12px] pt-[10px] pb-[10px]">\n        <div className="flex flex-col">\n          <div className="flex items-center gap-[6px] mb-[3px]">\n            <span className="block rounded-full bg-up flex-shrink-0" style={{ width: 4, height: 4, boxShadow: "0 0 6px var(--color-up)" }} />\n            <h2 id="findings-heading" className="font-mono text-[10px] uppercase tracking-[0.09em] text-up font-semibold">\n              Live Findings\n            </h2>\n          </div>\n          <span className="font-mono text-[9px] text-fg2 leading-tight pr-2">\n            Auto-detected from chain\n          </span>\n        </div>\n        <span className="font-mono text-[10px] text-up/70">\n          {state.status === "ready" ? state.findings.length : "—"}\n        </span>\n      </div>`
);
// Also increase the w-[116px] to w-[160px] in the original code because the text is wider.
// But wait, the parent Panel size?
// In TerminalView: <Panel id="basis-findings" defaultSize="16%" minSize={42} maxSize={42} ...> Wait, FindingsPanel's parent is just a flex container. The sidebar takes 160px for board? No, findings is horizontal! It's in the lower pane.
fs.writeFileSync('components/findings/FindingsPanel.tsx', code);
