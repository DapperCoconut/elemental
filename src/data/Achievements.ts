export interface AchievementDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** Cosmetic id granted on unlock (shown in the achievements list). */
  cosmeticReward?: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'oops',
    name: 'Oops',
    emoji: '💥',
    description: "Blow yourself up with Fire's Flame Charge (Q+).",
    cosmeticReward: 'burnt',
  },
  {
    id: 'wildfire',
    name: 'Wildfire',
    emoji: '🔥',
    description: 'Keep an enemy on fire for 20 consecutive seconds!',
    cosmeticReward: 'flame-sigil',
  },
];

export function getAchievementDef(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
