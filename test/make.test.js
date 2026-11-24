import { expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const make = fileURLToPath(new URL('../scripts/make.mjs', import.meta.url));

test.each([
  ['tower.svg', 'tower.json'],
  ['tower', 'tower.json'],
])('writes separate SVG and JSON files for --out %s', (output, metadata) => {
  const dir = mkdtempSync(join(tmpdir(), 'gardener-make-'));
  try {
    const preload = join(dir, 'mock-github.mjs');
    writeFileSync(preload, `
      globalThis.fetch = async (input) => {
        const { hostname, pathname } = new URL(input);
        if (hostname === 'api.github.com') {
          if (pathname === '/repos/demo/project') return Response.json({ default_branch: 'main' });
          if (pathname.endsWith('/git/trees/main')) return Response.json({ tree: [] });
          if (pathname.endsWith('/languages')) return Response.json({});
        }
        return new Response(null, { status: 404 });
      };
    `);
    const run = Bun.spawnSync({
      cmd: [process.execPath, '--preload', preload, make, 'demo/project', '--no-model', '--out', output],
      cwd: dir,
      env: {},
    });
    expect(run.exitCode).toBe(0);
    expect(readFileSync(join(dir, output), 'utf8')).toStartWith('<svg ');
    expect(JSON.parse(readFileSync(join(dir, metadata), 'utf8')).source).toBe('facts-only');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
