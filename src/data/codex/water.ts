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
  },

  perks: {
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
      cast: 'Bindable to E, R, F or Q. Opens a cone that tracks your aim for 3s.',
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
