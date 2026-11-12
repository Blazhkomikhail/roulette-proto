# WORKLOG

## Ітерація −1. Архітектура (без коду)

**Промпт:** «Analyze the requirements in CLAUDE.md and suggest Architecture: modules, types, config's format, iteration order.»

**Що зроблено:** агент прочитав CLAUDE.md, `docs/task.md`, `docs/clarifications.md`, референс-скриншот і запропонував:
- модулі `shared/ config/ geometry/ model/ view/`;
- типи `BetType`, `BetTarget`, `Zone`, `Bet`, `OpResult`;
- формат конфігу (розміри, `stripe`, червоні числа, порядок зовнішніх зон, номер клітинки за формулою `n = 3c + 3 − r`);
- розбиття столу на непересічні напіввідкриті прямокутники, загалом 154 зони;
- порядок ітерацій 0–7.

**Прийнято / відхилено:**
- Користувач прийняв план і обрав **DOM-кнопки** для керування (вибір фішки, CLEAR/UNDO/DOUBLE, повідомлення). Pixi лишається тільки для столу. Це рішення користувача.
- Решту пропозицій для `ASSUMPTIONS.md` (9 пунктів, рішення агента) явно ще не підтверджено, у файл не внесено.

## Ітерація 0. Каркас проєкту

**Промпт:** «use DOM buttons. Start with iteration 0»

**Що зроблено:**
- Залежності: `pixi.js 8.22.0`, `vite 8.3.5`, `vitest 5.0.5`, `typescript 6.0.3`. Версії закріплені точно, без `^`. Агент обрав версії, опубліковані щонайменше 2 тижні тому, і взяв TS 6, а не TS 7 (нативна переробка компілятора).
- `tsconfig.json`: strict, плюс `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`. Без `@types/node`.
- `vite.config.ts`: тести з `tests/**/*.test.ts`.
- `scripts/verify.mjs`, запуск `npm run verify -- <мітка>`: запускає typecheck, test і build, пише дослівний вивід у `ai-log/raw/verify-<мітка>-<час>.txt`. Якщо хоч один крок упав, код виходу ненульовий.
- `index.html` з `#table-host` (Pixi) і `#controls` (DOM). `src/main.ts`: лише ініціалізація Pixi v8 (`await app.init`, `app.canvas`).
- `tests/architecture.test.ts`: перевіряє, що `model/` і `geometry/` не імпортують `pixi.js`, `view/` і одне одного. Вихідні файли читаються через `import.meta.glob(..., { query: '?raw' })`, тому `@types/node` не знадобився.
- Порожні каталоги `src/{config,shared,geometry,model,view}` з `.gitkeep`.

**Проблема:** `npm install` двічі впав з `Cannot read properties of null (reading 'edgesOut')`. Це помилка npm 10 (arborist) на ланцюжку необов'язкових peer-залежностей vitest (`@vitest/browser-*`, `msw`). Обхід: `--legacy-peer-deps`, закріплений у `.npmrc`. Ризик низький: єдиний потрібний peer, `vite`, стоїть прямою devDependency. Рішення прийняв агент.

**Перевірка тесту меж:** у `src/model/` тимчасово додано файл з `import ... from 'pixi.js'`. Тест упав з `'/src/model/_probe.ts -> pixi.js'`, після чого файл видалено.

**Результат:** `npm run verify -- iter0` зелений, вивід у `ai-log/raw/verify-iter0-2026-11-12T15-42-27-954Z.txt`.
