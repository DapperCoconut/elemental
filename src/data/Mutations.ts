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
    emoji: '🩸',
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
    fullDesc: '+50% size, ×1.5 HP, −34% speed. Every 10 seconds summons 6 bars of light spanning the full arena — all horizontal or all vertical, alternating. Standing in a beam deals 6 damage every 0.3s for the 1.4s it burns. At 50% HP: gains +25% more speed, beams fire every 7 seconds, and the enemy teleports randomly every 7 seconds.',
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
    fullDesc: '+50% size, ×1.5 HP, +10% damage, −34% speed. Every 14 seconds launches 4 tridents in a fan, each hitting for 7. Tridents stick to walls and return to the enemy after 3 seconds — healing 2 HP each if they arrive safely. Tridents can be destroyed by player projectiles. At 50% HP: +10% more damage, tridents fire every 12 seconds, and a fire pool erupts every 3 seconds.',
    starredDesc: '',
    rewardMult: 2.0,
    unlockedByDefault: false,
    bossOnly: true,
  },
  {
    id: 'summoner',
    name: 'Summoner',
    emoji: '💀',
    shortDesc: 'Raises husk waves that mutate as the fight drags; phase 2 husks burst into zombielings.',
    fullDesc: '+50% size, ×1.5 HP, −34% speed, takes 8% less damage. Every 10 seconds raises up to 5 husks from the arena borders — 26 HP, melee for 5 — and no more than 14 may stand at once. The mix hardens every 20 seconds: shamblers, then Air, Earth, Electric, Hunt, Life and finally Gunpowder husks, each with its elemental variant behaviour and stats. At 50% HP: takes a further 8% less damage, and every husk that falls leaves a zombieling (12 HP, fast, drops a toxic puddle when it bursts). With 12+ husks standing, the Summoner heals 15 HP (up to once every 12 seconds). Kill the Summoner and the whole horde falls with it.',
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
    fullDesc: '−25% size, +10% HP, −34% speed. A maze fills the arena and the player\'s vision is reduced to a flashlight cone aimed at the cursor. The boss navigates the maze and only attacks when close — it cannot see, fire, or walk through walls. Phase 2 at 50% HP: maze disappears, boss turns near-black, gains +70% speed and 1.2× damage, teleports to a random arena border every 7 seconds, and becomes invincible unless currently illuminated by the player\'s flashlight.',
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

  // ═══════════════════════════════════════════════════════════════════
  // The second set — implemented in src/mutations/MutationKit.ts rather
  // than inline in ArenaScene. Everything below is selectable in a normal
  // match, rolled by the gauntlet's Petri curse and the Infinity ladder,
  // and legal on a campaign fight.
  // ═══════════════════════════════════════════════════════════════════

  {
    id: 'doppel',
    name: 'Doppel',
    emoji: '🪞',
    shortDesc: 'A copy of you walks your own path, two seconds behind.',
    fullDesc: 'A spectral duplicate retraces the exact route you walked two seconds ago. It cannot be outrun and cannot be killed — it is a recording. Touching it deals 12 damage (1.2s between hits). Crossing your own tracks is what kills you.',
    starredDesc: 'Two echoes now follow you, at 1.4s and 2.8s behind, and each hit deals 15.',
    rewardMult: 1.6,
    unlockedByDefault: true,
  },
  {
    id: 'frostbite',
    name: 'Frostbite',
    emoji: '🧊',
    shortDesc: 'Standing still freezes you solid. Keep moving.',
    fullDesc: 'The arena is below freezing. A Chill meter fills whenever you are barely moving and drains while you run. At 100% you freeze solid for 1.2 seconds — rooted, unable to cast, and completely open. The enemy is immune.',
    starredDesc: 'Chill fills 50% faster and drains slower. Freezing also shatters you for 18 damage — and heals the enemy for the same amount.',
    rewardMult: 1.5,
    unlockedByDefault: true,
  },
  {
    id: 'feast',
    name: 'Feast',
    emoji: '🍗',
    shortDesc: 'Meat drops on the floor. Whoever eats it grows.',
    fullDesc: 'A drumstick drops somewhere in the arena every 8 seconds (up to 3 on the floor at once). Reach it first and you heal 20. The enemy actively detours for it — every meal it eats heals it 20 and permanently raises the damage it deals to you by 5%, for the rest of the fight.',
    starredDesc: 'Meat drops every 6 seconds, your share heals only 12, and each meal the enemy eats is worth +8% damage and +4% movespeed.',
    rewardMult: 1.5,
    unlockedByDefault: false,
  },
  {
    id: 'bramble',
    name: 'Bramble',
    emoji: '🌵',
    shortDesc: 'The enemy is covered in thorns. Damage you deal comes back.',
    fullDesc: 'A rotating shell of thorns wraps the enemy. 30% of all damage you deal to it is reflected straight back at you — doubled to 60% if you are within melee range when you land the hit.',
    starredDesc: 'Reflection rises to 50% (100% up close), and every fifth reflection fires a volley of six thorns outward for 10 damage each.',
    rewardMult: 1.6,
    unlockedByDefault: false,
  },
  {
    id: 'maelstrom',
    name: 'Maelstrom',
    emoji: '🌀',
    shortDesc: 'A wandering vortex drags you in. The enemy is untouched by it.',
    fullDesc: 'A whirlpool crosses the arena, bouncing off the walls. Anything within its reach is pulled toward the eye, and standing in the eye deals 5 damage every 0.4 seconds. The enemy walks through it as though it were not there.',
    starredDesc: 'Two vortices, moving faster, with 50% stronger pull, a wider reach and 7 damage a tick.',
    rewardMult: 1.6,
    unlockedByDefault: false,
  },
  {
    id: 'inversion',
    name: 'Inversion',
    emoji: '🔄',
    shortDesc: 'Every 11 seconds your movement keys mean the opposite.',
    fullDesc: 'On a clock, a 1.2-second warning glyph appears above you and then your movement is mirrored for 3.5 seconds — every direction goes the wrong way. The warning is always honest; the timing is the whole test.',
    starredDesc: 'It comes every 8 seconds, lasts 5 seconds, and scrambles your aim as well as your feet.',
    rewardMult: 1.5,
    unlockedByDefault: false,
  },
  {
    id: 'contagion',
    name: 'Contagion',
    emoji: '🧫',
    shortDesc: 'Getting hit poisons the ground you were standing on.',
    fullDesc: 'Every time the enemy damages you, a spore pod is planted where you stood. After 1.5 seconds it bursts into a toxic culture that ticks 3 damage every 0.5s for 5 seconds. Fight in one place and the floor closes in on you. (One pod per 1.2 seconds.)',
    starredDesc: 'Pods crawl toward you before they open, and the culture they leave is 40% wider and ticks for 4.',
    rewardMult: 1.6,
    unlockedByDefault: false,
  },
  {
    id: 'duel',
    name: 'Duel',
    emoji: '🤺',
    shortDesc: 'Both of you take triple damage. Both of you move faster.',
    fullDesc: 'No armour, no attrition, no second chances: every hit landed by either side deals 3× damage, and both fighters move 15% faster. Fights end in seconds — in one direction or the other.',
    starredDesc: 'Damage rises to 5× on both sides and both fighters move 25% faster.',
    rewardMult: 1.8,
    unlockedByDefault: false,
  },
  {
    id: 'hydra',
    name: 'Hydra',
    emoji: '🐍',
    shortDesc: 'Wound it and it grows a head that fights you separately.',
    fullDesc: 'When the enemy drops past 66% and 33% health it splits off a Head — a smaller body with a quarter of its maximum health that chases you and bites for 7 every 1.2 seconds. Heads can be killed like anything else, but the enemy never stops making them.',
    starredDesc: 'Heads split at 75%, 50% and 25%, move faster, and spit venom at you every 2.5 seconds.',
    rewardMult: 1.7,
    unlockedByDefault: false,
  },
  {
    id: 'rewind',
    name: 'Rewind',
    emoji: '⏪',
    shortDesc: 'Every 15 seconds the enemy undoes the last 5 seconds of damage.',
    fullDesc: 'A dial above the enemy counts down. When it empties, the enemy snaps back to the position and health it had five seconds ago — every point of chip damage in that window is simply erased. Burst it down between rewinds or you will never finish it.',
    starredDesc: 'The dial runs out every 10 seconds instead of 15, and the rewind also refunds every one of the enemy\'s cooldowns.',
    rewardMult: 1.8,
    unlockedByDefault: false,
  },
  {
    id: 'quicksand',
    name: 'Quicksand',
    emoji: '🏜',
    shortDesc: 'Three sinking pits slow you and drag you in. The enemy floats over them.',
    fullDesc: 'Three patches of quicksand open in the arena. Standing in one cuts your movespeed by 55% and pulls you steadily toward its centre. The pits move to new ground every 12 seconds. The enemy is unaffected.',
    starredDesc: 'Four larger pits, a 65% slow, and a much stronger drag.',
    rewardMult: 1.5,
    unlockedByDefault: false,
  },
  {
    id: 'overload',
    name: 'Overload',
    emoji: '⚡',
    shortDesc: 'Your cooldowns are 40% faster — and every ability costs 5 health.',
    fullDesc: 'A coil is clamped to you. All of your cooldowns run 40% shorter, but every keyed ability you cast takes 5 health out of you. Your click stays free. The faster you play, the faster you bleed.',
    starredDesc: 'Cooldowns run 60% shorter, and every keyed ability costs 9 health.',
    rewardMult: 1.5,
    unlockedByDefault: false,
  },
  {
    id: 'fragile',
    name: 'Fragile',
    emoji: '💔',
    shortDesc: 'Half the health, but you hit for 75% more.',
    fullDesc: 'Your maximum health is halved for the fight, and everything you deal is multiplied by 1.75. Cracks spread across you as your health falls. A glass cannon in both directions.',
    starredDesc: 'Your maximum health is cut to a quarter, and your damage is multiplied by 2.5.',
    rewardMult: 1.7,
    unlockedByDefault: false,
  },
  {
    id: 'swarm',
    name: 'Swarm',
    emoji: '🐝',
    shortDesc: 'A stinging ring of wasps orbits the enemy. Time your approach.',
    fullDesc: 'A band of wasps circles the enemy at a distance that breathes in and out. Crossing the band stings you for 6 and slows you for a moment (0.8s between stings). Nothing stops you reaching the enemy — you just have to pick your moment.',
    starredDesc: 'Two counter-rotating bands, and every 6 seconds a wasp breaks formation to hunt you down for 12 damage.',
    rewardMult: 1.6,
    unlockedByDefault: false,
  },
  {
    id: 'tempest',
    name: 'Tempest',
    emoji: '⛈',
    shortDesc: 'Lightning strikes where you are heading, faster as the fight drags.',
    fullDesc: 'A marked circle appears just ahead of where you are running and a bolt lands in it 1.1 seconds later for 18 damage. The storm starts slow and tightens to a strike every 1.6 seconds the longer the fight goes on.',
    starredDesc: 'Bolts land in pairs, come 25% more often, and each one leaves an electrified pool that ticks 4 damage for 3.5 seconds.',
    rewardMult: 1.7,
    unlockedByDefault: false,
  },
  {
    id: 'bulwark',
    name: 'Bulwark',
    emoji: '🛡',
    shortDesc: 'A shield plate faces you. Hit it from anywhere else.',
    fullDesc: 'A riveted plate hovers on the enemy\'s player-facing side, covering a 140° arc. While you are inside that arc the enemy takes only 15% damage. The plate turns to follow you at 130° per second — slower than you can run around it.',
    starredDesc: 'The plate swings at 200° per second and spits your own shots back at you while it is covering.',
    rewardMult: 1.7,
    unlockedByDefault: false,
  },
  {
    id: 'vault',
    name: 'Vault',
    emoji: '🔒',
    shortDesc: 'Most of your kit starts sealed. One slot opens every 20 seconds.',
    fullDesc: 'You begin the fight with only your click and one other ability. Every 20 seconds the vault releases another slot, in order, with its cooldown already refreshed. Everything you own eventually comes back — the question is what you can survive on until it does.',
    starredDesc: 'Only your click is free at the start, and slots open every 26 seconds instead of 20.',
    rewardMult: 1.8,
    unlockedByDefault: false,
  },
  {
    id: 'roulette',
    name: 'Roulette',
    emoji: '🎰',
    shortDesc: 'A wheel spins every 12 seconds and something happens.',
    fullDesc: 'A wheel sits at the top of the arena. Every 12 seconds it spins and lands on one of eight faces: swap places, heal the enemy, sharpen it, hasten it, hand you a shield, drop a delayed bomb on you, blind your aim, or anchor your feet. Neither of you gets a say.',
    starredDesc: 'The wheel spins every 7.5 seconds, resolves two faces per spin, and the one good outcome is taken off it.',
    rewardMult: 1.7,
    unlockedByDefault: false,
  },
  {
    id: 'warden',
    name: 'Warden',
    emoji: '⛓️',
    shortDesc: 'A rotating cage of live chain, and a hook that drags you back into it.',
    fullDesc: '+50% size, ×1.5 HP, −34% speed. Four iron posts turn a rotating square of live chain around the centre of the arena; touching a chain sears you for 7 and slows you (0.5s between). Every 9 seconds the Warden throws a barbed hook — a hit deals 14, reels you all the way in and holds you helpless for 0.8 seconds. At 50% HP the cage tightens to two thirds of its size, spins twice as fast, the hook comes every 5 seconds, and the Warden deals 20% more damage.',
    starredDesc: '',
    rewardMult: 2.0,
    unlockedByDefault: false,
    bossOnly: true,
  },
  {
    id: 'oracle',
    name: 'Oracle',
    emoji: '🔮',
    shortDesc: 'It writes what happens to you on the floor, then it happens.',
    fullDesc: '+50% size, ×1.5 HP, −34% speed. Every 4.5 seconds the Oracle inscribes a prophecy just ahead of where you are running — a rune that finishes drawing itself over 2.6 seconds and then detonates for 20 damage. Prophecies stack on the floor. At 50% HP: the runes grow, the cadence drops to 3 seconds, and every detonation leaves ink that fires a second time 2.5 seconds later.',
    starredDesc: '',
    rewardMult: 2.0,
    unlockedByDefault: false,
    bossOnly: true,
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
