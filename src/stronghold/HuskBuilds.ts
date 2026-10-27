import type { HuskVariantDef } from '../invasion/HuskVariants';

/**
 * Husk BUILDS — how a family walks the road in Stronghold, on top of its invasion stats and its
 * road trait. A build is the silhouette you learn to read at a glance: tanks lumber in twos and
 * threes and soak everything, runners come in quick strings, swarms pour in by the dozen at a
 * fraction of the health.
 *
 * Waves send husks in CLUMPS of one family (`clump` is the group size range), so a wave reads as
 * "a pack of runners, then two tanks, then a swarm" rather than a shuffled deck.
 */

export type HuskBuildId = 'standard' | 'runner' | 'swarm' | 'skirmisher' | 'brute' | 'tank' | 'juggernaut';

export interface HuskBuild {
  id: HuskBuildId;
  label: string;
  /** One line for the journal and the NEW HUSK card. */
  desc: string;
  hp: number;
  speed: number;
  size: number;
  bounty: number;
  /** How many husks of the wave's budget one of these counts as. */
  weight: number;
  clump: [number, number];
  color: number;
}

export const HUSK_BUILDS: Record<HuskBuildId, HuskBuild> = {
  standard:   { id: 'standard', label: 'STANDARD', desc: 'Ordinary health and pace.', hp: 1, speed: 1, size: 1, bounty: 1, weight: 1, clump: [4, 7], color: 0xb8b8c8 },
  runner:     { id: 'runner', label: 'RUNNER', desc: 'Fast and frail — 1.55× speed, 60% health. Comes in strings.', hp: 0.6, speed: 1.55, size: 0.9, bounty: 0.9, weight: 0.8, clump: [4, 7], color: 0x7ad0ff },
  swarm:      { id: 'swarm', label: 'SWARM', desc: 'A dozen at a time at a third of the health. Splash eats them.', hp: 0.35, speed: 1.2, size: 0.78, bounty: 0.5, weight: 0.4, clump: [8, 14], color: 0xb8ff7a },
  skirmisher: { id: 'skirmisher', label: 'SKIRMISHER', desc: 'Light and quick — 1.25× speed, 85% health.', hp: 0.85, speed: 1.25, size: 0.95, bounty: 1, weight: 0.9, clump: [3, 6], color: 0xffe066 },
  brute:      { id: 'brute', label: 'BRUTE', desc: 'Heavy — 1.6× health, a little slow.', hp: 1.6, speed: 0.85, size: 1.12, bounty: 1.5, weight: 1.4, clump: [3, 5], color: 0xff9a3c },
  tank:       { id: 'tank', label: 'TANK', desc: 'Lumbering wall — 2.5× health at 60% speed. Bring single-target damage.', hp: 2.5, speed: 0.6, size: 1.25, bounty: 2.2, weight: 2, clump: [2, 4], color: 0xff6b6b },
  juggernaut: { id: 'juggernaut', label: 'JUGGERNAUT', desc: 'Four times the health, crawling. One or two at a time.', hp: 4, speed: 0.45, size: 1.4, bounty: 3.6, weight: 3, clump: [1, 2], color: 0xd04060 },
};

const FAMILY_BUILD: Record<string, HuskBuildId> = {
  // Tanks and juggernauts — slow walls of health.
  earth: 'tank', metal: 'tank', crystal: 'tank', ruin: 'tank', marrow: 'tank', astra: 'tank',
  gluttony: 'juggernaut', pressure: 'juggernaut',
  // Brutes.
  gravity: 'brute', conquest: 'brute', creation: 'brute', magma: 'brute', plasma: 'brute',
  gunpowder: 'brute', bind: 'brute', death: 'brute', soul: 'brute',
  // Runners.
  hunt: 'runner', light: 'runner', sand: 'runner', shadow: 'runner', dune: 'runner',
  subterfuge: 'runner', electricity: 'runner', rubber: 'runner', ink: 'runner',
  // Swarms.
  growth: 'swarm', paper: 'swarm', echo: 'swarm', cloth: 'swarm',
  // Skirmishers.
  air: 'skirmisher', fate: 'skirmisher', magic: 'skirmisher', depths: 'skirmisher', silence: 'skirmisher',
  sound: 'skirmisher', magnet: 'skirmisher', oil: 'skirmisher', myth: 'skirmisher', memory: 'skirmisher', string: 'skirmisher',
};

/** The build a variant walks with. Bosses and decoys are always standard (they have their own numbers). */
export function buildFor(v: HuskVariantDef): HuskBuild {
  if (v.isBoss || v.id === 'decoy' || !v.elementId) return HUSK_BUILDS.standard;
  return HUSK_BUILDS[FAMILY_BUILD[v.elementId] ?? 'standard'];
}

export function familyBuild(familyId: string): HuskBuild {
  return HUSK_BUILDS[FAMILY_BUILD[familyId] ?? 'standard'];
}

/** A copy of the variant with its build folded into health, pace and size. */
export function applyBuild(v: HuskVariantDef): HuskVariantDef {
  const b = buildFor(v);
  if (b.id === 'standard') return v;
  return { ...v, hpMult: v.hpMult * b.hp, speedMult: v.speedMult * b.speed, sizeMult: v.sizeMult * b.size };
}
