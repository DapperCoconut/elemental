import { ElementCodex } from '../AbilityCodex';

/**
 * Echo — the element that turns the lights off.
 *
 * Verified against `src/elements/echo.ts`, `kits/EchoKit.ts`, the five shop upgrades in
 * `data/Upgrades.ts`, the Beacon perk in `data/Perks.ts` and the two mastery enhancements in
 * `data/Mastery.ts`.
 */
const echo: ElementCodex = {
  identity:
    'The only element that changes what you can see. Pick Echo and the arena goes black except '
    + 'for a circle around you — for both of you — and the whole match becomes a question of who '
    + 'knows where the other one is. Every key is an answer to that question and every one of them '
    + 'is a gamble: the click is a bouncing shout you fire into the dark and hope finds somebody, '
    + 'E is a literal guess at a patch of floor that punishes you for being wrong, R hands you a '
    + 'lantern that makes you the brightest thing in the room, F turns you into a bat, and Q takes '
    + 'the dark off everything at once. Echo does perfectly ordinary damage. What it actually '
    + 'plays for is information.',

  passives: [
    {
      emoji: '🌑',
      name: 'The Dark',
      magic:
        'A black sheet is laid over the entire arena and a hole is cut in it around you. That is '
        + 'the whole passive, and it applies to the match rather than to the enemy: neither of you '
        + 'can see anything outside your own circle of light, and every readout the game normally '
        + 'gives you for free — where they are, what they are casting, whether that shot is coming '
        + 'at you — has to be earned by an ability.',
      effects: [
        { tag: 'utility', label: 'How far you see', detail: '90px of clear ground around you normally. 128px with the lantern lit, and only 45px in bat form — a bat sees by sound, not by light.' },
        { tag: 'utility', label: 'What the dark hides', detail: 'Everything. Bodies, projectiles, hazards and health bars are all painted under the sheet.' },
        { tag: 'utility', label: 'What lifts it', detail: 'A landed Guess opens an 80px window for half a second. An Echo summon shows only its own 14px of body. Total Eclipse takes the sheet off the whole arena for 4 seconds.' },
        { tag: 'buff', label: 'Bioluminescence', detail: 'Warping to a bloom leaves you glowing for 8 seconds: your own light is ×1.25 wider, which is 112px normally and 160px with the lantern up.', requiresMastery: true },
      ],
      notes: [
        'The lantern is the element\'s central tension: 128px is nearly half again the base circle, and it makes you visible to somebody who can only see 90px.',
        'The Torch divine perk replaces the steady circle with a flame — half again as wide at full health, guttering down to 30% of normal once you have soaked 350 raw damage. It reads damage taken rather than current health, so healing cannot relight it.',
      ],
    },
    {
      emoji: '👁️',
      name: 'Psychic Eyes',
      magic:
        'Once the E+ or Q+ upgrade is owned, small pale eyes start collecting around you, drifting '
        + 'on their own orbits. They are not an attack and they are not vision. They are a stored '
        + 'certainty: spend one and the next thing you cast stops being a guess entirely, because '
        + 'it is aimed at the enemy rather than at where you think the enemy is.',
      effects: [
        { tag: 'buff', label: 'Right-click to spend one', detail: 'Consumes an eye and arms the next cast. Whatever you press next — E, R, F or Q — is retargeted onto the enemy\'s exact position rather than your cursor.' },
        { tag: 'utility', label: 'The cap', detail: '5 at once. A sixth prints (max) and is refused.' },
        { tag: 'utility', label: 'It needs an upgrade', detail: 'The right-click does nothing at all unless E+ Paranoia or Q+ Hypersense is owned. Without one, the eyes are decoration.' },
      ],
      notes: [
        'An armed eye makes the Guess a certainty, which pairs with Paranoia: a guaranteed hit drops the cooldown to a second, and the next one can be a real guess.',
        'It is also the only reliable way to land a direct-target Lantern, Bat Form or Eclipse against somebody you genuinely cannot see.',
      ],
    },
  ],

  abilities: {
    'echo-shot': {
      magic:
        'A shout thrown out of the mouth as a hard white wavefront. It does not stop at the walls '
        + '— it comes off them, again and again, and each bounce knocks dust loose and answers '
        + 'with a chirp of its own so you can hear where the room is. It is the only thing in the '
        + 'kit that does honest damage, and the only one that keeps working after you have lost '
        + 'track of everything.',
      cast: 'Click, aimed at the cursor. 2s cooldown.',
      effects: [
        { tag: 'damage', label: 'The hit', detail: '18 damage to anything within 28px of it. The shout is spent on the first body it reaches.' },
        { tag: 'area', label: 'The flight', detail: '440 px/s, bouncing off the arena edges up to 5 times before it dies. Each bounce is gated at 0.5s so a corner cannot eat two at once.' },
        { tag: 'utility', label: 'It maps the room', detail: 'Every bounce throws a chirp back off the wall it hit and knocks three motes loose, which is genuinely readable information about where the walls are in the dark.' },
        { tag: 'utility', label: 'The collapse scales with travel', detail: 'The wavefront that lands is bigger the further it came — 46px plus 6 per bounce, with more arcs and a longer ring. Cosmetic, but it tells you how far the shot had gone.' },
      ],
      upgrade: {
        magic:
          'Re-location makes the shout follow you. On every bounce it turns most of the way toward '
          + 'your cursor, so instead of a ball ricocheting away into the dark it comes back around '
          + 'and keeps coming — a shot you steer with the mouse, one wall at a time.',
        effects: [
          { tag: 'buff', label: 'The bend', detail: 'On each bounce the shout rotates 60% of the way from its current heading toward your cursor, keeping the same 440 px/s.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'Only on a bounce', detail: 'It steers at the walls, not continuously. A shout with nothing to bounce off travels perfectly straight.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'Five bounces at 440 px/s is several seconds of a live shot in the arena, which is why the click is the element\'s primary damage rather than an opener.',
        'A bot\'s Re-location bends toward the player\'s actual position rather than a cursor, which makes an upgraded Echo opponent\'s shouts genuinely hard to shake.',
      ],
    },

    'echo-guess': {
      magic:
        'You point at a patch of blackness and commit. If they are there, the dark peels off them, '
        + 'a gold eye opens over their head and they take a real hit. If they are not, the sound '
        + 'comes back empty, three lost chirps go out of you in random directions, and you spend '
        + 'the next three seconds staggering at half speed. Nothing else in the game asks you to '
        + 'be right about something you cannot see.',
      cast: 'E, aimed at the cursor. 5s cooldown. The wash it throws is tight when it lands and loose when it does not, so the shape alone tells you whether you were right.',
      effects: [
        { tag: 'damage', label: 'A direct hit', detail: '30 damage within 35px of where you pointed, plus a 0.5-second reveal of the spot.' },
        { tag: 'damage', label: 'A near miss', detail: '15 damage if they are within 72px — the wash is wider than the guess, so being roughly right is still worth something.' },
        { tag: 'cost', label: 'Being wrong', detail: 'Disoriented: 50% move speed for 3 seconds, and the cooldown is gone. It is the single worst thing you can do to yourself in this element.' },
      ],
      upgrade: {
        magic:
          'Paranoia rewards certainty with more of it. Get a guess right — direct or near — and '
          + 'the cooldown collapses from five seconds to one, so a Echo player who has actually '
          + 'found somebody can keep asking until they lose them again.',
        effects: [
          { tag: 'buff', label: 'The chain', detail: '4 seconds knocked straight off the cooldown on any correct guess, leaving 1 second. It works on the 15-damage near miss as well as the 30.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'It also switches the eyes on', detail: 'Owning either this or Q+ is what makes the Psychic Eyes passive spendable at all.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'A chain of guesses at 1 second each is by a distance the highest damage output in the element — and one miss ends it, spends five seconds and halves your speed.',
        'Spending a Psychic Eye before pressing E aims it at their exact position, which turns the gamble into a guaranteed 30 and a guaranteed chain.',
      ],
    },

    'echo-lantern': {
      magic:
        'Two completely different abilities behind one key, decided by whether your cursor is on '
        + 'somebody. Point at empty space and you strike a lantern — the wick catches, the dark is '
        + 'shoved back off it, and you can suddenly see half again as far. Point at a body and you '
        + 'tear the sound off them instead, and it stands up next to them as a copy that fights '
        + 'on your side.',
      cast: 'R. 10s cooldown. A body within 35px of the cursor summons; anything else toggles the lantern.',
      effects: [
        { tag: 'utility', label: 'The lantern', detail: 'A toggle: 128px of vision instead of 90 for as long as it stays lit. Pressing R again puts it out.' },
        { tag: 'cost', label: 'It shatters', detail: 'Any damage at all — one point — breaks the lantern instantly, with a hard flash and the dark rushing back in. There is no grace period.' },
        { tag: 'summon', label: 'The Echo', detail: '25 HP, alive 10 seconds, walking toward whoever you are fighting at 80 px/s and stopping 40px short.' },
        { tag: 'damage', label: 'What it fires', detail: 'A slow chirp every 2 seconds at 160 px/s for 5 damage. Deliberately weak — it is a distraction and a moving light source, not a turret.' },
        { tag: 'utility', label: 'A summon is a light', detail: 'It shows 14px of itself through the dark and nothing around it, so an Echo walking at somebody is a small moving pinprick the enemy can watch coming.' },
      ],
      upgrade: {
        magic:
          'Healing Light makes the lantern worth the risk it puts you in. While it burns it feeds '
          + 'you, and every Echo you tear off somebody comes with a small lamp of its own.',
        effects: [
          { tag: 'heal', label: 'The warmth', detail: '5 HP a second while the lantern is lit, paid out as 1 point every 200ms so it lands even in short windows.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Lit summons', detail: 'Every Echo summoned while the upgrade is owned carries its own small circle of light, which makes a summon a scout rather than a pinprick.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'The heal is real sustain — thirty seconds of an unbroken lantern is 150 health — and the whole difficulty is that one stray hit ends it.',
        'A summon is destroyed by 8 damage a shot from enemy projectiles, so three shots take one down. It also eats the shot that killed it.',
        'The summon has to be aimed at an actual body, so getting one at all usually means either a Psychic Eye or a very good idea of where they are standing.',
      ],
    },

    'echo-bat': {
      magic:
        'The body comes apart into a flock. Aimed at nothing you simply become a bat: half size, '
        + 'double speed, and almost blind — a bat navigates by sound, so your light shrinks to '
        + 'forty-five pixels. Aimed at a body you become the flock that lands on them, and you '
        + 'cannot be touched while you are drinking.',
      cast: 'F. 15s cooldown. A body within 35px of the cursor is attached to; anything else is the form change.',
      effects: [
        { tag: 'movement', label: 'Bat form', detail: '5 seconds at ×2 move speed and half size, with vision cut from 90px to 45px. Every ability except the click is locked out for the duration.' },
        { tag: 'movement', label: 'The attach', detail: '3 seconds. You are flown onto them at 500 px/s and held on their body, and you cannot move or cast for any of it.' },
        { tag: 'shield', label: 'Untouchable while attached', detail: 'Fully invincible for the whole 3 seconds. It is the only hard immunity in the element.' },
        { tag: 'dot', label: 'The drain', detail: '3 damage every 0.5 seconds while attached — 18 across the three seconds — with a thread of them dragged back toward the thing on their shoulder each pull.' },
      ],
      upgrade: {
        magic:
          'Alpha Bat is a different animal. The bat turns grey, it is the only form you can '
          + 'echolocate from, and you can drop out of it whenever you like. And a bat that has '
          + 'actually landed on somebody leaves a mark: eight seconds of the sound answering back '
          + 'off them whether they like it or not.',
        effects: [
          { tag: 'utility', label: 'Recast to cancel', detail: 'Pressing F again during bat form drops it instantly, for free, with no cooldown spent. Not available during an attach.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'The tracker', detail: 'An attach leaves an 8-second tag: every 3 seconds the target is pinged — a sonar wash, an eye and the word "ping" over their head — wherever they are, through the dark.', requiresUpgrade: 'f' },
          { tag: 'cost', label: 'Only the bat shouts', detail: 'Echolocation is restricted to bat form, which turns the whole element into a hit-and-run: go bat, shout, come back.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Three seconds of invincibility for 18 damage is a poor trade on paper and an excellent one in practice — it is three seconds of the enemy\'s ultimate landing on nobody.',
        'Bat form doubles your speed and halves your sight at the same time, which makes it superb for crossing the arena and useless for finding anybody.',
        'The tracker is the most reliable information in the entire element. Eight seconds of knowing exactly where they are is worth more than anything the ability actually damages them for.',
      ],
    },

    'echo-eclipse': {
      magic:
        'Two endings, and the same key. Aimed at nothing, the dark is torn off the whole arena at '
        + 'once with a scream of sonar — everything is visible, and everybody\'s aim goes to '
        + 'pieces. Aimed at a body, eight standing waves are strung across the room instead, each '
        + 'announcing itself with a chirp, and three seconds later every one of them lets go along '
        + 'its entire length.',
      cast: 'Q, ultimate. 40s cooldown. A body within 35px of the cursor gives the lines; anything else gives the reveal.',
      effects: [
        { tag: 'utility', label: 'The reveal', detail: '4 seconds with no dark at all, anywhere. Both players can see everything.' },
        { tag: 'debuff', label: 'Their aim goes', detail: '90° of aim scatter on the enemy for the full 4 seconds — so revealing the room does not simply hand them a free shot at you.' },
        { tag: 'damage', label: 'The lines', detail: '8 standing waves at random positions and angles, each the full arena diagonal long, detonating 3 seconds after the cast for 60 damage to anything within 35px of the line.' },
        { tag: 'area', label: 'The warning', detail: 'Each line chirps at its centre 60ms apart as it is laid, so there are three full seconds in which to work out where not to be standing.' },
      ],
      upgrade: {
        magic:
          'Hypersense is the reveal turned into a defence. For the four seconds the arena is lit '
          + 'you simply do not get hit — you feel everything coming and step out of the way of it, '
          + 'automatically. And the lines, if you chose those instead, leave their afterimage '
          + 'burning across the floor long after they have gone off.',
        effects: [
          { tag: 'shield', label: 'Hypersense', detail: 'Automatic dodging of incoming projectiles and melee for the whole 4-second reveal. It is on the non-direct cast only.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'Lingering lines', detail: 'A direct Q\'s detonations are bigger — 62px instead of 48 and nine blasts along each line instead of six — and the afterimage holds for 2.4 seconds instead of half of one.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'It also switches the eyes on', detail: 'Owning either this or E+ Paranoia is what makes the Psychic Eyes passive spendable.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Eight lines at 60 damage each is a theoretical 480, and in practice a body that stands still for three seconds catches two or three of them. The three-second telegraph is not generous by accident.',
        'The reveal is the more useful half against a human and the lines are the more useful half against a bot, which wanders into them.',
        'Hypersense is the only mastery requirement in this element that needs a specific upgrade to be trained at all.',
      ],
    },
  },

  perks: {
    beacon: {
      magic:
        'The circle of light becomes a torch beam. Instead of seeing evenly in every direction you '
        + 'see a cone in front of you, pointed wherever the cursor is — narrower than the circle, '
        + 'and much further. Three batteries hang at the edge of the screen, and the lantern key '
        + 'stops being free: everything it does now costs charge.',
      cast: 'Passive vision change, plus a battery cost on every R press.',
      effects: [
        { tag: 'utility', label: 'The cone', detail: '130px of reach and 35° either side of the cursor — a 70° wedge — instead of a 90px circle. Much further in the direction you are looking and completely blind everywhere else.' },
        { tag: 'resource', label: 'The batteries', detail: '3, each recharging over 8 seconds independently.' },
        { tag: 'utility', label: 'Lantern on empty space', detail: '1 battery, and the cone widens by 20% — to 156px — for 2 seconds.' },
        { tag: 'utility', label: 'Lantern on a body', detail: '2 batteries, and the Echo summon works exactly as normal.' },
        { tag: 'cost', label: 'Empty means refused', detail: 'Not enough charge and the press prints 🔋 EMPTY and does nothing — no cast, no cooldown.' },
        { tag: 'utility', label: 'Bat form still blinds you', detail: 'The cone shrinks to 60px in bat form, and bioluminescence multiplies whatever it currently is by 1.25.' },
      ],
      notes: [
        'The trade is directional certainty for total blindness behind you. It makes chasing enormously easier and being chased considerably worse.',
        'Two batteries for a summon means an Echo costs most of your vision budget, which is a real decision rather than a free extra.',
        'The lantern toggle\'s 128px circle is replaced by the cone entirely — the perk changes what the vision *is*, not just its size.',
      ],
    },
  },

  mastery: {
    'vibration-detection': {
      magic:
        'You stop needing to see them. A short arc of light flares around you pointing at the '
        + 'quadrant a disturbance came from — a thin one for a footstep, a wider and brighter one '
        + 'for a cast. It never tells you the distance and it never tells you the exact angle. '
        + 'It tells you which way to look, which in an element built entirely on not knowing that '
        + 'is close to everything.',
      effects: [
        { tag: 'utility', label: 'A footstep', detail: 'Sampled every 90ms; more than 6px of movement flares a 64°-wide arc at 34px, held for 0.42 seconds. Rate-limited to one every 220ms so walking does not become a solid ring.' },
        { tag: 'utility', label: 'A cast', detail: 'Every ability the enemy casts flares immediately — an 84° arc at 40px, held for 0.7 seconds and drawn noticeably brighter. It is never rate-limited.' },
        { tag: 'utility', label: 'Four quadrants only', detail: 'Right, down, left and up, taken from the angle to the enemy. Deliberately coarse: it says "over there somewhere", never how far.' },
        { tag: 'utility', label: 'It is always on', detail: 'No cast, no cooldown, no resource. It works through the dark, through bat form and through the lantern being out.' },
      ],
      notes: [
        'A cast flaring brighter than a footstep is the real information. Somebody who has just pressed a key is somebody whose ultimate is in the air.',
        'It pairs directly with Guess: a quadrant plus a cursor is a far better bet than a cursor alone, and the whole cost of a wrong guess is what this exists to reduce.',
      ],
    },
    'echo-bloom': {
      magic:
        'You plant eyes and then move into them. A seed thrown at a wall takes root as a pale '
        + 'flower; a seed thrown at a *person* erupts out of them as a red terror bloom that grows '
        + 'in their chest. Hold the key and your sight leaves your body entirely — you are looking '
        + 'out of the flower, in a small pool of its own light, somewhere else in the arena — and '
        + 'from there you can shoot, hop between them, or simply step through and come out inside '
        + 'the flower yourself.',
      cast: 'Tap the bound key to launch a seed at the cursor; hold it for 0.22s to open a bloom\'s eye. 12s cooldown on the plant.',
      effects: [
        { tag: 'summon', label: 'Echo blooms', detail: 'A seed at 540 px/s planting on the first wall or body it touches. Up to 3 at once; a fourth replaces the oldest. They never wilt.' },
        { tag: 'debuff', label: 'Terror blooms', detail: 'Aiming the cast within 35px of a body sprouts one straight out of them for 15 seconds, cutting their damage dealt by 25% for the whole time it is rooted.' },
        { tag: 'utility', label: 'Looking through one', detail: 'A 76px pool of light around the bloom — 50px for a terror bloom — and the arena is dark everywhere else, including around your own body.' },
        { tag: 'damage', label: 'Shooting out of one', detail: 'Click while viewing to spit a bullet at your cursor: 5 damage from an echo bloom, 10 from a terror bloom, at 620 px/s, one every 0.35 seconds.' },
        { tag: 'shield', label: 'Shooting yourself', detail: 'A bullet that finds your own body is worth +25 shield HP instead of damage.' },
        { tag: 'utility', label: 'Hopping', detail: 'Right-click while viewing cycles to the next bloom, drawing a line from the eye you left to the one you took.' },
        { tag: 'movement', label: 'Stepping through', detail: 'Space teleports you into the bloom. The bloom is spent, and you glow bioluminescent for 8 seconds with your own light 25% wider. Warping to a terror bloom also hands you 100 weak HP.' },
        { tag: 'shield', label: 'The price of the view', detail: 'Entering grants 100 shield HP. Lose all of it and you are thrown out instantly, and leaving voluntarily strips whatever is left — the shield belongs to the eye, not to you.' },
        { tag: 'utility', label: 'A terror bloom sees differently', detail: 'Looking through one paints every step the enemy has taken over the last 6 seconds as a heat trail, sampled 14 times a second.' },
      ],
      notes: [
        'Your body is still standing in the arena while you are looking out of a flower, and it is completely undefended except by the hundred shield the view gave you.',
        'A terror bloom is the best object in the element: 25% off their damage, a doubled bullet, a full record of where they have walked, and a hundred weak HP if you decide to teleport into them.',
        'Planting is the only thing on a cooldown. Viewing, hopping, shooting and warping are all free once a bloom is in the ground.',
        'Three permanent eyes scattered around a dark arena is the closest this element gets to solving its own problem.',
      ],
    },
  },
};

export default echo;
