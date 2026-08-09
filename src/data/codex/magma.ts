import { ElementCodex } from '../AbilityCodex';

/**
 * Magma — the only element that asks you to aim at your own summons.
 *
 * Verified against `src/elements/magma.ts` and `kits/MagmaKit.ts`. Magma has no shop upgrades, no
 * perks and no mastery enhancements; every figure below is a constant at the top of the kit, and
 * every charge figure is a call into the kit's single `feed` chokepoint.
 */
const magma: ElementCodex = {
  identity:
    'Two of Magma\'s five buttons put a pressure vessel on the floor, and the vessels are charged '
    + 'by Magma\'s own attacks. That inverts the usual question: every other element asks where the '
    + 'enemy is, and Magma also asks where your volcano is — because a pool of lava that lands on '
    + 'it, a rock that hits it or a fist that comes down on it is worth more than the same attack '
    + 'aimed at a person. Two economies run at once: lava on the floor doing ordinary, patient '
    + 'damage, and pressure quietly climbing toward either a collapse that clears the arena or '
    + 'twenty seconds of being a dragon.',

  passives: [
    {
      emoji: '🌡️',
      name: 'Pressure',
      magic:
        'A gauge floats over every vessel you own, and everything you do fills it. This is the '
        + 'element: not a resource you collect off enemies but one you *build*, by spending your own '
        + 'output on a rock on the floor instead of on the person trying to kill you. A vessel you '
        + 'never hit is a slow trickle. A vessel you stand next to and beat on with the fist erupts '
        + 'in seconds.',
      effects: [
        { tag: 'resource', label: 'Lava on it', detail: '16 pressure a second from any pool of yours sitting within 27px of the vessel — and a plumed pool lives 6 seconds, so one lob parked on a volcano is 96.' },
        { tag: 'resource', label: 'Rock into it', detail: '10 pressure per thrown rock, and the rock is consumed doing it. A rock can never charge the vessel that spat it.' },
        { tag: 'resource', label: 'The fist', detail: '8 for a slap, 22 for a punch — once per vessel per 500ms, the same gate a body gets.' },
        { tag: 'resource', label: 'A popped Bloat', detail: '25 to everything of yours inside its 96px burst.' },
        { tag: 'resource', label: 'A collapse', detail: '40 to every other vessel of yours inside the 150px blast. A dying volcano can hatch an egg.' },
        { tag: 'resource', label: 'Dragon breath', detail: '25 a second to anything of yours standing in the fire, measured at a 105px sphere halfway down the cone.' },
        { tag: 'utility', label: 'The tell', detail: 'A white flash over the vessel every time it is fed, a spark for each whole point gained, and the gauge above it — 48px wide for a volcano, 62px for an egg.' },
      ],
      notes: [
        'Every damage source in the kit routes through one function, with the same geometry it used for damage. "All of Magma\'s attacks charge it" is one rule rather than a list of special cases.',
        'A full vessel stops accepting pressure entirely, so overshooting is impossible and anything spent on a topped-out volcano is simply wasted.',
        'Enemies come first for a rock: a chunk that could hit a person *and* charge a vessel always hurts the person.',
      ],
    },
    {
      emoji: '🌋',
      name: 'Lava On The Floor',
      magic:
        'Pools of molten rock with a crust that skins over as they cool — and the skin is the '
        + 'warning, because a pool that looks grey is nearly finished. They are lobbed rather than '
        + 'placed: until one lands it is a glob in the air with a ring on the floor showing where it '
        + 'is going, which is the only reason Plume is not an instant five-pool carpet under '
        + 'somebody\'s feet.',
      effects: [
        { tag: 'dot', label: 'Standing in one', detail: '34 damage a second, accumulated fractionally and paid out in whole points.' },
        { tag: 'area', label: 'The pool', detail: '27px radius, 6 seconds of life, and 0.26 seconds in the air before it lands.' },
        { tag: 'utility', label: 'Overlap does not stack', detail: 'Burn is taken as the maximum across every pool touching a body, never the sum. Five pools on one tile is a wider trap, not a hotter one.' },
        { tag: 'utility', label: 'Stepping out', detail: 'Any part-tick you had accumulated is discarded the moment you leave, rather than banked for the next time you step in.' },
        { tag: 'utility', label: 'The cap', detail: '44 pools on the field at once across both sides. The oldest is dropped to make room.' },
      ],
      notes: [
        'The no-stacking rule is what makes Plume an area-denial button rather than an execute. Aim it to cover ground, not to pile up.',
        'A pool is also a charger. Lobbing the fan across your own volcano is 16 pressure a second per pool for as long as they live.',
      ],
    },
  ],

  abilities: {
    'magma-plume': {
      magic:
        'Five globs of molten rock lobbed out in a fan in front of you, one every eighth of a '
        + 'second, each arcing up and coming down inside a ring that tells whoever is standing there '
        + 'to move. It is deliberately not a carpet: the throw takes about four tenths of a second '
        + 'end to end, and the pools land staggered in distance so they cover ground rather than a '
        + 'line. While hatched this button is not Plume at all — it is dragon breath.',
      cast: 'Click, on the press rather than held. Aimed at the cursor. 2s cooldown.',
      effects: [
        { tag: 'summon', label: 'The fan', detail: '5 pools thrown over about 0.42 seconds, spread 0.62 radians either side of the aim (about 71° in total).' },
        { tag: 'area', label: 'Where they land', detail: '38–118px from you, staggered randomly within that band so five pools cover an area rather than an arc.' },
        { tag: 'dot', label: 'The burn', detail: '34 damage a second to anything standing within 27px of a landed pool, for the pool\'s 6-second life.' },
        { tag: 'resource', label: 'Charging', detail: '16 pressure a second to any vessel of yours a pool is sitting on — worth up to 96 over one pool\'s life.' },
        { tag: 'utility', label: 'In the air', detail: 'A glob does nothing for the 260ms it is flying, and its landing ring grows as it falls, so it can be walked out of.' },
      ],
      notes: [
        'Overlapping pools do not stack their burn, so throwing the fan into a tight cluster is a waste — the value is in the ground it denies.',
        'Aimed across your own volcano this is the cheapest charge in the kit: no cooldown worth mentioning and up to five pools sitting on it.',
        'While Dragon Kin is running, Plume is unavailable entirely. The same ability id covers both because the two can never be up at the same time.',
      ],
    },

    'magma-volcano': {
      magic:
        'A cone of black rock shoved up out of the arena floor with a lit mouth, and it works for '
        + 'you whether you help it or not. Left alone it coughs a pool of lava out every two and a '
        + 'half seconds. Fed, it speeds up, starts throwing chunks of rock, and at a hundred it goes '
        + 'critical: five seconds of firing rock in every direction while the gauge screams, then '
        + 'the whole cone comes down.',
      cast: 'E, placed at the cursor and clamped inside the arena. 10s cooldown. Two at a time — a third cast crumbles the oldest.',
      effects: [
        { tag: 'summon', label: 'The cone', detail: '30px across, 18 seconds of life, up to 2 standing per side.' },
        { tag: 'summon', label: 'Venting lava', detail: 'A pool every 2.6s at zero pressure, tightening linearly to every 0.7s at full — thrown 44–102px from the base.' },
        { tag: 'damage', label: 'Throwing rock', detail: 'From 35 pressure: a three-spoke burst every 1.5s, tightening to every 0.42s at full. Each chunk is 12 damage, 215 px/s, 2.6 seconds of life, 22px catch radius.' },
        { tag: 'resource', label: 'Feeding it', detail: 'Pressure 0–100 from any of your own attacks. The gauge sits 63px above the cone.' },
        { tag: 'cost', label: 'Going critical', detail: 'At 100 it stops laddering and fires one rock every 130ms in a turning spiral for 5 seconds — a warning nobody can miss.' },
        { tag: 'damage', label: 'The collapse', detail: '60 damage and a 120px shove to everything within 150px, plus 40 pressure to every other vessel of yours in the same blast.' },
        { tag: 'summon', label: 'What it leaves', detail: '4 fresh pools scattered 30–100px around the crater, so the ground it was standing on stays hostile for another 6 seconds.' },
      ],
      notes: [
        'A volcano is only a slow trickle if you ignore it. Fed hard it is roughly six seconds from placement to collapse — the ability\'s real cooldown is how fast you can fill it.',
        'The collapse is an attack like any other, which means a dying volcano can top up the second volcano or hatch a dragon egg standing next to it.',
        'The 5-second critical window is the honest part of the deal: everybody gets five seconds and a spiral of rock to decide whether they want to be inside 150px.',
        'It reaches 18 seconds and crumbles for nothing if it never fills, so placing one you have no intention of feeding is a lava dispenser, not an ultimate.',
        'Ruin\'s Spikes of Ruin razes a vessel outright. A razed volcano simply stops existing — it does not top out, so nothing erupts.',
      ],
    },

    'magma-bloat': {
      magic:
        'You swell up, glowing gold at the seams and venting. For ten seconds you are carrying a '
        + 'charge instead of a shield, and it is spent the instant anything touches you: the hit is '
        + 'refused outright — all of it, whatever it was — and the pressure you were holding goes '
        + 'off in a ring around your feet.',
      cast: 'R. Instant, no aim. 8s cooldown on a 10s window, so it can very nearly be kept up permanently.',
      effects: [
        { tag: 'shield', label: 'The block', detail: 'The next single instance of damage that reaches you is refused entirely, at any size. There is no cap and no partial absorb.' },
        { tag: 'damage', label: 'The burst', detail: '30 damage to everything within 96px, plus a 90px shove away from you.' },
        { tag: 'resource', label: 'Charging', detail: '25 pressure to every vessel of yours inside the same 96px.' },
        { tag: 'utility', label: 'The window', detail: '10 seconds. It expires quietly with a puff of smoke if nothing hits you, and the block is not refunded.' },
      ],
      notes: [
        'It intercepts before shields, absorbs and armour, so it is the answer to a single enormous hit rather than to sustained chip damage.',
        'It is also the only defensive ability in the kit, and it is a charging tool — standing on your own egg and taking a hit is 25 free pressure.',
        'The absorber is uninstalled the moment the window ends, rather than left in place returning false, so it can never shadow the next absorber the fighter picks up.',
      ],
    },

    'magma-fist': {
      magic:
        'A giant fist of molten rock on the end of a lava arm, and it goes wherever your cursor '
        + 'goes for eight seconds. It is not a button — it is a limb, and what it does depends '
        + 'entirely on how you move it. Flick it sideways across somebody and it backhands them '
        + 'across the arena; pull it back and drive it straight out along the arm and it punches for '
        + 'more than twice as much. Bring it down on your own volcano and it is the best charger in '
        + 'the kit.',
      cast: 'F. The fist starts at your shoulder and is thrown out to the cursor rather than blinking into place. 8-second window, 15s cooldown.',
      effects: [
        { tag: 'utility', label: 'The limb', detail: '262px of reach, chasing the cursor with a hard follow so a flick survives the lerp. Speed is peak-held with a ~120ms decay, so a flick that peaks a frame before contact still counts.' },
        { tag: 'damage', label: 'Slap', detail: '15 damage and a 190px shove *along the swing* — where the backhand was travelling, not away from you. Needs 520 px/s of fist speed moving across the arm.' },
        { tag: 'damage', label: 'Punch', detail: '35 damage and a 70px shove straight down the arm. Needs 560 px/s and motion at least 55% aligned with the caster→fist axis.' },
        { tag: 'resource', label: 'Charging', detail: '8 pressure per slap, 22 per punch, into any vessel of yours the fist lands on.' },
        { tag: 'utility', label: 'The gate', detail: '500ms per target, and separately 500ms per vessel — one swing cannot machine-gun the same body.' },
        { tag: 'utility', label: 'Spending the swing', detail: 'Anything it connects with zeroes the held speed, so a single sweep never lands twice off one flick.' },
      ],
      notes: [
        'The distinction is measured against the arm, not the screen: pushing *along* the arm is a punch, moving *across* it is a slap. Circling somebody at arm\'s length slaps; winding back and lunging punches.',
        'A gold streak trails the fist while it is above about 364 px/s, which is the only cue that the swing is currently fast enough to land anything at all.',
        'A punch into your own egg is 22 pressure every half second — roughly six seconds of nothing but punching to hatch one from empty, which is why the fist and the Q are cast together.',
        'The 190px slap knock is the longest displacement in the kit and it is aimed by the direction of your flick, which makes it a positioning tool as much as a damage one.',
      ],
    },

    'magma-dragon-kin': {
      magic:
        'A purple-scaled egg laid on the arena floor with two hundred and fifty pressure to find, '
        + 'and it will not fill itself — a volcano at least vents lava while you ignore it, and an '
        + 'egg does nothing at all for forty seconds and then goes cold. Fill it and it splits open '
        + 'and you are the dragon: harder to hurt, faster, and your click is a cone of purple fire.',
      cast: 'Q, placed at the cursor and clamped inside the arena. A second cast crumbles the first egg. Ultimate, 55s cooldown.',
      effects: [
        { tag: 'summon', label: 'The egg', detail: '26px, 250 pressure to hatch, 40 seconds before it goes cold and prints "🥚 WENT COLD". One per side.' },
        { tag: 'buff', label: 'Hatched', detail: '20 seconds. Damage taken ×0.8 and move speed ×1.2.' },
        { tag: 'damage', label: 'Dragon Breath', detail: 'Your click becomes a 0.9-second cone: 14 damage every 180ms to everything within 210px and 0.44 radians of the aim, widening slightly with distance the way a real cone does.' },
        { tag: 'resource', label: 'Breath charges too', detail: '25 pressure a second to anything of yours in the fire — so a dragon can fill the next volcano just by breathing on it.' },
        { tag: 'utility', label: 'The clock', detail: 'A bar top-left of the arena shows the 20 seconds running down, and a "🐉 SPENT" pop-up when it lapses.' },
      ],
      notes: [
        'The whole ultimate is paid for out of your own damage output. 250 pressure is roughly eleven punches, or three volcano collapses, or a very long time spent breathing on nothing.',
        'The egg is the only thing in the kit that can expire having paid out absolutely nothing, which is why the F and the Q are naturally cast together — the fist is the fastest way to fill it.',
        'Plume is gone for the whole 20 seconds. Dragon Breath shares the click slot outright.',
        'A collapsing volcano within 150px of the egg is 40 pressure in one hit, so the two summons are meant to be placed near each other.',
        'Ruin\'s Spikes of Ruin razes an egg like any other summon — and a razed egg never hatches, so the 55-second ultimate is simply gone.',
      ],
    },
  },
};

export default magma;
