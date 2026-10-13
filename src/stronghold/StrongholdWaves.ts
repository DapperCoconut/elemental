import { HP_SCALE } from '../data/Balance';
import {
  BASIC_HUSK, HuskVariantDef, isBossWave, rollBossVariant, rollLightningVariant,
} from '../invasion/HuskVariants';

/**
 * Wave composition for Stronghold. Husks are the invasion's — same variant table, same
 * tiers, same bosses on every tenth wave — but the mode scales them for a road rather than a
 * mansion: health climbs steadily with the wave count, speed only a little.
 */

export type StrongholdDifficultyId = 'normal' | 'brutal' | 'masochistic';

export interface StrongholdDifficultyDef {
  id: StrongholdDifficultyId;
  label: string;
  color: number;
  description: string;
  hpMult: number;
  /** Breaches the keep can take before it falls. */
  lives: number;
  goldMult: number;
  shardMult: number;
  /** Gold in hand at the start. */
  startGold: number;
}

export const STRONGHOLD_DIFFICULTIES: StrongholdDifficultyDef[] = [
  {
    id: 'normal', label: 'NORMAL', color: 0x88cc44,
    description: 'Twenty lives. Husks branded with the fifteen ordinary elements.',
    hpMult: 1, lives: 20, goldMult: 1, shardMult: 1, startGold: 260,
  },
  {
    id: 'brutal', label: 'BRUTAL', color: 0xff8844,
    description: 'Twelve lives, 1.6× husk health, and the ABSTRACT elements walk. 2× shards.',
    hpMult: 1.6, lives: 12, goldMult: 1.1, shardMult: 2, startGold: 300,
  },
  {
    id: 'masochistic', label: 'MASOCHISTIC', color: 0xff2244,
    description: 'Six lives, 2.4× husk health, constant lightning, and the CORRUPT elements. 3× shards.',
    hpMult: 2.4, lives: 6, goldMult: 1.25, shardMult: 3, startGold: 340,
  },
];

export function getStrongholdDifficulty(id: string | undefined): StrongholdDifficultyDef {
  return STRONGHOLD_DIFFICULTIES.find((d) => d.id === id) ?? STRONGHOLD_DIFFICULTIES[0];
}

const BASE_HP = 24;
const BASE_SPEED = 84;
const MAX_SPEED = 190;

export interface WaveSpawn {
  variant: HuskVariantDef;
  /** Ms after the wave starts. */
  at: number;
  hp: number;
  speed: number;
  /** Gold paid on the kill. */
  bounty: number;
  /** Lives taken if it reaches the keep. */
  breach: number;
}

export interface WavePlan {
  wave: number;
  spawns: WaveSpawn[];
  /** Gold paid when the last husk of the wave is gone. */
  clearBonus: number;
  isBoss: boolean;
}

/** Health multiplier for the wave number alone. */
export function waveHpScale(wave: number): number {
  const w = wave - 1;
  return 1 + 0.16 * w + 0.014 * w * w;
}

function bountyFor(v: HuskVariantDef, diff: StrongholdDifficultyDef): number {
  if (v.isBoss) return Math.round(80 * diff.goldMult);
  const tier = v.tier ?? 0;
  const cat = v.category === 'corrupt' ? 3 : v.category === 'abstract' ? 2 : 0;
  return Math.round((4 + tier * 2 + cat) * diff.goldMult);
}

function breachFor(v: HuskVariantDef): number {
  if (v.isBoss) return 5;
  return v.tier === 3 ? 3 : v.tier === 2 ? 2 : 1;
}

/** Lay out one wave. `rand` is injected so a future host can seed it for guests. */
export function planWave(wave: number, diff: StrongholdDifficultyDef, rand: () => number): WavePlan {
  const boss = isBossWave(wave);
  const count = Math.min(44, 7 + wave * 2 + (boss ? -4 : 0));
  const gap = Math.max(380, 900 - wave * 22);
  const spawns: WaveSpawn[] = [];
  const hpScale = waveHpScale(wave) * diff.hpMult * HP_SCALE;

  const make = (variant: HuskVariantDef, at: number): WaveSpawn => ({
    variant,
    at,
    hp: Math.max(6, Math.round(BASE_HP * variant.hpMult * hpScale)),
    speed: Math.min(MAX_SPEED, BASE_SPEED * variant.speedMult * (1 + wave * 0.012)),
    bounty: bountyFor(variant, diff),
    breach: breachFor(variant),
  });

  for (let i = 0; i < count; i++) {
    const v = rollLightningVariant(wave, diff.id, rand) ?? BASIC_HUSK;
    // A little jitter so the column does not march in lockstep.
    spawns.push(make(v, i * gap + rand() * 120));
  }
  if (boss) {
    const bv = rollBossVariant(rand, wave);
    spawns.push(make(bv, count * gap * 0.5));
  }
  spawns.sort((a, b) => a.at - b.at);

  return {
    wave,
    spawns,
    clearBonus: Math.round((28 + wave * 6) * diff.goldMult),
    isBoss: boss,
  };
}

/** Shards banked when the run ends. */
export function shardsForRun(wavesCleared: number, diff: StrongholdDifficultyDef): number {
  if (wavesCleared <= 0) return 0;
  return Math.round((wavesCleared * 4 + Math.floor(wavesCleared / 10) * 30) * diff.shardMult);
}
