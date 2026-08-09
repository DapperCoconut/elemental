import { ElementCodex } from '../AbilityCodex';

/**
 * Sound — a concert soloist with a metronome running.
 *
 * Verified against `src/elements/sound.ts`, `kits/SoundKit.ts`, the five shop upgrades in
 * `data/Upgrades.ts` and the Harmony perk in `data/Perks.ts`. Sound has no mastery enhancements;
 * every figure below is a constant at the top of the kit.
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
      magic:
        'A two-second meter appears over the ability bar the moment you cast anything, and a gold '
        + 'window sits at the far end of it. Play your next ability inside that window and the '
        + 'cast comes out *harmonized* — which for every ability in this element means something '
        + 'different and always means something better. It restarts on every cast, so the element '
        + 'is played as a rhythm rather than as a rotation.',
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
      magic:
        'Almost nothing this element gives you goes away. A second spent inside a boombox field is '
        + 'a permanent percentage of attack speed. A note struck on the bugle bar is a permanent '
        + 'percentage of move *and* attack speed. A fighter cut by a record pays into a bank that '
        + 'lasts the match. None of it caps, none of it decays, and all of it is fuel for the '
        + 'ultimate.',
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
      magic:
        'You strike the instrument and a wedge of sound leaves it — a struck note, thrown flat '
        + 'across the arena. It is the smallest number in the element and the only thing on a '
        + 'one-second cooldown, and Coda scales it along with everything else.',
      cast: 'Click, along the aim. 1s cooldown, which is also exactly half the metronome.',
      effects: [
        { tag: 'damage', label: 'The note', detail: '10 damage, or 15 harmonized.' },
        { tag: 'area', label: 'The wave', detail: '780 px/s out to 470px, 28px thick, spreading about 0.1 radians as it travels.' },
        { tag: 'buff', label: 'Coda scales it', detail: '×1.3 at Coda level 2 and ×1.6 at level 3, on top of the harmonize.' },
      ],
      upgrade: {
        magic:
          'Encore Streak makes keeping time something you can see. Every ability you land on the '
          + 'beat adds one to a running count, and every point of it widens the shockwave. A long '
          + 'clean run turns the struck note back into the wall it used to be.',
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
      magic:
        'A vinyl record is slung out around you and comes back, and everything inside a hundred '
        + 'and thirty pixels is cut by it. Cutting somebody is worth speed. But the reason to '
        + 'press E on the beat is not the damage — it is that a harmonized disc changes the record '
        + 'on the deck, and the record is a permanent stance.',
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
        magic:
          'Sound System puts a till on the deck. Every fighter a record cuts pays into a bank you '
          + 'keep for the whole match, and which currency it pays in is whichever record happens '
          + 'to be spinning when the disc lands.',
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
      magic:
        'A boombox is thrown to your cursor and stands there for eight seconds with a pink field '
        + 'humming around it. Standing in the field is worth attack speed you keep forever, and '
        + 'you move faster while you are in it. Every three seconds the box lets go — a hard pulse '
        + 'that throws enemies out of the field and their bullets with them.',
      cast: 'R, placed at the cursor. 15s cooldown.',
      effects: [
        { tag: 'area', label: 'The field', detail: '150px, or 205px if the cast was harmonized, alive for 8 seconds.' },
        { tag: 'buff', label: 'What you bank', detail: '+1% attack speed for every second you stand in it — permanent, uncapped, and it stays with you when you walk out.' },
        { tag: 'movement', label: 'While you are inside', detail: '+20% move speed, for as long as you are in the field and no longer.' },
        { tag: 'control', label: 'The pulse', detail: 'Every 3 seconds enemies inside are shoved 190px out of the field, and their projectiles are pushed with them at 300 px/s.' },
        { tag: 'buff', label: 'Harmonized potency', detail: 'A harmonized box makes every buff picked up inside it worth 1.5× — so the banked attack speed is 1.5% a second rather than 1%.' },
      ],
      upgrade: {
        magic:
          'Jukebox grows a coin slot on the side of the box. Stand at it and press Space — Space '
          + 'alone, so no dodge comes out — to feed it ten hype off the Coda ladder, and the box '
          + 'gets louder for the rest of its life.',
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
      magic:
        'You put the violin down and take up a brass bugle, and a rhythm bar opens beneath you. '
        + 'Notes come along it and every one you strike on time is worth a permanent percentage of '
        + 'both your speeds. Miss one and the call is over. It is the highest-value thing in the '
        + 'element and it requires you to stand there and play.',
      cast: 'F opens the bar. F again bows out and keeps everything you played for. 10s cooldown, starting when the run ends.',
      effects: [
        { tag: 'buff', label: 'Every note', detail: '+1% move speed and +1% attack speed, banked permanently. No cap and no decay.' },
        { tag: 'cost', label: 'One miss ends it', detail: 'A single dropped note ends the call on the spot and starts the cooldown.' },
        { tag: 'utility', label: 'The bar', detail: 'Notes travel at 470 px/s, spawning every 0.42–0.94 seconds, with a 42px timing tolerance and a 0.4s grace at the start.' },
        { tag: 'buff', label: 'Harmonized: one slip', detail: 'A harmonized bugle tolerates a single mistake — and spending it winds the bar up to 1.2× speed for the rest of the run, so surviving a slip makes everything after it harder.' },
      ],
      upgrade: {
        magic:
          'Perfect Pitch starts writing notes nobody is supposed to strike. A red note pays only '
          + 'if you let it run off the end of the bar untouched — playing it is the mistake. A '
          + 'green hold note has to be caught and carried the whole way. Both are uncommon, and '
          + 'the bar starts leaning on them once your one harmonized slip has been spent.',
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
      magic:
        'You take everything you have banked — every percentage of speed, of attack, of damage, of '
        + 'resistance — and burn it. What comes back is hype, and hype is levels, and levels are a '
        + 'bigger instrument. The violin becomes a guitar; the guitar becomes an electric guitar; '
        + 'and at the top of the ladder Q stops being a button and becomes a rhythm bar where '
        + 'every note you land throws a wall of music across the entire screen.',
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
        magic:
          'Raise the Roof turns Q into a hold. Three seconds of it winds a mirror ball down out '
          + 'of the ceiling and the arena becomes a lit dance floor. Every buff you were carrying '
          + 'comes off you and goes onto your enemy for twelve seconds — and in exchange, the '
          + 'burn pays double.',
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

  perks: {
    harmony: {
      magic:
        'Playing on the beat stops being purely a modifier and starts being an attack. Every '
        + 'harmonized cast also lobs a brass resonator at your cursor — it flies out, sits there '
        + 'for a beat, and then goes off. Landing one is worth a large, long buff, and they stack '
        + 'four deep.',
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
