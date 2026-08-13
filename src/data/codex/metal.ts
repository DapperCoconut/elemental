import { ElementCodex } from '../AbilityCodex';

/**
 * Metal — a butcher with a blood bar.
 *
 * Verified against `src/elements/metal.ts`, `kits/MetalKit.ts`, the metal block of
 * `data/Upgrades.ts`, the Exsanguinate perk in `data/Perks.ts` and Metal Mastery in
 * `data/Mastery.ts`. Numbers here are the ones the kit actually applies.
 */
const metal: ElementCodex = {
  identity:
    'Steel that runs on other people. Everything metal does spills blood onto the floor, and every '
    + 'pool of it is a resource you walk over to collect — into a bar that becomes health, or plate '
    + 'armour, or a sword out of the sky. It is the only element that has to physically stand where '
    + 'it has already been winning in order to keep winning.',

  passives: [
    {
      emoji: '🩸',
      name: 'The Blood Bar',
      basics:
        'Metal\'s resource. Every 50 cumulative damage you deal, by any means, drops a 30px blood puddle '
        + 'at the victim; standing within 48px of one of your own drains 10 blood a second into a bar '
        + 'that runs 0 to 100, and each puddle holds 25 — two and a half seconds of standing on it. Only '
        + 'the owner can drain a puddle, so an opponent bleeding on your floor is filling your bar and '
        + 'not theirs. Blood Transfusion spends it 1:1 for health, Clot Armor spends all of it for shield '
        + 'at 1.25×, Blood Blade costs the whole 100 and Steel Shield costs 25.',
      effects: [
        { tag: 'summon', label: 'Puddles from damage', detail: 'One 30px blood puddle spawned at the victim for every 50 cumulative damage you deal, by any means.' },
        { tag: 'resource', label: 'Collecting', detail: 'Standing within 48px of one of your own puddles drains 10 blood per second into the bar. Each puddle holds 25 blood — 2.5 seconds of standing on it.' },
        { tag: 'resource', label: 'The bar', detail: '0 to 100. Blood Transfusion spends it 1:1 for health, Clot Armor spends all of it for shield at 1.25×, Blood Blade costs the whole 100, and Steel Shield costs 25.' },
        { tag: 'utility', label: 'Puddles are owned', detail: 'Only their owner can drain a puddle. An opponent bleeding on your floor is filling your bar, not theirs.' },
      ],
      notes: [
        'A puddle disappears when its 25 blood is gone, not on a timer, so an uncollected pool sits there for the whole match.',
        'With the Exsanguinate quad perk every puddle from every source is 50% bigger, which is a bigger collection radius rather than more blood.',
      ],
    },
    {
      emoji: '🗡️',
      name: 'Aggressive Bleeding',
      basics:
        '2 damage every second for as long as it runs, plus a blood puddle at the victim\'s feet every 3 '
        + 'seconds, owned by whoever applied it. A second application refreshes rather than stacks — the '
        + 'timer extends to the later of the two and the tick does not double.',
      effects: [
        { tag: 'dot', label: 'The tick', detail: '2 damage every 1 second for as long as it runs.' },
        { tag: 'summon', label: 'Trail of pools', detail: 'A blood puddle dropped at the victim\'s feet every 3 seconds, owned by whoever applied the bleed.' },
        { tag: 'utility', label: 'Refreshes, does not stack', detail: 'A second application extends the timer to the later of the two rather than doubling the tick.' },
      ],
      notes: [
        'The Slash ability card says it applies this. It does not — in the kit only a landed Chain Tether does, for 3 seconds.',
      ],
    },
  ],

  abilities: {
    'metal-slash': {
      basics:
        'A 25-damage sweep of everything within 90px along your aim, throwing them 350 of velocity '
        + 'directly away from you and zeroing it again after 200ms. A click aimed within 30° of your idle '
        + 'flail head also sets the flail swinging instead of only slashing. 0.6s cooldown.',
      cast: 'Click, swept along the aim. Instant.',
      effects: [
        { tag: 'damage', label: 'The swing', detail: '25 damage to everything within 90px of you along the arc.' },
        { tag: 'control', label: 'Knockback', detail: '350 of velocity directly away from you, zeroed again after 200ms.' },
        { tag: 'utility', label: 'Availability', detail: '0.6s cooldown.' },
        { tag: 'utility', label: 'Whips the flail', detail: 'A click while aiming within 30° of your idle flail head sets it swinging instead of only slashing.' },
      ],
      upgrade: {
        basics:
          'Click becomes chargeable: 25 damage at a tap scaling linearly to 75 at a 3-second hold, with '
          + 'the charge visual reading the whole way up, and a swing over 40 damage reaching 104px across a '
          + '130° arc instead of 90px. A max-charge release also hurls your idle flail head at the cursor '
          + 'at 700 px/s for 40 damage — 60 for the heavy mace — consuming the flail, and destroys every '
          + 'enemy projectile within 130px, dealing the opponent 1.5× each of those projectiles\' own '
          + 'damage.',
        effects: [
          { tag: 'damage', label: 'Charged swing', detail: 'Damage scales linearly from 25 at a tap to 75 at a 3s hold. The charge visual reads the whole way up.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'Flail launch', detail: 'A max-charge release hurls your idle flail head at the cursor at 700 px/s for 40 damage (60 for the E+ heavy mace), consuming the flail.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'Parry', detail: 'A max-charge release destroys every enemy projectile within 130px and deals 1.5× that projectile\'s own damage to the opponent for each one.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'Bigger arc', detail: 'A swing over 40 damage reaches 104px instead of 90 and sweeps a 130° arc rather than the default.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'Parries are the mastery\'s Duelist requirement — 25 of them — and only a full 3s charge counts.',
        'The Conduit divine perk runs the blade live: all metal damage ×1.3, and the sabre sheds charge off its edge as it comes round.',
        'The Gold divine perk replaces the sword with a dagger — a 34-damage thrust inside 62px, and a held Click+ becomes a 5-stab flurry of 16 each, 90ms apart.',
      ],
    },

    'metal-flail-craft': {
      basics:
        'Forges a flail head that trails 70px behind you at rest and orbits at 95px while swinging, '
        + 'dying 10 seconds after it is made whether or not you use it. Contact within 30px deals 3 '
        + 'damage at a crawl up to 13 at full spin, read live off how fast it is going, on a 250ms '
        + 'cooldown. The first whip sets 9 rad/s in a random direction and every further whip adds 5.4 up '
        + 'to a cap of 24, restarting the decay; spin bleeds linearly to zero over 3.33 seconds from the '
        + 'last whip, after which it hangs idle. 25s cooldown, the longest non-ultimate in the kit.',
      cast:
        'E to forge. Click while aiming within 30° of the head to start it swinging, and again to '
        + 'accelerate it.',
      effects: [
        { tag: 'summon', label: 'The flail', detail: 'One head, trailing 70px behind you at rest and orbiting at 95px while swinging. It dies 10 seconds after being forged, swinging or not.' },
        { tag: 'damage', label: 'Contact', detail: '3 damage at a crawl up to 13 at full spin, inside 30px of the head, on a 250ms cooldown. The figure is read live off how fast it is going.' },
        { tag: 'resource', label: 'Spin-up', detail: 'The first whip sets 9 rad/s in a random direction. Every further whip adds 5.4 rad/s up to a cap of 24 and restarts the decay.' },
        { tag: 'cost', label: 'Spin-down', detail: 'Speed decays linearly to zero over 3.33 seconds from the last whip. It then hangs idle until the 10s lifetime runs out.' },
        { tag: 'utility', label: 'Availability', detail: '25s cooldown — the longest non-ultimate in the kit.' },
      ],
      upgrade: {
        basics:
          'A heavy mace: exactly double damage at every speed, 6 at a crawl to 26 at full spin. It is '
          + 'harder to wind — 2.7 rad/s a whip instead of 5.4, decaying over 1.67 seconds instead of 3.33 — '
          + 'and the chain is 75% as long, 52px idle and 71px swinging, so it reaches less far but is '
          + 'easier to keep on a target. Above 60% spin the head goes orange and drops an 18px fire puddle '
          + 'every 150ms along its path, each lasting 3 seconds.',
        effects: [
          { tag: 'damage', label: 'Double damage', detail: '6 at a crawl up to 26 at full spin — exactly twice the plain head at every speed.', requiresUpgrade: 'e' },
          { tag: 'cost', label: 'Harder to wind', detail: 'Each whip adds 2.7 rad/s instead of 5.4, and the spin decays over 1.67 seconds instead of 3.33.', requiresUpgrade: 'e' },
          { tag: 'area', label: 'Shorter chain', detail: 'Radius drops to 75% — 52px idle, 71px swinging — so it reaches less far but is easier to keep on a target.', requiresUpgrade: 'e' },
          { tag: 'dot', label: 'Molten drip', detail: 'Above 60% spin the head goes orange and drops an 18px fire puddle every 150ms along its path, each lasting 3 seconds.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'Flail hits are the mastery\'s Flail Master requirement — 150 of them.',
        'A max-charge Mighty Sabre throws the flail away as a 40 (or 60) damage projectile, which is usually worth more than the remaining spin.',
      ],
    },

    'metal-blood-transfusion': {
      basics:
        'Hold R to convert blood to health at exactly 1:1, 30 a second, so a full bar is 100 HP. No '
        + 'cooldown, no lock, and you can stop and restart at will. The real cost is that it is the same '
        + 'bar Clot Armor and Blood Blade need — healing with it is choosing not to have armour.',
      cast: 'Hold R. Drains continuously per frame; stops the instant the bar hits zero.',
      effects: [
        { tag: 'heal', label: 'The rate', detail: '30 blood per second converted to 30 HP per second, exactly 1:1. A full bar is 100 HP of healing.' },
        { tag: 'utility', label: 'Free', detail: 'No cooldown and no lock — you can walk, and you can stop and restart at will.' },
        { tag: 'cost', label: 'The real cost', detail: 'The bar is the same bar Clot Armor and Blood Blade need. Healing with it is choosing not to have armour.' },
      ],
      upgrade: {
        basics:
          'Blood gained past a full bar now converts an equal amount of normal HP into clotted HP, '
          + 'leaving your total unchanged. Clotted HP takes 50% less damage and is always spent first, so a '
          + '50-damage hit eats 25 clotted and 25 real, and it is drawn as its own dark red segment of the '
          + 'health bar so both fighters can see how much is left.',
        effects: [
          { tag: 'shield', label: 'Clotted health', detail: 'Blood gained past a full bar converts an equal amount of normal HP into clotted HP. Total health is unchanged.', requiresUpgrade: 'r' },
          { tag: 'shield', label: 'Half price', detail: 'Clotted HP takes 50% less damage, and is always spent before normal HP — so a 50-damage hit eats 25 clotted and 25 real.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'It shows', detail: 'Clotted health is drawn as its own dark red segment of the health bar, so both fighters can see how much of it is left.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'Healing this way is the mastery\'s Blood Doctor requirement — 500 HP restored.',
        'Under the Conduit divine perk transfusing also burns away maximum HP at 6 per second — but only the empty part of the bar, so it can never undo the healing it just did.',
      ],
    },

    'metal-chain-tether': {
      basics:
        'Throws a chain at 520 px/s that connects within 28px and dies at the arena edge. On a hit it '
        + 'leashes for 5 seconds, snapping the target back to 80px from you the instant they exceed it — '
        + 'a hard reposition every frame rather than a pull — and applies 3 seconds of Aggressive '
        + 'Bleeding, 2 damage a second with a pool every 3s. Three more blood puddles are dropped on them '
        + 'over the leash, one every 1.67 seconds. 9.6s cooldown.',
      cast: 'F, thrown at the cursor. Instant. The chain travels; nothing happens until it connects.',
      effects: [
        { tag: 'utility', label: 'The throw', detail: '520 px/s in a straight line, connecting within 28px. It dies at the arena edge.' },
        { tag: 'control', label: 'The leash', detail: '5 seconds during which the target is snapped back to 80px from you the moment they exceed it. It is a hard reposition every frame, not a pull.' },
        { tag: 'dot', label: 'Bleeding', detail: '3 seconds of Aggressive Bleeding — 2 damage a second and a pool every 3s.' },
        { tag: 'summon', label: 'Drag pools', detail: '3 blood puddles dropped on the target over the 5 seconds, one every 1.67s, on top of the bleed\'s own.' },
        { tag: 'utility', label: 'Availability', detail: '9.6s cooldown.' },
      ],
      upgrade: {
        basics:
          'Holding F a full 3 seconds plants an anchor instead — releasing early still casts the ordinary '
          + 'tether. The stake stands 12 seconds, one at a time with a second replacing the first, and '
          + 'deals nothing to anybody: every 1.5 seconds it blasts out to 150px and pulls up to 15 blood '
          + 'from each of your puddles inside that radius straight into your bar, eight pulses over its '
          + 'life. It is pure collection.',
        effects: [
          { tag: 'cost', label: 'The charge', detail: 'F must be held a full 3 seconds. Releasing early instead casts the ordinary Chain Tether at the cursor.', requiresUpgrade: 'f' },
          { tag: 'summon', label: 'The stake', detail: '12 seconds planted at the cursor. Only one exists at a time; a second anchor replaces the first.', requiresUpgrade: 'f' },
          { tag: 'resource', label: 'The pulse', detail: 'Every 1.5 seconds it blasts out to 150px and pulls up to 15 blood from *each* of your puddles inside that radius, straight into your bar — 8 pulses over its life.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'No damage', detail: 'The anchor deals nothing to anybody. It is pure collection.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'The upgrade card says the blast is every 3s for 10 blood. The kit pulses every 1.5s for up to 15 per puddle.',
        'Because the pulse takes 15 from every puddle in range at once, standing an anchor in the middle of a mess is worth far more than walking the pools one at a time.',
      ],
    },

    'metal-clot-armor': {
      basics:
        'Consumes your whole blood bar for shield HP at 1.25× — a full 100 is 125 shield. Every 25 '
        + 'shield HP lost fires 5 shards at 10 damage each, 420 px/s in random directions, and each shard '
        + 'that connects spawns a blood puddle where it hit, so armour taken off you is ammunition put '
        + 'back on the floor. There is no regeneration: once the plate is gone it is gone, and recasting '
        + 'replaces the whole thing rather than topping it up, discarding whatever was left. 40s '
        + 'cooldown, refused on an empty bar.',
      cast: 'Q. Instant. Refuses to cast on an empty bar.',
      effects: [
        { tag: 'shield', label: 'The plate', detail: 'Shield HP equal to 1.25× your blood — a full 100 bar is 125 shield. The whole bar is consumed.' },
        { tag: 'damage', label: 'Shard bursts', detail: 'Every 25 shield HP lost fires 5 shards at 10 damage each, at 420 px/s in random directions.' },
        { tag: 'summon', label: 'Shards make pools', detail: 'Each shard that connects spawns a blood puddle where it hit — armour taken off you is ammunition put back on the floor.' },
        { tag: 'cost', label: 'No regeneration', detail: 'Once the plate is gone it stays gone. Recasting replaces the whole thing rather than topping it up, discarding whatever was left.' },
        { tag: 'utility', label: 'Availability', detail: '40s cooldown.' },
      ],
      upgrade: {
        basics:
          'Holding Q for half a second draws the Blood Blade instead — it needs a full 100 blood, '
          + 'consumes all of it, and spends the Q cooldown, while a shorter tap is still ordinary Clot '
          + 'Armor. It replaces Slash with a 25-damage swing across a 150px frontal arc, far longer than '
          + 'the 90px sword, at an interval of 700ms minus 4ms per point of blood held, floored at 200ms, '
          + 'so a refilled bar swings three and a half times as often. While it is out, every 50 damage you '
          + 'deal adds 25 blood straight to the bar instead of leaving a puddle. The price is steep: you '
          + 'take 1.5× damage from everything, and the blade vanishes the moment your blood drops for any '
          + 'reason at all, transfusing included.',
        effects: [
          { tag: 'cost', label: 'Cost and gate', detail: 'Hold Q for 0.5s. Needs a full 100 blood and consumes all of it, and it spends the Q cooldown. A tap under 0.5s is the ordinary Clot Armor.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'The swing', detail: '25 damage in a 150px frontal arc, replacing the ordinary Slash. It reaches much further than the 90px sword.', requiresUpgrade: 'q' },
          { tag: 'buff', label: 'Faster with blood', detail: 'Swing interval is 700ms minus 4ms per point of blood held, floored at 200ms — so a refilled bar swings 3.5× as often.', requiresUpgrade: 'q' },
          { tag: 'resource', label: 'Blood, not pools', detail: 'While it is out, every 50 damage you deal adds 25 blood straight to the bar instead of leaving a puddle.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'Fragile and costly', detail: 'You take 1.5× damage from everything while it is equipped, and it vanishes the moment your blood drops for any reason at all — including transfusing.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Killing with the blade is the mastery\'s Forbidden Reaper requirement — 5 kills.',
        'With the Exsanguinate quad perk every burst is 8 shards instead of 5, and all blood puddles are 50% bigger.',
        'The blade and Clot Armor share the Q cooldown, so summoning one costs you the other for 40 seconds.',
      ],
    },
  },

  perks: {
    gunpowder: {
      basics:
        'Clot Armor and the mastery\'s red Steel Shield fire 8 shards a burst instead of 5, at the same '
        + '10 damage each, and every blood puddle from every source is 50% larger — 45px instead of 30 — '
        + 'so each is collected from a wider stand. A larger pool still holds the same 25 blood: the gain '
        + 'is reach, not volume.',
      effects: [
        { tag: 'damage', label: 'Wider bursts', detail: 'Clot Armor and the mastery\'s red Steel Shield fire 8 shards per burst instead of 5, at the same 10 damage each.' },
        { tag: 'resource', label: 'Bigger pools', detail: 'Every blood puddle from every source is 50% larger — 45px instead of 30 — so each one is collected from a wider stand.' },
        { tag: 'utility', label: 'Same capacity', detail: 'A larger pool still holds the same 25 blood. The gain is reach, not volume.' },
      ],
      notes: [
        'The perk\'s ingredients are electricity, fate, sound and light.',
      ],
    },
  },

  mastery: {
    'natural-clot': {
      basics:
        'Every hit you take is reduced by a flat 3, from every source, so anything of 3 or less deals '
        + 'nothing at all. No key, no cooldown, no cost, and it applies before every other reduction in '
        + 'the kit.',
      effects: [
        { tag: 'shield', label: 'Flat reduction', detail: 'Every hit you take is reduced by 3, from every source. Anything of 3 or less deals nothing.' },
        { tag: 'utility', label: 'Always on', detail: 'No key, no cooldown, no cost, and it applies before every other reduction in the kit.' },
      ],
      notes: [
        'This is the passive half of Metal Mastery — it needs no bind and no key.',
        'It is at its most valuable against damage-over-time: a 2-per-second bleed against a mastered metal fighter is a 0-per-second bleed.',
      ],
    },
    'steel-shield': {
      basics:
        'A bindable plate that costs 25 blood — a quarter of a full bar, and refused below that — '
        + 'planted 46px ahead along your aim and following your cursor for the 5 seconds it stands. Any '
        + 'enemy projectile within 38px of it is destroyed outright, and it has no HP so it cannot be '
        + 'broken. While it is up all damage you take is multiplied by 0.75, whether or not the plate is '
        + 'between you and the source. Cast while Clot Armor is active it comes out red, and every shot '
        + 'it blocks fires a full 5-shard burst at 10 damage each — 8 with Exsanguinate. 8s cooldown.',
      cast:
        'Bindable to E, R, F or Q, replacing that slot\'s base ability for the match. Plants 46px '
        + 'ahead of you along the aim and follows the cursor while it stands.',
      effects: [
        { tag: 'resource', label: 'Cost', detail: '25 blood — a quarter of a full bar. Refuses to cast below that.' },
        { tag: 'shield', label: 'Blocking', detail: 'Any enemy projectile within 38px of the plate is destroyed outright. It has no HP and cannot be broken.' },
        { tag: 'shield', label: 'Damage reduction', detail: 'All damage you take is multiplied by 0.75 for the whole 5 seconds it stands, whether or not the plate is between you and it.' },
        { tag: 'damage', label: 'Red steel', detail: 'Cast while Clot Armor is active, every shot the plate blocks fires a full 5-shard burst at 10 damage each — 8 with the Exsanguinate perk.' },
        { tag: 'utility', label: 'Availability', detail: '5s duration, 8s cooldown, independent of whichever slot it is bound over.' },
      ],
      notes: [
        'The red version is decided at cast time. Losing Clot Armor afterwards does not turn the plate back to steel, and raising it afterwards does not turn it red.',
        'Under the Conduit divine perk the plate is earthed, so a blocked shot also earths 5 damage back into whoever fired it.',
      ],
    },
  },
};

export default metal;
