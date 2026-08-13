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
      basics:
        'Four iron bars spawn 80px in from each corner at the start of every magnet match. They belong '
        + 'to whoever is playing magnet, never expire, and are the kit\'s real damage: 8 to an enemy '
        + 'within 28px of a moving rod, on a 500ms per-rod per-target cooldown, and nothing at all once a '
        + 'rod has slowed below 30 px/s. They lose 12% of their speed a frame to friction, bounce hard '
        + 'off all four walls, and shove each other 26px apart with their velocities swapped when they '
        + 'touch. A rod launched by the Atom Smasher deals 16 instead of 8 and keeps 99.5% of its speed a '
        + 'frame for the 3-second window rather than 88%.',
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
      basics:
        'Places a mark at the cursor and calls every rod you own within 380px to it at 680 px/s — 1360 '
        + 'with the Blade perk. The damage is the rods\' own 8 per contact within 28px, so four converging '
        + 'on one point is up to 32. An enemy carrying your nails is hauled toward the mark for 350ms at '
        + '220 px/s, plus 140 more per extra nail, so three nails drag at 500 px/s. With Protect orbs up '
        + 'and the mark inside 380px, you are pulled to it instead at 1200 px/s, invincible for the '
        + '40–320ms of travel. 0.8s cooldown — the only ability here you can lean on.',
      cast: 'Click, placed at the cursor. Instant.',
      effects: [
        { tag: 'utility', label: 'Rod call', detail: 'Every rod you own within 380px of the mark is launched at it at 680 px/s (1360 with the Blade perk).' },
        { tag: 'damage', label: 'What it costs them', detail: 'The damage is the rods\': 8 per contact, 28px reach, 500ms per-rod cooldown. Four rods converging on one point is up to 32.' },
        { tag: 'control', label: 'Dragging the nailed', detail: 'An enemy carrying your nails is hauled toward the mark for 350ms at 220 px/s, plus 140 more per extra nail — 500 px/s with three in them.' },
        { tag: 'movement', label: 'Magnet Dash', detail: 'With Protect orbs up and the mark within 380px, you are pulled to it instead at 1200 px/s, invincible for the 40–320ms of travel.' },
        { tag: 'utility', label: 'Availability', detail: '0.8s cooldown — the only ability here you can lean on.' },
      ],
      upgrade: {
        basics:
          'Adds a right-click that reverses everything: every rod you own within 320px is thrown directly '
          + 'away from you at 680 px/s, an enemy carrying any of your nails is knocked away at 500 '
          + 'velocity, and an enemy standing within 80px of you while your Protect orbs are up is knocked '
          + 'away at 600 — the harder of the two shoves.',
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
      basics:
        'Throws a nail at 520 px/s for 18 damage inside 24px. It sticks for 10 seconds, and while it is '
        + 'in, the victim is pulled toward you at +180 px/s of added velocity a second whenever they are '
        + 'more than 80px away. A second press tears it out for another 18 and refunds 2 seconds of the '
        + 'cooldown. 3s cooldown on the throw, free and instant to recall, and you cannot throw while one '
        + 'is in flight or in a body.',
      cast: 'E to throw. E again while one is implanted to recall it. Cannot be thrown while one is in flight or in a body.',
      effects: [
        { tag: 'damage', label: 'Impact', detail: '18 damage on a hit inside 24px, at 520 px/s.' },
        { tag: 'debuff', label: 'Implanted', detail: 'Sticks for 10 seconds. While it is in, the victim is pulled toward you at +180 px/s of added velocity per second whenever they are more than 80px away.' },
        { tag: 'damage', label: 'Recall', detail: 'A second press tears it out for another 18 damage and refunds 2 seconds of the cooldown.' },
        { tag: 'utility', label: 'Availability', detail: '3s cooldown on the throw; the recall is free and instant.' },
      ],
      upgrade: {
        basics:
          'Three gold nails at ±6° from the aim, 18 damage each — 54 if the whole fan lands. Each one '
          + 'that sticks adds a stack up to 3, multiplying the implant pull by 1 + 0.5 per stack, so a full '
          + 'set drags 2.5× as hard. A recall rips out every nail at once for 18 each and still refunds 2 '
          + 'seconds, and you may have up to 3 in the air, with a fourth throw refused until some come '
          + 'home.',
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
      basics:
        'Marks an enemy for 8 seconds with a 180px ring drawn on them — that ring is the real '
        + 'attraction range, not decoration. Rods inside it accelerate toward them at up to 1600 px/s² '
        + 'capped at 900 px/s of travel (1400 for Blade swords), and nails within 150px curve in at 600 '
        + 'px/s² of steering capped at 700. If your Protect orbs are up you are dragged toward them too, '
        + 'at up to 1400 px/s² — the shell is iron as well. It only lands if the cursor is within 80px of '
        + 'the enemy, and a miss still spends the cooldown. 5s cooldown against an 8s duration, so it can '
        + 'be kept up permanently.',
      cast: 'F, at the cursor. Only lands if the cursor is within 80px of the enemy; a miss does nothing and still spends the cooldown.',
      effects: [
        { tag: 'debuff', label: 'Magnetised', detail: '8 seconds, with a 180px ring drawn on them — that ring is the real rod-attraction range, not decoration.' },
        { tag: 'utility', label: 'Rod attraction', detail: 'Rods inside 180px accelerate toward them at up to 1600 px/s², capped at 900 px/s of travel (1400 for Blade swords).' },
        { tag: 'utility', label: 'Nail homing', detail: 'Nails within 150px of them curve in at 600 px/s² of steering, capped at 700 px/s.' },
        { tag: 'movement', label: 'It pulls you too', detail: 'If your Protect orbs are up, you are dragged toward a magnetised enemy at up to 1400 px/s² — the shell is iron as well.' },
        { tag: 'utility', label: 'Availability', detail: '5s cooldown against an 8s duration, so it can be kept up permanently.' },
      ],
      upgrade: {
        basics:
          'A copper rod now spawns at the magnetised enemy\'s feet every 1.2 seconds and is thrown toward '
          + 'you at 250 px/s with up to ±0.3 rad of scatter. Copper deals the normal 8 but shatters on its '
          + 'first contact instead of carrying on — and it is yours from the moment it spawns, so a pulse '
          + 'or a repulse can redirect it mid-flight.',
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
      basics:
        'Ten bearings at 5 HP each orbiting 52px out. A bearing subtracts an incoming projectile\'s full '
        + 'damage from its own 5 HP and destroys the shot outright, but only projectiles passing within '
        + '12px of a bearing are stopped — melee, area damage and anything that threads the gaps go '
        + 'through. While the ring is up, Mag Pulse becomes a 1200 px/s dash to the cursor with '
        + 'invincibility for its 40–320ms. 15s cooldown, and recasting replaces the whole ring rather '
        + 'than topping it up.',
      cast: 'R. Instant. Recasting replaces the whole ring rather than topping it up.',
      effects: [
        { tag: 'shield', label: 'The ring', detail: '10 bearings at 5 HP each, orbiting 52px out. A bearing subtracts an incoming projectile\'s full damage from its own 5 HP and destroys the shot outright.' },
        { tag: 'shield', label: 'What gets through', detail: 'Only projectiles that come within 12px of a bearing are stopped. Melee, area damage and anything that threads the gaps are unaffected.' },
        { tag: 'movement', label: 'Magnet Dash', detail: 'While the ring is up, Mag Pulse becomes a 1200 px/s dash to the cursor with invincibility for its 40–320ms.' },
        { tag: 'utility', label: 'Availability', detail: '15s cooldown — the longest in the kit apart from the ultimate.' },
      ],
      upgrade: {
        basics:
          'With 3 or more bearings up, R consumes three of them for a 180px reflect field lasting 1.5 '
          + 'seconds, centred where you stood: every enemy projectile inside has its velocity reversed and '
          + 'its ownership flipped to you, so it now damages them for its own full figure. It replaces the '
          + 'cast entirely — with 3 or more bearings R can no longer re-lay the ring, and you must be down '
          + 'to 2 or fewer to make a fresh one.',
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
      basics:
        'Drops a drum at the cursor that fires 3 seconds later. While it winds up, the enemy within '
        + '320px is dragged toward it at 260 px/s plus 170 more per nail in them — 770 with three — and '
        + 'your rods within 340px are hauled in at up to 560 px/s so the crush has metal to throw. Two '
        + 'plates then close at 900 px/s from both edges of the screen, dealing 15 damage inside 50px on '
        + 'a 500ms per-plate cooldown on the way in, and 35 to everything within 120px when they meet. A '
        + 'crushed enemy carrying your nails loses every one and takes a further 30. Rods within 200px of '
        + 'the crush are flung at 750–1050 px/s and bounce off walls for 3 seconds, dealing 16 apiece '
        + 'instead of 8. 20s cooldown, with a 180ms shake on the drop and 320ms on the crush.',
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
        basics:
          'Every compaction permanently forges the rods caught in it: +2 damage forever per rod per '
          + 'crush, stacking with every subsequent Q, plus 8 more during the 3-second bounce window, so a '
          + 'freshly forged bouncing rod hits for 26. The crush itself grows from 150px to 210px, throws 26 '
          + 'pieces of shrapnel instead of 16, runs 620ms instead of 480 and shakes the camera for 460ms.',
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
      basics:
        'The rods become swords: 16 damage per contact instead of 8, and 32 instead of 16 during an '
        + 'Atom Smasher bounce. Magnetize accelerates them at up to 3200 px/s² instead of 1600 with the '
        + 'cap rising from 900 to 1400 px/s, and Mag Pulse throws them at 1360 px/s rather than 680. The '
        + 'catch is overshoot — a sword travelling over 600 px/s that passes within 30px of a magnetised '
        + 'target has its velocity multiplied by another 1.3 and is flung past rather than caught.',
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
      basics:
        'Two extra rods are buried at random positions at least 80px from any wall, once per match, and '
        + 'a mag-pulse within 62px of one exposes it. An exposed rod becomes an ordinary rod you own — 8 '
        + 'damage on contact, thrown by pulses and pulled by magnetise like any other. An Atom Smasher '
        + 'whose plates pass within 100px of an exposed rod\'s row activates it, and both can be woken at '
        + 'once: an activated rod fires a 5-damage laser every 3 seconds, but only at an enemy who is '
        + 'currently magnetised or carrying your nails.',
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
      basics:
        'A bindable board you mount and dismount with the same key. Mounting grants +50 shield HP; '
        + 'losing it back down to whatever you had before dismounts you automatically, and getting off '
        + 'deliberately sets your shield HP to 0 outright, including any shield you were carrying '
        + 'beforehand. While riding you bash anything within 36px for 15 damage on a 400ms per-target '
        + 'cooldown, and Click is replaced by a sling that launches you toward the cursor at 950 px/s '
        + 'with 200ms of dodge frames. 6s cooldown on re-mounting; dismounting is never gated.',
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
