const STORAGE_KEY = 'elemental_save';

interface SaveData {
  shards: number;
  owned: Record<string, string[]>;   // elementId → owned slot keys
  active: Record<string, string[]>;  // elementId → toggled-on slot keys
  nuclei: number;                    // Elemental Nucleus count
  unlockedElements: string[];        // combined element IDs unlocked via Lab
  gauntletUnlocked: boolean;
  gauntletsCompleted: string[];      // base element IDs of completed gauntlets
  dummyUnlocked: boolean;            // true once the WWSSADADBA code has been entered
  labLevel: number;                  // 0 = base, 1-3 = upgraded
}

function load(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      return {
        shards: parsed.shards ?? 0,
        owned: parsed.owned ?? {},
        active: parsed.active ?? {},
        nuclei: parsed.nuclei ?? 0,
        unlockedElements: parsed.unlockedElements ?? [],
        gauntletUnlocked: parsed.gauntletUnlocked ?? false,
        gauntletsCompleted: parsed.gauntletsCompleted ?? [],
        dummyUnlocked: parsed.dummyUnlocked ?? false,
        labLevel: parsed.labLevel ?? 0,
      };
    }
  } catch {
    // corrupted save — start fresh
  }
  return { shards: 0, owned: {}, active: {}, nuclei: 0, unlockedElements: [], gauntletUnlocked: false, gauntletsCompleted: [], dummyUnlocked: false, labLevel: 0 };
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
  if (data.labLevel >= 3) return false;
  data.labLevel += 1;
  save(data);
  return true;
}
