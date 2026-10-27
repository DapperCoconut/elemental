import { ElementCodex } from '../AbilityCodex';

/**
 * Cloth — a tailor whose one long arm is their scarf.
 *
 * Verified against `src/elements/cloth.ts`, `kits/ClothKit.ts` and the five shop upgrades in
 * `data/Upgrades.ts`. Cloth has no perks and (since the 2026-10-26 rework) no mastery; every
 * figure below is a constant at the top of the kit.
 */
const cloth: ElementCodex = {
  identity:
    'A ball of red wool with no legs and one very long arm — the scarf wound round its crown, paid '
    + 'out to a stitched cloth hand. Every inch the tailor moves is the scarf gripping the floor or a '
    + 'wall and hauling the body after it, and the same hand is the punch, the pickpocket that catches '
    + 'shots out of the air, and the only way to use anything else in the kit: needles fall out of the '
    + 'sky to be thrown, the bola ties people up to be thrown, and the pincushion is punched to make it '
    + 'fire. Walk into your own cushion and the pins go into you instead — which is how the tailor arms '
    + 'themself — and Burning Man sets every last thread of it on fire.',

  passives: [
    {
      emoji: '🧣',
      name: 'The Scarf Hand',
      basics:
        'You cannot walk; WASD does nothing. Hold Click on the floor or a wall and the hand on the end '
        + 'of your scarf grips it; drag the mouse and the scarf hauls your body the opposite way, a '
        + 'pixel for a pixel off the floor and ×1.35 off a wall, capped at 560 px/s. The scarf reaches '
        + '250px and will not stretch past it, and winding the cursor more than 437px past the grip '
        + 'tears it loose. The hand springs after the cursor rather than snapping to it, and where it is '
        + 'drawn is exactly where it grips, grabs and hits.',
      effects: [
        { tag: 'movement', label: 'The drag', detail: 'Body velocity = minus the mouse travel per frame: ×1 off the floor, ×1.35 off a wall (within 54px of an edge). Capped at 560 px/s and multiplied by any slows on you.' },
        { tag: 'movement', label: 'The reach', detail: '20–250px from the body. At full extension the body may swing round the grip but never slide away from it.' },
        { tag: 'utility', label: 'Slipping', detail: 'Wind the cursor more than 437px (1.75 × reach) past the grip and it tears loose.' },
        { tag: 'utility', label: 'A full hand cannot grip', detail: 'Carrying a needle, a caught shot or a bound body means you cannot move until you let go.' },
        { tag: 'utility', label: 'Space still dodges', detail: 'The dodge owns the body for its duration; the drag stands aside for it.' },
      ],
      notes: [
        'The hand springs after its target at a rate of 16/s, so a fast flick of the mouse leaves the scarf trailing — and that hand speed is what every throw and smack reads.',
        'A bot cannot drag, so its movement lurches: 145% speed for about half a second, then 20% while it throws the scarf out again.',
      ],
    },
    {
      emoji: '🫲',
      name: 'The Smack',
      basics:
        'Whip the hand over somebody at 620 px/s or more and it smacks them for 14, once per body every '
        + '0.52s. It is free — no cooldown — so moving the hand is never wasted. A smack across your own '
        + 'pincushion counts as a punch and sets it off.',
      effects: [
        { tag: 'damage', label: 'The smack', detail: '14 damage to anything within 32px of a hand moving at 620 px/s or faster. Once per body every 0.52s. No cooldown.' },
        { tag: 'utility', label: 'Your own cushion', detail: 'A smack within 50px of your pincushion fires it exactly as a punch does.' },
        { tag: 'damage', label: 'Father of the Flame', detail: 'With Q+ up the claw smacks for 24 and sets the target alight (4 a second for 2.5s).', requiresUpgrade: 'q' },
      ],
    },
  ],

  abilities: {
    'cloth-scarf-hand': {
      basics:
        'One click, resolved against whatever the hand is over, in order: a body you have bound is '
        + 'picked up (within 48px); one of your needles on the floor or in a wall is pulled out (within '
        + '44px); your pincushion is punched (within 52px) and fires; an enemy shot within 34px is caught '
        + 'in a fold of wool and becomes a throwable wad worth exactly its own damage; an enemy within 36px '
        + 'of the hand — or 56px of your body — is punched for 20; and failing all of that the hand grips '
        + 'the floor or wall. Letting go throws whatever you were holding at the hand\'s own speed. Only the '
        + 'punch spends the 0.42s cooldown.',
      cast: 'Click, held. 0.42s cooldown, and only the punch spends it — gripping, grabbing and throwing are the same hand being used.',
      effects: [
        { tag: 'damage', label: 'The punch', detail: '20 damage to anything within 36px of the hand, or 56px of your body. A miss still spends the 0.42s.' },
        { tag: 'utility', label: 'Picking up a bound body', detail: 'First priority, within 48px. It rides the hand and its binding does not run down while carried.' },
        { tag: 'utility', label: 'Pulling a needle', detail: 'Second priority, within 44px — off the floor or out of a wall.' },
        { tag: 'utility', label: 'Punching the cushion', detail: 'Third priority, within 52px: the pincushion fires its barrage (see Pincushion).' },
        { tag: 'utility', label: 'Catching a shot', detail: 'Fourth priority, within 34px. The projectile is destroyed and becomes a wad of wool worth exactly the damage it would have done. Thrown, it is spent on its first hit, a wall or the end of its 1.3s flight.' },
        { tag: 'control', label: 'The throw', detail: 'Let go and it flies at the hand\'s speed ×1.15, between 360 and 980 px/s. A thrown body that reaches a wall within 1.4s takes 30 and is pinned there, unable to move, for 2.5s.' },
        { tag: 'movement', label: 'Gripping', detail: 'Last priority — the floor or a wall. See The Scarf Hand.' },
      ],
      upgrade: {
        basics:
          'Four clotheslines are strung across the arena for the whole match — two wall to wall at 30% '
          + 'and 70% of its height, two top to bottom at 30% and 70% of its width — with laundry pegged '
          + 'along them. Land the hand within 22px of one and it becomes a zipline: 680 px/s along the line '
          + 'in the direction you reached, the body settling onto it, until a wall stops you or you let go.',
        effects: [
          { tag: 'movement', label: 'The ride', detail: '680 px/s along the line, multiplied by any slows on you, until the far wall or you let go. The mouse is ignored for the ride.', requiresUpgrade: 'click' },
          { tag: 'area', label: 'The lines', detail: '4 lines: horizontal at 30% and 70% of the arena\'s height, vertical at 30% and 70% of its width. The hand must land within 22px of one.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'Which way', detail: 'Decided by which side of your body the hand caught the line on, and locked in.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'Online, the opponent\'s scarf hand is drawn reaching for you; its throws, carries and flings are relayed from their machine.',
        'A bot has no cursor, so its click is the decision made for it: a body it has bound goes into the nearest wall, its cushion is punched when somebody is within 190px of it, and a needle within reach is thrown at 700 px/s.',
      ],
    },

    'cloth-needle-nexus': {
      basics:
        'Three giant needles drop out of the sky in a fan in front of you, 78–96px out, landing over '
        + '0.42–0.56s and stabbing anybody within 24px of where they land for 8. They stay stuck in the '
        + 'floor until the scarf hand pulls one out and throws it: a hit is 26 and spends the needle. A '
        + 'needle that hits a wall sticks in it to be pulled out and thrown again; one that runs out its '
        + '1.3s of flight drops to the floor. Six of yours can lie about at once. 7s cooldown.',
      cast: 'E, aimed at the cursor. 7s cooldown. The three fall at roughly 26° apart.',
      effects: [
        { tag: 'damage', label: 'Out of the sky', detail: '8 damage to anybody within 24px of a needle as it lands. A shadow on the floor shows where.' },
        { tag: 'summon', label: 'The needles', detail: '3 per cast, stuck in the floor until picked up. 6 of yours at once; a cast at the cap removes the oldest rather than refusing.' },
        { tag: 'damage', label: 'A thrown needle', detail: '26 damage to the first body within 20px. Spent on the hit.' },
        { tag: 'utility', label: 'Walls keep them', detail: 'A needle that reaches a wall sticks in it and can be pulled out and thrown again. One that runs out its 1.3s of flight drops to the floor, also reusable.' },
        { tag: 'damage', label: 'Red-hot', detail: 'During Burning Man: drops are 12, throws are 39, and a thrown needle sets its target alight (4 a second for 2.5s).' },
      ],
      upgrade: {
        basics:
          'Every needle you throw is wrapped in a bundle of cloth with a fuse in the knot. When it hits '
          + 'somebody, a wall, or the end of its flight, the bundle bursts into a shotgun spray of 9 pins '
          + 'fanned about 109° along its path (bounced back off a wall), each 6 damage. The bare needle '
          + 'still sticks in the wall to be thrown again — and is re-wrapped the next time you throw it.',
        effects: [
          { tag: 'damage', label: 'The spray', detail: '9 pins, 6 damage each, 520 px/s for 0.46s, fanned across about 109°. Each pin hits one body once.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Where it goes off', detail: 'On a hit (along the throw), on a wall (back off it), or where the flight ends.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'Hot pins', detail: 'During Burning Man every pin is 9 and ignites what it hits.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'A needle stuck in a wall is a good reason to fight near one: it is ammunition the floor cannot lose.',
        'Caught shots never get the E+ wrap — they are the attacker\'s damage, thrown back as-is.',
      ],
    },

    'cloth-constraining-cloth': {
      basics:
        'Throw a bola straight down the aim at 600 px/s for up to 1 second. The first body within 26px '
        + 'takes 10 and is bound in cloth for 5 seconds: slowed to 45% speed, and something your scarf '
        + 'hand can pick up and throw. Thrown into a wall within 1.4s, a bound body takes 30 and is pinned '
        + 'there, unable to move, for 2.5 seconds. 9s cooldown.',
      cast: 'R, aimed at the cursor. 9s cooldown. One projectile.',
      effects: [
        { tag: 'damage', label: 'The bola', detail: '10 damage to the first body within 26px. 600 px/s, up to 1s of flight.' },
        { tag: 'control', label: 'Bound', detail: '5 seconds at 45% speed. The binding does not run down while you are carrying them.' },
        { tag: 'control', label: 'Into a wall', detail: 'A bound body you throw that reaches a wall within 1.4s takes 30 and is pinned there for 2.5s — speed 0.' },
        { tag: 'dot', label: 'Burning cloth', detail: 'During Burning Man anybody bound in your cloth burns for 10 a second.' },
      ],
      upgrade: {
        basics:
          'The bola becomes a flying Mystical Jacket. Whoever it catches is buckled into it — still bound '
          + 'for 5 seconds, still slowed, still pick-up-able — and while they wear it the arrow keys drag '
          + 'them around at 300 px/s. Whenever an arrow is held they go where it points, whatever they '
          + 'were doing; let go and they move themselves again.',
        effects: [
          { tag: 'control', label: 'Steering', detail: 'Arrow keys drive a jacketed body at 300 px/s, overriding its own movement only while a key is held.', requiresUpgrade: 'r' },
          { tag: 'control', label: 'Still bound', detail: 'Same 10 damage, same 5 seconds at 45% speed, still throwable into a wall.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'A bot with the jacket steers its victim onto its own pincushion, or into its reach when it has none.',
        'Online, the binding and the steering are both settled by the tailor\'s machine and applied by the victim\'s.',
      ],
    },

    'cloth-pincushion': {
      basics:
        'Set a tomato pincushion down where your hand is, holding 6 pins, for 20 seconds — one at a '
        + 'time; another cast replaces it. Punch it (or smack it) and it fires 14 pins in every direction '
        + 'for 7 each, one pin lighter, at most once every 0.32s. Walk your body into it and three pins go '
        + 'into you instead, taking one from the cushion: for 12 seconds you are Pinned, and each of the '
        + 'next 3 hits you take throws 10 pins out of you and stabs whoever is nearest for 12. It is gone '
        + 'when its last pin is. 10s cooldown.',
      cast: 'F. 10s cooldown. A player sets it where the hand is; it is clamped inside the arena.',
      effects: [
        { tag: 'summon', label: 'The cushion', detail: '6 pins, 18px across, 20 seconds. One per side.' },
        { tag: 'damage', label: 'Punched', detail: '14 pins radially, 7 damage each, 520 px/s for 0.46s. Costs 1 pin; at most once every 0.32s.' },
        { tag: 'buff', label: 'The self-pin', detail: 'Touching it with your body (within 30px — a step onto it, not standing on it) costs 1 pin and Pins you: 3 charges for 12 seconds.' },
        { tag: 'damage', label: 'Pinned', detail: 'Each hit you take spends a charge: 10 pins out of you in a ring (4.2 each) and 12 damage to whoever is nearest you.' },
        { tag: 'dot', label: 'Burning', detail: 'Burning Man sets it alight, and it stays alight: every 0.65s it fires 8 red-hot pins and loses one, until it is empty and gone.' },
      ],
      upgrade: {
        basics:
          'Recycle: cushions are purple and hold 8 pins. Any enemy shot that reaches one (within 28px) stops '
          + 'dead in it and becomes another pin, up to the full 8.',
        effects: [
          { tag: 'resource', label: 'Eight pins', detail: 'A full cushion holds 8 instead of 6.', requiresUpgrade: 'f' },
          { tag: 'shield', label: 'Recycling', detail: 'Enemy projectiles within 28px of the cushion are destroyed and add a pin, while it holds fewer than 8.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'The self-pin is a crossing: walk off it and back on to be pinned again, at another pin\'s cost.',
        'Spikes of Ruin and the like treat the cushion as a structure and can knock it down.',
      ],
    },

    'cloth-burning-man': {
      basics:
        'Your clothes catch fire for 6 seconds. The scarf sheds a scrap of burning cloth every 0.15s from '
        + 'somewhere along its length; each scrap hits for 6 and sets its target alight for 4 a second over '
        + '2.5s. Needles go red-hot — 50% more damage and they ignite. Anybody bound in your cloth burns '
        + 'for 10 a second. Your pincushion catches, and from then on it spits 8 hot pins every 0.65s until '
        + 'it is empty and gone. 22s cooldown.',
      cast: 'Q, ultimate. Instant. 22s cooldown.',
      effects: [
        { tag: 'damage', label: 'Burning scraps', detail: 'One every 0.15s from along the scarf, drifting for 1s. 6 damage and ignite (4/s for 2.5s) to anyone within 16px.' },
        { tag: 'buff', label: 'Red-hot needles', detail: '×1.5 damage on drops, throws and E+ pins, and every hit ignites.' },
        { tag: 'dot', label: 'Burning bonds', detail: 'Anybody bound or jacketed by you burns for 10 a second while it lasts.' },
        { tag: 'dot', label: 'The cushion catches', detail: 'Burns until empty, firing 8 hot pins every 0.65s and losing one each time — even after Burning Man ends.' },
        { tag: 'utility', label: 'Duration', detail: '6 seconds.' },
      ],
      upgrade: {
        basics:
          'Father of the Flame: you become a towering burning effigy, a third larger (hitbox included) and '
          + 'rooted where you lit it — no dragging, no clotheslines, and nothing can bind or throw you. The '
          + 'scarf hand is a blackened char claw with no limit to its reach, so it grips, grabs and punches '
          + 'anywhere in the arena, for 35 on a punch and 24 on a smack, igniting what it hits. You can still '
          + 'be hurt, but every hit (at most every 0.25s) sets whoever is nearest alight for 8 a second over '
          + '3s and throws 7 burning embers off you. Everything Burning Man does, it still does.',
        effects: [
          { tag: 'movement', label: 'Endless reach', detail: 'The claw reaches 2400px — the whole arena — and does not slip.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'The char claw', detail: 'Punch 35, smack 24, and both ignite (4/s for 2.5s).', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Burning wounds', detail: 'Every hit you take (at most every 0.25s) ignites whoever is nearest for 8/s over 3s and throws 7 embers that hit for 6 and ignite.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'A bigger target', detail: 'The effigy is 1.35× size — hitbox and all.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'Rooted', detail: 'For all 6 seconds you cannot move: grips do not haul, clotheslines cannot be caught, and your speed is 0. Bolas and jackets cannot bind you either.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'When the effigy ends, a grip held further out than an ordinary scarf can reach is let go of.',
        'Ruin\'s Second Skin puts the fire out early.',
      ],
    },
  },
};

export default cloth;
