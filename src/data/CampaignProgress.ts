import { WORLDS, getChildWorlds, getFightNodes } from './Worlds';
import { ABSTRACT_WORLDS, getAbstractChildWorlds } from './AbstractWorlds';

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
  inventory?: Record<string, number>; // itemId → count
}

interface CampaignData {
  version: 1;
  activeSlot: 0 | 1 | 2 | null;
  slots: [CampaignSlot | null, CampaignSlot | null, CampaignSlot | null];
}

function load(): CampaignData {
  try {
    const raw = localStorage.getItem(campaignKey());
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CampaignData>;
      return {
        version: 1,
        activeSlot: parsed.activeSlot ?? null,
        slots: [
          parsed.slots?.[0] ?? null,
          parsed.slots?.[1] ?? null,
          parsed.slots?.[2] ?? null,
        ],
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

export function purchasePortal(idx: 0 | 1 | 2): boolean {
  if (!spendKeys(idx, 10)) return false;
  const data = load();
  const slot = data.slots[idx];
  if (!slot) return false;
  slot.portalUnlocked = true;
  save(data);
  return true;
}

// ── Gating logic ─────────────────────────────────────────────────────

const findWorld = (id: string) =>
  WORLDS.find((w) => w.id === id) ?? ABSTRACT_WORLDS.find((w) => w.id === id);

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
    // Abstract root requires the portal to be purchased; normal root is always open.
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
  return [...getChildWorlds(parentId), ...getAbstractChildWorlds(parentId)]
    .filter((w) => isWorldUnlocked(idx, w.id))
    .map((w) => w.id);
}
