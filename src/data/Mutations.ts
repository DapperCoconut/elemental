export interface MutationDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  rewardMult: number;
}

export const MUTATIONS: MutationDef[] = [
  { id: 'healthy',  name: 'Healthy',  emoji: '💪', description: '+50% enemy HP',                    rewardMult: 1.5 },
  { id: 'swift',    name: 'Swift',    emoji: '💨', description: '2× enemy speed',                   rewardMult: 1.5 },
  { id: 'deadly',   name: 'Deadly',   emoji: '☠️',  description: '1.5× damage you take',            rewardMult: 2   },
  { id: 'rebirth',  name: 'Rebirth',  emoji: '🔄', description: 'Revives at 50% HP with buffs',     rewardMult: 2   },
  { id: 'mini',     name: 'Mini',     emoji: '🔬', description: '2× speed, 50% smaller, -25% HP',  rewardMult: 2.5 },
  { id: 'giant',    name: 'Giant',    emoji: '🦣',  description: '50% bigger, -30% speed, +125% HP', rewardMult: 2.5 },
  { id: 'clone',    name: 'Clone',    emoji: '👥', description: 'A second enemy joins the fight',   rewardMult: 3   },
  { id: 'mastered', name: 'Mastered', emoji: '⭐', description: 'Enemy uses all upgrades & charges', rewardMult: 3   },
];

/** Session-level active mutations — cleared each time MenuScene is created. */
export const activeMutationIds = new Set<string>();

export function getTotalRewardMult(): number {
  return MUTATIONS
    .filter((m) => activeMutationIds.has(m.id))
    .reduce((acc, m) => acc * m.rewardMult, 1);
}
