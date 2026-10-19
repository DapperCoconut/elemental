import { ELEMENT_MAP } from '../elements/ElementRegistry';
import { getAnyWorld } from './AbstractWorlds';
import * as PlayerData from './PlayerData';
import { isProgressLocked } from './ProgressLock';

/**
 * Entanglement research — what it takes to teach Quantum a new element.
 *
 * Quantum has no abilities of its own; every key on it carries another element's ability for
 * that key, and an element has to be *entangled* before it may be put on a key. There are
 * around fifty elements, so the three quests that entangle one are composed rather than
 * hand-written: two errands played as the element itself, then one that proves it on its own
 * ground. The quests still read as specific because they name real abilities and real
 * campaign worlds — the text is generated, the content is not.
 *
 * The composition is deterministic. `fire` asks the same three things on every save and on
 * every machine, because everything is seeded from the element id rather than from a roll.
 *
 * Only one element can be worked on at a time. That is enforced in `PlayerData` rather than
 * here: `addEntangleQuestProgress` drops anything aimed at an element that is not the active
 * one, so no caller has to remember to check.
 *
 * (The file keeps its old name — the research used to unlock *pairs* for a bond Quantum
 * collapsed between. The save migration for that lives in `PlayerData.migrateEntanglements`.)
 */

// ── Tuning ───────────────────────────────────────────────────────────────────
/** Casts of a named ability. Deliberately low — this is a research errand, not a grind. */
const CAST_TARGET = 20;
/** Wins playing the element. */
const WINS_TARGET = 3;
/** Wins against the element when it has no campaign world to send the player into. */
const VERSUS_TARGET = 3;

export type BondQuestKind =
  /** Cast a specific ability of `playAs` this many times. */
  | 'cast'
  /** Win `target` fights while playing `playAs`. */
  | 'wins'
  /** Clear `worldId`'s campaign challenge, playing anyone. */
  | 'challenge'
  /** Beat `versus` opponents, playing anyone. */
  | 'versus';

export interface BondQuest {
  id: string;
  kind: BondQuestKind;
  /** The element the player must be playing for progress to count, when it matters. */
  playAs?: string;
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
 * The ability research asks about. Picked from the element's first five (its actual key
 * bindings — later entries belong to alternate forms), seeded off the element id.
 */
function pickAbility(elementId: string): { id: string; name: string; displayKey: string } | null {
  const abilities = (ELEMENT_MAP[elementId]?.abilities ?? []).slice(0, 5);
  if (!abilities.length) return null;
  const a = abilities[hash(elementId) % abilities.length];
  return { id: a.id, name: a.name, displayKey: a.displayKey };
}

/** True when this element has a campaign world of its own to send the player into. */
export function hasCampaignWorld(elementId: string): boolean {
  return !!getAnyWorld(elementId);
}

/**
 * The three quests that entangle an element. Order is stable: the cast errand, the wins
 * errand, then the proof on its own ground.
 */
export function entangleQuests(elementId: string): BondQuest[] {
  const quests: BondQuest[] = [];

  const ab = pickAbility(elementId);
  if (ab) {
    quests.push({
      id: `cast-${elementId}`,
      kind: 'cast',
      playAs: elementId,
      abilityId: ab.id,
      target: CAST_TARGET,
      title: `${emojiOf(elementId)} ${ab.name}`,
      detail: `Cast ${ab.name} (${ab.displayKey}) ${CAST_TARGET} times while playing ${nameOf(elementId)}.`,
    });
  }

  quests.push({
    id: `wins-${elementId}`,
    kind: 'wins',
    playAs: elementId,
    target: WINS_TARGET,
    title: `${emojiOf(elementId)} ${WINS_TARGET} wins`,
    detail: `Win ${WINS_TARGET} fights while playing ${nameOf(elementId)}.`,
  });

  // The proof: the element's own campaign challenge is the good version of this. Elements
  // with no world of their own fall back to being beaten head-on instead.
  if (hasCampaignWorld(elementId)) {
    quests.push({
      id: `challenge-${elementId}`,
      kind: 'challenge',
      worldId: elementId,
      target: 1,
      title: `${emojiOf(elementId)} ${nameOf(elementId)}'s Challenge`,
      detail: `Clear the ${nameOf(elementId)} world challenge in the campaign, playing anyone.`,
    });
  } else {
    quests.push({
      id: `versus-${elementId}`,
      kind: 'versus',
      versus: elementId,
      target: VERSUS_TARGET,
      title: `vs ${emojiOf(elementId)}`,
      detail: `Defeat ${VERSUS_TARGET} ${nameOf(elementId)} opponents, playing anyone.`,
    });
  }

  return quests;
}

/** Progress on one quest, clamped to its target. */
export function questProgress(elementId: string, quest: BondQuest): number {
  return Math.min(quest.target, PlayerData.getEntangleQuestProgress(elementId, quest.id));
}

export function isQuestDone(elementId: string, quest: BondQuest): boolean {
  return questProgress(elementId, quest) >= quest.target;
}

/** How many of an element's quests are finished, and how many there are. */
export function entangleProgress(elementId: string): { done: number; total: number } {
  const quests = entangleQuests(elementId);
  return { done: quests.filter((q) => isQuestDone(elementId, q)).length, total: quests.length };
}

/**
 * Banks progress and finishes the research if that was the last quest. Every hook below
 * funnels through here, so "did that complete the research" is asked in exactly one place.
 */
function bank(elementId: string, questId: string, amount: number): void {
  // Practice fights are not research — see ProgressLock. Guarded here rather than at
  // each hook so a new hook cannot forget.
  if (isProgressLocked()) return;
  if (PlayerData.getResearchingElement() !== elementId) return;
  PlayerData.addEntangleQuestProgress(elementId, questId, amount);
  if (entangleQuests(elementId).every((q) => isQuestDone(elementId, q))) {
    PlayerData.completeEntanglement(elementId);
  }
}

/** The quests of whatever is being researched, keyed to it — or nothing. */
function activeQuests(): { elementId: string; quests: BondQuest[] } | null {
  const elementId = PlayerData.getResearchingElement();
  return elementId ? { elementId, quests: entangleQuests(elementId) } : null;
}

// ── Progress hooks ───────────────────────────────────────────────────────────
// Each of these is called from the one place in the game that knows the thing happened, and
// each is a no-op unless the active research actually asks for it. Callers do not have to
// know whether anything is being researched at all.

/** Player cast an ability. Called for the local player only — see `Fighter.announceCast`. */
export function noteCast(playingAs: string, abilityId: string): void {
  const active = activeQuests();
  if (!active) return;
  for (const q of active.quests) {
    if (q.kind === 'cast' && q.playAs === playingAs && q.abilityId === abilityId) {
      bank(active.elementId, q.id, 1);
    }
  }
}

/** Player won a fight. `versus` is the opponent's element id. */
export function noteWin(playingAs: string, versus: string): void {
  const active = activeQuests();
  if (!active) return;
  for (const q of active.quests) {
    if (q.kind === 'wins' && q.playAs === playingAs) bank(active.elementId, q.id, 1);
    if (q.kind === 'versus' && q.versus === versus) bank(active.elementId, q.id, 1);
  }
}

/** Player cleared a campaign world's challenge. */
export function noteChallengeCleared(_playingAs: string, worldId: string): void {
  const active = activeQuests();
  if (!active) return;
  for (const q of active.quests) {
    if (q.kind === 'challenge' && q.worldId === worldId) bank(active.elementId, q.id, q.target);
  }
}
