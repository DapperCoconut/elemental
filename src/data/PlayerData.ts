const STORAGE_KEY = 'elemental_save';

interface SaveData {
  shards: number;
  owned: Record<string, string[]>;   // elementId → owned slot keys
  active: Record<string, string[]>;  // elementId → toggled-on slot keys
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
      };
    }
  } catch {
    // corrupted save — start fresh
  }
  return { shards: 0, owned: {}, active: {} };
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
