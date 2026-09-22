const fs = require('fs');
let code = fs.readFileSync('components/terminal/TerminalView.tsx', 'utf8');

code = code.replace(
  'const { rows } = useTerminalRows();',
  'const { rows, isRpcError } = useTerminalRows();'
);

code = code.replace(
  '<BoardTable',
  '<BoardTable\n                    isRpcError={isRpcError}'
);

code = code.replace(
  '<SplitInspector row={selectedRow} copied={copied} onCopy={handleCopy} />',
  '<SplitInspector row={selectedRow} isRpcError={isRpcError} copied={copied} onCopy={handleCopy} />'
);

fs.writeFileSync('components/terminal/TerminalView.tsx', code);
