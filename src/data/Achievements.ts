export interface AchievementDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** Skin id granted on unlock (shown in the achievements list). */
  skinReward?: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'oops',
    name: 'Oops',
    emoji: '💥',
    description: "Blow yourself up with Fire's Flame Charge (Q+).",
    skinReward: 'candle',
  },
  {
    id: 'great-drought',
    name: 'The Great Drought',
    emoji: '🏜️',
    description: 'Have five fully dehydrated enemies alive at once (Water, Invasion).',
    skinReward: 'coral',
  },
  {
    id: 'sharpshooter',
    name: 'Featherweight',
    emoji: '🍃',
    description: 'Bank 100% wind dodge in a single fight (Air).',
    skinReward: 'sand',
  },
  {
    id: 'plants-vs-zombies',
    name: 'Plants vs Zombies',
    emoji: '🧟',
    description: 'Clear wave 8 of an Invasion while playing Life.',
    skinReward: 'wither',
  },
  {
    id: 'swoon',
    name: 'Swoon',
    emoji: '💘',
    description: 'Defeat an Expert Life opponent while playing Metal.',
    skinReward: 'roaring',
  },
  {
    id: 'unkillable',
    name: 'Unkillable',
    emoji: '🛡️',
    description: 'Take 400 damage in a single fight without dying, playing Shadow.',
    skinReward: 'angelic',
  },
];

export function getAchievementDef(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
