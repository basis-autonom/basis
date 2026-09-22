const fs = require('fs');
let code = fs.readFileSync('components/primitives/DataTable.tsx', 'utf8');

code = code.replace(
  'interface DataTableProps<T> {',
  'interface DataTableProps<T> {\n  isRpcError?: boolean;'
);

code = code.replace(
  'activeRowFn }: DataTableProps<T>) {',
  'activeRowFn, isRpcError }: DataTableProps<T>) {'
);

code = code.replace(
  '{rows.map((row, i) => {',
  '{rows.length === 0 ? (\n            <tr>\n              <td colSpan={columns.length} className="text-center font-mono text-[11px] text-fg3" style={{ padding: "32px 14px" }}>\n                {isRpcError ? <span className="text-down">RPC connection unavailable. Data cannot be fetched.</span> : "No live pool data."}\n              </td>\n            </tr>\n          ) : rows.map((row, i) => {'
);

fs.writeFileSync('components/primitives/DataTable.tsx', code);
