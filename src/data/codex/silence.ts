import { ElementCodex } from '../AbilityCodex';

/**
 * Silence — a horror film that has noticed you.
 *
 * Verified against `src/elements/silence.ts`, `kits/SilenceKit.ts`, the five shop upgrades in
 * `data/Upgrades.ts`, the Torture perk in `data/Perks.ts` and the two mastery enhancements in
 * `data/Mastery.ts`. It is by some distance the largest kit in the game.
 */
const silence: ElementCodex = {
  identity:
    'A thin dark thing that lives in the fog around the edge of the arena and does not want to be '
    + 'seen doing any of this. Stand in the fog and you disappear — genuinely, to the other '
    + 'player, health bar and all — and you bank stealth that makes the next knife worth more '
    + 'than double. Everything else is a way of making the fight worse to be inside: watchers '
    + 'that stand around staring, a beam that takes their abilities away for twenty seconds, a '
    + 'circle of teeth that leaves them hallucinating for thirty, and an ultimate that drags them '
    + 'out of the arena entirely into a corridor with something in it. Silence does not out-damage '
    + 'anybody. It makes the match unpleasant until they lose it.',

  passives: [
    {
      emoji: '🌫️',
      name: 'The Fog',
      magic:
        'There is a ninety-pixel band of dark around the whole arena border, and things reach out '
        + 'of it and think better of it. Standing in the band makes you invisible on the spot and '
        + 'starts filling a stealth meter. Step out and you stay invisible for as long as the '
        + 'meter lasts — and the knife you are carrying is worth more the fuller it is.',
      effects: [
        { tag: 'area', label: 'The band', detail: '90px around the entire arena edge. Standing anywhere in it makes you invisible immediately.' },
        { tag: 'resource', label: 'The meter', detail: '0–100. Gains 10 a second in the fog, drains 10 a second outside it.' },
        { tag: 'buff', label: 'What it is worth', detail: 'A Stab converts the whole meter into damage: +25 at a full 100, taking a 20-damage stab to 45. The meter is spent entirely doing it.' },
        { tag: 'shield', label: 'Actually invisible', detail: 'To the other player you are gone — sprite and health bar both. On your own screen you stay faintly visible at 35% so you can still play.' },
        { tag: 'buff', label: 'Watchers change the rates', detail: 'Every stalker you own is +20% stealth gain and −20% drain, so three of them fill the meter at 16 a second and empty it at 4.' },
      ],
      notes: [
        'The fog is the element\'s whole economy: it is where you are safe, where you charge, and the only place you can be ignored.',
        'Because the drain is only 10 a second, a full meter is ten seconds of invisibility in open ground — which is most of a fight.',
        'A corrupted copy of the enemy walking around, from the Puppetmaster enhancement, switches the fog off for you entirely while it is out.',
      ],
    },
    {
      emoji: '🔇',
      name: 'Silenced',
      magic:
        'The debuff the element is named after. A silenced fighter can still click — that is all '
        + 'they can do. Every keyed ability they own simply refuses, for twelve seconds off a '
        + 'backstab and twenty off a ritual, which is longer than most fights have left.',
      effects: [
        { tag: 'debuff', label: 'What it takes', detail: 'Every ability except the Click. E, R, F and Q all refuse outright for the duration.' },
        { tag: 'debuff', label: 'How long', detail: '12 seconds from a backstab, 20 from a Ritual beam, 10 from a sacrificed watcher.' },
        { tag: 'utility', label: 'The tell', detail: 'A muted-speaker mark turns over their head for the whole time, facing whichever way they are.' },
      ],
      notes: [
        'Twenty seconds without an ultimate, a dash or a heal is the single largest thing this element does to anybody.',
        'The Torture perk adds a second of Silence per tick on top, so a racked victim can be locked out for close to half a minute.',
      ],
    },
    {
      emoji: '👁️',
      name: 'The Rear Arc',
      magic:
        'Every fighter in the game has an eye, and Silence is the only element that reads it. Come '
        + 'at somebody from the hundred and twenty degrees behind them and the knife goes in '
        + 'differently — half again as hard, and their abilities go with it.',
      effects: [
        { tag: 'damage', label: 'The backstab', detail: '×1.5 damage — so a full-stealth stab from behind is 67 rather than 45.' },
        { tag: 'debuff', label: 'And the lockout', detail: '12 seconds of Silence, which only ever comes from a backstab and never from a face-on one.' },
        { tag: 'area', label: 'The arc', detail: '±60° of the direction they are facing away from — a 120° wedge behind them.' },
      ],
      notes: [
        'The mastery requirement From Behind is 50 backstabs, which makes learning to read the eye the element\'s core skill.',
        'Being invisible does not change the arc. A player who knows where you are can still turn to face you, and turning is free.',
      ],
    },
  ],

  abilities: {
    'silence-stab': {
      magic:
        'A short dash forward and a knife. It is the only conventional damage in the kit and the '
        + 'only thing that spends the stealth meter — which makes it the payoff for everything '
        + 'else. Come at them from the front and it is a stab; come at them from behind and it '
        + 'takes their abilities away for twelve seconds.',
      cast: 'Click, dashing 170px forward along the aim and cutting a 110px-wide lane. 1s cooldown.',
      effects: [
        { tag: 'damage', label: 'The knife', detail: '20 damage, plus up to 25 more from a full stealth meter — 45 at 100 — and the whole meter is consumed either way.' },
        { tag: 'damage', label: 'From behind', detail: '×1.5, and 12 seconds of Silence. A full-stealth backstab is 67 damage and a total lockout.' },
        { tag: 'movement', label: 'The dash', detail: '170px forward, so the click is a gap-closer as well as an attack.' },
      ],
      upgrade: {
        magic:
          'Sacrifice lets you stab your own. A knife into one of your watchers releases what it '
          + 'was holding — a shockwave of quiet that hurts and silences everything nearby — and '
          + 'the watcher survives, but it will not finish growing up for another five seconds.',
        effects: [
          { tag: 'damage', label: 'The shockwave', detail: '15 damage and 10 seconds of Silence to every enemy within 130px of the watcher.', requiresUpgrade: 'click' },
          { tag: 'cost', label: 'It sets the watcher back', detail: 'The stabbed watcher cannot mature for 5 seconds, so sacrificing a nearly-grown one costs you a Grabber.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'The stealth bonus is spent on the stab whether it lands or not, so a whiffed knife at 100 stealth is ten seconds of fog thrown away.',
        'Sacrifice is the only way to apply Silence without getting behind somebody, which makes it the answer to an opponent who never turns their back.',
        'With the Mutant upgrade, an enemy in Panic only loses 50 stealth to a stab rather than all of it — the one thing that softens the spend.',
      ],
    },

    'silence-watch': {
      magic:
        'A thin figure is planted where you point and it stands there. It does not attack, it does '
        + 'not follow, and one hit kills it. What it does is watch — and for as long as it is '
        + 'standing, the fog works better for you and your knife hits harder. Leave one alone for '
        + 'thirty-five seconds and it grows into something the Ritual can use.',
      cast: 'E, planted at the cursor. 5s cooldown. Three at a time.',
      effects: [
        { tag: 'summon', label: 'The watcher', detail: 'Up to 3 at once, 14px, and destroyed by a single hit of anything.' },
        { tag: 'buff', label: 'What each one is worth', detail: '+20% stealth gain, −20% stealth drain, and +10% damage on everything this element deals.' },
        { tag: 'utility', label: 'Maturing', detail: '35 seconds of standing untouched. A matured watcher is what Ritual turns into a Grabber.' },
        { tag: 'utility', label: 'It pulses', detail: 'Every 15 seconds it makes itself known, which is both flavour and a reminder of where your board is.' },
      ],
      upgrade: {
        magic:
          'Mutant is what happens when you put a watcher on top of another watcher. The two fold '
          + 'together into a winged Seeker that flies, takes three hits to kill, and sweeps a red '
          + 'gaze across the arena. Anything caught in the gaze panics.',
        effects: [
          { tag: 'summon', label: 'The Seeker', detail: 'Takes 3 hits instead of 1, moves at 120 px/s, and turns to a new heading every 1.5 seconds.', requiresUpgrade: 'e' },
          { tag: 'debuff', label: 'The gaze', detail: 'A 200px cone, ±30° wide. Anything inside it Panics for 8 seconds — "I see you" haunts their screen.', requiresUpgrade: 'e' },
          { tag: 'buff', label: 'What Panic is worth to you', detail: 'Stabbing a panicking enemy drains only 50 stealth instead of the whole meter, so a panicked target can be stabbed twice at strength.', requiresUpgrade: 'e' },
          { tag: 'summon', label: 'The Vulture', detail: 'Ritual on a matured Seeker raises a Vulture instead of a Grabber. Every 20 seconds it carries an enemy off the top of the screen and drops them back 50 health lighter and covered in blood.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'Three watchers is +60% stealth gain, −60% drain and +30% damage, which is the difference between a Silence player who has had time and one who has not.',
        'They die to literally anything, so the real skill is planting them where the fight is not.',
        'The mastery requirement It Grabs Now is 25 Grabbers, and a Grabber needs a full 35 seconds of an untouched watcher — this is the slowest thing in the game to train.',
      ],
    },

    'silence-ritual': {
      magic:
        'A circle is drawn on the ground at your cursor and for one second nothing happens. Then a '
        + 'red beam comes down through it. Anything standing in the circle takes it and loses '
        + 'every ability it owns for twenty seconds. And if the circle happens to be drawn around '
        + 'one of your own grown watchers, the beam does something else entirely.',
      cast: 'R, at the cursor, up to 450px away. A 75px circle, striking 1 second after it is drawn. 14s cooldown.',
      effects: [
        { tag: 'damage', label: 'The beam', detail: '25 damage to everything inside the 75px circle.' },
        { tag: 'debuff', label: 'And the lockout', detail: '20 seconds of Silence — the longest in the element, and the only source that does not need you behind them.' },
        { tag: 'utility', label: 'The second of warning', detail: 'The circle is visible for a full second before the beam lands. It is dodgeable, on purpose.' },
        { tag: 'summon', label: 'On a matured watcher', detail: 'It becomes a Grabber: 60 seconds of life, and every 20 seconds — the first after 10 — it throws a gangly arm out, drags a victim 300 px/s toward it for up to 2.5 seconds, and does 50 damage plus a permanent 20% cooldown penalty if it lands.' },
      ],
      upgrade: {
        magic:
          'Night Terror turns being frightening into a resource. A TERROR bar fills for every '
          + 'enemy currently suffering something of yours, and at full bar you may draw the '
          + 'circle on *yourself* — and what stands up out of it is the Striker.',
        effects: [
          { tag: 'resource', label: 'The bar', detail: '+1 a second per afflicted enemy, to a maximum of 100.' },
          { tag: 'utility', label: 'Becoming the Striker', detail: 'Ritual on yourself at full terror. 20 seconds of a completely new clawed moveset.', requiresUpgrade: 'r' },
          { tag: 'shield', label: 'Damage is deferred, not prevented', detail: 'Everything that hits you while transformed is stored and taken in one hit when you revert — at 25% off. It is a loan, not a shield.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'The clock moves', detail: '+1 second per 5 damage you deal and −1 second per 15 you absorb, so an aggressive Striker lasts and a hunted one does not.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'Twenty seconds of Silence on a 14-second cooldown means a Silence player who lands two rituals has taken the opponent\'s abilities away for the rest of the fight.',
        'A Grabber\'s 20% cooldown penalty is permanent for the match. It is the only lasting stat change in the element.',
        'The Striker is the element\'s only true offensive stance, and everything it costs is paid after the fact.',
      ],
    },

    'silence-feast': {
      magic:
        'A ring of teeth opens in the floor and chews for eight seconds, leaning toward wherever '
        + 'you are looking. Standing in it is not immediately dangerous — it is dangerous if you '
        + 'are still in it six seconds later, at which point something is very badly wrong with '
        + 'what the victim can see for the next half-minute.',
      cast: 'F, at the cursor. A 110px circle for 8 seconds that follows the caster\'s facing by 60px. 18s cooldown.',
      effects: [
        { tag: 'damage', label: 'The bite', detail: '35 damage, but only to somebody who has spent 6 of the 8 seconds inside the ring.' },
        { tag: 'debuff', label: 'Hallucinations', detail: '30 seconds. Against a player their screen is haunted — an eye covers it every 10 seconds for 2, and a false copy of you appears every 8 for 3. Against a bot it simply misses 20% of the time.' },
        { tag: 'utility', label: 'It follows you', detail: 'The ring leans 60px toward whatever the caster is facing, so it can be walked onto somebody rather than only placed.' },
      ],
      upgrade: {
        magic:
          'Flesh Banquet takes the hallucination further than a screen effect. The whole arena '
          + 'turns to meat for the victim — eyeballs and teeth across every surface — and five '
          + 'small toothy things are let out to hound them personally for as long as the visions '
          + 'last.',
        effects: [
          { tag: 'summon', label: 'The midgets', detail: '5 of them at 140 px/s, biting for 5 damage every 0.5 seconds until the hallucinations end.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'The arena turns', detail: '26 flesh decals across the floor — eyeballs and teeth — for the whole 30 seconds.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Six seconds inside an eight-second circle is a very long time to stand still, so the ring is really a zoning tool that occasionally pays 35.',
        'Against a human the hallucinations are the entire point; against a bot the 20% miss chance is worth more than the 35 damage.',
        'Five midgets at 5 damage every half second is 50 a second if they are all on the victim — Flesh Banquet is by far the largest damage upgrade in the element.',
      ],
    },

    'silence-run': {
      magic:
        'A gangly arm comes out of you and reaches five hundred pixels. If it catches somebody, '
        + 'the arena stops — both of you are dragged into a dark corridor with a door at the far '
        + 'end, you become the blob, and they run. They have to reach the door. You have to reach '
        + 'them first.',
      cast: 'Q, ultimate. The arm reaches 500px over 350ms with a 60px catch. 60s cooldown — but a whiff refunds 45 of it, leaving about 15.',
      effects: [
        { tag: 'control', label: 'The hallway', detail: 'Both fighters leave the arena entirely for a pocket corridor 220px wide. The victim is untargetable by anybody else while it runs.' },
        { tag: 'damage', label: 'Caught', detail: '80 damage if the blob reaches them — a 50px catch at 380 px/s against a victim moving at 80% speed.' },
        { tag: 'utility', label: 'The escape', detail: 'They win by crossing the top of the corridor. The door opens 4.5 seconds in, and the chase times out at 14 seconds. A player mashes 14 presses to break the initial grab; a bot has a flat 33% chance.' },
        { tag: 'damage', label: 'Spitting', detail: 'Click during the chase spits for 5 damage and a half-second slow at 430 px/s — and every spit that lands cuts a bot\'s survival odds by 2%.' },
        { tag: 'utility', label: 'A bot\'s odds', detail: 'A bot escapes the hallway about half the time before any spitting.' },
      ],
      upgrade: {
        magic:
          'The Labyrinth replaces the corridor with a maze. They are shrunk, slowed further and '
          + 'can barely see past their own feet, the camera pulls in, and the blob does not need '
          + 'the corridors at all — it eats through the walls.',
        effects: [
          { tag: 'control', label: 'The maze', detail: 'A 9×6 labyrinth instead of a straight hallway, with the camera zoomed to 1.6× and 170px of vision.', requiresUpgrade: 'q' },
          { tag: 'debuff', label: 'What it does to them', detail: 'Shrunk to 60% size and slowed a further 30% on top of the hallway\'s own 20%.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'The blob cheats', detail: 'It chews through a wall in 1.2 seconds, so the maze is a delay rather than a defence.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'Bots barely escape', detail: 'Their survival chance is halved outright.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'The 45-second refund on a whiff is enormous: a missed Run is effectively a 15-second cooldown, so there is very little reason not to try.',
        'The mastery requirement No Way Out is 5 hallway catches, which is the rarest thing this element asks for.',
        'Eighty damage plus everything you spat on the way is often more than half a health bar, and none of it can be answered — the victim has no abilities in the corridor, only legs.',
      ],
    },
  },

  perks: {
    torture: {
      magic:
        'The Ritual stops being an execution and becomes a ceremony. The beam does not kill '
        + 'quickly any more — the victim is racked instead, bleeding for six seconds and losing '
        + 'another second of their voice with every one of them. And a second ritual on somebody '
        + 'already racked simply tightens it.',
      effects: [
        { tag: 'dot', label: 'The rack', detail: '4 damage a second for 6 seconds — 24 in all, against the beam\'s single 25.' },
        { tag: 'debuff', label: 'It extends the Silence', detail: '+1 second of Silence per tick, so a full rack is 6 more seconds on top of the 20.' },
        { tag: 'debuff', label: 'Tightening', detail: 'Ritual the same racked victim again for +2 damage a second, up to 3 stacks — 8 a second at full tension.' },
      ],
      notes: [
        'At three stacks the rack is 48 damage over six seconds and 26 seconds of total lockout from one victim.',
        'It rewards hitting the same person repeatedly rather than spreading rituals around, which is a real change to how the key is played.',
      ],
    },
  },

  mastery: {
    weep: {
      magic:
        'You only exist while somebody is looking at you. The moment every enemy in the match is '
        + 'facing away, you move half again as fast and the fog holds onto you longer — and the '
        + 'instant one of them turns their eye back on you, you drop to an ordinary walk in the '
        + 'middle of whatever you were doing.',
      effects: [
        { tag: 'movement', label: 'Unwatched', detail: '+50% move speed while every living enemy is facing away from you.' },
        { tag: 'buff', label: 'And the fog holds', detail: 'Stealth drains 25% slower while unwatched, on top of whatever your watchers are already doing.' },
        { tag: 'area', label: 'What counts as watching', detail: '±50° of their facing — a 100° wedge. Anything wider than that and you are unobserved.' },
        { tag: 'resource', label: 'It keeps a terror bar', detail: 'Even without the Night Terror upgrade, so Puppetmaster always has something to spend.' },
      ],
      notes: [
        'It is the only movement bonus in the game that a competent opponent can switch off simply by turning around — which makes it excellent against bots and a genuine duel against a person.',
        'A possessed host is looking out of your own eyes, so nothing counts as watching you while a Puppetmaster possession is running.',
      ],
    },
    puppetmaster: {
      magic:
        'Within five seconds of a knife landing, you stitch a doll of them and plant it in the '
        + 'ground. Everything you put into the doll goes into the person, with interest, and they '
        + 'cannot touch it. And then you cast the Ritual on the doll — and instead of the doll '
        + 'dying, *they* wake up: their eyes go white, their body cracks open, and something with '
        + 'four spider-legged tentacles climbs out wearing them. You steer that instead of '
        + 'yourself.',
      cast: 'The bound key, within 5 seconds of a landed stab, for 25 terror. Cannot be bound to R — Ritual is what awakens the doll. 12s cooldown.',
      effects: [
        { tag: 'damage', label: 'The doll', detail: 'Everything you put into it is relayed to the enemy at ×1.25. It breaks after 50 damage has gone through it, and they cannot damage or move it themselves.' },
        { tag: 'utility', label: 'Awakening', detail: 'Ritual on the doll and the doll survives — the enemy is possessed instead, for 15 seconds, and you control their body rather than your own.' },
        { tag: 'damage', label: 'Awakened Click', detail: 'Slashes for 15 in a ±60° arc out to 100px.' },
        { tag: 'heal', label: 'Awakened E', detail: 'Bites for 10 and heals you 12.' },
        { tag: 'heal', label: 'Awakened R', detail: 'Cannibalizes their own muck for 20 and heals you 20.' },
        { tag: 'summon', label: 'Awakened F', detail: 'Slams the ground and drags up 3 awakened-kin that crawl over and stab them for 10 apiece every 2.5 seconds, for 20 seconds.' },
        { tag: 'cost', label: 'Handing it back', detail: 'Q returns the body and costs them 20 on the way out.' },
      ],
      variants: {
        label: 'What you can do with a kin',
        variants: [
          { emoji: '🦷', name: 'Bite it', description: 'Eat the kin and heal 12.' },
          { emoji: '🕯️', name: 'Ritual it', description: 'It becomes a corrupted copy of the enemy — black, eyeless, grinning — fighting on your side for 20 seconds at 150 px/s, shooting for 12 every 1.4s and clawing for 8.' },
          { emoji: '🌫️', name: 'The price of a copy', description: 'You gain no stealth at all while a corrupted copy is out. The fog simply stops working for you.' },
        ],
      },
      notes: [
        'The doll is the cheap half and the possession is the expensive one: 50 damage relayed at ×1.25 is 62, and it costs nothing but the terror.',
        'Possession also shortens the awakened moveset\'s own cooldowns dramatically — E is 2.5s rather than 5, R is 6 rather than 14, F is 6 rather than 18.',
        'The enhancement refuses to bind to R specifically because Ritual is the key that awakens the doll. There has to be a Ritual left to cast.',
      ],
    },
  },
};

export default silence;
