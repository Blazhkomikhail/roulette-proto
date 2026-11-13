// DOM controls under the canvas (user decision: DOM buttons, not Pixi): chip selector,
// CLEAR / UNDO / DOUBLE, slip total and the rejection message.
import { CHIP_DENOMINATIONS_KUP, CURRENCY_LABEL, PER_NUMBER_LIMIT_KUP, TOTAL_LIMIT_KUP, type ChipKup } from '../config/money';
import type { UiStatus } from './controller';
import { cssColor, THEME } from './theme';

export interface ControlsHandlers {
  selectChip(chip: ChipKup): void;
  clear(): void;
  undo(): void;
  double(): void;
}

export interface Controls {
  render(status: UiStatus): void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createControls(host: HTMLElement, handlers: ControlsHandlers): Controls {
  host.replaceChildren();

  const chipsRow = el('div', 'chip-row');
  chipsRow.setAttribute('role', 'group');
  chipsRow.setAttribute('aria-label', 'Chip value');
  const chipButtons = new Map<ChipKup, HTMLButtonElement>();
  for (const chip of CHIP_DENOMINATIONS_KUP) {
    const b = el('button', 'chip', String(chip));
    b.type = 'button';
    b.dataset.chip = String(chip);
    b.title = `${chip} ${CURRENCY_LABEL}`;
    const c = THEME.chips[chip];
    b.style.setProperty('--chip-fill', cssColor(c.fill));
    b.style.setProperty('--chip-edge', cssColor(c.edge));
    b.style.setProperty('--chip-text', cssColor(c.text));
    b.addEventListener('click', () => handlers.selectChip(chip));
    chipButtons.set(chip, b);
    chipsRow.append(b);
  }

  const actions = el('div', 'actions');
  const button = (label: string, action: keyof Omit<ControlsHandlers, 'selectChip'>): HTMLButtonElement => {
    const b = el('button', 'action', label);
    b.type = 'button';
    b.dataset.action = action;
    b.addEventListener('click', () => handlers[action]());
    actions.append(b);
    return b;
  };
  const clearBtn = button('CLEAR', 'clear');
  const undoBtn = button('UNDO', 'undo');
  const doubleBtn = button('DOUBLE', 'double');

  const info = el('div', 'info');
  const total = el('span', 'total');
  const limits = el('span', 'limits', `Limits: ${PER_NUMBER_LIMIT_KUP} ${CURRENCY_LABEL} per number, ${TOTAL_LIMIT_KUP} ${CURRENCY_LABEL} total`);
  info.append(total, limits);

  const message = el('div', 'message');
  message.setAttribute('role', 'status');
  message.setAttribute('aria-live', 'polite');

  const hint = el('div', 'hint', 'Click: add chip · Shift+click or right click: remove one chip');

  const bar = el('div', 'bar');
  bar.append(chipsRow, actions);
  host.append(bar, info, message, hint);

  return {
    render(status: UiStatus): void {
      for (const [chip, b] of chipButtons) b.setAttribute('aria-pressed', String(chip === status.selectedChip));
      clearBtn.disabled = !status.canClear;
      undoBtn.disabled = !status.canUndo;
      doubleBtn.disabled = !status.canDouble;
      total.textContent = `Total bet: ${status.totalText}`;
      message.textContent = status.message ?? '';
      message.hidden = status.message === null;
    },
  };
}
