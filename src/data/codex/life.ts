import { ElementCodex } from '../AbilityCodex';

/**
 * Life — verified against `src/elements/life.ts`, `kits/LifeKit.ts` (the `SEEDS` table and the
 * plant behaviours) and the life block of `data/Upgrades.ts`.
 */
const life: ElementCodex = {
  identity:
    'The only base element that fights by proxy. Four of its five keys do nothing to the enemy at all — '
    + 'they plant, feed, protect and finally hide behind a garden that does the actual work. Life is '
    + 'played as a board state, and a Life player with no plants up is a Life player with no kit.',

  passives: [
    {
      emoji: '🌱',
      name: 'The Garden',
      basics:
        'Five seeds, and five plants at a time per owner — a sixth is refused rather than replacing the '
        + 'oldest. Sunflower (25 HP) fires a 10-damage bullet every second. Rose (75 HP) is the toughest, '
        + 'with thorns that reflect damage to attackers. Nurse Lily (25 HP) walks with you and heals 3 HP '
        + 'every 2s. Nightcap (25 HP) lays poison puddles. Pitcher (50 HP) traps an enemy that comes near '
        + 'for 3s. Cotton (25 HP) follows you and grants +50% speed for 1s.',
      effects: [
        { tag: 'summon', label: 'Plant cap', detail: 'Five plants at once, per owner. Planting a sixth is refused rather than replacing the oldest.' },
        { tag: 'summon', label: 'Sunflower', detail: '25 HP. Fires a 10 damage bullet every 1s. The damage plant.' },
        { tag: 'summon', label: 'Rose', detail: '75 HP — the toughest seed. Thorns, and reflects damage back at attackers.' },
        { tag: 'summon', label: 'Nurse Lily', detail: '25 HP. Heals you 3 HP every 2s, and walks with you.' },
        { tag: 'summon', label: 'Nightcap', detail: '25 HP. Lays down poison puddles.' },
        { tag: 'summon', label: 'Pitcher', detail: '50 HP. Traps an enemy that comes near for 3s.' },
        { tag: 'summon', label: 'Cotton', detail: '25 HP. Grants +50% speed for 1s, and follows you around.' },
      ],
      notes: [
        'Cotton and Nurse Lily are the two followers — they walk at 62 px/s, engage at 28px and trail you at 40px.',
      ],
    },
  ],

  abilities: {
    'petal-shotgun': {
      basics:
        'Three petals in a fixed −15°/0°/+15° spread, 8 damage each at 480 px/s — 24 if all three land, '
        + 'which means standing close. 0.5s cooldown.',
      cast: 'Click, aimed at the cursor. Instant. The spread is fixed at −15°, 0° and +15°.',
      effects: [
        { tag: 'damage', label: 'Three petals', detail: '3 projectiles at 8 damage each — 24 if all three land, which needs the target close.' },
        { tag: 'utility', label: 'Flight', detail: '480 px/s, spawned 32px out along each of the three angles.' },
        { tag: 'utility', label: 'Rate of fire', detail: '0.5s cooldown.' },
      ],
      upgrade: {
        basics:
          'Five petals instead of three, at 5 damage each: 25 at point blank against the old 24, and far '
          + 'more forgiving of aim.',
        effects: [
          { tag: 'damage', label: 'Five petals', detail: '5 petals per shot at 5 damage each — 25 at point blank, against 24 from three, but far more forgiving of aim.', requiresUpgrade: 'click' },
        ],
      },
    },

    plant: {
      basics:
        'Places the seed you have selected at the cursor with 25–75 HP depending on which one, and it '
        + 'can be destroyed. Five plants maximum per owner — the enemy\'s garden does not count against '
        + 'yours — on a 5s cooldown, so filling a garden from empty takes 20 seconds.',
      cast: 'E, placed at the cursor. Instant. Uses the currently selected seed from the bar.',
      effects: [
        { tag: 'summon', label: 'Grow a plant', detail: 'Places the selected seed at the cursor. It has the HP from the seed table (25–75) and can be destroyed.' },
        { tag: 'resource', label: 'Cap', detail: 'Maximum 5 plants. The cap is per owner, so the enemy\'s garden does not count against yours.' },
        { tag: 'utility', label: 'Availability', detail: '5s cooldown — filling a garden from empty takes 20 seconds.' },
      ],
      upgrade: {
        basics:
          'Every plant gains 50% more HP, and plants become draggable with the mouse: they drift toward '
          + 'where you pull them rather than teleporting.',
        effects: [
          { tag: 'buff', label: 'Hardier', detail: 'All plants gain 50% more HP.', requiresUpgrade: 'e' },
          { tag: 'movement', label: 'Draggable', detail: 'Plants can be dragged with the mouse; they drift toward where you pull them rather than teleporting.', requiresUpgrade: 'e' },
        ],
      },
    },

    grow: {
      basics:
        'Heals every plant in the targeted area for 50% of its maximum HP and gives them a power boost '
        + 'for 5 seconds. 8s cooldown.',
      cast: 'R, centred on an area. Instant, affects every plant inside it.',
      effects: [
        { tag: 'heal', label: 'Repair', detail: 'Plants hit are healed 50% of their maximum HP.' },
        { tag: 'buff', label: 'Power boost', detail: 'Those plants gain a power boost for 5s.' },
        { tag: 'utility', label: 'Availability', detail: '8s cooldown.' },
      ],
      upgrade: {
        basics:
          'Also leaves a small permanent buff on the plants it touches, stacking up to three times and '
          + 'shown on them as blue stars.',
        effects: [
          { tag: 'buff', label: 'Permanent stacks', detail: 'Also grants a small permanent buff to affected plants, stacking up to 3×, shown as blue stars.', requiresUpgrade: 'r' },
        ],
      },
    },

    thorns: {
      basics:
        'Seals the plant under your cursor so it takes no damage for 3 seconds, and when the seal '
        + 'expires it heals to full regardless of how low it had fallen. 8s cooldown.',
      cast: 'F, targeting the plant under the cursor. Instant.',
      effects: [
        { tag: 'shield', label: 'Sealed', detail: 'The cursored plant takes no damage for 3s.' },
        { tag: 'heal', label: 'Full restore', detail: 'When the 3s expire the plant heals to full, regardless of how low it was.' },
        { tag: 'utility', label: 'Availability', detail: '8s cooldown.' },
      ],
      upgrade: {
        basics:
          'The sealed plant fights while it is protected: 10 damage to nearby enemies, and anything it '
          + 'lashes is slowed 15% for 3 seconds.',
        effects: [
          { tag: 'damage', label: 'Vine lash', detail: 'The sealed plant lashes nearby enemies for 10 damage.', requiresUpgrade: 'f' },
          { tag: 'control', label: 'Slow', detail: 'Lashed enemies are slowed 15% for 3s.', requiresUpgrade: 'f' },
        ],
      },
    },

    'thorn-drag': {
      basics:
        'For 5 seconds all incoming damage is split evenly across your plants instead of landing on '
        + 'you. They take it for real and can die of it, so a five-plant garden survives far more than a '
        + 'one-plant one. You keep full control throughout, the screen shakes 300ms as the grove '
        + 'connects, and it is a 30s cooldown.',
      cast: 'Q. Instant. You keep full control for the 5s.',
      effects: [
        { tag: 'shield', label: 'Shared intake', detail: 'For 5s all your incoming damage is split evenly across your plants instead of landing on you.' },
        { tag: 'cost', label: 'Paid in plants', detail: 'The plants take that damage for real and can die of it. A five-plant garden survives far more than a one-plant garden.' },
        { tag: 'utility', label: 'Availability', detail: '30s cooldown.' },
        { tag: 'utility', label: 'Screen impact', detail: '300ms camera shake as the grove connects.' },
      ],
      upgrade: {
        basics:
          'While Thrive! is running, every plant that dies heals you 20 HP — the garden\'s destruction '
          + 'pays you back instead of being pure loss.',
        effects: [
          { tag: 'heal', label: 'Death returns life', detail: 'While Thrive! is active, any plant that dies heals you 20 HP.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'With five plants up and Cycle of Life owned, a full garden burning down during the ultimate is 100 HP back.',
      ],
    },
  },

  perks: {
    mycology: {
      basics:
        'Every seed grows as a mushroom rendered in that seed\'s colour, keeping its own behaviour. '
        + 'Mushrooms within 170px of one another count as clustered and gain bonus HP for it.',
      cast: 'Passive. Changes what every seed grows into.',
      effects: [
        { tag: 'summon', label: 'All mushrooms', detail: 'Every seed grows as a mushroom rendered in that seed\'s colour, keeping its own behaviour.' },
        { tag: 'buff', label: 'Clustering', detail: 'Mushrooms within 170px of one another count as clustered and gain bonus HP for it.' },
      ],
    },
  },
  mastery: {
    'thorn-thrash': {
      basics:
        'Hitting your own plant with a click petal makes it thrash: 5 thorns at 5 damage each, fired in '
        + 'random directions at 420 px/s. Each plant can thrash once every 3 seconds, so a five-plant '
        + 'garden is five independent timers.',
      effects: [
        { tag: 'damage', label: 'Thrash', detail: 'Hitting your own plant with a click petal launches 5 thorns at 5 damage each in random directions.' },
        { tag: 'utility', label: 'Per-plant cooldown', detail: 'Each plant can thrash once every 3s, so a five-plant garden is five independent timers.' },
        { tag: 'utility', label: 'Thorn flight', detail: '420 px/s.' },
      ],
    },
    reap: {
      basics:
        'Destroys the plant under your cursor — or the nearest one — and takes its gift for 20 seconds. '
        + 'Sunflower: +2 petal shotgun damage. Rose: enemies take 5 damage for every 20 you take. Nurse '
        + 'Lily: heal 10% of all damage you deal. Nightcap: poison puddles bloom around you every second. '
        + 'Pitcher: your petals slow 15% for 2s. Cotton: +25% move speed. 15s cooldown, and with a '
        + 'five-plant cap on a 5s plant timer it costs 5 seconds of gardening.',
      cast: 'Bindable to E, R, F or Q. Destroys the plant under the cursor, or the nearest one.',
      effects: [
        { tag: 'buff', label: 'Sunflower', detail: '+2 petal shotgun damage for 20s.' },
        { tag: 'buff', label: 'Rose', detail: 'Enemies take 5 damage for every 20 damage you take, for 20s.' },
        { tag: 'heal', label: 'Nurse Lily', detail: 'Heal 10% of all damage you deal, for 20s.' },
        { tag: 'dot', label: 'Nightcap', detail: 'Poison puddles bloom around you every second, for 20s.' },
        { tag: 'control', label: 'Pitcher', detail: 'Your petals slow enemies 15% for 2s, for 20s.' },
        { tag: 'movement', label: 'Cotton', detail: '+25% move speed for 20s.' },
        { tag: 'cost', label: 'It eats the plant', detail: 'The plant is destroyed outright. With a cap of 5 and a 5s plant cooldown, that is 5 seconds of gardening spent.' },
        { tag: 'utility', label: 'Availability', detail: '15s cooldown.' },
      ],
    },
  },
};

export default life;
