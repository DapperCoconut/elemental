import Phaser from 'phaser';

/**
 * Elemental's shared visual language — "Arcane Forge".
 *
 * Every menu surface in the game is built from the primitives in `src/ui/`, and
 * every colour, font and metric they use lives here. Scenes should reach for a
 * token instead of a raw literal so the whole game re-skins from one file.
 *
 * The look: cold obsidian plating lit from within by a single accent colour.
 * Panels are cut-cornered metal plates, not rounded web cards; frames are
 * double-struck (a bright inner hairline inside a dim outer edge) with corner
 * brackets, so surfaces read as machined rather than drawn.
 */

// ── Surfaces ──────────────────────────────────────────────────────────

/**
 * Not `as const` on purpose — these are widths-and-colours, and literal types
 * would leak into every default parameter that uses one (`accent = C.arcane`
 * would then only accept that exact number).
 */
export const C: Record<
  'void_' | 'bg' | 'plate' | 'plateLit' | 'well' | 'line' | 'lineSoft' |
  'arcane' | 'gold' | 'ember' | 'frost' | 'verdant' | 'blood' | 'corrupt' | 'steel',
  number
> = {
  /** Furthest-back void. */
  void_: 0x05050c,
  /** Standard scene backdrop. */
  bg: 0x0a0a14,
  /** Raised plate. */
  plate: 0x14142a,
  /** Raised plate, lit edge (top of a plate gradient). */
  plateLit: 0x1e1e3a,
  /** Recessed well — list rows, input troughs. */
  well: 0x0d0d1c,
  /** Hairline rules and inert strokes. */
  line: 0x2b2b4a,
  lineSoft: 0x1c1c32,

  // ── Accents ─────────────────────────────────────────────────────────
  /** Primary — arcane violet. Lab, portals, abstract content. */
  arcane: 0x9d5cff,
  /** Currency + highlights. */
  gold: 0xffc44d,
  /** Fire / danger / campaign. */
  ember: 0xff7a2f,
  /** Water / info / online. */
  frost: 0x4fc3ff,
  /** Life / confirm / go. */
  verdant: 0x4ade80,
  /** Blood / destroy / hard mode. */
  blood: 0xff4d6d,
  /** Corrupt shards, invasion. */
  corrupt: 0xd946ef,
  /** Neutral chrome for quiet controls. */
  steel: 0x8a8ab0,
};

// ── Text colours (Phaser wants CSS strings) ───────────────────────────

export const T = {
  bright: '#f2f2ff',
  normal: '#c8c8e4',
  dim: '#8a8ab0',
  faint: '#5a5a7a',
  ghost: '#3a3a55',
  gold: '#ffc44d',
  good: '#67e8a0',
  bad: '#ff6b85',
} as const;

// ── Type ──────────────────────────────────────────────────────────────

/** Heavy poster face for titles and button labels. */
export const FONT_DISPLAY = '"Arial Black", "Segoe UI Black", Impact, sans-serif';
/** Humanist face for body copy — noticeably warmer than plain Arial. */
export const FONT_UI = '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif';
/** Numerals, costs, codes. */
export const FONT_MONO = '"Consolas", "SF Mono", "Courier New", monospace';

// ── Metrics ───────────────────────────────────────────────────────────

/** Default corner cut on plates, in px. */
export const CUT = 10;
/** Standard depth bands, so scenes stop inventing their own. */
export const DEPTH: Record<
  'backdrop' | 'base' | 'panel' | 'content' | 'overlay' | 'modal' | 'modalContent' | 'toast',
  number
> = {
  backdrop: -100,
  base: 0,
  panel: 10,
  content: 20,
  overlay: 100,
  modal: 110,
  modalContent: 120,
  toast: 200,
};

// ── Colour maths ──────────────────────────────────────────────────────

/** `0xrrggbb` → `'#rrggbb'`. */
export function hex(color: number): string {
  return '#' + (color >>> 0).toString(16).padStart(6, '0');
}

/** Blend two packed colours. `t` of 0 returns `a`, 1 returns `b`. */
export function mix(a: number, b: number, t: number): number {
  const ca = Phaser.Display.Color.IntegerToColor(a);
  const cb = Phaser.Display.Color.IntegerToColor(b);
  const k = Phaser.Math.Clamp(t, 0, 1);
  const r = Math.round(ca.red + (cb.red - ca.red) * k);
  const g = Math.round(ca.green + (cb.green - ca.green) * k);
  const bl = Math.round(ca.blue + (cb.blue - ca.blue) * k);
  return (r << 16) | (g << 8) | bl;
}

/** Pull a colour toward white. */
export function lighten(color: number, t: number): number {
  return mix(color, 0xffffff, t);
}

/** Pull a colour toward black. */
export function darken(color: number, t: number): number {
  return mix(color, 0x000000, t);
}

/**
 * The near-black tint an accent picks up when it is used as a panel fill.
 * Keeps every surface obviously *of* its accent without washing out text.
 */
export function tintPlate(accent: number, strength = 0.14): number {
  return mix(C.plate, accent, strength);
}

/** Text colour that stays legible on a dark plate of this accent. */
export function accentText(accent: number): string {
  return hex(lighten(accent, 0.45));
}

