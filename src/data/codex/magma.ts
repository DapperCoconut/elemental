import { ElementCodex } from '../AbilityCodex';

/**
 * Magma — the only element that asks you to aim at your own summons.
 *
 * Verified against `src/elements/magma.ts` and `kits/MagmaKit.ts`. Every figure below is a
 * constant at the top of the kit, and every charge figure is a call into the kit's single `feed`
 * chokepoint.
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
      basics:
        'Volcanoes and eggs both run on a 0–100 pressure gauge that everything in the kit feeds. A pool '
        + 'of yours sitting within 27px of a vessel is worth 16 a second, and a plumed pool lives 6 '
        + 'seconds, so one lob parked on a volcano is 96. A thrown rock is 10 and is consumed doing it, '
        + 'though a rock can never charge the vessel that spat it. The fist is 8 for a slap and 22 for a '
        + 'punch, once per vessel per 500ms. A popped Bloat is 25 to everything of yours inside its 96px '
        + 'burst, and a collapse is 40 to every other vessel inside the 150px blast — a dying volcano can '
        + 'hatch an egg. Dragon breath is 25 a second to anything of yours in the fire. Each feed flashes '
        + 'the vessel white with a spark per whole point, under a gauge 48px wide for a volcano and 62px '
        + 'for an egg.',
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
      basics:
        'A pool is 27px across, spends 0.26 seconds in the air before it lands, lives 6 seconds and '
        + 'burns anything standing in it for 34 damage a second, accumulated fractionally and paid in '
        + 'whole points. Overlap never stacks — burn is the maximum across every pool touching a body, so '
        + 'five pools on one tile is a wider trap and not a hotter one — and stepping out discards '
        + 'whatever part-tick you had rather than banking it. 44 pools may be on the field at once across '
        + 'both sides, with the oldest dropped to make room.',
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
      basics:
        'Throws 5 pools over about 0.42 seconds, spread 0.62 radians either side of the aim (about 71°) '
        + 'and landing 38–118px away, staggered randomly within that band so they cover an area rather '
        + 'than an arc. Each burns for 34 damage a second within 27px for its 6-second life, and charges '
        + 'any vessel it lands on at 16 pressure a second — up to 96 over one pool\'s life. A glob does '
        + 'nothing for the 260ms it is flying and its landing ring grows as it falls, so it can be walked '
        + 'out of. 2s cooldown.',
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
      basics:
        'Plants a 30px cone at the cursor that stands 18 seconds, two per side, with a third cast '
        + 'crumbling the oldest. It vents a pool every 2.6 seconds at zero pressure, tightening linearly '
        + 'to every 0.7s at full, thrown 44–102px from the base. From 35 pressure it also throws rock: a '
        + 'three-spoke burst every 1.5 seconds tightening to every 0.42s, each chunk 12 damage at 215 '
        + 'px/s with a 22px catch and 2.6 seconds of life. At 100 it stops laddering and goes critical, '
        + 'firing a rock every 130ms in a turning spiral for 5 seconds — a warning nobody can miss — then '
        + 'collapses for 60 damage and a 120px shove to everything within 150px, hands 40 pressure to '
        + 'every other vessel in the blast, and leaves 4 fresh pools scattered 30–100px around the '
        + 'crater. 10s cooldown.',
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
      basics:
        'Refuses the next single instance of damage that reaches you entirely, at any size, with no cap '
        + 'and no partial absorb — and bursts for 30 damage to everything within 96px plus a 90px shove, '
        + 'handing 25 pressure to every vessel of yours inside the same radius. The window is 10 seconds '
        + 'and expires quietly with a puff of smoke if nothing hits you, with no refund. 8s cooldown on a '
        + '10s window, so it can very nearly be kept up permanently.',
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

    'magma-jet': {
      basics:
        'A held jet: 12 damage every 0.15s to everything within 175px and 0.42 radians of the cursor, '
        + 'widening slightly with distance, while thrusting you 330 px/s directly away from the cursor — '
        + 'written over your movement rather than added to it, so while the jet is open the jet is how '
        + 'you move. It charges anything of yours in the fire at 26 pressure a second. There are 3 '
        + 'seconds of fuel a cast, drawn down only while F is held, so a tap costs a tenth of a second; '
        + 'the bar top-left is what is left. 12s cooldown.',
      cast: 'F, held. Three seconds of fuel per cast, spent only while the key is down. 12s cooldown.',
      effects: [
        { tag: 'dot', label: 'The cone', detail: '12 damage every 0.15s to everything within 175px and 0.42 radians of the cursor, widening slightly with distance the way a real cone does.' },
        { tag: 'utility', label: 'The thrust', detail: '330 px/s directly away from the cursor, written over your movement rather than added to it — while the jet is open, the jet is how you move.' },
        { tag: 'resource', label: 'Charging', detail: '26 pressure a second to anything of yours in the fire, measured at an 88px sphere halfway down the cone.' },
        { tag: 'utility', label: 'The fuel', detail: '3 seconds total, drawn down only while F is held. A tap costs a tenth of a second; the bar top-left is what is left of it.' },
      ],
      notes: [
        'Pointing it at your own volcano and holding is the fastest charge in the kit — and it walks you backwards out of the fight while you do it, which is usually where you wanted to be anyway.',
        'A wall at your back is not an accident once you have Jet Slam: with F+ the impact brings a dozen rocks down around you.',
        'The thrust is written straight onto the body after movement has resolved, so WASD does nothing while the jet is open. Aim is the steering.',
      ],
    },

    'magma-dragon-kin': {
      basics:
        'Plants a 26px egg that needs 250 pressure to hatch and goes cold after 40 seconds with a "🥚 '
        + 'WENT COLD", one per side, a second cast crumbling the first. Hatched, you get 20 seconds at '
        + '×0.8 damage taken and ×1.2 move speed, and your click becomes Dragon Breath: a 0.9-second cone '
        + 'dealing 14 damage every 180ms to everything within 210px and 0.44 radians of the aim. The '
        + 'breath charges as well, at 25 pressure a second, so a dragon can fill the next volcano just by '
        + 'breathing on it. A bar top-left counts the 20 seconds down, with a "🐉 SPENT" pop-up when it '
        + 'lapses. 55s cooldown.',
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

  mastery: {
    'obsidian-coat': {
      basics:
        'A critical volcano will accept pressure up to 250 past its cap, with or without the '
        + 'Supercritical upgrade — the mastery opens the same door, so the passive is playable on its '
        + 'own. Standing inside the collapse when it lands coats you: the same 150px blast, widened by '
        + '0.9px per point of overfill, so a fat cone is also an easier one to be caught by. The coat is '
        + '15 seconds of ×1.10 damage dealt and ×0.92 taken at its thinnest, rising to ×1.45 and ×0.70 at '
        + '250 overfill — stacking with Dragon Kin\'s ×0.8 and Dragon Scale\'s ×0.75 — and adds 1 extra '
        + 'glob to Plume at the thinnest and 4 at the thickest, so 6 to 9 pools a cast instead of 5. A '
        + 'second collapse refreshes the window and keeps the better of the two coats, so chaining thin '
        + 'ones never builds a thick one.',
      effects: [
        { tag: 'resource', label: 'The gate', detail: 'A critical volcano accepts pressure up to 250 past its cap, with or without the Supercritical (E+) upgrade — the mastery opens the same door, so the passive is playable on its own.' },
        { tag: 'area', label: 'Being caught', detail: 'You have to be inside the collapse when it lands — the same 150px blast, widened by 0.9px per point of overfill, so a fat cone is also an easier one to be standing in.' },
        { tag: 'buff', label: 'Damage dealt', detail: '×1.10 at the thinnest coat, rising to ×1.45 at 250 overfill.' },
        { tag: 'shield', label: 'Damage taken', detail: '×0.92 at the thinnest, down to ×0.70 at 250 overfill. Stacks with Dragon Kin\'s ×0.8 and Dragon Scale\'s ×0.75.' },
        { tag: 'damage', label: 'The click', detail: '1 extra glob on Plume at the thinnest coat and 4 at the thickest — 6 to 9 pools per cast instead of 5, each still 34 a second.' },
        { tag: 'utility', label: 'The window', detail: '15 seconds. A second collapse refreshes it and keeps the better of the two coats — chaining thin ones never builds a thick one.' },
      ],
      notes: [
        'The coat is bought with the same currency as everything else in the kit: your own output, spent on a rock that was already going to explode. Overfilling a cone costs you five seconds of not attacking the person.',
        'Magma Saw is the fastest way to fill one, at 30 pressure a second held against the cone — and it is a melee tool, so sawing your own volcano puts you exactly where you have to be when it goes.',
        'Nothing about the collapse changes: it still does 60 + 0.7 per overfill to enemies, and it still does nothing at all to you. Standing in your own blast has never had a cost, and now it has a reward.',
        'A cone razed by Ruin\'s Spikes of Ruin never collapses, so it never pays a coat either.',
      ],
    },
    'magma-saw': {
      basics:
        'A bindable saw held 34px out along your cursor, revved by holding the key and started on '
        + 'release — a tap runs 2.5 seconds, a full 1.6-second rev runs the full 8. It bites anything '
        + 'within 42px for 1 damage every 0.05s, 20 a second, ramping +1 a bite every 2 seconds to 40, 60 '
        + 'and a capped 80 a second. Held against a vessel of yours it charges at 30 pressure a second, '
        + 'the fastest in the kit and the only thing that can push a critical cone past its cap. At 8 '
        + 'seconds it detonates for 35 damage inside 150px to everyone including you, shoving them 240px '
        + 'against 190px on you back down the line you were cutting, and hands 40 pressure to every '
        + 'vessel in the blast. Pressing the key again at any point cuts the motor instantly with no '
        + 'blast at all. 14s cooldown from the moment the saw starts.',
      cast: 'The bound key, held to rev and released to cut — a tap runs 2.5 seconds, a full 1.6-second rev runs the full 8. Press again at any point to cut the motor. 14 second cooldown, from the moment the saw starts.',
      effects: [
        { tag: 'dot', label: 'The bite', detail: '1 damage every 0.05s — 20 a second — to anything within 42px of the blade, which floats 34px out from you along your cursor.' },
        { tag: 'dot', label: 'The ramp', detail: '+1 per bite every 2 seconds it stays running: 20 a second, then 40, then 60, then 80, capped there.' },
        { tag: 'resource', label: 'Charging', detail: '30 pressure a second into any vessel of yours the blade is held against — the fastest charge in the kit, and the only one that can push a critical cone past its cap.' },
        { tag: 'damage', label: 'The detonation', detail: 'At 8 seconds: 35 damage inside 150px to everyone, you included, and a 240px shove on them against a 190px one on you, back down the line you were cutting.' },
        { tag: 'utility', label: 'Cutting the motor', detail: 'Pressing the key again ends the saw instantly with no blast at all — available from the first frame to the last.' },
        { tag: 'resource', label: 'The blast charges too', detail: '40 pressure to every vessel of yours inside the 150px it goes off in.' },
      ],
      notes: [
        'Total damage on a saw ridden the whole way is 8 seconds of ramp — 40 + 80 + 120 + 160 = 400 into a body that never leaves the blade, plus the 35 at the end. Nobody stands there for eight seconds, which is why the ramp exists: the saw is asking you to chase.',
        'A full rev and a cancelled motor is the strongest line in the kit, and a full rev you forget about is 35 damage and a knockback you gave yourself.',
        'It takes over whichever slot you bind it to outright, including during Full Draconic — bind it over R and the dragon has no scale armour.',
        'Held against your own critical volcano it is the Obsidian Coat engine: 30 a second of overfill, at a range that leaves you standing in the collapse.',
        'The blast damage is self-inflicted, so it will not feed anything that pays out on damage the *opponent* dealt you.',
      ],
    },
  },
};

export default magma;
