const fs = require('fs');
let code = fs.readFileSync('components/terminal/TerminalView.tsx', 'utf8');

code = code.replace(
  'import React, { useCallback, useMemo, useState } from "react";',
  'import React, { useCallback, useMemo, useState, useEffect } from "react";'
);

fs.writeFileSync('components/terminal/TerminalView.tsx', code);
