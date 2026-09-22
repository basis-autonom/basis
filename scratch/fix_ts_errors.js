const fs = require('fs');

// Fix packages/db/queries.ts
let queries = fs.readFileSync('packages/db/queries.ts', 'utf8');
queries = queries.replace('import { db } from "./client";', 'import { getDb } from "./client";');
queries = queries.replace('await db', 'await getDb()');
fs.writeFileSync('packages/db/queries.ts', queries);

// Fix packages/db/snapshots.ts
let snapshots = fs.readFileSync('packages/db/snapshots.ts', 'utf8');
snapshots = snapshots.replace('import { db } from "./client";', 'import { getDb } from "./client";');
snapshots = snapshots.replace('await db', 'await getDb()');
fs.writeFileSync('packages/db/snapshots.ts', snapshots);

// Fix app/api/split/[ca]/hourly/route.ts types
let hourly = fs.readFileSync('app/api/split/[ca]/hourly/route.ts', 'utf8');
hourly = hourly.replace('.filter((s) => ', '.filter((s: any) => ');
hourly = hourly.replace('.sort((a, b) => ', '.sort((a: any, b: any) => ');
fs.writeFileSync('app/api/split/[ca]/hourly/route.ts', hourly);

// Fix Topbar.tsx
let topbar = fs.readFileSync('components/shell/Topbar.tsx', 'utf8');
// Check why pathname is missing.
// Ah, the patch was:
// const [blockHeight, setBlockHeight] = useState<string>("—");
// const pathname = usePathname();
// But Topbar is exported as: export function Topbar({ isMac, isMobile }: { ... })
