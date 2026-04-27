/** IDs of abstract elements (unlocked by completing gauntlets). */
export const ABSTRACT_ELEMENT_IDS: string[] = [
  'electricity', 'slime', 'fate', 'sound', 'light',
];

/** IDs of abstract-mix elements (fusions of two abstract elements, cost corrupt shards). */
export const ABSTRACT_MIX_ELEMENT_IDS: string[] = [
  'magnet', 'metal', 'plasma', 'rubber', 'silence',
];

/** Maps abstract element ID → gauntlet (base element) ID needed to unlock it. */
export const ABSTRACT_ELEMENT_UNLOCK_MAP: Record<string, string> = {
  electricity: 'fire',
  slime: 'water',
  fate: 'life',
  sound: 'air',
  light: 'earth',
};

export function isAbstractElement(id: string): boolean {
  return ABSTRACT_ELEMENT_IDS.includes(id);
}
