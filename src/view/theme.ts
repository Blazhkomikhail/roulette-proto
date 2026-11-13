// Flat, top-down look [Д]. Own palette, not the reference's style [З][У§1].
export const THEME = {
  pageBackground: 0x0e2a1c,
  felt: 0x17663a,
  line: 0xeae6d6,
  lineWidth: 2,
  zero: 0x1f8f4e,
  red: 0xc62f35,
  black: 0x1c1c1c,
  text: 0xffffff,
  font: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
  numberFontSize: 22,
  captionFontSize: 18,
  /** Numbers covered by the hovered bet: light overlay + outline, readable on red, black and green. */
  highlightCells: { fill: 0xffffff, alpha: 0.28, stroke: 0xffd23f, strokeWidth: 3 },
  /** The clickable zone itself (thin bands are only visible through this). */
  highlightZone: { fill: 0xffd23f, alpha: 0.85, stroke: 0xfff6c8 }, 
  tooltip: { height: 44, background: 0x0a1f14, text: 0xffffff, muted: 0x9fb8a8, fontSize: 18 },
  padding: 20,
  /** Chip colours by denomination (Kup). Shared by the Pixi stacks and the DOM chip buttons. */
  chips: {
    1: { fill: 0xf2f2f2, edge: 0x9a9a9a, text: 0x1c1c1c },
    5: { fill: 0xd8403f, edge: 0xffffff, text: 0xffffff },
    10: { fill: 0x2f6fd6, edge: 0xffffff, text: 0xffffff },
    25: { fill: 0x2e9b57, edge: 0xffffff, text: 0xffffff },
    100: { fill: 0x2a2a2a, edge: 0xe8c96a, text: 0xe8c96a },
  },
  chipRadius: 18,
  /** Stacks show at most this many discs; the label carries the full amount. */
  chipStackMaxDiscs: 5,
  chipStackOffset: 3,
} as const;

export const cssColor = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;
