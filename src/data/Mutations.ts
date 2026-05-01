export interface MutationDef {
  id: string;
  name: string;
  emoji: string;
  shortDesc: string;
  fullDesc: string;
  starredDesc: string;
  rewardMult: number;
  unlockedByDefault: boolean;
}

export const STARRED_REWARD_MULT = 1.5;

export const MUTATIONS: MutationDef[] = [
  {
    id: 'molten',
    name: 'Molten',
    emoji: '🌋',
    shortDesc: 'Enemy burns the floor behind it.',
    fullDesc: 'Enemy gains an orange tint, deals 1.5× damage, and drops a lava puddle behind itself every 1.5s as it moves. Puddles last 3s and tick fire damage to the player while standing on them.',
    starredDesc: 'Deeper orange tint, 2× damage, lava puddles 50% larger and 50% longer-lasting, and enemy attacks have a 20% chance to apply a Fire DOT to the player.',
    rewardMult: 1.5,
    unlockedByDefault: true,
  },
  {
    id: 'blustery',
    name: 'Blustery',
    emoji: '💨',
    shortDesc: 'Enemy is fast, dodges attacks, and teleports away.',
    fullDesc: 'Enemy gains a white tint, +25% movespeed, a 20% chance to dodge attacks, and teleports away from the player after staying within close range for 2 seconds.',
    starredDesc: '+50% movespeed, 35% dodge chance, teleport unleashes a wind AOE that deals heavy damage and knocks the player back. Each successful dodge grants a permanent +5% speed bonus (resets at round end).',
    rewardMult: 1.4,
    unlockedByDefault: true,
  },
  {
    id: 'titanic',
    name: 'Titanic',
    emoji: '🗿',
    shortDesc: 'Enemy is huge, tanky, and slower — with a projectile-blocking shield.',
    fullDesc: 'Enemy is 50% larger with double HP and half movespeed. A shield orb orbits it, destroying any player projectile that physically intersects it.',
    starredDesc: '75% larger, 3× HP, 75% slower. Two equidistant shields orbit the enemy, covering more angles.',
    rewardMult: 1.6,
    unlockedByDefault: true,
  },
  {
    id: 'parasitic',
    name: 'Parasitic',
    emoji: '🦠',
    shortDesc: 'Enemy heals from its regen and from hurting you.',
    fullDesc: 'Enemy gains a purple tint, regenerates 2 HP/s, and heals for 10% of all damage dealt to the player.',
    starredDesc: '5 HP/s regen, 25% lifesteal. Additionally, all player healing is completely disabled for the duration of the fight.',
    rewardMult: 1.4,
    unlockedByDefault: true,
  },
  {
    id: 'chaos',
    name: 'Chaos',
    emoji: '💢',
    shortDesc: 'Tiny, aggressive enemy that explodes every 3 seconds.',
    fullDesc: 'Enemy is 50% smaller and always rushes at the player. The closer the player gets, the less damage they deal to the enemy. Every 3 seconds the enemy explodes, dealing 20 damage to itself and 20 to the player if in range.',
    starredDesc: '70% smaller and 30% faster. Explosions now deal only 10 to the enemy but 30 to the player, with a larger blast radius.',
    rewardMult: 1.7,
    unlockedByDefault: false,
  },
  {
    id: 'order',
    name: 'Order',
    emoji: '🎯',
    shortDesc: 'Keeps distance, shoots accurately, hits harder from far away.',
    fullDesc: 'Enemy keeps a safe distance, has greatly improved accuracy, and its attacks deal up to 1.5× more damage the farther it is from the player.',
    starredDesc: 'Near-perfect aim, triple projectile speed, and damage scales up to 2× with distance.',
    rewardMult: 1.7,
    unlockedByDefault: false,
  },
  {
    id: 'abyss',
    name: 'Abyss',
    emoji: '🌑',
    shortDesc: 'Goes invincible, but leaves a trail that pierces its immunity.',
    fullDesc: 'Enemy turns dark and becomes invincible every 10 seconds for 7 seconds. While invincible it leaves an abyss trail behind it. The player must stand on the trail to damage the enemy during this window.',
    starredDesc: 'Enemy is always invincible and completely invisible. The only way to damage it is to stand on the abyss trail it constantly leaves behind.',
    rewardMult: 1.9,
    unlockedByDefault: false,
  },
];

export function getMutationDef(id: string): MutationDef | undefined {
  return MUTATIONS.find((m) => m.id === id);
}

/** Per-match selection sets — cleared each time MenuScene is created. */
export const activeMutationIds = new Set<string>();
export const starredMutationIds = new Set<string>();

export function clearMutationSelection(): void {
  activeMutationIds.clear();
  starredMutationIds.clear();
}

export function getTotalRewardMult(): number {
  let mult = 1;
  for (const id of activeMutationIds) {
    const def = getMutationDef(id);
    if (!def) continue;
    let m = def.rewardMult;
    if (starredMutationIds.has(id)) m *= STARRED_REWARD_MULT;
    mult *= m;
  }
  return mult;
}
