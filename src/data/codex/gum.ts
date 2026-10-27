import { ElementCodex } from '../AbilityCodex';

/**
 * Savor (id `gum`) — Sugar and Salt on one body.
 *
 * Verified against `src/elements/gum.ts` and `kits/SavorKit.ts`; every figure below is a constant
 * at the top of the kit. Savor has no shop upgrades, perks or mastery (the Slime ones this slot
 * used to carry were retired with the 2026-10-26 rework).
 */
const gum: ElementCodex = {
  identity:
    'A ball of sugar that turns to salt every time it dodges. Sugar collects candies off the floor for '
    + 'small permanent buffs, steals blood sugar by running loops round the enemy, and lends the enemy '
    + 'its own buffs before taking them back with a crash. Salt is the cash-in: a shard that bites '
    + 'harder into big health bars, a building crust of shield, a stalactite that soaks up whatever '
    + 'buffs it passes through, and a cone that stings for half of what you just dealt.',

  passives: [
    {
      emoji: '🔁',
      name: 'Sugar and Salt',
      basics:
        'You have two rows of five abilities. Every dodge (Space) flips you to the other row on the way, '
        + 'and the tray swaps with you. Each row keeps its own cooldowns; the two ultimates share one '
        + 'charge meter. A match starts in Sugar.',
      effects: [
        { tag: 'utility', label: 'The flip', detail: 'Space dodges exactly as normal and flips the form. A stalactite still hanging falls apart, and a Salt Shield that is still growing stops (the shield it grew stays).' },
        { tag: 'utility', label: 'Separate cooldowns', detail: 'Sugar Slam and Salt Slice, Sweet Tooth and Salt Shield and so on are different abilities — flipping is how you get more casts out of a fight.' },
      ],
      notes: ['The bot has no Space for it: the kit flips it with a short dash, towards Salt when a loan is live on you or a wound is worth salting, otherwise towards whichever row has more ready.'],
    },
    {
      emoji: '🍭',
      name: 'Candy Buffs',
      basics:
        'Four stacking buffs that last the whole match, carried across both forms: Cinnamon Spice +6% '
        + 'damage, Minty Fresh 6% resistance, Zippy Lemon +5% speed and Fruit Punch +4% dodge chance, a '
        + 'stack. Each caps at 10 stacks and never drops below 0.',
      effects: [
        { tag: 'buff', label: 'Cinnamon Spice', detail: '+6% damage dealt per stack (your hits on your opponents are multiplied on their side of the hit).' },
        { tag: 'buff', label: 'Minty Fresh', detail: 'Damage taken ÷ (1 + 0.06 per stack).' },
        { tag: 'buff', label: 'Zippy Lemon', detail: '+5% movement speed per stack.' },
        { tag: 'buff', label: 'Fruit Punch', detail: '+4% chance per stack that a hit misses you outright, up to 45%.' },
        { tag: 'debuff', label: 'Below zero', detail: 'Only a loan\'s crash can push a buff negative: then Cinnamon cuts damage, Mint becomes extra damage taken, Lemon slows (down to 40%) and a negative Fruit Punch gives the *other* side that much dodge chance.' },
      ],
    },
  ],

  abilities: {
    'savor-sugar-slam': {
      basics:
        'Lob a sugar bomb at the cursor (up to 420px). It bursts for 22 in a 70px radius, leaves a sugar '
        + 'cloud for 2.6s and a trail of sugar along its whole flight for 3s. Enemies in a cloud take 3 '
        + 'and on the trail 2, every half second.',
      cast: 'Click (hold to keep throwing). 0.7s cooldown. Sugar form.',
      effects: [
        { tag: 'damage', label: 'The burst', detail: '22 damage within 70px of where it lands.' },
        { tag: 'dot', label: 'Sugar cloud', detail: '56px cloud for 2.6s: 3 damage every 0.5s to enemies inside.' },
        { tag: 'dot', label: 'Sugar trail', detail: 'A crumb every 26px of flight, lasting 3s: 2 damage every 0.5s to enemies touching one.' },
      ],
      notes: ['Cloud and trail ticks are counted once per body per half second, however many overlap.'],
    },
    'savor-sweet-tooth': {
      basics:
        'Tear open a bag and toss five candies 70–150px around you. They last 14s; walk over one to eat '
        + 'it. Each of the four flavours is +1 stack of its buff; a Rainbow Lollipop is +1 to all four; '
        + 'Black Licorice is −1 to all four. Only you can eat your own candies.',
      cast: 'E. 5s cooldown. Sugar form.',
      effects: [
        { tag: 'resource', label: 'The bag', detail: '5 candies: 12% Black Licorice, ~18% Rainbow Lollipop, the rest split evenly between the four flavours.' },
        { tag: 'summon', label: 'Candies', detail: 'Last 14s (blinking for the last 2.5s). At most 15 of yours on the floor; the oldest goes first.' },
        { tag: 'buff', label: 'Eating', detail: 'Walk within 24px. Permanent for the match.' },
      ],
    },
    'savor-sugar-diffusion': {
      basics:
        '+50% speed for 5s. Run a full loop round an enemy within 280px and you drain their blood '
        + 'sugar into a cube over your head (up to 3 per enemy). Every 1.25s it also drains the bars of '
        + 'every enemy within 280px.',
      cast: 'R. 15s cooldown. Sugar form.',
      effects: [
        { tag: 'buff', label: 'Speed', detail: '×1.5 movement for 5s.' },
        { tag: 'control', label: 'A cube', detail: 'Each cube: 10% slower for the rest of the match (up to 3 cubes, 30%).' },
        { tag: 'debuff', label: 'Sluggish', detail: 'A drained enemy who uses any ability is 40% slower and cannot dodge for 1.5s.' },
        { tag: 'debuff', label: 'Repetition', detail: 'A drained enemy\'s damage drops ×0.88 for every consecutive repeat of the same ability (floor 60%), forgotten after 4s without a cast.' },
        { tag: 'debuff', label: 'Bar drain', detail: 'Every 1.25s, each enemy in range loses a bite of whatever their element has built up — the same drain Memory\'s Rebirth uses (weapons, gold, meters, stacks).' },
      ],
      notes: ['The loop is counted as angle swept round the enemy; leaving 280px resets it.'],
    },
    'savor-caring-share': {
      basics:
        'Throw a ball of chocolate. It hits for 16 and lends the target 150% of your current candy buffs '
        + 'for 5s — then they crash for 5s with the same amounts as penalties, and drop 3 candies (never '
        + 'licorice) for you to pick up.',
      cast: 'F. 12s cooldown. Sugar form. Stops at the first body.',
      effects: [
        { tag: 'damage', label: 'The ball', detail: '16 damage. 560 px/s, 0.9s flight.' },
        { tag: 'buff', label: 'The loan', detail: 'For 5s the target has round(1.5 × your felt stacks) of each buff — Sugar Rush doubling included.' },
        { tag: 'debuff', label: 'The crash', detail: 'For the next 5s the same numbers count negative.' },
        { tag: 'resource', label: 'The spill', detail: 'When the crash starts, 3 candies drop 40–110px around them for you.' },
      ],
      notes: ['The pairing is Salt Infusion: a stalactite through a body still wearing the loan comes out coated in it.'],
    },
    'savor-sugar-rush': {
      basics: 'For 12 seconds: triple speed, and every candy stack counts double. The camera pulls back and the screen goes rainbow.',
      cast: 'Q. Ultimate (charged). Sugar form.',
      effects: [
        { tag: 'buff', label: 'Speed', detail: '×3 movement for 12s, on top of Lemon.' },
        { tag: 'buff', label: 'Double candy', detail: 'All four buffs count ×2 for 12s — and so does anything Caring Share lends in that time.' },
      ],
    },
    'savor-salt-slice': {
      basics: 'A fast shard of salt: 12 damage plus 3% of the target\'s max health. It stops at the first body it hits.',
      cast: 'Click (hold to keep firing). 0.5s cooldown. Salt form.',
      effects: [
        { tag: 'damage', label: 'The shard', detail: '12 + 3% of the target\'s max HP. 950 px/s, 0.6s flight. Does not pierce.' },
      ],
    },
    'savor-salt-shield': {
      basics:
        'Salt crusts over you as shield HP: 2 a second, climbing by 1 a second each second to 5 a second. '
        + 'It stops at 75 shield, or the moment your shield is knocked down to nothing.',
      cast: 'E. 12s cooldown. Salt form. Flipping to Sugar stops the growth (the shield stays).',
      effects: [
        { tag: 'shield', label: 'Growth', detail: '2 → 5 shield per second, capped at 75 total shield.' },
        { tag: 'utility', label: 'Breaks', detail: 'Ends if your shield reaches 0 after the first 0.3s.' },
      ],
    },
    'savor-salt-infusion': {
      basics:
        'Grow a stalactite in front of you with a timing bar under your feet. Press R again to fire it: '
        + '48 damage in the green, 32 in the yellow, 18 in the red. It pierces, soaks up the buffs on '
        + 'everyone it passes through, and drops where it stops as a coated crystal — walk over it for '
        + 'permanent candy stacks to match. Left hanging, it fires itself after 3s.',
      cast: 'R, then R again. 10s cooldown. Salt form. The marker crosses the bar every 0.55s.',
      effects: [
        { tag: 'damage', label: 'Timing', detail: 'Green (middle 16% of the bar) 48, yellow (middle 44%) 32, red 18. Pierces every enemy once.' },
        { tag: 'resource', label: 'The coat', detail: 'Per buff the target is wearing: its own candies and any loan (half, rounded up, max 4); otherwise a shield is Mint 1, dodge is Fruit Punch 1, an outgoing damage boost is Cinnamon 1.' },
        { tag: 'buff', label: 'The crystal', detail: 'Only if coated. Lasts 12s where the stalactite stopped; walk within 26px for the stacks.' },
      ],
    },
    'savor-salt-wounds': {
      basics: 'Spray a cone of salt (180px, about 36° either side of the aim). Each enemy in it takes half of all the damage they took in the last 2 seconds (at least 4).',
      cast: 'F. 9s cooldown. Salt form.',
      effects: [
        { tag: 'damage', label: 'The sting', detail: '50% of the target\'s damage taken over the last 2s, minimum 4.' },
      ],
      notes: ['Lead with a Salt Infusion in the green or a Salt Crash and the sting follows it up.'],
    },
    'savor-salt-crash': {
      basics:
        'Salt spears burst up under every enemy for 30 and hold them in the air for 4.5s. Nobody can '
        + 'attack or move; instead both sides race to press the salt crystals that pop up on screen. '
        + 'Out-press them and they take 40 more and you are Salted for 10s — every candy stack also cuts '
        + '3% off your cooldowns (to half at most). A tie is a loss.',
      cast: 'Q. Ultimate (charged). Salt form.',
      effects: [
        { tag: 'damage', label: 'The spears', detail: '30 to every enemy.' },
        { tag: 'control', label: 'Held up', detail: 'You and every speared enemy: no movement, no abilities, for 4.5s.' },
        { tag: 'damage', label: 'Winning', detail: '+40 to every speared enemy.' },
        { tag: 'buff', label: 'Salted', detail: 'For 10s, cooldowns × (1 − 0.03 per candy stack you hold), floor 0.5.' },
      ],
      notes: ['Bots press 1.0 (Easy) to 3.0 (True Nightmare) crystals a second; a husk pack presses 1.5.'],
    },
  },
};

export default gum;
