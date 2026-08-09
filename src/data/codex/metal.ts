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
      magic:
        'A red gauge under the health bars, filled by the mess you make. Every fifty points of '
        + 'damage you deal opens the wound wide enough to leave a pool on the ground where they '
        + 'were standing — and pools are not damage, they are stock. Walk over one and it drains '
        + 'into you.',
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
      magic:
        'A wound that will not close. The victim ticks down and keeps dropping pools behind them '
        + 'as they run — pools that belong to whoever opened them, so a bleeding opponent is '
        + 'painting the arena with your ammunition.',
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
      magic:
        'A sword. Actually a sword — a hilt, a crossguard and a length of steel swept through the '
        + 'aim with a crescent of torn air chasing the tip. It is the most ordinary attack in the '
        + 'game and it is also this element\'s only reliable way of putting blood on the floor.',
      cast: 'Click, swept along the aim. Instant.',
      effects: [
        { tag: 'damage', label: 'The swing', detail: '25 damage to everything within 90px of you along the arc.' },
        { tag: 'control', label: 'Knockback', detail: '350 of velocity directly away from you, zeroed again after 200ms.' },
        { tag: 'utility', label: 'Availability', detail: '0.6s cooldown.' },
        { tag: 'utility', label: 'Whips the flail', detail: 'A click while aiming within 30° of your idle flail head sets it swinging instead of only slashing.' },
      ],
      upgrade: {
        magic:
          'Mighty Sabre turns the swing into a wind-up. Gold light gathers around the blade as you '
          + 'hold, orbs collect, and at three full seconds the whole character goes yellow — and '
          + 'then the release is not just a bigger number but a duelist\'s move: the flail is '
          + 'thrown at the cursor and every shot in the air near you is batted back at its owner.',
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
      magic:
        'A head forged on the spot and hung off a chain that trails south of you. Left alone it just '
        + 'follows you around. Aim at it and click and it starts going round — and every further '
        + 'whip drives it faster, up to a point where the head is glowing and the chain is a blur. '
        + 'Then it bleeds speed, and speed is the only thing that makes it dangerous.',
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
        magic:
          'Heavy Metal Rock swaps the head for a black spiked mace on a shorter chain. It is harder '
          + 'to get going and it will not stay going, but what it does on contact is twice what the '
          + 'iron head does — and past about two thirds speed it goes molten and starts dripping '
          + 'fire on the floor as it flies.',
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
      magic:
        'Putting it back. The caster opens the bar straight into their own body — thirty points a '
        + 'second, one for one, dripping the whole time — and it simply keeps going until the bar '
        + 'is empty or the key comes up. No cooldown, no cast, no cap on how much of a fight it can '
        + 'undo.',
      cast: 'Hold R. Drains continuously per frame; stops the instant the bar hits zero.',
      effects: [
        { tag: 'heal', label: 'The rate', detail: '30 blood per second converted to 30 HP per second, exactly 1:1. A full bar is 100 HP of healing.' },
        { tag: 'utility', label: 'Free', detail: 'No cooldown and no lock — you can walk, and you can stop and restart at will.' },
        { tag: 'cost', label: 'The real cost', detail: 'The bar is the same bar Clot Armor and Blood Blade need. Healing with it is choosing not to have armour.' },
      ],
      upgrade: {
        magic:
          'Blood Clottage catches the overflow. Once the bar is full, blood you keep collecting has '
          + 'nowhere to go — so it goes into the health you already have, turning it dark red. You '
          + 'gain no extra points; the points you have simply become much harder to take away.',
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
      magic:
        'A hook on a chain, thrown overhand. It bites in and snaps taut, and for five seconds the '
        + 'other fighter cannot get further than a body length from you — they are physically '
        + 'repositioned back onto the leash, not merely slowed. And they are bleeding the whole '
        + 'time, dropping pools you can stand on afterwards.',
      cast: 'F, thrown at the cursor. Instant. The chain travels; nothing happens until it connects.',
      effects: [
        { tag: 'utility', label: 'The throw', detail: '520 px/s in a straight line, connecting within 28px. It dies at the arena edge.' },
        { tag: 'control', label: 'The leash', detail: '5 seconds during which the target is snapped back to 80px from you the moment they exceed it. It is a hard reposition every frame, not a pull.' },
        { tag: 'dot', label: 'Bleeding', detail: '3 seconds of Aggressive Bleeding — 2 damage a second and a pool every 3s.' },
        { tag: 'summon', label: 'Drag pools', detail: '3 blood puddles dropped on the target over the 5 seconds, one every 1.67s, on top of the bleed\'s own.' },
        { tag: 'utility', label: 'Availability', detail: '9.6s cooldown.' },
      ],
      upgrade: {
        magic:
          'Ground Anchor drives the hook into the floor instead of into a person. Hold F for three '
          + 'seconds and a stake goes into the ground at the cursor and stays there for twelve — '
          + 'pulsing a wide white shockwave that reaches into every pool of blood nearby and hauls '
          + 'it back to you. It is the harvest, and it is why blood on the far side of the arena is '
          + 'still worth something.',
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
      magic:
        'The whole bar slammed shut into plate. Blood clots over the body as armour, worth more '
        + 'than the blood that went into it — and it is not quiet armour. Every twenty-five points '
        + 'of it that come off blow outward as a spray of hardened shards in random directions, '
        + 'each one opening a fresh pool wherever it lands.',
      cast: 'Q. Instant. Refuses to cast on an empty bar.',
      effects: [
        { tag: 'shield', label: 'The plate', detail: 'Shield HP equal to 1.25× your blood — a full 100 bar is 125 shield. The whole bar is consumed.' },
        { tag: 'damage', label: 'Shard bursts', detail: 'Every 25 shield HP lost fires 5 shards at 10 damage each, at 420 px/s in random directions.' },
        { tag: 'summon', label: 'Shards make pools', detail: 'Each shard that connects spawns a blood puddle where it hit — armour taken off you is ammunition put back on the floor.' },
        { tag: 'cost', label: 'No regeneration', detail: 'Once the plate is gone it stays gone. Recasting replaces the whole thing rather than topping it up, discarding whatever was left.' },
        { tag: 'utility', label: 'Availability', detail: '40s cooldown.' },
      ],
      upgrade: {
        magic:
          'Blood Blade is what a hundred blood buys instead. Hold Q and a serrated blade falls out '
          + 'of the sky and lands point first hard enough to split the floor — and then it is your '
          + 'sword. It swings faster the more blood you are carrying, its hits pour blood directly '
          + 'into the bar rather than onto the ground, and it disappears the instant you spend any. '
          + 'While it is out, everything hurts you half again as much.',
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
      magic:
        'Exsanguinate. The seams of the armour fail wider and the pools run further — the same '
        + 'ability set, tuned so that everything metal spills is worth more of the bar it is '
        + 'trying to fill.',
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
      magic:
        'The body stops bothering to bleed for small things. Nothing under three points gets '
        + 'through at all — chip damage, weak burns and slow poisons simply stop being events that '
        + 'happen to you.',
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
      magic:
        'A plate of steel planted in the air in front of you, tracking your cursor. Shots stop dead '
        + 'on the face of it, and everything that does get past hurts you a quarter less. Cast it '
        + 'while you are wearing Clot Armor and the plate comes up red — and then every shot it '
        + 'eats is answered with a full spray of blood shards.',
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
