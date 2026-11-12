// Runs typecheck, test and build; writes their verbatim output to ai-log/raw/.
// Usage: npm run verify -- <label>   (e.g. iter0). Exit code is non-zero if any step failed.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const label = process.argv[2] ?? 'manual';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const steps = ['typecheck', 'test', 'build'];

let out = `# npm run verify (${label})\n# ${new Date().toISOString()}\n# node ${process.version}\n`;
let failed = false;

for (const step of steps) {
  const r = spawnSync('npm', ['run', step], { encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } });
  const status = r.status ?? 1;
  if (status !== 0) failed = true;
  out += `\n$ npm run ${step}\n${r.stdout ?? ''}${r.stderr ?? ''}[exit code: ${status}]\n`;
}

out += `\n# RESULT: ${failed ? 'FAILED' : 'OK'}\n`;
mkdirSync('ai-log/raw', { recursive: true });
const file = `ai-log/raw/verify-${label}-${stamp}.txt`;
writeFileSync(file, out);
process.stdout.write(out);
console.log(`\nSaved: ${file}`);
process.exit(failed ? 1 : 0);
