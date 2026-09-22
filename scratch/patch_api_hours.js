const fs = require('fs');
let code = fs.readFileSync('app/api/hours/route.ts', 'utf8');

code = code.replace(
  'const data = await getBoardData(12);\n    return NextResponse.json({ kind: "success", data });',
  'const result = await getBoardData(12);\n    if (result.kind === "error") throw new Error("RPC error");\n    return NextResponse.json({ kind: "success", data: result.data });'
);

fs.writeFileSync('app/api/hours/route.ts', code);
