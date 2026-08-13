import { ElementCodex } from '../AbilityCodex';

/**
 * Slime — the element with no legs.
 *
 * Verified against `src/elements/gum.ts`, `kits/GumKit.ts`, the five shop upgrades in
 * `data/Upgrades.ts` and the mastery in `data/Mastery.ts`. Slime has no perks; every figure below
 * is a constant at the top of the kit. Its element id is `gum` because `slime` already belonged to
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
      basics:
        'The hand is how you move. Gripping drags 1 pixel of body per pixel of mouse travel on the '
        + 'floor and 1.35 on a wall — a wall is something to pull against rather than slide on — capped '
        + 'at 560 px/s however fast you throw the cursor, with 250px of arm and a 20px minimum, and '
        + 'anything within 54px of an arena edge counting as a wall. At full extension the body may swing '
        + 'around the anchor but never further from it, so the arm cannot be walked past its own length, '
        + 'and winding the cursor more than 437px from the anchor tears the grip: 💢 SLIPPED, the body '
        + 'stops dead, and the hand has to be thrown again. A full hand is a still body — holding a '
        + 'slimeball, a gummed enemy, a puddle or a caught shot means no grip, and no grip means your '
        + 'velocity is written to zero every frame. The hitbox is read straight back off the rendered '
        + 'hand every frame, so what you see is exactly what you hit and exactly what can pick something '
        + 'up.',
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
      basics:
        'Any time the hand is moving at 620 px/s or faster it smacks anything within 32px for 15 damage '
        + '— 24 while the hand of stone is up — gated to one hit per target every 520ms, so a hand '
        + 'swirling over one body is worth about 29 damage a second and no more. It only works with an '
        + 'empty, free hand: nothing while you are gripping, carrying anything, or waiting for a '
        + 'shattered hand to grow back.',
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
      basics:
        'One button doing six jobs, in strict priority. It punches for 20 damage to anything within '
        + '36px of the hand, or within 56px of your body so a point-blank click lands without aiming, and '
        + 'a miss still spends the 0.42s. Before that it picks things up: a gummed body within 48px, '
        + 'which rides the hand and goes exactly where it goes with the gum\'s timer stopped while '
        + 'carried; then your own slimeball within 47px; then your own puddle or beacon within 40px, '
        + 'where picking a lit beacon back up puts it out and loses whatever shaking was banked in it; '
        + 'then an enemy shot within 34px, plucked out of the air, destroyed, and turned into a throwable '
        + 'ball worth exactly the damage it would have done, which applies no slow and evaporates at the '
        + 'end of its 1.5s flight rather than becoming a slimeball. Last comes gripping the floor or a '
        + 'wall, which is the entire locomotion system. Only the punch ever spends the 0.42s cooldown.',
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
        basics:
          'Three zip-lines are hung at evenly spaced heights across the playable area, once for the '
          + 'match, and the hand catches one by landing within 22px — kept tight so the floor stays '
          + 'grabbable. A ride is 640 px/s horizontally, multiplied by whatever slows are on you, until you '
          + 'hit the far wall or let go, with the body settling onto the line rather than snapping to it. '
          + 'The direction is taken from which side of your body the hand landed on and locked in: there is '
          + 'no steering mid-ride and the mouse is ignored entirely. With the hand of stone up, stone '
          + 'grinding on slime throws 7 sparks every 110ms at 4 damage each, 300 px/s for 260ms — a shower '
          + 'down the whole length of the ride.',
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
      basics:
        'Lays 3 slimeballs 58–100px out at roughly 24° apart, resting indefinitely until picked up, '
        + 'with 6 on the floor at once per side and a cast at the cap deleting the three oldest rather '
        + 'than refusing. A thrown ball is 30 damage and a 50% slow for 3 seconds on the first body it '
        + 'touches, 13px across and hitting anything within 29px, and its speed is your hand\'s own speed '
        + '×1.15 with a floor of 340 and a ceiling of 940 px/s, so a wound-up flick is nearly three times '
        + 'a nudge. A ball that finds a wall or runs out its 1.5 seconds simply lands there to be picked '
        + 'up and thrown again. 7s cooldown.',
      cast: 'E, aimed at the cursor. 7s cooldown. The three land 58–100px out at roughly 24° apart.',
      effects: [
        { tag: 'summon', label: 'The ammunition', detail: '3 slimeballs, resting indefinitely until picked up. 6 on the floor at once per side; casting at the cap deletes the three oldest rather than refusing.' },
        { tag: 'damage', label: 'A thrown ball', detail: '30 damage and a 50% slow for 3 seconds, on the first body it touches. 13px ball, and it hits anything within 29px of it.' },
        { tag: 'utility', label: 'A miss is not a loss', detail: 'A ball that finds a wall or runs out its 1.5s of flight simply lands there and can be picked up and thrown again.' },
        { tag: 'utility', label: 'The throw', detail: 'Speed is your hand\'s own speed ×1.15, floor 340 px/s and ceiling 940. A wound-up flick is nearly three times a nudge.' },
      ],
      upgrade: {
        basics:
          'A thrown ball stops landing single hits and bursts instead: 30 damage and the 3-second slow to '
          + 'everything within 78px of where it stopped, once per body. It leaves a 46px puddle for 12 '
          + 'seconds, up to 8 at once per side with the oldest evicted rather than the cast refused. '
          + 'Standing in one takes 2.5 seconds to sink from full speed down to 40% and 1.5 seconds out of '
          + 'it to come back, so one step through is nearly free and three seconds of standing is not — and '
          + 'the check is against the puddle owner\'s enemies, so your own slime never slows you and Slime '
          + 'Splash is usable point-blank. The hand can lift a puddle from within 40px and lob it, though a '
          + 'puddle is a heavy sack: clamped to 340 px/s for 0.42s, about 140px. It is a way of moving your '
          + 'own ground rather than a second projectile.',
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
      basics:
        'Fires 9 bubbles across a roughly 53° fan with a little scatter, 540 px/s with ±15% variance, '
        + 'alive 0.9s, popping on the first body within 31px for 5 damage each. Anything hit is encased '
        + 'for 5 seconds at 45% move speed, refreshed by every further bubble, with the timer stopped '
        + 'entirely while they are being carried — because a gummed body is the hand\'s first grab '
        + 'priority and rides it exactly like a slimeball, unable to walk out, its physics body written '
        + 'to the hand every frame. A thrown body that reaches any wall within 1.4 seconds takes 30 '
        + 'damage and is stuck to it for 5 seconds at zero speed, printing 🧱 STUCK: by some distance the '
        + 'hardest lock in the element. 9s cooldown.',
      cast: 'R, aimed at the cursor. 9s cooldown. The fan is about 53° wide with a little scatter on each bubble.',
      effects: [
        { tag: 'damage', label: 'The bubbles', detail: '9 of them at 5 damage each, 540 px/s with ±15% variance, alive 0.9s, popping on the first body within 31px.' },
        { tag: 'control', label: 'Encased', detail: '5 seconds at 45% move speed, refreshed by every further bubble. The timer stops running entirely while they are being carried.' },
        { tag: 'control', label: 'Now portable', detail: 'A gummed body is the hand\'s first grab priority and rides it exactly like a slimeball. They cannot walk out; their physics body is written to the hand every frame.' },
        { tag: 'damage', label: 'The wall slam', detail: 'A thrown body that reaches any wall within 1.4 seconds takes 30 damage, is stuck to it for 5 seconds at zero speed, and prints 🧱 STUCK. Five seconds of being unable to move at all is by some distance the hardest lock in the element.' },
      ],
      upgrade: {
        basics:
          'Encased enemies bloat as well as stick. The balloon is 30px plus 7 per layer of gum, capped at '
          + '96px and drawn under the shell so both are readable, and it bursts for 12 damage per layer — '
          + 'or 18 per layer if you had solidified them first, so six bubbles is 72 or 108 hardened, on top '
          + 'of everything the ordinary gumball already did. It bursts on contact with any arena edge, '
          + 'whether you threw them into it or they walked into it themselves trying to get away. It is '
          + 'grown on top of the encasement, so if the 5 seconds run out before they reach a wall the whole '
          + 'balloon is simply deleted.',
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
      basics:
        'Opens a mouth for 8 seconds or until something is caught. The next single instance of damage '
        + 'is nullified entirely however large, and its figure is banked — caught two ways on purpose, '
        + 'with enemy shots plucked out of the air within 42px and everything that never becomes a '
        + 'projectile taken by a damage absorber, so it is never a dead button against half the roster. '
        + 'Three seconds later you are healed for exactly the number swallowed, so a 90-damage ultimate '
        + 'eaten is 90 health. While it is armed your body is ×1.2 size, which makes you a measurably '
        + 'easier thing to hit while you wait, and while something is lodged the absorber steps aside and '
        + 'hands the hit back to whatever was underneath — you cannot bank two. An empty window says 🫠 '
        + 'NOTHING CAME and the cooldown was the whole cost. 12s cooldown.',
      cast: 'F. 12s cooldown. The mouth stays open for 8 seconds or until something is caught, whichever comes first.',
      effects: [
        { tag: 'shield', label: 'The swallow', detail: 'The next single instance of damage is nullified entirely, however large, and its figure is banked. Caught two ways on purpose: enemy shots are plucked out of the air within 42px of the body, and everything that never becomes a projectile — a melee swing, a beam tick, a hazard — is taken by a damage absorber, so it is never a dead button against half the roster.' },
        { tag: 'heal', label: 'The digestion', detail: '3 seconds later you are healed for exactly the number that was swallowed. A 90-damage ultimate eaten is 90 health.' },
        { tag: 'cost', label: 'The swelling', detail: '×1.2 body size for the whole armed window, which makes you a measurably easier thing to hit while you wait.' },
        { tag: 'cost', label: 'One at a time', detail: 'While something is lodged the absorber steps aside and hands the hit back to whatever was underneath it. You cannot bank two.' },
        { tag: 'utility', label: 'Nothing came', detail: 'If the 8 seconds run out empty it says 🫠 NOTHING CAME, the swelling drops, and the cooldown was the whole cost.' },
      ],
      upgrade: {
        basics:
          'Three pink puddles are thrown 46–72px around your feet, 46px across and lasting 12 seconds, '
          + 'sharing the 8-puddle budget with your green ones. Standing in one heals 3 HP a second the '
          + 'moment you step in, ramping over 3 seconds to 12 a second and falling back over 1.5 seconds '
          + 'once you step out, paid in whole points with the remainder carried so even the slowest trickle '
          + 'lands. A pink puddle checks for its owner specifically, so nobody else on the field can stand '
          + 'in your sick and get better — and it is scooped and lobbed exactly like a green one at the '
          + 'same clamped 340 px/s, so a heal you left behind can be brought forward with you.',
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
      basics:
        'The hand goes hard and everything of yours sets with it. It shatters immediately for 16 shards '
        + 'from wherever the hand was, 8 damage each at 420 px/s with ±25% variance, alive 0.9s and one '
        + 'hit per body — point-blank a real 128 damage, at range decoration — and leaves you with no arm '
        + 'at all for 3 seconds, unable to grip, grab, smack or punch, and because the arm is the legs, '
        + 'unable to move a pixel. Every resting slimeball goes from 30 to 45 damage and stops sticking '
        + 'to walls, breaking on them into 8 more shards; every enemy you have encased gets +5 seconds of '
        + 'gum and shatters into 8 shards when slammed into a wall; and every puddle sets into a 15px '
        + 'beacon lasting 30 seconds, no longer ground but an object with a switch on it. 22s cooldown — '
        + 'by a long way the cheapest ultimate in the game, and the three seconds of standing still are '
        + 'the reason.',
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
        basics:
          'The 16 shards and the 3 seconds without a hand are both simply gone, which is the single '
          + 'largest thing the upgrade does. Instead you wear a claw for 8 seconds: punches hit for 32 '
          + 'instead of 20 and passing smacks for 24 instead of 15, and every frame anything of yours '
          + 'within 32px of it goes glassy — slimeballs to 45 damage, puddles to beacons, gum bubbles to '
          + 'hard, encased enemies sealed with the extra 5 seconds. A zip-line ride throws 7 shards at 4 '
          + 'damage every 110ms for its whole length.',
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

  mastery: {
    'slime-split': {
      basics:
        'Once per match, the hit that would have killed you splits you instead: health can never fall '
        + 'below 1 while the split is still owed, and the hit that would have finished you is what spends '
        + 'it. You become three bodies of 50 HP each — 150 in total, and that pool replaces your maximum '
        + 'health for the rest of the match, a second life rather than a heal. Damage always comes off '
        + 'the hindmost slimeling first, so they are lost one at a time and the body the physics is '
        + 'attached to is the last one standing. Nothing about the hand, the drag, the smack or the carry '
        + 'changes: their arms converge on the same hand and it works exactly as it always did. Each '
        + 'living slimeling can swallow its own projectile, so one Oozorbtion arms all of them and the '
        + 'window stays open until every one has caught something. The cluster is 56% of the size it was, '
        + 'hitbox included. And when the last slimeling is gone there is nothing else — the pool hitting '
        + 'zero is a normal death.',
      cast: 'Passive. Once per match, on the hit that would have killed you, while Slime Mastery is enabled and Slime is the element being played.',
      effects: [
        { tag: 'shield', label: 'The catch', detail: 'Health can never fall below 1 while the split is still owed. The hit that would have finished you is what spends it.' },
        { tag: 'summon', label: 'Three bodies', detail: '50 HP each, 150 in total, and that pool replaces your maximum health for the rest of the match. It is a second life, not a heal.' },
        { tag: 'utility', label: 'Peeled from the back', detail: 'Damage always comes off the hindmost slimeling first, so they are lost one at a time and the body the physics is attached to is the last one standing.' },
        { tag: 'utility', label: 'One hand between them', detail: 'Nothing about the passive, the drag, the smack or the carry changes. Their arms converge on the same hand and it works exactly as it always did.' },
        { tag: 'shield', label: 'Three swallows', detail: 'Each living slimeling can swallow its own projectile. One Oozorbtion arms all of them, and the window stays open until every one has caught something.' },
        { tag: 'utility', label: 'A smaller target', detail: 'The cluster is 56% of the size it was, hitbox included — every ability in the game that has to actually reach you now has less to reach for.' },
        { tag: 'cost', label: 'And then you die', detail: 'When the last slimeling is gone there is nothing else. The pool hitting zero is a normal death, and it ends the match the normal way.' },
      ],
      notes: [
        'Healing puts slimelings back. The three are read straight off the pool, so a digest, a pink Emesis puddle or a beacon that carries you back over 100 restores a body that had already popped.',
        'It is once per match whatever happens to it. Surviving the split and healing back to full does not re-arm it.',
        'A Slime NPC on Nightmare splits too. The passive is not the player\'s alone — it is the element\'s.',
        'The split drops whatever the hand was holding. Whatever it was belonged to a body that no longer exists.',
      ],
    },
    oobleck: {
      basics:
        'A bindable 132px by 26px pane summoned straight into the hand and held across the line from '
        + 'your body to it, never thrown — releasing sets it down where the hand was, and it can be '
        + 'picked back up. Up to 5 enemy projectiles stick in it at once, each dissolving out after 5 '
        + 'seconds to free its slot, and a sixth arriving while all five are full bursts the slab into 2 '
        + 'slime puddles and it is gone. Anyone you are fighting who crosses the pane wears Oobleck for '
        + '12 seconds: a slow that starts at about 90% speed and ramps all the way down to 30% in the '
        + 'moment before it ends. It is not a wall — soft, it stops nothing that has legs, and both of '
        + 'you walk straight through it, with the price only ever paid by them. Solidify, with or without '
        + 'any upgrade, turns it into a real wall: every projectile blocked with no limit, and neither '
        + 'fighter able to walk through at all — and dragging the hand of stone across a slab hardens it '
        + 'on contact the same way. While you carry it you cannot grip, and a slime that cannot grip '
        + 'cannot move a pixel: carrying the shield is standing still behind it. Bindable to E, R or F, '
        + 'never Q. 16s cooldown, one slab at a time.',
      cast: 'The bound key (E, R or F). Summoned straight into the hand and carried. Let go to set it down. 16 second cooldown, one slab at a time. Q is refused as a drop target.',
      effects: [
        { tag: 'shield', label: 'The pane', detail: '132px long, 26px thick, held at the hand and turned across the line from your body to it. Never thrown — releasing sets it down where the hand was, and it can be picked back up.' },
        { tag: 'shield', label: 'It eats shots', detail: 'Up to 5 enemy projectiles stick in it at once. Each dissolves out after 5 seconds and frees its slot.' },
        { tag: 'cost', label: 'The sixth one', detail: 'A shot arriving while all 5 slots are full bursts the slab into 2 slime puddles where it stood, and the slab is gone.' },
        { tag: 'debuff', label: 'Walk through it', detail: 'Anyone you are fighting who crosses the pane wears Oobleck for 12 seconds: a slow that starts at about 90% speed and ramps all the way down to 30% in the moment before it ends.' },
        { tag: 'utility', label: 'It is not a wall', detail: 'Soft, it stops nothing that has legs. Both of you walk straight through it; the price of doing so is only ever paid by them.' },
        { tag: 'control', label: 'Solidify sets it', detail: 'Q — with or without any upgrade — turns the slab into a wall: every projectile blocked with no limit whatsoever, and neither fighter can walk through it at all.' },
        { tag: 'utility', label: 'The claw sets it too', detail: 'Dragging the Q+ hand of stone across a slab hardens it on contact, the same as it hardens everything else it brushes past.' },
        { tag: 'cost', label: 'A hand holding cover is a hand doing nothing else', detail: 'While you carry it you cannot grip, and a slime that cannot grip cannot move a pixel. Carrying the shield is standing still behind it.' },
      ],
      notes: [
        'A hard slab blocks *your* shots too. That is the real cost of setting it: you have divided the room, and you are on one side of it.',
        'A carried slab does not age. The 22 seconds is a clock on cover you have left somewhere, not on cover you are using.',
        'Hardening one you are holding puts it down first — a wall that follows you around at arm\'s length would not be a wall.',
        'The ramp is a debt, not a hit. Stepping back out of the slab does nothing at all: the slow keeps getting worse for the whole 12 seconds wherever they go.',
        'A Slime NPC plants its slab across the line to you rather than carrying it, and then presses Solidify to set it. A bot with no cursor cannot hold a shield out.',
      ],
    },
  },
};

export default gum;
