/**
 * Husk variant table for Invasion mode — the elemental rewrite.
 *
 * Husks no longer harden with the wave count. Instead, every spawn has a
 * chance to be struck by elemental lightning the moment it climbs through the
 * window, which brands it with one of 47 elemental variants (every element in
 * the game except Quantum, Dream and Justice). Variants come in three tiers —
 * the bolt hits harder in later waves — and three categories:
 *
 *   normal   — the base + combined fifteen. Roll on every difficulty.
 *   abstract — the abstract fifteen. Only roll on BRUTAL and up, and carry a
 *              stat premium to match.
 *   corrupt  — the seventeen cut out of the Corrupt Realm's lab and vault.
 *              MASOCHISTIC only, and the nastiest of the lot.
 *
 * Every tenth wave still spawns one of the three bosses on top of the wave —
 * and those are exactly the three elements the lightning cannot brand, because
 * Justice, Dream and Quantum do not come through a window. They come as the
 * Arbiter, the Dreamer and the Paradox, in three tiers of their own, and in a
 * room the corruption has taken they come infected. Bosses are never rolled by
 * the lightning.
 *
 * The def shape (HuskVariantDef) is shared with every other husk consumer —
 * the Disgraced King's court, the boss toolkit thralls, the Summoner mutation,
 * the campaign horde format and the Graveyard — so it stays intact; those
 * callers simply reference elemental ids now that the old seven are gone.
 */

export type HuskBehavior =
  | 'melee'    // chase and bite
  | 'ranged'   // keep distance, lob single shots
  | 'medic'    // keep distance, pulse-heal other husks
  | 'charger'  // telegraph a lane, then dash down it
  | 'titan'    // slow melee brute that summons adds (the Graveyard's, not a wave boss)
  | 'boss';    // one of the three tenth-wave bosses, driven by BossBrain

/** The three things the tenth wave sends. Their moves live in InvasionBosses.ts. */
export type BossKind = 'arbiter' | 'dreamer' | 'paradox';

export type HuskCategory = 'normal' | 'abstract' | 'corrupt';

/** Matches SoulVisuals' AmalgamQuirk — the silhouette a recruited variant wears. */
export type HuskQuirk = 'bulk' | 'lean' | 'sac' | 'halo' | 'horns' | 'gut';

/** The small elemental glyph BootScene stamps on the body so variants read at a glance. */
export type HuskMarker =
  | 'flame' | 'droplet' | 'leaf' | 'gust' | 'rock' | 'slick' | 'crescent'
  | 'snow' | 'gem' | 'ghost' | 'fang' | 'hourglass' | 'ring' | 'hammer'
  | 'bolt' | 'flask' | 'card' | 'note' | 'star' | 'magnet' | 'gear' | 'orb'
  | 'skull' | 'ball' | 'book' | 'mask' | 'scribble' | 'banner' | 'heart'
  | 'coin' | 'bone' | 'eye' | 'rad' | 'chain' | 'meat' | 'echo' | 'dagger'
  | 'wave' | 'brick' | 'page' | 'pit';

export interface HuskVariantDef {
  id: string;
  name: string;
  /** Body tint, 0xRRGGBB. */
  color: number;
  hpMult: number;
  speedMult: number;
  damageMult: number;
  sizeMult: number;
  behavior: HuskBehavior;
  /** First wave this variant can be rolled on. */
  minWave: number;
  /** Base roll weight (relative, within its tier/category bucket). */
  weight: number;
  /** Kept for def-shape compatibility; the lightning roll ignores these two. */
  weightRamp: number;
  weightCap: number;
  isBoss?: boolean;
  /** Distance a ranged/kiting variant tries to hold from its target. */
  preferredRange?: number;
  /** Detonates on death, damaging players *and* other husks. */
  explodes?: boolean;
  // ── Elemental variant extras ─────────────────────────────────────
  /** The element this husk was struck with. Drives the effect engine. */
  elementId?: string;
  /** 1–3. Higher tiers appear in later waves with stronger effects. */
  tier?: 1 | 2 | 3;
  category?: HuskCategory;
  /** Elemental glyph baked into the body texture. */
  marker?: HuskMarker;
  /** Soul amalgam silhouette feature for a recruited variant. */
  quirk?: HuskQuirk;
  /** Element emoji, for floating text and banners. */
  emoji?: string;
  /** Killing this pays no shards (illusion decoys, echo splits). */
  noReward?: boolean;
  /** Set on the nine boss defs — which of the three brains drives it. */
  bossKind?: BossKind;
}

/** One elemental family — expanded into three tier defs by the generator below. */
interface HuskFamily {
  elementId: string;
  name: string;
  emoji: string;
  color: number;
  category: HuskCategory;
  behavior: HuskBehavior;
  marker: HuskMarker;
  quirk: HuskQuirk;
  /** Stat multipliers at tier 1, before tier/category premiums. */
  hp: number;
  speed: number;
  damage: number;
  size?: number;
  preferredRange?: number;
  explodes?: boolean;
}

/**
 * The 47 families. Effects live in HuskEffects.ts, keyed by elementId —
 * this table only owns identity, stats and looks.
 */
export const HUSK_FAMILIES: HuskFamily[] = [
  // ── Normal (base + combined) — every difficulty ──────────────────
  { elementId: 'fire', name: 'Fire', emoji: '🔥', color: 0xff4400, category: 'normal', behavior: 'melee', marker: 'flame', quirk: 'horns', hp: 1, speed: 1.05, damage: 1 },
  { elementId: 'water', name: 'Water', emoji: '💧', color: 0x0088ff, category: 'normal', behavior: 'melee', marker: 'droplet', quirk: 'sac', hp: 1.1, speed: 0.95, damage: 0.9 },
  { elementId: 'life', name: 'Life', emoji: '🌿', color: 0x44cc44, category: 'normal', behavior: 'medic', marker: 'leaf', quirk: 'halo', hp: 1, speed: 1, damage: 0.6, preferredRange: 290 },
  { elementId: 'air', name: 'Air', emoji: '💨', color: 0xaaddff, category: 'normal', behavior: 'melee', marker: 'gust', quirk: 'lean', hp: 0.55, speed: 2.1, damage: 0.8, size: 0.85 },
  { elementId: 'earth', name: 'Earth', emoji: '🪨', color: 0x887755, category: 'normal', behavior: 'melee', marker: 'rock', quirk: 'bulk', hp: 2.4, speed: 0.55, damage: 1.3, size: 1.22 },
  { elementId: 'oil', name: 'Oil', emoji: '🛢️', color: 0x664400, category: 'normal', behavior: 'melee', marker: 'slick', quirk: 'sac', hp: 1.1, speed: 0.9, damage: 0.9 },
  { elementId: 'shadow', name: 'Shadow', emoji: '🌑', color: 0x552277, category: 'normal', behavior: 'melee', marker: 'crescent', quirk: 'lean', hp: 0.9, speed: 1.1, damage: 1 },
  { elementId: 'ice', name: 'Ice', emoji: '🧊', color: 0x88ccff, category: 'normal', behavior: 'melee', marker: 'snow', quirk: 'horns', hp: 1.15, speed: 0.85, damage: 1 },
  { elementId: 'growth', name: 'Growth', emoji: '🦠', color: 0x88bb22, category: 'normal', behavior: 'melee', marker: 'leaf', quirk: 'sac', hp: 1, speed: 0.95, damage: 0.9 },
  { elementId: 'crystal', name: 'Crystal', emoji: '💎', color: 0x77c4e8, category: 'normal', behavior: 'melee', marker: 'gem', quirk: 'gut', hp: 0.85, speed: 0.95, damage: 1 },
  { elementId: 'soul', name: 'Soul', emoji: '👻', color: 0xccaaff, category: 'normal', behavior: 'melee', marker: 'ghost', quirk: 'halo', hp: 0.9, speed: 1, damage: 0.9 },
  { elementId: 'hunt', name: 'Hunt', emoji: '🐺', color: 0xcc4400, category: 'normal', behavior: 'charger', marker: 'fang', quirk: 'lean', hp: 1.3, speed: 1, damage: 1.4 },
  { elementId: 'sand', name: 'Time', emoji: '⏳', color: 0xffdd44, category: 'normal', behavior: 'melee', marker: 'hourglass', quirk: 'halo', hp: 1, speed: 0.95, damage: 0.9 },
  { elementId: 'gravity', name: 'Gravity', emoji: '🌌', color: 0x8844cc, category: 'normal', behavior: 'melee', marker: 'ring', quirk: 'halo', hp: 1, speed: 0.9, damage: 0.9 },
  { elementId: 'creation', name: 'Creation', emoji: '⚒️', color: 0xcc6622, category: 'normal', behavior: 'melee', marker: 'hammer', quirk: 'halo', hp: 1.2, speed: 0.9, damage: 0.9 },

  // ── Abstract — BRUTAL and up ─────────────────────────────────────
  { elementId: 'electricity', name: 'Electric', emoji: '⚡', color: 0xffee00, category: 'abstract', behavior: 'ranged', marker: 'bolt', quirk: 'lean', hp: 0.85, speed: 1.15, damage: 0.7, preferredRange: 260 },
  { elementId: 'slime', name: 'Acid', emoji: '🟢', color: 0x66cc44, category: 'abstract', behavior: 'melee', marker: 'flask', quirk: 'sac', hp: 1.05, speed: 0.95, damage: 0.9 },
  { elementId: 'fate', name: 'Fate', emoji: '🃏', color: 0x88eecc, category: 'abstract', behavior: 'melee', marker: 'card', quirk: 'lean', hp: 0.95, speed: 1.05, damage: 1 },
  { elementId: 'sound', name: 'Sound', emoji: '🔊', color: 0xff66cc, category: 'abstract', behavior: 'ranged', marker: 'note', quirk: 'sac', hp: 0.9, speed: 1, damage: 0.65, preferredRange: 300 },
  { elementId: 'light', name: 'Light', emoji: '✨', color: 0xfff4a8, category: 'abstract', behavior: 'charger', marker: 'star', quirk: 'lean', hp: 1.2, speed: 1.05, damage: 1.4 },
  { elementId: 'magnet', name: 'Magnet', emoji: '🧲', color: 0xcc2244, category: 'abstract', behavior: 'melee', marker: 'magnet', quirk: 'horns', hp: 1.1, speed: 0.9, damage: 0.9 },
  { elementId: 'metal', name: 'Metal', emoji: '⚙️', color: 0x8899aa, category: 'abstract', behavior: 'melee', marker: 'gear', quirk: 'bulk', hp: 2.2, speed: 0.55, damage: 1.3, size: 1.2 },
  { elementId: 'plasma', name: 'Plasma', emoji: '🔮', color: 0xaa22ff, category: 'abstract', behavior: 'melee', marker: 'orb', quirk: 'gut', hp: 1, speed: 1, damage: 1 },
  { elementId: 'gunpowder', name: 'Gunpowder', emoji: '💀', color: 0x553377, category: 'abstract', behavior: 'melee', marker: 'skull', quirk: 'gut', hp: 1, speed: 0.8, damage: 1, size: 1.05, explodes: true },
  { elementId: 'rubber', name: 'Rubber', emoji: '🪀', color: 0xff5577, category: 'abstract', behavior: 'melee', marker: 'ball', quirk: 'lean', hp: 1, speed: 1.25, damage: 1 },
  { elementId: 'magic', name: 'Magic', emoji: '📖', color: 0x9944ff, category: 'abstract', behavior: 'ranged', marker: 'book', quirk: 'halo', hp: 0.9, speed: 1, damage: 0.75, preferredRange: 280 },
  { elementId: 'technology', name: 'Tech', emoji: '💻', color: 0x44ccaa, category: 'abstract', behavior: 'ranged', marker: 'gear', quirk: 'gut', hp: 1.1, speed: 0.85, damage: 0.7, preferredRange: 320 },
  { elementId: 'silence', name: 'Silence', emoji: '🫥', color: 0x3d2a4d, category: 'abstract', behavior: 'melee', marker: 'crescent', quirk: 'lean', hp: 0.95, speed: 1.15, damage: 1.1 },
  { elementId: 'echo', name: 'Echo', emoji: '🦇', color: 0xccccff, category: 'abstract', behavior: 'melee', marker: 'echo', quirk: 'sac', hp: 0.9, speed: 1.05, damage: 0.9 },
  { elementId: 'subterfuge', name: 'Subterfuge', emoji: '🕴️', color: 0xcc2233, category: 'abstract', behavior: 'melee', marker: 'dagger', quirk: 'lean', hp: 1, speed: 1.1, damage: 1.3 },

  // ── Corrupt — MASOCHISTIC only ───────────────────────────────────
  { elementId: 'chalk', name: 'Chalk', emoji: '🖍️', color: 0xf4f1e6, category: 'corrupt', behavior: 'medic', marker: 'scribble', quirk: 'halo', hp: 1, speed: 1, damage: 0.6, preferredRange: 300 },
  { elementId: 'magma', name: 'Magma', emoji: '🌋', color: 0xff5a1e, category: 'corrupt', behavior: 'melee', marker: 'flame', quirk: 'horns', hp: 1.3, speed: 0.8, damage: 1.2 },
  { elementId: 'illusion', name: 'Illusion', emoji: '🎭', color: 0xb45cff, category: 'corrupt', behavior: 'melee', marker: 'mask', quirk: 'lean', hp: 0.9, speed: 1.05, damage: 1 },
  { elementId: 'depths', name: 'Depths', emoji: '🐟', color: 0x0e8f9c, category: 'corrupt', behavior: 'ranged', marker: 'wave', quirk: 'sac', hp: 1.1, speed: 0.95, damage: 0.75, preferredRange: 280 },
  { elementId: 'ruin', name: 'Ruin', emoji: '🧱', color: 0xc4392c, category: 'corrupt', behavior: 'melee', marker: 'brick', quirk: 'horns', hp: 1.4, speed: 0.8, damage: 1.1 },
  { elementId: 'dune', name: 'Sand', emoji: '🏜️', color: 0xe8c87a, category: 'corrupt', behavior: 'melee', marker: 'pit', quirk: 'lean', hp: 1, speed: 1, damage: 1 },
  { elementId: 'conquest', name: 'Conquest', emoji: '🏰', color: 0xc23a2e, category: 'corrupt', behavior: 'melee', marker: 'banner', quirk: 'horns', hp: 1.3, speed: 0.9, damage: 1.1 },
  { elementId: 'passion', name: 'Passion', emoji: '💘', color: 0xff5fa2, category: 'corrupt', behavior: 'melee', marker: 'heart', quirk: 'halo', hp: 1, speed: 1.05, damage: 0.9 },
  { elementId: 'paper', name: 'Paper', emoji: '📄', color: 0xf2ead6, category: 'corrupt', behavior: 'ranged', marker: 'page', quirk: 'lean', hp: 0.5, speed: 1.45, damage: 0.8, size: 0.9, preferredRange: 310 },
  { elementId: 'death', name: 'Death', emoji: '⚰️', color: 0x4a4468, category: 'corrupt', behavior: 'melee', marker: 'skull', quirk: 'horns', hp: 1.2, speed: 1, damage: 1.5 },
  { elementId: 'fortune', name: 'Fortune', emoji: '🪙', color: 0xd8a531, category: 'corrupt', behavior: 'melee', marker: 'coin', quirk: 'lean', hp: 0.9, speed: 1.3, damage: 0.9 },
  { elementId: 'cloth', name: 'Cloth', emoji: '🧣', color: 0xd1435c, category: 'corrupt', behavior: 'melee', marker: 'banner', quirk: 'lean', hp: 0.9, speed: 1.15, damage: 1.05 },
  { elementId: 'psychic', name: 'Psychic', emoji: '👁️', color: 0x9b4dff, category: 'corrupt', behavior: 'ranged', marker: 'eye', quirk: 'halo', hp: 1, speed: 0.95, damage: 0.85, preferredRange: 330 },
  { elementId: 'radiation', name: 'Radiation', emoji: '☢️', color: 0x7cff3d, category: 'corrupt', behavior: 'melee', marker: 'rad', quirk: 'gut', hp: 1.15, speed: 0.9, damage: 1 },
  { elementId: 'bind', name: 'Bind', emoji: '⛓️', color: 0xe0b743, category: 'corrupt', behavior: 'melee', marker: 'chain', quirk: 'horns', hp: 1.2, speed: 0.9, damage: 1 },
  { elementId: 'gum', name: 'Slime', emoji: '🫠', color: 0x46b93f, category: 'corrupt', behavior: 'melee', marker: 'slick', quirk: 'bulk', hp: 1.6, speed: 0.8, damage: 1, size: 1.12 },
  { elementId: 'gluttony', name: 'Gluttony', emoji: '🍖', color: 0xd8452f, category: 'corrupt', behavior: 'melee', marker: 'meat', quirk: 'bulk', hp: 1.4, speed: 0.85, damage: 1.2, size: 1.1 },
];

/** Wave a tier first appears on. */
export const TIER_MIN_WAVE: Record<1 | 2 | 3, number> = { 1: 1, 2: 6, 3: 11 };

const TIER_HP = [1, 1.7, 2.6];
const TIER_DMG = [1, 1.3, 1.65];
const TIER_SPEED = [1, 1.05, 1.1];
const TIER_SIZE = [1, 1.12, 1.26];

const CATEGORY_HP: Record<HuskCategory, number> = { normal: 1, abstract: 1.35, corrupt: 1.75 };
const CATEGORY_DMG: Record<HuskCategory, number> = { normal: 1, abstract: 1.2, corrupt: 1.45 };

const TIER_SUFFIX = ['', ' II', ' III'];

function makeTierDef(f: HuskFamily, tier: 1 | 2 | 3): HuskVariantDef {
  const t = tier - 1;
  return {
    id: `elem-${f.elementId}-t${tier}`,
    name: `${f.name} Husk${TIER_SUFFIX[t]}`,
    color: f.color,
    hpMult: f.hp * TIER_HP[t] * CATEGORY_HP[f.category],
    speedMult: f.speed * TIER_SPEED[t],
    damageMult: f.damage * TIER_DMG[t] * CATEGORY_DMG[f.category],
    sizeMult: (f.size ?? 1) * TIER_SIZE[t],
    behavior: f.behavior,
    minWave: TIER_MIN_WAVE[tier],
    weight: 10,
    weightRamp: 0,
    weightCap: 10,
    preferredRange: f.preferredRange,
    explodes: f.explodes,
    elementId: f.elementId,
    tier,
    category: f.category,
    marker: f.marker,
    quirk: f.quirk,
    emoji: f.emoji,
  };
}

export const ELEMENTAL_HUSK_VARIANTS: HuskVariantDef[] =
  HUSK_FAMILIES.flatMap((f) => ([1, 2, 3] as const).map((tier) => makeTierDef(f, tier)));

/** Illusion's lookalike: one hit point, no bite worth fearing, no reward. */
export const DECOY_HUSK: HuskVariantDef = {
  id: 'decoy', name: 'Husk?', color: 0x4e7a2e, behavior: 'melee',
  hpMult: 0.01, speedMult: 1, damageMult: 0, sizeMult: 1,
  minWave: 999, weight: 0, weightRamp: 0, weightCap: 0,
  elementId: 'illusion', marker: 'mask', noReward: true,
};

/**
 * Corrupt-kin — what the corruption grows inside a room it has taken.
 *
 * Not a wave husk and not rollable: the corruption seeds them itself, and they
 * sit motionless in the dark until something walks in. Then they charge. Kill
 * every one standing in a room and the corruption there dies with them, which
 * is the only way to clear it.
 */
export const CORRUPT_KIN: HuskVariantDef = {
  id: 'corrupt-kin', name: 'Corrupt-Kin', color: 0x1a0a14, behavior: 'charger',
  hpMult: 2.2, speedMult: 1.15, damageMult: 1.6, sizeMult: 1.08,
  minWave: 999, weight: 0, weightRamp: 0, weightCap: 0,
  marker: 'eye', quirk: 'lean', emoji: '👁️',
};

// ── The tenth wave ───────────────────────────────────────────────────

/** One boss identity — expanded into three tier defs by the generator below. */
interface BossFamily {
  kind: BossKind;
  name: string;
  emoji: string;
  color: number;
  /** The element it wears. Nothing else in the game brands a husk with these three. */
  elementId: string;
  hp: number;
  speed: number;
  damage: number;
  size: number;
  preferredRange?: number;
}

export const BOSS_FAMILIES: BossFamily[] = [
  {
    kind: 'arbiter', name: 'THE ARBITER', emoji: '⚖️', color: 0xe8c24a, elementId: 'justice',
    hp: 9, speed: 0.8, damage: 2, size: 1.45,
  },
  {
    kind: 'dreamer', name: 'THE DREAMER', emoji: '🌙', color: 0x8f7cff, elementId: 'dream',
    hp: 6.5, speed: 0.95, damage: 1.35, size: 1.35, preferredRange: 300,
  },
  {
    kind: 'paradox', name: 'THE PARADOX', emoji: '⚛️', color: 0x3ad6c8, elementId: 'quantum',
    hp: 5.5, speed: 1.2, damage: 1.6, size: 1.25,
  },
];

/**
 * Which boss tier the wave sends. Bosses only come on tenth waves, so the
 * ladder is one tier per ten: the Arbiter you meet on wave 10 and the one you
 * meet on wave 30 are the same thing three times over.
 */
export const BOSS_TIER_MIN_WAVE: Record<1 | 2 | 3, number> = { 1: 10, 2: 20, 3: 30 };

const BOSS_TIER_HP = [1, 1.55, 2.3];
const BOSS_TIER_DMG = [1, 1.25, 1.55];
const BOSS_TIER_SPEED = [1, 1.06, 1.12];
const BOSS_TIER_SIZE = [1, 1.1, 1.2];

function makeBossDef(f: BossFamily, tier: 1 | 2 | 3): HuskVariantDef {
  const t = tier - 1;
  return {
    id: `boss-${f.kind}-t${tier}`,
    name: `${f.name}${TIER_SUFFIX[t]}`,
    color: f.color,
    hpMult: f.hp * BOSS_TIER_HP[t],
    speedMult: f.speed * BOSS_TIER_SPEED[t],
    damageMult: f.damage * BOSS_TIER_DMG[t],
    sizeMult: f.size * BOSS_TIER_SIZE[t],
    behavior: 'boss',
    minWave: BOSS_TIER_MIN_WAVE[tier],
    weight: 0,
    weightRamp: 0,
    weightCap: 0,
    isBoss: true,
    bossKind: f.kind,
    elementId: f.elementId,
    tier,
    emoji: f.emoji,
    preferredRange: f.preferredRange,
  };
}

export const BOSS_HUSK_VARIANTS: HuskVariantDef[] =
  BOSS_FAMILIES.flatMap((f) => ([1, 2, 3] as const).map((tier) => makeBossDef(f, tier)));

/**
 * What the bosses put on the field. None of these are rollable and none of them
 * are bosses themselves — they exist so a boss has something to call for.
 */
export const BOSS_MINIONS: HuskVariantDef[] = [
  {
    // The Arbiter's court. Real husks, and they pay like real husks.
    id: 'boss-bailiff', name: 'BAILIFF', color: 0xb99433, behavior: 'melee',
    hpMult: 1.6, speedMult: 1.05, damageMult: 1.2, sizeMult: 1.05,
    minWave: 999, weight: 0, weightRamp: 0, weightCap: 0,
    elementId: 'justice', marker: 'hammer', quirk: 'bulk', emoji: '⚖️',
  },
  {
    // Something the Dreamer is dreaming. It is not really here, so it pays nothing.
    id: 'boss-wisp', name: 'NIGHT WISP', color: 0xb9a8ff, behavior: 'melee',
    hpMult: 0.35, speedMult: 1.9, damageMult: 0.7, sizeMult: 0.8,
    minWave: 999, weight: 0, weightRamp: 0, weightCap: 0,
    elementId: 'dream', marker: 'crescent', quirk: 'lean', emoji: '🌙', noReward: true,
  },
  {
    // An outcome the Paradox did not take. Also not really here.
    id: 'boss-echo', name: 'ECHO', color: 0x7fe8de, behavior: 'ranged',
    hpMult: 0.5, speedMult: 1.15, damageMult: 0.8, sizeMult: 0.9,
    minWave: 999, weight: 0, weightRamp: 0, weightCap: 0, preferredRange: 260,
    elementId: 'quantum', marker: 'orb', quirk: 'lean', emoji: '⚛️', noReward: true,
  },
];

/**
 * Ordered basic-first, then every elemental def, then the decoy, the Graveyard's
 * titan, the nine boss defs, their minions and finally the corrupt-kin. Indices
 * into this array ride the co-op wire (`NetHuskState.v`), so the order must stay
 * identical on both peers of a protocol version — reorder it and the protocol
 * version has to move with it.
 */
export const HUSK_VARIANTS: HuskVariantDef[] = [
  {
    id: 'basic', name: 'Husk', color: 0x4e7a2e, behavior: 'melee',
    hpMult: 1, speedMult: 1, damageMult: 1, sizeMult: 1,
    minWave: 1, weight: 100, weightRamp: 0, weightCap: 100,
  },
  ...ELEMENTAL_HUSK_VARIANTS,
  DECOY_HUSK,

  // The Graveyard's titan. Never a wave boss — SecretMapKit raises it by id.
  {
    id: 'titan', name: 'TITAN', color: 0x141414, behavior: 'titan',
    hpMult: 10, speedMult: 0.1, damageMult: 2.5, sizeMult: 1.5,
    minWave: 999, weight: 0, weightRamp: 0, weightCap: 0,
  },

  // ── Bosses and their courts (never rolled by the lightning) ──────
  ...BOSS_HUSK_VARIANTS,
  ...BOSS_MINIONS,

  // ── Apocalypse (never rolled by the lightning; the corruption spawns them) ──
  CORRUPT_KIN,
];

export const BASIC_HUSK = HUSK_VARIANTS[0];

/**
 * Texture key for a variant's body. BootScene bakes one sprite per variant
 * rather than tinting a shared texture — Phaser tints multiply, and the husk
 * sprite is already a saturated rotten-green, so tinting would turn a blue
 * body muddy and make the black Titan and white Ranger unreadable.
 */
export function huskTextureKey(v: HuskVariantDef): string {
  return `husk-${v.id}`;
}

const BY_ID = new Map(HUSK_VARIANTS.map((v) => [v.id, v]));

export function getHuskVariant(id: string | undefined): HuskVariantDef {
  return (id && BY_ID.get(id)) || BASIC_HUSK;
}

/** Wire-friendly index, so husk snapshots carry one byte instead of a string. */
export function huskVariantIndex(v: HuskVariantDef): number {
  return HUSK_VARIANTS.indexOf(v);
}

export function huskVariantFromIndex(i: number): HuskVariantDef {
  return HUSK_VARIANTS[i] ?? BASIC_HUSK;
}

export const BOSS_VARIANTS = BOSS_HUSK_VARIANTS;

/** How much likelier the lightning is to strike on each invasion difficulty. */
export const VARIANT_CHANCE_MULT: Record<string, number> = {
  normal: 1,
  brutal: 1.35,
  masochistic: 1.8,
};

/** Which categories each difficulty lets the lightning brand. */
export const CATEGORIES_BY_DIFFICULTY: Record<string, HuskCategory[]> = {
  normal: ['normal'],
  brutal: ['normal', 'abstract'],
  masochistic: ['normal', 'abstract', 'corrupt'],
};

/** Rarer categories stay rarer even once unlocked. */
const CATEGORY_WEIGHT: Record<HuskCategory, number> = { normal: 1, abstract: 0.7, corrupt: 0.55 };

/** Relative weight of each unlocked tier on `wave` — newer tiers ramp in. */
function tierWeight(tier: 1 | 2 | 3, wave: number): number {
  if (wave < TIER_MIN_WAVE[tier]) return 0;
  if (tier === 1) return Math.max(3, 10 - (wave - 4) * 0.6);
  if (tier === 2) return Math.min(10, 2 + (wave - TIER_MIN_WAVE[2]) * 1.2);
  return Math.min(10, 1.5 + (wave - TIER_MIN_WAVE[3]) * 1.0);
}

/**
 * Roll the elemental lightning for one fresh spawn on `wave`.
 * Returns null when the bolt misses — the husk stays basic.
 * `rand` is injected so the caller controls the RNG source.
 *
 * A campaign invasion passes `theme`: the bolt then strikes far more often
 * and only brands elements kin to that world (the kin list overrides the
 * difficulty's category gate — a fire world sends magma husks even on
 * NORMAL), with the world's own element weighted heaviest.
 */
export function rollLightningVariant(
  wave: number,
  difficultyId: string,
  rand: () => number,
  theme: InvasionTheme | null = null,
): HuskVariantDef | null {
  const chance = Math.min(
    theme ? 0.92 : 0.88,
    (0.18 + wave * 0.05) * (VARIANT_CHANCE_MULT[difficultyId] ?? 1) * (theme ? 1.6 : 1),
  );
  if (rand() >= chance) return null;

  const allowed = new Set(CATEGORIES_BY_DIFFICULTY[difficultyId] ?? ['normal']);
  let total = 0;
  const weights: number[] = [];
  for (const v of ELEMENTAL_HUSK_VARIANTS) {
    const ok = theme
      ? theme.kin.has(v.elementId!) && wave >= v.minWave
      : allowed.has(v.category!) && wave >= v.minWave;
    const w = ok
      ? tierWeight(v.tier!, wave) * (theme
        ? (v.elementId === theme.elementId ? 3 : 1)
        : CATEGORY_WEIGHT[v.category!])
      : 0;
    weights.push(w);
    total += w;
  }
  if (total <= 0) return null;

  let roll = rand() * total;
  for (let i = 0; i < ELEMENTAL_HUSK_VARIANTS.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return ELEMENTAL_HUSK_VARIANTS[i];
  }
  return null;
}

// ── Campaign world theming ─────────────────────────────────────────

/**
 * Closely-related elements per campaign world, keyed by world/element id.
 * A campaign invasion draws its lightning strikes from this pool only, so a
 * fire-world mansion is overrun by fire, magma, oil and gunpowder husks
 * rather than the full 47-element grab bag. Every list includes the world's
 * own element; the roll gives that element extra weight on top.
 */
export const ELEMENT_KIN: Record<string, string[]> = {
  // Base + combined worlds
  fire: ['fire', 'magma', 'oil', 'gunpowder', 'plasma'],
  water: ['water', 'ice', 'depths', 'slime'],
  life: ['life', 'growth', 'passion', 'slime'],
  air: ['air', 'sound', 'echo', 'paper'],
  earth: ['earth', 'crystal', 'metal', 'dune', 'ruin', 'magma'],
  oil: ['oil', 'fire', 'gunpowder', 'slime', 'gum'],
  shadow: ['shadow', 'silence', 'subterfuge', 'death', 'illusion'],
  ice: ['ice', 'water', 'crystal', 'depths'],
  growth: ['growth', 'life', 'slime', 'gum', 'gluttony'],
  crystal: ['crystal', 'earth', 'ice', 'light'],
  soul: ['soul', 'shadow', 'death', 'psychic'],
  hunt: ['hunt', 'gluttony', 'shadow', 'death'],
  sand: ['sand', 'gravity', 'fate', 'psychic'],           // the Time world
  gravity: ['gravity', 'magnet', 'sand', 'plasma'],
  creation: ['creation', 'metal', 'technology', 'magic', 'chalk'],
  // Abstract worlds
  electricity: ['electricity', 'magnet', 'technology', 'plasma', 'metal'],
  slime: ['slime', 'gum', 'growth', 'radiation', 'oil'],  // the Acid world
  fate: ['fate', 'fortune', 'magic', 'psychic', 'sand'],
  sound: ['sound', 'echo', 'air'],
  light: ['light', 'crystal', 'plasma', 'magic'],
  magnet: ['magnet', 'metal', 'electricity', 'gravity', 'technology'],
  metal: ['metal', 'magnet', 'technology', 'earth', 'creation'],
  plasma: ['plasma', 'electricity', 'fire', 'light', 'radiation'],
  gunpowder: ['gunpowder', 'fire', 'oil', 'death'],
  rubber: ['rubber', 'gum', 'slime', 'echo'],
  magic: ['magic', 'fate', 'illusion', 'creation', 'psychic'],
  technology: ['technology', 'metal', 'electricity', 'magnet', 'creation'],
  silence: ['silence', 'shadow', 'subterfuge', 'soul'],
  echo: ['echo', 'sound', 'air', 'illusion', 'rubber'],
  subterfuge: ['subterfuge', 'shadow', 'silence', 'illusion', 'fortune'],
  // Corrupt worlds
  chalk: ['chalk', 'paper', 'creation', 'magic', 'illusion'],
  magma: ['magma', 'fire', 'earth', 'ruin', 'oil'],
  illusion: ['illusion', 'magic', 'shadow', 'echo', 'subterfuge'],
  depths: ['depths', 'water', 'ice', 'slime'],
  ruin: ['ruin', 'earth', 'dune', 'death', 'conquest'],
  dune: ['dune', 'earth', 'sand', 'ruin'],                // the Sand world
  conquest: ['conquest', 'ruin', 'metal', 'bind'],
  passion: ['passion', 'life', 'fire', 'soul'],
  paper: ['paper', 'chalk', 'air', 'illusion', 'cloth'],
  death: ['death', 'soul', 'shadow', 'cloth', 'gunpowder'],
  fortune: ['fortune', 'fate', 'subterfuge', 'conquest'],
  cloth: ['cloth', 'paper', 'bind', 'creation', 'subterfuge'],
  psychic: ['psychic', 'soul', 'illusion', 'magic', 'fate'],
  radiation: ['radiation', 'plasma', 'slime', 'technology'],
  bind: ['bind', 'metal', 'conquest', 'gravity', 'cloth'],
  gum: ['gum', 'slime', 'rubber', 'growth', 'gluttony'],
  gluttony: ['gluttony', 'hunt', 'gum', 'depths', 'growth'],
};

export interface InvasionTheme {
  elementId: string;
  name: string;
  emoji: string;
  color: number;
  kin: Set<string>;
}

/** Theme for a campaign world's invasion, or null when the world has no husk family. */
export function getInvasionTheme(worldId: string | null | undefined): InvasionTheme | null {
  if (!worldId) return null;
  const family = HUSK_FAMILIES.find((f) => f.elementId === worldId);
  if (!family) return null;
  return {
    elementId: worldId,
    name: family.name,
    emoji: family.emoji,
    color: family.color,
    kin: new Set(ELEMENT_KIN[worldId] ?? [worldId]),
  };
}

/** True on waves that should also spawn a boss. */
export function isBossWave(wave: number): boolean {
  return wave > 0 && wave % 10 === 0;
}

/** Which of the three tiers `wave` is far enough along to send. */
export function bossTierForWave(wave: number): 1 | 2 | 3 {
  if (wave >= BOSS_TIER_MIN_WAVE[3]) return 3;
  if (wave >= BOSS_TIER_MIN_WAVE[2]) return 2;
  return 1;
}

/** One of the three, at the tier this wave has earned. */
export function rollBossVariant(rand: () => number, wave: number): HuskVariantDef {
  const tier = bossTierForWave(wave);
  const pool = BOSS_VARIANTS.filter((v) => v.tier === tier);
  return pool[Math.floor(rand() * pool.length)] ?? pool[0];
}
