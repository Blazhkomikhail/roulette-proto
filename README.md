# roulette-proto

A roulette table prototype with the standard layout, bets, chips, limits, and CLEAR / UNDO / DOUBLE. Stack: Vite, TypeScript (strict), Pixi.js v8, Vitest. There is no backend, no spin and no payout.

## Running

```sh
npm install                # .npmrc enables legacy-peer-deps (works around an npm 10 bug, see WORKLOG, iteration 0)
npm run dev                # http://localhost:5173
npm run verify -- <label>  # typecheck + test + build; saves the exact output to ai-log/raw/
npm run screenshots        # headless Chrome with real mouse events; saves PNGs to screenshots/
```

`npm run screenshots` looks for Chrome at `/Applications/Google Chrome.app/…`. Set `CHROME_PATH` to use a different location.

## Controls

| Action | How |
|---|---|
| Choose a chip value | the 1 / 5 / 10 / 25 / 100 buttons under the table |
| Place a chip | click a zone; each further click adds another chip |
| Remove one chip | Shift+click or right click |
| Clear, undo, double | CLEAR / UNDO / DOUBLE |

There are two limits:
- **100 Kup per number.** This is the total of all inside bets that cover the number.
- **1000 Kup for the whole slip.**

A bet that would exceed a limit is rejected, and the same message appears on screen and in the console.

## Structure

```
src/config/     table and money data: sizes, red numbers, chip values, limits
src/shared/     bet types shared by geometry and model
src/geometry/   zones built from config, hitTest, cells to draw (no Pixi)
src/model/      slip, limits, undo history, money (no Pixi, no DOM)
src/view/       Pixi scene, DOM controls, controller
tests/          layer-boundary tests and the geometry ↔ model contract test
```

Unit tests sit next to the code they test (`*.test.ts`).

## Where things are

- `screenshots/`: empty table (01), hover highlight (02–05), table with bets (06), limit rejection (07).
- `ai-log/`:
  - `WORKLOG.md`: prompts and iterations;
  - `COSTS.md`: costs;
  - `MISTAKES.md`: AI mistakes;
  - `raw/`: raw `verify` output;
- `tasks/`:
  - task-B
  - task-C

