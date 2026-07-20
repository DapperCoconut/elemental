/**
 * Husk variant table for Invasion mode.
 *
 * Ordinary waves roll each spawn against a weighted table: the basic husk keeps
 * a flat weight while every variant's weight ramps with the wave number, so
 * early waves are almost pure basics and late waves are mostly specials.
 * Harder difficulties multiply every non-basic weight (`variantChanceMult`).
 *
 * Every tenth wave additionally spawns one random boss on top of the normal
 * wave. Bosses are never rolled by the ordinary table.
 */

export type HuskBehavior =
  | 'melee'    // chase and bite (basic, speedster, tank, blaster)
  | 'ranged'   // keep distance, lob single shots (spitter)
  | 'medic'    // keep distance, pulse-heal other husks
  | 'charger'  // telegraph a lane, then dash down it (rusher)
  | 'titan'    // slow melee boss that summons adds
  | 'ranger'   // ranged boss alternating shotgun / burst
  | 'demon';   // boss that possesses another husk

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
  /** Spawn weight the wave it unlocks. */
  weight: number;
  /** Added to `weight` per wave beyond `minWave`. */
  weightRamp: number;
  /** Ceiling for the ramped weight. */
  weightCap: number;
  isBoss?: boolean;
  /** Distance a ranged/kiting variant tries to hold from its target. */
  preferredRange?: number;
  /** Detonates on death, damaging players *and* other husks. */
  explodes?: boolean;
}

/** Ordered most-common/earliest first — this is also the order shown to players. */
export const HUSK_VARIANTS: HuskVariantDef[] = [
  {
    id: 'basic', name: 'Husk', color: 0x4e7a2e, behavior: 'melee',
    hpMult: 1, speedMult: 1, damageMult: 1, sizeMult: 1,
    minWave: 1, weight: 100, weightRamp: 0, weightCap: 100,
  },
  {
    id: 'speedster', name: 'Speedster', color: 0x3388ff, behavior: 'melee',
    hpMult: 0.5, speedMult: 3, damageMult: 1, sizeMult: 0.85,
    minWave: 3, weight: 12, weightRamp: 2.5, weightCap: 45,
  },
  {
    id: 'tank', name: 'Tank', color: 0x9a9a9a, behavior: 'melee',
    hpMult: 2.5, speedMult: 0.5, damageMult: 1.3, sizeMult: 1.25,
    minWave: 3, weight: 10, weightRamp: 2, weightCap: 40,
  },
  {
    id: 'blaster', name: 'Blaster', color: 0xdd2222, behavior: 'melee',
    hpMult: 1, speedMult: 0.75, damageMult: 1, sizeMult: 1.05,
    minWave: 5, weight: 8, weightRamp: 2, weightCap: 38, explodes: true,
  },
  {
    id: 'spitter', name: 'Spitter', color: 0x9944cc, behavior: 'ranged',
    hpMult: 0.9, speedMult: 1, damageMult: 0.6, sizeMult: 0.95,
    minWave: 5, weight: 8, weightRamp: 2, weightCap: 38, preferredRange: 270,
  },
  {
    id: 'medic', name: 'Medic', color: 0x88dd88, behavior: 'medic',
    hpMult: 1, speedMult: 1.05, damageMult: 0.5, sizeMult: 1,
    minWave: 8, weight: 5, weightRamp: 1.2, weightCap: 22, preferredRange: 300,
  },
  {
    id: 'rusher', name: 'Rusher', color: 0xff8822, behavior: 'charger',
    hpMult: 2, speedMult: 1, damageMult: 1.6, sizeMult: 1.1,
    minWave: 8, weight: 6, weightRamp: 1.5, weightCap: 30,
  },

  // ── Bosses (never rolled by the normal table) ────────────────────
  {
    id: 'titan', name: 'TITAN', color: 0x141414, behavior: 'titan',
    hpMult: 10, speedMult: 0.1, damageMult: 2.5, sizeMult: 1.5,
    minWave: 10, weight: 0, weightRamp: 0, weightCap: 0, isBoss: true,
  },
  {
    id: 'ranger', name: 'RANGER', color: 0xf2f2f2, behavior: 'ranger',
    hpMult: 4.5, speedMult: 1.1, damageMult: 0.9, sizeMult: 1.3,
    minWave: 10, weight: 0, weightRamp: 0, weightCap: 0, isBoss: true,
    preferredRange: 330,
  },
  {
    id: 'demon', name: 'DEMON', color: 0x660011, behavior: 'demon',
    hpMult: 4.5, speedMult: 1.15, damageMult: 1.5, sizeMult: 1.25,
    minWave: 10, weight: 0, weightRamp: 0, weightCap: 0, isBoss: true,
  },
];

export const BASIC_HUSK = HUSK_VARIANTS[0];

/**
 * Texture key for a variant's body. BootScene bakes one sprite per variant
 * rather than tinting a shared texture — Phaser tints multiply, and the husk
 * sprite is already a saturated rotten-green, so tinting would turn the blue
 * Speedster muddy and make the black Titan and white Ranger unreadable.
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

export const BOSS_VARIANTS = HUSK_VARIANTS.filter((v) => v.isBoss);

/** How much likelier variants (vs. plain husks) get on each invasion difficulty. */
export const VARIANT_CHANCE_MULT: Record<string, number> = {
  normal: 1,
  brutal: 1.35,
  masochistic: 1.8,
};

function weightAt(v: HuskVariantDef, wave: number): number {
  if (v.isBoss || wave < v.minWave) return 0;
  return Math.min(v.weightCap, v.weight + v.weightRamp * (wave - v.minWave));
}

/**
 * Roll one variant for an ordinary spawn on `wave`.
 * `rand` is injected so the caller controls the RNG source.
 */
export function rollHuskVariant(
  wave: number,
  difficultyId: string,
  rand: () => number,
): HuskVariantDef {
  const variantMult = VARIANT_CHANCE_MULT[difficultyId] ?? 1;
  let total = 0;
  const weights: number[] = [];
  for (const v of HUSK_VARIANTS) {
    const w = weightAt(v, wave) * (v.id === 'basic' ? 1 : variantMult);
    weights.push(w);
    total += w;
  }
  if (total <= 0) return BASIC_HUSK;

  let roll = rand() * total;
  for (let i = 0; i < HUSK_VARIANTS.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return HUSK_VARIANTS[i];
  }
  return BASIC_HUSK;
}

/** True on waves that should also spawn a boss. */
export function isBossWave(wave: number): boolean {
  return wave > 0 && wave % 10 === 0;
}

export function rollBossVariant(rand: () => number): HuskVariantDef {
  return BOSS_VARIANTS[Math.floor(rand() * BOSS_VARIANTS.length)] ?? BOSS_VARIANTS[0];
}
