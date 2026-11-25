import { ElementCodex } from '../AbilityCodex';

/**
 * Venom (element id `slime`) — the plague doctor. It was Acid, and Slime before that; the id never moved.
 *
 * Verified against `src/elements/slime.ts`, `kits/SlimeKit.ts`, `kits/AcidGrid.ts`, the slime
 * block of `data/Upgrades.ts` and Venom Mastery in `data/Mastery.ts`. Numbers here are the ones
 * the kit actually applies.
 */
const slime: ElementCodex = {
  identity:
    'A plague doctor with a syringe gun. Its toxin does no damage: every stack makes each new negative '
    + 'effect on the victim last 2% longer, up to three times as long at 100. The harm comes from what '
    + 'gets stretched — the four poisons Pick Your Poison loads into the gun — and from the floor, a grid '
    + 'of permanent acid that the shots trickle, the bomb floods and the rain falls on. Burrow under it '
    + 'and come up biting to put every one of those effects back to full length.',

  passives: [
    {
      emoji: '☠️',
      name: 'Toxin',
      basics:
        'Stacks laid by Inject (2 a hit), the bomb (5 to 25), cluster bombs (2), Shed Skin darts (1) and '
        + 'standing on your acid (1 a second). They never fade and cap at 100. Each stack makes every new '
        + 'negative effect that lands on that body last 2% longer — at 100 stacks, 200% longer. The '
        + 'Burrow bite raises the count by 25%.',
      effects: [
        { tag: 'debuff', label: 'Longer debuffs', detail: '+2% duration per stack on every timed negative effect applied to them, from any source — burns, slows, stuns and your own four poisons alike.' },
        { tag: 'utility', label: 'The cap', detail: '100 stacks: every new negative effect lasts 3× as long.' },
        { tag: 'utility', label: 'Permanent', detail: '0 stacks are lost over time — toxin stays for the whole match.' },
      ],
      notes: [
        'The stretch is applied the moment an effect lands, at the toxin they have right then. Effects that hold a separate timer per stack (frost) are not stretched.',
        'Online, the stacks are decided on the venom\'s machine and mirrored to the victim.',
      ],
    },
    {
      emoji: '🟢',
      name: 'Acid Floor',
      basics:
        'Your acid is a grid of 16px cells across the whole arena, so overlapping pools never count '
        + 'twice. Fresh acid glows: the first body to walk over a fresh cell takes 0.3 damage for it '
        + 'and cools it. Spent acid stays forever, and anyone standing on any of your acid takes 1 damage '
        + 'and 1 toxin every second.',
      effects: [
        { tag: 'damage', label: 'Fresh cells', detail: '0.3 damage per fresh cell walked over, which cools it — roughly 4 for crossing a whole bomb crater\'s width.' },
        { tag: 'dot', label: 'Standing', detail: '1 damage and 1 toxin a second to anyone on your acid, the moment they step on and every second after.' },
        { tag: 'area', label: 'Permanent', detail: 'Acid never dries — 100% of what you lay is still on the floor when the match ends.' },
        { tag: 'utility', label: 'Re-lighting', detail: 'Laying acid over spent acid makes it fresh again.' },
      ],
      notes: [
        'Your acid only hurts your enemies. Standing in it is the precondition for Burrow, and it is what Paralyzing and Melting need under the victim.',
      ],
    },
    {
      emoji: '📊',
      name: 'Acidification',
      basics:
        'The gauge across the top of the screen is the share of the arena that is your acid. At 15% and '
        + '35% (the red lines) Acid Reflux\'s bomb grows a size, and the toxin a bomb lays climbs with every '
        + 'point of coverage. With Venom Mastery, 20%, 40%, 60% and 80% each earn one Shed Skin.',
      effects: [
        { tag: 'buff', label: 'Bomb sizes', detail: 'Under 15%: 25 damage in 80px. 15–35%: 38 in 105px. 35% or more: 52 in 130px.' },
        { tag: 'debuff', label: 'Bomb toxin', detail: '5 toxin plus 0.4 per percent of coverage, up to 25 — 9 at 10% acid, 19 at 35%.' },
        { tag: 'utility', label: 'Milestones', detail: '20%, 40%, 60% and 80% each hand over one Shed Skin, once per match — the diamonds on the gauge appear with the mastery.' },
      ],
      notes: [
        'Venom Mastery tracks it two ways: 500% laid down across all matches, and a single-match high of 80%.',
      ],
    },
  ],

  abilities: {
    'venom-inject': {
      basics:
        'Fires one blob of venom from the syringe gun at 720 px/s: 12 damage and 2 toxin. The blob dribbles '
        + 'a 16px-wide line of acid behind it as it flies and leaves a 34px puddle under whoever it hits. The '
        + 'barrel holds 3 shots; the third starts a 1-second reload in which you stab yourself with the '
        + 'needle and draw it full again. 0.42s between shots.',
      cast: 'Click, aimed at the cursor. Hold to keep firing. With the upgrade, right click injects yourself.',
      effects: [
        { tag: 'damage', label: 'The shot', detail: '12 damage per blob, 720 px/s.' },
        { tag: 'debuff', label: 'Toxin', detail: '2 toxin on every hit.' },
        { tag: 'summon', label: 'Trickle', detail: 'An unbroken line of fresh acid 1 cell (16px) wide, from the needle to wherever the shot went.' },
        { tag: 'summon', label: 'Puddle', detail: 'A 34px puddle of fresh acid under an enemy it hits.' },
        { tag: 'cost', label: 'Reload', detail: '3 shots a barrel, then a 1s self-stab before the next one. 0.42s between shots.' },
      ],
      upgrade: {
        basics:
          'Right click turns a shot on yourself. It spends one shot from the barrel, leaves a 40px puddle of '
          + 'fresh acid under you and gives you 5 self-toxin: each stack makes every new positive effect on '
          + 'you last 2% longer, up to three times as long at 100. If a poison was loaded it goes into you as '
          + 'a boon instead — 8 seconds of that poison working for you, but only while you stand on your own acid.',
        effects: [
          { tag: 'cost', label: 'One shot', detail: 'Uses 1 of the 3 shots in the barrel (the last one starts the 1s reload) and any loaded poison. 0.42s between stabs.', requiresUpgrade: 'click' },
          { tag: 'summon', label: 'Puddle', detail: 'A 40px puddle of fresh acid at your feet.', requiresUpgrade: 'click' },
          { tag: 'buff', label: 'Self-toxin', detail: '+5 a stab, capped at 100, never fading. +2% duration per stack on every timed positive effect that lands on you, from any source.', requiresUpgrade: 'click' },
          { tag: 'shield', label: 'Disintegrating boon', detail: '8s: 30% less damage taken while you stand on your acid.', requiresUpgrade: 'click' },
          { tag: 'buff', label: 'Paralyzing boon', detail: '8s: ×1.3 move speed while you stand on your acid.', requiresUpgrade: 'click' },
          { tag: 'buff', label: 'Purging boon', detail: '8s: ×1.25 damage from everything in the kit while you stand on your acid.', requiresUpgrade: 'click' },
          { tag: 'heal', label: 'Melting boon', detail: '8s: 2 HP every 0.5s while you stand on your acid.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'A shot that passes within reach of your own Acid Reflux bomb in the air bursts it into cluster bombs, and is used up doing it.',
        'The liquid in the barrel shows what is loaded: green is plain venom, anything else is a poison.',
      ],
    },

    'pick-your-poison': {
      basics:
        'Four vials circle you: Disintegrating above, Paralyzing to the right, Purging below, Melting to '
        + 'the left. Release toward one and your next Inject shot carries it. Disintegrating burns 5 a '
        + 'second for 5s and each tick adds 3% damage taken (up to 15%) for 8s. Paralyzing blocks every '
        + 'dash and dodge for 8s, with a 40% slow and slipping on your acid. Purging strips every positive '
        + 'effect for 8s. Melting doubles the damage they take on your acid for 8s while they drip it. 7s cooldown.',
      cast: 'Hold E to open the wheel, release toward a vial. A tap picks whichever the cursor is nearest.',
      effects: [
        { tag: 'dot', label: 'Disintegrating', detail: '5 damage a second for 5s — 5 ticks, 25 damage. Each tick is +3% damage taken for 8s, refreshing all stacks, up to 15%.' },
        { tag: 'debuff', label: 'Paralyzing', detail: '8s: their dodge and every dash in their abilities does not move them (the rest of the ability still happens). On your acid they are slowed 40% and the floor is slippery.' },
        { tag: 'debuff', label: 'Purging', detail: '8s of Purged: shields, evasion and every timed buff are stripped on the hit and again every 0.3s, and speed boosts are suppressed.' },
        { tag: 'debuff', label: 'Melting', detail: '8s: ×2 damage taken while they stand on your acid, and a 13px puddle of it drips off them every 0.45s.' },
        { tag: 'utility', label: 'Availability', detail: '7s cooldown, starting when the vial is loaded. 1 shot is loaded per pick.' },
      ],
      upgrade: {
        basics:
          'Two of your poisons running on the same enemy react, and each of the six pairs does something '
          + 'of its own for as long as both last: more damage the faster they move, damage for every buff '
          + 'stripped, vulnerability that builds on your acid, a lock on every ability that moves them, a '
          + 'wider trail of acid, or negative effects that grow each time they are hit.',
        effects: [
          { tag: 'debuff', label: 'Disintegrating + Paralyzing', detail: 'Up to +30% damage taken, scaling with their speed: nothing at a standstill, all of it at 260 px/s.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'Disintegrating + Purging', detail: '12 damage for each buff Purging strips off them, counting at most 3 per strip (36). Purging strips every 0.3s.', requiresUpgrade: 'e' },
          { tag: 'debuff', label: 'Disintegrating + Melting', detail: '+3% damage taken for every second they stand on your acid, up to +30%. It holds while both poisons run and is lost when either ends.', requiresUpgrade: 'e' },
          { tag: 'control', label: 'Paralyzing + Purging', detail: 'Every ability of theirs that moves them refuses to cast at all — not just the movement in it — until one of the two runs out.', requiresUpgrade: 'e' },
          { tag: 'summon', label: 'Paralyzing + Melting', detail: 'Their Melting drip becomes a 24px puddle every 0.3s instead of 13px every 0.45s.', requiresUpgrade: 'e' },
          { tag: 'debuff', label: 'Purging + Melting', detail: 'Each time they take damage, every timed negative effect running on them gains 0.25s.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'All four are timed negative effects, so toxin stretches them: at 100 toxin Disintegrating runs 15 ticks and the others 24s.',
        'A loaded shot that bursts your bomb hands its poison to all 5 cluster bombs.',
        'Against a Purged invasion husk the hit also cancels a baked-in speed bonus and removes a variant\'s bonus max HP, once per husk.',
      ],
    },

    'acid-reflux': {
      basics:
        'The first press pulls an acid bomb out; the second lobs it at 300 px/s. It bursts on the first '
        + 'enemy or wall it reaches into a pool of fresh acid — 25 damage in 80px — and lays 5 to 25 toxin '
        + 'depending on how much of the arena is acid. At 15% acid the bomb is banded brass: 38 damage in '
        + '105px. At 35% it is spiked and red-hot: 52 in 130px. Hit it in the air with Inject and it sheds '
        + '5 cluster bombs. 9s cooldown.',
      cast: 'R to pull the bomb out, R again to throw it at the cursor. The cooldown starts on the throw.',
      effects: [
        { tag: 'damage', label: 'The blast', detail: '25 damage in 80px; 38 in 105px at 15% acid; 52 in 130px at 35%.' },
        { tag: 'summon', label: 'The crater', detail: 'The whole blast radius becomes fresh acid, with 6 to 10 gouts thrown past the rim.' },
        { tag: 'debuff', label: 'Toxin', detail: '5 toxin plus 0.4 per percent of acid coverage, capped at 25.' },
        { tag: 'summon', label: 'Cluster bombs', detail: 'An Inject shot passing the flying bomb bursts it once: 5 bomblets land 80–160px ahead after 0.5s, each a 44px pool, 8 damage and 2 toxin.' },
        { tag: 'utility', label: 'Availability', detail: '9s cooldown from the throw; the bomb flies up to 4s if nothing stops it.' },
      ],
      upgrade: {
        basics:
          'Use Pick Your Poison while the bomb is in your hand and the vial goes into the bomb instead of '
          + 'the gun. Everyone the blast catches gets that poison, and the bomb itself changes: Disintegrating '
          + 'hits half as hard again and leaves them fully vulnerable, Paralyzing stuns, Purging is true '
          + 'damage and makes a third of all your damage true for 8 seconds, and Melting splashes wider and '
          + 'boils the acid already on the floor red.',
        effects: [
          { tag: 'utility', label: 'Filling it', detail: 'E with the bomb held fills the bomb and spends Pick Your Poison\'s 7s cooldown; the gun is not loaded. The blast applies the poison to everyone it hits.', requiresUpgrade: 'r' },
          { tag: 'damage', label: 'Disintegrating bomb', detail: '×1.5 blast damage (37 / 57 / 78), and the full 15% damage-taken vulnerability for 8s at once.', requiresUpgrade: 'r' },
          { tag: 'control', label: 'Paralyzing bomb', detail: 'A 1.5s stun on everyone caught: no moving, no casting.', requiresUpgrade: 'r' },
          { tag: 'damage', label: 'Purging bomb', detail: 'The blast is true damage. For 8s after it bursts, one third of every hit the kit deals is true damage.', requiresUpgrade: 'r' },
          { tag: 'area', label: 'Melting bomb', detail: '×1.3 blast radius (104 / 137 / 169px). Acid already inside it turns red: 1.5 damage per cell to the first enemy to touch it — five times fresh acid — and then it is ordinary acid again.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'The bomb\'s size is read when it is thrown, and the one in your hand already shows it.',
        'The clustered bomb keeps flying and still bursts where it lands.',
        'A filled bomb that is shot into clusters by a plain shot hands its own poison to the 5 cluster bombs.',
      ],
    },

    'venom-burrow': {
      basics:
        'Dive under your acid: fully invincible at ×1.35 move speed, and no attacking while under. Only '
        + 'enterable while standing on your acid. Press again, or reach the end of the acid, and you come '
        + 'up biting everything within 95px: 30 damage, every negative effect on them restored to the '
        + 'length it was applied at, and their toxin raised by 25%. 5s cooldown, and 1.5s after surfacing '
        + 'before you can go under again.',
      cast: 'F to submerge, F again to surface and bite. With the upgrade, F while holding a bottle drinks it first.',
      effects: [
        { tag: 'shield', label: 'Invincible', detail: '100% immune while burrowed — a flat immunity, not a reduction.' },
        { tag: 'movement', label: 'Faster underground', detail: '×1.35 move speed while under.' },
        { tag: 'damage', label: 'The bite', detail: '30 damage to every enemy within 95px of where you come up.' },
        { tag: 'debuff', label: 'Restored', detail: 'Every timed negative effect still running on the bitten goes back to its full applied length — an 8s poison with 1s left has 8s again.' },
        { tag: 'debuff', label: 'Toxin ×1.25', detail: 'Their toxin is multiplied by 1.25 — 40 becomes 50.' },
        { tag: 'cost', label: 'Acid only', detail: 'Entry needs acid underfoot; leaving your acid surfaces you (with the bite). 5s cooldown, 1.5s lock after surfacing.' },
      ],
      upgrade: {
        basics:
          'Burrow no longer needs acid: dive anywhere and tunnel under clean floor, trailing acid, for up to '
          + 'half a second before you are forced up. Biting someone fills a bottle with their blood, and '
          + 'pressing F again drinks it: every timed positive effect they had lands on you for twice the time '
          + 'it had left, and each of your poisons that was running in them becomes that poison\'s boon on you.',
        effects: [
          { tag: 'movement', label: 'Tunnelling', detail: 'Burrow can be entered off acid. Off your acid you surface (with the bite) after 0.5s; back on it the clock resets.', requiresUpgrade: 'f' },
          { tag: 'summon', label: 'The trail', detail: 'A 13px line of fresh acid along the tunnel, appearing 0.65s behind you or all at once when you surface.', requiresUpgrade: 'f' },
          { tag: 'resource', label: 'The bottle', detail: 'A bite on anyone carrying a timed buff or one of your poisons fills it. One bottle at a time; several bodies bitten at once share it.', requiresUpgrade: 'f' },
          { tag: 'buff', label: 'Drinking it', detail: 'F with a bottle in hand: each stolen buff runs on you for 2× what it had left on them. Shields and other pools are not timed and are not copied.', requiresUpgrade: 'f' },
          { tag: 'buff', label: 'Boons', detail: 'Each of your four poisons that was in them gives you its 8s boon — see Inject\'s upgrade for what each does. Self-Inject is not needed.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'The restore counts the stretch toxin gave the effect when it landed.',
        'With the Murk divine perk, a toad hops about on the surface while you are under, dribbling 26px of acid wherever it lands.',
      ],
    },

    'acid-apocalypse': {
      basics:
        'Eight seconds of acid rain over all of your acid at once. Every enemy standing on it takes 6 '
        + 'damage every 0.5s — 12 a second, up to 96 — on top of the floor\'s own 1 damage and 1 toxin. '
        + 'With no acid down it does nothing. 25s cooldown.',
      cast: 'Q. Instant, no lock.',
      effects: [
        { tag: 'dot', label: 'Rain damage', detail: '6 damage every 0.5s to every enemy on your acid, for 8s — up to 96.' },
        { tag: 'area', label: 'Reach', detail: 'There is no radius: every one of your 16px acid cells is under the rain.' },
        { tag: 'utility', label: 'Availability', detail: '25s cooldown, a 320ms camera shake on the cast.' },
      ],
      upgrade: {
        basics:
          'Your acid creeps outward while the rain falls: every 0.5s, every clean cell touching acid has a '
          + '15% chance to fill, and the new acid stays.',
        effects: [
          { tag: 'area', label: 'Creep', detail: 'Each rain beat (0.5s), every clean cell bordering your acid has a 15% chance to become acid — roughly a cell every 3 seconds at the edge.', requiresUpgrade: 'q' },
          { tag: 'buff', label: 'Permanent gain', detail: 'The new acid never dries, so every cast permanently raises the gauge.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Rain kills count toward the mastery\'s Meltdown requirement.',
      ],
    },
  },

  perks: {
    electrolysis: {
      basics:
        'Your pools become a circuit. Every 1.4 seconds a current arcs between two of your puddles or '
        + 'craters within 220px of each other, chosen at random, dealing 12 damage to anything within 20px '
        + 'of the line and jolting it to 45% speed for 0.45s. One arc in five surges: 36 damage, and it '
        + 'jumps on to a third pool.',
      cast: 'Passive. It starts arcing the moment you have two pools close enough to conduct.',
      effects: [
        { tag: 'damage', label: 'The arc', detail: '12 damage to anything within 20px of the line between two pools, every 1.4 seconds.' },
        { tag: 'debuff', label: 'The jolt', detail: 'Anything the current crosses is dropped to 45% speed for 0.45s.' },
        { tag: 'damage', label: 'Surge', detail: 'A 20% chance per arc: 36 damage instead of 12, and it chains to a third pool.' },
        { tag: 'area', label: 'Conducting range', detail: '220px between pool centres.' },
      ],
      notes: [
        'Inject puddles, bomb craters and cluster pools are all terminals; the thin trickle a shot leaves is not.',
      ],
    },
  },

  mastery: {
    'acid-walker': {
      basics:
        'Stepping off your acid starts a 5-second window in which you lay a print every 34px walked. '
        + 'Prints are 15px and deal 2 damage every 0.5s for 3 seconds, or 26px and 4 if laid within 3 '
        + 'seconds of surfacing from Burrow.',
      effects: [
        { tag: 'utility', label: 'The window', detail: '5 seconds of prints from the moment you step off your acid.' },
        { tag: 'summon', label: 'Spacing', detail: 'One print every 34px walked.' },
        { tag: 'dot', label: 'Normal prints', detail: '15px, 2 damage every 0.5s, lasting 3 seconds.' },
        { tag: 'dot', label: 'Boosted prints', detail: '26px and 4 damage every 0.5s within 3s of surfacing.' },
      ],
      notes: [
        'Prints are their own thing, not acid: they do not count toward coverage and do not poison.',
      ],
    },
    'shed-skin': {
      basics:
        'No cooldown. Each acidification milestone — 20%, 40%, 60% and 80% — banks one shed, so a match '
        + 'holds at most four. Shedding makes you 15% faster for the rest of the match, stacking each '
        + 'time, while 48 venom darts spiral out of you over 0.6s and a 48px pool and six 22px splashes of '
        + 'acid land around you.',
      cast: 'Bindable to R, F or Q, replacing that slot\'s ability for the match. Does nothing without a banked shed.',
      effects: [
        { tag: 'utility', label: 'Charges', detail: 'One shed at each of 20%, 40%, 60% and 80% coverage — four per match at most, no cooldown between them.' },
        { tag: 'movement', label: 'Quicker', detail: '+15% move speed per shed, stacking: +60% after all four.' },
        { tag: 'damage', label: 'The barrage', detail: '48 darts spiralling out over 0.6s at 650 px/s, each 1 damage and 1 toxin.' },
        { tag: 'summon', label: 'Acid', detail: 'A 48px pool under you and six 22px splashes 40–80px around.' },
      ],
      notes: [
        'The gauge shows the four milestones as diamonds while Shed Skin is bound.',
      ],
    },
  },
};

export default slime;
