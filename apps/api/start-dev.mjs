import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');

const child = spawn(
  '/opt/homebrew/bin/node',
  [join(__dirname, 'node_modules/@nestjs/cli/bin/nest.js'), 'start', '--watch'],
  {
    cwd: __dirname,
    env: {
      ...process.env,
      PATH: `/opt/homebrew/bin:/opt/homebrew/opt/postgresql@16/bin:${process.env.PATH ?? ''}`,
    },
    stdio: 'inherit',
  },
);

child.on('exit', (code) => process.exit(code ?? 0));
