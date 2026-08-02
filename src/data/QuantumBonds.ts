import { ELEMENT_MAP } from '../elements/ElementRegistry';
import { getAnyWorld } from './AbstractWorlds';
import * as PlayerData from './PlayerData';

/**
 * Bond research — what it takes to teach Quantum a new pair.
 *
 * There are around fifty elements, which is on the order of twelve hundred pairs. Hand-writing
 * three quests for each of those is not a thing anyone should do, so a bond's research is
 * *composed* instead: one quest drawn from each half, plus one that can only be finished by
 * using the two together. The quests still read as specific because they name real abilities
 * and real campaign worlds — the text is generated, the content is not.
 *
 * The composition is deterministic. `fire+water` asks the same three things on every save and
 * on every machine, because everything is seeded from the bond key rather than from a roll.
 *
 * Only one bond can be worked on at a time. That is enforced in `PlayerData` rather than here:
 * `addBondQuestProgress` drops anything aimed at a bond that is not the active one, so no
 * caller has to remember to check.
 */

// ── Tuning ───────────────────────────────────────────────────────────────────
/** Casts of a named ability. Deliberately low — this is a research errand, not a grind. */
const CAST_TARGET = 20;
/** Wins needed when a bond has to fall back to the "beat them with it" quest. */
const VERSUS_TARGET = 3;

export type BondQuestKind =
  /** Cast a specific ability of `playAs` this many times. */
  | 'cast'
  /** Clear `worldId`'s campaign challenge while playing `playAs`. */
  | 'crossChallenge'
  /** Beat `versus` opponents while playing `playAs`. */
  | 'versus';

export interface BondQuest {
  id: string;
  kind: BondQuestKind;
  /** The element the player must be playing for progress to count. */
  playAs: string;
  target: number;
  abilityId?: string;
  worldId?: string;
  versus?: string;
  title: string;
  detail: string;
}

/** Stable non-negative hash of a string. Only needs to be deterministic, not good. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function nameOf(id: string): string {
  return ELEMENT_MAP[id]?.name ?? id;
}

function emojiOf(id: string): string {
  return ELEMENT_MAP[id]?.emoji ?? '⚛️';
}

/**
 * The ability a bond will ask about for one of its halves. Picked from that element's first
 * five (its actual key bindings — later entries belong to alternate forms) and seeded with a
 * salt so the two halves of a bond never land on the same slot index.
 */
function pickAbility(elementId: string, key: string, salt: number): { id: string; name: string; displayKey: string } | null {
  const abilities = (ELEMENT_MAP[elementId]?.abilities ?? []).slice(0, 5);
  if (!abilities.length) return null;
  const a = abilities[(hash(key) + salt) % abilities.length];
  return { id: a.id, name: a.name, displayKey: a.displayKey };
}

/** True when this element has a campaign world of its own to send the player into. */
export function hasCampaignWorld(elementId: string): boolean {
  return !!getAnyWorld(elementId);
}

/**
 * The three quests that unlock a bond. Order is stable: the first half's errand, the second
 * half's errand, then the one that needs both.
 */
export function bondQuests(a: string, b: string): BondQuest[] {
  // Sorted, so `fire+water` and `water+fire` compose identically — a bond is unordered.
  const [x, y] = [a, b].sort();
  const key = PlayerData.bondKey(x, y);
  const quests: BondQuest[] = [];

  const half = (elementId: string, salt: number): void => {
    const ab = pickAbility(elementId, key, salt);
    if (!ab) return;
    quests.push({
      id: `cast-${elementId}`,
      kind: 'cast',
      playAs: elementId,
      abilityId: ab.id,
      target: CAST_TARGET,
      title: `${emojiOf(elementId)} ${ab.name}`,
      detail: `Cast ${ab.name} (${ab.displayKey}) ${CAST_TARGET} times while playing ${nameOf(elementId)}.`,
    });
  };
  half(x, 0);
  half(y, 3);

  // The bond quest proper: one half has to be carried through the other half's ground. The
  // campaign challenge is the good version of this — "clear Fire's challenge as Water" is
  // exactly the shape of thing a bond should cost. Elements with no world of their own fall
  // back to beating that element head-on instead.
  const challengeWorld = hasCampaignWorld(x) ? x : hasCampaignWorld(y) ? y : null;
  if (challengeWorld) {
    const other = challengeWorld === x ? y : x;
    quests.push({
      id: `cross-${challengeWorld}`,
      kind: 'crossChallenge',
      playAs: other,
      worldId: challengeWorld,
      target: 1,
      title: `${emojiOf(challengeWorld)} ${nameOf(challengeWorld)}'s Challenge`,
      detail: `Clear the ${nameOf(challengeWorld)} world challenge in the campaign while playing ${nameOf(other)}.`,
    });
  } else {
    quests.push({
      id: `versus-${y}`,
      kind: 'versus',
      playAs: x,
      versus: y,
      target: VERSUS_TARGET,
      title: `${emojiOf(x)} vs ${emojiOf(y)}`,
      detail: `Defeat ${VERSUS_TARGET} ${nameOf(y)} opponents while playing ${nameOf(x)}.`,
    });
  }

  return quests;
}

/** Progress on one quest, clamped to its target. */
export function questProgress(bondKey: string, quest: BondQuest): number {
  return Math.min(quest.target, PlayerData.getBondQuestProgress(bondKey, quest.id));
}

export function isQuestDone(bondKey: string, quest: BondQuest): boolean {
  return questProgress(bondKey, quest) >= quest.target;
}

/** How many of a bond's quests are finished, and how many there are. */
export function bondProgress(a: string, b: string): { done: number; total: number } {
  const key = PlayerData.bondKey(a, b);
  const quests = bondQuests(a, b);
  return { done: quests.filter((q) => isQuestDone(key, q)).length, total: quests.length };
}

/**
 * Banks progress and finishes the bond if that was the last quest. Every hook below funnels
 * through here, so "did that complete the research" is asked in exactly one place.
 */
function bank(key: string, questId: string, amount: number): void {
  const active = PlayerData.getResearchingBond();
  if (active !== key) return;
  PlayerData.addBondQuestProgress(key, questId, amount);

  const halves = key.split('+');
  if (halves.length !== 2) return;
  const quests = bondQuests(halves[0], halves[1]);
  if (quests.every((q) => isQuestDone(key, q))) PlayerData.completeBondResearch(key);
}

/** The bond being researched as `[a, b]`, or null. */
export function researchingPair(): [string, string] | null {
  const key = PlayerData.getResearchingBond();
  if (!key) return null;
  const halves = key.split('+');
  return halves.length === 2 ? [halves[0], halves[1]] : null;
}

// ── Progress hooks ───────────────────────────────────────────────────────────
// Each of these is called from the one place in the game that knows the thing happened, and
// each is a no-op unless the active research actually asks for it. Callers do not have to
// know whether any bond is being researched at all.

/** Player cast an ability. Called for the local player only — see `Fighter.announceCast`. */
export function noteCast(playingAs: string, abilityId: string): void {
  const pair = researchingPair();
  if (!pair) return;
  const key = PlayerData.bondKey(pair[0], pair[1]);
  for (const q of bondQuests(pair[0], pair[1])) {
    if (q.kind === 'cast' && q.playAs === playingAs && q.abilityId === abilityId) {
      bank(key, q.id, 1);
    }
  }
}

/** Player won a fight. `versus` is the opponent's element id. */
export function noteWin(playingAs: string, versus: string): void {
  const pair = researchingPair();
  if (!pair) return;
  const key = PlayerData.bondKey(pair[0], pair[1]);
  for (const q of bondQuests(pair[0], pair[1])) {
    if (q.kind === 'versus' && q.playAs === playingAs && q.versus === versus) {
      bank(key, q.id, 1);
    }
  }
}

/** Player cleared a campaign world's challenge. */
export function noteChallengeCleared(playingAs: string, worldId: string): void {
  const pair = researchingPair();
  if (!pair) return;
  const key = PlayerData.bondKey(pair[0], pair[1]);
  for (const q of bondQuests(pair[0], pair[1])) {
    if (q.kind === 'crossChallenge' && q.playAs === playingAs && q.worldId === worldId) {
      bank(key, q.id, q.target);
    }
  }
}
