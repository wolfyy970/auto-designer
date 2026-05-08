import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

if (!existsSync('.git')) {
  process.exit(0);
}

const result = spawnSync('husky', { stdio: 'inherit' });
process.exit(result.status ?? 1);
