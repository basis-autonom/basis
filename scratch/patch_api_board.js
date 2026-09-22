const fs = require('fs');
let code = fs.readFileSync('app/api/board/route.ts', 'utf8');

code = code.replace(
  'const data = await getCachedBoardData();\n    return NextResponse.json({ kind: "success", data });',
  'const result = await getCachedBoardData();\n    if (result.kind === "error") return NextResponse.json(result, { status: 503 });\n    return NextResponse.json({ kind: "success", data: result.data });'
);

fs.writeFileSync('app/api/board/route.ts', code);
