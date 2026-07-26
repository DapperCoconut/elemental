import { saveKey } from './Cheats';

const STORAGE_BASE = 'elemental_save';

// Resolved per call, not cached — the key changes when cheat mode is toggled.
const storageKey = () => saveKey(STORAGE_BASE);

interface SaveData {
  shards: number;
  owned: Record<string, string[]>;   // elementId → owned slot keys
  active: Record<string, string[]>;  // elementId → toggled-on slot keys
  nuclei: number;                    // Elemental Nucleus count
  unlockedElements: string[];        // combined element IDs unlocked via Lab
  gauntletUnlocked: boolean;
  gauntletsCompleted: string[];      // base element IDs of completed gauntlets
  gauntletHardUnlocked: boolean;
  gauntletsCompletedHard: string[]; // base element IDs of hard-mode completed gauntlets
  dummyUnlocked: boolean;            // true once the WWSSADADBA code has been entered
  labLevel: number;                  // 0 = base, 1-3 = upgraded
  corruptShards: number;             // currency earned in Invasion mode
  unlockedPerks: Record<string, string[]>;   // elementId → owned perk ids
  equippedPerks: Record<string, string>;     // elementId → single equipped perk id
  unlockedMutations: string[];       // mutation IDs explicitly unlocked (excludes unlockedByDefault ones)
  infinityBestFightNormal: number;   // furthest fight reached in Infinity (normal)
  infinityBestFightHard: number;     // furthest fight reached in Infinity (hard)
  masteryProgress: Record<string, Record<string, number>>; // elementId -> statKey -> count
  masteryEnabled: Record<string, boolean>;                 // elementId -> enabled
  masteryBinds: Record<string, Record<string, string>>;    // elementId -> slot -> enhancement id
  achievements: string[];                                  // unlocked achievement ids
  equippedSkins: Record<string, string>;                   // elementId -> equipped skin id
  divineNuclei: number;                // Divine Nucleus count — fuel for the Disgraced Lab
  kingDefeated: boolean;               // true once the Disgraced King has been beaten
  devourerDefeated: boolean;           // true once the hard-mode Devourer of Kings has been put down
  devourerChoice: string;              // '' | 'spare' | 'kill' — which ending was taken first
  bountyRerollOffset: number;          // bumped by a manual bounty refresh, shifts the hourly seed
  completedBountyKeys: string[];       // "<seed>:<index>" of bounties already cashed in
}

function load(): SaveData {
  try {
    const raw = localStorage.getItem(storageKey());
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      const d: SaveData = {
        shards: parsed.shards ?? 0,
        owned: parsed.owned ?? {},
        active: parsed.active ?? {},
        nuclei: parsed.nuclei ?? 0,
        unlockedElements: parsed.unlockedElements ?? [],
        gauntletUnlocked: parsed.gauntletUnlocked ?? false,
        gauntletsCompleted: parsed.gauntletsCompleted ?? [],
        gauntletHardUnlocked: parsed.gauntletHardUnlocked ?? false,
        gauntletsCompletedHard: parsed.gauntletsCompletedHard ?? [],
        dummyUnlocked: parsed.dummyUnlocked ?? false,
        labLevel: parsed.labLevel ?? 0,
        corruptShards: parsed.corruptShards ?? 0,
        unlockedPerks: parsed.unlockedPerks ?? {},
        equippedPerks: parsed.equippedPerks ?? {},
        unlockedMutations: parsed.unlockedMutations ?? [],
        infinityBestFightNormal: parsed.infinityBestFightNormal ?? 0,
        infinityBestFightHard: parsed.infinityBestFightHard ?? 0,
        masteryProgress: parsed.masteryProgress ?? {},
        masteryEnabled: parsed.masteryEnabled ?? {},
        masteryBinds: parsed.masteryBinds ?? {},
        achievements: parsed.achievements ?? [],
        equippedSkins: parsed.equippedSkins ?? {},
        divineNuclei: parsed.divineNuclei ?? 0,
        kingDefeated: parsed.kingDefeated ?? false,
        devourerDefeated: parsed.devourerDefeated ?? false,
        devourerChoice: parsed.devourerChoice ?? '',
        bountyRerollOffset: parsed.bountyRerollOffset ?? 0,
        completedBountyKeys: parsed.completedBountyKeys ?? [],
      };
      // Sanity: clear equipped perk if no longer unlocked
      for (const el of Object.keys(d.equippedPerks)) {
        if (!(d.unlockedPerks[el] ?? []).includes(d.equippedPerks[el])) {
          delete d.equippedPerks[el];
        }
      }
      return d;
    }
  } catch {
    // corrupted save — start fresh
  }
  return { shards: 0, owned: {}, active: {}, nuclei: 0, unlockedElements: [], gauntletUnlocked: false, gauntletsCompleted: [], gauntletHardUnlocked: false, gauntletsCompletedHard: [], dummyUnlocked: false, labLevel: 0, corruptShards: 0, unlockedPerks: {}, equippedPerks: {}, unlockedMutations: [], infinityBestFightNormal: 0, infinityBestFightHard: 0, masteryProgress: {}, masteryEnabled: {}, masteryBinds: {}, achievements: [], equippedSkins: {}, divineNuclei: 0, kingDefeated: false, devourerDefeated: false, devourerChoice: '', bountyRerollOffset: 0, completedBountyKeys: [] };
}

function save(data: SaveData): void {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(data));
  } catch {
    // storage unavailable — silently ignore
  }
}

export function getShards(): number {
  return load().shards;
}

export function addShards(amount: number): void {
  const data = load();
  data.shards += amount;
  save(data);
}

export function spendShards(amount: number): boolean {
  const data = load();
  if (data.shards < amount) return false;
  data.shards -= amount;
  save(data);
  return true;
}

export function isUpgradeOwned(elementId: string, slot: string): boolean {
  return (load().owned[elementId] ?? []).includes(slot);
}

export function isUpgradeActive(elementId: string, slot: string): boolean {
  return (load().active[elementId] ?? []).includes(slot);
}

export function purchaseUpgrade(elementId: string, slot: string): void {
  const data = load();
  if (!(data.owned[elementId] ?? []).includes(slot)) {
    data.owned[elementId] = [...(data.owned[elementId] ?? []), slot];
    // Auto-activate on purchase
    data.active[elementId] = [...(data.active[elementId] ?? []), slot];
  }
  save(data);
}

export function toggleUpgrade(elementId: string, slot: string): void {
  const data = load();
  const current = data.active[elementId] ?? [];
  if (current.includes(slot)) {
    data.active[elementId] = current.filter((s) => s !== slot);
  } else {
    data.active[elementId] = [...current, slot];
  }
  save(data);
}

export function getActiveUpgrades(elementId: string): string[] {
  return load().active[elementId] ?? [];
}

export function getNuclei(): number {
  return load().nuclei;
}

export function addNuclei(amount: number): void {
  const data = load();
  data.nuclei += amount;
  save(data);
}

export function spendNucleus(): boolean {
  const data = load();
  if (data.nuclei < 1) return false;
  data.nuclei -= 1;
  save(data);
  return true;
}

export function spendNuclei(n: number): boolean {
  const data = load();
  if (data.nuclei < n) return false;
  data.nuclei -= n;
  save(data);
  return true;
}

export function isPerkUnlocked(elementId: string, perkId: string): boolean {
  return (load().unlockedPerks[elementId] ?? []).includes(perkId);
}

export function unlockPerk(elementId: string, perkId: string): void {
  const data = load();
  if (!(data.unlockedPerks[elementId] ?? []).includes(perkId)) {
    data.unlockedPerks[elementId] = [...(data.unlockedPerks[elementId] ?? []), perkId];
  }
  save(data);
}

export function getUnlockedPerks(elementId: string): string[] {
  return load().unlockedPerks[elementId] ?? [];
}

/**
 * Every perk forged in the Lab, summed across all elements. Gates the secret
 * door on the last Shop page — the door wants a breadth of mastery, not one
 * element taken far.
 */
export function getTotalForgedPerkCount(): number {
  const perks = load().unlockedPerks;
  let total = 0;
  for (const el of Object.keys(perks)) total += (perks[el] ?? []).length;
  return total;
}

export function getEquippedPerk(elementId: string): string | null {
  return load().equippedPerks[elementId] ?? null;
}

export function equipPerk(elementId: string, perkId: string | null): void {
  const data = load();
  if (perkId === null) {
    delete data.equippedPerks[elementId];
  } else {
    data.equippedPerks[elementId] = perkId;
  }
  save(data);
}

export function isElementUnlocked(id: string): boolean {
  return load().unlockedElements.includes(id);
}

export function unlockElement(id: string): void {
  const data = load();
  if (!data.unlockedElements.includes(id)) {
    data.unlockedElements = [...data.unlockedElements, id];
  }
  save(data);
}

export function isGauntletUnlocked(): boolean {
  return load().gauntletUnlocked;
}

export function unlockGauntlet(): void {
  const data = load();
  data.gauntletUnlocked = true;
  save(data);
}

export function getCompletedGauntlets(): string[] {
  return load().gauntletsCompleted;
}

export function completeGauntlet(elementId: string): void {
  const data = load();
  if (!data.gauntletsCompleted.includes(elementId)) {
    data.gauntletsCompleted = [...data.gauntletsCompleted, elementId];
  }
  save(data);
}

export function isGauntletHardUnlocked(): boolean {
  return load().gauntletHardUnlocked;
}

export function unlockGauntletHard(): void {
  const data = load();
  data.gauntletHardUnlocked = true;
  save(data);
}

export function getCompletedGauntletsHard(): string[] {
  return load().gauntletsCompletedHard;
}

export function completeGauntletHard(elementId: string): void {
  const data = load();
  if (!data.gauntletsCompletedHard.includes(elementId)) {
    data.gauntletsCompletedHard = [...data.gauntletsCompletedHard, elementId];
  }
  save(data);
}

export function isDummyUnlocked(): boolean {
  return load().dummyUnlocked;
}

export function unlockDummy(): void {
  const data = load();
  if (!data.dummyUnlocked) {
    data.dummyUnlocked = true;
    save(data);
  }
}

export function getLabLevel(): number {
  return load().labLevel;
}

export function upgradelab(): boolean {
  const data = load();
  if (data.labLevel >= 4) return false;
  data.labLevel += 1;
  save(data);
  return true;
}

export function getCorruptShards(): number {
  return load().corruptShards;
}

export function addCorruptShards(amount: number): void {
  const data = load();
  data.corruptShards += amount;
  save(data);
}

export function spendCorruptShards(amount: number): boolean {
  const data = load();
  if (data.corruptShards < amount) return false;
  data.corruptShards -= amount;
  save(data);
  return true;
}

import { MUTATIONS } from './Mutations';

export function isMutationUnlocked(id: string): boolean {
  const def = MUTATIONS.find((m) => m.id === id);
  if (def?.unlockedByDefault) return true;
  return load().unlockedMutations.includes(id);
}

export function unlockMutation(id: string): void {
  const data = load();
  if (!data.unlockedMutations.includes(id)) {
    data.unlockedMutations = [...data.unlockedMutations, id];
    save(data);
  }
}

export function getUnlockedMutationIds(): string[] {
  return load().unlockedMutations;
}

export function getInfinityBestFight(hardMode: boolean): number {
  const d = load();
  return hardMode ? d.infinityBestFightHard : d.infinityBestFightNormal;
}

export function setInfinityBestFight(fightNum: number, hardMode: boolean): void {
  const data = load();
  if (hardMode) {
    if (fightNum > data.infinityBestFightHard) {
      data.infinityBestFightHard = fightNum;
      save(data);
    }
  } else {
    if (fightNum > data.infinityBestFightNormal) {
      data.infinityBestFightNormal = fightNum;
      save(data);
    }
  }
}

export function getMasteryStat(elementId: string, key: string): number {
  return load().masteryProgress[elementId]?.[key] ?? 0;
}

export function addMasteryStat(elementId: string, key: string, amount: number): void {
  const data = load();
  const el = { ...(data.masteryProgress[elementId] ?? {}) };
  el[key] = (el[key] ?? 0) + amount;
  data.masteryProgress = { ...data.masteryProgress, [elementId]: el };
  save(data);
}

export function recordMasteryBest(elementId: string, key: string, value: number): void {
  const data = load();
  const el = { ...(data.masteryProgress[elementId] ?? {}) };
  if (value > (el[key] ?? 0)) {
    el[key] = value;
    data.masteryProgress = { ...data.masteryProgress, [elementId]: el };
    save(data);
  }
}

export function isMasteryEnabled(elementId: string): boolean {
  return load().masteryEnabled[elementId] ?? false;
}

export function setMasteryEnabled(elementId: string, on: boolean): void {
  const data = load();
  data.masteryEnabled = { ...data.masteryEnabled, [elementId]: on };
  save(data);
}

/** slot ('e'/'r'/'f'/'q') -> mastery enhancement id, for one element. */
export function getMasteryBinds(elementId: string): Record<string, string> {
  return load().masteryBinds[elementId] ?? {};
}

/** Binds a mastery ability onto a slot, replacing whatever ability that slot held. */
export function setMasteryBind(elementId: string, slot: string, enhId: string): void {
  const data = load();
  const binds: Record<string, string> = { ...(data.masteryBinds[elementId] ?? {}) };
  // An enhancement lives in at most one slot — clear its previous home first.
  for (const s of Object.keys(binds)) {
    if (binds[s] === enhId) delete binds[s];
  }
  binds[slot] = enhId;
  data.masteryBinds = { ...data.masteryBinds, [elementId]: binds };
  save(data);
}

export function clearMasteryBind(elementId: string, slot: string): void {
  const data = load();
  const binds: Record<string, string> = { ...(data.masteryBinds[elementId] ?? {}) };
  delete binds[slot];
  data.masteryBinds = { ...data.masteryBinds, [elementId]: binds };
  save(data);
}

// ── Achievements + skins ─────────────────────────────────────────────

export function isAchievementUnlocked(id: string): boolean {
  return load().achievements.includes(id);
}

/** Idempotent. Returns true only on the first unlock so callers can show the popup once. */
export function unlockAchievement(id: string): boolean {
  const data = load();
  if (data.achievements.includes(id)) return false;
  data.achievements = [...data.achievements, id];
  save(data);
  return true;
}

export function getUnlockedAchievements(): string[] {
  return load().achievements;
}

// ── The Disgraced King ───────────────────────────────────────────────

export function getDivineNuclei(): number {
  return load().divineNuclei;
}

export function addDivineNuclei(amount: number): void {
  const data = load();
  data.divineNuclei += amount;
  save(data);
}

export function spendDivineNuclei(n: number): boolean {
  const data = load();
  if (data.divineNuclei < n) return false;
  data.divineNuclei -= n;
  save(data);
  return true;
}

export function isKingDefeated(): boolean {
  return load().kingDefeated;
}

/** Idempotent. Returns true only on the first kill, so the unlock banner shows once. */
export function markKingDefeated(): boolean {
  const data = load();
  if (data.kingDefeated) return false;
  data.kingDefeated = true;
  save(data);
  return true;
}

// ── The Devourer of Kings (hard mode) ────────────────────────────────

/**
 * How many forged perks the second door wants. Three times the first door's
 * price: hard mode is not a difficulty toggle, it is the end of the game.
 */
export const DEVOURER_PERK_REQUIREMENT = 30;

/** The hard fight is only offered once the ordinary one has actually been won. */
export function isDevourerUnlocked(): boolean {
  return isKingDefeated() && getTotalForgedPerkCount() >= DEVOURER_PERK_REQUIREMENT;
}

export function isDevourerDefeated(): boolean {
  return load().devourerDefeated;
}

/** '' until the fight has been finished once; then whichever ending was taken. */
export function getDevourerChoice(): '' | 'spare' | 'kill' {
  const c = load().devourerChoice;
  return c === 'spare' || c === 'kill' ? c : '';
}

/**
 * Records a finished hard-mode fight and the ending taken. Returns true only on
 * the first clear, so the results screen can pay the first kill properly.
 * The choice is only written once — the first ending is the canonical one, but
 * either element stays unlocked once earned.
 */
export function markDevourerDefeated(choice: 'spare' | 'kill'): boolean {
  const data = load();
  const first = !data.devourerDefeated;
  data.devourerDefeated = true;
  if (!data.devourerChoice) data.devourerChoice = choice;
  save(data);
  return first;
}

export function getBountyRerollOffset(): number {
  return load().bountyRerollOffset;
}

/** A paid refresh shifts the seed; completions from the old board are dead keys. */
export function bumpBountyRerollOffset(): void {
  const data = load();
  data.bountyRerollOffset += 1;
  save(data);
}

export function isBountyCompleted(key: string): boolean {
  return load().completedBountyKeys.includes(key);
}

/**
 * Records a cashed-in bounty. Keys carry their board's seed, so anything from a
 * previous board is pruned here rather than accumulating forever.
 */
export function markBountyCompleted(key: string, liveSeed: number): void {
  const data = load();
  if (data.completedBountyKeys.includes(key)) return;
  const prefix = `${liveSeed}:`;
  data.completedBountyKeys = [...data.completedBountyKeys.filter((k) => k.startsWith(prefix)), key];
  save(data);
}

/** The one skin equipped on an element, or null for that element's default look. */
export function getEquippedSkin(elementId: string): string | null {
  return load().equippedSkins[elementId] ?? null;
}

export function setEquippedSkin(elementId: string, skinId: string | null): void {
  const data = load();
  const next = { ...data.equippedSkins };
  if (skinId === null) {
    delete next[elementId];
  } else {
    next[elementId] = skinId;
  }
  data.equippedSkins = next;
  save(data);
}
