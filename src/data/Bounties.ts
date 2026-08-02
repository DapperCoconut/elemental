import { MUTATIONS } from './Mutations';
import * as PlayerData from './PlayerData';

/**
 * Bounties — the Disgraced Laboratory's source of Divine Nuclei.
 *
 * Five contracts are posted at a time: an enemy element, a difficulty, and up
 * to three modifiers. Harder boards pay more.
 *
 * The board is **generated, not stored**. A deterministic PRNG seeded from the
 * current hour means every reload inside the same hour rebuilds the identical
 * five bounties, and the board rolls over on its own at the top of the hour
 * with nothing to persist. A paid refresh bumps a saved offset, which shifts
 * the seed and mints a fresh board immediately.
 */

export const BOUNTY_COUNT = 5;
export const BOUNTY_REFRESH_COST_NUCLEI = 5;
const HOUR_MS = 3_600_000;

export interface Bounty {
  /** `"<seed>:<index>"` — identifies this contract on this board. */
  key: string;
  index: number;
  elementId: string;
  name: string;
  emoji: string;
  color: number;
  /** 1–5, matching DIFFICULTY_PRESETS. */
  difficulty: number;
  mutationIds: string[];
  /** Divine Nuclei paid on completion, 1–3. */
  reward: number;
}

interface BountyElement { id: string; name: string; emoji: string; color: number }

/** Every element a bounty can name as the target. Excludes the training dummy. */
const BOUNTY_ELEMENTS: BountyElement[] = [
  { id: 'fire',        name: 'Fire',        emoji: '🔥',  color: 0xff4400 },
  { id: 'water',       name: 'Water',       emoji: '💧',  color: 0x0088ff },
  { id: 'life',        name: 'Life',        emoji: '🌿',  color: 0x44cc44 },
  { id: 'air',         name: 'Air',         emoji: '💨',  color: 0xaaddff },
  { id: 'earth',       name: 'Earth',       emoji: '🗿',  color: 0x887755 },
  { id: 'oil',         name: 'Oil',         emoji: '🛢️', color: 0x664400 },
  { id: 'shadow',      name: 'Shadow',      emoji: '🌑',  color: 0x330044 },
  { id: 'ice',         name: 'Ice',         emoji: '❄️',  color: 0x88ccff },
  { id: 'growth',      name: 'Growth',      emoji: '🐛',  color: 0x88bb22 },
  { id: 'crystal',     name: 'Crystal',     emoji: '💎',  color: 0x88ccff },
  { id: 'soul',        name: 'Soul',        emoji: '👻',  color: 0xccaaff },
  { id: 'hunt',        name: 'Hunt',        emoji: '🐺',  color: 0xcc4400 },
  { id: 'sand',        name: 'Time',        emoji: '⏳',  color: 0xffdd44 },
  { id: 'gravity',     name: 'Gravity',     emoji: '🌌',  color: 0x8844cc },
  { id: 'creation',    name: 'Creation',    emoji: '⚒️', color: 0xcc6622 },
  { id: 'electricity', name: 'Electricity', emoji: '⚡',  color: 0xffee00 },
  { id: 'slime',       name: 'Acid',        emoji: '💚',  color: 0x66cc44 },
  { id: 'fate',        name: 'Fate',        emoji: '🃏',  color: 0x88eecc },
  { id: 'sound',       name: 'Sound',       emoji: '🔊',  color: 0xff66cc },
  { id: 'light',       name: 'Light',       emoji: '✨',  color: 0xfff4a8 },
  { id: 'magnet',      name: 'Magnet',      emoji: '🔗',  color: 0xcc2244 },
  { id: 'metal',       name: 'Metal',       emoji: '⚙️', color: 0x8899aa },
  { id: 'plasma',      name: 'Plasma',      emoji: '🔮',  color: 0xaa22ff },
  { id: 'gunpowder',   name: 'Gunpowder',   emoji: '💀',  color: 0x440066 },
  { id: 'rubber',      name: 'Rubber',      emoji: '🎾',  color: 0xff5577 },
  { id: 'magic',       name: 'Magic',       emoji: '📖',  color: 0x9944ff },
  { id: 'technology',  name: 'Technology',  emoji: '💻',  color: 0x44ccaa },
  { id: 'silence',     name: 'Silence',     emoji: '😶',  color: 0x1a0022 },
  { id: 'echo',        name: 'Echo',        emoji: '🦇',  color: 0xccccff },
  { id: 'subterfuge',  name: 'Subterfuge',  emoji: '🕴️', color: 0xcc2233 },
];

/**
 * mulberry32 — small, fast, and deterministic. The whole board hangs off it, so
 * it must stay stable: changing this function reshuffles every live bounty.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The seed the live board is built from — hour of the epoch plus paid refreshes. */
export function currentBountySeed(): number {
  return Math.floor(Date.now() / HOUR_MS) + PlayerData.getBountyRerollOffset() * 7919;
}

/** Milliseconds until the board rolls over on its own. */
export function msUntilBountyRefresh(): number {
  return HOUR_MS - (Date.now() % HOUR_MS);
}

/** `mm:ss` (or `h:mm:ss`) countdown for the board header. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * Payout ladder. A bounty is only worth 3 nuclei when it is genuinely nasty —
 * roughly Nightmare, or a high difficulty stacked with modifiers.
 */
function rewardFor(difficulty: number, mutationCount: number): number {
  const score = difficulty + 1.2 * mutationCount;
  if (score <= 3.5) return 1;
  if (score <= 5.5) return 2;
  return 3;
}

/**
 * The five live bounties. Boss-only mutations are excluded (they assume a boss
 * fight's stat block); locked ones are not — a bounty grants its modifiers for
 * that fight whether or not the player has unlocked them.
 */
export function getBounties(): Bounty[] {
  const seed = currentBountySeed();
  const pool = MUTATIONS.filter((m) => !m.bossOnly).map((m) => m.id);
  const out: Bounty[] = [];

  for (let i = 0; i < BOUNTY_COUNT; i++) {
    // Per-bounty stream, so bounty 3 doesn't shift when bounty 1's shape changes.
    const rand = mulberry32(seed * 1000 + i);
    const el = BOUNTY_ELEMENTS[Math.floor(rand() * BOUNTY_ELEMENTS.length)];
    const difficulty = 1 + Math.floor(rand() * 5);

    // 0–3 modifiers, weighted so a bare contract is uncommon.
    const roll = rand();
    const modCount = roll < 0.15 ? 0 : roll < 0.5 ? 1 : roll < 0.82 ? 2 : 3;
    const bag = [...pool];
    const mutationIds: string[] = [];
    for (let k = 0; k < modCount && bag.length > 0; k++) {
      mutationIds.push(...bag.splice(Math.floor(rand() * bag.length), 1));
    }

    out.push({
      key: `${seed}:${i}`,
      index: i,
      elementId: el.id,
      name: el.name,
      emoji: el.emoji,
      color: el.color,
      difficulty,
      mutationIds,
      reward: rewardFor(difficulty, mutationIds.length),
    });
  }
  return out;
}

/** Mirrors DIFFICULTY_PRESETS in NpcOpponent.ts, upper-cased for plate labels. */
export const DIFFICULTY_LABELS = ['EASY', 'NORMAL', 'HARD', 'EXPERT', 'NIGHTMARE'];

export function difficultyLabel(level: number): string {
  return DIFFICULTY_LABELS[Math.max(0, Math.min(4, level - 1))];
}
