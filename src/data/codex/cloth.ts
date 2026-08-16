import { ElementCodex } from '../AbilityCodex';

/**
 * Cloth — a tailor whose health bar is a scarf, and whose build is a jigsaw.
 *
 * Verified against `src/elements/cloth.ts`, `kits/ClothKit.ts` and `kits/ClothTapestry.ts`.
 * Cloth has five corrupt shop upgrades, a mastery, and no perks; every figure below is a
 * constant at the top of the kit or a row of the artwork table.
 */
const cloth: ElementCodex = {
  identity:
    'Cloth has no health bar. It has a scarf — a trail of wool dragging behind wherever the '
    + 'tailor has just walked — and that scarf is the hitbox, so a shot that misses the body by a '
    + 'foot still catches the tail. In exchange the scarf shrinks as it is cut down, which makes a '
    + 'nearly-dead Cloth player genuinely harder to hit than a healthy one. Everything else in the '
    + 'kit is short-range and fast: a pin that jabs seven times a second, a long pin that reels you '
    + 'across the arena to whatever it stuck in, and a rope back to a spot you chose earlier. Its '
    + 'ultimate does not attack at all — it offers three artworks and sews one into a 5×5 loom, so '
    + 'no two Cloth players finish a match with the same kit, and a few of those artworks hand over '
    + 'a right-click button the element does not otherwise have.',

  passives: [
    {
      emoji: '🧣',
      name: 'The Scarf',
      basics:
        'Your hitbox is not your body. The tailor keeps a small core about half normal size, and '
        + 'the real target is a trail of up to 17 knots laid at 13px intervals along the path you '
        + 'have walked — roughly 220px of wool behind you at full health. Any enemy shot that '
        + 'passes within 9px of any knot hits you for its full damage and is consumed doing it. '
        + 'The trail is a function of health: it runs from 17 knots at full down to a floor of 30% '
        + 'of that, so the less scarf you have left the smaller a target you are. Braid artworks '
        + 'shorten it further on purpose, and Split cuts it into two shorter strands instead of one '
        + 'long one.',
      effects: [
        { tag: 'utility', label: 'The trail', detail: 'Up to 17 knots at 13px spacing — about 220px of wool — sampled off the path you have walked, not off the frame rate.' },
        { tag: 'utility', label: 'The catch radius', detail: 'Any enemy shot passing within 9px of any knot deals its full damage to you and is destroyed. Both the physics group and the hand-drawn projectile registry are checked.' },
        { tag: 'utility', label: 'The body', detail: 'The tailor themselves keeps a core at 52% of a normal hitbox — small, but never zero.' },
        { tag: 'utility', label: 'It shrinks', detail: 'Length scales with health, from 17 knots at full down to a floor of 30%. Nearly dead is measurably harder to hit.' },
        { tag: 'buff', label: 'What shortens it deliberately', detail: 'Braid I/II/III take 20% / 35% / 50% off. Split cuts it into two strands at 62% length each, thrown 11px to either side.' },
      ],
      notes: [
        'Standing still does not retract the scarf — the kit pays out slack behind the last knot, so an idle tailor still trails a full length rather than a bobble.',
        'A shot already inside the body core is ArenaScene\'s business rather than the scarf\'s, so nothing is ever counted twice.',
        'Split is a hedge, not an upgrade: two shorter strands are harder for a single shot to find and much easier for one blast to catch both of.',
        'Wretched Scarf is the only thing that takes the scarf off the field entirely, which is most of what that mastery ability is for.',
      ],
    },
    {
      emoji: '🧵',
      name: 'The Tapestry',
      basics:
        'A 5×5 loom — 25 squares, and that is the whole budget for a match. Every artwork Q offers '
        + 'occupies a different fixed polyomino and none of them rotate, so what you sew early '
        + 'decides what can still fit later. Tier 1s are dominoes and trominoes, tier 3s and the '
        + 'one-off passives are tetrominoes, and every right-click artwork is a pentomino — a fifth '
        + 'of the loom for one button. Seven families (Sharpness, Speedy, Survive, Braid, Thorns, '
        + 'Quick, Technique) may be drafted repeatedly and stack; everything else is unique and '
        + 'stops being offered once owned. You may only ever carry one right-click artwork.',
      effects: [
        { tag: 'resource', label: 'The loom', detail: '25 squares. Roughly six or seven artworks over a long match, fewer if you take the big ones.' },
        { tag: 'utility', label: 'The shapes', detail: '37 artworks, 37 distinct fixed polyominoes, and no rotation. Placement is a real constraint rather than a formality.' },
        { tag: 'buff', label: 'What stacks', detail: 'Sharpness, Speedy, Survive, Braid, Thorns, Quick and Technique come in I/II/III and may repeat. Sharpness and Speedy add within their family (two Sharpness IIs is +60%); Thorns and Technique take the best tier rather than stacking.' },
        { tag: 'utility', label: 'What does not repeat', detail: 'Sharpened Pins, Echo, Thick Skin, Reach, Split and the eight right-click artworks are offered only while you do not own them.' },
        { tag: 'utility', label: 'One button, ever', detail: 'The moment any right-click artwork is on the loom, no other right-click artwork is ever offered again.' },
        { tag: 'utility', label: 'The draft is honest', detail: 'Anything that no longer fits anywhere on the loom is not offered, so a nearly-full loom stops showing you pentominoes.' },
      ],
      notes: [
        'Braid caps at 80% shorter however many copies you sew, and Quick floors at a 30% cooldown, so neither family can be stacked into nonsense.',
        'Survive is real max HP: it raises the cap and heals you for exactly the amount granted, once per point, so it can never be double-paid.',
        'The bot drafts too. It has no loom to plan, so it takes the biggest artwork it is offered and sews it at a random legal fit.',
        'The draft overlay does not stop the arena. You can still walk while it is open, and after nine seconds it picks the first card and the first fit for you.',
      ],
    },
  ],

  abilities: {
    'cloth-pin': {
      basics:
        'A jab with a pin: 4 damage inside 62px and a 1.1 radian arc in front of you, auto-firing '
        + 'about seven times a second while the button is held. It is the lowest damage figure in '
        + 'the game and it is not what the button is for — every pin that lands counts toward a '
        + 'streak on that body, and the streak is what Click+ spends. Sharpened Pins adds +1, Reach '
        + 'doubles the 62px, and Echo makes one press in five throw a second free jab 110ms later.',
      cast: 'Click, auto-firing while the button is held. 145ms between jabs.',
      effects: [
        { tag: 'damage', label: 'The jab', detail: '4 damage to the first body inside 62px within a 1.1 radian arc of your aim.' },
        { tag: 'utility', label: 'The rate', detail: '145ms between pins — about seven a second, and the fastest attack on the roster.' },
        { tag: 'resource', label: 'The streak', detail: 'Every landed pin counts toward 10 on that body. Switching victims resets it, and it does not tick while a grapple spin is already running.' },
        { tag: 'buff', label: 'What the loom adds', detail: 'Sharpened Pins: +1 damage. Reach: 62px becomes 124px. Echo: 20% of presses throw a second free jab 110ms later.' },
      ],
      upgrade: {
        basics:
          'The tenth pin on the same body stops being a pin. The thread goes taut, drags you onto '
          + 'them and whips you a full revolution around their body at 44px — about three quarters '
          + 'of a second parked inside your own reach, with your movement overridden for the whole '
          + 'circle. It deals nothing on its own; what it buys is the position, which is worth far '
          + 'more to an element whose reach is 62px. The Combo artwork brings the count down to 6.',
        effects: [
          { tag: 'movement', label: 'The grapple', detail: 'The 10th pin on one body hauls you onto them and orbits you at 44px for 780ms, position-overridden the whole way.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'What it is worth', detail: 'No damage of its own. It parks you at stabbing distance for most of a second, which is roughly five free pins.', requiresUpgrade: 'click' },
          { tag: 'resource', label: 'The counter', detail: 'Resets on a new victim, and stops counting while a spin is already running so one spin can never chain into another.', requiresUpgrade: 'click' },
          { tag: 'buff', label: 'Combo', detail: 'The Combo artwork (Q+ only) brings the trigger down from 10 pins to 6.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'The last two pins before a spin are announced over the victim\'s head, so the trigger is never a surprise.',
        'A spin follows a moving target — the orbit is recomputed against wherever they are, so walking away does not shake it.',
        'Technique\'s crit chance is rolled per hit, which at seven hits a second makes it the most reliable crit source in the kit.',
      ],
    },

    'cloth-longpin': {
      basics:
        'Throws a pin the length of your arm at 700 px/s. It buries itself in the first body it '
        + 'touches for 15 damage, or in the wall if it reaches one, and stays there for 9 seconds. '
        + 'Pressing E again with a pin planted is the recall: the thread hauls you to it at 1150 '
        + 'px/s, anybody you plough through on the way takes 10, and arriving on a pinned body is '
        + '10 more and a hard shove. A wall pin is a free repositioning tool with no ram on the end '
        + 'of it. With the Location Pin artwork out, E reels to the marker with nothing thrown.',
      cast: 'E, aimed. First press throws; the second press with a pin planted is the recall and refunds its cooldown. 7s cooldown.',
      effects: [
        { tag: 'damage', label: 'The throw', detail: '15 damage to the first body it touches, at 700 px/s with 1.6 seconds of flight.' },
        { tag: 'summon', label: 'Where it sticks', detail: 'A body or a wall, either will hold it, for 9 seconds. A pin in a body follows that body.' },
        { tag: 'movement', label: 'The recall', detail: 'The second press hauls you to the pin at 1150 px/s. Your movement is overridden for the trip.' },
        { tag: 'damage', label: 'On the way', detail: '10 damage to anybody you plough through, once each per trip.' },
        { tag: 'damage', label: 'The ram', detail: 'Arriving on a pinned body is 10 more and a 620 px/s shove away from you.' },
        { tag: 'utility', label: 'Location Pin', detail: 'With that artwork\'s marker down, E reels to the marker instead of throwing — no pin needed.' },
      ],
      upgrade: {
        basics:
          'Reeling onto a pinned enemy wraps them in a cage of wool with 50 health of its own. They '
          + 'cannot move at all until it is gone, and the only thing that removes it is damage — '
          + 'anybody\'s, including their own. It is a damage check rather than a stun: a target who '
          + 'hits hard is out in about a second, and one who cannot hurt it is held until the 6 '
          + 'second hard ceiling. Grand Hold doubles the health; Slicing Hold puts 5 damage a '
          + 'second into it.',
        effects: [
          { tag: 'control', label: 'The cage', detail: '50 HP of wool. The victim cannot move for as long as it stands.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'How it ends', detail: 'Damage, from any source, cuts the web down point for point. There is no timer to wait out — only a 6 second ceiling so a target that cannot damage it is not held forever.', requiresUpgrade: 'e' },
          { tag: 'buff', label: 'Grand Hold', detail: 'That artwork (Q+ only) doubles a web to 100 HP.', requiresUpgrade: 'e' },
          { tag: 'dot', label: 'Slicing Hold', detail: 'That artwork (Q+ only) makes the wool cut: 5 damage a second to whoever is caught.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'Your own damage counts against the web, so stabbing somebody free is a real risk — the pin is 4 a jab and the cage is 50.',
        'A pin planted in a wall is worth keeping for the escape rather than spending on damage: the recall is the only long-range movement the element has.',
        'Ruin\'s spikes and anything else that razes a board will pull a planted pin, an anchor and a location marker off the floor. The scarf is not a structure and survives.',
      ],
    },

    'cloth-safety-line': {
      basics:
        'Drives an anchor into the floor where you stand, live for 20 seconds. Pressing R again '
        + 'hauls you back to it at 1400 px/s — and so does taking 75 damage with it out, whether '
        + 'you wanted it to or not. That automatic trigger is the whole ability: it is a bail-out '
        + 'you have to set before you need it, and if you leave it too long it decides for you. '
        + 'The line drawn on the floor is the tally, pulling straighter as the 75 fills up. With '
        + 'Location Pin out, the anchor goes to the marker instead of your feet.',
      cast: 'R, no aim. First press anchors; the second press with an anchor down is the retreat and refunds its cooldown. 9s cooldown.',
      effects: [
        { tag: 'summon', label: 'The anchor', detail: 'Planted where you stand, live for 20 seconds. One at a time.' },
        { tag: 'movement', label: 'The recall', detail: '1400 px/s back to the anchor, movement overridden for the trip.' },
        { tag: 'utility', label: 'The automatic trigger', detail: 'Taking 75 damage since the anchor went down fires it by itself, read off the raw figure before any of your own mitigation.' },
        { tag: 'utility', label: 'The tell', detail: 'The slack in the drawn line is the tally — it pulls straight and the ring tightens as the 75 fills.' },
        { tag: 'utility', label: 'Location Pin', detail: 'With that artwork\'s marker down, the anchor is planted at the marker rather than at your feet.' },
      ],
      upgrade: {
        basics:
          'Three things at once. The trip itself becomes untouchable — you cannot be hit while the '
          + 'line is hauling you in, which closes the one window where the retreat could kill you. '
          + 'You land with +20% move speed for 5 seconds. And you gain 5 Pinned HP a second for '
          + 'those same 5 seconds, so the bail-out hands back half a Pin Cushion on the way out.',
        effects: [
          { tag: 'shield', label: 'The trip', detail: 'Invulnerable for as long as the line is pulling you.', requiresUpgrade: 'r' },
          { tag: 'buff', label: 'The landing', detail: '+20% move speed for 5 seconds.', requiresUpgrade: 'r' },
          { tag: 'heal', label: 'The pins', detail: '+5 Pinned HP a second for 5 seconds — 25 in total, half a Pin Cushion.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'Every retreat counts toward the mastery, however it fired — the recast and the automatic trigger both.',
        'The 75 is measured off `rawDamageTaken`, so armour that saves your life does not also stop the line noticing you were hit that hard.',
        'Setting the anchor is free and setting it early is the whole skill. An anchor placed while you are winning is what lets you take a fight you should not.',
      ],
    },

    'cloth-pin-cushion': {
      basics:
        'Stab yourself. Up to 50 of your current health is converted into Pinned HP — a pool that '
        + 'is spent before normal health, burns 25% faster than the damage it soaks (10 through the '
        + 'pins costs 12.5 of them), and throws 25% of everything it eats straight back at the '
        + 'nearest enemy. The cooldown is 3.2 seconds, so the only real question is how much of '
        + 'yourself you want made of needles. It refuses to fire below 7 health rather than being a '
        + 'suicide button. Thorns raises the reflect to 40 / 60 / 85%, and Thorns III also removes '
        + 'the 25% vulnerability entirely.',
      cast: 'F, no aim. Refused below 7 health. 3.2s cooldown.',
      effects: [
        { tag: 'cost', label: 'The conversion', detail: 'Up to 50 of your current health becomes Pinned HP. Never takes you below 1.' },
        { tag: 'shield', label: 'The pool', detail: 'Spent before normal health, exactly like weak HP — but at 1.25× rate, so it is worse health rather than a shield.' },
        { tag: 'damage', label: 'The thorns', detail: '25% of every point the pins absorb is dealt to the nearest enemy immediately.' },
        { tag: 'buff', label: 'Thorns I / II / III', detail: 'Raise the reflect to 40% / 60% / 85%. Thorns III also drops the burn rate back to 1× — the pool stops being worse health at all.' },
        { tag: 'buff', label: 'Thick Skin', detail: 'That artwork converts 15% of all damage you take into Pinned HP on its own, and stops anything counting as a piercing hit against you.' },
      ],
      upgrade: {
        basics:
          'Pin Push. Every single time you take damage while you have Pinned HP, eight pins burst '
          + 'out of you in a ring at 430 px/s — 2 damage each, in every direction at once, with no '
          + 'cooldown and no cap on how often it fires. Standing in somebody\'s face and being hurt '
          + 'stops being purely a cost. Sharpened Pins adds +1 to each of the eight.',
        effects: [
          { tag: 'damage', label: 'The spray', detail: '8 pins in a ring on every hit taken, 2 damage each at 430 px/s with 0.9s of life.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'The condition', detail: 'Only while Pinned HP is above zero, and there is no cooldown on it whatsoever.', requiresUpgrade: 'f' },
          { tag: 'buff', label: 'Sharpened Pins', detail: 'That artwork makes each of the eight deal 3 instead of 2.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Pinned HP is a damage layer on the Fighter, so shields, weak HP and clotted HP are all spent before it — the pins are the last thing between a hit and your scarf.',
        'The thorns are re-entrancy-guarded: a reflected hit that somehow came back at you cannot start another reflect.',
        'Deal damage while any pins are in you and it counts toward the mastery, whatever dealt it.',
      ],
    },

    'cloth-tapestry': {
      basics:
        'Offers three artworks out of the deck and sews the one you take into the 5×5 loom. Pick '
        + 'with 1 / 2 / 3 or by clicking a card, then move the ghost over the loom and click to '
        + 'place. The arena does not stop while the overlay is open — you can still walk, you '
        + 'cannot cast, and after nine seconds it takes the first card at the first fit for you. '
        + 'The deck never offers a piece that no longer fits, never offers a unique you already '
        + 'own, and never offers a second right-click artwork.',
      cast: 'Q. Opens the draft; 1/2/3 or click to choose, then click the loom to sew. Ultimate, 21s cooldown.',
      effects: [
        { tag: 'utility', label: 'The offer', detail: 'Three artworks, weighted so tier 1s are the common draw and tier 3s and right-click artworks are the prize.' },
        { tag: 'buff', label: 'The sewing', detail: 'The chosen piece occupies its fixed polyomino on the 5×5 loom. It cannot be moved or removed afterwards.' },
        { tag: 'cost', label: 'The overlay', detail: 'The arena keeps running. You may move, you may not cast, and after 9 seconds it chooses for you.' },
        { tag: 'utility', label: 'What is filtered out', detail: 'Anything that no longer fits anywhere, any unique already on the loom, and every right-click artwork once one is sewn.' },
      ],
      upgrade: {
        basics:
          'Salvage. A couple of the artworks on your loom survive the end of the match and are '
          + 'already sewn when the next Cloth game starts — the last things you placed, filtered '
          + 'down at random, so a run gets a head start rather than simply resuming. It also opens '
          + 'three artworks the deck does not otherwise contain: Combo (the grapple triggers on 6 '
          + 'pins rather than 10), Grand Hold (cloth webs have double the health) and Slicing Hold '
          + '(cloth webs deal 5 damage a second).',
        effects: [
          { tag: 'utility', label: 'The salvage', detail: 'Up to 2 artworks — the last sewn — carry into the next match, each with about a 70% chance of surviving.', requiresUpgrade: 'q' },
          { tag: 'buff', label: 'Combo', detail: 'A new artwork: the Click+ grapple spin triggers on the 6th pin instead of the 10th.', requiresUpgrade: 'q' },
          { tag: 'buff', label: 'Grand Hold', detail: 'A new artwork: cloth webs have 100 HP instead of 50.', requiresUpgrade: 'q' },
          { tag: 'dot', label: 'Slicing Hold', detail: 'A new artwork: cloth webs deal 5 damage a second to whoever is caught.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'The eight right-click artworks are the largest pieces in the deck for a reason: a fifth of the loom is what a whole new button costs.',
        'A salvaged piece that no longer fits where it sat is re-placed at the first legal spot rather than dropped.',
        'The bot drafts on the same table. It cannot plan a loom, so it takes the biggest thing it is offered — which makes a Nightmare Cloth bot reliably end up with a right-click ability.',
      ],
    },
  },

  mastery: {
    'outfit-change': {
      basics:
        'Space sheds what you are wearing and leaves you standing in the next thing. Four outfits '
        + 'in a fixed cycle, 0.9 seconds between changes, and each is a different kind of '
        + 'resistance: Black Suit takes 3 off every hit flat, Heavy Coat is a flat 10% off '
        + 'everything, Thin Silks cuts every negative status on you by a third, and Casual Hoodie '
        + 'takes 20% off anything arriving as an area blast or a piercing shot. You start every '
        + 'match in the Black Suit.',
      cast: 'Space. Cycles to the next outfit. 0.9s between changes.',
      effects: [
        { tag: 'shield', label: '🤵 Black Suit', detail: '3 flat damage off every hit that reaches you, subtracted per hit rather than from the total. The starting outfit.', requiresMastery: true },
        { tag: 'shield', label: '🧥 Heavy Coat', detail: '10% less damage from every source, with no conditions.', requiresMastery: true },
        { tag: 'buff', label: '👘 Thin Silks', detail: 'Every negative status on you runs 33% shorter — stuns, slows, burns, freezes, roots and silences alike.', requiresMastery: true },
        { tag: 'shield', label: '🧢 Casual Hoodie', detail: '20% less from anything flagged as an area blast or a piercing shot. Nothing at all against an ordinary bullet.', requiresMastery: true },
      ],
      notes: [
        'The Black Suit\'s flat 3 is subtracted per hit, which makes it the best of the four against a swarm and the worst against one enormous blow.',
        'The outfit is on the character rather than in a buff bar: the panel over the tailor\'s torso changes cut and colour, so both players can see which one is on.',
        'Swapping costs nothing but the moment it takes. The skill is reading what is about to land and being in the right thing when it does.',
      ],
    },
    'wretched-scarf': {
      basics:
        'Wind the whole scarf around yourself for 3 seconds. The scarf stops being a hitbox — you '
        + 'become a small circle like every other element on the roster — and every point of damage '
        + 'that does still reach you is negated outright rather than absorbed. None of it is '
        + 'forgiven: it is counted, and when the three seconds end the wool unwinds and 90% of '
        + 'everything thrown at you comes back out as a blast in a 190px radius. 18s cooldown.',
      cast: 'Whichever of E / R / F / Q it is bound over. 18s cooldown.',
      effects: [
        { tag: 'shield', label: 'The negation', detail: 'All damage taken for 3 seconds is refused outright — not reduced, not absorbed.', requiresMastery: true },
        { tag: 'utility', label: 'The small target', detail: 'The scarf is off the field for the duration, so the hitbox is a normal-sized circle rather than a 220px trail.', requiresMastery: true },
        { tag: 'damage', label: 'The return', detail: '90% of everything negated is released as one blast inside 190px when the 3 seconds end.', requiresMastery: true },
        { tag: 'cost', label: 'Used on nothing', detail: 'Nothing negated means nothing returned. It is the only defensive cooldown in the game that is actively wasted by not being punished.', requiresMastery: true },
      ],
      notes: [
        'The blast is flagged as area damage, so it is read by anything that resists area damage — including another Cloth player in a Casual Hoodie.',
        'The right answer to an opponent dumping an ultimate into it is to be standing on top of them when it opens.',
        'It banks off the raw damage tally rather than off what got through, so armour you were already wearing does not quietly shrink the payload.',
      ],
    },
  },
};

export default cloth;
