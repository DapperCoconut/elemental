export interface ItemDef {
  id: string;
  name: string;
  emoji: string;
  elementId: string;
  priceSparks: number;
  shortDesc: string;
  fullDesc: string;
}

export const ITEMS: ItemDef[] = [
  {
    id: 'grilled-cheese',
    name: 'Grilled Cheese',
    emoji: '🧀',
    elementId: 'fire',
    priceSparks: 3,
    shortDesc: '+20 Max HP next match',
    fullDesc: 'Adds +20 to your maximum HP for the next match.',
  },
  {
    id: 'bubble',
    name: 'Bubble',
    emoji: '🫧',
    elementId: 'water',
    priceSparks: 3,
    shortDesc: 'Blocks next 3 hits',
    fullDesc: 'Grants a bubble shield that fully absorbs the next 3 hits taken.',
  },
  {
    id: 'hot-sauce',
    name: 'Hot Sauce',
    emoji: '🌶️',
    elementId: 'fire',
    priceSparks: 5,
    shortDesc: '+50% speed, 1 dmg/sec',
    fullDesc: 'Boosts movement speed by 50% for the entire match, but deals 1 damage to you every second.',
  },
];

export function getItemsForElement(elementId: string): ItemDef[] {
  return ITEMS.filter((i) => i.elementId === elementId);
}

export function getItem(id: string): ItemDef | undefined {
  return ITEMS.find((i) => i.id === id);
}

/** Per-match consumed set — cleared at ArenaScene.create() after buffs are applied. */
export const consumedItemIds = new Set<string>();

export function clearConsumedItems(): void {
  consumedItemIds.clear();
}
