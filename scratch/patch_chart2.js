const fs = require('fs');

let code = fs.readFileSync('components/charts/HourlyContributionChart.tsx', 'utf8');

const targetStr = `      if (point.gap) {
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
      }`;

const replacementStr = `      if (point.gap) {
        const isFetchFailure = point.gap === 'fetch_failed';
        renderedBars.push(
          <rect
            key={\`gap-\${point.t}\`}
            x={x}
            y={PLOT_TOP}
            width={barWidth}
            height={PLOT_BOTTOM - PLOT_TOP}
            fill={isFetchFailure ? 'transparent' : 'var(--color-pane2)'}
            stroke={isFetchFailure ? 'var(--color-border)' : 'var(--color-fg3)'}
            strokeDasharray={isFetchFailure ? '2 4' : undefined}
            strokeWidth="1"
            opacity="0.5"
          />,
        );
      }`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('components/charts/HourlyContributionChart.tsx', code);
