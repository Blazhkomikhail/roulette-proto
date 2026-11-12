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

## Ітерація 1. Спільні типи, конфіг, гроші

**Промпт:** «do next iteration (1)»

**Що зроблено:**
- `src/shared/bet.ts`:
  - `BET_TYPES` і `BetType`;
  - `INSIDE_BET_TYPES`;
  - `BET_ARITY` (скільки чисел покриває кожен тип);
  - `isBetType`, `isInsideBetType`;
  - `BetTarget` і `zoneKey()`, наприклад `"corner:32-33-35-36"`.
- `src/config/money.ts`: `MINOR_PER_KUP = 100`, номінали 1/5/10/25/100, ліміти в Kup і похідні minor-значення `10000` і `100000`. Усе в одному модулі.
- `src/config/table.ts`:
  - розміри: клітинка 60×72, нуль 60, «2 to 1» 60, дюжини 48, нижній ряд 48;
  - `stripe = 12`;
  - `RED_NUMBERS`;
  - `OUTSIDE_ORDER`: `low, even, red, black, odd, high`;
  - `LABELS`.
- `src/model/money.ts`:
  - брендований тип `Minor` (безпечне ціле, кратне 100);
  - строгий `parseAmountMinor`: регулярний вираз `/^[1-9]\d*$/`, потім `Number.isSafeInteger`, потім кратність 100;
  - `kupToMinor`, `chipToMinor`, `addMinor`, `multiplyMinor`, `minorToString`, `minorToKup`, `formatKup` (дає `"25 Kup"`).
- Тести:
  - `tests/money.test.ts`: фішки дають `"100"`, `"500"`, `"1000"`, `"2500"`, `"10000"`; ліміти `10000` і `100000`; 17 відхилених рядків, серед них `"150"`, `"1e2"`, `" 100"`, `"0100"`, `"0x64"` і числа за межею безпечного цілого; округлення з подвійним перетворенням.
  - `tests/config.test.ts`: червоні числа перевіряються незалежним правилом кольору європейського колеса, а не копією списку. Ще перевіряються парність `stripe` і мінімальні розміри зон.
  - `tests/architecture.test.ts`: нова перевірка, що в `src/` немає `parseFloat`.

**Помилки агента, знайдені перевірками:**
1. Нова перевірка на `parseFloat` упала на коментарі агента в `src/model/money.ts` («No parseFloat…»). Перевірка текстова й навмисно строга, тож агент переписав коментар, а перевірку не послаблював.
2. Слабкий тест. Агент вручну вимкнув перевірку `Number.isSafeInteger` у `parseAmountMinor`, і тести лишилися зеленими. Причина: випадок `"90071992547409900"` після округлення до double стає некратним 100 і відсікається перевіркою кратності, тож перевірка безпечного цілого насправді не тестувалася. Агент додав `"100000000000000000000"`: це точний double, кратний 100, але не безпечне ціле. Після цього вимкнена перевірка дає червоний тест. Дві інші мутації, слабший регулярний вираз і видалена перевірка кратності 100, тести ловили з першого разу.

**Рішення агента** (кандидати в `ASSUMPTIONS.md`, ще не внесені):
- усередині моделі суми зберігаються як безпечні цілі `number` з брендом `Minor`, рядок з'являється лише на межі API (альтернатива: `bigint` або рядки всюди);
- `parseAmountMinor` відхиляє `"0"`, бо ставка має бути додатною;
- `kupToMinor` на хибному вході кидає `RangeError`, бо це помилка програміста, а не користувача;
- розміри столу 60×72 і `stripe` 12 попередні, їх можна змінити в ітерації 5.

**Результат:** `npm run verify -- iter1` зелений, 53 тести. Вивід у `ai-log/raw/verify-iter1-2026-11-12T15-53-17-485Z.txt`. Попередній запуск `verify-iter1-2026-11-12T15-52-55-836Z.txt` був до виправлення тесту, теж зелений; лишено для історії.
