import { ElementCodex } from '../AbilityCodex';

/**
 * Slime — the element with no legs.
 *
 * Verified against `src/elements/gum.ts`, `kits/GumKit.ts` and the five shop upgrades in
 * `data/Upgrades.ts`. Slime has no perks and no mastery enhancements; every figure below is a
 * constant at the top of the kit. Its element id is `gum` because `slime` already belonged to
 * Acid when this was built — everything the player sees says Slime.
 */
const gum: ElementCodex = {
  identity:
    'The only character in the game that cannot walk. There is nothing under the blob but more '
    + 'blob; what it has instead is one enormous gummy arm, and every inch of ground it covers is '
    + 'covered by throwing that arm at the floor, gripping, and hauling the body in after it. '
    + 'That one decision is the whole element: the hand is the legs, the hand is the weapon and '
    + 'the hand is the inventory, so picking anything up — a slimeball, a person, a puddle — is '
    + 'also a decision to stand perfectly still until you put it down. Slime never needs a '
    + 'resource bar, because every trade it makes is paid in the same currency, and the ultimate '
    + 'is the most expensive thing in the game: three seconds with no hand at all.',

  passives: [
    {
      emoji: '🖐️',
      name: 'The Hand',
      magic:
        'A single translucent green arm, stretched out of the body toward the cursor and thinning '
        + 'as it goes. Click and it grips whatever it is over: a splat of slime spreads on the '
        + 'floor and the arm goes taut. From that moment the cursor stops being an aim and becomes '
        + 'a handle — every pixel you drag the mouse hauls the body one pixel the *other* way. '
        + 'Pull the mouse back and you go forward. The entire arena is a set of handholds.',
      effects: [
        { tag: 'movement', label: 'The drag', detail: '1 pixel of body per pixel of mouse travel on the floor, 1.35 on a wall — a wall is something to pull against rather than slide on. Capped at 560 px/s however fast you throw the cursor.' },
        { tag: 'area', label: 'The reach', detail: '250px of arm, with a 20px minimum. Anything within 54px of an arena edge counts as a wall rather than the floor.' },
        { tag: 'utility', label: 'The rope', detail: 'At full extension the body may swing around the anchor but never further from it, so the arm cannot be walked past its own length.' },
        { tag: 'cost', label: 'The slip', detail: 'Wind the cursor more than 437px from the anchor and the grip tears — 💢 SLIPPED, the body stops dead, and the hand has to be thrown again.' },
        { tag: 'cost', label: 'A full hand is a still body', detail: 'Holding a slimeball, a gummed enemy, a puddle or a caught shot means no grip, and no grip means the velocity is written to zero every frame. You do not move at all while you are carrying anything.' },
        { tag: 'utility', label: 'The drawn hand is the real one', detail: 'The hitbox is read straight back off the rendered hand every frame, so what you see is exactly what you hit and exactly what can pick something up.' },
      ],
      notes: [
        'A Space dodge is the one movement a slime makes without its arm — the dash owns the body outright and the drag stands aside for it.',
        'A bot has no mouse and therefore cannot drag itself. Its movement is pulsed instead — a hard haul at ×1.45 for a little over half a second, then ×0.2 while an imaginary arm is thrown out again — so it lurches at roughly the average speed a dragging player manages.',
        'Throw velocity is the hand\'s own velocity ×1.15, clamped between 340 and 940 px/s. A flick genuinely beats a nudge, and a hand that was barely moving throws down the aim at the 340 minimum.',
      ],
    },
    {
      emoji: '🫲',
      name: 'The Smack',
      magic:
        'Whipping the arm past somebody fast enough hurts them. No press, no cooldown, no aim — '
        + 'just the hand travelling at speed through the space a body is standing in. It is the '
        + 'reason a slime\'s cursor work is never wasted motion: half the flicks you make to set '
        + 'up a throw are also hitting the person you are throwing at.',
      effects: [
        { tag: 'damage', label: 'The hit', detail: '15 damage to anything within 32px of the hand, whenever the hand is moving at 620 px/s or faster. 24 instead while the hand of stone is up.' },
        { tag: 'utility', label: 'The gate', detail: '520ms per target, so a hand swirling over one body is worth about 29 damage a second and no more.' },
        { tag: 'cost', label: 'Only an empty, free hand', detail: 'It does nothing while you are gripping, carrying anything, or waiting for a shattered hand to grow back.' },
      ],
      notes: [
        'This is free damage attached to the movement system, which is what stops the drag from feeling like pure overhead. Route your hauls through the enemy rather than around them.',
        'The hand of stone turns the smack into 24 and also solidifies whatever it brushed — a passing enemy in gum is sealed for five extra seconds by a movement you were making anyway.',
      ],
    },
  ],

  abilities: {
    'gum-grab': {
      magic:
        'The click resolves against whatever the hand happens to be over, and the order it checks '
        + 'in is the ability. Things that can be *carried* outrank things that can be *hit*, '
        + 'because somebody reaching for a slimeball at the enemy\'s feet meant the slimeball. '
        + 'Only the last branch of it — a fist arriving in somebody\'s face — costs anything at all.',
      cast: 'Click, held. 0.42s cooldown, and only the punch ever spends it — gripping, grabbing and hauling are the passive using the same hand, and charging a cooldown for walking would be absurd.',
      effects: [
        { tag: 'damage', label: 'The punch', detail: '20 damage to anything within 36px of the hand — or within 56px of your body, so a point-blank click lands without aiming. A miss still spends the 0.42s.' },
        { tag: 'utility', label: 'Picking up a gummed body', detail: 'First priority, within 48px. They ride the hand and go exactly where it goes, and the gum\'s timer stops running while they are carried.' },
        { tag: 'utility', label: 'Picking up a slimeball', detail: 'Second priority, within 47px, and only your own.' },
        { tag: 'utility', label: 'Picking up a puddle or a beacon', detail: 'Third priority, within 40px, and only your own. Picking a lit beacon back up puts it out and loses whatever shaking was banked in it.' },
        { tag: 'utility', label: 'Catching a shot', detail: 'Fourth priority, within 34px: an enemy projectile is pulled out of the air, destroyed, and becomes a throwable ball worth exactly the damage it would have done. It applies no slow and evaporates at the end of its 1.5s flight rather than becoming a slimeball.' },
        { tag: 'movement', label: 'Gripping', detail: 'Last priority — the floor or a wall, which is the entire locomotion system. See The Hand.' },
      ],
      upgrade: {
        magic:
          'Zip-Line hangs three strands of slime wall to wall, cutting the room into bands. '
          + 'Nothing in the game can touch them except your hand. Catch one and it hauls you flat '
          + 'across the whole arena on its own — no dragging, no cursor work at all — which makes '
          + 'it the only movement in the element the mouse is not responsible for. The price is '
          + 'that you are committed: you go the way you set off.',
        effects: [
          { tag: 'movement', label: 'The ride', detail: '640 px/s horizontally, multiplied by whatever slows are on you, until you hit the far wall or let go. The body settles onto the line rather than snapping to it, so catching one from below reads as a haul.', requiresUpgrade: 'click' },
          { tag: 'area', label: 'The lines', detail: '3 strands at evenly spaced heights across the playable area, hung once for the match. The hand has to land within 22px of one to catch it — kept tight so the floor stays grabbable.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'The direction is locked in', detail: 'Taken from which side of your body the hand landed on. There is no steering mid-ride, and the mouse is ignored entirely for the duration.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'With the hand of stone', detail: 'Stone grinding on slime throws 7 sparks every 110ms, each 4 damage, at 300 px/s for 260ms — a shower down the whole length of the ride.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'A caught shot is the element\'s answer to being shot at, and it is a genuine reversal: the damage figure is the attacker\'s own.',
        'The zip-line branch only ever runs for the local player. An online Slime opponent\'s replica grips the floor there instead.',
        'A bot cannot flick a ball with a cursor, so out of punching range its click throws the nearest of its own resting slimeballs at 620 px/s instead — the same decision, made for it.',
      ],
    },

    'gum-surge': {
      magic:
        'Three balls of slime are spat onto the floor in an arc in front of you, and then they '
        + 'just sit there in little puddles of their own, dripping. They are not an attack — they '
        + 'are ammunition, and the only thing in the game that can pick one up is your hand. '
        + 'Getting value out of E means going and standing where the balls are, which is why the '
        + 'ability is really about where you decided to put them.',
      cast: 'E, aimed at the cursor. 7s cooldown. The three land 58–100px out at roughly 24° apart.',
      effects: [
        { tag: 'summon', label: 'The ammunition', detail: '3 slimeballs, resting indefinitely until picked up. 6 on the floor at once per side; casting at the cap deletes the three oldest rather than refusing.' },
        { tag: 'damage', label: 'A thrown ball', detail: '30 damage and a 50% slow for 3 seconds, on the first body it touches. 13px ball, and it hits anything within 29px of it.' },
        { tag: 'utility', label: 'A miss is not a loss', detail: 'A ball that finds a wall or runs out its 1.5s of flight simply lands there and can be picked up and thrown again.' },
        { tag: 'utility', label: 'The throw', detail: 'Speed is your hand\'s own speed ×1.15, floor 340 px/s and ceiling 940. A wound-up flick is nearly three times a nudge.' },
      ],
      upgrade: {
        magic:
          'Slime Splash turns every ball into a bomb with a fuse drawn on it. It no longer looks '
          + 'for a body — it goes off wherever it stops, in a wide green burst, and leaves a '
          + 'puddle of slime on the floor where it landed. The puddle is the real ability: it '
          + 'does almost nothing to somebody passing through and it is close to crippling to '
          + 'somebody who stands in it.',
        effects: [
          { tag: 'damage', label: 'The burst', detail: '30 damage and the 3s slow to everything within 78px of where it stopped, once per body. It never lands a single hit — a body it touches is simply the closest thing to the blast.', requiresUpgrade: 'e' },
          { tag: 'area', label: 'The puddle', detail: '46px, lasting 12 seconds, up to 8 of them at once per side. The oldest is evicted rather than the cast being refused.', requiresUpgrade: 'e' },
          { tag: 'control', label: 'The ramp', detail: 'Standing in one takes 2.5 seconds to sink from full speed down to 40%, and 1.5 seconds out of it to come back. One step through is nearly free; three seconds of standing is not.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Your own slime never slows you', detail: 'The check is against the puddle owner\'s enemies, so Slime Splash is usable point-blank.', requiresUpgrade: 'e' },
          { tag: 'movement', label: 'Scooping one up', detail: 'The hand lifts a puddle from within 40px and can lob it — but a puddle is a heavy sack and the throw is clamped to 340 px/s for 0.42s, about 140px. It is a way of moving your own ground, not a second projectile.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'Balls are the reason a Slime player wants to be near a wall: a ball that lands is ammunition banked, and a wall is where they end up.',
        'A hardened ball does not stick to a wall — it breaks on it, into eight shards.',
        'Puddles are also what Solidify turns into beacons, so a Slime Splash player casting the ultimate is really casting two abilities at once.',
      ],
    },

    'gum-gumball': {
      magic:
        'Nine bubbles of pink gum fired forward in a fan. Each one that lands is a small hit and a '
        + 'large change: the body it touches is wrapped in a shell of gum, badly slowed, and — the '
        + 'part that matters — is now an *object*. The hand does not distinguish between a '
        + 'slimeball on the floor and a person in gum. Both can be picked up, and both can be '
        + 'thrown at a wall.',
      cast: 'R, aimed at the cursor. 9s cooldown. The fan is about 53° wide with a little scatter on each bubble.',
      effects: [
        { tag: 'damage', label: 'The bubbles', detail: '9 of them at 5 damage each, 540 px/s with ±15% variance, alive 0.9s, popping on the first body within 31px.' },
        { tag: 'control', label: 'Encased', detail: '5 seconds at 45% move speed, refreshed by every further bubble. The timer stops running entirely while they are being carried.' },
        { tag: 'control', label: 'Now portable', detail: 'A gummed body is the hand\'s first grab priority and rides it exactly like a slimeball. They cannot walk out; their physics body is written to the hand every frame.' },
        { tag: 'damage', label: 'The wall slam', detail: 'A thrown body that reaches any wall within 1.4 seconds takes 30 damage, is stuck to it for 5 seconds at zero speed, and prints 🧱 STUCK. Five seconds of being unable to move at all is by some distance the hardest lock in the element.' },
      ],
      upgrade: {
        magic:
          'Bubble Bloat makes the barrage worth aiming carefully. One bubble is an ordinary '
          + 'gumball; two or more and a second, far larger balloon inflates on top of the shell, '
          + 'a layer thicker for every bubble that connected. It sits there wobbling until they '
          + 'touch a wall, and then it goes.',
        effects: [
          { tag: 'damage', label: 'The burst', detail: '12 damage per layer, or 18 per layer if you had solidified them first. Six bubbles landing is 72, or 108 hardened — on top of everything the ordinary gumball already did.', requiresUpgrade: 'r' },
          { tag: 'area', label: 'The balloon', detail: '30px plus 7 per layer, capped at 96px, drawn under the gum shell so both are readable at once.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Any wall will do', detail: 'It bursts on contact with any arena edge — whether you threw them into it or they walked into it themselves trying to get away.', requiresUpgrade: 'r' },
          { tag: 'cost', label: 'It dies with the gum', detail: 'The bloat is grown on top of the encasement, so if the 5 seconds run out before they reach a wall the whole balloon is simply deleted.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'The intended line is R into a wall, not R into open floor: the barrage itself is only 45 damage, and everything else in this ability is a delivery mechanism for the slam.',
        'Carrying somebody means you cannot move, so the throw has to be set up by flicking the hand rather than by walking them anywhere.',
        'Solidify adds 5 seconds to every encasement you own and makes the thrown body shatter into eight shards against the wall.',
      ],
    },

    'gum-oozorbtion': {
      magic:
        'The body swells by a fifth and opens up. It is the one thing in this element that does '
        + 'not involve the hand at all — you are just standing there, bigger, being a mouth. The '
        + 'next attack that reaches you does not land: it is swallowed, and it sits visibly inside '
        + 'the blob for three seconds while it breaks down, and then it comes out as exactly that '
        + 'much health.',
      cast: 'F. 12s cooldown. The mouth stays open for 8 seconds or until something is caught, whichever comes first.',
      effects: [
        { tag: 'shield', label: 'The swallow', detail: 'The next single instance of damage is nullified entirely, however large, and its figure is banked. Caught two ways on purpose: enemy shots are plucked out of the air within 42px of the body, and everything that never becomes a projectile — a melee swing, a beam tick, a hazard — is taken by a damage absorber, so it is never a dead button against half the roster.' },
        { tag: 'heal', label: 'The digestion', detail: '3 seconds later you are healed for exactly the number that was swallowed. A 90-damage ultimate eaten is 90 health.' },
        { tag: 'cost', label: 'The swelling', detail: '×1.2 body size for the whole armed window, which makes you a measurably easier thing to hit while you wait.' },
        { tag: 'cost', label: 'One at a time', detail: 'While something is lodged the absorber steps aside and hands the hit back to whatever was underneath it. You cannot bank two.' },
        { tag: 'utility', label: 'Nothing came', detail: 'If the 8 seconds run out empty it says 🫠 NOTHING CAME, the swelling drops, and the cooldown was the whole cost.' },
      ],
      upgrade: {
        magic:
          'Emesis is what swallowing costs you. Every time something goes down, some of you comes '
          + 'back up: three pink puddles around your feet. They are the same object a Slime Bomb '
          + 'leaves behind with the sign flipped — they feed the slime that made them, and the '
          + 'longer you stand in one the harder they feed.',
        effects: [
          { tag: 'heal', label: 'The trickle', detail: '3 HP a second the moment you step in, ramping over 3 seconds to 12 a second, and falling back over 1.5 seconds once you step out. Paid in whole points with the remainder carried, so even the slowest trickle lands.', requiresUpgrade: 'f' },
          { tag: 'area', label: 'The three', detail: '46px puddles, 12 seconds each, thrown 46–72px around your feet. They share the 8-puddle-per-side budget with your green ones.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'Only you', detail: 'A pink puddle checks for its owner specifically, so nobody else on the field can stand in your sick and get better.', requiresUpgrade: 'f' },
          { tag: 'movement', label: 'Also throwable', detail: 'Scooped and lobbed exactly like a green one, at the same clamped 340 px/s — so a heal you left behind can be brought forward with you.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'The heal is *exactly* what the hit would have been, which makes this the best possible answer to a single large ultimate and a poor answer to a stream of small ones.',
        'Emesis triples the value of the F key: the catch is the burst heal and the puddles are the sustain, and both are only paid out if something actually arrives.',
        'Standing on your own pink puddles while gripping something is the one time in this element that being unable to move is not a cost.',
      ],
    },

    'gum-solidify': {
      magic:
        'Everything of yours on the field goes glassy at once. Your hand does it first and hardest '
        + '— it bursts into sixteen pale jade splinters flying in every direction — and then it is '
        + 'not there, and neither is your ability to move, for three full seconds. Meanwhile every '
        + 'slimeball you left lying around has set into something that hits half again as hard and '
        + 'breaks on walls, everybody you have gummed is sealed in for five seconds longer, and '
        + 'every puddle you have laid has hardened into a beacon.',
      cast: 'Q, ultimate. Instant, no aim. 22s cooldown — by a long way the cheapest ultimate in the game, and the reason is the three seconds of standing still.',
      effects: [
        { tag: 'damage', label: 'The shatter', detail: '16 shards from wherever the hand was, 8 damage each, 420 px/s with ±25% variance, alive 0.9s, one hit per body each. Point-blank that is a real 128 damage; at range it is decoration.' },
        { tag: 'cost', label: 'No hand', detail: '3 seconds with no arm at all. You cannot grip, cannot grab, cannot smack, cannot punch — and because the arm is the legs, you cannot move a pixel.' },
        { tag: 'buff', label: 'Hardened slimeballs', detail: 'Every resting ball of yours goes from 30 to 45 damage. A hardened ball no longer sticks to a wall — it breaks on it, into 8 more shards.' },
        { tag: 'control', label: 'Sealed', detail: 'Every enemy you have encased gets +5 seconds on the gum, and shatters into 8 shards when they are slammed into a wall.' },
        { tag: 'summon', label: 'Beacons', detail: 'Every puddle of yours sets into a 15px beacon that lasts 30 seconds. It is no longer ground — it is an object with a switch on it.' },
      ],
      variants: {
        label: 'A beacon, and how to wake one up',
        variants: [
          { emoji: '🫳', name: 'Pick it up', description: 'A beacon is grabbed from within 40px like anything else. Picking a lit one back up puts it out and loses whatever was banked in it.' },
          { emoji: '🌀', name: 'Shake it', description: 'Whipping the hand at 430 px/s or faster while carrying one banks time, one millisecond per millisecond, up to a 6-second maximum.' },
          { emoji: '🫱', name: 'Set it down', description: 'Releasing puts it exactly where the hand is and lights it for however long it was shaken. Under 0.25s of shaking and it prints 💤 UNSHAKEN and does nothing.' },
          { emoji: '🐌', name: 'A green aura', description: '122px radius. Every enemy inside it moves at 50% speed, flat, wherever in the aura they are standing — no ramp.' },
          { emoji: '💗', name: 'A pink aura', description: '122px radius, from an Emesis puddle. 8 HP a second to you for as long as you stay inside it.' },
        ],
      },
      upgrade: {
        magic:
          'Hand of Stone stops the hand shattering. Instead it sets — into a dark grey claw of '
          + 'five sharp shards, the one thing in this palette that is not slime at all, because '
          + 'the whole point of that hand is that it stopped being alive. You keep it for eight '
          + 'seconds, you never lose your movement, and everything the claw brushes past turns '
          + 'solid on contact.',
        effects: [
          { tag: 'buff', label: 'No shatter, no standstill', detail: 'The 16 shards and the 3 seconds without a hand are both simply gone. This is the single largest thing the upgrade does.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'The claw', detail: 'Punches hit for 32 instead of 20 and passing smacks for 24 instead of 15, for 8 seconds.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'It solidifies on contact', detail: 'Every frame, anything of yours within 32px of the claw goes glassy: slimeballs to 45 damage, puddles to beacons, gum bubbles to hard, and encased enemies sealed with the extra 5 seconds.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Sparks on a zip-line', detail: '7 shards at 4 damage every 110ms for the whole ride across the arena.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'The field-wide hardening — balls, gum and puddles — happens with or without the upgrade. Hand of Stone changes what happens to *your hand*, not what happens to your slime.',
        'Casting with nothing on the floor is close to a waste. The ultimate is worth what you had already spent E, R and F setting up, and nothing more.',
        'The three-second standstill is genuinely lethal in a fight you are losing. Casting Solidify at low health with no wall behind you is how a Slime player dies.',
        'A lit beacon will not age out from under its own aura — its 30-second life is extended past whatever it was shaken for.',
      ],
    },
  },
};

export default gum;
