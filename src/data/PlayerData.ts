const STORAGE_KEY = 'elemental_save';

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
}

function load(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
  return { shards: 0, owned: {}, active: {}, nuclei: 0, unlockedElements: [], gauntletUnlocked: false, gauntletsCompleted: [], gauntletHardUnlocked: false, gauntletsCompletedHard: [], dummyUnlocked: false, labLevel: 0, corruptShards: 0, unlockedPerks: {}, equippedPerks: {} };
}

function save(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
