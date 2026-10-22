import { HP_SCALE } from '../data/Balance';
import {
  BASIC_HUSK, ELEMENTAL_HUSK_VARIANTS, HuskVariantDef, TIER_MIN_WAVE, isBossWave, rollBossVariant, rollLightningVariant,
} from '../invasion/HuskVariants';
import type { StrongholdMapDef } from './StrongholdMap';

/**
 * Wave composition for Stronghold. Husks are the invasion's — same variant table, same tiers,
 * same bosses on every tenth wave — scaled for a road rather than a mansion: health climbs
 * steadily with the wave count, speed only a little. Every few waves a *themed* wave sends one
 * family in force (a camo wave, an armoured column, a flight of airborne husks) so the defence
 * has to answer it.
 */

export type StrongholdDifficultyId = 'normal' | 'brutal' | 'masochistic' | 'apocalypse';

export interface StrongholdDifficultyDef {
  id: StrongholdDifficultyId;
  label: string;
  color: number;
  description: string;
  hpMult: number;
  /** Walk-speed multiplier. */
  speedMult: number;
  lives: number;
  goldMult: number;
  shardMult: number;
  startGold: number;
  /** Which invasion difficulty's husk pool the lightning rolls from. */
  huskPool: 'normal' | 'brutal' | 'masochistic';
  /** Every Nth non-boss wave is themed. */
  themeEvery: number;
}

export const STRONGHOLD_DIFFICULTIES: StrongholdDifficultyDef[] = [
  {
    id: 'normal', label: 'NORMAL', color: 0x88cc44,
    description: 'Twenty lives. Husks branded with the fifteen ordinary elements.',
    hpMult: 1, speedMult: 1, lives: 20, goldMult: 1, shardMult: 1, startGold: 260, huskPool: 'normal', themeEvery: 5,
  },
  {
    id: 'brutal', label: 'BRUTAL', color: 0xff8844,
    description: 'Twelve lives, 1.6× husk health, and the ABSTRACT elements walk — hidden, plated, hacking. 2× shards.',
    hpMult: 1.6, speedMult: 1.04, lives: 12, goldMult: 1.1, shardMult: 2, startGold: 300, huskPool: 'brutal', themeEvery: 4,
  },
  {
    id: 'masochistic', label: 'MASOCHISTIC', color: 0xff2244,
    description: 'Six lives, 2.4× husk health, constant lightning, and the CORRUPT elements. 3× shards.',
    hpMult: 2.4, speedMult: 1.08, lives: 6, goldMult: 1.25, shardMult: 3, startGold: 340, huskPool: 'masochistic', themeEvery: 3,
  },
  {
    id: 'apocalypse', label: 'APOCALYPSE', color: 0xb026ff,
    description: 'Three lives, 3.4× husk health, faster husks, a themed horde every other wave. 4.5× shards.',
    hpMult: 3.4, speedMult: 1.15, lives: 3, goldMult: 1.3, shardMult: 4.5, startGold: 380, huskPool: 'masochistic', themeEvery: 2,
  },
];

export function getStrongholdDifficulty(id: string | undefined): StrongholdDifficultyDef {
  return STRONGHOLD_DIFFICULTIES.find((d) => d.id === id) ?? STRONGHOLD_DIFFICULTIES[0];
}

const BASE_HP = 24;
const BASE_SPEED = 84;
const MAX_SPEED = 200;

export interface WaveSpawn {
  variant: HuskVariantDef;
  at: number;
  hp: number;
  speed: number;
  bounty: number;
  breach: number;
  /** Which road it walks. */
  track: number;
}

export interface WavePlan {
  wave: number;
  spawns: WaveSpawn[];
  clearBonus: number;
  isBoss: boolean;
  /** Banner for a themed wave, if this is one. */
  theme: WaveTheme | null;
}

export interface WaveTheme {
  /** The family it sends in force. */
  family: string;
  title: string;
  hint: string;
}

/** Themed waves, each answering a question the defence has to have an answer to. */
const THEMES: Array<WaveTheme & { pool: 'normal' | 'brutal' | 'masochistic' }> = [
  { family: 'air', title: 'SKYBORNE', hint: 'They float over traps and walls — bring flyers.', pool: 'normal' },
  { family: 'earth', title: 'STONEWALL', hint: 'Stoneskin shrugs off blasts. Use sharp or magic.', pool: 'normal' },
  { family: 'growth', title: 'THE BLOOM', hint: 'Every one that dies splits in two.', pool: 'normal' },
  { family: 'soul', title: 'THE UNDYING', hint: 'They get back up once.', pool: 'normal' },
  { family: 'hunt', title: 'THE PACK', hint: 'They pounce forward in bursts.', pool: 'normal' },
  { family: 'life', title: 'FIELD HOSPITAL', hint: 'Medics mend the column. Kill them first.', pool: 'normal' },
  { family: 'shadow', title: 'SHADOWSTEP', hint: 'They blink ahead every few seconds.', pool: 'normal' },
  { family: 'creation', title: 'THE FORGE', hint: 'They shield each other.', pool: 'normal' },
  { family: 'silence', title: 'THE SILENT ONES', hint: 'Hidden. Only towers with detection can target them.', pool: 'brutal' },
  { family: 'metal', title: 'IRON TIDE', hint: 'Plated: sharp shots barely scratch them. Energy cuts through.', pool: 'brutal' },
  { family: 'technology', title: 'SYSTEM CRASH', hint: 'They hack your best towers.', pool: 'brutal' },
  { family: 'electricity', title: 'OVERLOAD', hint: 'They zap and stun your towers.', pool: 'brutal' },
  { family: 'gravity', title: 'EVENT HORIZON', hint: 'Their orbiting rocks swallow your shots.', pool: 'normal' },
  { family: 'echo', title: 'REVERB', hint: 'Each splits into two echoes.', pool: 'brutal' },
  { family: 'fate', title: 'LUCKY STREAK', hint: 'One hit in five misses.', pool: 'brutal' },
  { family: 'ruin', title: 'RUSTBORN', hint: 'Armour grows the longer they walk.', pool: 'masochistic' },
  { family: 'depths', title: 'THE DEEP', hint: 'They dive out of reach.', pool: 'masochistic' },
  { family: 'conquest', title: 'WAR BAND', hint: 'Banners harden the husks around them.', pool: 'masochistic' },
  { family: 'gluttony', title: 'THE FEAST', hint: 'They grow on the dead.', pool: 'masochistic' },
  { family: 'paper', title: 'PAPER STORM', hint: 'Airborne, and they unfold into scraps.', pool: 'masochistic' },
  { family: 'bind', title: 'SHACKLES', hint: 'They chain your towers in place.', pool: 'masochistic' },
];
const POOL_RANK: Record<string, number> = { normal: 0, brutal: 1, masochistic: 2 };

/** Health multiplier for the wave number alone. */
export function waveHpScale(wave: number): number {
  const w = wave - 1;
  return 1 + 0.16 * w + 0.014 * w * w;
}

function bountyFor(v: HuskVariantDef, goldMult: number): number {
  if (v.isBoss) return Math.round(80 * goldMult);
  const tier = v.tier ?? 0;
  const cat = v.category === 'corrupt' ? 3 : v.category === 'abstract' ? 2 : 0;
  return Math.round((4 + tier * 2 + cat) * goldMult);
}

function breachFor(v: HuskVariantDef): number {
  if (v.isBoss) return 5;
  return v.tier === 3 ? 3 : v.tier === 2 ? 2 : 1;
}

/** The highest tier of `family` this wave may send, as a variant. */
function familyVariant(family: string, wave: number, rand: () => number): HuskVariantDef | null {
  const options = ELEMENTAL_HUSK_VARIANTS.filter((v) => v.elementId === family && wave >= TIER_MIN_WAVE[v.tier ?? 1]);
  if (options.length === 0) return null;
  // Mostly the newest tier, sometimes one below.
  const idx = options.length - 1 - (rand() < 0.35 && options.length > 1 ? 1 : 0);
  return options[idx];
}

/** Lay out one wave. `rand` is injected so a future host can seed it for guests. */
export function planWave(wave: number, diff: StrongholdDifficultyDef, map: StrongholdMapDef, rand: () => number): WavePlan {
  const boss = isBossWave(wave);
  const tracks = map.tracks.length;
  // Two roads means each takes a share; the total grows a little to keep both busy.
  const count = Math.min(52, Math.round((7 + wave * 2 + (boss ? -4 : 0)) * (tracks > 1 ? 1.25 : 1)));
  const gap = Math.max(300, (900 - wave * 22) / (tracks > 1 ? 1.4 : 1));
  const spawns: WaveSpawn[] = [];
  const hpScale = waveHpScale(wave) * diff.hpMult * map.hpMult * HP_SCALE;
  const goldMult = diff.goldMult * map.goldMult;

  let theme: WaveTheme | null = null;
  if (!boss && wave >= 3 && wave % diff.themeEvery === 0) {
    const ok = THEMES.filter((t) => POOL_RANK[t.pool] <= POOL_RANK[diff.huskPool]);
    const pick = ok[Math.floor(rand() * ok.length)];
    if (pick) theme = { family: pick.family, title: pick.title, hint: pick.hint };
  }

  const make = (variant: HuskVariantDef, at: number, track: number): WaveSpawn => ({
    variant,
    at,
    hp: Math.max(6, Math.round(BASE_HP * variant.hpMult * hpScale)),
    speed: Math.min(MAX_SPEED, BASE_SPEED * variant.speedMult * diff.speedMult * (1 + wave * 0.012)),
    bounty: bountyFor(variant, goldMult),
    breach: breachFor(variant),
    track,
  });

  for (let i = 0; i < count; i++) {
    let v: HuskVariantDef | null = null;
    // A themed wave is two-thirds its family, the rest the usual mix.
    if (theme && rand() < 0.66) v = familyVariant(theme.family, wave, rand);
    if (!v) v = rollLightningVariant(wave, diff.huskPool, rand) ?? BASIC_HUSK;
    const track = tracks > 1 ? i % tracks : 0;
    spawns.push(make(v, i * gap + rand() * 120, track));
  }
  if (boss) {
    const bv = rollBossVariant(rand, wave);
    spawns.push(make(bv, count * gap * 0.5, Math.floor(rand() * tracks)));
  }
  spawns.sort((a, b) => a.at - b.at);

  return {
    wave,
    spawns,
    clearBonus: Math.round((28 + wave * 6) * goldMult),
    isBoss: boss,
    theme,
  };
}

/** Shards banked when the run ends. */
export function shardsForRun(wavesCleared: number, diff: StrongholdDifficultyDef, map: StrongholdMapDef): number {
  if (wavesCleared <= 0) return 0;
  return Math.round((wavesCleared * 4 + Math.floor(wavesCleared / 10) * 30) * diff.shardMult * map.shardMult);
}

/** Save key for a map + difficulty record. King's Road keeps the old bare-difficulty key. */
export function recordKey(mapId: string, diffId: string): string {
  return mapId === 'kingsroad' ? diffId : `${mapId}:${diffId}`;
}
