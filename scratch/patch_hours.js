const fs = require('fs');

let code = fs.readFileSync('components/hours/MarketHoursView.tsx', 'utf8');

code = code.replace(
  '<div className="hours-page">\n      <header className="hours-header">\n        <div className="hours-title">\n          <h1>Market hours</h1>\n          <p>When the stock leg can reprice, and what the meme did while it could not</p>\n        </div>\n\n        <div className="hours-stats" aria-label="Market hours summary">\n          <div className="hours-stat">\n            <span>Now</span>\n            <strong className={`hours-value hours-value--${aggregateState}`}>\n              {aggregateState === "unavailable" ? "unknown" : aggregateState}\n            </strong>\n          </div>\n          <div className="hours-stat">\n            <span>Latest feed</span>\n            <strong>{latestUpdate && now ? `${formatAge(now - latestUpdate)} ago` : "—"}</strong>\n          </div>\n          <div className="hours-stat">\n            <span>Feed coverage</span>\n            <strong>{feedRows.length ? `${liveCount}/${feedRows.length} live` : "—"}</strong>\n          </div>\n          <div className="hours-stat">\n            <span>Tracked pools</span>\n            <strong>{visibleRows.length}</strong>\n          </div>\n        </div>\n      </header>',
  `<div className="flex flex-col h-full overflow-hidden">\n      <div className="flex items-center border-b border-line bg-pane sticky top-0 z-10 whitespace-nowrap overflow-x-auto flex-shrink-0" style={{ gap: "22px", padding: "0 18px", height: 58, minWidth: "100%" }}>\n        <div>\n          <h1 className="text-[16px] font-semibold text-fg">Market hours</h1>\n          <div className="text-[12px] text-fg3">When the stock leg can reprice, and what the meme did while it could not</div>\n        </div>\n\n        <div className="flex flex-col flex-shrink-0">\n          <div className="text-[10px] text-fg3">Now</div>\n          <div className={\`font-mono text-[13px] mt-[2px] \${aggregateState === "live" ? "text-up" : aggregateState === "closed" ? "text-fg" : "text-fg3"}\`}>\n            {aggregateState === "unavailable" ? "unknown" : aggregateState}\n          </div>\n        </div>\n\n        <div className="flex flex-col flex-shrink-0">\n          <div className="text-[10px] text-fg3">Latest feed</div>\n          <div className="font-mono text-[13px] text-fg mt-[2px]">{latestUpdate && now ? \`\${formatAge(now - latestUpdate)} ago\` : "—"}</div>\n        </div>\n\n        <div className="flex flex-col flex-shrink-0">\n          <div className="text-[10px] text-fg3">Feed coverage</div>\n          <div className="font-mono text-[13px] text-fg mt-[2px]">{feedRows.length ? \`\${liveCount}/\${feedRows.length} live\` : "—"}</div>\n        </div>\n\n        <div className="flex flex-col flex-shrink-0">\n          <div className="text-[10px] text-fg3">Tracked pools</div>\n          <div className="font-mono text-[13px] text-fg mt-[2px]">{visibleRows.length}</div>\n        </div>\n      </div>`
);

code = code.replace(
  '<section className="hours-panel hours-week-panel">',
  '<div className="flex-1 overflow-y-auto"><section className="hours-panel hours-week-panel">'
);

code = code.replace(
  '      </section>\n    </div>',
  '      </section>\n    </div></div>'
);

fs.writeFileSync('components/hours/MarketHoursView.tsx', code);
