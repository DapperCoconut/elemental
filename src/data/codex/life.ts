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
      magic:
        'Everything Life does is downstream of what is currently growing. Seeds are chosen from a bar at '
        + 'the top of the screen before they are planted, and the choice of which five are in the ground '
        + 'is the real decision the element asks you to make.',
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
      magic:
        'The one thing in the kit aimed at a person. Three blades of petal thrown in a tight fan, each a '
        + 'separate throw with its own muzzle — at range they scatter and one or two connect, at contact '
        + 'range all three land at once. Leaf litter shakes loose behind the caster from the effort.',
      cast: 'Click, aimed at the cursor. Instant. The spread is fixed at −15°, 0° and +15°.',
      effects: [
        { tag: 'damage', label: 'Three petals', detail: '3 projectiles at 8 damage each — 24 if all three land, which needs the target close.' },
        { tag: 'utility', label: 'Flight', detail: '480 px/s, spawned 32px out along each of the three angles.' },
        { tag: 'utility', label: 'Rate of fire', detail: '0.5s cooldown.' },
      ],
      upgrade: {
        magic:
          'Petal Burst widens the fan and thins each blade. More of the arc is covered and the total goes '
          + 'up, but only for someone standing close enough to catch the whole pattern.',
        effects: [
          { tag: 'damage', label: 'Five petals', detail: '5 petals per shot at 5 damage each — 25 at point blank, against 24 from three, but far more forgiving of aim.', requiresUpgrade: 'click' },
        ],
      },
    },

    plant: {
      magic:
        'A seed pressed into the arena floor and told to hurry. Which seed is whichever is selected on the '
        + 'bar at the top of the screen, and the plant that comes up is a real object with its own health '
        + 'bar that both fighters can attack. Everything else in the kit exists to keep these alive.',
      cast: 'E, placed at the cursor. Instant. Uses the currently selected seed from the bar.',
      effects: [
        { tag: 'summon', label: 'Grow a plant', detail: 'Places the selected seed at the cursor. It has the HP from the seed table (25–75) and can be destroyed.' },
        { tag: 'resource', label: 'Cap', detail: 'Maximum 5 plants. The cap is per owner, so the enemy\'s garden does not count against yours.' },
        { tag: 'utility', label: 'Availability', detail: '5s cooldown — filling a garden from empty takes 20 seconds.' },
      ],
      upgrade: {
        magic:
          'Verdant Growth makes the garden mobile. Plants stop being placed terrain and become something '
          + 'you drag around the fight — hardier, and able to drift toward wherever you pull them.',
        effects: [
          { tag: 'buff', label: 'Hardier', detail: 'All plants gain 50% more HP.', requiresUpgrade: 'e' },
          { tag: 'movement', label: 'Draggable', detail: 'Plants can be dragged with the mouse; they drift toward where you pull them rather than teleporting.', requiresUpgrade: 'e' },
        ],
      },
    },

    grow: {
      magic:
        'A wash of yellow light over an area of the garden — not healing so much as forcing a season\'s '
        + 'growth into five seconds. Everything caught in it repairs and runs hot for a short while '
        + 'afterwards.',
      cast: 'R, centred on an area. Instant, affects every plant inside it.',
      effects: [
        { tag: 'heal', label: 'Repair', detail: 'Plants hit are healed 50% of their maximum HP.' },
        { tag: 'buff', label: 'Power boost', detail: 'Those plants gain a power boost for 5s.' },
        { tag: 'utility', label: 'Availability', detail: '8s cooldown.' },
      ],
      upgrade: {
        magic:
          'Perma-Fertilize means some of that season stays. Each application leaves a permanent mark on '
          + 'the plant — blue stars above it — and a plant that survives three fertilizings is a '
          + 'meaningfully different plant from the one you put in the ground.',
        effects: [
          { tag: 'buff', label: 'Permanent stacks', detail: 'Also grants a small permanent buff to affected plants, stacking up to 3×, shown as blue stars.', requiresUpgrade: 'r' },
        ],
      },
    },

    thorns: {
      magic:
        'One plant is picked out and sealed. For three seconds nothing can touch it at all, and when the '
        + 'seal breaks the plant comes back whole. It is the answer to focused fire: the enemy commits to '
        + 'killing a sunflower, and at the end of it the sunflower is at full health.',
      cast: 'F, targeting the plant under the cursor. Instant.',
      effects: [
        { tag: 'shield', label: 'Sealed', detail: 'The cursored plant takes no damage for 3s.' },
        { tag: 'heal', label: 'Full restore', detail: 'When the 3s expire the plant heals to full, regardless of how low it was.' },
        { tag: 'utility', label: 'Availability', detail: '8s cooldown.' },
      ],
      upgrade: {
        magic:
          'Living Roots turns the seal red and gives the plant teeth while it is invulnerable. Standing '
          + 'next to something you cannot hurt now costs you.',
        effects: [
          { tag: 'damage', label: 'Vine lash', detail: 'The sealed plant lashes nearby enemies for 10 damage.', requiresUpgrade: 'f' },
          { tag: 'control', label: 'Slow', detail: 'Lashed enemies are slowed 15% for 3s.', requiresUpgrade: 'f' },
        ],
      },
    },

    'thorn-drag': {
      magic:
        'The caster roots into the ground and the whole grove answers — a trunk of growth punching up out '
        + 'of them, a bloom thrown outward, pollen rolling off the front. For five seconds the gardener '
        + 'and the garden are one organism, and anything aimed at the gardener is shared out among the '
        + 'plants instead. It is not damage reduction: it is damage redirection, and it costs the garden.',
      cast: 'Q. Instant. You keep full control for the 5s.',
      effects: [
        { tag: 'shield', label: 'Shared intake', detail: 'For 5s all your incoming damage is split evenly across your plants instead of landing on you.' },
        { tag: 'cost', label: 'Paid in plants', detail: 'The plants take that damage for real and can die of it. A five-plant garden survives far more than a one-plant garden.' },
        { tag: 'utility', label: 'Availability', detail: '30s cooldown.' },
        { tag: 'utility', label: 'Screen impact', detail: '300ms camera shake as the grove connects.' },
      ],
      upgrade: {
        magic:
          'Cycle of Life closes the loop. A plant dying during Thrive! is no longer just a loss — it hands '
          + 'its remaining life back to the gardener, and a garden burning down around you becomes the '
          + 'largest heal in the element.',
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
      magic:
        'Every seed comes up a mushroom, in that seed\'s colour. The garden keeps its behaviours and '
        + 'loses its shapes, and mushrooms planted near one another feed each other — the element '
        + 'stops being five separate plants and becomes one colony that wants to be crowded.',
      cast: 'Passive. Changes what every seed grows into.',
      effects: [
        { tag: 'summon', label: 'All mushrooms', detail: 'Every seed grows as a mushroom rendered in that seed\'s colour, keeping its own behaviour.' },
        { tag: 'buff', label: 'Clustering', detail: 'Mushrooms within 170px of one another count as clustered and gain bonus HP for it.' },
      ],
    },
  },
  mastery: {
    'thorn-thrash': {
      magic:
        'Your petals stop being wasted on your own garden. A click that clips one of your plants '
        + 'sets it off — it throws a fistful of thorns in every direction at once. Aiming through '
        + 'your own flowers becomes the point rather than the mistake.',
      effects: [
        { tag: 'damage', label: 'Thrash', detail: 'Hitting your own plant with a click petal launches 5 thorns at 5 damage each in random directions.' },
        { tag: 'utility', label: 'Per-plant cooldown', detail: 'Each plant can thrash once every 3s, so a five-plant garden is five independent timers.' },
        { tag: 'utility', label: 'Thorn flight', detail: '420 px/s.' },
      ],
    },
    reap: {
      magic:
        'You take a plant apart and wear what it was. The garden becomes a set of twenty-second '
        + 'buffs you can cash in, and which flower you sacrifice is a real decision — the whole '
        + 'point of choosing seeds at the start is now also about what you might tear up later.',
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
