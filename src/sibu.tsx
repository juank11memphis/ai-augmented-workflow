#!/usr/bin/env node

import { runCli } from './entrypoints/cli/main.js';

runCli().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
