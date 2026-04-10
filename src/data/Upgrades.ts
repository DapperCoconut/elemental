export interface UpgradeDef {
  slot: string;         // "click" | "e" | "r" | "f" | "q"
  displayKey: string;   // "Click" | "E" | "R" | "F" | "Q"
  name: string;
  description: string;
  price: number;
}

export interface ElementUpgrades {
  elementId: string;
  upgrades: UpgradeDef[];
}

// Shard rewards indexed by difficulty level - 1 (Easy→Nightmare)
export const SHARD_REWARDS = [5, 10, 20, 35, 50] as const;

export const ALL_UPGRADES: ElementUpgrades[] = [
  {
    elementId: 'fire',
    upgrades: [
      {
        slot: 'click',
        displayKey: 'Click',
        name: 'Flameshredder',
        description: 'Flamethrower hits inflict burning DOT (1 dmg/0.5s × 3s)',
        price: 10,
      },
      {
        slot: 'e',
        displayKey: 'E',
        name: 'Propulsion',
        description: 'Flame Dash leaves a trail of small explosions',
        price: 20,
      },
      {
        slot: 'r',
        displayKey: 'R',
        name: 'Pressure Charge',
        description: 'Hold R to charge: 3s = 1.5× dmg + tremors, 6s = 2× dmg + enhanced tremors',
        price: 35,
      },
      {
        slot: 'f',
        displayKey: 'F',
        name: 'Flame Affinity',
        description: 'Hold F 1s for enhanced Flame Body: 2× self-dmg, 2× output',
        price: 50,
      },
      {
        slot: 'q',
        displayKey: 'Q',
        name: 'Armageddon',
        description: 'Move during nuke (20% speed), +20% range; +50% dmg if enemy is burning',
        price: 75,
      },
    ],
  },
  {
    elementId: 'water',
    upgrades: [
      {
        slot: 'click',
        displayKey: 'Click',
        name: 'Knockback',
        description: 'Water Cut hits push enemies away',
        price: 10,
      },
      {
        slot: 'e',
        displayKey: 'E',
        name: 'Tidal Pool',
        description: 'Final puddle is 1.5× larger and lasts 5s',
        price: 20,
      },
      {
        slot: 'r',
        displayKey: 'R',
        name: 'Permanent Geysers',
        description: 'Geysers last forever; max 2 placed',
        price: 35,
      },
      {
        slot: 'f',
        displayKey: 'F',
        name: 'Reflect Shield',
        description: 'Shield reflects blocked damage back to attacker',
        price: 50,
      },
      {
        slot: 'q',
        displayKey: 'Q',
        name: 'Monsoon',
        description: '5× drops, 3× duration; hold Q for ongoing rain',
        price: 75,
      },
    ],
  },
  { elementId: 'life',  upgrades: [] },
  { elementId: 'air',   upgrades: [] },
  { elementId: 'earth', upgrades: [] },
];

export function getElementUpgrades(elementId: string): UpgradeDef[] {
  return ALL_UPGRADES.find((e) => e.elementId === elementId)?.upgrades ?? [];
}

export function getUpgradeDef(elementId: string, slot: string): UpgradeDef | undefined {
  return getElementUpgrades(elementId).find((u) => u.slot === slot);
}

export function getUpgradePrice(elementId: string, slot: string): number {
  return getUpgradeDef(elementId, slot)?.price ?? 0;
}
