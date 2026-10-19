import { ElementCodex } from '../AbilityCodex';

/**
 * Water — verified against `src/elements/water.ts`, `kits/WaterKit.ts`, the shared puddle tick
 * in `ArenaScene.update`, and the water block of `data/Upgrades.ts`.
 */
const water: ElementCodex = {
  identity:
    'Hydromancy as pressure work: nothing water does hits especially hard on its own, and almost '
    + 'everything it does either compounds on a target that stays put or moves the caster faster than '
    + 'the fight expects. It is the patient element — it wins by covering ground and waiting.',

  abilities: {
    'water-cut': {
      basics:
        'A thin blade of water thrown at the cursor for 8 damage. It flies 620 px/s — the fastest of '
        + 'the base click projectiles — is used up on the first fighter it touches, and returns every '
        + '0.25s: four a second, twice fire\'s rate for 40% of the damage.',
      cast: 'Click, aimed at the cursor. Instant. The blade orients to its own travel.',
      effects: [
        { tag: 'damage', label: 'Slash', detail: '8 damage to the first fighter it touches.' },
        { tag: 'utility', label: 'Flight', detail: '620 px/s — the fastest of the base-element click projectiles. Spawned 32px out from the caster.' },
        { tag: 'utility', label: 'Rate of fire', detail: '0.25s cooldown, four per second. Twice the rate of fire\'s click for 40% of the damage.' },
      ],
      upgrade: {
        basics:
          'Every white shot now applies 2% dehydration, and dehydration pays you back: each 10% on a '
          + 'target adds 5% to your damage against them, capped at +50% when they are fully dried out.',
        effects: [
          { tag: 'debuff', label: 'Dehydration stacks', detail: 'White shots apply 2% dehydration per hit.', requiresUpgrade: 'click' },
          { tag: 'buff', label: 'Damage scaling', detail: 'Every 10% dehydration grants +5% damage, to a cap of +50% at 100%.', requiresUpgrade: 'click' },
        ],
      },
    },

    splash: {
      basics:
        'Opens a 2-second rain window that drops a 36px pool at your live cursor every 0.15s — about 13 '
        + 'pools a cast. Each pool lasts 1 second and deals 2 damage every 0.25s, 8 a second, to anyone '
        + 'standing in it. 5s cooldown, counted from the start of the window.',
      cast: 'E. Opens a 2s window; pools drop at the live cursor position every 0.15s for as long as it runs.',
      effects: [
        { tag: 'area', label: 'Downpour', detail: '2s of rain, one pool every 0.15s — about 13 pools per cast, laid wherever the cursor is at that instant.' },
        { tag: 'area', label: 'Pool', detail: 'Each pool is 36px across and lasts 1s.' },
        { tag: 'dot', label: 'Standing water', detail: '2 damage every 0.25s to anyone standing in a pool — 8 damage per second, and it stacks with nothing, it simply keeps ticking.' },
        { tag: 'utility', label: 'Availability', detail: '5s cooldown from the start of the window.' },
      ],
      upgrade: {
        basics:
          'Only the last drop changes, and it changes a lot: it lands 54px across instead of 36 and '
          + 'stands for 5 seconds instead of 1, so the cast leaves a real puddle behind rather than a '
          + 'passing shower.',
        effects: [
          { tag: 'area', label: 'Final pool', detail: 'The last drop of the sequence lands at 54px instead of 36px — 1.5× wider.', requiresUpgrade: 'e' },
          { tag: 'area', label: 'Lasting', detail: 'That pool sticks for 5s instead of 1s, so it outlives the cast by a wide margin.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'Pools you own also count as wet ground for Slipstream — a mastery speed bonus for standing in your own water.',
        'With the Stalagmite perk the downpour plants stalagmites instead of pools: your own water clicks passing through one are relaunched as a 7 damage spike (11 if it was the upgraded final drop).',
      ],
    },

    geyser: {
      basics:
        'Opens a vent at the cursor that stands for 5 seconds and holds 2 charges of speed boost. '
        + 'Standing in your own geyser draws one, with a 2-second gap enforced between draws, and the '
        + 'height of the fountain shows how many are left. 12s cooldown — an ability you plan a fight '
        + 'around.',
      cast: 'R, opened at the cursor. Instant; the vent then stands on its own.',
      effects: [
        { tag: 'buff', label: 'Speed vent', detail: 'Standing in your own geyser grants a speed boost. It holds 2 charges, and the fountain\'s height shows how many are left.' },
        { tag: 'area', label: 'Lifetime', detail: 'The vent stands for 5s from being opened.' },
        { tag: 'utility', label: 'Re-use gate', detail: 'A 2s gap is enforced between drawing charges from the same vent.' },
        { tag: 'utility', label: 'Availability', detail: '12s cooldown — this is the ability you plan a fight around rather than spam.' },
      ],
      upgrade: {
        basics:
          'The vent is now hot as well as fast: 10 damage every second to enemies standing in one of '
          + 'yours. Boiling vents steam and glow pale, so the dangerous ones are readable from across the '
          + 'arena.',
        effects: [
          { tag: 'dot', label: 'Scalding', detail: '10 damage every 1s to enemies standing in one of your geysers.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Tell', detail: 'Boiling vents steam and glow pale, so the hot ones are readable across the arena.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'With the Sulphur mastery a capped vent builds 5 pressure per second to a cap of 100, and stepping on it cashes the whole lot as a speed multiplier of 1 + pressure/100 for 8s — then the vent is spent.',
      ],
    },

    'pressure-dagger': {
      basics:
        'Hold F to charge, release to throw a piercing lance at 700 px/s. 16 damage uncharged, ×1.5 at '
        + 'one second of charge and ×2 at two, and it passes through bodies instead of stopping on the '
        + 'first. 4s cooldown from the release, and the blade\'s length and colour show the tier you are '
        + 'at.',
      cast: 'Hold F to charge, release to throw. The blade\'s length and colour track the tier you are at.',
      effects: [
        { tag: 'damage', label: 'Base throw', detail: '16 damage at tier 0, launched at 700 px/s.' },
        { tag: 'damage', label: 'Tier 1', detail: '1s of charge — 1.5× damage.' },
        { tag: 'damage', label: 'Tier 2', detail: '2s of charge — 2× damage, the full lance.' },
        { tag: 'utility', label: 'Piercing', detail: 'The dagger pierces rather than being consumed on the first body.' },
        { tag: 'utility', label: 'Availability', detail: '4s cooldown, counted from the release.' },
      ],
      upgrade: {
        basics:
          'A fully charged two-second dagger splits whoever it hits into two hitboxes at 1.5× size for 2 '
          + 'seconds — a far easier target for everything else you throw at them.',
        effects: [
          { tag: 'debuff', label: 'Split hitbox', detail: 'A fully charged (2s) dagger splits the enemy into two 1.5× hitboxes for 2s.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'The NPC does not charge — it throws at tier 0 for a flat 16 the moment the ability comes up.',
      ],
    },

    'pain-rain': {
      basics:
        'The ultimate: 200 drops fall across the whole arena inside 0.8 seconds, each painting a 14px '
        + 'shadow on the ground 50–800ms before it lands and then striking a 55px radius. Every single '
        + 'drop is dodgeable, you keep full control while it falls, and the camera shakes 320ms as the '
        + 'storm goes up. 50s cooldown, the longest of any base element ability.',
      cast: 'Q. Instant, arena-wide; you keep full control while the rain falls.',
      effects: [
        { tag: 'damage', label: 'The rain', detail: '200 individual drops fall across the arena, each landing as its own impact.' },
        { tag: 'area', label: 'Telegraph', detail: 'Every drop paints a 14px shadow on the ground 50–800ms before it lands, then hits a 55px radius. The whole storm resolves inside 0.8s and every single drop is individually dodgeable.' },
        { tag: 'utility', label: 'Availability', detail: '50s cooldown — the longest of any base element ability.' },
        { tag: 'utility', label: 'Screen impact', detail: '320ms camera shake as the storm is raised.' },
      ],
      upgrade: {
        basics:
          'A quarter of the drops leave a 54px pool where they land, standing for 5 seconds and ticking '
          + 'the usual 2 damage per 0.25s. The ultimate floods the arena instead of only passing over it.',
        effects: [
          { tag: 'area', label: 'Tidal splashes', detail: '25% of drops leave a 54px pool behind them, lasting 5s — the same pool the Tidal Pool upgrade produces.', requiresUpgrade: 'q' },
          { tag: 'dot', label: 'Flooded arena', detail: 'Those pools tick the standard 2 damage per 0.25s, so the ultimate leaves behind sustained area damage rather than a single burst.', requiresUpgrade: 'q' },
        ],
      },
    },
    // Alternate ultimate — swapped in for Pain Rain from the customize panel (cheats only for now).
    'bubble-barrage': {
      basics:
        'The alternate ultimate, in place of Pain Rain. You blow 20 bubbles in a cone in front of you, '
        + 'streaming out over about half a second, slowing as they drift. A bubble that touches a foe '
        + 'sticks to them — up to 4 on one foe — and a bubble that reaches a foe already wearing 4 pops '
        + 'on them for 8 damage instead. Each bubble has 75 HP, and every point of damage it takes passes '
        + 'on to its wearer at 50%: splash, blasts and puddles that catch a bubbled foe hit them and every '
        + 'bubble on them. 36s cooldown.',
      cast: 'Q (when equipped as the alternate). Aimed at the cursor. 36s cooldown.',
      noUpgrade: true,
      effects: [
        { tag: 'area', label: 'The volley', detail: '20 bubbles over ~0.56s, inside about 31° either side of your aim, at 240–380 px/s and slowing; free bubbles pop after 1.8–2.1s.' },
        { tag: 'debuff', label: 'Clinging', detail: 'Up to 4 bubbles orbit one foe for 10s each. A bubble arriving at a foe already wearing 4 pops on them for 8 damage.' },
        { tag: 'damage', label: 'Pass-through', detail: 'Each bubble has 75 HP. An area hit that reaches a bubble damages it too, and 50% of what it absorbs lands on its wearer — four bubbles can turn a 10-damage blast into 30.' },
        { tag: 'utility', label: 'What counts', detail: 'Every area hit counts — the arena AoE chokepoint, Pain Rain drops, Splashy splashes, Poseidon waves and each 0.25s puddle tick. Single-target shots do not hit bubbles.' },
      ],
    },
  },

  perks: {
    'water-drippy': {
      basics:
        'You drip as you walk. Every 46px you move leaves a 20px puddle behind you for 2.6 seconds. '
        + 'They are ordinary Splash pools — they slow foes by half and tick 2 damage every 0.25s.',
      cast: 'Passive. Walk.',
      effects: [
        { tag: 'area', label: 'Trail', detail: 'A 20px pool every 46px walked, lasting 2.6s. At most 16 at once; the oldest dries up first.' },
        { tag: 'dot', label: 'Wet ground', detail: 'Each drip ticks 2 damage per 0.25s and halves the speed of any foe standing in it.' },
      ],
    },
    'water-splashy': {
      basics:
        'Every puddle you make is 50% bigger — Splash, the Tidal Pool, Squall Splashes and Drippy. And '
        + 'Water Cut splashes when it lands: everything else within 64px of the target takes 4 damage.',
      cast: 'Passive.',
      effects: [
        { tag: 'area', label: 'Bigger pools', detail: 'Every pool you lay is 1.5× as wide: Splash 54px, Tidal Pool 81px, Squall 81px, drips 30px.' },
        { tag: 'damage', label: 'Splash damage', detail: 'A Water Cut hit deals 4 damage to everything else within 64px of its target — and to every bubble on the target.' },
      ],
    },
    'water-poseidon': {
      basics:
        'Water Cut becomes a small wave that shoves foes back 16px. Your dodge becomes a wave you ride: '
        + 'twice as long, 15% faster, and 12 damage to anyone you ride into. And every ultimate you cast '
        + 'sends a great wave across the whole arena, crashing into every foe for 25 damage.',
      cast: 'Passive. Changes Click, Space and Q.',
      effects: [
        { tag: 'utility', label: 'Wave cuts', detail: 'Each Water Cut hit shoves its target 16px along the shot.' },
        { tag: 'damage', label: 'Wave ride', detail: 'Dodging rides a wave for 0.56s (i-frames still 0.28s) at 1.15× dodge speed, hitting anyone within 42px for 12 damage and throwing them aside.' },
        { tag: 'damage', label: "Poseidon's wave", detail: 'Casting Pain Rain or Bubble Barrage sends a wave across the arena in ~1.1s: 25 damage to every foe it crosses, and 25 to each bubble they wear.' },
      ],
    },
    stalagmite: {
      basics:
        'Splash stops making puddles and makes stalagmites: heavy damage on contact in place of the '
        + '2-per-0.25s tick, with no slow and no ground denial at all. Your own water clicks passing near '
        + 'a spike are eaten and relaunched from it at 500 px/s for 7 damage — 11 from an upgraded final '
        + 'spike.',
      cast: 'Passive. Changes what E produces.',
      effects: [
        { tag: 'damage', label: 'Spikes not pools', detail: 'Splash drops stalagmites instead of puddles — strong initial damage in place of the 2-per-0.25s tick.' },
        { tag: 'cost', label: 'No slow, no DoT', detail: 'Everything the standing water used to do is gone. The ground is no longer denied, only dangerous on contact.' },
        { tag: 'damage', label: 'Relaunch', detail: 'Your own water click passing within 60% of a spike is consumed and relaunched from it at 500 px/s for 7 damage — 11 from an upgraded final spike.' },
      ],
    },
  },
  mastery: {
    slipstream: {
      basics:
        'Standing in any of your own water makes you 25% faster. Base Splash pools, the E+ tidal pool '
        + 'and the Q+ squall splashes all count.',
      effects: [
        { tag: 'buff', label: 'Wet ground', detail: '25% faster movement while standing in any of your own water.' },
        { tag: 'utility', label: 'What counts', detail: 'Base Splash pools, the E+ tidal pool, and Q+ Squall Splashes all qualify.' },
      ],
    },
    siphon: {
      basics:
        'A bindable cone — 190px long, 36° either side of your aim — that tracks your cursor for 3 '
        + 'seconds and deals no damage at all. Everything inside takes 10% dehydration a second, up to '
        + '30% from a full channel, which feeds the damage bonus on everything else you throw. 5s '
        + 'cooldown.',
      cast: 'Bindable to R, F or Q. Opens a cone that tracks your aim for 3s.',
      effects: [
        { tag: 'debuff', label: 'Dehydration', detail: '10% dehydration per second to every enemy inside, for as long as they stay — up to 30% from one full channel.' },
        { tag: 'area', label: 'The cone', detail: '190px of range, 36° either side of the aim line, 3s duration, tracking your cursor the whole time.' },
        { tag: 'damage', label: 'No damage of its own', detail: 'Deals 0. It feeds the dehydration bonus on everything else.' },
        { tag: 'utility', label: 'Availability', detail: '5s cooldown.' },
      ],
      notes: [
        'Dehydration converts at +5% damage per 10%, capped at +50% — so a full 3s channel is worth +15% on everything until it wears off.',
      ],
    },
  },
};

export default water;
