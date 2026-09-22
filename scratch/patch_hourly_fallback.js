const fs = require('fs');

let code = fs.readFileSync('app/api/split/[ca]/hourly/route.ts', 'utf8');

const targetStr = `    const matching = snapshots
      .filter((s: any) => s.timestamp.getTime() <= targetTs)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
      
    if (!matching) {
      return { slot: null, failed: true }; // we don't have it in DB, return failed so it shows red gap
    }`;

const replacementStr = `    let matching = snapshots
      .filter((s: any) => s.timestamp.getTime() <= targetTs)
      .sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime())[0];
      
    // If no snapshot exists AT OR BEFORE the target timestamp, 
    // try to find the OLDEST snapshot available that is AFTER targetTs, 
    // but ONLY if it's reasonably close (e.g., we'll just take the earliest one available
    // so that we can at least render the first partial bar for the last hour).
    if (!matching) {
       matching = snapshots
         .filter((s: any) => s.timestamp.getTime() > targetTs)
         .sort((a: any, b: any) => a.timestamp.getTime() - b.timestamp.getTime())[0];
    }
      
    if (!matching) {
      return { slot: null, failed: true }; // we don't have it in DB at all
    }`;

code = code.replace(targetStr, replacementStr);

fs.writeFileSync('app/api/split/[ca]/hourly/route.ts', code);
