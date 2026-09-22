const fs = require('fs');
let code = fs.readFileSync('components/charts/HourlyContributionChart.tsx', 'utf8');

code = code.replace(
  'hasData: points.some((point) => point.meme != null || point.stock != null),',
  'hasData: points.length > 0,'
);

fs.writeFileSync('components/charts/HourlyContributionChart.tsx', code);
