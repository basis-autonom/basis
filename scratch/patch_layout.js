const fs = require('fs');
let code = fs.readFileSync('app/(terminal)/layout.tsx', 'utf8');

code = code.replace(
  'let boardRows: any[] = [];',
  'let boardRows: any[] = [];\n  let isRpcError = false;'
);

code = code.replace(
  '} catch {',
  '} catch {\n    isRpcError = true;'
);

code = code.replace(
  '<TerminalDataProvider rows={boardRows}>',
  '<TerminalDataProvider rows={boardRows} isRpcError={isRpcError}>'
);

fs.writeFileSync('app/(terminal)/layout.tsx', code);
