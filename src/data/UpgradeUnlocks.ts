/**
 * Which shop upgrades a save has *earned the right to buy*.
 *
 * Most elements sell all five slots the moment you own the element. The ten
 * unstable elements (see `UnstableRecipes.ts`) do not: stabilising one hands
 * you the element and nothing else. Its kit is bought back one slot at a time
 * by walking its own Corrupt world.
 *
 * Every one of the ten has a Corrupt world named after it, and every Corrupt
 * world is five fights plus a Sovereign. That lines up exactly with five
 * upgrade slots if the first fight is treated as the toll for showing up:
 *
 *   fight-2 → Click+   fight-3 → E+   fight-4 → R+   fight-5 → F+   Sovereign → Q+
 *
 * Progress is per campaign *slot*, but upgrades are account-wide, so a slot
 * that cleared the fight is enough — asking "which save is active" would let a
 * profile own an upgrade on Monday and not on Tuesday.
 */

import * as CP from './CampaignProgress';
import { getEffectiveFightDef } from './CampaignFightsHard';
import { isUnstableElement } from './UnstableRecipes';

/** Ability slots in shop order. Index N is what the (N+2)th world node pays out. */
const SLOT_ORDER = ['click', 'e', 'r', 'f', 'q'] as const;

const SLOTS: (0 | 1 | 2)[] = [0, 1, 2];

export interface UpgradeGate {
  /** The Corrupt world that pays this slot out — always the element's own. */
  worldId: string;
  /** Campaign node id: `<world>-fight-N`, or `<world>-challenge` for the Sovereign. */
  nodeId: string;
  isChallenge: boolean;
  /** The bout's title, for the "win this" line on a locked plate. */
  fightName: string;
  /** Short human label, e.g. "FIGHT 3" or "SOVEREIGN". */
  stepLabel: string;
}

/**
 * The bout that unlocks one slot, or null when the slot is not gated at all
 * (every element that is not one of the ten).
 */
export function upgradeGate(elementId: string, slot: string): UpgradeGate | null {
  if (!isUnstableElement(elementId)) return null;
  const idx = SLOT_ORDER.indexOf(slot as (typeof SLOT_ORDER)[number]);
  if (idx < 0) return null;

  // Slot 0 (Click) is paid by fight 2, so the step is always index + 2 — and the
  // fifth step falls off the end of the fight list onto the Sovereign.
  const step = idx + 2;
  const isChallenge = step > 5;
  const nodeId = isChallenge ? `${elementId}-challenge` : `${elementId}-fight-${step}`;
  // Hard mode renames some bouts; the base table is the honest label here because
  // either version of the node counts as cleared.
  const fightName = getEffectiveFightDef(nodeId, false)?.name ?? nodeId;

  return {
    worldId: elementId,
    nodeId,
    isChallenge,
    fightName,
    stepLabel: isChallenge ? 'SOVEREIGN' : `FIGHT ${step}`,
  };
}

/** True when the slot is buyable — either ungated, or its Corrupt bout is down in some slot. */
export function isUpgradeUnlocked(elementId: string, slot: string): boolean {
  const gate = upgradeGate(elementId, slot);
  if (!gate) return true;
  return SLOTS.some((idx) => (gate.isChallenge
    ? CP.isChallengeCompleted(idx, gate.worldId)
    : CP.isFightCompleted(idx, gate.worldId, gate.nodeId)));
}

/** How many of an element's five slots have been earned. Used for the shop's column footer. */
export function unlockedUpgradeCount(elementId: string): number {
  return SLOT_ORDER.filter((slot) => isUpgradeUnlocked(elementId, slot)).length;
}
