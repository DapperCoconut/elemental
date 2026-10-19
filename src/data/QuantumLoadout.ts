import { ELEMENT_MAP } from '../elements/ElementRegistry';
import { withAltUlt } from '../elements/AltUltimates';
import { Ability } from '../elements/Ability';
import { ALT_ULT_SLOT } from './AltUlts';
import { MASTERY_SLOTS, MasterySlot, getEnhancement, getMasteryDef, isMasteryComplete } from './Mastery';
import * as PlayerData from './PlayerData';

/**
 * Quantum's loadout — the five-slot custom element, and what its one upgrade and its mastery
 * add to it.
 *
 * Quantum has no kit of its own. Each key carries one entangled element's ability for that
 * same key, and pressing the key makes the fighter that element for as long as it takes to
 * use it (see `QuantumKit.routeInput`). Abilities stay on their own key on purpose — a kit
 * reads *its* keys, so an E ability moved to R would never see its press.
 *
 * What a slot brings is governed here, not by the element's own page:
 * - Plain Quantum carries abilities only — no upgrades, no perks, no masteries.
 * - Third State (Quantum's one shop upgrade) lets each slot's upgrade be switched on, when the
 *   player owns that upgrade for that element, and makes Quantum's own kit slottable.
 * - Quantum Mastery adds one borrowed mastery passive, a sixth key (G) carrying any mastery
 *   ability, and an alternate-ultimate mode for the Q slot.
 *
 * The raw choices live in the save (`PlayerData.getQuantumSlots` and friends); this module
 * validates them into something the arena, the lobby and the customization page all read.
 */

export type QuantumSlot = 'click' | 'e' | 'r' | 'f' | 'q';
export const QUANTUM_SLOTS: QuantumSlot[] = ['click', 'e', 'r', 'f', 'q'];

/** The sixth slot's key, as the tray and the customization page print it. */
export const SIXTH_SLOT_KEY = 'G';

export interface QuantumSixth {
  elementId: string;
  enhId: string;
  /**
   * The slot the owning kit is told the ability is bound over. Kits cast a mastery ability by
   * seeing their own R/F/Q key pressed while `masteryBindFor` names it there; the arena hands
   * the kit the G key in that slot's place. F where the enhancement allows it, else R, else Q —
   * preferring a slot the same element does not also occupy, so its base ability stays reachable.
   */
  over: MasterySlot;
}

export interface QuantumLoadout {
  /** Slot key -> the element whose ability sits on it. Every slot is filled. */
  slots: Record<QuantumSlot, string>;
  /** Third State owned — upgrades may be switched on, Quantum's own kit may be slotted. */
  thirdState: boolean;
  /** Per slot: the slot's ability upgrade is on (Third State, owned for that element, switched on). */
  upgrades: Record<QuantumSlot, boolean>;
  /** Quantum Mastery complete and enabled. */
  mastered: boolean;
  /** Mastery: the element whose mastery passive rides along, or null. */
  passive: string | null;
  /** Mastery: the sixth key's mastery ability, or null. */
  sixth: QuantumSixth | null;
  /** Mastery: the Q slot casts its element's alternate ultimate. */
  altQ: boolean;
}

/** Third State — Quantum's one shop upgrade. Owned is enough; it has no off switch of its own. */
export function hasThirdState(): boolean {
  return PlayerData.isUpgradeOwned('quantum', 'click');
}

/** Quantum Mastery, finished and switched on. */
export function isQuantumMastered(): boolean {
  return isMasteryComplete('quantum') && PlayerData.isMasteryEnabled('quantum');
}

/**
 * The resolved loadout. Slots never chosen — or pointing at an element no longer allowed —
 * fall back to the first starter element, so a fresh save plays like plain Fire until the
 * player starts mixing. Every permission is re-checked here, so a save that bought and then
 * lost nothing still cannot carry more than it is entitled to.
 */
export function getQuantumLoadout(): QuantumLoadout {
  const raw = PlayerData.getQuantumSlots();
  const fallback = PlayerData.STARTER_ENTANGLED[0];
  const slots = {} as Record<QuantumSlot, string>;
  for (const s of QUANTUM_SLOTS) {
    const id = raw[s];
    slots[s] = id && isSlotElementAllowed(id) ? id : fallback;
  }

  const thirdState = hasThirdState();
  const upgrades = {} as Record<QuantumSlot, boolean>;
  for (const s of QUANTUM_SLOTS) {
    upgrades[s] = thirdState && slotUpgradeOwned(slots[s], s) && PlayerData.isQuantumUpgradeOn(s);
  }

  const mastered = isQuantumMastered();
  const rawPassive = PlayerData.getQuantumPassive();
  const passive = mastered && rawPassive && isMasteryCandidate(rawPassive) ? rawPassive : null;

  const rawSixth = PlayerData.getQuantumSixth();
  const sixth = mastered && rawSixth ? resolveSixth(rawSixth, slots) : null;

  const altQ = mastered && PlayerData.isQuantumAltQ() && PlayerData.isAltUltUnlocked(slots.q);

  return { slots, thirdState, upgrades, mastered, passive, sixth, altQ };
}

/** Which elements a slot may draw from: anything entangled, plus Quantum's own Third State kit once bought. */
export function isSlotElementAllowed(elementId: string): boolean {
  if (!ELEMENT_MAP[elementId]) return false;
  if (elementId === 'quantum') return hasThirdState();
  return PlayerData.isElementEntangled(elementId);
}

/**
 * Whether a slot has an upgrade the player could switch on: the element sells one for that key
 * and the player owns it. Quantum's own kit has none — its one upgrade is Third State itself.
 */
export function slotUpgradeOwned(elementId: string, slot: QuantumSlot): boolean {
  if (elementId === 'quantum') return false;
  return PlayerData.isUpgradeOwned(elementId, slot);
}

/** An element the mastery features may borrow from: entangled, with its own mastery finished. */
export function isMasteryCandidate(elementId: string): boolean {
  return elementId !== 'quantum' && PlayerData.isElementEntangled(elementId) && isMasteryComplete(elementId);
}

/** Every element the mastery features may borrow from, in registry order. */
export function masteryCandidates(): string[] {
  return Object.keys(ELEMENT_MAP).filter(isMasteryCandidate);
}

/** The passive (non-bindable) enhancements an element's mastery grants — what Borrowed Passive carries. */
export function passiveEnhancements(elementId: string): { id: string; name: string; description: string }[] {
  return (getMasteryDef(elementId)?.enhancements ?? []).filter((e) => !e.bindable);
}

function resolveSixth(pick: { elementId: string; enhId: string }, slots: Record<QuantumSlot, string>): QuantumSixth | null {
  if (!isMasteryCandidate(pick.elementId)) return null;
  const enh = getEnhancement(pick.elementId, pick.enhId);
  if (!enh?.bindable) return null;
  const allowed = MASTERY_SLOTS.filter((s) => !enh.excludeSlots?.includes(s));
  if (!allowed.length) return null;
  // F first — it is the "F-bound" slot — but never over the same element's own key if any
  // other allowed key is free of it.
  const order: MasterySlot[] = ['f', 'r', 'q'];
  const ranked = order.filter((s) => allowed.includes(s));
  const over = ranked.find((s) => slots[s as QuantumSlot] !== pick.elementId) ?? ranked[0];
  return { elementId: pick.elementId, enhId: pick.enhId, over };
}

/**
 * The ability an element puts on a slot. The first match by key is the base form's — Hunt's
 * beast row and Justice's flight row share keys with their first five and come later in the
 * array. `altQ` swaps the Q for the element's alternate ultimate, which is what the kit casts.
 */
export function slotAbility(elementId: string, slot: QuantumSlot, altQ = false): Ability | undefined {
  const base = ELEMENT_MAP[elementId];
  if (!base) return undefined;
  const el = slot === 'q' && altQ ? withAltUlt(base, [ALT_ULT_SLOT]) : base;
  return el.abilities.find((a) => a.displayKey.toLowerCase() === slot);
}

/**
 * The upgrade slot list one carried element fights with — what `hasUpgrade(slot)` answers for
 * it. Only the slots that element sits on, only where the switch is on; an equipped alternate
 * ultimate rides along as `alt-q`, the same pseudo-slot `PlayerData.getActiveUpgrades` uses.
 */
export function upgradesFor(lo: QuantumLoadout, elementId: string): string[] {
  const out: string[] = QUANTUM_SLOTS.filter((s) => lo.slots[s] === elementId && lo.upgrades[s]);
  if (lo.altQ && lo.slots.q === elementId) out.push(ALT_ULT_SLOT);
  return out;
}

/**
 * The distinct elements the player can *become*, in slot order — Click's element first, the
 * sixth key's last. These are the forms the kit routes between and the list a peer is told.
 */
export function loadoutElements(lo: QuantumLoadout): string[] {
  const ids = QUANTUM_SLOTS.map((s) => lo.slots[s]);
  if (lo.sixth) ids.push(lo.sixth.elementId);
  return [...new Set(ids)];
}

/**
 * Every element whose kit must be live for this loadout: the forms, plus the borrowed
 * passive's element, which the player never wears but whose mastery has to run.
 */
export function carriedElements(lo: QuantumLoadout): string[] {
  const ids = loadoutElements(lo);
  if (lo.passive) ids.push(lo.passive);
  return [...new Set(ids)];
}
