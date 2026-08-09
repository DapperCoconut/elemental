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
      magic:
        'A blade of water drawn to a hair\'s edge and thrown flat. It carries almost no mass, which is '
        + 'why it is the fastest and weakest projectile in the base game — but it also costs almost '
        + 'nothing to throw, and the whole element is built on landing a great many small things.',
      cast: 'Click, aimed at the cursor. Instant. The blade orients to its own travel.',
      effects: [
        { tag: 'damage', label: 'Slash', detail: '8 damage to the first fighter it touches.' },
        { tag: 'utility', label: 'Flight', detail: '620 px/s — the fastest of the base-element click projectiles. Spawned 32px out from the caster.' },
        { tag: 'utility', label: 'Rate of fire', detail: '0.25s cooldown, four per second. Twice the rate of fire\'s click for 40% of the damage.' },
      ],
      upgrade: {
        magic:
          'Dehydration turns the stream of small cuts into an accumulating condition. Each pale shot '
          + 'draws a little more water out of the target, and a target that has been drying out for a '
          + 'while takes progressively more from everything you throw at them.',
        effects: [
          { tag: 'debuff', label: 'Dehydration stacks', detail: 'White shots apply 2% dehydration per hit.', requiresUpgrade: 'click' },
          { tag: 'buff', label: 'Damage scaling', detail: 'Every 10% dehydration grants +5% damage, to a cap of +50% at 100%.', requiresUpgrade: 'click' },
        ],
      },
    },

    splash: {
      magic:
        'The caster opens a two-second downpour over the cursor and then walks it around. Water arrives '
        + 'from above in a steady sequence of impacts rather than as one placed pool, so the shape of the '
        + 'flooded ground is drawn by where the cursor went — this is painting, not placing.',
      cast: 'E. Opens a 2s window; pools drop at the live cursor position every 0.15s for as long as it runs.',
      effects: [
        { tag: 'area', label: 'Downpour', detail: '2s of rain, one pool every 0.15s — about 13 pools per cast, laid wherever the cursor is at that instant.' },
        { tag: 'area', label: 'Pool', detail: 'Each pool is 36px across and lasts 1s.' },
        { tag: 'dot', label: 'Standing water', detail: '2 damage every 0.25s to anyone standing in a pool — 8 damage per second, and it stacks with nothing, it simply keeps ticking.' },
        { tag: 'utility', label: 'Availability', detail: '5s cooldown from the start of the window.' },
      ],
      upgrade: {
        magic:
          'Tidal Pool holds the last of the downpour back. The final impact of the sequence lands as one '
          + 'heavy body of water rather than another drip — a pool you can actually build a fight around, '
          + 'instead of thirteen that evaporate behind you.',
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
      magic:
        'A spring broken open through the arena floor. A column punches up, the ground around it floods, '
        + 'and the vent stays there as a piece of terrain — the only ability in the kit that helps you '
        + 'rather than hurting them. It is a movement tool disguised as a fountain.',
      cast: 'R, opened at the cursor. Instant; the vent then stands on its own.',
      effects: [
        { tag: 'buff', label: 'Speed vent', detail: 'Standing in your own geyser grants a speed boost. It holds 2 charges, and the fountain\'s height shows how many are left.' },
        { tag: 'area', label: 'Lifetime', detail: 'The vent stands for 5s from being opened.' },
        { tag: 'utility', label: 'Re-use gate', detail: 'A 2s gap is enforced between drawing charges from the same vent.' },
        { tag: 'utility', label: 'Availability', detail: '12s cooldown — this is the ability you plan a fight around rather than spam.' },
      ],
      upgrade: {
        magic:
          'Boiling Geyser puts heat under the spring. The vent no longer only helps you — it scalds, and '
          + 'the water you have been using as a road becomes a place the other fighter cannot follow you into.',
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
      magic:
        'Water dragged in from all around the caster and compressed, held, and compressed further. The '
        + 'blade visibly lengthens and darkens through each pressure tier while the key is down. Let go '
        + 'early and it is a thrown knife; hold it to the top and it is a lance that goes through people.',
      cast: 'Hold F to charge, release to throw. The blade\'s length and colour track the tier you are at.',
      effects: [
        { tag: 'damage', label: 'Base throw', detail: '16 damage at tier 0, launched at 700 px/s.' },
        { tag: 'damage', label: 'Tier 1', detail: '1s of charge — 1.5× damage.' },
        { tag: 'damage', label: 'Tier 2', detail: '2s of charge — 2× damage, the full lance.' },
        { tag: 'utility', label: 'Piercing', detail: 'The dagger pierces rather than being consumed on the first body.' },
        { tag: 'utility', label: 'Availability', detail: '4s cooldown, counted from the release.' },
      ],
      upgrade: {
        magic:
          'Laminar Laceration is what a fully-pressurised cut actually does to a target: it does not just '
          + 'wound them, it splits them into two separate things to aim at. For two seconds the enemy is '
          + 'a pair of 1.5× hitboxes, and everything you throw is much harder to miss with.',
        effects: [
          { tag: 'debuff', label: 'Split hitbox', detail: 'A fully charged (2s) dagger splits the enemy into two 1.5× hitboxes for 2s.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'The NPC does not charge — it throws at tier 0 for a flat 16 the moment the ability comes up.',
      ],
    },

    'pain-rain': {
      magic:
        'The caster hauls an entire storm up out of the ground beneath themselves — a spout, a crown of '
        + 'water thrown wide, mist rolling off the front — and then two hundred separate drops come down '
        + 'across the whole arena. There is nowhere in the room that is not being rained on. It is the '
        + 'longest cooldown in the base game and the only fire-and-forget ultimate that keeps working '
        + 'while you go and do something else.',
      cast: 'Q. Instant, arena-wide; you keep full control while the rain falls.',
      effects: [
        { tag: 'damage', label: 'The rain', detail: '200 individual drops fall across the arena, each landing as its own impact.' },
        { tag: 'area', label: 'Telegraph', detail: 'Every drop paints a 14px shadow on the ground 50–800ms before it lands, then hits a 55px radius. The whole storm resolves inside 0.8s and every single drop is individually dodgeable.' },
        { tag: 'utility', label: 'Availability', detail: '50s cooldown — the longest of any base element ability.' },
        { tag: 'utility', label: 'Screen impact', detail: '320ms camera shake as the storm is raised.' },
      ],
      upgrade: {
        magic:
          'Squall Splashes means a quarter of the storm hits hard enough to stay. The arena does not just '
          + 'get rained on, it gets flooded — and the pools left behind are the good ones, the wide '
          + 'five-second kind, scattered everywhere at once.',
        effects: [
          { tag: 'area', label: 'Tidal splashes', detail: '25% of drops leave a 54px pool behind them, lasting 5s — the same pool the Tidal Pool upgrade produces.', requiresUpgrade: 'q' },
          { tag: 'dot', label: 'Flooded arena', detail: 'Those pools tick the standard 2 damage per 0.25s, so the ultimate leaves behind sustained area damage rather than a single burst.', requiresUpgrade: 'q' },
        ],
      },
    },
  },

  perks: {
    stalagmite: {
      magic:
        'The downpour freezes on the way down. Splash stops laying pools and starts planting spikes '
        + 'of hard water — no slow, no lingering tick, just something sharp standing in the ground. '
        + 'And they are not only obstacles: your own water blades hitting one are caught and thrown '
        + 'onward, so the spikes are a relay network you build across the arena.',
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
      magic:
        'You stop walking through your own water and start being carried by it. Every pool the kit '
        + 'makes becomes a road, which quietly turns the whole element from area denial into '
        + 'mobility — the Splash you laid to slow them is now the Splash you travel on.',
      effects: [
        { tag: 'buff', label: 'Wet ground', detail: '25% faster movement while standing in any of your own water.' },
        { tag: 'utility', label: 'What counts', detail: 'Base Splash pools, the E+ tidal pool, and Q+ Squall Splashes all qualify.' },
      ],
    },
    siphon: {
      magic:
        'A cone held open in front of you that pulls the water out of anything standing in it. It '
        + 'does nothing on its own — no damage, no slow — it just dries people out, and a dried-out '
        + 'target takes more from every single thing the rest of the kit throws.',
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
