const fs = require('fs');
let code = fs.readFileSync('components/shell/TerminalDataProvider.tsx', 'utf8');

code = code.replace(
  '<{rows: any[], selectedCa: string, setSelectedCa: (ca: string) => void}>({rows: [], selectedCa: "", setSelectedCa: () => {}});',
  '<{rows: any[], isRpcError: boolean, selectedCa: string, setSelectedCa: (ca: string) => void}>({rows: [], isRpcError: false, selectedCa: "", setSelectedCa: () => {}});'
);

code = code.replace(
  'export function TerminalDataProvider({ rows: initialRows, children }: { rows: any[]; children: React.ReactNode }) {',
  'export function TerminalDataProvider({ rows: initialRows, isRpcError = false, children }: { rows: any[]; isRpcError?: boolean; children: React.ReactNode }) {'
);

code = code.replace(
  'value={{rows, selectedCa, setSelectedCa}}',
  'value={{rows, isRpcError, selectedCa, setSelectedCa}}'
);

fs.writeFileSync('components/shell/TerminalDataProvider.tsx', code);
