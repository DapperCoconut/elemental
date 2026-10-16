import { ElementCodex } from '../AbilityCodex';

/**
 * Magma — the melting pirate who aims at his own volcano.
 *
 * Verified against `src/elements/magma.ts` and `kits/MagmaKit.ts`. Every figure below is a
 * constant at the top of the kit, every charge figure is a call into the kit's single `feed`
 * chokepoint, and every point of damage is a call into its single `strike` chokepoint — which is
 * where Molten Mutiny's pendant takes its fifth.
 */
const magma: ElementCodex = {
  identity:
    'Magma is a buccaneer cooled out of the crust — a round basalt body with the melt still '
    + 'running through its cracks, in a sagging tricorn, an eye patch and a crimson sash, a hook on '
    + 'one hand and an obsidian cutlass in the other. His volcano is a pressure vessel charged by his '
    + 'own attacks, so he asks where his own summon is as much as where the enemy is: a pool that '
    + 'lands on it or a cone fired across it is worth more than the same attack aimed at a person. '
    + 'The other two buttons are the pirate\'s. Blunder-Boil is a blunderbuss of lava whose recoil '
    + 'throws *you*, so aiming and retreating are one press; Molten Mutiny is a cursed pendant that '
    + 'skims a fifth of everything you deal until it has fifty, and then raises a burning ship with '
    + 'six cannons on the click.',

  passives: [
    {
      emoji: '🌡️',
      name: 'Pressure',
      basics:
        'A volcano runs on a 0–100 pressure gauge that everything in the kit feeds. A pool of yours '
        + 'sitting within 27px of it is worth 16 a second, and a plumed pool lives 6 seconds, so one lob '
        + 'parked on a volcano is 96. A thrown rock is 10 and is consumed doing it, though a rock can '
        + 'never charge the volcano that spat it. A Blunder-Boil cone across it is 15, the same as the '
        + 'cone does to a body. A popped Bloat is 25 to every volcano of yours inside its 96px burst, and '
        + 'a collapse is 40 to every other volcano inside the 150px blast — one dying cone can light the '
        + 'next. A cannonball from the ship skips the ladder entirely: a volcano it crosses goes critical '
        + 'on the spot. Each feed flashes the cone white with a spark per whole point, under a 48px gauge.',
      effects: [
        { tag: 'resource', label: 'Lava on it', detail: '16 pressure a second from any pool of yours sitting within 27px of the cone — and a plumed pool lives 6 seconds, so one lob parked on a volcano is 96.' },
        { tag: 'resource', label: 'Rock into it', detail: '10 pressure per thrown rock, and the rock is consumed doing it. A rock can never charge the volcano that spat it.' },
        { tag: 'resource', label: 'A cone across it', detail: 'Blunder-Boil charges whatever of yours stands in its 160px cone for 15 — the same number it does to a body, measured at an 80px sphere halfway down the cone.' },
        { tag: 'resource', label: 'A popped Bloat', detail: '25 to every volcano of yours inside its 96px burst.' },
        { tag: 'resource', label: 'A collapse', detail: '40 to every other volcano of yours inside the 150px blast. One dying cone can take the next one critical.' },
        { tag: 'resource', label: 'A cannonball', detail: 'A round from the ship that crosses a volcano of yours fills it outright — whatever it had, it goes critical now. The round is spent doing it.' },
        { tag: 'utility', label: 'The tell', detail: 'A white flash over the cone every time it is fed, a spark for each whole point gained, and the 48px gauge above it.' },
      ],
      notes: [
        'Every damage source in the kit routes through one function, with the same geometry it used for damage. "All of Magma\'s attacks charge it" is one rule rather than a list of special cases.',
        'A full volcano stops accepting pressure entirely, so overshooting is impossible and anything spent on a topped-out cone is simply wasted — unless Supercritical or the mastery has opened the overfill gate.',
        'Enemies come first for a rock or a cannonball: a shot that could hit a person *and* charge a volcano always hurts the person.',
        'With Molten Mutiny\'s pendant on, a fifth of every one of these numbers goes into the pendant instead of the cone.',
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
        + 'both sides, with the oldest dropped to make room. A pirate spirit\'s trail is the same lava at '
        + '15px and 1.4 seconds.',
      effects: [
        { tag: 'dot', label: 'Standing in one', detail: '34 damage a second, accumulated fractionally and paid out in whole points.' },
        { tag: 'area', label: 'The pool', detail: '27px radius, 6 seconds of life, and 0.26 seconds in the air before it lands. A spirit\'s trail is 15px and 1.4 seconds, landing instantly.' },
        { tag: 'utility', label: 'Overlap does not stack', detail: 'Burn is taken as the maximum across every pool touching a body, never the sum. Five pools on one tile is a wider trap, not a hotter one.' },
        { tag: 'utility', label: 'Stepping out', detail: 'Any part-tick you had accumulated is discarded the moment you leave, rather than banked for the next time you step in.' },
        { tag: 'utility', label: 'The cap', detail: '44 pools on the field at once across both sides. The oldest is dropped to make room.' },
      ],
      notes: [
        'The no-stacking rule is what makes Plume an area-denial button rather than an execute. Aim it to cover ground, not to pile up.',
        'A pool is also a charger. Lobbing the fan across your own volcano is 16 pressure a second per pool for as long as they live.',
      ],
    },
    {
      emoji: '🏴‍☠️',
      name: 'The Buccaneer',
      basics:
        'Magma walks as a sphere of cooled basalt — the `elem-magma` body, 48px across with the melt '
        + 'showing in nine lit seams — wearing a pirate\'s kit: a tricorn going soft in the heat with a '
        + 'skull on the crown, an eye patch over the left eye, a crimson sash slung across the ball to a '
        + 'gold buckle, a beard of six lava drips off the jaw, a peg leg, a hook on the left hand and a '
        + '24px obsidian cutlass in the right. Mastered he is the captain: gold lace on the brim, crossed '
        + 'cutlasses on the crown, a lava plume off the left horn and an earring. With the pendant on, a '
        + 'gold chain and a red gem hang on the chest and the gem brightens with its charge; at the helm '
        + 'the scorch under his feet fades, because the deck is under him.',
      effects: [
        { tag: 'utility', label: 'The body', detail: 'A round basalt ball with the heat inside it — the same material as every object the kit puts on the field.' },
        { tag: 'utility', label: 'The kit', detail: 'Tricorn, eye patch, sash and buckle, lava beard, peg leg, hook, cutlass. All of it hangs off the ball; none of it is a torso.' },
        { tag: 'utility', label: 'The captain', detail: 'Mastered: gold lace on the brim, crossed cutlasses replace the skull, a lava plume, an earring, and wider coronas on both hands.' },
        { tag: 'utility', label: 'The pendant', detail: 'Molten Mutiny hangs a red gem on a gold chain across the chest. It glows brighter the more it has taken, from a dull ember at 0 to a 11px bloom at 50.' },
      ],
      notes: [
        'Nothing here is a stat. It is the read: the same character on the card, in the codex and in the arena, and a pendant you can see filling from across the room.',
      ],
    },
  ],

  abilities: {
    'magma-plume': {
      basics:
        'Throws 5 pools over about 0.42 seconds, spread 0.62 radians either side of the aim (about 71°) '
        + 'and landing 38–118px away, staggered randomly within that band so they cover an area rather '
        + 'than an arc. Each burns for 34 damage a second within 27px for its 6-second life, and charges '
        + 'any volcano it lands on at 16 pressure a second — up to 96 over one pool\'s life. A glob does '
        + 'nothing for the 260ms it is flying and its landing ring grows as it falls, so it can be walked '
        + 'out of. At the helm of the ship this click is the broadside instead. 2s cooldown.',
      cast: 'Click, on the press rather than held. Aimed at the cursor. 2s cooldown. While aboard the ship, the same press fires all six cannons.',
      effects: [
        { tag: 'summon', label: 'The fan', detail: '5 pools thrown over about 0.42 seconds, spread 0.62 radians either side of the aim (about 71° in total).' },
        { tag: 'area', label: 'Where they land', detail: '38–118px from you, staggered randomly within that band so five pools cover an area rather than an arc.' },
        { tag: 'dot', label: 'The burn', detail: '34 damage a second to anything standing within 27px of a landed pool, for the pool\'s 6-second life.' },
        { tag: 'resource', label: 'Charging', detail: '16 pressure a second to any volcano of yours a pool is sitting on — worth up to 96 over one pool\'s life.' },
        { tag: 'utility', label: 'In the air', detail: 'A glob does nothing for the 260ms it is flying, and its landing ring grows as it falls, so it can be walked out of.' },
        { tag: 'damage', label: 'At the helm', detail: 'Aboard the ship, the click is six cannonballs at 430 px/s for 26 apiece and a 170px shove — see Molten Mutiny.' },
      ],
      notes: [
        'Overlapping pools do not stack their burn, so throwing the fan into a tight cluster is a waste — the value is in the ground it denies.',
        'Aimed across your own volcano this is the cheapest charge in the kit: no cooldown worth mentioning and up to five pools sitting on it.',
        'One ability id covers both the fan and the broadside because the two are never available at the same time — the ship owning your click is the point of raising it.',
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
        + 'every other volcano in the blast, and leaves 4 fresh pools scattered 30–100px around the '
        + 'crater. 10s cooldown.',
      cast: 'E, placed at the cursor and clamped inside the arena. 10s cooldown. Two at a time — a third cast crumbles the oldest.',
      effects: [
        { tag: 'summon', label: 'The cone', detail: '30px across, 18 seconds of life, up to 2 standing per side.' },
        { tag: 'summon', label: 'Venting lava', detail: 'A pool every 2.6s at zero pressure, tightening linearly to every 0.7s at full — thrown 44–102px from the base.' },
        { tag: 'damage', label: 'Throwing rock', detail: 'From 35 pressure: a three-spoke burst every 1.5s, tightening to every 0.42s at full. Each chunk is 12 damage, 215 px/s, 2.6 seconds of life, 22px catch radius.' },
        { tag: 'resource', label: 'Feeding it', detail: 'Pressure 0–100 from any of your own attacks. The gauge sits 63px above the cone.' },
        { tag: 'cost', label: 'Going critical', detail: 'At 100 it stops laddering and fires one rock every 130ms in a turning spiral for 5 seconds — a warning nobody can miss.' },
        { tag: 'damage', label: 'The collapse', detail: '60 damage and a 120px shove to everything within 150px, plus 40 pressure to every other volcano of yours in the same blast.' },
        { tag: 'summon', label: 'What it leaves', detail: '4 fresh pools scattered 30–100px around the crater, so the ground it was standing on stays hostile for another 6 seconds.' },
      ],
      notes: [
        'A volcano is only a slow trickle if you ignore it. Fed hard it is roughly six seconds from placement to collapse — the ability\'s real cooldown is how fast you can fill it.',
        'A cannonball from the ship is the fastest fill there is: one round across the cone and it is critical, whatever the gauge read.',
        'The 5-second critical window is the honest part of the deal: everybody gets five seconds and a spiral of rock to decide whether they want to be inside 150px.',
        'It reaches 18 seconds and crumbles for nothing if it never fills, so placing one you have no intention of feeding is a lava dispenser, not an ultimate.',
        'Ruin\'s Spikes of Ruin razes a volcano outright. A razed cone simply stops existing — it does not top out, so nothing erupts.',
      ],
    },

    'magma-bloat': {
      basics:
        'Refuses the next single instance of damage that reaches you entirely, at any size, with no cap '
        + 'and no partial absorb — and bursts for 30 damage to everything within 96px plus a 90px shove, '
        + 'handing 25 pressure to every volcano of yours inside the same radius. The window is 10 seconds '
        + 'and expires quietly with a puff of smoke if nothing hits you, with no refund. 8s cooldown on a '
        + '10s window, so it can very nearly be kept up permanently.',
      cast: 'R. Instant, no aim. 8s cooldown on a 10s window, so it can very nearly be kept up permanently.',
      effects: [
        { tag: 'shield', label: 'The block', detail: 'The next single instance of damage that reaches you is refused entirely, at any size. There is no cap and no partial absorb.' },
        { tag: 'damage', label: 'The burst', detail: '30 damage to everything within 96px, plus a 90px shove away from you.' },
        { tag: 'resource', label: 'Charging', detail: '25 pressure to every volcano of yours inside the same 96px.' },
        { tag: 'utility', label: 'The window', detail: '10 seconds. It expires quietly with a puff of smoke if nothing hits you, and the block is not refunded.' },
      ],
      notes: [
        'It intercepts before shields, absorbs and armour, so it is the answer to a single enormous hit rather than to sustained chip damage.',
        'It is also the only defensive ability in the kit on foot, and it is a charging tool — standing on your own volcano and taking a hit is 25 free pressure.',
        'Aboard the ship the hull takes hits first, so a Bloat cast at the helm waits for you to come down off the deck.',
        'The absorber is uninstalled the moment the window ends, rather than left in place returning false, so it can never shadow the next absorber the fighter picks up.',
      ],
    },

    'magma-blunder': {
      basics:
        'A blunderbuss of lava: 15 damage to everything within 160px and 0.5 radians of the cursor, '
        + 'widening slightly with distance, with a 60px shove — and the recoil throws you 240px the '
        + 'other way over 0.38 seconds, played out as position so nothing can cancel it. The cone charges '
        + 'any volcano of yours standing in it for 15. Two charges, and one charge reloads at a time, '
        + 'each taking 3 seconds; the F card fills with the charges rather than a cooldown. Fired from '
        + 'the ship\'s deck, the recoil takes you over the side and the ship holds where it is. The press '
        + 'itself has a 0.3s cooldown, which only stops a double-tap spending both charges on one frame.',
      cast: 'F, aimed at the cursor. Two charges; one reloads at a time, 3 seconds each. The 0.3s cooldown on the press only prevents a double-tap.',
      effects: [
        { tag: 'damage', label: 'The cone', detail: '15 damage to everything within 160px and 0.5 radians of the cursor, widening slightly with distance the way a real cone does, plus a 60px shove.' },
        { tag: 'utility', label: 'The recoil', detail: 'You are thrown 240px directly away from the cursor over 0.38 seconds, eased out so you are thrown and then skid. Played out as position — nothing cancels it.' },
        { tag: 'resource', label: 'Charging', detail: '15 pressure to any volcano of yours in the cone, measured at an 80px sphere halfway down it.' },
        { tag: 'utility', label: 'The charges', detail: 'Two in the gun. One reloads at a time, 3 seconds each, and the F card shows the charges rather than a cooldown.' },
        { tag: 'utility', label: 'From the deck', detail: 'Fired while aboard the ship, the recoil throws you over the side. The ship stays exactly where it was.' },
      ],
      notes: [
        'Aiming at somebody and getting away from them are the same press. The ability is as much a disengage as an attack, and the second charge is the second step back.',
        'Pointing it at your own volcano is 15 pressure and a retreat in one motion — the cheapest way in the kit to feed a cone you are standing too close to.',
        'With Pressure Gauge (F+) the gun holds three charges, and sitting on a full gun makes the next shot harder — see the upgrade.',
        'The recoil is written as position after movement has resolved, so WASD does nothing for the 0.38 seconds you are airborne.',
      ],
    },

    'magma-mutiny': {
      basics:
        'Dons a cursed red pendant that takes 20% of every point you would deal — to a body or into a '
        + 'volcano — and keeps it, skimmed fractionally so even the saw\'s 1-point ticks pay exactly a '
        + 'fifth. At 50 it wakes the ship under your feet: 300 hull burning down 15 a second on its own, '
        + 'steering toward your cursor at 115 px/s and carrying you with it. Aboard, every hit meant for '
        + 'you lands on the hull instead, enemy projectiles that touch the 36px hull are stopped and '
        + 'paid for out of it, running into somebody while under way is 8 damage and a 110px shove once '
        + 'per 0.7s per victim, and your click is all six cannons: 26 apiece at 430 px/s with a 170px '
        + 'shove, and a round that crosses a volcano of yours sends it critical on the spot. Space takes '
        + 'you over the side; the ship holds where it is, still burning down and still stopping shots. '
        + 'Space within 84px of the hull puts you back at the helm. When the hull runs out it sinks, '
        + 'leaving 4 pools, and you are on your feet. Pressing Q again with the pendant on removes it and '
        + 'discards what it had taken. 8s cooldown.',
      cast: 'Q, instant, no aim. Toggles the pendant on or off; Q is unavailable while the ship is out. Ultimate, 8s cooldown.',
      effects: [
        { tag: 'cost', label: 'The pendant', detail: '20% of every point you would deal — damage to a body and pressure into a volcano alike — goes into the pendant instead, skimmed fractionally so a stream of 1-point ticks still pays exactly a fifth.' },
        { tag: 'summon', label: 'Awakening', detail: 'At 50 taken the pendant is spent and the ship rises under you. 300 hull, burning down 15 a second on its own — 20 seconds if nothing touches it.' },
        { tag: 'utility', label: 'The helm', detail: 'The ship steers toward your cursor at 115 px/s and you ride it. WASD does nothing aboard; the cursor is the wheel.' },
        { tag: 'shield', label: 'The hull', detail: 'Aboard, every hit meant for you lands on the hull instead. Enemy projectiles that touch the 36px hull are stopped and charged to it, mounted or not.' },
        { tag: 'damage', label: 'The broadside', detail: 'The click fires all six cannons at the cursor with a little scatter: 26 apiece at 430 px/s, a 170px shove, 1.5 seconds of flight. A round across a volcano of yours lights it instantly.' },
        { tag: 'damage', label: 'Ramming', detail: 'Under way at 40 px/s or more, anyone the hull runs into takes 8 and a 110px shove, once per 0.7 seconds each.' },
        { tag: 'utility', label: 'Over the side', detail: 'Space dismounts you 50px toward the cursor. The ship holds its position, keeps burning down and keeps stopping shots. Space within 84px of the hull boards again.' },
        { tag: 'summon', label: 'Sinking', detail: 'At 0 hull the ship goes down, leaves 4 pools where it was, and drops you where it stood. Blunder-Boil fired from the deck also puts you over the side.' },
      ],
      notes: [
        'The pendant costs you a fifth of your output for as long as it is on, and a fight is paid for in that currency. Fifty is roughly 250 damage worth of lava, rock and cone — the sooner it goes on, the sooner it pays.',
        'Taking it off discards the charge. The curse keeps its cut: there is no banking a half-filled pendant for later.',
        'The ship is a 20-second clock from the moment it rises. Everything the enemy lands on you shortens it, so the hull is a health bar you are spending to stay in range.',
        'Dismounting is how you keep the hull: a ship nobody is shooting at only loses 15 a second. Park it, fight on foot, and jump back on when you need the cannons.',
        'With Pirate King (Q+) the ship puts crew over the side while it floats — see the upgrade.',
        'Ruin\'s Spikes of Ruin razes the ship like any other summon, dropping you where it stood.',
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
        + '250 overfill, and adds 1 extra glob to Plume at the thinnest and 4 at the thickest, so 6 to 9 '
        + 'pools a cast instead of 5. A second collapse refreshes the window and keeps the better of the '
        + 'two coats, so chaining thin ones never builds a thick one.',
      effects: [
        { tag: 'resource', label: 'The gate', detail: 'A critical volcano accepts pressure up to 250 past its cap, with or without the Supercritical (E+) upgrade — the mastery opens the same door, so the passive is playable on its own.' },
        { tag: 'area', label: 'Being caught', detail: 'You have to be inside the collapse when it lands — the same 150px blast, widened by 0.9px per point of overfill, so a fat cone is also an easier one to be standing in.' },
        { tag: 'buff', label: 'Damage dealt', detail: '×1.10 at the thinnest coat, rising to ×1.45 at 250 overfill.' },
        { tag: 'shield', label: 'Damage taken', detail: '×0.92 at the thinnest, down to ×0.70 at 250 overfill.' },
        { tag: 'damage', label: 'The click', detail: '1 extra glob on Plume at the thinnest coat and 4 at the thickest — 6 to 9 pools per cast instead of 5, each still 34 a second.' },
        { tag: 'utility', label: 'The window', detail: '15 seconds. A second collapse refreshes it and keeps the better of the two coats — chaining thin ones never builds a thick one.' },
      ],
      notes: [
        'The coat is bought with the same currency as everything else in the kit: your own output, spent on a rock that was already going to explode. Overfilling a cone costs you five seconds of not attacking the person.',
        'Magma Saw is the fastest way to fill one, at 30 pressure a second held against the cone — and it is a melee tool, so sawing your own volcano puts you exactly where you have to be when it goes.',
        'A cannonball sends a cone critical instantly but banks no overfill — the five seconds after are still yours to fill.',
        'Nothing about the collapse changes: it still does 60 + 0.7 per overfill to enemies, and it still does nothing at all to you. Standing in your own blast has never had a cost, and now it has a reward.',
        'A cone razed by Ruin\'s Spikes of Ruin never collapses, so it never pays a coat either.',
      ],
    },
    'magma-saw': {
      basics:
        'A bindable saw held 34px out along your cursor, revved by holding the key and started on '
        + 'release — a tap runs 1.25 seconds, a full 1.6-second rev runs the full 4. It bites anything '
        + 'within 42px for 1 damage every 0.05s, 20 a second, ramping +1 a bite every 2 seconds to 40 '
        + 'a second. Held against a volcano of yours it charges at 30 pressure a second, '
        + 'the fastest sustained charge in the kit and the only thing that can push a critical cone past '
        + 'its cap. At 4 seconds it detonates for 35 damage inside 150px to everyone including you, '
        + 'shoving them 240px against 190px on you back down the line you were cutting, and hands 40 '
        + 'pressure to every volcano in the blast. Pressing the key again at any point cuts the motor '
        + 'instantly with no blast at all. 14s cooldown from the moment the saw starts.',
      cast: 'The bound key, held to rev and released to cut — a tap runs 1.25 seconds, a full 1.6-second rev runs the full 4. Press again at any point to cut the motor. 14 second cooldown, from the moment the saw starts.',
      effects: [
        { tag: 'dot', label: 'The bite', detail: '1 damage every 0.05s — 20 a second — to anything within 42px of the blade, which floats 34px out from you along your cursor.' },
        { tag: 'dot', label: 'The ramp', detail: '+1 per bite every 2 seconds it stays running: 20 a second, then 40 for the last two seconds before it blows.' },
        { tag: 'resource', label: 'Charging', detail: '30 pressure a second into any volcano of yours the blade is held against — the fastest sustained charge in the kit, and the only one that can push a critical cone past its cap.' },
        { tag: 'damage', label: 'The detonation', detail: 'At 4 seconds: 35 damage inside 150px to everyone, you included, and a 240px shove on them against a 190px one on you, back down the line you were cutting.' },
        { tag: 'utility', label: 'Cutting the motor', detail: 'Pressing the key again ends the saw instantly with no blast at all — available from the first frame to the last.' },
        { tag: 'resource', label: 'The blast charges too', detail: '40 pressure to every volcano of yours inside the 150px it goes off in.' },
      ],
      notes: [
        'Total damage on a saw ridden the whole way is 4 seconds of ramp — 40 + 80 = 120 into a body that never leaves the blade, plus the 35 at the end. Nobody stands there for four seconds, which is why the ramp exists: the saw is asking you to chase.',
        'A full rev and a cancelled motor is the strongest line in the kit, and a full rev you forget about is 35 damage and a knockback you gave yourself.',
        'It takes over whichever slot you bind it to outright — bind it over F and there is no Blunder-Boil, bind it over Q and there is no pendant.',
        'Held against your own critical volcano it is the Obsidian Coat engine: 30 a second of overfill, at a range that leaves you standing in the collapse.',
        'With the pendant on, every one of its 1-point ticks still pays the fifth — one bite in five goes to the gem instead of the body.',
        'The blast damage is self-inflicted, so it will not feed anything that pays out on damage the *opponent* dealt you.',
      ],
    },
  },
};

export default magma;
