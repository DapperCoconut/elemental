import { ElementCodex } from '../AbilityCodex';

/**
 * Sound — a concert soloist with a metronome running.
 *
 * Verified against `src/elements/sound.ts`, `kits/SoundKit.ts`, the five shop upgrades in
 * `data/Upgrades.ts`, the Harmony perk in `data/Perks.ts` and the two mastery enhancements in
 * `data/Mastery.ts`. Every figure below is a constant at the top of the kit.
 */
const sound: ElementCodex = {
  identity:
    'A violinist who has decided the fight is a performance. There is no mana, no charge and no '
    + 'ammunition — the only thing being managed is your timing. Every ability you press starts a '
    + 'two-second metronome, and an ability played on the beat comes out harmonized and does '
    + 'something better. The other half of the element is that almost everything it gives you is '
    + 'permanent: percentages banked off a boombox, off a bugle run, off a record cutting through '
    + 'somebody, none of which decay or cap. And then Coda burns the entire pile for hype and '
    + 'trades it for a bigger instrument. Sound starts the weakest element in the game and, left '
    + 'alone for ninety seconds, finishes as one of the strongest.',

  passives: [
    {
      emoji: '🎼',
      name: 'The Metronome',
      basics:
        'Every cast restarts a 2-second beat with a 200ms gold window at the end of it, roughly a tenth '
        + 'of the bar, and casting inside that window harmonizes the ability. A harmonized Click deals 15 '
        + 'instead of 10. A harmonized E changes the record on the deck instead of just cutting — '
        + 'Accelerando, then Bass, then Calm. A harmonized R is a bigger boombox, 205px instead of 150, '
        + 'with twice the speakers and every buff banked inside it worth 1.5×. A harmonized F tolerates '
        + 'one mistake on the bugle run, and spending that slip winds the rhythm bar up to 1.2× speed for '
        + 'the rest of it. The beat restarts on every cast including a missed one, so a badly timed press '
        + 'costs you the next window as well as the current one.',
      effects: [
        { tag: 'utility', label: 'The beat', detail: '2 seconds from any cast, with a 200ms gold window at the end of it. Roughly a tenth of the bar.' },
        { tag: 'damage', label: 'Harmonized Click', detail: '15 damage instead of 10.' },
        { tag: 'utility', label: 'Harmonized E', detail: 'Changes the record on the deck instead of just cutting: Accelerando → Bass → Calm.' },
        { tag: 'utility', label: 'Harmonized R', detail: 'A bigger boombox — 205px instead of 150 — with twice the speakers, and every buff banked inside it is worth 1.5×.' },
        { tag: 'utility', label: 'Harmonized F', detail: 'The bugle run tolerates one mistake, and spending that slip winds the rhythm bar up to 1.2× speed for the rest of the run.' },
        { tag: 'utility', label: 'It restarts on every cast', detail: 'Including a missed one, so a badly timed press costs you the next window as well as the current one.' },
      ],
      notes: [
        'A 200ms window inside a 2-second bar is a genuine timing test, and it is the only skill expression this element asks for.',
        'The Harmony perk turns every harmonized cast into a thrown resonator as well, which makes hitting the beat worth roughly double.',
        'Encore Streak makes a clean run visible: every consecutive harmonized cast widens the shockwave by 1%.',
      ],
    },
    {
      emoji: '📈',
      name: 'The Bank',
      basics:
        'Percentages you bank never expire and nothing takes them back. The boombox pays +1% attack '
        + 'speed per second stood in the field, kept when you leave, and ×1.5 if the box was harmonized. '
        + 'The bugle pays +1% move speed and +1% attack speed per note struck, for the rest of the match. '
        + 'With Sound System the record bank pays +3% move per fighter cut on green, +2% damage on red '
        + 'and +1% damage resistance on blue, with resistance floored at 75% off so no run of blue is '
        + 'immunity. And all of it is hype: Coda burns every percentage you are carrying at 1 hype per '
        + 'percent, with tempo counting twice because it buffs two stats at once. 200 hype is a Coda '
        + 'level.',
      effects: [
        { tag: 'buff', label: 'The boombox', detail: '+1% attack speed per second stood in the field, kept when you leave it. ×1.5 if the box was harmonized.' },
        { tag: 'buff', label: 'The bugle', detail: '+1% move speed and +1% attack speed per note struck, for the rest of the match.' },
        { tag: 'buff', label: 'The record bank', detail: 'With Sound System: +3% move per fighter cut on green, +2% damage on red, +1% damage resistance on blue. Resistance is floored at 75% off so no run of blue is immunity.' },
        { tag: 'resource', label: 'It is all hype', detail: 'Coda burns every percentage you are carrying at 1 hype per percent — and tempo counts twice, because it buffs two stats at once. 200 hype is a Coda level.' },
        { tag: 'utility', label: 'No cap, no decay', detail: 'Nothing in the element takes a banked percentage back. The only thing that spends them is you, on purpose.' },
      ],
      notes: [
        'This is why Sound is a slow start. Thirty seconds of an uninterrupted boombox is +30% attack speed, and that is what the first Coda level is made of.',
        'Coda\'s own multipliers apply to the bank rather than replacing it: at level 3 every percentage you have is worth 1.5× what it says.',
      ],
    },
  ],

  abilities: {
    staccato: {
      basics:
        'A shockwave along your aim: 10 damage, or 15 harmonized, travelling 780 px/s out to 470px, '
        + '28px thick and spreading about 0.1 radians as it goes. Coda scales it further — ×1.3 at level '
        + '2 and ×1.6 at level 3, on top of the harmonize. 1s cooldown, which is exactly half the '
        + 'metronome.',
      cast: 'Click, along the aim. 1s cooldown, which is also exactly half the metronome.',
      effects: [
        { tag: 'damage', label: 'The note', detail: '10 damage, or 15 harmonized.' },
        { tag: 'area', label: 'The wave', detail: '780 px/s out to 470px, 28px thick, spreading about 0.1 radians as it travels.' },
        { tag: 'buff', label: 'Coda scales it', detail: '×1.3 at Coda level 2 and ×1.6 at level 3, on top of the harmonize.' },
      ],
      upgrade: {
        basics:
          'Every consecutive harmonized cast widens the shockwave by 1%, with no ceiling — thirty in a '
          + 'row is a 30% wider wave. Playing off the beat drops the whole streak to zero: a reset rather '
          + 'than a decay. Nothing struck on the bugle rhythm bar or during a Solo can break it, so the two '
          + 'rhythm minigames are not a liability, and Coda spends the streak for hype like every other '
          + 'percentage you carry, a point apiece.',
        effects: [
          { tag: 'buff', label: 'The streak', detail: '+1% shockwave width per point, with no ceiling. Thirty consecutive harmonized casts is a 30% wider wave.', requiresUpgrade: 'click' },
          { tag: 'cost', label: 'Playing off the beat', detail: 'Drops the whole streak to zero. Not a decay — a reset.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'The bar is safe', detail: 'Nothing struck on the bugle rhythm bar or during a Solo can break the streak, so the two rhythm minigames are not a liability.', requiresUpgrade: 'click' },
          { tag: 'resource', label: 'And it burns', detail: 'Coda spends the streak for hype like every other percentage you are carrying, a point apiece.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'The one-second cooldown is exactly half a beat, so alternating Click with anything else is the natural rhythm of the element.',
        'The click is deliberately the weakest thing in the kit. It exists to keep the metronome running between the abilities that matter.',
      ],
    },

    'disc-dice': {
      basics:
        'Slices everything within 130px of you for 15 damage, with no aim, and every fighter cut gives '
        + '+15% move speed for 3 seconds, stacking to 6 — so a wave of husks is +90%. A harmonized cast '
        + 'also changes the record on the deck, cycling Accelerando (green), Bass (red), Calm (blue). 5s '
        + 'cooldown.',
      cast: 'E. Instant, no aim — the slice is a circle around you. 5s cooldown.',
      effects: [
        { tag: 'damage', label: 'The slice', detail: '15 damage to everything within 130px.' },
        { tag: 'movement', label: 'The cut', detail: '+15% move speed for 3 seconds per fighter cut, stacking to 6 — so a wave of husks is +90%.' },
        { tag: 'utility', label: 'Harmonized changes the record', detail: 'Accelerando (green) → Bass (red) → Calm (blue), cycling in that order.' },
      ],
      variants: {
        label: 'The three records',
        variants: [
          { emoji: '🟢', name: 'Accelerando', description: '+20% move speed and cooldowns recharging 25% faster, for as long as it is on the deck.' },
          { emoji: '🔴', name: 'Bass', description: '×1.2 on every point of damage this element deals.' },
          { emoji: '🔵', name: 'Calm', description: '2 HP a second, continuously. The element\'s only sustain.' },
        ],
      },
      upgrade: {
        basics:
          'The record you are playing turns cuts into permanent banked stats: green pays +3% move speed '
          + 'per fighter cut, red +2% damage dealt, blue +1% damage resistance, floored at 75% off so no '
          + 'run of blue ever makes you untouchable. All three burn for hype in Coda like everything else '
          + 'you are carrying.',
        effects: [
          { tag: 'buff', label: 'Green pays speed', detail: '+3% move speed per fighter cut, permanently.', requiresUpgrade: 'e' },
          { tag: 'buff', label: 'Red pays damage', detail: '+2% damage dealt per fighter cut, permanently.', requiresUpgrade: 'e' },
          { tag: 'shield', label: 'Blue pays armour', detail: '+1% damage resistance per fighter cut, floored at 75% off — no run of blue ever makes you untouchable.', requiresUpgrade: 'e' },
          { tag: 'resource', label: 'All three burn', detail: 'Coda spends the whole bank for hype like everything else you are carrying.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'The record is a stance and cycling it costs a harmonized cast, so switching from Bass to Calm mid-fight means playing two beats correctly.',
        'In Invasion the +15%-per-fighter speed and the Sound System bank both scale with the size of the wave, which makes the disc dramatically better there than in a duel.',
      ],
    },

    boombox: {
      basics:
        'Drops a 150px field at the cursor — 205px if the cast was harmonized — that stands 8 seconds. '
        + 'Every second you stand in it banks +1% attack speed permanently and uncapped, kept when you '
        + 'walk out, and a harmonized box makes every buff picked up inside it worth 1.5×, so that '
        + 'becomes 1.5% a second. While you are inside you also move 20% faster, for exactly as long as '
        + 'you are in it. Every 3 seconds it shoves enemies inside 190px out of the field and pushes '
        + 'their projectiles with them at 300 px/s. 15s cooldown.',
      cast: 'R, placed at the cursor. 15s cooldown.',
      effects: [
        { tag: 'area', label: 'The field', detail: '150px, or 205px if the cast was harmonized, alive for 8 seconds.' },
        { tag: 'buff', label: 'What you bank', detail: '+1% attack speed for every second you stand in it — permanent, uncapped, and it stays with you when you walk out.' },
        { tag: 'movement', label: 'While you are inside', detail: '+20% move speed, for as long as you are in the field and no longer.' },
        { tag: 'control', label: 'The pulse', detail: 'Every 3 seconds enemies inside are shoved 190px out of the field, and their projectiles are pushed with them at 300 px/s.' },
        { tag: 'buff', label: 'Harmonized potency', detail: 'A harmonized box makes every buff picked up inside it worth 1.5× — so the banked attack speed is 1.5% a second rather than 1%.' },
      ],
      upgrade: {
        basics:
          'A coin dropped within 40px of the box, one per box, costs 10 hype straight off the Coda ladder '
          + 'and swells the field by a third — 200px, or 273px on a harmonized box — for the rest of its 8 '
          + 'seconds, with the pulse firing every 2 seconds instead of every 3.',
        effects: [
          { tag: 'resource', label: 'The coin', detail: '10 hype, taken straight off the Coda ladder. One coin per box, and you have to be within 40px of it.', requiresUpgrade: 'r' },
          { tag: 'area', label: 'What it buys', detail: 'The field swells by a third — 200px, or 273px on a harmonized box — for the rest of its 8 seconds.', requiresUpgrade: 'r' },
          { tag: 'control', label: 'And it pulses harder', detail: 'Every 2 seconds instead of every 3.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'Eight seconds of standing in a harmonized box is +12% attack speed banked forever. That is the single largest permanent gain the element has outside a long bugle run.',
        'The pulse is genuinely useful defence: it removes enemies *and* their in-flight shots from the field, which makes the box a safe place to stand as well as a profitable one.',
        'Spending 10 hype on a coin is 10 points off a 200-point Coda level, which is a real cost when you are close to a threshold.',
      ],
    },

    bugle: {
      basics:
        'Opens a rhythm bar: notes travel at 470 px/s, spawning every 0.42–0.94 seconds, with a 42px '
        + 'timing tolerance and a 0.4s grace at the start. Every note struck banks +1% move speed and +1% '
        + 'attack speed permanently, with no cap and no decay — and a single dropped note ends the call '
        + 'on the spot and starts the cooldown. A harmonized bugle tolerates one mistake, and spending '
        + 'that slip winds the bar up to 1.2× speed for the rest of the run, so surviving a slip makes '
        + 'everything after it harder. F again bows out and keeps everything you played for. 10s '
        + 'cooldown, starting when the run ends.',
      cast: 'F opens the bar. F again bows out and keeps everything you played for. 10s cooldown, starting when the run ends.',
      effects: [
        { tag: 'buff', label: 'Every note', detail: '+1% move speed and +1% attack speed, banked permanently. No cap and no decay.' },
        { tag: 'cost', label: 'One miss ends it', detail: 'A single dropped note ends the call on the spot and starts the cooldown.' },
        { tag: 'utility', label: 'The bar', detail: 'Notes travel at 470 px/s, spawning every 0.42–0.94 seconds, with a 42px timing tolerance and a 0.4s grace at the start.' },
        { tag: 'buff', label: 'Harmonized: one slip', detail: 'A harmonized bugle tolerates a single mistake — and spending it winds the bar up to 1.2× speed for the rest of the run, so surviving a slip makes everything after it harder.' },
      ],
      upgrade: {
        basics:
          'Two special notes join the bar — 16% of notes normally, rising to 34% once a harmonized run '
          + 'has spent its slip. 🔴 The red note is +1% damage if it runs off the end untouched, and '
          + 'striking it counts as a mistake and ends the run. 🟢 The hold note is up to +3% attack speed, '
          + 'paid across a 150px tail that has to be held for its whole length.',
        effects: [
          { tag: 'buff', label: '🔴 The red note', detail: '+1% damage if it runs off the end untouched. Striking it counts as a mistake and ends the run.', requiresUpgrade: 'f' },
          { tag: 'buff', label: '🟢 The hold note', detail: 'Up to +3% attack speed, paid across a 150px tail that has to be held for its whole length.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'How often', detail: '16% of notes normally, rising to 34% once a harmonized run has spent its slip.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'A twenty-note run is +20% to both speeds for the rest of the match, and forty hype toward the next Coda level. It is by a distance the best use of ten seconds this element has.',
        'The 1.2× speed-up after a slip is a real punishment dressed as a reward — it makes the rest of the run measurably more likely to end.',
        'Bowing out voluntarily keeps everything. There is no bonus for playing until you fail, so leaving on a good run is correct.',
      ],
    },

    coda: {
      basics:
        'Burns every percentage you are carrying at 1 hype per point — tempo counting twice, because it '
        + 'buffs two stats — and 200 hype is one level. Level 2 heals 150, turns the violin into a guitar '
        + 'at ×1.3 on every damage number, makes all your stat boosts ×1.25 as strong, and doubles your '
        + 'dash distance with trailing notes and +20% move speed for 3 seconds after it. Level 3 heals '
        + '200, brings an electric guitar at ×1.6 damage and stat boosts at ×1.5, and turns Q into Solo: '
        + 'a rhythm bar where every note landed throws a wall of music across the whole screen for 12 '
        + 'damage, or 22 on the 18% that are accents. Levels are permanent, with no way back down the '
        + 'ladder and no way to bank hype past the 200-point threshold. 1s cooldown while climbing; at '
        + 'maximum, Solo costs 25 seconds.',
      cast: 'Q. 1s cooldown while you are climbing the ladder — a Coda level costs a second apiece. Once at maximum, Q is Solo and costs 25 seconds.',
      effects: [
        { tag: 'resource', label: 'The burn', detail: '1 hype per percentage point you are carrying, and tempo counts twice because it buffs two stats. 200 hype is one level.' },
        { tag: 'heal', label: 'Level 2', detail: 'Heal 150. The violin becomes a guitar that hits harder — ×1.3 on every damage number — and all your stat boosts become ×1.25 as strong.' },
        { tag: 'movement', label: 'Level 2\'s dash', detail: 'Twice the distance, trailing notes, and +20% move speed for 3 seconds after it.' },
        { tag: 'heal', label: 'Level 3', detail: 'Heal 200. An electric guitar at ×1.6 damage, stat boosts at ×1.5, and Q becomes Solo.' },
        { tag: 'damage', label: 'Solo', detail: 'A rhythm bar where every note landed throws a wall of music across the whole screen — 12 damage a note, and 22 on the 18% of them that are accents.' },
        { tag: 'utility', label: 'Levels are permanent', detail: 'There is no way back down the ladder, and no way to bank hype you have not spent past the 200-point threshold.' },
      ],
      upgrade: {
        basics:
          'Holding Q for 3 seconds starts Party Mode instead: 12 seconds in which everything burned is '
          + 'worth double hype, the fastest route up the ladder in the element — but every percentage you '
          + 'were carrying is on them instead for the duration, which is a real handicap taken on purpose. '
          + 'A mirror ball hangs above, and a click into it swings it on real physics rather than a fixed '
          + 'arc, dealing 20 damage to anything it reaches. Afterwards Q sits out 15 seconds. At maximum '
          + 'Coda, letting go of Q early is still your Solo — the hold is an alternative rather than a '
          + 'replacement.',
        effects: [
          { tag: 'resource', label: 'Double hype', detail: 'Everything burned in Party Mode is worth ×2, which is the fastest route up the ladder in the element.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'They get your buffs', detail: 'For 12 seconds every percentage you were carrying is on them instead. It is a real handicap, taken on purpose.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'The ball', detail: 'A click into the mirror ball swings it; anything it reaches takes 20 damage. It swings on real physics rather than a fixed arc.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'The bill', detail: '3 seconds of holding to start it, 12 seconds of party, and then Q sits out 15.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'Solo still works', detail: 'At maximum Coda, letting go of Q early is still your Solo. The hold is an alternative, not a replacement.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'The ladder is the whole element. Everything else in the kit is a way of accumulating percentages that Q will eventually eat.',
        'Tempo counting double is why the bugle is the best hype generator: every note is +1% to two stats and therefore 2 hype.',
        'Party Mode handing your buffs to the enemy for twelve seconds is the single riskiest thing this element does, and doubling the burn is what pays for it.',
      ],
    },
  },

  mastery: {
    'audience-participation': {
      basics:
        'A crowd of shadows stands along the front of the stage for the whole match — three rows '
        + 'of silhouettes in the bottom 52px, heads bobbing, arms up, wands waving. They have no '
        + 'hitbox and cannot be targeted. What they do is generate 2 hype a second, continuously '
        + 'and for free, which is the first hype in this element that does not have to be banked '
        + 'as a percentage and burned. Deal 50 damage inside any rolling 5 second window and the '
        + 'room comes up: hype doubles to 4 a second for 5 seconds, the shadows jump and the '
        + 'wands go bright. The window re-arms every time it triggers, so a fight that keeps '
        + 'paying keeps them on their feet indefinitely.',
      cast: 'Passive — no key. The crowd is there from the first frame of the match.',
      effects: [
        { tag: 'resource', label: 'The standing rate', detail: '2 hype a second, continuously, for the whole match. Roughly 100 hype every 50 seconds — half a Coda level for nothing.' },
        { tag: 'resource', label: 'The room comes up', detail: '50 damage inside a rolling 5 second window doubles the rate to 4 hype a second for 5 seconds.' },
        { tag: 'utility', label: 'It re-arms', detail: 'Every trigger clears the window and restarts the 5 seconds, so a sustained burst holds the crowd up for as long as it lasts.' },
        { tag: 'utility', label: 'It counts every hit', detail: 'Damage to any enemy counts, from any source — a Solo wall, the mirror ball, a record cutting a wave of husks. 50 is 50.' },
        { tag: 'utility', label: 'They are scenery', detail: 'No hitbox, no health, no targeting. Nothing in the game can hit the audience and the audience hits nothing.' },
      ],
      notes: [
        'This is the answer to Sound\'s slow start: the ladder now climbs on its own while you are still banking percentages for the first Coda.',
        'The hype goes through the same meter as everything else, so Ruin\'s Combo Breaker halves it exactly as it halves a burn.',
        'The crowd is drawn in front of the fighters and behind the ability bar, so the bottom of the arena reads as a pit rather than as playable floor.',
      ],
    },
    compose: {
      basics:
        'Press it and a five-line stave unrolls on the floor behind you for 3 seconds, following '
        + 'exactly where you walk, engraving one note every 30px of stave — up to 64. When the 3 '
        + 'seconds are up the whole bar plays: each note hops off the line, hangs for 420ms, then '
        + 'homes at 540 px/s to the nearest enemy for 3 damage, released 55ms apart so it arrives '
        + 'as a stream. Damage scales with Coda like everything else this element throws. The '
        + 'number of notes is decided by nothing except distance covered — stand still and the '
        + 'ability does literally zero; run a full lap wearing the element\'s banked speed and it '
        + 'is 64 notes and 192 damage. 18s cooldown, and it refuses to start while you are stood '
        + 'on the bugle or Solo bar, where you cannot move.',
      cast: 'The bound key. No aim — the stave is written from your own feet. 18s cooldown.',
      effects: [
        { tag: 'summon', label: 'The stave', detail: 'A five-line staff, 5px between lines, unrolled along your own path for 3 seconds. It fades off the floor 900ms after the bar plays.' },
        { tag: 'resource', label: 'One note per 30px', detail: 'Engraved as you cover ground, up to a ceiling of 64 notes. Standing still writes nothing at all.' },
        { tag: 'damage', label: 'What a note is worth', detail: '3 damage, scaled by Coda — ×1.3 at level 2 and ×1.6 at level 3. A full 64-note bar is 192 before Coda and 307 at level 3.' },
        { tag: 'utility', label: 'The downbeat', detail: 'Each note hops off the line for 420ms, then homes at 540 px/s to the nearest live enemy. They leave 55ms apart, so a full bar takes about 3.5 seconds to empty.' },
        { tag: 'utility', label: 'They give up', detail: 'A note with nothing to chase, or one still hunting 4 seconds after it launched, drifts off instead of hanging around.' },
        { tag: 'cost', label: 'Not from the bar', detail: 'It refuses to start while you are stood on the bugle or Solo rhythm bar — you cannot move up there, so there would be nothing to write on.' },
      ],
      notes: [
        'This is what Sound\'s move speed was always for. The element banks stride off the green record, the bugle, the boombox field and Coda\'s dash and then has nothing to spend it on; here the distance you cover in three seconds *is* the damage.',
        'Three damage a note reads as nothing and is meant to. The ability is the stave, not the note.',
        'The bar plays wherever you are by then — you are free to move the whole time the notes are flying, and they home rather than firing along the stave.',
        'Whichever of E/R/F/Q you bind it over is gone for the match, so binding it on Q gives up the Coda ladder entirely. F is the usual home: the bugle is the one key you can afford to lose once tempo is already banked.',
      ],
    },
  },

  perks: {
    harmony: {
      basics:
        'Every harmonized cast also drops a resonator at your cursor, at most one every 3 seconds, '
        + 'which is one and a half metronome beats. It blasts 0.9 seconds later for 20 damage in a 100px '
        + 'radius, and a hit gives +15% move speed and +15% attack speed for 20 seconds, stacking to 4 — '
        + 'so +60% of each at full stacks.',
      cast: 'Automatic on any harmonized cast, aimed at the cursor. One resonator every 3 seconds.',
      effects: [
        { tag: 'damage', label: 'The blast', detail: '20 damage in a 100px radius, 0.9 seconds after it lands.' },
        { tag: 'buff', label: 'What a hit is worth', detail: '+15% move speed and +15% attack speed for 20 seconds, stacking to 4 — so +60% of each at full stacks.' },
        { tag: 'utility', label: 'The rate', detail: 'One resonator every 3 seconds, which is one and a half metronome beats.' },
      ],
      notes: [
        'Four stacks of 15% is a very large amount of tempo, and tempo counts double for hype — so a Harmony run feeds the Coda ladder faster than anything else in the element.',
        'The buff is a timer rather than a bank, so it is the one percentage in this kit that does decay.',
      ],
    },
  },
};

export default sound;
