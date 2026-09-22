const fs = require('fs');
let code = fs.readFileSync('components/terminal/SplitInspector.tsx', 'utf8');

code = code.replace(
  'interface SplitInspectorProps {',
  'interface SplitInspectorProps {\n  isRpcError?: boolean;'
);

code = code.replace(
  'export function SplitInspector({ row, copied, onCopy }: SplitInspectorProps) {',
  'export function SplitInspector({ row, isRpcError, copied, onCopy }: SplitInspectorProps) {'
);

code = code.replace(
  'No pool selected.',
  '{isRpcError ? <span className="text-down">RPC connection unavailable. Data cannot be fetched.</span> : "No pool selected."}'
);

fs.writeFileSync('components/terminal/SplitInspector.tsx', code);
