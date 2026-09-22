const fs = require('fs');
let code = fs.readFileSync('components/terminal/TerminalView.tsx', 'utf8');

code = code.replace(
  'const storage = typeof window === "undefined" ? memoryStorage : window.localStorage;',
  'const [mounted, setMounted] = useState(false);\n  useEffect(() => setMounted(true), []);\n  const storage = mounted && typeof window !== "undefined" ? window.localStorage : memoryStorage;'
);

fs.writeFileSync('components/terminal/TerminalView.tsx', code);
