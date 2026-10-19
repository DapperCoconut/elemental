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
        'Eight seeds, and five plants at a time per owner — a sixth replaces the oldest. Sunflower (30 HP) '
        + 'links a solar beam to the nearest enemy for 3s, its damage climbing as it turns from gold to red, '
        + 'then recharges for 6s. Nightcap (25 HP) lobs poison bombs that burst into pools. Helicopter (70 HP) '
        + 'spins a rotor of blades that cuts anything within 62px. Mushroom Colony (35 HP) fires eight spores '
        + 'in a ring. Frost Lily (30 HP) throws piercing ice that slows and makes brittle. Flaming Sprout '
        + '(20 HP) machine-guns fire for 5 seconds and then burns out. Lotus (35 HP) ripens a healing orb '
        + 'that also adds a petal to your click. Pitcher (50 HP) is a sprinkler that waters the plants around it.',
      effects: [
        { tag: 'summon', label: 'Plant cap', detail: 'Five plants at once, per owner. Planting a sixth wilts the oldest to make room.' },
        { tag: 'damage', label: 'Sunflower', detail: '30 HP. Links to the nearest enemy within 400px for 3s: 4 damage/s climbing to 20/s (≈36 total), gold to red. 6s recharge; the link snaps past 480px.' },
        { tag: 'dot', label: 'Nightcap', detail: '25 HP. Every 2.2s lobs a bomb (leading its target) within 480px: 8 damage in a 38px splash, then a 3s poison pool.' },
        { tag: 'damage', label: 'Helicopter', detail: '70 HP. Blades sweep 62px round it, 3 damage every 0.2s (15/s) to everything inside.' },
        { tag: 'damage', label: 'Mushroom Colony', detail: '35 HP. Every 2.6s, with anything within 520px, fires 8 spores in a full ring at 6 damage each.' },
        { tag: 'control', label: 'Frost Lily', detail: '30 HP. Every 1.7s a piercing shard (7 damage, 560px reach): 30% slow for 2.5s and 20% more damage taken for 3s.' },
        { tag: 'dot', label: 'Flaming Sprout', detail: '20 HP. A shot every 0.22s (3 damage) that sets the target burning — 2 damage every 0.5s for 2s. Dies after 5s.' },
        { tag: 'heal', label: 'Lotus', detail: '35 HP. Ripens an orb every 5s. Walk over it: +10 HP and +1 petal per click for 15s. Stacks to 8, each on its own timer.' },
        { tag: 'buff', label: 'Pitcher', detail: '50 HP. Every 1.5s waters your other plants within 140px: +4 HP, and for 2.5s they act 35% faster and hit 25% harder.' },
      ],
      notes: [
        'Pitcher and Fertilize stack: a fertilized, watered plant is acting almost twice as fast.',
        'Lotus orbs belong to their owner — the enemy cannot steal yours.',
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
          'Five petals instead of three, still 8 damage each: 40 at point blank against the old 24, and far '
          + 'more forgiving of aim.',
        effects: [
          { tag: 'damage', label: 'Five petals', detail: '5 petals per shot at 8 damage each — 40 at point blank, against 24 from three, and far more forgiving of aim.', requiresUpgrade: 'click' },
        ],
      },
    },

    plant: {
      basics:
        'Places the seed you have selected at the cursor with 20–70 HP depending on which one, and it '
        + 'can be destroyed. Five plants maximum per owner — the enemy\'s garden does not count against '
        + 'yours, and a sixth replaces your oldest — on a 5s cooldown, so filling a garden takes 20 seconds.',
      cast: 'E, placed at the cursor. Instant. Uses the currently selected seed from the bar.',
      effects: [
        { tag: 'summon', label: 'Grow a plant', detail: 'Places the selected seed at the cursor. It has the HP from the seed table (20–70) and can be destroyed.' },
        { tag: 'resource', label: 'Cap', detail: 'Maximum 5 plants; a sixth replaces the oldest. The cap is per owner, so the enemy\'s garden does not count against yours.' },
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
        'Destroys the plant under your cursor — or the nearest one — and takes its gift for 20 seconds, '
        + '+10s for every fertilizer star on it and +10s if Fertilize was still on it, up to a minute. '
        + 'Each of the eight seeds gives something different, all of it on your click or your body. '
        + '15s cooldown, and with a five-plant cap on a 5s plant timer it costs 5 seconds of gardening.',
      cast: 'Bindable to R, F or Q. Destroys the plant under the cursor, or the nearest one.',
      effects: [
        { tag: 'damage', label: 'Sunflower', detail: 'Right-click: your own 3s solar link to the enemy nearest the cursor, same ramp as the plant. 6s recharge after it ends.' },
        { tag: 'dot', label: 'Nightcap', detail: 'Every petal that lands adds a poison stack: 0.6 damage/s per stack, no cap. Clears 4s after the last top-up.' },
        { tag: 'damage', label: 'Helicopter', detail: 'Three grass blades orbit you at 54px for 10 damage/s, and every click adds 3 stubby petals that drop after 130px.' },
        { tag: 'damage', label: 'Mushroom Colony', detail: '+2 petals per click, and your Mushroom Colonies hit 50% harder.' },
        { tag: 'control', label: 'Frost Lily', detail: 'Petals chill whoever they hit (30% slow for 1.5s) and bank off the arena wall once.' },
        { tag: 'buff', label: 'Flaming Sprout', detail: 'Every chained click cuts the next cooldown 8% more, up to 65%. Stop for 0.9s and the chain resets.' },
        { tag: 'heal', label: 'Lotus', detail: 'A lotus grows on your head every 8s. Your next dash spends it: 10 HP/s for 5s and +25% move speed.' },
        { tag: 'buff', label: 'Pitcher', detail: 'You become the sprinkler: every 1.5s, your plants within 170px are watered (+4 HP, 35% faster, 25% harder).' },
        { tag: 'cost', label: 'It eats the plant', detail: 'The plant is destroyed outright. With a cap of 5 and a 5s plant cooldown, that is 5 seconds of gardening spent.' },
        { tag: 'utility', label: 'Duration', detail: '20s base, +10s per permanent fertilizer star, +10s if freshly fertilized — 60s at most.' },
        { tag: 'utility', label: 'Availability', detail: '15s cooldown.' },
      ],
    },
  },
};

export default life;
