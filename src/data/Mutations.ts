export interface MutationDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  rewardMult: number;
}

export const MUTATIONS: MutationDef[] = [
  { id: 'healthy',  name: 'Healthy',  emoji: '💪', description: '+50% enemy HP',                         rewardMult: 1.25 },
  { id: 'swift',    name: 'Swift',    emoji: '💨', description: '2× enemy speed',                        rewardMult: 1.25 },
  { id: 'deadly',   name: 'Deadly',   emoji: '☠️',  description: 'Enemy deals 1.5× damage',              rewardMult: 1.5  },
  { id: 'vigorous', name: 'Vigorous', emoji: '💚', description: 'Enemy heals 5 HP/sec',                  rewardMult: 1.5  },
  { id: 'mini',     name: 'Mini',     emoji: '🔬', description: '2× speed, 50% smaller, -25% HP',        rewardMult: 1.75 },
  { id: 'giant',    name: 'Giant',    emoji: '🦣',  description: '50% bigger, 30% slower, +50% HP',      rewardMult: 1.75 },
  { id: 'shielded', name: 'Shielded', emoji: '🛡️', description: 'Invincibility totem every 10s',         rewardMult: 2    },
  { id: 'reborn',   name: 'Reborn!',  emoji: '🔄', description: 'Revives at 25% HP with buffs',          rewardMult: 2    },
  { id: 'stealthy', name: 'Stealthy', emoji: '👁️', description: 'Enemy invisible, projectiles visible',  rewardMult: 2.25 },
  { id: 'raid',     name: 'Raid',     emoji: '⚔️',  description: '4 enemies, 80% less HP, 50% smaller',  rewardMult: 2.25 },
  { id: 'clone',    name: 'Clone',    emoji: '👥', description: 'A second enemy — both must die',        rewardMult: 2.5  },
  { id: 'boss',     name: 'Boss',     emoji: '👹', description: 'Stationary top-screen boss, 500 HP',   rewardMult: 2.5  },
];

/** Session-level active mutations — cleared each time MenuScene is created. */
export const activeMutationIds = new Set<string>();

export function getTotalRewardMult(): number {
  return MUTATIONS
    .filter((m) => activeMutationIds.has(m.id))
    .reduce((acc, m) => acc * m.rewardMult, 1);
}
