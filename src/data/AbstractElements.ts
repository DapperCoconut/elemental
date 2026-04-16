/** IDs of abstract elements (unlocked by completing gauntlets). */
export const ABSTRACT_ELEMENT_IDS: string[] = [
  'electricity', 'slime', 'fate', 'sound', 'light',
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
