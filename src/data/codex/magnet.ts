import { ElementCodex } from '../AbilityCodex';

/**
 * Magnet — four bars of iron and five ways to throw them.
 *
 * Verified against `src/elements/magnet.ts`, `kits/MagnetKit.ts`, the magnet block of
 * `data/Upgrades.ts`, the Blade perk in `data/Perks.ts` and Magnet Mastery in
 * `data/Mastery.ts`. Numbers here are the ones the kit actually applies.
 */
const magnet: ElementCodex = {
  identity:
    'An element that fights with furniture. Four iron rods sit in the corners of the arena from the '
    + 'first frame and never leave; every key is a different way of moving them, or of making the '
    + 'other fighter something they fall toward. Its own numbers are small — a rod is 8, a nail is '
    + '18 — and it wins by having five separate forces acting on the same pile of metal at once.',

  passives: [
    {
      emoji: '🔩',
      name: 'The Rods',
      magic:
        'Four machined bars of iron, one in each corner, there before anybody has cast anything. '
        + 'They are not projectiles — they are objects with momentum, smearing along their heading '
        + 'when thrown, bouncing off the arena walls, shoving each other apart when they collide, '
        + 'and grinding to a halt on friction if nothing is pulling them.',
      effects: [
        { tag: 'summon', label: 'Four bars', detail: 'Spawned 80px in from each corner at the start of every magnet match. They belong to whichever fighter is playing magnet and never expire.' },
        { tag: 'damage', label: 'Contact', detail: '8 damage to an enemy within 28px of a moving rod, with a 500ms per-rod, per-target cooldown. A rod that has slowed below 30 px/s deals nothing at all.' },
        { tag: 'utility', label: 'Physics', detail: '12% of speed lost per frame to friction, hard bounces off all four walls, and rods pushed 26px apart with their velocities swapped when they touch.' },
        { tag: 'buff', label: 'While bouncing', detail: 'A rod launched by the Atom Smasher deals double — 16 — and keeps 99.5% of its speed per frame for the 3s window instead of 88%.' },
      ],
      notes: [
        'The Mag Pulse ability card claims 20 damage per rod. The kit deals 8, doubled to 16 only during an Atom Smasher bounce window.',
        'It also claims two colliding rods make a large area blast. They do not — a collision only separates them and swaps their velocities.',
        'With the Blade perk every rod is a sword instead: 16 base damage, thrown at 1360 px/s by a pulse rather than 680, and pulled twice as hard by a magnetised target.',
      ],
    },
  ],

  abilities: {
    'mag-pulse': {
      magic:
        'A point of attraction thrown onto the floor at the cursor. Field lines spring out of it, '
        + 'iron filings kick up, and every rod within reach drops whatever it was doing and comes '
        + 'straight at it — through anything standing in the way. The pulse itself does nothing; '
        + 'the damage is entirely a question of what was lying between the rod and the mark.',
      cast: 'Click, placed at the cursor. Instant.',
      effects: [
        { tag: 'utility', label: 'Rod call', detail: 'Every rod you own within 380px of the mark is launched at it at 680 px/s (1360 with the Blade perk).' },
        { tag: 'damage', label: 'What it costs them', detail: 'The damage is the rods\': 8 per contact, 28px reach, 500ms per-rod cooldown. Four rods converging on one point is up to 32.' },
        { tag: 'control', label: 'Dragging the nailed', detail: 'An enemy carrying your nails is hauled toward the mark for 350ms at 220 px/s, plus 140 more per extra nail — 500 px/s with three in them.' },
        { tag: 'movement', label: 'Magnet Dash', detail: 'With Protect orbs up and the mark within 380px, you are pulled to it instead at 1200 px/s, invincible for the 40–320ms of travel.' },
        { tag: 'utility', label: 'Availability', detail: '0.8s cooldown — the only ability here you can lean on.' },
      ],
      upgrade: {
        magic:
          'Repulse is the same field with the polarity reversed, and it lives on the other mouse '
          + 'button so you keep both. Everything metal near you is thrown outward instead of pulled '
          + 'in — which is how you turn a defensive orb shell into a shove, and how you get a nailed '
          + 'enemy off you rather than onto the rods.',
        effects: [
          { tag: 'utility', label: 'Rods flung out', detail: 'Right-click. Every rod you own within 320px is thrown directly away from you at 680 px/s.', requiresUpgrade: 'click' },
          { tag: 'control', label: 'Nail shove', detail: 'An enemy carrying any of your nails is knocked directly away from you at 500 velocity.', requiresUpgrade: 'click' },
          { tag: 'control', label: 'Orb ring shove', detail: 'An enemy standing within 80px of you while your Protect orbs are up is knocked away at 600 velocity — the harder of the two shoves.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'The dash is invincible but the orbs are not spent by it — the shell rides along.',
        'Rods keep travelling after the pulse; they are not stopped by reaching the mark, only by friction and walls.',
        'The 20% speed buff the dash is supposed to leave behind is recorded but never read by anything, so no speed bonus is actually applied.',
      ],
    },

    'nail-implant': {
      magic:
        'A single iron nail thrown flat and driven home. It stays in — for ten full seconds you have '
        + 'a tether into the other fighter, drawn as a field line running from the wound back to '
        + 'your hand, quietly hauling them toward you the whole time. Pressing the key again does '
        + 'not throw a second one; it rips the first back out.',
      cast: 'E to throw. E again while one is implanted to recall it. Cannot be thrown while one is in flight or in a body.',
      effects: [
        { tag: 'damage', label: 'Impact', detail: '18 damage on a hit inside 24px, at 520 px/s.' },
        { tag: 'debuff', label: 'Implanted', detail: 'Sticks for 10 seconds. While it is in, the victim is pulled toward you at +180 px/s of added velocity per second whenever they are more than 80px away.' },
        { tag: 'damage', label: 'Recall', detail: 'A second press tears it out for another 18 damage and refunds 2 seconds of the cooldown.' },
        { tag: 'utility', label: 'Availability', detail: '3s cooldown on the throw; the recall is free and instant.' },
      ],
      upgrade: {
        magic:
          'Nail Barrage stops making you choose. Three gold nails leave the hand in a tight fan, and '
          + 'every one that lands makes the tether stronger — the pull is no longer a nuisance but a '
          + 'genuine drag, and every ability that reads "how many nails are in them" gets a bigger '
          + 'number to read.',
        effects: [
          { tag: 'damage', label: 'Three nails', detail: '3 gold nails at ±6° from the aim, 18 damage each — 54 if the whole fan lands.', requiresUpgrade: 'e' },
          { tag: 'debuff', label: 'Pull stacks', detail: 'Each nail that lands adds a stack, up to 3. The implant pull is multiplied by 1 + 0.5 per stack, so a full set drags 2.5× as hard.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'Mass recall', detail: 'A press with any nails implanted rips out every one of them at once, 18 damage each, and still refunds 2s of the cooldown.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Three in the air', detail: 'You may have up to 3 nails out at a time; a fourth throw is refused until some come home.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'Nail count is read by Mag Pulse\'s drag, by the Atom Smasher\'s suction and by its +30 rip bonus, so nails are the element\'s real setup resource.',
        'Recalling nails is the mastery\'s Nail Puller requirement — 75 tears.',
      ],
    },

    magnetize: {
      magic:
        'The other fighter is made of iron. A red field clamps onto them and for eight seconds every '
        + 'rod on the floor within reach falls toward them of its own accord — accelerating harder '
        + 'the closer it gets — and nails you throw near them curve in. You do not aim at a '
        + 'magnetised opponent so much as let go of things in their general direction.',
      cast: 'F, at the cursor. Only lands if the cursor is within 80px of the enemy; a miss does nothing and still spends the cooldown.',
      effects: [
        { tag: 'debuff', label: 'Magnetised', detail: '8 seconds, with a 180px ring drawn on them — that ring is the real rod-attraction range, not decoration.' },
        { tag: 'utility', label: 'Rod attraction', detail: 'Rods inside 180px accelerate toward them at up to 1600 px/s², capped at 900 px/s of travel (1400 for Blade swords).' },
        { tag: 'utility', label: 'Nail homing', detail: 'Nails within 150px of them curve in at 600 px/s² of steering, capped at 700 px/s.' },
        { tag: 'movement', label: 'It pulls you too', detail: 'If your Protect orbs are up, you are dragged toward a magnetised enemy at up to 1400 px/s² — the shell is iron as well.' },
        { tag: 'utility', label: 'Availability', detail: '5s cooldown against an 8s duration, so it can be kept up permanently.' },
      ],
      upgrade: {
        magic:
          'Copper Barrage makes the field manufacture its own ammunition. While the enemy is '
          + 'magnetised, soft copper rods keep condensing at their feet and flying at you — which '
          + 'sounds backwards until you notice that the thing they pass through on the way is the '
          + 'person who made them.',
        effects: [
          { tag: 'summon', label: 'Copper rods', detail: 'One spawned at the magnetised enemy\'s feet every 1.2s, thrown toward you at 250 px/s with up to ±0.3 rad of scatter.', requiresUpgrade: 'f' },
          { tag: 'damage', label: 'One hit each', detail: 'Copper deals the normal 8 rod damage but shatters on its first contact rather than continuing.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'Yours on arrival', detail: 'They are your rods from the moment they spawn, so a pulse or a repulse can redirect them mid-flight.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Magnetize is what turns the four idle corner rods into a weapon; without it a pulse is the only thing that moves them.',
        'Because the pull accelerates with proximity, rods that get close enough tend to orbit and re-hit rather than settle.',
      ],
    },

    protect: {
      magic:
        'Ten ball bearings snap into orbit around you at arm\'s length, turning slowly, each one '
        + 'visibly denting and dimming as it soaks a shot. They are not a shield bar — they are ten '
        + 'separate objects, and a shot has to actually meet one to be stopped.',
      cast: 'R. Instant. Recasting replaces the whole ring rather than topping it up.',
      effects: [
        { tag: 'shield', label: 'The ring', detail: '10 bearings at 5 HP each, orbiting 52px out. A bearing subtracts an incoming projectile\'s full damage from its own 5 HP and destroys the shot outright.' },
        { tag: 'shield', label: 'What gets through', detail: 'Only projectiles that come within 12px of a bearing are stopped. Melee, area damage and anything that threads the gaps are unaffected.' },
        { tag: 'movement', label: 'Magnet Dash', detail: 'While the ring is up, Mag Pulse becomes a 1200 px/s dash to the cursor with invincibility for its 40–320ms.' },
        { tag: 'utility', label: 'Availability', detail: '15s cooldown — the longest in the kit apart from the ultimate.' },
      ],
      upgrade: {
        magic:
          'Reflect Burst spends three of the bearings to slam a hard shell up instead. For a second '
          + 'and a half everything the other fighter has in the air inside that shell turns round and '
          + 'goes home, still carrying its own damage — the shell is anchored where you stood, not '
          + 'to you, so it is a place you make safe rather than a thing you wear.',
        effects: [
          { tag: 'shield', label: 'The field', detail: 'R with 3 or more bearings up consumes 3 of them and creates a 180px reflect field for 1.5s, centred on where you were standing.', requiresUpgrade: 'r' },
          { tag: 'damage', label: 'Turned around', detail: 'Every enemy projectile within the 180px radius has its velocity reversed and its ownership flipped to you — it now damages them for its own full figure, whatever that was.', requiresUpgrade: 'r' },
          { tag: 'cost', label: 'It replaces the cast', detail: 'With 3 or more bearings, R can no longer re-cast Protect at all. You must be down to 2 or fewer to lay a fresh ring.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'The ability card says 20 orbs; the kit creates 10.',
        'Blocking with the bearings is the mastery\'s Deflector Shield requirement — 50 blocks.',
        'The field does not follow you, so walking out of it while it is up simply leaves it behind.',
      ],
    },

    'atom-smasher': {
      magic:
        'A grey industrial drum dropped on the floor, hazard-striped and already pulling. For three '
        + 'seconds it hauls the other fighter and every rod you own inward — harder for each nail '
        + 'they are carrying — and then two ram plates come in from opposite sides of the screen and '
        + 'meet in the middle. Everything caught between them is crushed, and everything metal that '
        + 'was dragged in is thrown back out at ballistic speed.',
      cast: 'Q, dropped at the cursor. Instant to place; the plates fire 3 seconds later.',
      effects: [
        { tag: 'control', label: 'Suction', detail: 'The enemy within 320px is dragged toward the drum at 260 px/s, plus 170 more per nail implanted in them — 770 px/s with three.' },
        { tag: 'utility', label: 'Rod gather', detail: 'Your rods within 340px are hauled in at up to 560 px/s, so the crush has metal to throw.' },
        { tag: 'damage', label: 'The plates', detail: '900 px/s from both edges of the screen. Each plate deals 15 damage inside 50px, on a 500ms per-plate cooldown, on its way in.' },
        { tag: 'damage', label: 'The crush', detail: '35 damage to anything within 120px when the plates meet.' },
        { tag: 'damage', label: 'Implants torn out', detail: 'A crushed enemy carrying your nails loses every one of them and takes a further 30 damage.' },
        { tag: 'utility', label: 'Rods launched', detail: 'Rods within 200px of the crush are flung at 750–1050 px/s and bounce off the walls for 3 seconds, dealing 16 apiece instead of 8.' },
        { tag: 'utility', label: 'Availability', detail: '20s cooldown, with a 180ms shake on the drop and a 320ms shake on the crush.' },
      ],
      upgrade: {
        magic:
          'Forged Rods re-tempers everything caught in the compaction. The crush comes out visibly '
          + 'bigger — wider, longer, more metal in the air — and each rod that went through it keeps '
          + 'a permanent edge afterwards. Cast it enough times and the four bars lying around the '
          + 'arena are simply better than they used to be.',
        effects: [
          { tag: 'buff', label: 'Permanent bonus', detail: '+2 damage forever, per rod, per compaction it is caught in. It stacks with every subsequent Q.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Bounce bonus', detail: '+8 more on top during the 3s bounce window, so a freshly forged bouncing rod hits for 26.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'A bigger crush', detail: 'The blast goes from 150px to 210px, throws 26 pieces of shrapnel instead of 16, runs 620ms instead of 480, and shakes the camera for 460ms.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'The plates keep hitting for 15 on the way out as well as the way in, until they leave the screen.',
        'Crushing an enemy is the mastery\'s Compactor requirement — 5 of them.',
        'With the Electromagnet divine perk the compaction charges the rods rather than flinging them: they stay put as live floor hazards, arcing for 6 damage inside 96px every 0.7s and stunning for 0.5s, for 10 seconds — or permanently once this upgrade is owned.',
      ],
    },
  },

  perks: {
    blade: {
      magic:
        'The bars are reforged as swords. Thinner, longer, sharper, and much lighter — which means '
        + 'every field in the kit throws them twice as hard, and a sword called into a magnetised '
        + 'target frequently sails straight past it and has to come back round.',
      effects: [
        { tag: 'damage', label: 'Double contact', detail: '16 damage per contact instead of 8, and 32 instead of 16 during an Atom Smasher bounce window.' },
        { tag: 'utility', label: 'Twice the pull', detail: 'Magnetize accelerates a sword at up to 3200 px/s² instead of 1600, and the speed cap rises from 900 to 1400 px/s.' },
        { tag: 'utility', label: 'Harder pulses', detail: 'Mag Pulse throws a sword at 1360 px/s rather than 680.' },
        { tag: 'cost', label: 'Overshoot', detail: 'A sword travelling over 600 px/s that passes within 30px of the magnetised target has its velocity multiplied by another 1.3 — it is flung past rather than caught.' },
      ],
      notes: [
        'The perk\'s ingredients are electricity, acid, fate and light.',
        'All four starting rods are swords from the first frame; there is no mixed loadout.',
      ],
    },
  },

  mastery: {
    'metal-detector': {
      magic:
        'There is older iron under this arena than anything you brought. Two ancient rods lie buried '
        + 'at random with no marker on the map at all — a faint bronze disturbance in the filings if '
        + 'you know to look — and a mag-pulse that happens to land on one digs it up. Run the '
        + 'compactor over an exposed one and it does not get thrown; it wakes up.',
      effects: [
        { tag: 'summon', label: 'Two finds', detail: '2 rods buried at random positions at least 80px from any wall, once per match. A mag-pulse within 62px of one exposes it.' },
        { tag: 'damage', label: 'An exposed rod', detail: 'Becomes an ordinary rod you own — 8 damage on contact, thrown by pulses and pulled by magnetise like any other.' },
        { tag: 'utility', label: 'Waking it', detail: 'An Atom Smasher whose plates pass within 100px of an exposed rod\'s row activates it. Both can be activated at once.' },
        { tag: 'damage', label: 'The turret', detail: 'An activated rod fires a 5-damage laser every 3 seconds — but only at an enemy who is currently magnetised or carrying your nails.' },
      ],
      notes: [
        'The turret has no range limit. Its only condition is that the target is magnetic.',
        'This is the passive half of Magnet Mastery — it needs no bind and no key.',
      ],
    },
    'mag-lev': {
      magic:
        'A deck of violet plate riding on a visible cushion of field lines, hovering clear of the '
        + 'floor. Standing on it you are carrying fifty points of shield, you hurt anything you '
        + 'touch, and a click throws you across the arena at nearly a thousand pixels a second. '
        + 'Stepping off costs you every point of shield you have, not just the board\'s.',
      cast:
        'Bindable to E, R, F or Q, replacing that slot\'s base ability for the match. Press to mount, '
        + 'press again to dismount.',
      effects: [
        { tag: 'shield', label: 'Board shield', detail: '+50 shield HP on mounting. Losing it back down to whatever you had before dismounts you automatically.' },
        { tag: 'damage', label: 'Bash', detail: '15 damage to anything within 36px of you while riding, on a 400ms per-target cooldown.' },
        { tag: 'movement', label: 'Sling', detail: 'Click launches you toward the cursor at 950 px/s, with 200ms of dodge frames. It replaces Mag Pulse entirely while mounted.' },
        { tag: 'cost', label: 'Dismount cost', detail: 'Getting off sets your shield HP to 0 outright — including any shield you were carrying before you mounted.' },
        { tag: 'utility', label: 'Availability', detail: '6s cooldown on re-mounting. Dismounting is always allowed and is not gated.' },
      ],
      notes: [
        'Mounting with a shield already up and then dismounting deliberately is a strictly bad trade: the board only adds 50, and getting off removes everything.',
        'Click is the sling while mounted, so mag-pulsing rods around and riding the board are mutually exclusive.',
      ],
    },
  },
};

export default magnet;
