const fs = require('fs');

let code = fs.readFileSync('components/shell/Topbar.tsx', 'utf8');

// Ensure usePathname is imported
if (!code.includes('usePathname')) {
  code = code.replace(
    'import { useState, useEffect } from "react";',
    'import { useState, useEffect } from "react";\nimport { usePathname } from "next/navigation";'
  );
}

// Add pathname variable inside Topbar
code = code.replace(
  'const [blockHeight, setBlockHeight] = useState<string>("—");',
  'const [blockHeight, setBlockHeight] = useState<string>("—");\n  const pathname = usePathname();'
);

// Compute blockscoutLink
code = code.replace(
  'const shortcutLabel = isMac ? "⌘ K" : "Ctrl K";',
  'const shortcutLabel = isMac ? "⌘ K" : "Ctrl K";\n\n  const blockscoutLink = pathname?.startsWith("/c/") && pathname.length > 4\n    ? `https://robinhoodchain.blockscout.com/address/${pathname.replace("/c/", "")}`\n    : "https://robinhoodchain.blockscout.com";'
);

// Replace href
code = code.replace(
  'href="https://robinhoodchain.blockscout.com"',
  'href={blockscoutLink}'
);

fs.writeFileSync('components/shell/Topbar.tsx', code);
