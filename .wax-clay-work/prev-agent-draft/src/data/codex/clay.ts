import { ElementCodex } from '../AbilityCodex';

/** Clay's complete base, upgrade, and mastery documentation. */
const clay: ElementCodex = {
  identity:
    'Clay fights as a pair. Its oversized gooey golem follows the cursor, catches hostile shots, '
    + 'and delivers heavy attacks from a second position; Clay can also draw a destructible orbiting '
    + 'shield, become a fast-moving smear on the arena wall, or fuse with the golem into an eight-hit juggernaut.',

  passives: [
    {
      emoji: '🪹',
      name: 'Gooey Golem',
      basics:
        'A large clay golem follows your cursor and stays tethered to you by a thin brown strand. '
        + 'It moves faster than a normal fighter and has infinite health, so hostile projectiles that '
        + 'strike its body are swallowed without hurting it.',
      effects: [
        { tag: 'summon', label: 'The golem', detail: 'A permanent 35px-radius companion that follows the cursor at up to 285 px/s and is visibly larger than a normal fighter.' },
        { tag: 'shield', label: 'Damage sponge', detail: 'The golem has infinite health. Hostile shared projectiles that touch its 35px body are destroyed instead of passing through.' },
        { tag: 'utility', label: 'The tether', detail: 'A thin brown strand always joins the Clay fighter to the golem, making both positions readable.' },
      ],
    },
  ],

  abilities: {
    'clay-slam': {
      basics:
        'The golem slams its current position, creating a large shockwave that deals 20 damage and '
        + 'knocks enemies away. While fused, the same slam is centered on you.',
      cast: 'Click. The normal cast uses the golem\'s position; Fuse uses your position. 1.1s cooldown.',
      effects: [
        { tag: 'damage', label: 'Impact', detail: '20 damage to every enemy within 118px of the impact point.' },
        { tag: 'control', label: 'Knockback', detail: 'Enemies caught inside the 118px shockwave are pushed away from its center.' },
        { tag: 'area', label: 'The slam', detail: 'A circular 118px-radius area centered on the golem, or on the fused fighter.' },
      ],
      upgrade: {
        basics: 'Shard Smash adds three piercing shards to every Slam impact, including fused and Bedrock landing slams.',
        effects: [{ tag: 'damage', label: 'Impact shards', detail: '3 evenly spaced 25-damage piercing shards launch from the center of every Slam.', requiresUpgrade: 'click' }],
      },
    },

    'clay-rupture': {
      basics:
        'The golem bursts into eight equally spaced piercing shards. Each shard deals 25 damage, '
        + 'continues through enemies, and is independent, so a large or nearby enemy can be struck by '
        + 'several shards from one rupture. While fused, the burst comes from you.',
      cast: 'E. Instant, centered on the golem or on the fused fighter. 8s cooldown.',
      effects: [
        { tag: 'damage', label: 'Eight shards', detail: '8 shards deal 25 damage each. A shard can hit each enemy once, and one enemy may be hit by multiple different shards.' },
        { tag: 'area', label: 'Full circle', detail: 'The shards launch every 45° in a complete 360° ring at 475 px/s and last 1.8 seconds.' },
        { tag: 'utility', label: 'Piercing', detail: 'A shard does not disappear when it hits a fighter; it continues and can strike other enemies.' },
      ],
      upgrade: {
        basics: 'Fractal leaves three extra shards circling the golem or fused body for up to 6 seconds.',
        effects: [{ tag: 'damage', label: 'Orbiting fractals', detail: '3 shards orbit for 6s. Each deals 25 damage and disappears after its first enemy hit.', requiresUpgrade: 'e' }],
      },
    },

    'clay-clot': {
      basics:
        'A blue drawing circle and a small brown clay bar appear around you. Hold and drag Click inside '
        + 'the circle to draw for up to 3 seconds; your exact stroke becomes an orbiting shield. Enemy '
        + 'projectiles are erased where they touch it, while only the impacted part of the drawing crumbles away.',
      cast: 'R, then hold and drag Click inside the 148px blue circle. Drawing ends after 3 seconds or when the 280-point clay bar empties. 12s cooldown.',
      effects: [
        { tag: 'resource', label: 'Clay bar', detail: '280 points of drawing material are shown in a brown bar overhead and are consumed by the length of the stroke.' },
        { tag: 'area', label: 'Drawing space', detail: 'Your pointer is sampled only within a 148px-radius blue circle for at most 3 seconds, preserving the path you draw.' },
        { tag: 'shield', label: 'Dynamic shield', detail: 'The finished stroke orbits you. A hostile projectile touching it is destroyed and erodes only nearby pieces of clay, leaving the rest intact.' },
      ],
      upgrade: {
        basics: 'Protector opens a second drawing circle around the golem. Either shield throws three shards whenever a projectile damages it.',
        effects: [
          { tag: 'shield', label: 'Golem canvas', detail: 'Draw shield material around either yourself or the golem; golem-anchored pieces travel with it.', requiresUpgrade: 'r' },
          { tag: 'damage', label: 'Reactive shards', detail: 'Every projectile blocked by either shield launches 3 piercing shards from the impact.', requiresUpgrade: 'r' },
        ],
      },
    },

    'clay-slink': {
      basics:
        'Launch to the nearest arena wall and become a fast clay smear that can travel only around the '
        + 'arena edges. Click up to three times to fire an eight-shard barrage toward the cursor. Recast '
        + 'F to leave the wall; wall form does not make you invulnerable.',
      cast: 'F to enter or leave wall form. Click aims each barrage. 15s cooldown begins on entry.',
      effects: [
        { tag: 'movement', label: 'Wall travel', detail: 'Launches to the nearest wall and moves along the arena boundary at up to 650 px/s; movement is constrained to the edges and carries around corners.' },
        { tag: 'damage', label: 'Shard barrage', detail: 'Each Click fires 8 piercing shards toward the cursor, each dealing 25 damage. Wall form holds 3 barrages.' },
        { tag: 'cost', label: 'Still vulnerable', detail: 'Slink changes movement but grants no invulnerability; enemies can damage you while you are on the wall.' },
        { tag: 'utility', label: 'Recast exit', detail: 'Press F again to peel away from the wall immediately.' },
      ],
      upgrade: {
        basics: 'Slipstream upgrades the universal Space dodge, banking up to three uses that recharge sequentially.',
        effects: [{ tag: 'movement', label: 'Three stored dashes', detail: 'Three indicators above the fighter show available Space dashes. Charges refill one at a time at the normal dash recharge rate.', requiresUpgrade: 'f' }],
      },
    },

    'clay-fuse': {
      basics:
        'The golem rushes back and fuses with you. The fused creature ignores the normal health bar and '
        + 'instead survives eight separate hits of any size, rejects status effects, and moves faster. '
        + 'Click and E become self-centered Slam and Rupture, R still draws Clay Clot, F dashes to the '
        + 'cursor with a landing slam and slowing clay trail, and Q disconnects early in a storm of shards.',
      cast: 'Q begins the merge. Press Q again while fused to disconnect and spend every remaining clay layer as shards. 48s cooldown.',
      effects: [
        { tag: 'shield', label: 'Eight clay layers', detail: 'The fused body has 8 hit layers instead of a normal health bar. Each damaging instance removes exactly 1 layer regardless of its damage; losing the eighth layer ends Fuse.' },
        { tag: 'buff', label: 'Golem body', detail: 'While fused you are 1.42× normal size, move at 1.35× speed, and cannot gain status effects. Existing negative effects are continually purged.' },
        { tag: 'damage', label: 'Fused Slam and Rupture', detail: 'Click makes the normal 20-damage, 118px Slam at your body. E launches the normal 8 piercing 25-damage shards from your body.' },
        { tag: 'movement', label: 'Clay dash', detail: 'F dashes toward the cursor, drops slowing clay puddles along the route, and creates a 20-damage Slam on arrival.' },
        { tag: 'control', label: 'Clay trail', detail: 'Hostile fighters standing in a puddle move at 55% speed. Each puddle lasts 5.5 seconds.' },
        { tag: 'damage', label: 'Voluntary split', detail: 'Recasting Q launches 6 piercing shards for every clay layer still intact, then restores your normal body and health bar.' },
      ],
      upgrade: {
        basics: 'Frenzy makes each broken Fuse layer shrink the hybrid and raise its movement speed. Every stack clears on separation.',
        effects: [{ tag: 'buff', label: 'Escalating frenzy', detail: 'Each lost layer makes the fused body 8% smaller and adds 8% movement speed, stacking across all seven survivable hits.', requiresUpgrade: 'q' }],
      },
      notes: [
        'Fuse counts hits, not damage: a one-damage graze and a giant piercing strike each remove one layer.',
        'Being fused prevents new effects; it does not restore ordinary health, and the normal health bar returns unchanged when the merge ends.',
      ],
    },
  },

  mastery: {
    bedrock: {
      basics: 'The golem hardens into black bedrock. Staying within 175px grants 20% damage resistance; while fused, Space becomes an aerial crash at the cursor.',
      cast: 'Passive. The crash replaces the normal Space dash while fused.',
      effects: [
        { tag: 'shield', label: 'Bedrock shelter', detail: 'Take 20% less damage while within 175px of the golem. Fuse keeps the golem on you, so the resistance remains active.' },
        { tag: 'movement', label: 'Aerial crash', detail: 'A fused Space dash arcs to the cursor and lands with a Slam that stuns enemies for 2s.' },
        { tag: 'cost', label: 'Heavy landing', detail: 'The aerial dash recharges 3× slower. Slipstream can still store up to three of these charges.' },
      ],
    },
    'give-life': {
      basics: 'Draw a small clay body in the blue circle ahead of you. It wakes, keeps your exact shape, hunts enemies, and locally erodes under projectile fire for 12 seconds.',
      cast: 'Bindable to E, R, F or Q. Draw for up to 3s. 6s cooldown.',
      effects: [
        { tag: 'summon', label: 'Living drawing', detail: 'The exact sampled stroke becomes a moving melee creature for 12s.' },
        { tag: 'damage', label: 'Sharp means strong', detail: 'Sharper direction changes raise its melee damage from roughly 7 up to 22.' },
        { tag: 'movement', label: 'Round means fast', detail: 'Closed, evenly rounded shapes move fastest, up to about 270 px/s.' },
        { tag: 'shield', label: 'Local erosion', detail: 'A projectile removes only nodes near its impact. The creature dies when too little of the drawing remains.' },
      ],
    },
  },
};

export default clay;
