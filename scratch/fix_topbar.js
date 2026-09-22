const fs = require('fs');

let code = fs.readFileSync('components/shell/Topbar.tsx', 'utf8');
code = code.replace(
  'import { useBlockHeight } from "./useBlockHeight";',
  'import { useBlockHeight } from "./useBlockHeight";\nimport { usePathname } from "next/navigation";'
);
code = code.replace(
  'const blockHeight = useBlockHeight();',
  'const blockHeight = useBlockHeight();\n  const pathname = usePathname();'
);
fs.writeFileSync('components/shell/Topbar.tsx', code);
