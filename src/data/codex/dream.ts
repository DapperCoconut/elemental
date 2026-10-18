import { ElementCodex } from '../AbilityCodex';

/**
 * Dream — the sandman with two little guns.
 *
 * Verified against `src/elements/dream.ts` and `kits/DreamKit.ts`; the numbers are the
 * constants at the top of the kit (the shop upgrades' and the mastery's have their own blocks
 * there). The pendulum's upgrades and Dream Duel went with the 2026-10-17 rework; these are the
 * sandman's own, from 2026-10-18.
 */
const dream: ElementCodex = {
  identity:
    'The element earned by sparing the Devourer of Kings: a sandman with two little guns and a way '
    + 'into your head. Out here it puts you to sleep — gently, because anything that hurts a sleeper '
    + 'wakes them. Then it steps into your dream, where you are awake and fighting but nothing it does '
    + 'can wake you, and every one of its keys turns into something worse. The dream only lasts as long '
    + 'as your drowsiness, so the rhythm is: dream, surface, top you back up, dream again.',

  passives: [
    {
      emoji: '😴',
      name: 'Drowsiness',
      basics:
        'A 0–100 meter on the enemy. Pillow Fight and Sleep Tight fill it; at 100 they fall asleep where '
        + 'they stand — no moving, no casting. A sleeper burns 5 drowsiness a second and wakes when it '
        + 'runs out, so a full meter is 20 seconds of sleep. Any damage in the waking world wakes them on '
        + 'the spot and empties the meter. Awake, it wears off at 3 a second once nothing has added to it '
        + 'for 4 seconds. Anything unstoppable refuses to sleep: the meter sticks at 99.',
      effects: [
        { tag: 'debuff', label: 'The meter', detail: '0–100 on the enemy, shown over their head as sheep jumping a fence.' },
        { tag: 'control', label: 'Asleep', detail: 'At 100: cannot move or cast. Burns 5 a second — a full meter is 20 seconds.' },
        { tag: 'utility', label: 'Waking', detail: 'Any damage in the waking world wakes them and empties the meter. Running dry wakes them too.' },
        { tag: 'utility', label: 'Wearing off', detail: 'Awake, 3 a second once nothing has added to it for 4 seconds.' },
        { tag: 'utility', label: 'Topping up a sleeper', detail: 'Drowsiness added to a sleeper extends the sleep, up to the 100 cap — which is how a dream is made to last.' },
      ],
      notes: [
        'The meter belongs to the body, not the caster: in Dream-versus-Dream both sides write into the same number on each other.',
        'Pillow Fight and Sleep Tight both refuse to hurt a sleeper, so they top the meter up without waking anyone. Sandmen does not — it wakes them.',
        'Nightmare\'s own damage never wakes a sleeper, and nothing at all wakes the body of somebody who is dreaming.',
      ],
    },
  ],

  abilities: {
    'dream-sandmen': {
      basics:
        'Hold to fire two little hourglass revolvers at the cursor, turn about — one round every 0.125 '
        + 'seconds, alternating hands so the rounds never line up. Each round is hitscan: it flies to the '
        + 'crosshair and 30px past it, and stops in the first enemy on the way for 4 damage. 30 rounds, '
        + 'then a 5-second reload. The guns kick hard: every round throws the crosshair about 9px, mostly '
        + 'upward and wandering side to side, up to 180px off — the system cursor is hidden and the '
        + 'crosshair is the real aim, so you have to drag the mouse against the kick to stay on target. '
        + 'It settles back 0.22 seconds after you stop.',
      cast: 'Click and hold. 30 rounds a magazine, 5s reload.',
      effects: [
        { tag: 'damage', label: 'Rounds', detail: '4 each, 8 a second — 120 a magazine if every round lands.' },
        { tag: 'utility', label: 'Hitscan to the crosshair', detail: 'A round reaches the crosshair plus 30px (90px at the least) and stops in the first body on the way.' },
        { tag: 'cost', label: 'Recoil', detail: '~9px of kick a round, mostly up, up to 180px off. Recovers 0.22s after the trigger is let go.' },
        { tag: 'cost', label: 'Reload', detail: '5 seconds after the 30th round. The card and the ring around the crosshair both show it.' },
      ],
      notes: [
        'A hit wakes a sleeper — the guns are for awake targets and for the inside of a dream.',
        'In a dream, Click is the dream pistols: 30 explosive damage in a 54px blast, exactly at the crosshair (or the first body before it), 2 rounds, a 1.5s reload (shortened by the dream), and roughly 66px of kick a shot.',
        'The bot fights its recoil as it goes and kicks half as hard, but its decision tick limits how fast it fires.',
      ],
      upgrade: {
        basics:
          'Amnesia: right-click to throw whatever is left in the magazine at the crosshair. It tumbles there at '
          + '820px a second and goes off: anybody within about 28px of the burst takes 1.5 for every round that '
          + 'was left (45 off a full magazine), and every round is flung out in a ring — 640px a second, out to '
          + '250px — for 4 damage to the first enemy each one meets. Throwing it starts the 5-second reload, and '
          + 'you need rounds left (and not to be reloading) to throw at all. In a dream it is the pistols\' rounds '
          + 'thrown as one: a 115px blast of 30 damage, or 75 if both rounds were still loaded, and a pistol reload.',
        effects: [
          { tag: 'damage', label: 'The clip', detail: '1.5 per round left to anybody under the burst — 45 from a full 30.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'The rounds', detail: 'One per round left, thrown out in a ring: 4 to the first enemy each meets, out to 250px.', requiresUpgrade: 'click' },
          { tag: 'cost', label: 'Reload', detail: 'Starts the 5s reload (1.5s in a dream). Needs at least 1 round and no reload running.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'Dreaming: both barrels', detail: '30 damage in 115px, or 75 with both pistol rounds still in.', requiresUpgrade: 'click' },
        ],
      },
    },

    'dream-delve': {
      basics:
        'Within 170px of a sleeping enemy, step into their dream. The whole arena becomes one of five '
        + 'dream worlds — Candyfloss Sky, the Melting Hours, the Upside-Down Sea, the Endless Bedroom or the '
        + 'Moonlit Carnival — framed in purple mist. In there they are awake and can move and fight, but '
        + 'their body is still asleep out here: nothing that happens in the dream wakes it, and their '
        + 'drowsiness keeps burning at 5 a second, which is how long the dream has left. You move 35% '
        + 'faster and every cooldown is 40% shorter, and Click, R, F and Q become their dream versions. '
        + 'Press E again to surface; the dream also ends when their drowsiness runs dry. Either way both '
        + 'of you are put back where your bodies were lying. 1.2s cooldown.',
      cast: 'E, next to a sleeping enemy. E again to surface. 1.2s cooldown.',
      effects: [
        { tag: 'utility', label: 'Into the dream', detail: 'Needs a sleeping enemy within 170px. The arena turns into one of five dream worlds.' },
        { tag: 'buff', label: 'Dreamwalking', detail: '+35% move speed, −40% cooldowns for as long as you are in there.' },
        { tag: 'control', label: 'No waking', detail: 'Nothing in the dream wakes their body. You cannot add drowsiness in there, either.' },
        { tag: 'utility', label: 'How long', detail: 'Their drowsiness keeps burning at 5 a second — the HUD counts it down. At 0 they wake and the dream ends.' },
        { tag: 'utility', label: 'Surfacing', detail: 'E again. Both bodies go back where they were lying; theirs is still asleep.' },
      ],
      notes: [
        'Surfacing to top them up with the pillow and the dagger, then going back in, is the whole rhythm of the element.',
        'Online, both machines dream the same world. In Invasion the dream is laid over the map instead of replacing it, because the walls still matter.',
        'Leeches and walking nightmares stay in the dream when it ends.',
      ],
      upgrade: {
        basics:
          'Lucid Dream: inside their dream a panel of five switches opens across the top of the screen. Click one '
          + 'to turn it on or off; they stay how you left them for the rest of the match. Split puts a seam down '
          + 'the middle of the dream that they cannot cross and you can. Spikes raises seven patches of thorns '
          + 'that rise and sink on their own clocks — 8 damage every half second they stand in a raised one. '
          + 'Empower makes you 20% faster and gives you a 20% chance to dodge any hit. Red Mist lines the edges '
          + 'with a 70px bank of fog that deals 5 every 0.4 seconds they spend in it. Shrink pulls the walls in '
          + 'to 62% of the arena, for both of you. Every switch that is on makes them burn their sleep 25% faster.',
        effects: [
          { tag: 'control', label: 'Split', detail: 'A seam down the middle: they are held on the side they were on, 22px from it. You walk straight through.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'Spikes', detail: '7 patches, 26px, up for about half of every 2.6s: 8 every 0.5s to them while they stand in a raised one.', requiresUpgrade: 'e' },
          { tag: 'buff', label: 'Empower', detail: '+20% move speed and a 20% dodge chance for you, on top of Dreamwalking.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'Red Mist', detail: 'A 70px band along every edge: 5 every 0.4s they spend in it.', requiresUpgrade: 'e' },
          { tag: 'area', label: 'Shrink', detail: 'The dream\'s floor shrinks to 62% of its width and height, round its middle. Both of you are held inside.', requiresUpgrade: 'e' },
          { tag: 'cost', label: 'They wake faster', detail: '+25% sleep burn per switch that is on — all five is 2.25×. The HUD\'s countdown includes it.', requiresUpgrade: 'e' },
        ],
      },
    },

    'dream-pillow-fight': {
      basics:
        'Swing a pillow through a 120° arc out to 90px: 6 damage and +20 drowsiness to everything it '
        + 'catches, or +34 to anybody at 10 drowsiness or less. A sleeper is tucked in rather than hit — '
        + 'no damage at all, so it does not wake them — and still gets the +20. 2.6s cooldown. In a dream '
        + 'it is a claw swipe instead: a 110° rake out to 100px for 30 damage that slows them by 45% for '
        + '2.5 seconds.',
      cast: 'R, toward the cursor. 2.6s cooldown (shorter in a dream).',
      effects: [
        { tag: 'debuff', label: 'Drowsiness', detail: '+20 a swing, +34 against a meter at 10 or less.' },
        { tag: 'damage', label: 'A pillow', detail: '6 to anybody awake. None at all to a sleeper.' },
        { tag: 'area', label: 'Arc', detail: '120° out to 90px.' },
        { tag: 'damage', label: 'Dreaming: Claw Swipe', detail: '30 damage across 110° out to 100px.' },
        { tag: 'debuff', label: 'Dreaming: Clawed', detail: '45% slower for 2.5 seconds.' },
      ],
      notes: [
        'Open with it — the big dose only lands on a fresh meter.',
        'Topping up a sleeper with it is how you buy a longer dream.',
      ],
      upgrade: {
        basics:
          'Unending Comfort: every pillow hit — a tuck-in included — leaves 1 to 3 feathers in them, each for 8 '
          + 'seconds, six at most. While they are feathered, every attack of yours that lands on them adds 1.5 '
          + 'drowsiness per feather (at most once every 0.35 seconds, so a Sandmen spray pays about three times '
          + 'a second). In a dream the claw leaves 1 to 3 scratches instead, each for 8 seconds, six at most: every '
          + 'attack you land on them in there deals 3 more per scratch. Scratches stay in the dream when it ends.',
        effects: [
          { tag: 'debuff', label: 'Feathers', detail: '1–3 per pillow hit, 8s each, up to 6.', requiresUpgrade: 'r' },
          { tag: 'debuff', label: 'Drowsy hits', detail: '+1.5 drowsiness per feather on every attack that lands, at most every 0.35s.', requiresUpgrade: 'r' },
          { tag: 'debuff', label: 'Dreaming: scratches', detail: '1–3 per claw, 8s each, up to 6.', requiresUpgrade: 'r' },
          { tag: 'damage', label: 'Dreaming: open wounds', detail: '+3 damage per scratch on every attack — not on ticking damage like the leech\'s feeding or a nightmare.', requiresUpgrade: 'r' },
        ],
      },
    },

    'dream-sleep-tight': {
      basics:
        'Throw a tiny dagger at 1150px a second, out to 640px. The first enemy it meets takes 8 damage '
        + 'and +16 drowsiness, plus up to 14 more scaled by how sleepy they already were — +30 against a '
        + 'full meter. A sleeper is not stabbed: no damage, so no waking, but the drowsiness still lands. '
        + 'A hit takes half the cooldown off. 6s cooldown. In a dream it is a living leech instead: it flies '
        + 'at 640px a second, bites the first enemy for 22, sticks, and keeps feeding at 3 a second for up '
        + 'to 8 seconds. Walk within 52px of it to pull it out: you heal for everything it ate and get 60% '
        + 'of the remaining cooldown back. A leech that misses lies where it lands for 8 seconds and gives '
        + '40% back when picked up, with no heal.',
      cast: 'F, at the cursor. 6s cooldown, halved on a hit (shorter in a dream).',
      effects: [
        { tag: 'debuff', label: 'Drowsiness', detail: '+16, plus up to +14 more scaled by their current drowsiness.' },
        { tag: 'damage', label: 'Dagger', detail: '8 to anybody awake. None to a sleeper.' },
        { tag: 'utility', label: 'Quick hands', detail: 'A hit takes half the cooldown off.' },
        { tag: 'damage', label: 'Dreaming: Living Leech', detail: '22 on the bite, then 3 a second while it stays in, up to 8 seconds.' },
        { tag: 'heal', label: 'Dreaming: pulling it out', detail: 'Walk within 52px: heal for everything it dealt, and 60% of the remaining cooldown back.' },
      ],
      notes: [
        'The higher their meter, the more it adds — it is the finisher that tips them over.',
        'Online, a pulled leech is relayed so it disappears on the other screen too.',
      ],
      upgrade: {
        basics:
          'Sleeping Pills: the dagger stays in whoever it hits for 4 seconds, dosing them with 6 drowsiness a '
          + 'second — 24 on top of the hit. A fresh dagger in the same body replaces the old one. In a dream the '
          + 'leech bites for 30 instead of 22 and feeds at 5 a second instead of 3; and when it has fed for its '
          + 'full 8 seconds it drops off and lies there for 12 seconds more, still full, and you only have to come '
          + 'within 90px of it to pull it in.',
        effects: [
          { tag: 'debuff', label: 'The pill', detail: '6 drowsiness a second for 4s from a dagger left in them.', requiresUpgrade: 'f' },
          { tag: 'damage', label: 'Dreaming: a hungrier leech', detail: 'Bites for 30, feeds 5 a second.', requiresUpgrade: 'f' },
          { tag: 'heal', label: 'Dreaming: fed full', detail: 'After 8s it drops and waits 12s; walk within 90px (not 52) to pull it out and heal for everything it ate.', requiresUpgrade: 'f' },
        ],
      },
    },

    'dream-nightmare': {
      basics:
        'Needs an enemy within 520px at 50 drowsiness or more (in a dream, the one you are dreaming in). '
        + 'For 3 seconds they are in a nightmare: they can see nothing past about 110px of themselves, '
        + 'they panic (a bot\'s aim shakes by up to 40°, a player\'s screen shudders), they take 5 damage '
        + 'every quarter second — 60 in all — and they take 25% more damage from everything else. It costs '
        + 'them 15 drowsiness. Its own damage never wakes a sleeper. In a dream it also sets a nightmare '
        + 'loose on foot: it lurches toward them in jittery 38px steps for up to 10 seconds, and if it '
        + 'catches them it does the whole nightmare to them again. 16s cooldown.',
      cast: 'Q, on an enemy at 50+ drowsiness. 16s cooldown (shorter in a dream).',
      effects: [
        { tag: 'debuff', label: 'Blind', detail: 'Darkness past ~110px around them for 3 seconds.' },
        { tag: 'damage', label: 'Terror', detail: '5 every 0.25s — 60 over the 3 seconds. Never wakes a sleeper.' },
        { tag: 'debuff', label: 'Vulnerable', detail: '+25% damage taken from everything else while it lasts.' },
        { tag: 'debuff', label: 'Panic', detail: 'A bot\'s aim shakes by up to 40°; a player\'s screen shudders.' },
        { tag: 'cost', label: 'Wakes them a little', detail: '−15 drowsiness — a shorter sleep, or a shorter dream.' },
        { tag: 'summon', label: 'Dreaming: it walks', detail: 'A nightmare that lurches after them in 38px steps for 10s. If it catches them, the whole nightmare again.' },
      ],
      notes: [
        'Out here it costs sleep, so it is best saved for the dream, where the stalker doubles it.',
        'The vulnerability rides with the darkness: anything else that lands in those 3 seconds lands harder.',
      ],
      upgrade: {
        basics:
          'Sleep Paralysis: once Nightmare has taken its 15, their drowsiness cannot go down at all for 5 '
          + 'seconds — it does not wear off and a sleeper does not burn it — and they move 20% slower. The walking '
          + 'nightmare catching them does it again. Used inside a dream, the dream itself becomes a nightmare for '
          + 'those 5 seconds: the same place gone evil — the candy rotted, the clocks bleeding, the sea drowned to '
          + 'bones, something under the bed, the carnival closed for good — framed in red mist.',
        effects: [
          { tag: 'control', label: 'Held still', detail: 'No drowsiness lost for 5s after the 15 is taken — a dream stops running out.', requiresUpgrade: 'q' },
          { tag: 'debuff', label: 'Paralysed', detail: '20% slower for the same 5s.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'The nightmare world', detail: 'Inside a dream the world turns to its evil version for as long as the paralysis holds.', requiresUpgrade: 'q' },
        ],
      },
    },
  },

  mastery: {
    'dream-dreamcatcher': {
      basics:
        'A large dreamcatcher is slung on your back. While you are inside somebody\'s dream, every 0.7 seconds '
        + 'there is a 35% chance they let a dream slip: a small orb that flies to you and is caught in the web. '
        + 'If they are in a nightmare at that moment, the orb is red. A caught dream takes 5 seconds to digest — '
        + 'you can see it swelling in the web — and then pays out: a good (green) dream heals 10, a nightmare '
        + '(red) is +10% damage on everything you do for 10 seconds, stacking up to five.',
      cast: 'Passive. Always on while Dream Mastery is enabled and Dream is the element being played.',
      effects: [
        { tag: 'utility', label: 'Dreams slip out', detail: '35% every 0.7s while you are in their dream — about one every 2 seconds.' },
        { tag: 'heal', label: 'A good dream', detail: 'Heals 10, 5 seconds after it was caught.' },
        { tag: 'buff', label: 'A nightmare', detail: 'Red while they are in a nightmare: +10% damage for 10s, up to +50%.' },
        { tag: 'utility', label: 'Digesting', detail: 'Every caught dream sits in the web for 5 seconds first, even after you surface.' },
      ],
      notes: [
        'Nightmare inside a dream turns the catch red for 3 seconds — that is how the damage is farmed.',
        'The dreamcatcher replaces the mastered moon behind the head; the ring of moons overhead stays.',
      ],
    },
    'dream-music-box': {
      basics:
        'Hold the bound key to wind up a music box — every second wound is 4 seconds of music, up to 20 seconds '
        + 'after a 5-second wind, at which point it throws itself. Let go to lob it to your cursor; it lands '
        + 'about half a second later, opens, and plays a lullaby across 110px: everybody of theirs standing in it '
        + 'gains 4 drowsiness a second. A tap still plays for 2 seconds. Two of your boxes can play at once; a '
        + 'third replaces the oldest. 12 second cooldown from the throw.',
      cast: 'Hold the bound key (R, F or Q), release to throw at the cursor. 12s cooldown.',
      effects: [
        { tag: 'utility', label: 'Winding', detail: '4s of music per second held: 2s at the least, 20s after the full 5s wind, which throws it.' },
        { tag: 'debuff', label: 'Lullaby', detail: '+4 drowsiness a second to every enemy within 110px of the box.' },
        { tag: 'control', label: 'Holding a sleeper', detail: 'A sleeper burns 5 a second — a lullaby over one leaves it burning 1.' },
        { tag: 'cost', label: 'Cooldown', detail: '12 seconds from the throw. Falling asleep while winding drops the box.' },
      ],
      notes: [
        'Somebody whose dream you are in is not here to hear it — it only reaches bodies in the waking world.',
        'A Dream NPC on Nightmare binds it over Sleep Tight, winds it long over a sleeper and short over a drowsy foe.',
      ],
    },
  },
};

export default dream;
