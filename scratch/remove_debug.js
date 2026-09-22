const fs = require('fs');

let code = fs.readFileSync('app/api/split/[ca]/hourly/route.ts', 'utf8');

const target = `    const fetchFailed = decimalsFailed || slots[index].failed || slots[sampleIndex].failed || feedReadFailed || (slots[index].snapshotTs && slots[index].snapshotTs === slots[sampleIndex].snapshotTs);
    if (index === pointCount - 1) {
      console.log("LAST POINT DEBUG:");
      console.log("decimalsFailed:", decimalsFailed);
      console.log("slots[index].failed:", slots[index].failed);
      console.log("slots[sampleIndex].failed:", slots[sampleIndex].failed);
      console.log("feedReadFailed:", feedReadFailed);
      console.log("slots[index].snapshotTs:", slots[index].snapshotTs);
      console.log("slots[sampleIndex].snapshotTs:", slots[sampleIndex].snapshotTs);
      console.log("fetchFailed:", fetchFailed);
    }`;

const replacement = `    const fetchFailed = decimalsFailed || slots[index].failed || slots[sampleIndex].failed || feedReadFailed || (slots[index].snapshotTs && slots[index].snapshotTs === slots[sampleIndex].snapshotTs);`;

code = code.replace(target, replacement);

fs.writeFileSync('app/api/split/[ca]/hourly/route.ts', code);
