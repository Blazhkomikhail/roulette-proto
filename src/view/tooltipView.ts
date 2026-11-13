import { Container, Graphics, Text } from 'pixi.js';
import { THEME } from './theme';

const HINT = 'Hover over the table to see the bet';

/** Bet name shown in a strip above the table [З]. */
export class TooltipView {
  readonly container = new Container({ label: 'tooltip' });
  private readonly text: Text;

  constructor(width: number) {
    const bg = new Graphics().roundRect(0, 0, width, THEME.tooltip.height, 6).fill(THEME.tooltip.background);
    this.text = new Text({
      text: HINT,
      style: { fontFamily: THEME.font, fontSize: THEME.tooltip.fontSize, fontWeight: '600', fill: THEME.tooltip.muted },
    });
    this.text.anchor.set(0.5);
    this.text.position.set(width / 2, THEME.tooltip.height / 2);
    this.container.addChild(bg, this.text);
    this.container.eventMode = 'none';
  }

  show(label: string | null): void {
    this.text.text = label ?? HINT;
    this.text.style.fill = label ? THEME.tooltip.text : THEME.tooltip.muted;
  }
}
