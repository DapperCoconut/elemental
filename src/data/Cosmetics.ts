import * as PlayerData from './PlayerData';
import { getAchievementDef } from './Achievements';

export type CosmeticSlot = 'color' | 'sigil';

export const COSMETIC_SLOTS: CosmeticSlot[] = ['color', 'sigil'];

export interface CosmeticDef {
  id: string;
  name: string;
  description: string;
  slot: CosmeticSlot;
  elementId: string;
  /** Achievement that unlocks this cosmetic. */
  achievementId: string;
  /** color slot: flat fill color painted over the fighter sprite (setTintFill). */
  tint?: number;
  /** sigil slot: emoji floated above the fighter. */
  sigilEmoji?: string;
}

export const COSMETICS: CosmeticDef[] = [
  {
    id: 'burnt',
    name: 'Burnt',
    description: 'Your fire — and all its attacks — burn in a black hue.',
    slot: 'color',
    elementId: 'fire',
    achievementId: 'oops',
    tint: 0x111111,
  },
  {
    id: 'flame-sigil',
    name: 'Flame Sigil',
    description: 'A fire emoji hovers above your character.',
    slot: 'sigil',
    elementId: 'fire',
    achievementId: 'wildfire',
    sigilEmoji: '🔥',
  },
];

export function getCosmeticDef(id: string): CosmeticDef | undefined {
  return COSMETICS.find((c) => c.id === id);
}

export function getCosmeticsForElement(elementId: string, slot?: CosmeticSlot): CosmeticDef[] {
  return COSMETICS.filter((c) => c.elementId === elementId && (slot === undefined || c.slot === slot));
}

export function isCosmeticUnlocked(id: string): boolean {
  const def = getCosmeticDef(id);
  if (!def) return false;
  return PlayerData.isAchievementUnlocked(def.achievementId);
}

/** Achievement name shown on locked cosmetic rows ("🔒 Oops"). */
export function cosmeticUnlockHint(id: string): string {
  const def = getCosmeticDef(id);
  const ach = def ? getAchievementDef(def.achievementId) : undefined;
  return ach ? ach.name : '???';
}
