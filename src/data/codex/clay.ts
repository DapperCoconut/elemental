import { ElementCodex } from '../AbilityCodex';

/**
 * Clay — verified against `src/elements/clay.ts`, `kits/ClayKit.ts`, the clay block of
 * `data/Upgrades.ts` and the clay entry of `data/Mastery.ts`.
 */
const clay: ElementCodex = {
  identity:
    'Pottery as a martial art. Clay fights through a second body — an immortal golem the size of two '
    + 'fighters that lives on the cursor, swallows whatever is shot at it and does the hitting — while the '
    + 'potter behind it shapes the rest by hand: a shield dragged out of a drawing circle, a wall-running '
    + 'smear, and a fused form that counts hits instead of health.',

  passives: [
    {
      emoji: '🗿',
      name: 'Gooey Golem',
      basics:
        'A golem of wet clay follows your cursor at up to 285px a second, joined to you by a strand of '
        + 'slip. It cannot be hurt: every hostile shot that touches its 35px body is swallowed. Slam and '
        + 'Rupture come from wherever it is standing, so the golem is your reach and your cover at once.',
      effects: [
        { tag: 'summon', label: 'The golem', detail: 'Permanent. Walks to the cursor at 285px/s (a bot\'s walks to its target), easing in as it arrives; drawn at twice a fighter\'s size.' },
        { tag: 'shield', label: 'Swallows shots', detail: 'Any hostile projectile within 35px of the golem is destroyed. It has no health to lose.' },
        { tag: 'utility', label: 'Your reach', detail: 'Slam (Click) and Rupture (E) are cast at the golem\'s position, not yours.' },
      ],
    },
  ],

  abilities: {
    'clay-slam': {
      basics:
        'The golem slams the ground where it stands: 20 damage to everyone within 118px and a shove away '
        + 'from the impact. Fused, you slam instead. On the wall, the click is a shard barrage.',
      cast: 'Click. At the golem (or you, fused). 1.1s cooldown.',
      effects: [
        { tag: 'damage', label: 'Impact', detail: '20 damage within 118px of the golem.' },
        { tag: 'control', label: 'Shove', detail: 'Everyone hit is thrown away from the impact at 250px/s (knockback-immune fighters excepted).' },
        { tag: 'damage', label: 'On the wall', detail: 'While Slinking, Click is an 8-shard barrage toward the cursor instead — 25 each, piercing, three barrages per run.' },
      ],
      upgrade: {
        basics: 'Shard Smash throws three piercing shards out of every slam — the golem\'s, your fused one, and the Bedrock crash.',
        effects: [{ tag: 'damage', label: 'Impact shards', detail: '3 shards at 475px/s from the centre of every Slam, 25 damage each, piercing, 1.8s in the air.', requiresUpgrade: 'click' }],
      },
    },

    'clay-rupture': {
      basics:
        'The golem bursts into eight piercing shards, one every 45°, and re-forms 0.4s later. Each shard '
        + 'is 25 damage and keeps going after it hits, so a close enemy can be struck by more than one. '
        + 'Fused, the burst comes from you.',
      cast: 'E. At the golem (or you, fused). 8s cooldown.',
      effects: [
        { tag: 'damage', label: 'Eight shards', detail: '8 shards at 475px/s, 25 damage each, every 45° (offset 22.5°), alive 1.8s or until the arena edge.' },
        { tag: 'utility', label: 'Piercing', detail: 'A shard hits each enemy once and continues.' },
        { tag: 'utility', label: 'Re-forming', detail: 'The golem is gone for 0.42s after the burst and swallows nothing in that time.' },
      ],
      upgrade: {
        basics: 'Fractal leaves three more shards circling the golem (or you, fused) for 6 seconds, each spent on its first hit.',
        effects: [{ tag: 'damage', label: 'Orbiting shards', detail: '3 shards at 62px for 6s, 25 damage each, piercing, gone after their first hit.', requiresUpgrade: 'e' }],
      },
    },

    'clay-clot': {
      basics:
        'A blue circle opens round you, 148px across, and a bar of clay appears over your head. For 3 '
        + 'seconds, or until the clay runs out, hold Click and drag inside the circle: the stroke you drag '
        + 'is set as a rope of clay that orbits you. A hostile shot that touches it is destroyed, and only '
        + 'the clay within 24px of the impact crumbles — the rest stays.',
      cast: 'R, then hold and drag Click inside the circle. 3s or 280 clay. 12s cooldown.',
      effects: [
        { tag: 'resource', label: 'Clay', detail: '280 clay; every 9px of stroke costs 9. Up to 96 beads of rope.' },
        { tag: 'area', label: 'The circle', detail: 'Only the stroke inside 148px of you counts. The rope turns round you at 0.62 rad/s once set.' },
        { tag: 'shield', label: 'Stops shots', detail: 'Any hostile projectile within 13px of a bead is destroyed; the beads within 24px of the impact are lost.' },
        { tag: 'utility', label: 'One at a time', detail: 'Casting again clears the old rope.' },
      ],
      upgrade: {
        basics: 'Protector opens a second circle round the golem — clay dragged there rides with it — and every shot either rope stops throws three piercing shards from the impact.',
        effects: [
          { tag: 'shield', label: 'Golem canvas', detail: 'The stroke anchors to whichever is nearer, you or the golem; golem clay travels with the golem.', requiresUpgrade: 'r' },
          { tag: 'damage', label: 'Shards back', detail: 'Every stopped shot throws 3 shards (25, piercing) from where it landed.', requiresUpgrade: 'r' },
        ],
      },
    },

    'clay-slink': {
      basics:
        'You are thrown to the nearest wall at 900px/s and become a smear that can only travel along '
        + 'the arena\'s edges, at 650px/s, steering with the movement keys. Click fires an eight-shard '
        + 'barrage toward the cursor, three times per run. Press F again to drop off. You are not '
        + 'invulnerable on the wall. Fused, F is the dash instead.',
      cast: 'F to run the wall; F again to drop off. 15s cooldown from the launch.',
      effects: [
        { tag: 'movement', label: 'The wall', detail: 'Launch at 900px/s to the nearest edge; on it, 650px/s along the rim, carrying round corners.' },
        { tag: 'damage', label: 'Barrages', detail: 'Click: 8 shards at 475px/s toward the cursor, 25 each, piercing. Three per run.' },
        { tag: 'cost', label: 'Still a target', detail: 'The smear can be hit.' },
        { tag: 'movement', label: 'Fused dash', detail: 'While fused, F dashes you to the cursor at 920px/s, drops a slip puddle every 54px, and lands a 20-damage Slam.' },
      ],
      upgrade: {
        basics: 'Slipstream banks Space: up to three dashes stored, refilling one at a time at the ordinary rate.',
        effects: [{ tag: 'movement', label: 'Three dashes', detail: 'Space spends a stored charge instead of waiting out the cooldown; charges return one per second (three per second under a Bedrock crash\'s tripled clock).', requiresUpgrade: 'f' }],
      },
    },

    'clay-fuse': {
      basics:
        'The golem rushes to you at 650px/s and the two of you become one body for as long as it lasts: '
        + 'eight hits of any size to live, no effect can take hold, 1.42× the size and 1.35× the speed. '
        + 'Click and E come from you; F is a dash that leaves slowing slip and lands a Slam; Q splits '
        + 'you apart early and throws six shards for every layer you had left. Losing the eighth layer '
        + 'ends it with nothing.',
      cast: 'Q to call the golem in; Q again to split. 48s cooldown.',
      effects: [
        { tag: 'shield', label: 'Eight layers', detail: 'Every damaging hit — a graze or a meteor, piercing or not — removes exactly one layer and deals no damage. Your health bar is hidden and untouched.' },
        { tag: 'buff', label: 'Unshakeable', detail: 'Knockback-immune, and every debuff is purged each frame for as long as the body holds.' },
        { tag: 'buff', label: 'Bigger, faster', detail: '1.42× size, 1.35× move speed.' },
        { tag: 'control', label: 'Slip', detail: 'The dash\'s puddles last 5.5s, 44px across; enemies standing in one move at 55% speed.' },
        { tag: 'damage', label: 'The split', detail: 'Q again throws 6 piercing shards (25 each) per layer left — 48 shards from a fresh body — and restores you.' },
      ],
      upgrade: {
        basics: 'Frenzy makes every lost layer shrink the fused body by 8% and quicken it by 8%, stacking until the fuse ends.',
        effects: [{ tag: 'buff', label: 'Smaller, faster', detail: 'Size ×0.92 and speed +8% per layer lost: seven layers down is 0.79× the fused size and 2.1× base speed.', requiresUpgrade: 'q' }],
      },
      notes: [
        'Fuse counts hits, not damage — the one way to kill a fused Clay quickly is many small ones.',
        'Ruin\'s Second Skin tears the fused form off without the split.',
      ],
    },
  },

  mastery: {
    bedrock: {
      basics:
        'The golem is fired to black bedrock. Standing within 175px of it you take 20% less damage; fused, '
        + 'it is on you, so the fused body has it too. While fused, Space is a leap to the cursor that '
        + 'lands as a 150px bedrock crash, stunning everyone it hits for 2s, on a dash cooldown three '
        + 'times the usual.',
      cast: 'Passive. The crash replaces the dash while fused.',
      effects: [
        { tag: 'shield', label: 'Shelter', detail: '×0.8 incoming damage within 175px of your golem.' },
        { tag: 'damage', label: 'The crash', detail: 'A 0.62s leap to the cursor, then a 20-damage Slam that also stuns for 2s, with a 150px shockwave.' },
        { tag: 'cost', label: 'Slow to reload', detail: 'The crash takes three dash cooldowns to recharge. Slipstream still stores three.' },
      ],
    },
    'give-life': {
      basics:
        'A blue circle opens 112px ahead and for 3 seconds the cursor may draw inside it. When the clay '
        + 'runs out or the time does, the drawing stands up on four legs and hunts for 12 seconds, biting '
        + 'every 0.7s. Sharp corners make it bite harder (7 up to 22); a round closed loop makes it run '
        + 'faster (120 up to 270px/s). Shots wear away only the clay they strike.',
      cast: 'Bindable to E, R, F or Q. 3s of drawing. 6s cooldown.',
      effects: [
        { tag: 'summon', label: 'The creature', detail: '12s of life, a bite every 0.7s, chasing the nearest enemy. Needs at least 4 beads of clay to wake.' },
        { tag: 'damage', label: 'Sharp is strong', detail: 'Damage 7–22 by how much the stroke turns at its corners.' },
        { tag: 'movement', label: 'Round is fast', detail: 'Speed 120–270px/s by how even and closed the loop is.' },
        { tag: 'shield', label: 'Erodes', detail: 'A hostile shot destroys only the beads within 19px of where it lands; the creature dies below 4 beads.' },
      ],
    },
  },
};

export default clay;
