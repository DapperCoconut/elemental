import { getChildWorlds, getFightNodes } from './Worlds';
import { ABSTRACT_WORLDS, ALL_WORLDS, getAbstractChildWorlds } from './AbstractWorlds';
import { CORRUPT_WORLDS, getCorruptChildWorlds } from './CorruptWorlds';

import { saveKey } from './Cheats';

const CAMPAIGN_BASE = 'elemental_campaign';

// Resolved per call, not cached — the key changes when cheat mode is toggled.
const campaignKey = () => saveKey(CAMPAIGN_BASE);

export interface CampaignSlot {
  name: string;
  createdAt: number;
  fightsCompleted: Record<string, string[]>; // worldId → fightId[]
  challengesCompleted: string[];             // worldId[]
  gauntletsCompleted?: string[];             // worldId[]
  keys?: number;           // earned from challenge wins
  sparks?: number;         // earned from any campaign win
  cheated?: boolean;       // set when WWSSADADBA grants keys to this slot
  portalUnlocked?: boolean; // set when player spends 10 keys on the portal
  /** Set when the player spends 20 keys on the scarred portal to the Corrupt Realm. */
  corruptPortalUnlocked?: boolean;
  inventory?: Record<string, number>; // itemId → count
  /** Story beats already shown, so dialogue never replays. */
  seenStoryBeats?: string[];
}

interface CampaignData {
  version: 1;
  activeSlot: 0 | 1 | 2 | null;
  slots: [CampaignSlot | null, CampaignSlot | null, CampaignSlot | null];
}

/**
 * Subterfuge's world used to be `quantum` — its fight nodes were `quantum-fight-1..5`,
 * its challenge `quantum-challenge`, and its story beats `world-enter:quantum` and friends.
 * The id moved to `subterfuge` when the real Quantum element took the name, so a campaign
 * slot written before that has clears filed under ids nothing looks up any more.
 *
 * Rewrites them in place on load. Idempotent, and never clobbers an existing `subterfuge`
 * entry — a slot that somehow has both keeps the newer one and merges the clears in.
 */
function migrateSubterfugeWorld(slot: CampaignSlot): void {
  const OLD = 'quantum';
  const NEW = 'subterfuge';
  const rename = (id: string): string => (id === OLD || id.startsWith(`${OLD}-`)
    ? NEW + id.slice(OLD.length)
    : id);

  const oldFights = slot.fightsCompleted?.[OLD];
  if (oldFights) {
    const merged = new Set([...(slot.fightsCompleted[NEW] ?? []), ...oldFights.map(rename)]);
    slot.fightsCompleted[NEW] = [...merged];
    delete slot.fightsCompleted[OLD];
  }

  const worldLists: Array<string[] | undefined> = [
    slot.challengesCompleted, slot.gauntletsCompleted,
  ];
  for (const list of worldLists) {
    if (!list) continue;
    const at = list.indexOf(OLD);
    if (at < 0) continue;
    if (list.includes(NEW)) list.splice(at, 1);
    else list[at] = NEW;
  }

  if (slot.seenStoryBeats) {
    // Beat ids are `<kind>:<worldId>` — rewrite only the world half.
    slot.seenStoryBeats = [...new Set(slot.seenStoryBeats.map((id) => {
      const colon = id.lastIndexOf(':');
      return colon < 0 ? id : `${id.slice(0, colon + 1)}${rename(id.slice(colon + 1))}`;
    }))];
  }
}

function load(): CampaignData {
  try {
    const raw = localStorage.getItem(campaignKey());
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CampaignData>;
      const slots: [CampaignSlot | null, CampaignSlot | null, CampaignSlot | null] = [
        parsed.slots?.[0] ?? null,
        parsed.slots?.[1] ?? null,
        parsed.slots?.[2] ?? null,
      ];
      for (const slot of slots) if (slot) migrateSubterfugeWorld(slot);
      return {
        version: 1,
        activeSlot: parsed.activeSlot ?? null,
        slots,
      };
    }
  } catch {
    // corrupted — start fresh
  }
  return { version: 1, activeSlot: null, slots: [null, null, null] };
}

function save(data: CampaignData): void {
  try {
    localStorage.setItem(campaignKey(), JSON.stringify(data));
  } catch {
    // storage unavailable
  }
}

// ── Slot management ──────────────────────────────────────────────────

export function getSlots(): (CampaignSlot | null)[] {
  return load().slots;
}

export function getSlot(idx: 0 | 1 | 2): CampaignSlot | null {
  return load().slots[idx];
}

export function getActiveSlot(): 0 | 1 | 2 | null {
  return load().activeSlot;
}

export function setActiveSlot(idx: 0 | 1 | 2): void {
  const data = load();
  data.activeSlot = idx;
  save(data);
}

export function createSlot(idx: 0 | 1 | 2, name: string): void {
  const data = load();
  data.slots[idx] = { name, createdAt: Date.now(), fightsCompleted: {}, challengesCompleted: [], gauntletsCompleted: [], keys: 0, sparks: 0, cheated: false, portalUnlocked: false, inventory: {} };
  save(data);
}

export function renameSlot(idx: 0 | 1 | 2, name: string): void {
  const data = load();
  if (data.slots[idx]) data.slots[idx]!.name = name;
  save(data);
}

export function deleteSlot(idx: 0 | 1 | 2): void {
  const data = load();
  data.slots[idx] = null;
  if (data.activeSlot === idx) data.activeSlot = null;
  save(data);
}

export function getSlotSummary(idx: 0 | 1 | 2): { fights: number; challenges: number } {
  const slot = load().slots[idx];
  if (!slot) return { fights: 0, challenges: 0 };
  const fights = Object.values(slot.fightsCompleted).reduce((sum, arr) => sum + arr.length, 0);
  return { fights, challenges: slot.challengesCompleted.length };
}

// ── Progress reads ───────────────────────────────────────────────────

export function isFightCompleted(idx: 0 | 1 | 2, worldId: string, fightId: string): boolean {
  return (load().slots[idx]?.fightsCompleted[worldId] ?? []).includes(fightId);
}

export function isChallengeCompleted(idx: 0 | 1 | 2, worldId: string): boolean {
  return load().slots[idx]?.challengesCompleted.includes(worldId) ?? false;
}

export function markFightCompleted(idx: 0 | 1 | 2, worldId: string, fightId: string): void {
  const data = load();
  const slot = data.slots[idx];
  if (!slot) return;
  const existing = slot.fightsCompleted[worldId] ?? [];
  if (!existing.includes(fightId)) {
    slot.fightsCompleted[worldId] = [...existing, fightId];
    save(data);
  }
}

export function markChallengeCompleted(idx: 0 | 1 | 2, worldId: string): void {
  const data = load();
  const slot = data.slots[idx];
  if (!slot) return;
  if (!slot.challengesCompleted.includes(worldId)) {
    slot.challengesCompleted = [...slot.challengesCompleted, worldId];
    save(data);
  }
}

export function isGauntletCompleted(idx: 0 | 1 | 2, worldId: string): boolean {
  return load().slots[idx]?.gauntletsCompleted?.includes(worldId) ?? false;
}

export function markGauntletCompleted(idx: 0 | 1 | 2, worldId: string): void {
  const data = load();
  const slot = data.slots[idx];
  if (!slot) return;
  if (!(slot.gauntletsCompleted ?? []).includes(worldId)) {
    slot.gauntletsCompleted = [...(slot.gauntletsCompleted ?? []), worldId];
    save(data);
  }
}

export function getKeys(idx: 0 | 1 | 2): number {
  return load().slots[idx]?.keys ?? 0;
}

export function getSparks(idx: 0 | 1 | 2): number {
  return load().slots[idx]?.sparks ?? 0;
}

export function addKeys(idx: 0 | 1 | 2, amount: number): void {
  const data = load();
  const slot = data.slots[idx];
  if (!slot) return;
  slot.keys = (slot.keys ?? 0) + amount;
  save(data);
}

export function addSparks(idx: 0 | 1 | 2, amount: number): void {
  const data = load();
  const slot = data.slots[idx];
  if (!slot) return;
  slot.sparks = (slot.sparks ?? 0) + amount;
  save(data);
}

export function spendKeys(idx: 0 | 1 | 2, amount: number): boolean {
  const data = load();
  const slot = data.slots[idx];
  if (!slot || (slot.keys ?? 0) < amount) return false;
  slot.keys = (slot.keys ?? 0) - amount;
  save(data);
  return true;
}

export function spendSparks(idx: 0 | 1 | 2, amount: number): boolean {
  const data = load();
  const slot = data.slots[idx];
  if (!slot || (slot.sparks ?? 0) < amount) return false;
  slot.sparks = (slot.sparks ?? 0) - amount;
  save(data);
  return true;
}

export function getInventory(idx: 0 | 1 | 2): Record<string, number> {
  return load().slots[idx]?.inventory ?? {};
}

export function addItem(idx: 0 | 1 | 2, itemId: string, count = 1): void {
  const data = load();
  const slot = data.slots[idx];
  if (!slot) return;
  if (!slot.inventory) slot.inventory = {};
  slot.inventory[itemId] = (slot.inventory[itemId] ?? 0) + count;
  save(data);
}

export function consumeItem(idx: 0 | 1 | 2, itemId: string): boolean {
  const data = load();
  const slot = data.slots[idx];
  if (!slot || !slot.inventory) return false;
  const count = slot.inventory[itemId] ?? 0;
  if (count <= 0) return false;
  if (count === 1) {
    delete slot.inventory[itemId];
  } else {
    slot.inventory[itemId] = count - 1;
  }
  save(data);
  return true;
}

export function isCheated(idx: 0 | 1 | 2): boolean {
  return load().slots[idx]?.cheated ?? false;
}

export function markCheated(idx: 0 | 1 | 2): void {
  const data = load();
  const slot = data.slots[idx];
  if (!slot) return;
  slot.cheated = true;
  save(data);
}

export function isPortalUnlocked(idx: 0 | 1 | 2): boolean {
  return load().slots[idx]?.portalUnlocked ?? false;
}

/**
 * Opens the portal without charging for it. The cheat save's route in — granting the flag
 * directly means a fully-unlocked profile never depends on paying a cost or meeting a
 * prerequisite in the right order.
 */
export function unlockPortal(idx: 0 | 1 | 2): void {
  const data = load();
  const slot = data.slots[idx];
  if (!slot) return;
  slot.portalUnlocked = true;
  save(data);
}

export function purchasePortal(idx: 0 | 1 | 2): boolean {
  if (!spendKeys(idx, 10)) return false;
  unlockPortal(idx);
  return true;
}

export const CORRUPT_PORTAL_COST = 20;
/** Sovereigns that must fall in the Abstract Realm before the scar will open. */
export const CORRUPT_PORTAL_CHALLENGES = 5;

export function isCorruptPortalUnlocked(idx: 0 | 1 | 2): boolean {
  return load().slots[idx]?.corruptPortalUnlocked ?? false;
}

/** How many Abstract Realm challenges are down — the scar's other prerequisite. */
export function abstractChallengesCleared(idx: 0 | 1 | 2): number {
  const slot = load().slots[idx];
  if (!slot) return 0;
  return ABSTRACT_WORLDS.filter((w) => slot.challengesCompleted.includes(w.id)).length;
}

export function canOpenCorruptPortal(idx: 0 | 1 | 2): boolean {
  return isPortalUnlocked(idx) && abstractChallengesCleared(idx) >= CORRUPT_PORTAL_CHALLENGES;
}

/** Tears the scar open with no keys and no prerequisites — see `unlockPortal`. */
export function unlockCorruptPortal(idx: 0 | 1 | 2): void {
  const data = load();
  const slot = data.slots[idx];
  if (!slot) return;
  slot.corruptPortalUnlocked = true;
  save(data);
}

export function purchaseCorruptPortal(idx: 0 | 1 | 2): boolean {
  if (!canOpenCorruptPortal(idx)) return false;
  if (!spendKeys(idx, CORRUPT_PORTAL_COST)) return false;
  unlockCorruptPortal(idx);
  return true;
}

// ── The Amalgam ──────────────────────────────────────────────────────
// The finale is not a world: it hangs off the corrupt map's heart and opens
// only once every Sovereign in the scar has been put back on its feet.

/** The pseudo-world the Amalgam's completion is filed under. */
export const AMALGAM_WORLD_ID = 'amalgam';

export function corruptChallengesCleared(idx: 0 | 1 | 2): number {
  const slot = load().slots[idx];
  if (!slot) return 0;
  return CORRUPT_WORLDS.filter((w) => slot.challengesCompleted.includes(w.id)).length;
}

export function canFightAmalgam(idx: 0 | 1 | 2): boolean {
  return isCorruptPortalUnlocked(idx) && corruptChallengesCleared(idx) >= CORRUPT_WORLDS.length;
}

export function isAmalgamFelled(idx: 0 | 1 | 2): boolean {
  return isChallengeCompleted(idx, AMALGAM_WORLD_ID);
}

// ── Story beats ──────────────────────────────────────────────────────

export function hasSeenStoryBeat(idx: 0 | 1 | 2, beatId: string): boolean {
  return load().slots[idx]?.seenStoryBeats?.includes(beatId) ?? false;
}

export function markStoryBeatSeen(idx: 0 | 1 | 2, beatId: string): void {
  const data = load();
  const slot = data.slots[idx];
  if (!slot) return;
  if (!slot.seenStoryBeats) slot.seenStoryBeats = [];
  if (!slot.seenStoryBeats.includes(beatId)) {
    slot.seenStoryBeats.push(beatId);
    save(data);
  }
}

// ── Gating logic ─────────────────────────────────────────────────────

const findWorld = (id: string) => ALL_WORLDS.find((w) => w.id === id);

/** True once all five numbered fights of a world are won (the challenge is not counted). */
export function areFightsCleared(idx: 0 | 1 | 2, worldId: string): boolean {
  const world = findWorld(worldId);
  if (!world) return false;
  return getFightNodes(world).every((n) => isFightCompleted(idx, worldId, n.id));
}

export function isWorldUnlocked(idx: 0 | 1 | 2, worldId: string): boolean {
  const world = findWorld(worldId);
  if (!world) return false;
  if (world.parentId === null) {
    // Each realm's root is gated on its portal; the normal root is always open.
    if (CORRUPT_WORLDS.some((w) => w.id === worldId)) return isCorruptPortalUnlocked(idx);
    if (ABSTRACT_WORLDS.some((w) => w.id === worldId)) return isPortalUnlocked(idx);
    return true;
  }
  // Clearing the parent's five fights is enough to move on — its challenge is
  // optional bonus content (it pays the 🗝️ keys the portal wants).
  return isWorldUnlocked(idx, world.parentId) && areFightsCleared(idx, world.parentId);
}

export function isFightUnlocked(idx: 0 | 1 | 2, worldId: string, fightId: string): boolean {
  if (!isWorldUnlocked(idx, worldId)) return false;
  const world = findWorld(worldId);
  if (!world) return false;
  const fightNodes = getFightNodes(world);
  const nodeIndex = fightNodes.findIndex((n) => n.id === fightId);
  if (nodeIndex === -1) return true; // shop / challenge handled separately
  if (nodeIndex === 0) return true;
  return isFightCompleted(idx, worldId, fightNodes[nodeIndex - 1].id);
}

export function isChallengeUnlocked(idx: 0 | 1 | 2, worldId: string): boolean {
  if (!isWorldUnlocked(idx, worldId)) return false;
  return areFightsCleared(idx, worldId);
}

// ── Children unlock preview ───────────────────────────────────────────

export function getUnlockedChildWorlds(idx: 0 | 1 | 2, parentId: string): string[] {
  return [...getChildWorlds(parentId), ...getAbstractChildWorlds(parentId), ...getCorruptChildWorlds(parentId)]
    .filter((w) => isWorldUnlocked(idx, w.id))
    .map((w) => w.id);
}
