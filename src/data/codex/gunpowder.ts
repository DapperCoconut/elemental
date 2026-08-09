import { ElementCodex } from '../AbilityCodex';

/**
 * Gunpowder — a musket, a pile of guns, and a hoover.
 *
 * Verified against `src/elements/gunpowder.ts`, `kits/GunpowderKit.ts`, the gunpowder block of
 * `data/Upgrades.ts`, the Corruption and Demon perks in `data/Perks.ts` and Gunpowder Mastery
 * in `data/Mastery.ts`. Numbers here are the ones the kit actually applies.
 */
const gunpowder: ElementCodex = {
  identity:
    'Black powder and an inventory problem. The click is a genuinely heavy musket with three shots '
    + 'and a reload that means walking back to where you dropped them; the rest of the kit is an '
    + 'arsenal you assemble out of thirteen guns and fire all at once. Half of those guns come with '
    + 'a drawback attached, so building the loadout is most of playing the element.',

  passives: [
    {
      emoji: '🔫',
      name: 'Three Muskets',
      magic:
        'You carry three, and each one you fire is thrown down behind you glowing red. It lies '
        + 'there cooling for twelve seconds and then it is yours again if you go and stand on it. '
        + 'Reloading is not a button — it is a walk back across ground you have already been '
        + 'shooting over.',
      effects: [
        { tag: 'resource', label: 'Ammunition', detail: '3 muskets. A click with none left prints "Empty!" and does nothing at all.' },
        { tag: 'summon', label: 'Where they land', detail: 'The spent musket drops 68px directly behind the caster, hot and unusable.' },
        { tag: 'utility', label: 'Cooling', detail: '12 seconds of cooling before it can be picked back up, modified by any weapon in the arsenal that changes cooling rate.' },
        { tag: 'utility', label: 'Picking up', detail: 'Walking over a cooled musket returns it to the count. Nothing else recovers ammunition.' },
      ],
      notes: [
        'Several arsenal weapons change the cooling clock: Flamethrower is 20% slower per copy, Minigun 35% slower per copy, and Freeze-Ray 20% faster per copy.',
        'With the Click+ Attached Bayonet upgrade the spent musket is hurled at the cursor rather than dropped behind you, so reloading is a walk *forward* instead.',
      ],
    },
    {
      emoji: '🎒',
      name: 'The Arsenal',
      magic:
        'A row of slots at the bottom of the screen, each one a gun you chose. Fire at Will '
        + 'discharges every one of them in the same instant, so the ability is worth exactly what '
        + 'the shopping was — and several of the guns carry a running cost for simply being in the '
        + 'bag.',
      effects: [
        { tag: 'resource', label: 'Capacity', detail: '3 slots, raised to 6 by the R+ Expanded Arsenal upgrade.' },
        { tag: 'buff', label: 'Passive effects', detail: 'Pistol −10% Fire at Will cooldown per copy; Rifle +25% Musket Shot damage per copy; RPG +20% Fire at Will cooldown per copy; Freeze-Ray muskets cool 20% faster per copy; Flamethrower 20% slower, Minigun 35% slower.' },
        { tag: 'utility', label: 'Discarding', detail: 'Right-clicking a slot removes that weapon. With R+ it instead misfires — it fires one last time on your next Fire at Will and is then removed.' },
        { tag: 'utility', label: 'The offer', detail: 'Arsenal Expansion offers 3 at random from 6 base weapons, or from all 13 with the F+ Weapons Depot upgrade.' },
      ],
      notes: [
        'Collecting all 13 weapon types at least once is the mastery\'s Gun Collector requirement, and the 7 exotics need F+ to ever be offered.',
        'Filling all 6 slots is the Fully Loaded requirement — 5 times — and needs R+.',
      ],
    },
  ],

  abilities: {
    'gunpowder-musket-shot': {
      magic:
        'A real musket: torn flame out of the muzzle, a hard crack, a cloud of smoke that hangs '
        + 'long after the ball has gone, and the gun thrown away behind you because there is no '
        + 'reloading it in this fight. The single biggest per-shot number in the element, and only '
        + 'three of them before you have to go and collect.',
      cast: 'Click, aimed at the cursor. Instant. Spends one musket.',
      effects: [
        { tag: 'damage', label: 'The ball', detail: '35 damage, +25% per Rifle in your arsenal — 43 with one, 52 with two, 61 with three.' },
        { tag: 'utility', label: 'Flight', detail: '900 px/s in a straight line, the fastest projectile in the kit.' },
        { tag: 'cost', label: 'A gun per shot', detail: 'Each cast drops a musket 68px behind you, hot for 12 seconds. Three shots and you are unarmed.' },
        { tag: 'utility', label: 'Availability', detail: '0.35s cooldown, so all three can be spent in about a second.' },
      ],
      upgrade: {
        magic:
          'Attached Bayonet turns the spent gun into a second weapon. It is not dropped — it is '
          + 'thrown, blade first, at whatever you were aiming at, and where it lands it stays as a '
          + 'stake in the floor that keeps cutting anybody who walks over it.',
        effects: [
          { tag: 'damage', label: 'Thrown', detail: '10 damage to anybody it passes through on its way to the cursor, at 640 px/s. The musket ball still fires as normal alongside it.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'On the ground', detail: '10 damage to anybody within 26px of a grounded bayonet, on a 1-second internal cooldown, for as long as it lies there.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'Reloading forward', detail: 'The gun lands where you were aiming instead of behind you, so collecting it means advancing rather than retreating.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'Landing musket balls is the mastery\'s Dead Eye requirement — 50 hits.',
        'A click with a swallowed BlunderBlast hoard armed coughs the hoard out instead: it spends no ammunition and drops no musket.',
      ],
    },

    'gunpowder-explosive-retreat': {
      magic:
        'A charge set off at arm\'s length and used as a door. The blast goes in front of you and '
        + 'the recoil throws you the other way at speed, leaving a bank of smoke in the gap. You '
        + 'are untouchable for the fifth of a second you are in the air.',
      cast: 'E, aimed. The blast is 65px along the aim; you go the opposite way.',
      effects: [
        { tag: 'damage', label: 'The blast', detail: '20 damage in a 45px radius, 65px in front of you along the aim.' },
        { tag: 'movement', label: 'The recoil', detail: '620 of velocity directly backwards, cut off after 220ms.' },
        { tag: 'shield', label: 'Invincible in flight', detail: 'Fully invincible and counted as dodging for the whole 220ms of the launch.' },
        { tag: 'utility', label: 'Availability', detail: '7s cooldown, with a 130ms camera shake.' },
      ],
      upgrade: {
        magic:
          'Double Barrel sets off the second charge behind you as well. The retreat becomes a '
          + 'pincer — anybody who was chasing you into the gap is blown out of it, and anybody in '
          + 'front is still eating the front blast.',
        effects: [
          { tag: 'damage', label: 'Rear blast', detail: 'A second 20 damage in a 45px radius, 65px behind you — where you are about to land.', requiresUpgrade: 'e' },
          { tag: 'control', label: 'Rear knockback', detail: 'Anybody caught within 45px of the rear blast is thrown 300 velocity further along your escape line.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Same escape', detail: 'The 620 launch and the 220ms of invincibility are unchanged. The upgrade is pure extra damage on the landing zone.', requiresUpgrade: 'e' },
        ],
      },
    },

    'gunpowder-fire-at-will': {
      magic:
        'Every barrel you are carrying, at the same time, at the same point. The smoke and the '
        + 'camera shake scale with how many guns are in the bag, and what it actually does depends '
        + 'entirely on which ones you took.',
      cast: 'R, aimed. Instant. Refuses with an empty arsenal.',
      effects: [
        { tag: 'damage', label: 'Everything at once', detail: 'Each of your up-to-3 weapons (6 with R+) fires its own shot along the aim simultaneously — anything from 3 damage to well over 60, entirely depending on what you took.' },
        { tag: 'buff', label: 'Pistols shorten it', detail: 'Each Pistol in the arsenal refunds 10% of the 9s cooldown when the volley fires — 0.9s apiece.' },
        { tag: 'cost', label: 'RPGs lengthen it', detail: 'Each RPG adds 20% of the base cooldown — 1.8s apiece — on top.' },
        { tag: 'shield', label: 'Gunblade cover', detail: 'A Gunblade anywhere in the arsenal grants 20% damage reduction for 2 seconds after every volley.' },
        { tag: 'utility', label: 'Snipers skip', detail: 'A Sniper only fires on every other volley. A freshly taken one fires immediately, then sits out the next.' },
        { tag: 'utility', label: 'Availability', detail: '9s base cooldown, before pistol and RPG adjustments.' },
      ],
      variants: {
        label: 'The thirteen weapons — six are always offered, the other seven need the F+ Weapons Depot upgrade',
        variants: [
          { emoji: '🔫', name: 'Pistol', description: 'Hitscan, 10 damage. Each copy takes 10% off the Fire at Will cooldown.' },
          { emoji: '💥', name: 'AR', description: '3 hitscan shots in quick succession, 6 damage each — 18 in total.' },
          { emoji: '💨', name: 'Shotgun', description: 'A cone of 10 pellets at 2 damage each, short range only.' },
          { emoji: '🎯', name: 'Rifle', description: 'A large hitscan shot for 15. Each copy adds 25% to Musket Shot damage.' },
          { emoji: '💣', name: 'Grenade Launcher', description: 'Lobs a grenade that explodes after a short fuse.' },
          { emoji: '🔥', name: 'Machine Gun', description: '20 hitscan shots at 2 damage each, with up to 10° of inaccuracy.' },
          { emoji: '🧯', name: 'Flamethrower', description: '10 flame clouds at 3 damage each, fading after 3s or on contact. Each copy makes muskets cool 20% slower.', requiresUpgrade: 'f' },
          { emoji: '🚀', name: 'RPG', description: 'An explosive rocket for 20 damage in a large area. Each copy adds 20% to the Fire at Will cooldown.', requiresUpgrade: 'f' },
          { emoji: '🌪️', name: 'Minigun', description: '30 hitscan shots at 2 damage each. Slows you 50% while it fires, and each copy makes muskets cool 35% slower.', requiresUpgrade: 'f' },
          { emoji: '🔭', name: 'Sniper', description: 'Hitscan, 20 damage — but it only fires every other Fire at Will. A red slot means it will skip the next one.', requiresUpgrade: 'f' },
          { emoji: '🟢', name: 'Ray-Gun', description: 'A bouncing, piercing bullet for 5 damage plus knockback, good for up to 3 hits before it burns out.', requiresUpgrade: 'f' },
          { emoji: '❄️', name: 'Freeze-Ray', description: 'Hitscan, 3 damage plus a 1-second stun. Each copy makes muskets cool 20% faster.', requiresUpgrade: 'f' },
          { emoji: '⚔️', name: 'Gunblade', description: 'A long shot for 10, or a point-blank slash for 15. Grants 20% damage reduction for 2s after firing.', requiresUpgrade: 'f' },
        ],
      },
      upgrade: {
        magic:
          'Expanded Arsenal doubles the bag and changes what throwing a gun away means. A discarded '
          + 'weapon does not simply vanish — it misfires: it goes off one last time on the next '
          + 'volley and only then leaves.',
        effects: [
          { tag: 'resource', label: 'Six slots', detail: 'Arsenal capacity rises from 3 to 6, so a full Fire at Will is six weapons rather than three.', requiresUpgrade: 'r' },
          { tag: 'damage', label: 'Misfire', detail: 'Right-clicking a slot marks it for removal instead of deleting it. It fires 1 last time on the next Fire at Will, at its full damage, and is removed afterwards.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Worse drawbacks too', detail: 'Six slots means six copies of whatever running cost you took — three Miniguns is muskets cooling more than twice as slowly.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'With the Demon perk a demon rises behind you and echoes the entire volley 0.6s later as homing hellfire at 60% damage — and below 35% HP it fires a third volley for free.',
      ],
    },

    'gunpowder-arsenal-expansion': {
      magic:
        'The shop, opened mid-fight. Three guns are laid out and you take one. There is no cost and '
        + 'almost no cooldown — the entire limitation is that the bag has a size and half the things '
        + 'in it make some other part of your kit worse.',
      cast: 'F. Opens a three-option menu; picking one closes it. Refuses outright with a full arsenal.',
      effects: [
        { tag: 'utility', label: 'The offer', detail: '3 weapons drawn at random from the pool, with no repeats within the offer.' },
        { tag: 'utility', label: 'The pool', detail: '6 base weapons: Pistol, AR, Shotgun, Rifle, Grenade Launcher, Machine Gun. With F+ the 7 exotics are in the pool as well.' },
        { tag: 'cost', label: 'Full means full', detail: 'With every slot occupied the cast is refused and the cooldown is refunded. You must right-click a weapon out first.' },
        { tag: 'utility', label: 'Availability', detail: '1.5s cooldown, refunded on both the refusal and the pick — the ability is effectively free.' },
      ],
      upgrade: {
        magic:
          'Weapons Depot opens the back room. Seven more guns join the pool, and every one of them '
          + 'is stranger and more lopsided than anything in the base six — a flamethrower that '
          + 'stops your muskets cooling, a minigun that roots you, a freeze ray that barely hurts '
          + 'and stuns anyway.',
        effects: [
          { tag: 'utility', label: 'Seven exotics', detail: 'Flamethrower, RPG, Minigun, Sniper, Ray-Gun, Freeze-Ray and Gunblade join the offer pool — 13 possible weapons instead of 6.', requiresUpgrade: 'f' },
          { tag: 'cost', label: 'Each with a drawback', detail: 'Every exotic carries a running cost while it is in the bag: slower musket cooling, a longer Fire at Will, a slow while firing, or a skipped volley.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'Dilutes the base six', detail: 'The offer is drawn from all 13, so a specific base weapon becomes markedly rarer to be shown.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'The NPC version takes a random base weapon without a menu — it never sees the exotics.',
        'Taking a weapon type for the first time is what counts toward Gun Collector; taking a second Pistol adds nothing to it.',
      ],
    },

    'gunpowder-blunderblast': {
      magic:
        'The bell of the blunderbuss opened wide and turned into a hoover. A silver cone hangs in '
        + 'front of you for five seconds and swallows anything the other fighter has in the air '
        + 'inside it. When the cone closes, the hoard stays loaded — and the next time you pull the '
        + 'trigger you cough all of it back out in a fan, twice as hard as it arrived.',
      cast: 'Q. The cone follows the cursor live for its whole 5 seconds; you keep moving and shooting.',
      effects: [
        { tag: 'shield', label: 'The cone', detail: '180px reach, a 30° cone, following your aim for 5 seconds. Enemy projectiles inside it are destroyed and banked.' },
        { tag: 'resource', label: 'The hoard', detail: 'Up to 30 projectiles banked. Each remembers the texture and damage of the shot it swallowed.' },
        { tag: 'damage', label: 'Coughed back out', detail: 'Your next Musket Shot fires the whole hoard in a 30° fan instead, each at 200% of its original damage. It costs no ammunition and drops no musket.' },
        { tag: 'utility', label: 'Availability', detail: '20s cooldown. The hoard stays armed indefinitely once the cone has closed — the shot is on your schedule.' },
      ],
      upgrade: {
        magic:
          'Vortex Cannon opens the bell wider and lights what comes back out. The cone is bigger in '
          + 'every direction and the returned hoard is on fire — it burns whoever it hits and each '
          + 'bullet bursts into flame where it lands.',
        effects: [
          { tag: 'area', label: 'A bigger mouth', detail: '240px reach and a 45° cone instead of 180px and 30° — most of the frontal arc.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Hotter return', detail: '225% of the original damage per bullet instead of 200%.', requiresUpgrade: 'q' },
          { tag: 'dot', label: 'On fire', detail: 'Every returned bullet sets its target burning for 3 seconds and bursts for 5 damage in a 55px fire area on impact.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Swallowed shots are the mastery\'s Hoover requirement — 200 of them.',
        'The cone only eats the *opponent\'s* projectiles, and never healing shots.',
        'A full 30-bullet hoard fired back at double damage is comfortably the largest single burst in the element — and it is entirely made of somebody else\'s ammunition.',
      ],
    },
  },

  perks: {
    corruption: {
      magic:
        'The powder has gone off. Every musket ball leaves rot in the wound, and every gun you '
        + 'throw down festers where it lies — so the ground behind you stops being litter and '
        + 'starts being a hazard.',
      effects: [
        { tag: 'dot', label: 'Rot', detail: '3 damage per second for 5 seconds from a musket hit, stacking up to 3 — 9 a second at full stacks.' },
        { tag: 'dot', label: 'Festering guns', detail: 'A dropped hot musket poisons any enemy who walks within 40px of it, once a second, for as long as it is cooling.' },
        { tag: 'utility', label: 'Refreshes', detail: 'Each new musket hit refreshes the full 5-second duration as well as adding a stack.' },
      ],
      notes: [
        'The perk\'s ingredients are acid, fate and sound.',
      ],
    },
    demon: {
      magic:
        'Something stands up behind you when you fire everything, and does it again. The echo is '
        + 'hellfire rather than lead — the rounds curve after their target instead of flying '
        + 'straight — and the closer you are to dying the more of it there is.',
      cast: 'No key. Triggers automatically on every Fire at Will.',
      effects: [
        { tag: 'damage', label: 'The echo', detail: 'The whole volley repeated 0.6s later at 60% damage, as homing hellfire rounds — 24 base damage each at 620 px/s.' },
        { tag: 'utility', label: 'Homing', detail: 'Echo rounds steer at 3.4 rad/s toward their target and live 2.6 seconds, connecting within 22px.' },
        { tag: 'buff', label: 'Third volley', detail: 'Below 35% HP the demon fires a third volley for free, on top of the original and the echo.' },
      ],
      notes: [
        'The echo fires at least 2 rounds even from a one-weapon arsenal.',
        'The perk\'s ingredients are fate, sound and light.',
      ],
    },
  },

  mastery: {
    fireworks: {
      magic:
        'Scraping along the wall plants something on it. A second later it screams straight across '
        + 'the arena at head height — and whether it finds somebody or not, it goes off. It is the '
        + 'only reward in the game for fighting with your back to the edge.',
      effects: [
        { tag: 'summon', label: 'Planting', detail: 'Touching the arena edge plants a firework on the wall behind you, at most one every 0.5 seconds and never within 48px of another.' },
        { tag: 'damage', label: 'The run', detail: 'After a 1-second fuse it crosses the arena at 780 px/s, dealing 10 damage to anybody within 14px of it.' },
        { tag: 'damage', label: 'The burst', detail: 'A further 10 damage in a 74px area where it stops — on impact, or against the far wall if it hits nothing. Whoever it ran into is spared the burst.' },
        { tag: 'utility', label: 'Always on', detail: 'No key, no cooldown of its own, no cost. It is a consequence of where you are standing.' },
      ],
      notes: [
        'This is the passive half of Gunpowder Mastery — it needs no bind and no key.',
        'Because the burst spares the fighter it hit, a firework that connects is worth 10 and one that misses is worth 10 in an area — the ability is oddly indifferent to aim.',
      ],
    },
    overload: {
      magic:
        'Every gun you have thrown away is still loaded. They swivel round on the floor, take aim '
        + 'for two seconds with a red line each, and then all of them fire at once. What it costs '
        + 'is your reload: they come back to full heat with three extra seconds on top, and they '
        + 'come out scalding enough to burn you for standing on them.',
      cast:
        'Bindable to E, R, F or Q, replacing that slot\'s base ability for the match. Fires from '
        + 'every musket on the floor at once.',
      effects: [
        { tag: 'damage', label: 'The volley', detail: '15 damage per musket lying on the floor, all fired simultaneously after a 2-second aim. Three spent muskets is 45.' },
        { tag: 'cost', label: 'Reset heat', detail: 'Every musket that fired is returned to full heat plus 3 extra seconds — 15 seconds before it can be picked back up.' },
        { tag: 'cost', label: 'Scalding', detail: '20 damage to *you* for standing within 30px of one of your own overloaded muskets, at most once a second per musket.' },
        { tag: 'utility', label: 'Availability', detail: '16s cooldown, independent of whichever slot it is bound over.' },
      ],
      notes: [
        'It does nothing at all with no muskets on the floor, so it is cast after emptying rather than before.',
        'The 2-second aim is fully telegraphed — every gun draws a red line at its target while it lines up.',
      ],
    },
  },
};

export default gunpowder;
