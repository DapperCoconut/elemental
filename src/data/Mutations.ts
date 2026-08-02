export interface MutationDef {
  id: string;
  name: string;
  emoji: string;
  shortDesc: string;
  fullDesc: string;
  starredDesc: string;
  rewardMult: number;
  unlockedByDefault: boolean;
  bossOnly?: boolean;
  unlockChance?: number; // defaults to 0.10 if omitted
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
    emoji: '🐛',
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
  {
    id: 'tinker',
    name: 'Tinker',
    emoji: '🛠️',
    shortDesc: 'Enemy builds turrets and healing dispensers every 5 seconds.',
    fullDesc: 'Every 5 seconds the enemy constructs one of two buildings at its location: a Turret (25 HP, fires at the player every 0.5s) or a Dispenser (25 HP, heals the enemy 3 HP/s while nearby). Buildings can be shot down by the player.',
    starredDesc: 'Turret upgrades to 50 HP and periodically fires homing rockets. Dispenser upgrades to 50 HP with 5 HP/s healing and a 50% larger aura. A third building — the Shredder (25 HP) — joins the pool: it pulls the player in with extreme force and deals 5 contact damage every 0.5s.',
    rewardMult: 1.7,
    unlockedByDefault: false,
  },
  {
    id: 'phantom',
    name: 'Phantom',
    emoji: '👻',
    shortDesc: 'Teleports behind you, turns invisible, and hits harder from behind.',
    fullDesc: 'Every 6 seconds the enemy teleports to a position behind the player (in a 30° cone opposite the direction the player is facing) and turns invisible for 3 seconds. Attacks from behind the player (the side opposite where the player is aiming) deal double damage.',
    starredDesc: 'Back-hit damage increased from 2× to 3×. Upon teleporting, the Phantom also stabs the player for 10 damage with a blade effect — without physically approaching.',
    rewardMult: 1.7,
    unlockedByDefault: false,
  },
  {
    id: 'pain',
    name: 'Pain',
    emoji: '😣',
    shortDesc: 'Grows stronger and faster at low HP; becomes invincible at 1 HP.',
    fullDesc: 'The enemy\'s damage and movespeed scale up as its HP drops (up to 2× damage and 1.5× speed at near-death). When it reaches 1 HP it becomes invincible for 3 seconds and "I WONT DIE" appears above it.',
    starredDesc: 'Invincibility lasts 5 seconds. During the invincibility window, any damage dealt to the enemy is instead dealt back to the attacker.',
    rewardMult: 1.6,
    unlockedByDefault: false,
  },
  {
    id: 'clot',
    name: 'Clot',
    emoji: '🔴',
    shortDesc: 'A blood tree shields the enemy until you destroy it.',
    fullDesc: 'A blood tree (50 HP) sprouts at the top center of the arena. The enemy cannot be damaged until the tree is destroyed. A red tether links the tree to the enemy.',
    starredDesc: 'Tree has 100 HP and fires bursts of 5 blood projectiles every 5s. Each projectile that hits you deals 10 damage and heals the tree for 10 HP. The tree stops firing once destroyed.',
    rewardMult: 1.6,
    unlockedByDefault: false,
  },
  {
    id: 'encroach',
    name: 'Encroach',
    emoji: '🕸️',
    shortDesc: 'Stacking slowness on hit; the floor is mined.',
    fullDesc: 'Enemy attacks apply a 10% slowness effect for 3s, stacking multiplicatively. Five land mines (nearly invisible) are placed around the battlefield. Stepping on one detonates a 30-damage AOE blast that can also harm the enemy.',
    starredDesc: 'The playable arena shrinks — black walls cover ~25% of the map from the borders. Mines spawn only inside the new playable area.',
    rewardMult: 1.7,
    unlockedByDefault: false,
  },
  {
    id: 'empyreon',
    name: 'Empyreon',
    emoji: '☀️',
    shortDesc: 'Summons sweeping light beams. Phase 2: teleports and attacks faster.',
    fullDesc: '+50% size, ×2 HP, +25% speed. Every 8 seconds summons 8 bars of light spanning the full arena — all horizontal or all vertical, alternating. Standing in a beam deals heavy damage. At 50% HP: gains +50% more speed, beams fire every 5 seconds, and the enemy teleports randomly every 5 seconds.',
    starredDesc: '',
    rewardMult: 2.0,
    unlockedByDefault: false,
    bossOnly: true,
  },
  {
    id: 'archfiend',
    name: 'Archfiend',
    emoji: '🔱',
    shortDesc: 'Hurls returning tridents; phase 2 rains fire pools.',
    fullDesc: '+50% size, ×2 HP, +25% damage. Every 12 seconds launches 5 tridents in a fan. Tridents stick to walls and return to the enemy after 3 seconds — healing 5 HP each if they arrive safely. Tridents can be destroyed by player projectiles. At 50% HP: +25% more damage, tridents fire every 10 seconds, and fire pools erupt every 1.5 seconds.',
    starredDesc: '',
    rewardMult: 2.0,
    unlockedByDefault: false,
    bossOnly: true,
  },
  {
    id: 'summoner',
    name: 'Summoner',
    emoji: '💀',
    shortDesc: 'Spawns zombie waves; phase 2 zombies split into toxic zombielings.',
    fullDesc: '+50% size, ×2 HP, takes 15% less damage. Every 8 seconds summons 10 zombies from the arena borders — each has 25 HP and attacks in melee. At 50% HP: takes 15% more less damage, dead zombies split into 2 fast zombielings (15 HP, drop a toxic puddle on death). With 20+ zombies active, the Summoner heals 25 HP (up to once every 12 seconds).',
    starredDesc: '',
    rewardMult: 2.0,
    unlockedByDefault: false,
    bossOnly: true,
  },
  {
    id: 'nuclear',
    name: 'Nuclear',
    emoji: '☢️',
    shortDesc: 'A 60s countdown ticks above the enemy. At 0, an unblockable blast kills you.',
    fullDesc: 'A countdown timer is displayed above the enemy starting at 60 seconds. When it reaches zero, the enemy releases a devastating blast that instantly and unavoidably kills the player. Win the fight before the clock runs out.',
    starredDesc: 'The countdown is reduced from 60 seconds to 30 seconds.',
    rewardMult: 1.8,
    unlockedByDefault: false,
  },
  {
    id: 'amber',
    name: 'Amber',
    emoji: '🦖',
    shortDesc: 'Enemy rides a dinosaur (50 HP) that absorbs all damage and harasses you.',
    fullDesc: 'The enemy spawns mounted on a dinosaur (shown by a green ring). The dinosaur has 50 HP and absorbs every hit before the enemy can be hurt. The dino charges the player and attacks up close — Claw (10 dmg, 10% slow for 3s) or Bite (15 dmg, bleed DOT for 3s). The enemy continues casting its own abilities while mounted.',
    starredDesc: 'Dino HP increased to 100, +50% speed, and the dino gains a third attack — Scalding Breath: a 2-second flamethrower cone that deals continuous fire damage and applies a burn DOT.',
    rewardMult: 1.7,
    unlockedByDefault: false,
  },
  {
    id: 'apprehension',
    name: 'Apprehension',
    emoji: '👁️',
    shortDesc: 'Boss lurks in a dark maze; phase 2 hunts you invisibly, damageable only by flashlight.',
    fullDesc: '−25% size, +10% HP. A maze fills the arena and the player\'s vision is reduced to a narrow flashlight cone aimed at the cursor. The boss navigates the maze and only attacks when close — it cannot see, fire, or walk through walls. Phase 2 at 50% HP: maze disappears, boss turns near-black, gains 3× speed and 1.5× damage, teleports to a random arena border every 5 seconds, and becomes invincible unless currently illuminated by the player\'s flashlight.',
    starredDesc: '',
    rewardMult: 2.0,
    unlockedByDefault: false,
    bossOnly: true,
  },
  {
    id: 'wither',
    name: 'Wither',
    emoji: '🥀',
    shortDesc: 'Enemy hits apply Wither — a stacking, infinite damage-over-time.',
    fullDesc: 'Every enemy hit applies +1 stack of Wither. Wither lasts forever and ticks 1 damage per stack every 2 seconds. The longer the fight drags on, the deadlier each tick becomes.',
    starredDesc: 'Wither ticks every 1 second instead of 2, and all player healing is disabled for the fight.',
    rewardMult: 1.6,
    unlockedByDefault: false,
  },
  {
    id: 'honor',
    name: 'Honor',
    emoji: '⚔️',
    shortDesc: 'First to 3 tallies wins. Health bars are hidden.',
    fullDesc: 'Health bars are replaced with tally marks. Every hit landed grants the attacker 1 tally (2-second cooldown between tallies per side). First side to 3 tallies wins the match.',
    starredDesc: 'Enemy gains +50% movespeed and a 50% chance to parry player projectiles. Parried projectiles auto-aim back at the player at double speed and always grant the enemy a tally on hit (bypassing the cooldown).',
    rewardMult: 1.7,
    unlockedByDefault: false,
  },
  {
    id: 'golf',
    name: 'Golf',
    emoji: '⛳',
    shortDesc: 'Enemy is frozen in place. Hit the golf ball into them — the only way to score.',
    fullDesc: 'The enemy can no longer move (but still attacks). A giant bouncy golf ball spawns in the arena. Damage you deal to the ball launches it farther; the faster it is moving when it strikes the enemy, the more damage it deals. Nothing else can hurt the enemy. (0.5s cooldown between ball hits.)',
    starredDesc: 'The golf ball is now black and 25% smaller — much harder to hit cleanly.',
    rewardMult: 2.5,
    unlockedByDefault: false,
    unlockChance: 0.01,
  },
];

export function getMutationDef(id: string): MutationDef | undefined {
  return MUTATIONS.find((m) => m.id === id);
}

export function getBossMutationIds(): string[] {
  return MUTATIONS.filter((m) => m.bossOnly).map((m) => m.id);
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
