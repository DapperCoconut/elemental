import { ElementCodex } from '../AbilityCodex';

/**
 * Ice — cold as bookkeeping. Nothing in the kit hits hard; everything in it makes the next
 * thing hit harder.
 *
 * Verified against `src/elements/ice.ts`, `kits/IceKit.ts`, the ice block of `data/Upgrades.ts`,
 * the Rink and Snow perks, and `data/Mastery.ts`. Numbers here are the ones the kit applies.
 */
const ice: ElementCodex = {
  identity:
    'Cryomancy run as an accountant runs a ledger. An Ice Spike does eight damage and that is the '
    + 'point — the shot is not the payload, the frost it leaves is, and every ability in the kit '
    + 'either adds stacks, keeps them alive, or cashes them in at once. Ice is the only starting-tier '
    + 'element whose damage is mostly deferred, and the only one that can make a target take 45% more '
    + 'from everything, including things that are not ice.',

  passives: [
    {
      emoji: '❄️',
      name: 'Frost Stacks',
      basics:
        'Ice\'s whole economy. Up to 5 stacks, each running its own 8-second timer and falling off '
        + 'independently. Nothing happens at 1–2; 3 stacks make all damage taken ×1.20, 4 make it ×1.30, '
        + '5 make it ×1.45, and that applies to every source of damage in the game rather than only '
        + 'yours. Stacks come from Ice Spike hits (1 each), standing in an icy trail (1 every 1.2s, or '
        + 'every 2s for the trail Skate lays) and every unfreeze (3 at once). A frozen target\'s timers '
        + 'are held still, so a 3-second freeze costs them no frost.',
      effects: [
        { tag: 'debuff', label: 'The cap', detail: '5 stacks maximum. Each one lasts 8s on its own timer and falls off independently — the fifth stack expiring drops you back to four, not to zero.' },
        { tag: 'debuff', label: 'Vulnerability curve', detail: 'Nothing at 1–2 stacks. 3 stacks: all damage taken ×1.20. 4 stacks: ×1.30. 5 stacks: ×1.45. It applies to every source of damage in the game, not just yours.' },
        { tag: 'utility', label: 'Where they come from', detail: 'Every Ice Spike hit (1), standing in an icy trail (1 every 1.2s, or every 2s for the trail Skate lays), and every unfreeze (3 at once).' },
        { tag: 'utility', label: 'Frozen holds the clock', detail: 'While a target is frozen solid their stack timers are pushed forward frame by frame, so a 3s freeze costs them no frost.' },
      ],
      notes: [
        'The curve runs on you as well. Ice mirrors are a race to see whose ❄️ count is higher when the beams come out.',
        'Icicle Impale is the only thing that pushes past 5 — up to 7, which is ×1.60 and ×1.75.',
      ],
    },
    {
      emoji: '🧊',
      name: 'Shatter the Shell',
      basics:
        'An Ice Spike or a Frozen Solid cone that lands on an already-frozen fighter ends the freeze '
        + 'immediately and applies 3 frost stacks in one go. There is no way to shatter and keep the '
        + 'lockdown — the trade is always 3 stacks for whatever was left of the 3 seconds.',
      effects: [
        { tag: 'debuff', label: 'Break bonus', detail: 'An Ice Spike or a Frozen Solid cone that hits an already-frozen fighter ends the freeze immediately and applies 3 frost stacks in one go.' },
        { tag: 'control', label: 'Cuts your own freeze short', detail: 'There is no way to shatter and keep the lockdown. The trade is always 3 stacks for whatever is left of the 3 seconds.' },
      ],
    },
  ],

  abilities: {
    'ice-spike': {
      basics:
        '8 damage, the smallest click in the game, plus 1 frost stack — or 3 if it shatters a frozen '
        + 'target instead. The shard is not consumed on contact, so it keeps travelling and can chain '
        + 'through a line of enemies for a stack each. 520 px/s on a 0.6s cooldown, roughly 1.7 shots a '
        + 'second held down.',
      cast: 'Click, aimed at the cursor. Instant, no lock. Launched from the caster centre with a frost flash off the casting hand.',
      effects: [
        { tag: 'damage', label: 'Impact', detail: '8 damage — the smallest click in the game.' },
        { tag: 'debuff', label: 'Frost on hit', detail: '1 frost stack per hit. Against a frozen target it shatters the shell instead and applies 3.' },
        { tag: 'utility', label: 'Piercing', detail: 'The shard is not consumed on contact — it keeps travelling and can chain through a line of enemies, one stack each.' },
        { tag: 'utility', label: 'Flight', detail: '520 px/s, 0.6s cooldown. Roughly 1.7 shots a second held down.' },
      ],
      upgrade: {
        basics:
          'Click becomes a held spray instead of a shard: a 150px cone at about a 37° half-angle from the '
          + 'cursor line, 2 damage every 200ms — 10 a second at point blank — and nothing outside the arc '
          + 'is touched. It never adds a stack; it resets every stack already on a target back to a full 8 '
          + 'seconds, so it stops the curve falling off rather than climbing it. Under Black Ice it '
          + 'refreshes void frost timers the same way, keeping the detonation payload topped up.',
        effects: [
          { tag: 'damage', label: 'Spray tick', detail: '2 damage per tick, one tick every 200ms while held — 10 damage a second at point blank.', requiresUpgrade: 'click' },
          { tag: 'area', label: 'The cone', detail: '150px range and a ~37° half-angle from the cursor line. Nothing outside that arc is touched.', requiresUpgrade: 'click' },
          { tag: 'debuff', label: 'Refresh, not apply', detail: 'Every stack already on a target has its expiry reset to a full 8s. It never adds a stack, so it cannot climb the curve on its own — it stops the curve falling off.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'Works on void frost', detail: 'Under Black Ice the spray refreshes void frost timers the same way, which keeps the detonation payload topped up.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'Buying this upgrade changes the click for good: the first press of a hold fires the spike, everything after it is slush. Tapping still gets you spikes at the normal rate.',
        'The spray also shoves a Curling Stone, so a mastery build can drive the stone with the same button it maintains frost with.',
      ],
    },

    'frost-blast': {
      basics:
        'A hitscan beam 1200px along your aim, catching anything within 32px of the line and billing '
        + 'every enemy separately. It deals 7.5 damage per frost stack on each target — 8 at one stack, '
        + '38 at five — then strips every stack, dropping their vulnerability back to ×1.00 instantly, '
        + 'and leaves them unable to take a new frost or void stack for 3 seconds. 8s cooldown, and it '
        + 'silently refuses to cast if nobody is carrying stacks.',
      cast: 'E, along the aim line. Hitscan and instant. Silently does not cast if no enemy is carrying stacks.',
      effects: [
        { tag: 'damage', label: 'Per stack', detail: '7.5 damage for every frost stack on the target, rounded — 8 at one stack, 38 at five. It pierces: every enemy near the line is billed separately.' },
        { tag: 'area', label: 'The beam', detail: '1200px along the aim, catching anything within 32px of the line. There is no travel time.' },
        { tag: 'debuff', label: 'Spends everything', detail: 'All frost stacks are removed on hit, and the vulnerability multiplier drops back to ×1.00 the same instant.' },
        { tag: 'cost', label: 'Frost immunity', detail: 'A blasted target cannot take a new frost OR void stack for 3s afterward. Rebuilding the ledger starts from zero, three seconds late.' },
        { tag: 'utility', label: 'Availability', detail: '8s cooldown — the whole rhythm of the element is how many stacks you can bank inside eight seconds.' },
      ],
      upgrade: {
        basics:
          'A full build is no longer spent to the last stack. Blasting at 5 leaves 2 behind, at 3 or 4 '
          + 'leaves 1, and below 3 leaves nothing — the residuals keep their vulnerability, so you restart '
          + 'two steps from ×1.45 instead of five.',
        effects: [
          { tag: 'debuff', label: 'Residual stacks', detail: 'Blasting a target at 5 stacks leaves 2 behind. At 3 or 4 stacks it leaves 1. Below 3 it leaves nothing — the upgrade only pays out on a full build.', requiresUpgrade: 'e' },
          { tag: 'debuff', label: 'Kept multiplier', detail: 'The residual stacks keep their vulnerability, so a 5-stack blast leaves them still at ×1.00 (2 stacks) but two steps from ×1.45 rather than five.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'The 3s frost immunity is applied whether or not anything was left behind, so Frost Linger\'s residual stacks are unusually safe — nothing can be added to them for three seconds either.',
        'Landing this on a target at 5 or more stacks is one of the four Ice Mastery requirements (100 hits).',
      ],
    },

    'block-up': {
      basics:
        'A free toggle with no duration and no drain: incoming damage ×0.75 and move speed ×0.5 until '
        + 'you flip it back. The reduction multiplies with your own frost vulnerability rather than '
        + 'replacing it, so at 5 stacks of frost you sit on ×1.45 × 0.75 = ×1.09. 0.2s between flips.',
      cast: 'R to toggle on, R again to toggle off. 0.2s cooldown between flips — effectively free.',
      effects: [
        { tag: 'shield', label: 'Damage reduction', detail: 'All incoming damage ×0.75 while up. It multiplies with your frost vulnerability rather than replacing it — at 5 stacks of your own frost you are on ×1.45 × 0.75 = ×1.09.' },
        { tag: 'cost', label: 'Move speed', detail: 'Move speed ×0.5 while up. Nothing else in the kit slows you and nothing cancels it but toggling off.' },
        { tag: 'utility', label: 'No duration', detail: 'It stays until you flip it. There is no drain, no cooldown to respect and no cap on how long it runs.' },
      ],
      upgrade: {
        basics:
          'Block Up becomes Black Ice, and the trade inverts: you take ×1.25 damage instead of ×0.75 but '
          + 'lose the 50% speed penalty. Toggling on converts every enemy frost stack to void frost, which '
          + 'deals 1 damage per second per stack and applies no vulnerability at all — a 5-stack target '
          + 'bleeds 5 HP/s. Frost Blast against void frost stops paying 7.5 per stack and instead cashes in '
          + 'every second of damage-over-time the stacks had left, up to 40 from five fresh ones. Toggling '
          + 'off costs 15 self-damage, shrinks you 15% (floor 30% size), shakes the camera and converts '
          + 'every void stack back to ordinary frost. The whole kit runs void while it is on: tinted '
          + 'spikes, void trails, void rinks.',
        effects: [
          { tag: 'cost', label: 'Fragile, not armoured', detail: 'Incoming damage ×1.25 instead of ×0.75, on top of your own frost curve. The 50% move-speed penalty is gone.', requiresUpgrade: 'r' },
          { tag: 'dot', label: 'Void frost', detail: 'Toggling on converts every enemy frost stack into a void frost stack, carrying its remaining duration across. Void frost deals 1 damage per second per stack and applies no vulnerability at all — a 5-stack target bleeds 5 HP/s.', requiresUpgrade: 'r' },
          { tag: 'damage', label: 'Detonation', detail: 'Frost Blast against void frost stops dealing 7.5 per stack and instead pays out every second of DOT the stacks had left, all at once, as one hit. Five fresh stacks are worth up to 40.', requiresUpgrade: 'r' },
          { tag: 'cost', label: 'The way out', detail: 'Toggling off costs 15 self-damage, shrinks your body by 15% (to a floor of 30% size), shakes the camera and shatters the armour. Every void stack on the board converts back to ordinary frost.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Everything runs void', detail: 'Ice Spikes fly tinted, Skate lays void trails, Slush Thrower refreshes void timers, and the icy arenas Skate freezes come out void — the whole kit changes substance rather than colour.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'Void frost caps at 5 like ordinary frost, and the two never coexist on one target — the morph moves them wholesale in both directions.',
        'Void frost does not amplify anything, so a Black Ice build gives up the ×1.45 that makes the rest of your team hit harder in exchange for damage of its own.',
        'Void frost damage — ticks and detonations both — is one of the four Ice Mastery requirements (200 total).',
      ],
    },

    skate: {
      basics:
        'A locked 220 px/s glide in whatever direction you point, steered by the cursor only — WASD '
        + 'does nothing and the turn rate is capped at 3 radians a second. You cut a 32px plate of ice '
        + 'every 80ms, each standing 5 seconds, and anything standing on one has its velocity scaled by '
        + '0.8 every frame (a hard 20% brake that never decays) and takes 1 frost stack every 2s. 3s '
        + 'cooldown, counted from when you stop rather than when you start.',
      cast: 'F to enter skater mode; heading is set from the cursor at launch. F again to stop, which always works even mid-cooldown and starts the 3s cooldown from there.',
      effects: [
        { tag: 'movement', label: 'The glide', detail: 'A locked 220 px/s in whatever direction you are pointed. WASD does nothing — steering is the cursor only, and the turn rate is capped at 3 radians per second.' },
        { tag: 'summon', label: 'Trail plates', detail: 'A 32px-radius plate of ice is cut every 80ms, and each one stands for 5s. At full speed that is a continuous lane about 18px wide per plate step.' },
        { tag: 'control', label: 'Trail slow', detail: 'An enemy standing on any of your plates has their velocity scaled by 0.8 every frame — a hard, immediate 20% brake that does not decay.' },
        { tag: 'debuff', label: 'Trail frost', detail: '1 frost stack every 2s to everything standing on a plate laid while skating. Trails from any other source tick every 1.2s instead.' },
        { tag: 'utility', label: 'Availability', detail: '3s cooldown, measured from when you stop rather than when you start — a long ride is a long cooldown gap.' },
      ],
      upgrade: {
        basics:
          'Your own ice now pushes you: touching a plate you laid grants ×1.2 move speed for 3 seconds, '
          + 'refreshed continuously while you stay on it. Launching a skate out of Block Up also freezes a '
          + '120px rink under you for 5 seconds that lays a frost stack on everything inside every 2s — or '
          + 'a smaller 60px void rink, on the same timings, if you launch it while morphed.',
        effects: [
          { tag: 'buff', label: 'Own-trail speed', detail: 'Touching any plate you laid grants ×1.2 move speed for 3s, refreshed continuously while you stay on your own ice.', requiresUpgrade: 'f' },
          { tag: 'summon', label: 'Skate out of Block Up', detail: 'Starting a skate while Block Up is on freezes a 120px rink under you for 5s that lays 1 frost stack on everything inside it every 2s.', requiresUpgrade: 'f' },
          { tag: 'summon', label: 'Skate out of Black Ice', detail: 'Starting a skate while morphed freezes a smaller 60px void rink instead — same 5s, same 2s cadence, but it stacks void frost.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Skater mode suppresses E, R, Q and the click entirely. You can steer and you can stop; that is the whole moveset while riding.',
        'The plates belong to whoever laid them. Your own ice never slows you, and never freezes you.',
      ],
    },

    'frozen-solid': {
      basics:
        'A 45° cone (±22.5° off your aim) that runs to the arena borders — distance is never a reason '
        + 'it misses — and locks everything it catches for 3 full seconds, unable to move or cast, with '
        + 'their frost timers held. A second cone onto an already-frozen target shatters them instead: '
        + 'the freeze ends and 3 stacks land at once. 12s cooldown.',
      cast: 'Q, aimed at the cursor. Instant, with a 0.9s arm-raise animation that does not delay the effect.',
      effects: [
        { tag: 'control', label: 'Freeze', detail: '3s of total lockdown to everything in the cone. Frozen fighters cannot move or cast, and their frost timers are held for the duration.' },
        { tag: 'area', label: 'The cone', detail: '45° wide (±22.5° off the aim) and unlimited in length — it runs to the arena borders. Distance is never a reason it misses.' },
        { tag: 'debuff', label: 'Against the already-frozen', detail: 'A second cone onto a frozen target shatters them instead: the freeze ends and 3 frost stacks land at once.' },
        { tag: 'utility', label: 'Availability', detail: '12s cooldown — long enough that the 8s Frost Blast is the ability you build the rotation around, not this.' },
      ],
      upgrade: {
        basics:
          'The next projectile to land on a frozen target deals ×1.25, announced with a SHATTER! pop-up. '
          + 'One hit only, and only while they are still frozen — if the 3 seconds run out first the charge '
          + 'is wasted.',
        effects: [
          { tag: 'damage', label: 'Primed hit', detail: 'The next projectile to land on a Frozen Solid target deals ×1.25 damage, announced with a SHATTER! pop-up. One hit only — the priming is consumed.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'Expires with the freeze', detail: 'The priming only pays out while they are still frozen. If the 3s runs out first the charge is wasted.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Shatter Strike rides the projectile hit path, so it is the Ice Spike — or any other shot — that cashes it, not the cone itself.',
        'A 5-stack frozen target hit by a primed spike is taking ×1.45 from frost and ×1.25 from the priming at the same time.',
      ],
    },
  },

  perks: {
    rink: {
      basics:
        'Frozen Solid tiles its cone with ice as well as freezing: 32 plates — 8 distance bands at 4 '
        + 'angles — out to the full 1200px reach, standing 8 seconds and freezing outward from you rather '
        + 'than appearing at once. Rink plates damp velocity by only 1.5% a frame instead of stopping '
        + 'anyone, so both fighters slide on their own momentum. You get ×1.25 move speed on any of your '
        + 'ice and a further ×1.25 for the 2 seconds after starting a Skate — the two multiply to ×1.56.',
      cast: 'Nothing to press. Frozen Solid tiles its cone with rink plates on top of its normal freeze.',
      effects: [
        { tag: 'summon', label: 'The rink', detail: 'Frozen Solid lays 32 plates through its cone — 8 distance bands at 4 angles each, out to the full 1200px reach — for 8s. They freeze outward from you rather than appearing at once.' },
        { tag: 'control', label: 'Slippery for both', detail: 'Anybody standing on a rink plate has their velocity damped by only 1.5% a frame instead of stopping, so both fighters slide across their own momentum.' },
        { tag: 'buff', label: 'Home ice', detail: '×1.25 move speed while you are standing on any of your ice.' },
        { tag: 'buff', label: 'Fresh off the blades', detail: 'A further ×1.25 for the 2s after starting a Skate — the two multiply, so a skate launched onto your own rink is ×1.56.' },
      ],
      notes: [
        'The rink plates are ordinary icy trails, so they also slow enemies 20% and apply frost every 1.2s. The perk is added on top of Frozen Solid, not instead of it.',
      ],
    },
    snow: {
      basics:
        'Q stops freezing anything at all and plants a turret instead. It stands 30 seconds with a '
        + '460px range, tracking its mark and easing its barrel round, eats your Ice Spikes passing '
        + 'within 30px as ammunition up to 5 rounds, and fires one snowball every 5s for 15 damage at 460 '
        + 'px/s, each applying 1 frost stack and a 50% slow for 3 seconds. The 3s lockdown, the shatter '
        + 'bonus and Shatter Strike\'s priming are all gone with it.',
      cast: 'Q plants a turret at the cursor. Frozen Solid no longer freezes anything at all.',
      effects: [
        { tag: 'summon', label: 'The turret', detail: 'Stands 30s with a 460px engagement range and an ammo counter over its head. It tracks its mark and eases its barrel around rather than snapping.' },
        { tag: 'resource', label: 'Loading it', detail: 'Ice Spikes passing within 30px of the turret are eaten as ammunition, up to 5 rounds held.' },
        { tag: 'damage', label: 'Its shot', detail: 'One snowball every 5s for 15 damage at 460 px/s, connecting within 24px of a body.' },
        { tag: 'debuff', label: 'Snowball payload', detail: 'Each hit applies 1 frost stack and a 50% slow for 3s.' },
        { tag: 'cost', label: 'No freeze at all', detail: 'The 3s lockdown, the shatter bonus and Shatter Strike\'s priming are all gone — Q has no crowd control while this perk is equipped.' },
      ],
    },
  },

  mastery: {
    'viral-frost': {
      basics:
        'Frost becomes contagious: an enemy carrying frost or void frost passes 1 matching stack to any '
        + 'other enemy within 40px, at most once per second each, so a tight pack fills up over several '
        + 'seconds rather than instantly. A void carrier spreads void, a frosted one spreads frost, and '
        + 'the spread respects the same immunity windows Frost Blast leaves behind.',
      effects: [
        { tag: 'debuff', label: 'Contact spread', detail: 'An enemy carrying frost or void frost passes 1 matching stack to any other enemy within 40px.' },
        { tag: 'utility', label: 'Catch rate', detail: 'Each enemy can only catch a spread stack once per second, so a tight pack fills up over several seconds rather than instantly.' },
        { tag: 'utility', label: 'Matches the source', detail: 'A void-frosted carrier spreads void frost; a frosted one spreads ordinary frost. The spread respects the same immunity windows Frost Blast leaves behind.' },
      ],
      notes: [
        'Passive — no bind and no key. In a one-on-one match it never fires; it is entirely an Invasion and world-boss enhancement.',
      ],
    },
    'icicle-impale': {
      basics:
        'A bindable 900 px/s charge for 150ms — about 135px — that impales the first enemy within 34px. '
        + 'Once the impaled target has taken 50 more damage from any source the icicle bursts for 2 bonus '
        + 'stacks, and those ignore the normal 5-stack ceiling up to a hard maximum of 7: 6 stacks is '
        + '×1.60 damage taken and 7 is ×1.75, the highest vulnerability the game can produce. While the '
        + 'icicle is live, every stack applied to that target lasts 10 seconds instead of 8. 6s cooldown.',
      cast: 'Bindable to E, R, F or Q. Dashes forward on cast; the first enemy the dash reaches is impaled.',
      effects: [
        { tag: 'movement', label: 'The charge', detail: '900 px/s for 150ms — about 135px of forward travel, connecting with anything within 34px.' },
        { tag: 'debuff', label: 'Shatter payload', detail: 'Once the impaled target has taken 50 more damage from any source, the icicle bursts for 2 bonus frost stacks (or void frost, if you are morphed).' },
        { tag: 'debuff', label: 'Past the cap', detail: 'Those bonus stacks ignore the normal 5-stack ceiling, up to a hard maximum of 7. 6 stacks is ×1.60 damage taken, 7 is ×1.75 — the highest vulnerability the game can produce.' },
        { tag: 'debuff', label: 'Slower decay', detail: 'While the icicle is live, every frost or void stack applied to that target lasts 10s instead of 8.' },
        { tag: 'utility', label: 'Availability', detail: '6s cooldown, independent of the slot it is bound over.' },
      ],
      notes: [
        'On a void build the bonus stacks are void frost, so 7 stacks is 7 damage a second rather than a vulnerability multiplier.',
        'Only one enemy per dash is impaled — the charge stops looking after the first connection.',
      ],
    },
    'curling-stone': {
      basics:
        'A bindable 18px stone that stands 20 seconds with a 32px contact radius, bouncing off walls '
        + 'and driven by your own shots. Each shot that reaches it shoves it and loads 1 frost stack, to '
        + 'a maximum of 5. It slams for 30 damage at 0 stacks scaling +20% per stack to 60 at 5, pushes '
        + '150 at 0 stacks and +62 per stack, and can only hit the same fighter once a second. Below 26 '
        + 'px/s it counts as parked and is harmless. Crossing one of your own Skate trails accelerates it '
        + '×3.2 and drops its drag to 0.4, so a trail laid ahead of it is a launch ramp. 25s cooldown.',
      cast: 'Bindable to E, R, F or Q. Summons a stone in front of you; your own shots and slush spray drive it.',
      effects: [
        { tag: 'summon', label: 'The stone', detail: 'An 18px slab standing 20s, with a 32px contact radius. It bounces off the arena walls and spins visibly as it rolls.' },
        { tag: 'resource', label: 'Loading it', detail: 'Each of your shots that reaches the stone shoves it and adds 1 frost stack, up to 5. Void frost counts identically. A piercing spike only counts once per shot.' },
        { tag: 'damage', label: 'The slam', detail: '30 damage at 0 stacks, scaling +20% per stack to 60 at 5. Each fighter can only be hit once per second by the same stone.' },
        { tag: 'movement', label: 'The shove', detail: '150 push at 0 stacks, +62 per stack — a fully loaded stone is shoved more than three times as far by the same shot.' },
        { tag: 'utility', label: 'Parked is harmless', detail: 'Below 26 px/s the stone counts as stopped: it deals no damage and takes no chips. It is a hazard only while moving.' },
        { tag: 'movement', label: 'On your own ice', detail: 'A stone that crosses one of your Skate trails accelerates by ×3.2 and its drag drops to 0.4 — a trail laid ahead of the stone is a launch ramp.' },
        { tag: 'utility', label: 'Availability', detail: '25s cooldown, so there is rarely more than one stone in play.' },
      ],
      notes: [
        'Slush Thrower nudges the stone too, which is the cheapest way to keep it rolling without spending spike cooldowns.',
        'The stone is owner-agnostic in the simulation, so an online opponent\'s stone rolls on your screen exactly as it does on theirs.',
      ],
    },
  },
};

export default ice;
