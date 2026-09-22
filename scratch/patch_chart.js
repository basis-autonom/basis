const fs = require('fs');
let code = fs.readFileSync('components/charts/HourlyContributionChart.tsx', 'utf8');
code = code.replace(
  `      if (point.gap) {
        const isFetchFailure = point.gap === 'fetch_failed';
        renderedBars.push(
          <rect
            key={\`gap-\${point.t}\`}
            x={x}
            y={PLOT_TOP}
            width={barWidth}
            height={PLOT_BOTTOM - PLOT_TOP}
            fill={isFetchFailure ? 'var(--color-downbg)' : 'var(--color-pane2)'}
            stroke={isFetchFailure ? 'var(--color-down)' : 'var(--color-fg3)'}
            strokeDasharray={isFetchFailure ? '3 2' : undefined}
            strokeWidth="1"
            opacity="0.42"
          />,
        );
      }`,
  `      if (point.gap) {
        const isFetchFailure = point.gap === 'fetch_failed';
        if (!isFetchFailure) {
          renderedBars.push(
            <rect
              key={\`gap-\${point.t}\`}
              x={x}
              y={PLOT_TOP}
              width={barWidth}
              height={PLOT_BOTTOM - PLOT_TOP}
              fill="var(--color-pane2)"
              stroke="var(--color-fg3)"
              strokeWidth="1"
              opacity="0.42"
            />,
          );
        }
      }`
);
fs.writeFileSync('components/charts/HourlyContributionChart.tsx', code);
