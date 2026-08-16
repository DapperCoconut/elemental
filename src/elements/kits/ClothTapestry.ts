/**
 * Cloth's loom: the artwork deck, the polyomino shapes they are sewn in as, and the arithmetic
 * that turns a finished tapestry back into numbers the kit can use.
 *
 * Deliberately free of Phaser — this file is data and set theory, so the previews, the bot and
 * the arena can all read the same deck without dragging a scene along with them.
 *
 * Three rules run the whole draft:
 *
 *  1. **Every artwork has its own shape, and shapes never rotate.** There are 37 artworks and 37
 *     distinct fixed polyominoes below, so no two pieces ever look alike on the loom and the
 *     player can tell what is sewn where at a glance. Not rotating is what makes the 5×5 a real
 *     puzzle rather than a formality.
 *  2. **Bigger means stronger.** Tier 1s are dominoes and trominoes, tier 3s and the unique
 *     passives are tetrominoes, and everything that hands over a whole new button is a pentomino.
 *     Twenty-five squares is therefore about six or seven artworks, and a right-click ability
 *     costs a fifth of the loom on its own.
 *  3. **Only the tiered families repeat.** Sharpness, Speedy, Survive, Braid, Thorns, Quick and
 *     Technique come in 1/2/3 and may be drafted more than once; everything else is offered only
 *     while you do not already own it, and right-click artworks stop being offered entirely the
 *     moment one is on the loom.
 */

export const TAPESTRY_SIZE = 5;
export const TAPESTRY_CELLS = TAPESTRY_SIZE * TAPESTRY_SIZE;

/** A cell offset inside a piece, normalised so the top-left of its bounding box is (0,0). */
export type Cell = readonly [number, number];

export type ArtworkKind =
  /** Flat numbers. The tiered families and the one-off passives alike. */
  | 'passive'
  /** Hands over the right-click button. Only one of these may ever be on the loom. */
  | 'rightclick';

export interface ArtworkDef {
  id: string;
  name: string;
  /** What it does, in one line — printed on the draft card and on the loom's tooltip. */
  blurb: string;
  kind: ArtworkKind;
  /**
   * Tiered families may be drafted repeatedly and stack; everything with no family is unique and
   * stops being offered once owned.
   */
  family?: string;
  tier?: 1 | 2 | 3;
  /** The fixed polyomino this artwork is sewn as. Never rotated. */
  cells: readonly Cell[];
  /** Thread colour on the loom, so a finished tapestry reads as a picture rather than a table. */
  color: number;
  /** Only offered once the Tapestry ultimate has been upgraded — see Q+ Salvage. */
  needsUpgrade?: boolean;
}

// ── Shapes ───────────────────────────────────────────────────────────────────
// Named after the polyomino they are, so a glance at the table below reads as sizes.

const D_H: Cell[] = [[0, 0], [1, 0]];
const D_V: Cell[] = [[0, 0], [0, 1]];

const T_IH: Cell[] = [[0, 0], [1, 0], [2, 0]];
const T_IV: Cell[] = [[0, 0], [0, 1], [0, 2]];
const T_LA: Cell[] = [[0, 0], [0, 1], [1, 1]];
const T_LB: Cell[] = [[0, 0], [1, 0], [1, 1]];
const T_LC: Cell[] = [[1, 0], [0, 1], [1, 1]];
const T_LD: Cell[] = [[0, 0], [1, 0], [0, 1]];

const Q_IH: Cell[] = [[0, 0], [1, 0], [2, 0], [3, 0]];
const Q_IV: Cell[] = [[0, 0], [0, 1], [0, 2], [0, 3]];
const Q_O: Cell[] = [[0, 0], [1, 0], [0, 1], [1, 1]];
const Q_TU: Cell[] = [[0, 0], [1, 0], [2, 0], [1, 1]];
const Q_TR: Cell[] = [[0, 0], [0, 1], [0, 2], [1, 1]];
const Q_TD: Cell[] = [[1, 0], [0, 1], [1, 1], [2, 1]];
const Q_TL: Cell[] = [[1, 0], [0, 1], [1, 1], [1, 2]];
const Q_SH: Cell[] = [[1, 0], [2, 0], [0, 1], [1, 1]];
const Q_SV: Cell[] = [[0, 0], [0, 1], [1, 1], [1, 2]];
const Q_ZH: Cell[] = [[0, 0], [1, 0], [1, 1], [2, 1]];
const Q_ZV: Cell[] = [[1, 0], [0, 1], [1, 1], [0, 2]];
const Q_J0: Cell[] = [[0, 0], [0, 1], [1, 1], [2, 1]];
const Q_J1: Cell[] = [[0, 0], [1, 0], [0, 1], [0, 2]];
const Q_J2: Cell[] = [[0, 0], [1, 0], [2, 0], [2, 1]];
const Q_J3: Cell[] = [[1, 0], [1, 1], [0, 2], [1, 2]];
const Q_L0: Cell[] = [[2, 0], [0, 1], [1, 1], [2, 1]];
const Q_L1: Cell[] = [[0, 0], [0, 1], [0, 2], [1, 2]];
const Q_L2: Cell[] = [[0, 0], [1, 0], [2, 0], [0, 1]];
const Q_L3: Cell[] = [[0, 0], [1, 0], [1, 1], [1, 2]];

const P_F: Cell[] = [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]];
const P_I: Cell[] = [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]];
const P_L: Cell[] = [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]];
const P_N: Cell[] = [[1, 0], [1, 1], [0, 2], [1, 2], [0, 3]];
const P_P: Cell[] = [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]];
const P_T: Cell[] = [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]];
const P_U: Cell[] = [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]];
const P_V: Cell[] = [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]];
const P_W: Cell[] = [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]];
const P_X: Cell[] = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]];
const P_Y: Cell[] = [[1, 0], [0, 1], [1, 1], [1, 2], [1, 3]];

// ── Thread colours ───────────────────────────────────────────────────────────

const C_SHARP = 0xf1e7d0;
const C_SPEED = 0x6fd6f0;
const C_LIFE = 0x67d98a;
const C_BRAID = 0xc79bf0;
const C_THORN = 0xff7a4d;
const C_QUICK = 0xffd166;
const C_TECH = 0xb8c4d6;
const C_ODD = 0xe08bb8;
const C_RMB = 0xff4d6d;

// ── The deck ─────────────────────────────────────────────────────────────────

export const ARTWORKS: ArtworkDef[] = [
  // ── Sharpness — raw damage ──
  { id: 'sharpness-1', name: 'Sharpness I', family: 'sharpness', tier: 1, kind: 'passive', cells: D_H, color: C_SHARP,
    blurb: '+15% damage.' },
  { id: 'sharpness-2', name: 'Sharpness II', family: 'sharpness', tier: 2, kind: 'passive', cells: T_LA, color: C_SHARP,
    blurb: '+30% damage.' },
  { id: 'sharpness-3', name: 'Sharpness III', family: 'sharpness', tier: 3, kind: 'passive', cells: Q_SH, color: C_SHARP,
    blurb: '+45% damage.' },

  // ── Speedy — move speed ──
  { id: 'speedy-1', name: 'Speedy I', family: 'speedy', tier: 1, kind: 'passive', cells: D_V, color: C_SPEED,
    blurb: '+12% move speed.' },
  { id: 'speedy-2', name: 'Speedy II', family: 'speedy', tier: 2, kind: 'passive', cells: T_IH, color: C_SPEED,
    blurb: '+24% move speed.' },
  { id: 'speedy-3', name: 'Speedy III', family: 'speedy', tier: 3, kind: 'passive', cells: Q_TU, color: C_SPEED,
    blurb: '+36% move speed.' },

  // ── Survive — a longer scarf, and eventually armour with it ──
  { id: 'survive-1', name: 'Survive I', family: 'survive', tier: 1, kind: 'passive', cells: T_LB, color: C_LIFE,
    blurb: '+20 scarf, healed for it. A longer tail.' },
  { id: 'survive-2', name: 'Survive II', family: 'survive', tier: 2, kind: 'passive', cells: Q_O, color: C_LIFE,
    blurb: '+40 scarf, healed for it.' },
  { id: 'survive-3', name: 'Survive III', family: 'survive', tier: 3, kind: 'passive', cells: Q_TD, color: C_LIFE,
    blurb: '+75 scarf, healed for it, and 20% less damage taken.' },

  // ── Braid — a shorter scarf is a smaller hitbox ──
  { id: 'braid-1', name: 'Braid I', family: 'braid', tier: 1, kind: 'passive', cells: T_IV, color: C_BRAID,
    blurb: 'Scarf 20% shorter — less of you to hit.' },
  { id: 'braid-2', name: 'Braid II', family: 'braid', tier: 2, kind: 'passive', cells: Q_ZH, color: C_BRAID,
    blurb: 'Scarf 35% shorter.' },
  { id: 'braid-3', name: 'Braid III', family: 'braid', tier: 3, kind: 'passive', cells: Q_L0, color: C_BRAID,
    blurb: 'Scarf 50% shorter.' },

  // ── Thorns — what Pinned HP throws back ──
  { id: 'thorns-1', name: 'Thorns I', family: 'thorns', tier: 1, kind: 'passive', cells: T_LC, color: C_THORN,
    blurb: 'Pinned HP reflects 40% instead of 25%.' },
  { id: 'thorns-2', name: 'Thorns II', family: 'thorns', tier: 2, kind: 'passive', cells: Q_SV, color: C_THORN,
    blurb: 'Pinned HP reflects 60%.' },
  { id: 'thorns-3', name: 'Thorns III', family: 'thorns', tier: 3, kind: 'passive', cells: Q_J0, color: C_THORN,
    blurb: 'Pinned HP reflects 85%, and stops taking extra damage.' },

  // ── Quick — cooldowns ──
  { id: 'quick-1', name: 'Quick I', family: 'quick', tier: 1, kind: 'passive', cells: T_LD, color: C_QUICK,
    blurb: 'Cooldowns 10% shorter.' },
  { id: 'quick-2', name: 'Quick II', family: 'quick', tier: 2, kind: 'passive', cells: Q_ZV, color: C_QUICK,
    blurb: 'Cooldowns 20% shorter.' },
  { id: 'quick-3', name: 'Quick III', family: 'quick', tier: 3, kind: 'passive', cells: Q_J2, color: C_QUICK,
    blurb: 'Cooldowns 30% shorter.' },

  // ── Technique — dodge and crit ──
  { id: 'technique-1', name: 'Technique I', family: 'technique', tier: 1, kind: 'passive', cells: Q_TR, color: C_TECH,
    blurb: '10% dodge chance and 5% crit chance.' },
  { id: 'technique-2', name: 'Technique II', family: 'technique', tier: 2, kind: 'passive', cells: Q_L2, color: C_TECH,
    blurb: '20% dodge and 10% crit.' },
  { id: 'technique-3', name: 'Technique III', family: 'technique', tier: 3, kind: 'passive', cells: Q_TL, color: C_TECH,
    blurb: '30% dodge and 15% crit.' },

  // ── One-off passives ──
  { id: 'sharpened-pins', name: 'Sharpened Pins', kind: 'passive', cells: Q_IH, color: C_SHARP,
    blurb: 'Every pin deals +1 — the click, and every pin Pin Push throws.' },
  { id: 'echo', name: 'Echo', kind: 'passive', cells: Q_J1, color: C_ODD,
    blurb: '20% of clicks stab a second time for free.' },
  { id: 'thick-skin', name: 'Thick Skin', kind: 'passive', cells: Q_L1, color: C_ODD,
    blurb: 'Nothing pierces you any more, and 15% of all damage taken becomes Pinned HP instead.' },
  { id: 'reach', name: 'Reach', kind: 'passive', cells: Q_IV, color: C_SHARP,
    blurb: 'Click reach doubled.' },
  { id: 'split', name: 'Split', kind: 'passive', cells: Q_L3, color: C_BRAID,
    blurb: 'The scarf splits in two. Both halves are shorter — unless they both catch the same blast.' },

  // ── One-off passives gated behind Q+ ──
  { id: 'combo', name: 'Combo', kind: 'passive', needsUpgrade: true, cells: P_N, color: C_ODD,
    blurb: 'The grapple spin triggers on the 6th pin instead of the 10th.' },
  { id: 'grand-hold', name: 'Grand Hold', kind: 'passive', needsUpgrade: true, cells: P_P, color: C_ODD,
    blurb: 'Cloth webs have double the health — twice as long stuck.' },
  { id: 'slicing-hold', name: 'Slicing Hold', kind: 'passive', needsUpgrade: true, cells: P_W, color: C_THORN,
    blurb: 'Cloth webs cut: 5 damage a second to whoever is caught in one.' },

  // ── Right-click artworks — one at a time, ever ──
  { id: 'scarf-switch', name: 'Scarf Switch', kind: 'rightclick', cells: P_T, color: C_RMB,
    blurb: 'Right click: a close whip for 5 that stuns for 1.2s.' },
  { id: 'burn-it-down', name: 'Burn It Down', kind: 'rightclick', cells: P_F, color: C_RMB,
    blurb: 'Hold right click: light the end of the scarf. Damage climbs the longer it burns, and the scarf burns down with it.' },
  { id: 'heavy-coat', name: 'Heavy Coat', kind: 'rightclick', cells: P_U, color: C_RMB,
    blurb: 'Right click: block the next 3 hits outright. 12s cooldown.' },
  { id: 'nail-storm', name: 'Nail Storm', kind: 'rightclick', cells: P_X, color: C_RMB,
    blurb: 'Right click: a maelstrom of nails thrown out in every direction.' },
  { id: 'clothstorm', name: 'Clothstorm', kind: 'rightclick', cells: P_V, color: C_RMB,
    blurb: 'Right click: an AOE burst for 12 that slows by 30% for 3s.' },
  { id: 're-knit', name: 'Re-Knit', kind: 'rightclick', cells: P_Y, color: C_RMB,
    blurb: 'Right click: root yourself for 3s to re-knit. +35 scarf and +25 Pinned HP.' },
  { id: 'location-pin', name: 'Location Pin', kind: 'rightclick', cells: P_L, color: C_RMB,
    blurb: 'Right click: plant a marker. Longpin swings to it, and Safety Line anchors there instead.' },
  { id: 'scarf-slice', name: 'Scarf Slice', kind: 'rightclick', cells: P_I, color: C_RMB,
    blurb: 'Right click: pin the scarf in place for 2s, then snap it back along the path you walked for 15 to anything on it.' },
];

export const ARTWORK_MAP: Record<string, ArtworkDef> = Object.fromEntries(
  ARTWORKS.map((a) => [a.id, a]),
);

// ── The loom ─────────────────────────────────────────────────────────────────

export interface PlacedArtwork {
  id: string;
  /** Top-left of the piece's bounding box on the grid. */
  gx: number;
  gy: number;
}

export interface TapestryState {
  placed: PlacedArtwork[];
  /** `null` or an artwork id per square. Derived from `placed`, kept for O(1) fit tests. */
  grid: (string | null)[];
}

export function emptyTapestry(): TapestryState {
  return { placed: [], grid: new Array(TAPESTRY_CELLS).fill(null) };
}

export function cloneTapestry(t: TapestryState): TapestryState {
  return { placed: t.placed.map((p) => ({ ...p })), grid: [...t.grid] };
}

/** Can this artwork's shape sit with its bounding box at (gx, gy) without overlap or overhang? */
export function canPlace(t: TapestryState, def: ArtworkDef, gx: number, gy: number): boolean {
  for (const [cx, cy] of def.cells) {
    const x = gx + cx;
    const y = gy + cy;
    if (x < 0 || y < 0 || x >= TAPESTRY_SIZE || y >= TAPESTRY_SIZE) return false;
    if (t.grid[y * TAPESTRY_SIZE + x] !== null) return false;
  }
  return true;
}

/** Every origin this artwork would still fit at, in reading order. Empty means it cannot be sewn. */
export function fitsAt(t: TapestryState, def: ArtworkDef): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let y = 0; y < TAPESTRY_SIZE; y++) {
    for (let x = 0; x < TAPESTRY_SIZE; x++) {
      if (canPlace(t, def, x, y)) out.push([x, y]);
    }
  }
  return out;
}

export function place(t: TapestryState, def: ArtworkDef, gx: number, gy: number): boolean {
  if (!canPlace(t, def, gx, gy)) return false;
  for (const [cx, cy] of def.cells) {
    t.grid[(gy + cy) * TAPESTRY_SIZE + (gx + cx)] = def.id;
  }
  t.placed.push({ id: def.id, gx, gy });
  return true;
}

/**
 * The three cards a Tapestry cast offers.
 *
 * Everything unique that is already owned is out, right-click artworks are out entirely once one
 * is on the loom, the three Q+ artworks are out unless the ultimate has been upgraded, and — the
 * part that matters most in a long match — anything that no longer *fits* anywhere is out too, so
 * the draft never offers a pentomino to a loom with four squares left in it.
 */
export function rollOffers(t: TapestryState, hasQUpgrade: boolean, count = 3): ArtworkDef[] {
  const owned = new Set(t.placed.map((p) => p.id));
  const hasRightClick = t.placed.some((p) => ARTWORK_MAP[p.id]?.kind === 'rightclick');

  const pool = ARTWORKS.filter((a) => {
    if (a.needsUpgrade && !hasQUpgrade) return false;
    if (a.kind === 'rightclick' && hasRightClick) return false;
    // Only the tiered families repeat.
    if (!a.family && owned.has(a.id)) return false;
    return canPlaceAnywhere(t, a);
  });

  // Weight the tiers so a loom does not fill up with Sharpness III on turn one: tier 1s are the
  // common draw, tier 3s and the right-click artworks are the prize.
  const weighted: ArtworkDef[] = [];
  for (const a of pool) {
    const w = a.kind === 'rightclick' ? 2 : a.tier === 3 ? 2 : a.tier === 2 ? 3 : a.tier === 1 ? 5 : 3;
    for (let i = 0; i < w; i++) weighted.push(a);
  }

  const out: ArtworkDef[] = [];
  const taken = new Set<string>();
  let guard = 0;
  while (out.length < count && weighted.length > 0 && guard++ < 400) {
    const pick = weighted[Math.floor(Math.random() * weighted.length)];
    if (taken.has(pick.id)) continue;
    // A right-click artwork can only be one of the three, never two.
    if (pick.kind === 'rightclick' && out.some((o) => o.kind === 'rightclick')) continue;
    taken.add(pick.id);
    out.push(pick);
  }
  return out;
}

function canPlaceAnywhere(t: TapestryState, def: ArtworkDef): boolean {
  for (let y = 0; y < TAPESTRY_SIZE; y++) {
    for (let x = 0; x < TAPESTRY_SIZE; x++) {
      if (canPlace(t, def, x, y)) return true;
    }
  }
  return false;
}

// ── What a finished tapestry is worth ────────────────────────────────────────

export interface TapestryEffects {
  /** Multiplies everything Cloth deals. */
  damageMult: number;
  speedMult: number;
  /** Added to max scarf, and healed for on the spot when the artwork lands. */
  bonusScarf: number;
  /** Survive III's flat armour. */
  incomingMult: number;
  /** 0–1: how much shorter the drawn scarf (and therefore the hitbox) is. */
  scarfShorter: number;
  /** Fraction of what Pinned HP eats that comes back at the attacker. */
  thorns: number;
  /** Thorns III: Pinned HP stops taking 25% extra. */
  pinnedNoVuln: boolean;
  /** Multiplies every Cloth cooldown. */
  cooldownMult: number;
  dodge: number;
  crit: number;
  /** Sharpened Pins. */
  pinBonus: number;
  echoChance: number;
  thickSkin: boolean;
  reachMult: number;
  split: boolean;
  /** Pins needed to trigger the Click+ spin. */
  comboAt: number;
  webHpMult: number;
  webDps: number;
  rightClick: string | null;
}

export function baseEffects(): TapestryEffects {
  return {
    damageMult: 1,
    speedMult: 1,
    bonusScarf: 0,
    incomingMult: 1,
    scarfShorter: 0,
    thorns: 0.25,
    pinnedNoVuln: false,
    cooldownMult: 1,
    dodge: 0,
    crit: 0,
    pinBonus: 0,
    echoChance: 0,
    thickSkin: false,
    reachMult: 1,
    split: false,
    comboAt: 10,
    webHpMult: 1,
    webDps: 0,
    rightClick: null,
  };
}

/**
 * Fold the loom down into one struct.
 *
 * Tiered families stack **additively within their own family** — two Sharpness IIs is +60%, not
 * ×1.69 — because the whole point of the draft is that a second copy of a thing you already have
 * is a known, boring quantity next to a shape you have not tried yet. Braid is capped short of 1
 * so the scarf can never vanish entirely, and Quick is floored so cooldowns never reach zero.
 */
export function summarise(t: TapestryState): TapestryEffects {
  const e = baseEffects();
  let sharp = 0;
  let speed = 0;
  let braid = 0;
  let quick = 0;
  let thornsTier = 0;
  let techTier = 0;

  for (const p of t.placed) {
    const def = ARTWORK_MAP[p.id];
    if (!def) continue;
    switch (def.family) {
      case 'sharpness': sharp += def.tier === 3 ? 0.45 : def.tier === 2 ? 0.30 : 0.15; break;
      case 'speedy': speed += def.tier === 3 ? 0.36 : def.tier === 2 ? 0.24 : 0.12; break;
      case 'survive':
        e.bonusScarf += def.tier === 3 ? 75 : def.tier === 2 ? 40 : 20;
        if (def.tier === 3) e.incomingMult *= 0.8;
        break;
      case 'braid': braid += def.tier === 3 ? 0.50 : def.tier === 2 ? 0.35 : 0.20; break;
      case 'thorns': thornsTier = Math.max(thornsTier, def.tier ?? 1); break;
      case 'quick': quick += def.tier === 3 ? 0.30 : def.tier === 2 ? 0.20 : 0.10; break;
      case 'technique': techTier = Math.max(techTier, def.tier ?? 1); break;
      default: break;
    }

    switch (def.id) {
      case 'sharpened-pins': e.pinBonus += 1; break;
      case 'echo': e.echoChance = 0.2; break;
      case 'thick-skin': e.thickSkin = true; break;
      case 'reach': e.reachMult = 2; break;
      case 'split': e.split = true; break;
      case 'combo': e.comboAt = 6; break;
      case 'grand-hold': e.webHpMult = 2; break;
      case 'slicing-hold': e.webDps = 5; break;
      default: break;
    }

    if (def.kind === 'rightclick') e.rightClick = def.id;
  }

  e.damageMult = 1 + sharp;
  e.speedMult = 1 + speed;
  e.scarfShorter = Math.min(0.8, braid);
  e.cooldownMult = Math.max(0.3, 1 - quick);

  // Thorns takes the best tier rather than stacking: three copies of Thorns I should not quietly
  // out-reflect the tier 3 that also removes the vulnerability.
  if (thornsTier === 3) { e.thorns = 0.85; e.pinnedNoVuln = true; } else if (thornsTier === 2) e.thorns = 0.6;
  else if (thornsTier === 1) e.thorns = 0.4;

  if (techTier === 3) { e.dodge = 0.3; e.crit = 0.15; } else if (techTier === 2) { e.dodge = 0.2; e.crit = 0.10; }
  else if (techTier === 1) { e.dodge = 0.1; e.crit = 0.05; }

  return e;
}

/** How many squares of the loom are sewn. Drives the mastery requirement and the HUD readout. */
export function usedCells(t: TapestryState): number {
  return t.grid.reduce((n: number, c) => n + (c === null ? 0 : 1), 0);
}
