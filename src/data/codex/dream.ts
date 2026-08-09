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
      magic:
        'Everybody Dream is working on carries a small meter over their head. It fills while a '
        + 'pendulum is swinging at them and drains the moment it stops, and when it tops out they '
        + 'lie down on the spot — no walking, no abilities, for eight seconds. It is the axis the '
        + 'entire element turns on, and every other button is either filling it or spending it.',
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
      magic:
        'Your mouse pointer is gone. In its place is a small piece of night sky — a nebula with '
        + 'stars turning inside it and a pale arrowhead trailing off it — and it is a weapon. '
        + 'Dragging it across somebody costs them health, but only on the crossing: park it on '
        + 'them and it goes hollow and stops paying. The damage is in the flicking.',
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
      magic:
        'Standing perfectly still hands health back, a whole second at a time, with a ring of '
        + 'stars turning under your feet. It is the exact opposite of the pendulum, which only '
        + 'swings while you pace — so every second of a Dream fight is a decision about whether '
        + 'this one is for pressure or for repair.',
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
      magic:
        'A weight on a short string, hung off your hand and left there. It is a real pendulum — '
        + 'it hangs dead until you move, and it is your own footwork that drives it, so walking '
        + 'left and right on the beat winds it up into a wide, fast arc. The faster the bob is '
        + 'travelling the further its drowsy field reaches and the harder it pulls everybody in '
        + 'it toward sleep.',
      cast: 'Click. A toggle — the pendulum stays out until you click again to still it. 0.8s between toggles.',
      effects: [
        { tag: 'summon', label: 'The pendulum', detail: 'A 68px string on your hands under 1600 of gravity with 0.7 damping, driven by your own acceleration. Standing still lets it die out.' },
        { tag: 'debuff', label: 'Making them sleepy', detail: 'Up to 34 sleepiness a second at a full swing, scaled by swing strength to the power 1.25 — so a lazy swing is a nuisance and a hard one is a threat.' },
        { tag: 'area', label: 'The field', detail: '92px at the faintest useful swing, widening to 176px at full tip speed (380 px/s at the bob).' },
        { tag: 'utility', label: 'Too slow to count', detail: 'Below 6% of full tip speed the field is off entirely — a hanging pendulum is not hypnotism.' },
        { tag: 'control', label: 'What it builds to', detail: '100 sleepiness puts them out for 8 seconds. From empty at a full swing that is about 3 seconds of pacing.' },
      ],
      notes: [
        'A Dream NPC cannot feather a keyboard, so its swing is topped up directly at 2.4 a second — it still takes a couple of seconds to get going from a standstill.',
        'Trance is the only thing that fills the meter. Everything else in the kit either multiplies it or spends it.',
        'It costs nothing to leave up, but it only works while you are walking, which is exactly when Rest is paying you nothing.',
      ],
    },

    'dream-pillow-fight': {
      magic:
        'A pillow, swung in a wide arc in front of you, feathers everywhere. Against somebody '
        + 'awake it is almost a joke. Against somebody who has just gone under it is the heaviest '
        + 'single hit in the element — the whole meter is cashed straight into the number.',
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
      magic:
        'A hoop of web laid on the floor, and it is a farm. While anybody you have put under is '
        + 'lying down anywhere on the map, a thread runs from them to the hoop with beads of dream '
        + 'travelling along it — and every dream torn out is health for you and time added to '
        + 'everything they know how to do. It holds five, and it does not deliver: you have to go '
        + 'and stand on it.',
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
      magic:
        'Something only they can see. A heart trace appears over their head and stays for ten '
        + 'seconds, costing them a slow trickle the whole way — but the trickle is deliberately '
        + 'gentle, because a nightmare is not an alarm clock. What it is really doing is arming '
        + 'the wake-up: whatever finally tears them out of it hits them a second time.',
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
      magic:
        'A doorway torn open in the air behind you, and only you can go through it. On the other '
        + 'side is somewhere else entirely: a meadow at dawn under a waterfall, which takes over '
        + 'the whole screen. You are not in the fight while you are there — not visible, not '
        + 'targetable, not moving — and the place hands health back until you are whole.',
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
  },
};

export default dream;
