import { ElementCodex } from '../AbilityCodex';

/**
 * Dream — a meter, and five ways to work on it.
 *
 * Verified against `src/elements/dream.ts` and `kits/DreamKit.ts`. Dream has no shop upgrades,
 * no perks and no mastery: everything it does is in those two files, and the numbers here are
 * the constants at the top of the kit.
 */
const dream: ElementCodex = {
  identity:
    'The element earned by sparing the Devourer of Kings, and the only one whose whole game is a '
    + 'number on somebody else\'s head. A pendulum hung off your hand makes them sleepy while you '
    + 'pace; a pillow to a sleeping head is the biggest single hit in the kit; a dreamcatcher farms '
    + 'the sleeper for health and cooldown time; and a nightmare makes whatever finally wakes them '
    + 'land twice. Nothing here is fast — but a sleeping opponent is not playing the game at all.',

  passives: [
    {
      emoji: '😴',
      name: 'Sleepiness',
      basics:
        'A 0–100 meter over the target\'s head. Only Trance fills it and Pillow Fight multiplies '
        + 'whatever is already there, and it bleeds off 6 points a second whenever nothing is swinging at '
        + 'them, so a target left alone empties from full in about 17 seconds. At 100 they are asleep for '
        + '8 seconds: velocity forced to zero every frame, stunned and disarmed on a rolling refresh, '
        + 'unable to move or cast. Any damage at all wakes them instantly, and the meter is reset to 0 '
        + 'either way, whether they woke to a hit or slept the full eight. Anything currently unstoppable '
        + 'refuses to sleep — the meter sticks at 99 and prints "☕ WIDE AWAKE".',
      effects: [
        { tag: 'debuff', label: 'The meter', detail: '0–100, shown over the target\'s head. Only Trance fills it; Pillow Fight multiplies whatever is already there.' },
        { tag: 'utility', label: 'Bleeding off', detail: '6 points a second whenever nothing is swinging at them — a target left alone empties from full in about 17 seconds.' },
        { tag: 'control', label: 'Asleep', detail: '8 seconds at 100: velocity forced to zero every frame, stunned and disarmed on a rolling refresh, so they can neither move nor cast.' },
        { tag: 'utility', label: 'Waking up', detail: 'Any damage at all wakes them instantly, and the meter is reset to 0 either way — whether they woke to a hit or slept the full 8 seconds.' },
        { tag: 'utility', label: 'Who cannot be put under', detail: 'Anything currently unstoppable refuses to sleep: the meter sticks at 99 and prints "☕ WIDE AWAKE" instead.' },
      ],
      notes: [
        'The meter is stored per-body, not per-caster, so in a Dream-versus-Dream match both sides are writing into the same number on each other.',
        'Because waking zeroes the meter, every sleep is one use — you cannot bank drowsiness through a nap.',
      ],
    },
    {
      emoji: '✨',
      name: 'Cosmic Cursor',
      basics:
        'Your mouse pointer is a weapon: 5 damage on the frame it enters a 24px hitbox around a '
        + 'fighter. It scores nothing while it stays inside — it has to leave and come back to pay again, '
        + 'with no cooldown other than the leaving. The ring around the pointer is solid while it is '
        + 'clear and hollow-red while it is parked inside somebody and can no longer score. It pays '
        + 'nothing while you are asleep or resting in the Oasis.',
      effects: [
        { tag: 'damage', label: 'Crossing a body', detail: '5 damage on the frame the pointer enters a 24px hitbox around a fighter.' },
        { tag: 'utility', label: 'Once per entry', detail: 'It scores nothing while it stays inside. It has to leave the 24px and come back to pay again — there is no cooldown, only the leaving.' },
        { tag: 'utility', label: 'The tell', detail: 'The ring around the pointer is solid while it is clear and hollow-red while it is parked inside somebody and can no longer score.' },
        { tag: 'cost', label: 'When it stops', detail: 'It pays nothing while you are asleep or resting in the Oasis — the pointer is still drawn, but the hits are switched off.' },
      ],
      notes: [
        'The system cursor is hidden for the whole match and handed back when the scene shuts down.',
        'A Dream NPC gets a stand-in: a drifting eye that is pulled toward you from outside 24px and shoved back out from within, which is the same in-and-out motion a human does by hand.',
      ],
    },
    {
      emoji: '💤',
      name: 'Rest',
      basics:
        '5 HP a second while your body speed is under 6 px/s. It is paid in whole seconds and the count '
        + 'resets the instant you move, so a step-stop-step shuffle collects nothing at all. It is '
        + 'switched off while asleep and inside the Oasis, which is already paying twice as much.',
      effects: [
        { tag: 'heal', label: 'Standing still', detail: '5 HP a second while your body speed is under 6 px/s.' },
        { tag: 'cost', label: 'Paid in whole seconds', detail: 'The count resets to zero the instant you move, so a step-stop-step shuffle collects nothing at all.' },
        { tag: 'utility', label: 'When it is off', detail: 'Not while asleep, and not inside the Oasis — the meadow is already paying twice as much.' },
      ],
      notes: [
        'A still caster is also a caster whose pendulum is dying, which is the whole tension of the element.',
      ],
    },
  ],

  abilities: {
    'dream-trance': {
      basics:
        'A toggle that hangs a 68px pendulum on your hands — real physics under 1600 of gravity with '
        + '0.7 damping, driven by your own acceleration, so standing still lets it die out. A swinging '
        + 'bob makes enemies sleepy at up to 11.3 a second at full swing, scaled by strength to the power '
        + '1.25, across a field that widens from 92px at the faintest useful swing to 176px at full tip '
        + 'speed. Below 6% of full tip speed the field is off entirely — a hanging pendulum is not '
        + 'hypnotism. Winding somebody from empty to 100 at a full swing takes about 9 seconds, so the '
        + 'meter is a plan rather than an opener. 0.8s between toggles.',
      cast: 'Click. A toggle — the pendulum stays out until you click again to still it. 0.8s between toggles.',
      effects: [
        { tag: 'summon', label: 'The pendulum', detail: 'A 68px string on your hands under 1600 of gravity with 0.7 damping, driven by your own acceleration. Standing still lets it die out.' },
        { tag: 'debuff', label: 'Making them sleepy', detail: 'Up to 11.3 sleepiness a second at a full swing, scaled by swing strength to the power 1.25 — so a lazy swing is a nuisance and a hard one is a threat.' },
        { tag: 'area', label: 'The field', detail: '92px at the faintest useful swing, widening to 176px at full tip speed (380 px/s at the bob).' },
        { tag: 'utility', label: 'Too slow to count', detail: 'Below 6% of full tip speed the field is off entirely — a hanging pendulum is not hypnotism.' },
        { tag: 'control', label: 'What it builds to', detail: '100 sleepiness puts them out for 8 seconds. From empty at a full swing that is about 9 seconds of winding — the meter is a plan, not an opener.' },
      ],
      notes: [
        'A Dream NPC cannot feather a keyboard, so its swing is topped up directly at 2.4 a second — it still takes a couple of seconds to get going from a standstill.',
        'Trance is the only thing that fills the meter. Everything else in the kit either multiplies it or spends it.',
        'It costs nothing to leave up, but it only works while you are walking, which is exactly when Rest is paying you nothing.',
      ],
    },

    'dream-pillow-fight': {
      basics:
        'An 86° wedge in the aimed direction reaching 84px, connecting on centres up to 104px away. It '
        + 'deals 10 flat plus up to 60 more scaled by how full their sleep meter is — 70 against anybody '
        + 'fast asleep — and multiplies whatever sleepiness they have left by 1.25, capped at 100, so 60 '
        + 'becomes 75 and 80 becomes 100 and they drop. Above 35% sleepiness the hit prints "SWEET '
        + 'DREAMS" with the number, so you can see when the swing is worth taking. 1.5s cooldown.',
      cast: 'E, aimed at the cursor. Instant swing, 1.5s cooldown.',
      effects: [
        { tag: 'area', label: 'The arc', detail: 'An 86° wedge in the aimed direction, reaching 84px (and connecting on centres up to 104px away).' },
        { tag: 'damage', label: 'The swing', detail: '10 damage flat, plus up to 60 more scaled by how full their sleep meter is — 70 against anybody fast asleep.' },
        { tag: 'debuff', label: 'Compounding', detail: 'Whatever sleepiness they had left is multiplied by 1.25, capped at 100 — 60 becomes 75, 80 becomes 100 and they drop.' },
        { tag: 'utility', label: 'The tell', detail: 'Above 35% sleepiness the hit prints "SWEET DREAMS" with the number, so you can see when the swing is worth taking.' },
      ],
      notes: [
        'Hitting a sleeper wakes them — the pillow is damage like any other — and waking resets the meter to 0, so the ×1.25 has nothing left to multiply. The multiplier is for topping up an awake target, and the 70 is for cashing out a sleeping one.',
        'A swing that connects with nobody still throws feathers, so it reads as a miss rather than a dud.',
      ],
    },

    'dream-dreamcatcher': {
      basics:
        'Drops a hoop at your feet that stands 12 seconds, up to 3 at once, with a fourth cutting the '
        + 'oldest loose. It drains one dream every 2 seconds out of any sleeper of yours at any range, '
        + 'holding up to 5, and every dream taken adds 2 seconds to every one of that sleeper\'s cooldowns '
        + '— a full drain is 10 seconds on their whole kit. Walking within 32px empties it for 10 HP a '
        + 'dream, so a full hoop is 50 HP in one step, and a full hoop pulses a ring to tell you it is '
        + 'worth the walk. 5s cooldown.',
      cast: 'R. Dropped at your feet. 5s cooldown, up to 3 standing at once.',
      effects: [
        { tag: 'summon', label: 'The hoop', detail: '12 seconds on the floor, 3 at once. Placing a fourth cuts the oldest loose, fading it out over 140ms.' },
        { tag: 'resource', label: 'Draining', detail: 'One dream every 2 seconds out of any sleeper of yours, at any range, up to 5 held per hoop.' },
        { tag: 'debuff', label: 'What it costs them', detail: 'Every dream taken adds 2 seconds to every one of the sleeper\'s cooldowns — a full 5-dream drain is 10 seconds on their whole kit.' },
        { tag: 'heal', label: 'Collecting', detail: 'Walking within 32px empties it: 10 HP per dream held, so a full hoop is 50 HP in one step.' },
        { tag: 'utility', label: 'The tell', detail: 'A full hoop pulses a ring around itself — it is telling you it is worth walking to.' },
      ],
      notes: [
        'It only drains while somebody is actually asleep. Placed against a target you never put under, it is twelve seconds of nothing.',
        'The 2 seconds of cooldown is charged when the dream is taken, not when you collect it — so a hoop you never walk to has still cost them the time.',
        'All three hoops drain the same sleeper at once, which is 3 dreams every 2 seconds and 6 seconds of their cooldowns.',
      ],
    },

    'dream-nightmare': {
      basics:
        'Haunts the nearest enemy for 10 seconds at 5 damage a second. Its own ticks are explicitly '
        + 'excluded from the wake check, so it can run its whole duration on a sleeping target — and the '
        + 'hit that finally wakes a nightmare-ridden sleeper is applied a second time at full value, '
        + 'turning a 70-damage pillow into 140. Waking clears the nightmare whether or not the jolt '
        + 'fired; it does not survive to the next sleep. 14s cooldown, refused with "Nobody to haunt" if '
        + 'there is nothing to take.',
      cast: 'F, no aim — it takes the nearest enemy. 14s cooldown. Refuses with "Nobody to haunt" if there is nothing alive to take.',
      effects: [
        { tag: 'dot', label: 'The trickle', detail: '5 damage a second for 10 seconds.' },
        { tag: 'utility', label: 'It will not wake them', detail: 'Its own ticks are explicitly excluded from the wake check, so a nightmare can run for its whole duration on a sleeping target.' },
        { tag: 'damage', label: 'The jolt', detail: 'The hit that wakes a nightmare-ridden sleeper is applied a second time at full value — a 70-damage pillow becomes 140.' },
        { tag: 'utility', label: 'Waking ends it', detail: 'The nightmare is cleared the moment they wake, whether or not the jolt fired. It does not survive to the next sleep.' },
      ],
      notes: [
        'The jolt only exists for a target who is asleep *and* dreaming badly. A nightmare on somebody wide awake is 50 damage over 10 seconds and nothing more.',
        'The proper rotation is Trance to put them under, F while they sleep, and E to wake them for double.',
      ],
    },

    'dream-oasis': {
      basics:
        'Opens a 46×58px tear 78px behind you, away from the cursor, that stands 12 seconds and opens '
        + 'over 0.3s — only you can pass it and nothing else interacts with it. Walk within 40px once it '
        + 'is more than 60% open and it takes you, shutting behind. Inside you heal 10 HP a second for up '
        + 'to 15 seconds, 150 from a full stay, while invincible, invisible and pinned in place: nothing '
        + 'can reach you and you cannot reach anything. It ends early the moment you are back to full '
        + 'health, counting clotted HP, printing "RESTED" instead of "AWAKE". 45s cooldown.',
      cast: 'Q. Opens a doorway 78px behind you, away from the cursor. You have to walk into it. 45s cooldown.',
      effects: [
        { tag: 'summon', label: 'The doorway', detail: 'A 46×58px tear that stands for 12 seconds and opens over 0.3s. Only its owner can pass it; nothing else interacts with it at all.' },
        { tag: 'movement', label: 'Stepping through', detail: 'Walking within 40px of a doorway that is more than 60% open takes you, and the door shuts behind you.' },
        { tag: 'heal', label: 'The meadow', detail: '10 HP a second for up to 15 seconds — 150 HP from a full stay.' },
        { tag: 'shield', label: 'Out of the fight', detail: 'Invincible, invisible and pinned in place for the whole rest. Nothing can reach you and you cannot reach anything.' },
        { tag: 'utility', label: 'Leaving early', detail: 'It ends the moment you are back to full health (counting clotted HP), printing "RESTED" instead of "AWAKE".' },
      ],
      notes: [
        'Stepping through on full health does not throw you straight back out — the early exit only arms once the place has actually healed you something, so it works as a pure 15-second escape.',
        'Your invincibility and invisibility flags are saved on the way in and handed back exactly as they were found, so a Stealthy mutation survives the trip.',
        'The doorway opens away from the cursor, so it is placed by pointing at what you are running from.',
        'A Dream NPC gets a small bubble of the same meadow standing where its portal was, rather than the full-screen view.',
      ],
    },

    // ── Dream Duel (Dream Mastery) ──────────────────────────────────────────
    // The spirit's two keys. They only exist while a duel is running; outside one the tray is
    // the five above and neither of these can be pressed at all.

    'dream-haunt': {
      basics:
        'Only exists inside a Dream Duel. Three bolts along the aim at the moment of the press — they '
        + 'do not re-aim — 500ms apart, so the volley takes a full second to pay out its 5 damage each, '
        + '15 in total. Each is 560 px/s with a 13px head and 1.6 seconds of life. Haunt damage never '
        + 'counts as the hit that wakes a sleeper: the duel is riding on that sleep and its own gun '
        + 'cannot end it. 1.8s cooldown.',
      // Knocked Out is Dream's Click upgrade and belongs to Trance's pendulum, not to this.
      noUpgrade: true,
      cast: 'Click, and only inside a Dream Duel. Fires along the aim at the moment of the press — the three bolts do not re-aim. 1.8s cooldown.',
      effects: [
        { tag: 'damage', label: 'Each bolt', detail: '5 damage, 3 bolts, 15 in total if every one lands.' },
        { tag: 'utility', label: 'The stagger', detail: '500ms between shots, so the volley takes a full second to finish paying out.' },
        { tag: 'area', label: 'The bolt', detail: '560 px/s, a 13px head, and 1.6 seconds of life before it fades.' },
        { tag: 'utility', label: 'It will not wake them', detail: 'Haunt damage never counts as the hit that wakes a sleeper — the duel is riding on that sleep, and its own gun cannot end it.' },
      ],
      notes: [
        'The angle is locked in at the press. Firing and then walking sideways puts all three down the same line, not a fan.',
        'The cooldown is shorter than the volley is long, so a second press mid-volley simply queues another three behind the first.',
      ],
    },

    'dream-spirit-tear': {
      basics:
        'The duel\'s second key. A 26px tear travelling from you along the aim at 86 px/s — slower than '
        + 'anybody walks — for up to 7 seconds, dealing 10 damage and piercing, with a body it has '
        + 'already cut cuttable again after 0.9s. Two 11px moons ride a 46px orbit half a turn apart, '
        + 'going round about once every 2.6 seconds for 5 damage each, giving the whole thing an '
        + 'effective width of about 115px. Like Haunt, its damage is never the hit that ends the sleep. '
        + '4s cooldown.',
      // Pillow Fort is Dream's E upgrade and belongs to Pillow Fight, not to this.
      noUpgrade: true,
      cast: 'E, and only inside a Dream Duel. Travels from you along the aim. 4s cooldown.',
      effects: [
        { tag: 'damage', label: 'The tear', detail: '10 damage, and it pierces — a body it has already cut can be cut again after 0.9s.' },
        { tag: 'damage', label: 'The moons', detail: '5 damage each, two of them, half a turn apart on a 46px orbit that goes round about once every 2.6 seconds.' },
        { tag: 'area', label: 'The shape', detail: '26px head, 11px moons, and an effective width of about 115px counting the orbit.' },
        { tag: 'utility', label: 'How slow', detail: '86 px/s — slower than anybody walks — for up to 7 seconds, or until it leaves the arena.' },
        { tag: 'utility', label: 'It will not wake them', detail: 'Like Haunt, its damage is never the hit that ends the sleep the duel is running on.' },
      ],
      notes: [
        'Because it pierces and re-hits on a timer, standing inside one is worth 10 damage every 0.9 seconds for as long as they fail to leave it.',
        'The leash is 168px and the tear is 115px wide. Fired across the middle of the ring, it takes away most of the room they have to work with.',
      ],
    },
  },

  mastery: {
    'dream-duel': {
      basics:
        'Press Space while standing still, under 8 px/s, with an enemy of yours asleep, and your spirit '
        + 'steps out. The victim is disarmed on a rolling 200ms refresh for the whole duel — not slowed '
        + 'and not stunned, so they can still move, and moving is all they have. You are invincible, '
        + 'because there is nobody in your body to hit, and you cannot be healed at all: Rest, the '
        + 'dreamcatchers and a Good Dream\'s regeneration are all refused while your spirit is out. Both '
        + 'of you are leashed to 168px from the body you left. Calling a duel adds 3 seconds to the sleep '
        + 'it rides, so it runs 11 seconds rather than 8. Your five waking keys are replaced by two — '
        + 'Haunt on Click and Spirit Tear on E — both off cooldown the instant it opens, worth roughly '
        + '90–120 damage across a full duel if most of it lands. Six seconds between duels.',
      cast: 'Space, while standing still (under 8 px/s) with an enemy of yours asleep. Passive — no key to bind, and no cooldown beyond a 6-second wait between duels.',
      effects: [
        { tag: 'control', label: 'They cannot act', detail: 'The victim is disarmed on a rolling 200ms refresh for the whole duel. Not slowed and not stunned — they can still move, and moving is all they have.' },
        { tag: 'shield', label: 'You cannot be hurt', detail: 'Invincible for the whole duel: there is nobody standing in your body to hit.' },
        { tag: 'cost', label: 'You cannot be healed', detail: 'Every heal in the game is refused while your spirit is out — Rest, the dreamcatchers, a Good Dream\'s regeneration, all of it.' },
        { tag: 'control', label: 'The leash', detail: '168px from the body you left, for both of you. Cross it and you are put back on the line.' },
        { tag: 'debuff', label: 'Longer asleep', detail: 'Calling a duel adds 3 seconds to the sleep it is riding — 11 seconds rather than 8, and the duel runs exactly as long as the sleep does.' },
        { tag: 'utility', label: 'A different tray', detail: 'The five waking keys are replaced by two: Haunt on Click and Spirit Tear on E. Both come off cooldown the instant the duel opens.' },
        { tag: 'damage', label: 'What it is worth', detail: 'Up to 15 a volley from Haunt on a 1.8s cooldown, plus 10 a pass from a piercing tear on 4s — call it 90–120 across a full eleven seconds if most of it lands.' },
      ],
      notes: [
        'The duel ends the moment the sleep does, whether that is the clock running out, the victim dying, or something else waking them.',
        'Neither of the spirit\'s two attacks can wake the sleeper. Everything else in the world still can, so a stray husk or a lingering burn will end the duel early.',
        'Space is the dodge key. While a duel is available or running, the roll stands down — one press can never be both.',
        'The bot has no mastery loadout to switch this on with, so a Dream NPC never calls one.',
      ],
    },
    'lifelong-dream': {
      basics:
        'Opens a picker of 48 elements plus a Random row, holding you in place and untouchable while it '
        + 'is open — the fight does not stop, but nothing can reach you in the menu. You have 10 seconds '
        + 'to choose, and every hit you take puts 2 more back on the clock with no ceiling, so somebody '
        + 'landing on you every second can hold it open indefinitely. Choosing grants two to four boons '
        + 'depending on the element: damage, armour, speed and cooldown multiply together, while health, '
        + 'shields and charges are handed over once. The extremes are wide — Fire is an 8/s contact burn, '
        + 'immunity to every tick in the game and +15% crit; Earth is a 25-damage hard cap, an 80 shield '
        + 'and an unshovable body; Justice cannot be taken below 1 health; Light cannot be stunned at '
        + 'all. Nothing expires: a dream that has come true is held until the match ends, and the ability '
        + 'is spent whatever its cooldown says. Type to filter, ENTER takes the top row, ESC dreams at '
        + 'random, and it picks for you after 12 seconds. 40s cooldown and one dream a match.',
      cast: 'The bound key. Opens the picker; type to filter, ENTER takes the top row, ESC dreams at random. It picks for you after 12 seconds. 40s cooldown, and one dream a match.',
      effects: [
        { tag: 'utility', label: 'The picker', detail: '48 elements plus a Random row. You are held in place and untouchable while it is open — the fight does not stop, but nothing can reach you in the menu.' },
        { tag: 'resource', label: 'The counter', detail: '10 seconds. Every hit you take puts 2 more back on it, with no ceiling — somebody landing on you every second can hold it open indefinitely.' },
        { tag: 'buff', label: 'What lands', detail: 'Two to four boons, depending on the element. Damage, armour, speed and cooldown multiply together; health, shields and charges are handed over once.' },
        { tag: 'buff', label: 'The extremes', detail: 'Fire is 8/s contact burn, immunity to every tick in the game and +15% crit. Earth is a 25-damage hard cap, an 80 shield and an unshovable body. Justice cannot be taken below 1 health. Light cannot be stunned at all.' },
        { tag: 'utility', label: 'For the whole match', detail: 'Nothing expires. Once a dream has come true it is held until the match ends — and the ability is spent, whatever its cooldown says.' },
      ],
      notes: [
        'The full table is on the Dream Journal page of this screen: all forty-eight elements, every boon, written out.',
        'A dream that has landed puts a crown of stars over your head — one star per boon — in the chosen element\'s own colour.',
        'The picker is typed into with the same keys you walk with, which is why it holds you still. Escaping is always available and always picks something.',
        'Lifesteal boons pay off damage landing on whoever you are fighting, whatever caused it; thorns pay back a share of what lands on you, at the nearest enemy.',
      ],
    },
  },
};

export default dream;
