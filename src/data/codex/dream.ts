import { ElementCodex } from '../AbilityCodex';

/**
 * Dream — the sandman with two little guns.
 *
 * Verified against `src/elements/dream.ts` and `kits/DreamKit.ts`; the numbers are the
 * constants at the top of the kit. Dream has no shop upgrades and no mastery right now — the
 * old ones went with the 2026-10-17 rework and new ones are owed.
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
    },
  },
};

export default dream;
