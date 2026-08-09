import { saveKey, isCheatMode } from './Cheats';
import { isProgressLocked } from './ProgressLock';

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
  passionQTaps: number;                // taps on Passion's Q row in the info panel — 10 unlocks the toggle
  passionQCensored: boolean;           // whether that toggle is currently on
  paperJournal: Record<string, PaperJournalRecord>; // enemy elementId -> fights won/lost as Paper
  quantumBond: string[];               // the two elementIds Quantum currently carries, [] if none
  quantumResearched: string[];         // bond keys ("a+b", sorted) whose research is finished
  quantumResearching: string;          // the one bond key being worked on now, '' if none
  quantumQuestProgress: Record<string, number>; // "<bondKey>:<questId>" -> count so far
  /**
   * Set once `migrateSubterfugeId` has run on this save. It must never run twice: after the
   * rename landed, `quantum` is a live element id again, and a second pass would hand the real
   * Quantum's unlock, upgrades, perks and mastery to Subterfuge.
   */
  migratedSubterfugeId: boolean;
  /** True once the screwdriver has been picked up off a shop page. */
  screwdriverFound: boolean;
  /**
   * Which shop page it is lying on. Minted the first time the shop is opened and
   * then fixed for the life of the save, so "somewhere in the shop" is a hunt
   * rather than a lottery you re-roll by paging back and forth. -1 = not yet drawn.
   */
  screwdriverPage: number;
  /** secret mode id → which of the four corner screws have been taken out. */
  screwsRemoved: Record<string, number[]>;
  /** Secret mode ids whose plate has come all the way off. */
  secretModesUnlocked: string[];
  /**
   * An unstable synthesis whose Divine Nucleus has been spent and whose
   * stabilisation fight has not been settled yet.
   *
   * Persisted rather than carried in a scene payload so closing the tab
   * mid-loadout does not eat the nucleus silently — the Disgraced Lab offers
   * the fight again on the next visit. It is cleared either way the fight ends:
   * a win grants the element, a loss consumes the forge.
   */
  pendingUnstable: PendingUnstableForge | null;
}

/** A forge waiting on its three-on-three. */
export interface PendingUnstableForge {
  /** Element id the synthesis produces. */
  result: string;
  /** The two bases and the binder, in socket order — this is the enemy team. */
  ingredients: string[];
}

/**
 * Paper's Journal tally for one enemy element. Only ever counts fights taken *as Paper* — see
 * `src/data/PaperJournal.ts` for what the numbers buy. Kept past three of each on purpose: the
 * info panel shows the full record even though only the first three of each unlock anything.
 */
export interface PaperJournalRecord {
  wins: number;
  losses: number;
}

/**
 * Subterfuge shipped under the element id `quantum` for its whole life, because it began as
 * a revamp of an element by that name and kept the slot. The id was handed over when the real
 * Quantum element arrived, so every save written before that still files Subterfuge's
 * upgrades, perks, mastery, skins and journal under `quantum`.
 *
 * Rewrites those keys in place. Deliberately does *not* clobber: if a `subterfuge` key somehow
 * already exists it wins, and the stale one is dropped.
 *
 * **Runs exactly once per save, guarded by `migratedSubterfugeId`.** It used to run on every
 * load, which was wrong the moment the real Quantum shipped: `quantum` is a live element id
 * again, so every load ate whatever had just been written under it. Unlocking Quantum from the
 * Amalgam, and buying its Third State upgrade, both landed and were silently rewritten to
 * Subterfuge on the very next read — the upgrade could not be bought at all, in any profile,
 * cheat or not.
 */
function migrateSubterfugeId(d: SaveData): void {
  const OLD = 'quantum';
  const NEW = 'subterfuge';

  // A save that already mentions `subterfuge` anywhere has been through this before — the
  // unguarded version ran on every load, so every save still in circulation has. Its `quantum`
  // keys are therefore the *new* element's, not stale ones, and moving them would be the very
  // theft this guard exists to stop. Only a save that has never heard the name needs the rename.
  const migrated = [
    d.owned, d.active, d.unlockedPerks, d.equippedPerks, d.masteryProgress,
    d.masteryEnabled, d.masteryBinds, d.equippedSkins, d.paperJournal,
  ].some((rec) => NEW in rec)
    || [d.unlockedElements, d.gauntletsCompleted, d.gauntletsCompletedHard].some((l) => l.includes(NEW));
  if (migrated) return;

  // elementId-keyed records
  const records: Array<Record<string, unknown>> = [
    d.owned, d.active, d.unlockedPerks, d.equippedPerks, d.masteryProgress,
    d.masteryEnabled, d.masteryBinds, d.equippedSkins, d.paperJournal,
  ];
  for (const rec of records) {
    if (!(OLD in rec)) continue;
    if (!(NEW in rec)) rec[NEW] = rec[OLD];
    delete rec[OLD];
  }

  // elementId-valued arrays
  const lists: Array<string[]> = [
    d.unlockedElements, d.gauntletsCompleted, d.gauntletsCompletedHard,
  ];
  for (const list of lists) {
    const at = list.indexOf(OLD);
    if (at < 0) continue;
    if (list.includes(NEW)) list.splice(at, 1);
    else list[at] = NEW;
  }
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
        passionQTaps: parsed.passionQTaps ?? 0,
        passionQCensored: parsed.passionQCensored ?? false,
        paperJournal: parsed.paperJournal ?? {},
        quantumBond: parsed.quantumBond ?? [],
        quantumResearched: parsed.quantumResearched ?? [],
        quantumResearching: parsed.quantumResearching ?? '',
        quantumQuestProgress: parsed.quantumQuestProgress ?? {},
        migratedSubterfugeId: parsed.migratedSubterfugeId ?? false,
        screwdriverFound: parsed.screwdriverFound ?? false,
        screwdriverPage: parsed.screwdriverPage ?? -1,
        screwsRemoved: parsed.screwsRemoved ?? {},
        secretModesUnlocked: parsed.secretModesUnlocked ?? [],
        pendingUnstable: parsed.pendingUnstable ?? null,
      };
      if (!d.migratedSubterfugeId) {
        migrateSubterfugeId(d);
        d.migratedSubterfugeId = true;
        // Stamped straight back to disk rather than waiting for the next write: until the flag
        // lands, every load would migrate again and keep eating Quantum's keys.
        save(d);
      }
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
  // A save that never existed has nothing to migrate — born already stamped.
  return { shards: 0, owned: {}, active: {}, nuclei: 0, unlockedElements: [], gauntletUnlocked: false, gauntletsCompleted: [], gauntletHardUnlocked: false, gauntletsCompletedHard: [], dummyUnlocked: false, labLevel: 0, corruptShards: 0, unlockedPerks: {}, equippedPerks: {}, unlockedMutations: [], infinityBestFightNormal: 0, infinityBestFightHard: 0, masteryProgress: {}, masteryEnabled: {}, masteryBinds: {}, achievements: [], equippedSkins: {}, divineNuclei: 0, kingDefeated: false, devourerDefeated: false, devourerChoice: '', bountyRerollOffset: 0, completedBountyKeys: [], passionQTaps: 0, passionQCensored: false, paperJournal: {}, quantumBond: [], quantumResearched: [], quantumResearching: '', quantumQuestProgress: {}, migratedSubterfugeId: true, screwdriverFound: false, screwdriverPage: -1, screwsRemoved: {}, secretModesUnlocked: [], pendingUnstable: null };
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

// ── Secret modes ─────────────────────────────────────────────────────
// The screwdriver, the four screws on every difficulty plate, and the modes
// that come off with them. See `src/data/SecretModes.ts` for the table.

export function isScrewdriverFound(): boolean {
  return load().screwdriverFound;
}

export function findScrewdriver(): void {
  const data = load();
  if (data.screwdriverFound) return;
  data.screwdriverFound = true;
  save(data);
}

/**
 * Which shop page the screwdriver is lying on, drawing it once if it has never
 * been placed. `pageCount` is the shop's current page total — a save made
 * before an element was unlocked would otherwise hide it on a page that does
 * not exist yet, so the draw happens on first sight of the real page count.
 */
export function getScrewdriverPage(pageCount: number): number {
  const data = load();
  if (data.screwdriverPage >= 0 && data.screwdriverPage < pageCount) return data.screwdriverPage;
  data.screwdriverPage = Math.floor(Math.random() * Math.max(1, pageCount));
  save(data);
  return data.screwdriverPage;
}

/** Corner indices (0-3) already unscrewed on this mode's plate. */
export function getRemovedScrews(modeId: string): number[] {
  return load().screwsRemoved[modeId] ?? [];
}

/** Idempotent. Returns the new count of removed screws. */
export function removeScrew(modeId: string, corner: number): number {
  const data = load();
  const had = data.screwsRemoved[modeId] ?? [];
  if (had.includes(corner)) return had.length;
  const next = [...had, corner];
  data.screwsRemoved = { ...data.screwsRemoved, [modeId]: next };
  save(data);
  return next.length;
}

export function isSecretModeUnlocked(modeId: string): boolean {
  return load().secretModesUnlocked.includes(modeId);
}

/** Idempotent. Returns true only the first time, so the menu can celebrate once. */
export function unlockSecretMode(modeId: string): boolean {
  const data = load();
  if (data.secretModesUnlocked.includes(modeId)) return false;
  data.secretModesUnlocked = [...data.secretModesUnlocked, modeId];
  save(data);
  return true;
}

export function getUnlockedSecretModes(): string[] {
  return load().secretModesUnlocked;
}

export function getLabLevel(): number {
  return load().labLevel;
}

/** Highest Lab level the Nucleus upgrades climb to. */
export const MAX_LAB_LEVEL = 4;

export function upgradelab(): boolean {
  const data = load();
  if (data.labLevel >= MAX_LAB_LEVEL) return false;
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
  // Practice fights teach you the element; they do not grind it. See ProgressLock.
  if (isProgressLocked()) return;
  const data = load();
  const el = { ...(data.masteryProgress[elementId] ?? {}) };
  el[key] = (el[key] ?? 0) + amount;
  data.masteryProgress = { ...data.masteryProgress, [elementId]: el };
  save(data);
}

export function recordMasteryBest(elementId: string, key: string, value: number): void {
  if (isProgressLocked()) return;
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
  // A dummy that cannot fight back is not an achievement. See ProgressLock.
  if (isProgressLocked()) return false;
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

// ── Unstable synthesis (Disgraced Lab, tier two) ─────────────────────

/** The forge waiting on its stabilisation fight, or null. */
export function getPendingUnstable(): PendingUnstableForge | null {
  return load().pendingUnstable;
}

/**
 * Records a forge whose nucleus has just been spent. Only one can be pending at
 * a time — the lab refuses a second while one is outstanding, so an overwrite
 * here would mean a bug upstream rather than a lost nucleus.
 */
export function setPendingUnstable(forge: PendingUnstableForge): void {
  const data = load();
  data.pendingUnstable = forge;
  save(data);
}

/** Settles the pending forge. `won` grants the element; either way it stops being pending. */
export function resolvePendingUnstable(won: boolean): PendingUnstableForge | null {
  const data = load();
  const forge = data.pendingUnstable;
  if (!forge) return null;
  data.pendingUnstable = null;
  if (won && !data.unlockedElements.includes(forge.result)) {
    data.unlockedElements.push(forge.result);
  }
  save(data);
  return forge;
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

/**
 * The two elements the Devourer's endings grant — kill → justice, spare → dream.
 *
 * Neither is unlockable through the Lab, so they are absent from `RECIPES` and from the
 * abstract ID lists. Anything that wants "every element in the game" (the cheat save above
 * all) has to name them explicitly. `MenuScene.DIVINE_ELEMENTS` is the matching display
 * table — keep the two in step.
 */
export const DIVINE_ELEMENT_IDS: string[] = ['justice', 'dream'];

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

// ── Passion: the Exhibition easter egg ───────────────────────────────

/** Taps on Passion's Q row before the toggle appears. */
export const PASSION_Q_TAPS_REQUIRED = 10;

/**
 * Records one tap on the Q ability row in Passion's info panel and returns the running total.
 * Stops counting once the toggle is out, so the number can't run away.
 */
export function tapPassionQ(): number {
  const data = load();
  if (data.passionQTaps >= PASSION_Q_TAPS_REQUIRED) return data.passionQTaps;
  data.passionQTaps += 1;
  save(data);
  return data.passionQTaps;
}

export function getPassionQTaps(): number {
  return load().passionQTaps;
}

export function isPassionQUnlocked(): boolean {
  return load().passionQTaps >= PASSION_Q_TAPS_REQUIRED;
}

/** The alternate Exhibition pose. Only ever true once the toggle has been found. */
export function isPassionQCensored(): boolean {
  const d = load();
  return d.passionQTaps >= PASSION_Q_TAPS_REQUIRED && d.passionQCensored;
}

export function setPassionQCensored(on: boolean): void {
  const data = load();
  data.passionQCensored = on;
  save(data);
}

// ── Paper's Journal ──────────────────────────────────────────────────────────

const EMPTY_JOURNAL: PaperJournalRecord = { wins: 0, losses: 0 };

/**
 * Paper's record against one enemy element. Returns a shared frozen-in-practice zero record
 * rather than undefined, because every caller wants the numbers and none of them wants the
 * null check — `journalBonuses` runs this every frame.
 */
export function getPaperJournal(elementId: string): PaperJournalRecord {
  return load().paperJournal[elementId] ?? EMPTY_JOURNAL;
}

/** Add one finished fight to the journal. Only ArenaScene's end-of-match path calls this. */
export function addPaperJournalResult(elementId: string, won: boolean): void {
  const data = load();
  const prev = data.paperJournal[elementId] ?? EMPTY_JOURNAL;
  data.paperJournal = {
    ...data.paperJournal,
    [elementId]: { wins: prev.wins + (won ? 1 : 0), losses: prev.losses + (won ? 0 : 1) },
  };
  save(data);
}

/** Every element Paper has fought at least once. */
export function getPaperJournalElements(): string[] {
  return Object.keys(load().paperJournal);
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

// ── Quantum bonds ────────────────────────────────────────────────────

/**
 * A bond is an unordered pair, so it is keyed by its two element ids sorted and joined —
 * `fire+water` is the same bond as `water+fire`. Every lookup below goes through this, so
 * nothing downstream has to care which order the player picked them in.
 */
export function bondKey(a: string, b: string): string {
  return [a, b].sort().join('+');
}

/** The two elements Quantum is currently carrying, or null if no bond is set. */
export function getQuantumBond(): [string, string] | null {
  const bond = load().quantumBond;
  return bond.length === 2 ? [bond[0], bond[1]] : null;
}

/**
 * Sets the carried bond. Order is preserved here on purpose even though the key is not:
 * the first element is the half the player spawns as, which is a real choice.
 */
export function setQuantumBond(a: string, b: string): void {
  const data = load();
  data.quantumBond = [a, b];
  save(data);
}

export function clearQuantumBond(): void {
  const data = load();
  data.quantumBond = [];
  save(data);
}

/**
 * Fire+Water is granted, not researched. Quantum with nothing bonded is an element with no
 * abilities, so there has to be one pair that is always available — and the two elements
 * every save owns are the only honest candidates.
 */
export const STARTER_BOND: [string, string] = ['fire', 'water'];

export function isBondResearched(a: string, b: string): boolean {
  // A cheat profile is supposed to have everything, and there are on the order of twelve
  // hundred pairs — far too many to write into a save. Answering yes is the same grant
  // without the storage, and it is what makes the bond roster usable for testing.
  if (isCheatMode()) return true;
  const key = bondKey(a, b);
  if (key === bondKey(STARTER_BOND[0], STARTER_BOND[1])) return true;
  return load().quantumResearched.includes(key);
}

export function getResearchedBonds(): string[] {
  return [...load().quantumResearched];
}

/** The bond currently being researched, or null. Only ever one at a time. */
export function getResearchingBond(): string | null {
  return load().quantumResearching || null;
}

/**
 * Picks the bond to work on. Switching away does *not* wipe the progress already banked
 * on the old one — quest counts are keyed by bond, so coming back resumes where it left off.
 */
export function setResearchingBond(key: string | null): void {
  const data = load();
  data.quantumResearching = key ?? '';
  save(data);
}

export function getBondQuestProgress(key: string, questId: string): number {
  return load().quantumQuestProgress[`${key}:${questId}`] ?? 0;
}

/** Adds to one quest's tally. Only counts toward the bond currently being researched. */
export function addBondQuestProgress(key: string, questId: string, amount: number): void {
  if (amount <= 0) return;
  const data = load();
  if (data.quantumResearching !== key) return;
  const at = `${key}:${questId}`;
  data.quantumQuestProgress[at] = (data.quantumQuestProgress[at] ?? 0) + amount;
  save(data);
}

/** Marks a bond researched and clears it as the active research slot. Idempotent. */
export function completeBondResearch(key: string): void {
  const data = load();
  if (!data.quantumResearched.includes(key)) data.quantumResearched.push(key);
  if (data.quantumResearching === key) data.quantumResearching = '';
  save(data);
}
