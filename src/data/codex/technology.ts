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
    'Somebody has plugged the arena into a machine and the machine is not on your side. Popup '
    + 'adverts that are transparent for one player and solid for the other, and that leave bugs '
    + 'crawling over the screen of whoever touches one. A file, thrown very slowly, that gives '
    + 'whoever it reaches a bad connection and then asks them whether they would like to restart. '
    + 'A cursor that becomes a *drag* cursor and picks people up. An ultimate that is an admin '
    + 'console with nine commands and a bar that says how badly you are abusing it. Almost nothing '
    + 'this element does is damage — it is interface, turned into a weapon — and the one thing '
    + 'that is damage, the Cruncher, is a shot whose whole design is that hitting makes it better '
    + 'and missing makes it faster.',

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
        'The windows are adverts — a prize draw, a virus scanner, free RAM — and there are six of them, so a dozen on screen looks like a browser that has been left alone for a minute rather than like twelve copies of one hazard.',
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
        'Scatters 12 popup adverts across the whole arena, 138×96 pixels each, alive for 3 seconds. '
        + 'Standing under one of yours is 25% damage resistance and invisibility. An enemy who touches '
        + 'one closes it and gets 2 virus critters for it. On a player those crawl around their own '
        + 'screen — along the ability tray, over the bars — and after 2.5 seconds each one starts '
        + 'draining 2 HP a second, and does not stop until it is clicked. A bot swats each of its '
        + 'critters 4.5 to 7.5 seconds after it lands. 8s cooldown.',
      cast: 'E. Instant, no aim — 12 popups are scattered across the whole arena for 3 seconds. 8s cooldown.',
      effects: [
        { tag: 'area', label: 'The popups', detail: '12 windows at 138×96 pixels each, alive for 3 seconds.' },
        { tag: 'shield', label: 'Standing under yours', detail: '25% damage resistance and invisibility while you are under one.' },
        { tag: 'summon', label: 'The critters', detail: '2 per popup touched, up to 14 on one victim. They crawl the victim\'s screen, not the arena.' },
        { tag: 'dot', label: 'The drain', detail: 'Harmless for 2.5 seconds, then 2 HP a second each, with no time limit — only a click removes one.' },
        { tag: 'utility', label: 'Bots', detail: 'A bot clears each critter by itself 4.5 to 7.5 seconds after it lands, so each one is worth about 4 to 10 damage against the AI.' },
      ],
      upgrade: {
        basics:
          'Every 3rd popup a victim touches also lets a Ransomware bug loose on them: red, more than '
          + 'twice as fast as an ordinary critter, and it takes 2 clicks to squash. It drains nothing — '
          + 'instead, for as long as it is alive, every ability except the click is locked. A bot needs '
          + '8.5 to 11.5 seconds to get rid of one.',
        effects: [
          { tag: 'summon', label: 'Ransomware', detail: 'One red bug on every 3rd popup touched. 215 px/s across the screen against a critter\'s 95.', requiresUpgrade: 'e' },
          { tag: 'control', label: 'Files encrypted', detail: 'Every ability except the click is locked for as long as the bug lives. It takes 2 clicks to kill.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Bots are slower', detail: '8.5 to 11.5 seconds for a bot to clear it, against 4.5 to 7.5 for an ordinary critter.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'The drain has no duration, which is the whole change: an enemy who ignores the bugs to keep fighting is paying 2 HP a second per bug for the privilege, and one who stops to click them is not shooting at you.',
        'Clicking a bug is still a click — for most elements that is also a wasted shot at wherever the bug happened to be.',
        'Web Drag can carry a popup onto somebody. Three carried popups is a Ransomware bug.',
      ],
    },

    'tech-zip': {
      basics:
        'Launches a file toward the cursor at 150 px/s — very slow, and every 1.1 to 1.9 seconds it '
        + 'rubber-bands 0.4 seconds back along its own path. It lasts 9 seconds. Whoever it reaches '
        + '(30px) lags for 10 seconds: they are snapped back to where they stood a second ago, frozen '
        + 'for a second at a time under a loading circle, and their cooldowns stop ticking for 3 to 4 '
        + 'seconds at a stretch. They are also asked whether they want to restart their computer: Yes '
        + 'clears the lag, but stuns them for 3 seconds, puts every ability on its full cooldown and '
        + 'empties their ultimate. 12s cooldown.',
      cast: 'R, at the cursor. The file travels at 150 px/s for up to 9 seconds. 12s cooldown.',
      effects: [
        { tag: 'utility', label: 'The file', detail: '150 px/s with a 30px hit radius, alive 9 seconds, snapping 0.4s back up its path every 1.1–1.9 seconds.' },
        { tag: 'control', label: 'Lag — the rubber-band', detail: 'For 10 seconds they are periodically snapped back to where they were standing 1 second ago.' },
        { tag: 'control', label: 'Lag — the freeze', detail: 'They lock solid for 1 second at a time under a spinning loading circle, every 1.6–2.6 seconds.' },
        { tag: 'debuff', label: 'Lag — the stall', detail: 'Their ability cooldowns stop ticking entirely for 3–4 seconds at a stretch.' },
        { tag: 'control', label: 'The restart', detail: 'The victim may accept: lag gone, but 3 seconds stunned, every cooldown reset to full and the ultimate bank emptied. A bot takes it about 50% of the time.' },
      ],
      upgrade: {
        basics:
          'The archive unpacks its victim as well: their hitbox is 33% bigger for the 10 seconds of the '
          + 'lag, marked by a selection box around them. Restarting does not shrink it back.',
        effects: [
          { tag: 'debuff', label: 'Decompression', detail: 'The victim\'s hitbox is 33% bigger for 10 seconds.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'It deals 0 damage. Ten seconds of being rewound, frozen and unable to recharge anything is the whole ability — and the restart is a second, worse ability the victim casts on themselves.',
        'At 150 px/s nobody is hit by this by accident. Web Drag is how it lands: pick the file up and carry it into them.',
        'The mastery requirement Bandwidth Hog is 50 landed files.',
      ],
    },

    'tech-webdrag': {
      basics:
        'Six seconds of drag mode: hold click on anything within 42px of the cursor to pick it up, move '
        + 'the cursor, release to drop. There is no throw — it simply goes where you put it. You can drag '
        + 'the enemy, your own popups, and your Zip Bomb\'s file while it is in flight. There is no way to extend the '
        + 'window. 10s cooldown.',
      cast: 'F. 6 seconds of drag mode, grabbing anything within 42px of the cursor. 10s cooldown.',
      effects: [
        { tag: 'control', label: 'What you can drag', detail: 'The enemy, your own popups, your Zip Bomb file, and (by their title bars) the PainClicker and Admin Console windows. Anything within 42px of the cursor.' },
        { tag: 'utility', label: 'How it works', detail: 'Hold click on the target to pick it up, move the cursor, release to drop. There is no throw — it simply goes where you put it.' },
        { tag: 'utility', label: 'The window', detail: '6 seconds, and there is no way to extend it.' },
      ],
      upgrade: {
        basics:
          'Web Drag also offers to surf the web. Yes opens PainClicker: a small window with one skull in it, '
          + 'and you keep moving, shooting and casting while it is open. Every click on the skull deals 1 damage '
          + 'to the nearest enemy and earns 1 pain coin. Pain buys four upgrades, each once: Harder clicks (50) '
          + 'makes a click worth 2, Pain farm (100) generates 1 a second, Pain factory (250) 3 a second and '
          + 'The Soulution (500) 10 a second — and every pain coin generated is a point of damage too. Web drag '
          + 'moves the window by its title bar, and the X in the corner closes it, upgrades and wallet with it.',
        effects: [
          { tag: 'damage', label: 'The skull', detail: 'Each click: 1 damage to the nearest enemy and 1 pain coin (2 and 2 with Harder clicks).', requiresUpgrade: 'f' },
          { tag: 'resource', label: 'Pain coins', detail: 'Harder clicks 50 · Pain farm 100 (+1/s) · Pain factory 250 (+3/s) · The Soulution 500 (+10/s). Each is bought once; the generators stack to 14 damage a second.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'The window', detail: 'Not a menu and not shelter — you fight on around it. Drag it by the title bar during web drag; the X closes it.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Dragging the enemy is the headline, but dragging your own Zip Bomb is the more reliable play: the file is far too slow to hit anybody by itself, and a held one goes exactly where the cursor does.',
        'The mastery requirement Coin Farmer is 500 pain coins collected in PainClicker, so the minigame is trained rather than skipped.',
        'Closing the window throws away every upgrade bought in it, so a fully built clicker is worth keeping open and dragging out of the way.',
      ],
    },

    'tech-admin': {
      basics:
        'Opens an admin console: a small window with 9 commands and a red abuse bar that holds 100. '
        + 'Every command adds its cost to the bar, and when what is left cannot pay for anything the '
        + 'console leaves. You keep moving and shooting while it is open, each command types its code '
        + 'into the corner of the screen, and Web Drag moves the window by its title bar. It is an '
        + 'ultimate, paid for in ultimate charge rather than time.',
      cast: 'Q, ultimate. Opens the console; click commands in it until 100 abuse is spent. The X closes it early.',
      effects: [
        { tag: 'resource', label: 'Abuse', detail: 'The bar holds 100. A command only runs if its whole cost still fits; the console closes once less than 10 is left.' },
        { tag: 'utility', label: 'Not a menu', detail: 'The console gives 0 protection — you are fighting the whole time it is open.' },
      ],
      variants: {
        label: 'The nine commands',
        variants: [
          { emoji: '🌪️', name: 'fling — 10', description: 'Launches the enemy (and anything else within 320px) directly away from you at 950 px/s for 0.3 seconds.' },
          { emoji: '🔒', name: 'jail — 20', description: 'A 150×150 cell round the enemy for 3 seconds. Pushing on the bars costs them 5 damage every 0.5s.' },
          { emoji: '🪽', name: 'fly — 20', description: '5 seconds off the floor: +40% move speed, and melee swings and ground hazards pass underneath.' },
          { emoji: '💥', name: 'kill — 25', description: '20 damage to the enemy, wherever they are.' },
          { emoji: '👻', name: 'invis — 25', description: '5 seconds of invisibility.' },
          { emoji: '🔫', name: 'give — 50', description: 'A phaser for 10 seconds: your click throws angry red pac-men that fly 60% faster and hit 50% harder.' },
          { emoji: '⚡', name: 'speed — 50', description: '+33% attack speed, move speed and cooldown speed for 10 seconds.' },
          { emoji: '🛡️', name: 'invincible — 100', description: '5 seconds of invincibility — the whole bar.' },
          { emoji: '🔨', name: 'ban — 100', description: 'Instantly kills an enemy below 15% health, and cannot be used on one above it. The mastery requirement Banhammer is one of these.' },
        ],
      },
      upgrade: {
        basics:
          'The console no longer closes at max abuse. A command the bar cannot cover is paid for in '
          + 'health instead: 0.4 HP per point of abuse, so 4 HP for a fling and 40 for a ban — and every '
          + 'command paid that way makes the next one cost 10% more. It will never take your last HP.',
        effects: [
          { tag: 'cost', label: 'Paid in health', detail: '0.4 HP per point of abuse once the bar cannot cover a command: fling 4, jail 8, kill 10, give 20, invincible 40.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'It escalates', detail: '+10% on every command for each one already paid for in health this console.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'Stays open', detail: 'The console stays for the rest of the match, or until you close it with the X. Closing it and opening a new one is a fresh 100.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        '100 abuse is a budget, and the two 100-point commands are the whole of it: invincible and ban can only ever be the first thing a console does.',
        'Jail then kill is 45 abuse and the cell holds them still for whatever else you have — including a Zip Bomb they cannot walk away from.',
        'The Ban only works below 15% health, so it is a finisher rather than an execute — it cannot be opened with.',
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
    'glitch-abuse': {
      basics:
        'Walk into the arena wall and keep walking: after 0.45 seconds the collision gives up. You '
        + 'flicker in and out of the wall for 0.5 seconds, then you are launched across the arena at '
        + '1500 px/s in the direction of your cursor, dealing 15 damage to anyone you pass through. '
        + 'Aim into the wall and you are thrown straight out of it instead. 3.5 seconds between launches.',
      effects: [
        { tag: 'utility', label: 'The trigger', detail: '0.45 seconds of pushing against a wall, then 0.5 seconds of clipping in and out of it.' },
        { tag: 'movement', label: 'The launch', detail: '1500 px/s toward the cursor until you hit the far wall — the width of the arena in well under 1 second.' },
        { tag: 'damage', label: 'On the way', detail: '15 damage to every enemy within 38px of your path, once each.' },
        { tag: 'cost', label: 'The cooldown', detail: '3.5 seconds after landing before a wall will give again.' },
      ],
      notes: [
        'It turns the worst place to be — pinned on a wall — into the fastest exit in the kit.',
        'A launch counts as continuous movement, so VPN keeps its ramp through it.',
      ],
    },
  },
};

export default technology;
