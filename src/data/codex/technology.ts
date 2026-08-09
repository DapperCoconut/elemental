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
      magic:
        'The click has no cooldown of its own and it is the only conventional attack in the kit. '
        + 'Every triangle that lands makes the next one better in three separate ways, and every '
        + 'one that misses makes it *faster* and worse. The element therefore has a running '
        + 'state, and it is a state you can lose by being bad at aiming.',
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
      magic:
        'The strangest thing this element does is render differently for the two players. Your '
        + 'own popups are faint enough to see the arena through; on the enemy\'s screen they are '
        + 'solid windows that hide whatever is behind them. It is the same object in the same '
        + 'place — the only difference is who is looking at it.',
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
      magic:
        'A green triangle with a tail of falling ones and zeroes. It is small, it is fast, and it '
        + 'does very little on its own — the point is that it changes you. Land it and every '
        + 'number about the gun goes up; miss and the gun starts firing faster and hitting '
        + 'softer.',
      cast: 'Click, aimed at the cursor. 0.5s cooldown at base, shortened by the streak in either direction, floored at 0.15s.',
      effects: [
        { tag: 'damage', label: 'The shot', detail: '7.5 damage at 420 px/s, hitting anything within 26px of it, out to 900px of travel.' },
        { tag: 'buff', label: 'The hit stack', detail: '+5% cooldown, damage and projectile speed per hit, to +100% of each — a fully wound gun is 15 damage at 840 px/s every 250ms.' },
        { tag: 'cost', label: 'The miss stack', detail: '+10% cooldown but −5% damage and speed, never past the base numbers.' },
      ],
      upgrade: {
        magic:
          'Firewall rings the arena edge in an orange binary barrier, and it eats your mistakes. '
          + 'The first three crunchers that would have missed are absorbed instead — no penalty, '
          + 'they simply never happened — and then the wall has to rebuild itself.',
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
      magic:
        'Twelve popup windows scatter across the arena. To you they are ghosts you can see '
        + 'through and hide under. To them they are solid rectangles blocking most of the screen, '
        + 'and touching one is how you get a virus.',
      cast: 'E. Instant, no aim — they are scattered across the whole arena. 8s cooldown.',
      effects: [
        { tag: 'area', label: 'The popups', detail: '12 windows at 138×96 pixels each, alive for 3 seconds.' },
        { tag: 'shield', label: 'Standing under yours', detail: '25% damage resistance and invisibility while you are under one.' },
        { tag: 'dot', label: 'The virus', detail: 'An enemy who touches one is infected for 5 seconds at 3 damage a second — and worse the faster they are moving, so running from it makes it hurt more.' },
        { tag: 'utility', label: 'Three seconds', detail: 'They are a burst of cover rather than terrain. Everything about the ability has to happen inside those three seconds.' },
      ],
      upgrade: {
        magic:
          'Palware installs something. Alongside the popups, one of three pieces of malware is '
          + 'summoned for twenty seconds — a goose, an assistant, or a screensaver that has '
          + 'become hostile — and which one you get is not up to you.',
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
      magic:
        'A cord is fired out of your hand toward the cursor and it never detaches from you — only '
        + 'the head has a hitbox, so the length of cable trailing behind it is decoration. What '
        + 'the head does on contact is the ability: whoever it touches is turned into a box, and '
        + 'a box moves on a grid.',
      cast: 'R, at the cursor. The head travels at 620 px/s with a 22px hitbox. 12s cooldown.',
      effects: [
        { tag: 'control', label: 'Boxed', detail: '6 seconds of grid-only movement with no diagonals at all. They can still fight; they simply cannot move like a person.' },
        { tag: 'utility', label: 'A miss parks', detail: 'A head that finds nothing waits at your cursor for 5 seconds, still attached to you — and Web Drag can pick it up and move it.' },
        { tag: 'utility', label: 'Only the head', detail: 'The trailing cable is entirely cosmetic. Walking through the cable does nothing.' },
      ],
      upgrade: {
        magic:
          'Trojan Takeover keeps you wired in. For as long as the box lasts, your arrow keys are '
          + 'their legs — they move continuously in whichever direction you are holding, still '
          + 'without diagonals, and they can still shoot at you the whole time.',
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
      magic:
        'Your cursor becomes a drag cursor. For six seconds anything the game will let you grab — '
        + 'a person, one of your popups, the parked head of your own Upload cord — can be picked '
        + 'up by holding click and dropped by letting go. It is the only ability in the game that '
        + 'weaponises a mouse pointer.',
      cast: 'F. 6 seconds of drag mode, grabbing anything within 42px of the cursor. 10s cooldown.',
      effects: [
        { tag: 'control', label: 'What you can drag', detail: 'The enemy, your own popups, and your Upload cord\'s parked head.' },
        { tag: 'utility', label: 'How it works', detail: 'Hold click on the target to pick it up, move the cursor, release to drop. There is no throw — it simply goes where you put it.' },
        { tag: 'utility', label: 'The window', detail: '6 seconds, and there is no way to extend it.' },
      ],
      upgrade: {
        magic:
          'Surf the web! adds a prompt: would you like to surf the web? Yes opens a browser '
          + 'window in the middle of the fight. You are sheltered for as long as it is open, and '
          + 'inside it is an entire small economy — coins to click, a shop, a wheel of fortune, '
          + 'and a door.',
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
      magic:
        'A console opens and challenges you to type a six-digit binary string. For eight seconds '
        + 'you cannot be hurt and you cannot attack — you are typing. Every correct digit is an '
        + 'Admin Point and every wrong one takes one away, and when the window closes the points '
        + 'are cashed in cumulatively against a ladder of increasingly unreasonable privileges.',
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
        magic:
          'Security Breach means the console is not secure either. Three or four times per use it '
          + 'glitches out — the screen tears, "Git Haxxed!" is scrawled across it, and you are '
          + 'handed five points you did not type.',
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
      magic:
        'Landing a cruncher spikes something. Each hit is a stack of speed that runs for five '
        + 'seconds, and at five stacks you are WIRED — the gun\'s own cooldown is halved on top '
        + 'of everything the streak was already doing to it. Missing burns a stack, so the perk '
        + 'has the same shape the element does.',
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
      magic:
        'Your connection tunnels through a private route, and the route gets better the longer '
        + 'you use it. Keep moving and you accelerate smoothly for five seconds with a binary '
        + 'datastream growing longer, brighter and wider behind you. Stop for a single frame and '
        + 'the tunnel drops and you start again from nothing.',
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
      magic:
        'A packet with a fuse painted on its shell is lobbed at your cursor and starts counting '
        + 'down from eight seconds. Clicking the bomb burns half a second off the timer, so a '
        + 'fast enough mouse detonates it on your terms rather than its own. What it leaves '
        + 'behind is not damage — it is Lag.',
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
