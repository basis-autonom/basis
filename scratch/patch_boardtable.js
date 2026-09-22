const fs = require('fs');
let code = fs.readFileSync('components/board/BoardTable.tsx', 'utf8');

code = code.replace(
  'interface BoardTableProps {',
  'interface BoardTableProps {\n  isRpcError?: boolean;'
);

code = code.replace(
  'rows,',
  'rows,\n  isRpcError,'
);

code = code.replace(
  '<DataTable',
  '<DataTable\n        isRpcError={isRpcError}'
);

fs.writeFileSync('components/board/BoardTable.tsx', code);
