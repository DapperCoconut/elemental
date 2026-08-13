import { ElementCodex } from '../AbilityCodex';

/**
 * Technology — a computer, being used against you.
 *
 * Verified against `src/elements/technology.ts`, `kits/TechnologyKit.ts`, the five shop upgrades
 * in `data/Upgrades.ts`, the Adrenaline perk in `data/Perks.ts` and the two mastery enhancements
 * in `data/Mastery.ts`.
 */
const technology: ElementCodex = {
  identity:
    'Somebody has plugged the arena into a machine and the machine is not on your side. Popups '
    + 'that are transparent for one player and solid for the other. A cord fired out of the hand '
    + 'that turns whoever it touches into a box on a grid. A cursor that becomes a *drag* cursor '
    + 'and picks people up. An ultimate that is a typing test. Almost nothing this element does '
    + 'is damage — it is interface, turned into a weapon — and the one thing that is damage, the '
    + 'Cruncher, is a shot whose whole design is that hitting makes it better and missing makes '
    + 'it faster.',

  passives: [
    {
      emoji: '📈',
      name: 'The Cruncher Streak',
      basics:
        'The gun rewards and punishes accuracy on the same meter. A hit is +5% shorter cooldown, +5% '
        + 'damage and +5% projectile speed, stacking to +100% of each. A miss is +10% shorter cooldown '
        + 'but −5% damage and −5% speed, never falling below the base figures. The base shot is 7.5 '
        + 'damage at 420 px/s on a 500ms cooldown, out to 900px with a 26px hit radius, and the cooldown '
        + 'floors at 150ms — so a very long miss streak is three shots a second of very weak triangles.',
      effects: [
        { tag: 'buff', label: 'A hit', detail: '+5% shorter cooldown, +5% damage and +5% projectile speed, stacking to +100% of each.' },
        { tag: 'cost', label: 'A miss', detail: '+10% shorter cooldown, but −5% damage and −5% speed. It never falls below the base figures.' },
        { tag: 'damage', label: 'The base shot', detail: '7.5 damage at 420 px/s, on a 500ms cooldown, out to 900px with a 26px hit radius.' },
        { tag: 'utility', label: 'The floor on the cooldown', detail: '150ms, so a very long miss streak is three shots a second of very weak triangles.' },
      ],
      notes: [
        'The two directions are deliberately not opposites: missing is not simply "worse", it is a faster and softer gun. A Technology player who cannot hit anything is still throwing something.',
        'The mastery requirement Flawless Streak is 25 hits in a row without a single miss, and one qualifying streak completes it permanently.',
        'Firewall exists precisely to protect this: the first three misses per cycle simply do not count.',
      ],
    },
    {
      emoji: '🪟',
      name: 'Two Screens',
      basics:
        'Popups are rendered differently for each side. Yours are translucent: you can see through them '
        + 'and stand under one for shelter, worth 25% damage resistance and invisibility while you are '
        + 'underneath. Theirs are solid, 138×96 pixels each, and twelve of them is most of an arena the '
        + 'enemy cannot see through.',
      effects: [
        { tag: 'utility', label: 'Your side', detail: 'Translucent. You can see through your own popups, and you can stand under one for shelter.' },
        { tag: 'debuff', label: 'Their side', detail: 'Solid, and 138×96 pixels each. Twelve of them is most of an arena the enemy cannot see through.' },
        { tag: 'shield', label: 'Standing under yours', detail: '25% damage resistance and invisibility for as long as you are under it.' },
      ],
      notes: [
        'Subterfuge\'s smoke cloud uses the same trick — one object drawn at two different depths — and this is the other element that plays it.',
        'It also means the enemy cannot easily tell which popups are safe to walk near, because all twelve look identical to them.',
      ],
    },
  ],

  abilities: {
    'tech-cruncher': {
      basics:
        'Fires a triangle at the cursor: 7.5 damage to anything within 26px of it, at 420 px/s, out to '
        + '900px of travel. Every hit adds +5% cooldown, damage and projectile speed to +100% of each, so '
        + 'a fully wound gun is 15 damage at 840 px/s every 250ms; every miss adds +10% cooldown but '
        + 'takes 5% off damage and speed, never past the base numbers. 0.5s cooldown at base, floored at '
        + '0.15s.',
      cast: 'Click, aimed at the cursor. 0.5s cooldown at base, shortened by the streak in either direction, floored at 0.15s.',
      effects: [
        { tag: 'damage', label: 'The shot', detail: '7.5 damage at 420 px/s, hitting anything within 26px of it, out to 900px of travel.' },
        { tag: 'buff', label: 'The hit stack', detail: '+5% cooldown, damage and projectile speed per hit, to +100% of each — a fully wound gun is 15 damage at 840 px/s every 250ms.' },
        { tag: 'cost', label: 'The miss stack', detail: '+10% cooldown but −5% damage and speed, never past the base numbers.' },
      ],
      upgrade: {
        basics:
          'Three misses are eaten with no stat penalty at all — the shot is not counted either way. After '
          + 'the third absorb it takes 20 seconds to regenerate, and it is visibly gone for all of it.',
        effects: [
          { tag: 'shield', label: 'The absorbs', detail: '3 misses eaten, with no stat penalty at all. The shot is not counted either way.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'The rebuild', detail: '20 seconds to regenerate after the third absorb, and it is visibly gone for all of it.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'Firewall is the only thing in the game that protects a streak, and it is why a Flawless Streak of 25 is achievable at all.',
        'Because a miss shortens the cooldown, a Technology player who is losing the aim duel fires more often — which is a genuinely well-shaped consolation prize.',
      ],
    },

    'tech-ads': {
      basics:
        'Scatters 12 popups across the whole arena, 138×96 pixels each, alive for 3 seconds. Standing '
        + 'under one of yours is 25% damage resistance and invisibility, while an enemy who touches one '
        + 'is infected for 5 seconds at 3 damage a second — and worse the faster they are moving, so '
        + 'running from it makes it hurt more. Three seconds makes them a burst of cover rather than '
        + 'terrain: everything about the ability has to happen inside that window. 8s cooldown.',
      cast: 'E. Instant, no aim — they are scattered across the whole arena. 8s cooldown.',
      effects: [
        { tag: 'area', label: 'The popups', detail: '12 windows at 138×96 pixels each, alive for 3 seconds.' },
        { tag: 'shield', label: 'Standing under yours', detail: '25% damage resistance and invisibility while you are under one.' },
        { tag: 'dot', label: 'The virus', detail: 'An enemy who touches one is infected for 5 seconds at 3 damage a second — and worse the faster they are moving, so running from it makes it hurt more.' },
        { tag: 'utility', label: 'Three seconds', detail: 'They are a burst of cover rather than terrain. Everything about the ability has to happen inside those three seconds.' },
      ],
      upgrade: {
        basics:
          'Each cast also installs one random malware, alive 20 seconds, with a 20-second lockout before '
          + 'another can be summoned. The six programs are listed below.',
        effects: [
          { tag: 'summon', label: 'The install', detail: 'One random malware per cast, alive 20 seconds, with a 20-second lockout before another can be summoned.', requiresUpgrade: 'e' },
        ],
      },
      variants: {
        label: 'The three malwares',
        variants: [
          { emoji: '🪿', name: 'Annoying Goose', description: 'Wanders at 130 px/s and chases at 190. Pokes for 12 damage, physically carries the enemy around, and steals their bullets out of the air from up to 260px away.', requiresUpgrade: 'e' },
          { emoji: '📎', name: 'Clippy', description: 'Sets a maths quiz every 8 seconds with 5 seconds to answer. Failing it deals 20 damage to every enemy. A bot passes about three quarters of them.', requiresUpgrade: 'e' },
          { emoji: '🏓', name: 'Mad Pong', description: 'A screensaver ball bouncing off the walls at 260 px/s for 10 damage, with a 0.8s per-target cooldown — and it splits in two every 5 seconds, up to 16 balls.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'Mad Pong is by a distance the largest of the three: sixteen balls at 10 damage each in an arena that is only so wide is not something an enemy can simply walk away from.',
        'The Goose stealing bullets makes it the only malware that is defensive as well, which matters more against a projectile element than the raw 12 does.',
      ],
    },

    'tech-upload': {
      basics:
        'Fires a cable head at 620 px/s with a 22px hitbox. Whoever it catches is boxed for 6 seconds: '
        + 'grid-only movement with no diagonals at all — they can still fight, they simply cannot move '
        + 'like a person. A head that finds nothing parks at your cursor for 5 seconds, still attached to '
        + 'you, and Web Drag can pick it up and move it. The trailing cable is entirely cosmetic; walking '
        + 'through it does nothing. 12s cooldown.',
      cast: 'R, at the cursor. The head travels at 620 px/s with a 22px hitbox. 12s cooldown.',
      effects: [
        { tag: 'control', label: 'Boxed', detail: '6 seconds of grid-only movement with no diagonals at all. They can still fight; they simply cannot move like a person.' },
        { tag: 'utility', label: 'A miss parks', detail: 'A head that finds nothing waits at your cursor for 5 seconds, still attached to you — and Web Drag can pick it up and move it.' },
        { tag: 'utility', label: 'Only the head', detail: 'The trailing cable is entirely cosmetic. Walking through the cable does nothing.' },
      ],
      upgrade: {
        basics:
          'You drive them. Arrow keys steer the victim for the full 6 seconds, continuously rather than '
          + 'stepped and still axis-locked. It is a movement takeover rather than a stun, so a driven enemy '
          + 'is aiming at you the entire time you are walking them into something.',
        effects: [
          { tag: 'control', label: 'You are driving', detail: 'Arrow keys steer the victim for the full 6 seconds. Movement is continuous rather than stepped, and still axis-locked.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'They can still fight', detail: 'It is a movement takeover, not a stun. A driven enemy is aiming at you the entire time you are walking them into something.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'Grid-only movement is a surprisingly severe debuff against anything that needs to dodge diagonally, and does almost nothing to a stationary turret-style enemy.',
        'The mastery requirement Bandwidth Hog is 50 boxed enemies, which makes the cord the key you have to land rather than the key you have to time.',
      ],
    },

    'tech-webdrag': {
      basics:
        'Six seconds of drag mode: hold click on anything within 42px of the cursor to pick it up, move '
        + 'the cursor, release to drop. There is no throw — it simply goes where you put it. You can drag '
        + 'the enemy, your own popups, and your Upload cord\'s parked head. There is no way to extend the '
        + 'window. 10s cooldown.',
      cast: 'F. 6 seconds of drag mode, grabbing anything within 42px of the cursor. 10s cooldown.',
      effects: [
        { tag: 'control', label: 'What you can drag', detail: 'The enemy, your own popups, and your Upload cord\'s parked head.' },
        { tag: 'utility', label: 'How it works', detail: 'Hold click on the target to pick it up, move the cursor, release to drop. There is no throw — it simply goes where you put it.' },
        { tag: 'utility', label: 'The window', detail: '6 seconds, and there is no way to extend it.' },
      ],
      upgrade: {
        basics:
          'F becomes a browser window instead. You are protected for as long as the page is open, which '
          + 'makes the whole minigame a defensive option as well as an economic one, and coins are clicked '
          + 'out of the page to spend in the Grub-Shop — a bagel at 10, a mouse at 20, a factory at 35 — '
          + 'with a Wheel of Fortune spin at 5. Taking The Door explodes the window and launches every coin '
          + 'you were holding as a projectile at 1 damage each, 330 px/s.',
        effects: [
          { tag: 'shield', label: 'Sheltered', detail: 'You are protected for as long as the browser is open, which makes the whole minigame a defensive option as well as an economic one.', requiresUpgrade: 'f' },
          { tag: 'resource', label: 'Coins', detail: 'Clicked out of the page. They buy things from the Grub-Shop — a bagel at 10, a mouse at 20, a factory at 35 — and a Wheel of Fortune spin costs 5.', requiresUpgrade: 'f' },
          { tag: 'damage', label: 'The Door', detail: 'Taking it explodes the window and launches every coin you were holding as a projectile — 1 damage each at 330 px/s.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Dragging the enemy is the headline, but dragging your own parked cord head is the more reliable play: it lets a missed Upload be walked onto somebody.',
        'The mastery requirement Coin Farmer is 500 coins collected inside the browser, so the minigame is trained rather than skipped.',
        'Being sheltered while the browser is open means opening it is a legitimate answer to an incoming ultimate.',
      ],
    },

    'tech-admin': {
      basics:
        'Eight seconds of typing during which you are fully invincible and completely unable to attack. '
        + 'You are given a 6-digit binary string and score +1 per correct digit and −1 per wrong one, '
        + 'starting from 0, and every tier you reached fires rather than just the top one — 50 points is '
        + 'all five. 60s cooldown, the longest in the element by six times.',
      cast: 'Q, ultimate. 8 seconds of invincible, unable-to-attack typing. 60s cooldown — the longest in the element by six times.',
      effects: [
        { tag: 'shield', label: 'While it runs', detail: 'Fully invincible and completely unable to attack for the whole 8 seconds.' },
        { tag: 'resource', label: 'The points', detail: 'A 6-digit binary string. +1 per correct digit, −1 per wrong one, starting from 0.' },
        { tag: 'utility', label: 'Cashed cumulatively', detail: 'Every tier you reached fires, not just the top one — 50 points is all five.' },
      ],
      variants: {
        label: 'The privilege ladder',
        variants: [
          { emoji: '🛡️', name: '5 — Invincible', description: '5 seconds of invincibility after the console closes.' },
          { emoji: '👻', name: '10 — Invisible', description: '8 seconds of invisibility.' },
          { emoji: '💥', name: '20 — Damage', description: '35 damage to the enemy outright.' },
          { emoji: '🔒', name: '35 — Jail', description: 'The enemy is jailed.' },
          { emoji: '🔨', name: '50 — Ban', description: 'Instantly kills an enemy below 15% health. The mastery requirement Banhammer is running this once.' },
        ],
      },
      upgrade: {
        basics:
          'The console comes up with 3–4 glitches in it, each worth +5 Admin Points, so 15 to 20 free '
          + 'points on top of whatever you typed. Since a perfect 6-digit string is only 6 points on its '
          + 'own, the breach is what actually gets the ladder into its upper tiers.',
        effects: [
          { tag: 'resource', label: 'The glitches', detail: '3–4 per console, +5 Admin Points each — so 15 to 20 free points on top of whatever you typed.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'What that buys', detail: 'A perfect 6-digit string is 6 points on its own. The breach is what actually gets the ladder into its upper tiers.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Eight seconds of not attacking is an enormous cost in a fight, and the invincibility is what makes it survivable rather than what makes it good.',
        'Without Security Breach the top of the ladder is very hard to reach: six digits typed perfectly is 6 points against a 50-point Ban.',
        'The Ban only kills below 15% health, so it is a finisher rather than an execute — it cannot be opened with.',
      ],
    },
  },

  perks: {
    adrenaline: {
      basics:
        'Every Cruncher hit gives +10% move speed for 5 seconds, stacking to 5 for +50%, and at 5 '
        + 'stacks WIRED halves the Cruncher cooldown on top of the streak\'s own reduction. A miss burns '
        + 'one stack rather than the whole thing, so the perk decays about as fast as your aim does.',
      effects: [
        { tag: 'movement', label: 'The stacks', detail: '+10% move speed per Cruncher hit for 5 seconds, stacking to 5 — so +50%.' },
        { tag: 'buff', label: 'WIRED', detail: 'At 5 stacks the Cruncher cooldown is halved, multiplying with the streak\'s own reduction.' },
        { tag: 'cost', label: 'A miss burns one', detail: 'Not the whole stack — one. So the perk decays about as fast as your aim does.' },
      ],
      notes: [
        'A fully wound streak plus WIRED is a 125ms cooldown, which is the fastest anything in this element fires.',
        'It replaces an abuse meter the old kit had, and the hit/miss streak is the closest thing the reworked one has to one.',
      ],
    },
  },

  mastery: {
    vpn: {
      basics:
        'Continuous movement ramps you smoothly up to +50% move speed over 5 seconds, and the entire '
        + 'boost is lost the moment you stop — not decayed, lost, with no partial credit. A binary '
        + 'datastream behind you grows from a short faint tail to a long bright one, so the boost is '
        + 'readable off the art rather than off a bar.',
      effects: [
        { tag: 'movement', label: 'The ramp', detail: 'Smoothly up to +50% move speed over 5 seconds of continuous movement.' },
        { tag: 'cost', label: 'The drop', detail: 'The entire boost is lost the moment you stop, not decayed. There is no partial credit.' },
        { tag: 'utility', label: 'The trail', detail: 'A binary datastream that grows from a short faint tail to a long bright one — the boost is readable off the art rather than off a bar.' },
      ],
      notes: [
        'It rewards exactly the playstyle Technology otherwise cannot support: this is a kit full of things you have to stand still and click on, and VPN pays you for not doing that.',
        'It stacks with Adrenaline, so a Technology player who is both hitting shots and never stopping is very fast indeed.',
      ],
    },
    'byte-bomb': {
      basics:
        'A bindable bomb thrown at the cursor at 780 px/s with an 8-second fuse, and clicking the bomb '
        + 'itself burns half a second off it. It bursts for 10 damage in a 120px radius and lags whoever '
        + 'it catches for 10 seconds: they are periodically snapped back to where they were standing a '
        + 'second ago, they lock solid for a second at a time under a spinning loading circle every '
        + '1.6–2.6 seconds, and their ability cooldowns stop ticking entirely for 3–4 seconds at a '
        + 'stretch. 15s cooldown.',
      cast: 'The bound key throws it at the cursor at 780 px/s. Click the bomb to speed the fuse. 15s cooldown.',
      effects: [
        { tag: 'damage', label: 'The burst', detail: '10 damage in a 120px radius.' },
        { tag: 'utility', label: 'The fuse', detail: '8 seconds, with 0.5 seconds burned off per click on the bomb itself.' },
        { tag: 'control', label: 'Lag — the rubber-band', detail: 'For 10 seconds they are periodically snapped back to where they were standing a second ago.' },
        { tag: 'control', label: 'Lag — the freeze', detail: 'They lock solid for a second at a time under a spinning loading circle, every 1.6–2.6 seconds.' },
        { tag: 'debuff', label: 'Lag — the stall', detail: 'Their ability cooldowns stop ticking entirely for 3–4 seconds at a stretch.' },
      ],
      notes: [
        'The 10 damage is almost irrelevant. Ten seconds of being rewound, frozen and unable to recharge anything is the whole enhancement.',
        'Clicking your own bomb is the skill in it: the difference between a bomb that goes off when you want and one that goes off eight seconds after you threw it is enormous.',
      ],
    },
  },
};

export default technology;
