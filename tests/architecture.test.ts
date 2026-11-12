import { describe, expect, it } from 'vitest';

// Layer boundaries from CLAUDE.md §2, checked on source text.
// model/ and geometry/ must not import pixi.js, view/, or each other.
const model = import.meta.glob('/src/model/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const geometry = import.meta.glob('/src/geometry/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function importsOf(source: string): string[] {
  return [...source.matchAll(IMPORT_RE)].map((m) => m[1] ?? m[2] ?? '');
}

function violations(files: Record<string, string>, forbidden: RegExp): string[] {
  return Object.entries(files).flatMap(([path, src]) =>
    importsOf(src).filter((spec) => forbidden.test(spec)).map((spec) => `${path} -> ${spec}`),
  );
}

describe('architecture: layer boundaries', () => {
  it('import parser sees static, re-export and dynamic imports', () => {
    const src = `import { a } from 'pixi.js';\nexport { b } from "../view/x";\nconst c = import('../model/y');`;
    expect(importsOf(src)).toEqual(['pixi.js', '../view/x', '../model/y']);
  });

  it('model/ does not import pixi.js, view/ or geometry/', () => {
    expect(violations(model, /^pixi\.js|(^|\/)(view|geometry)(\/|$)/)).toEqual([]);
  });

  it('geometry/ does not import pixi.js, view/ or model/', () => {
    expect(violations(geometry, /^pixi\.js|(^|\/)(view|model)(\/|$)/)).toEqual([]);
  });
});
