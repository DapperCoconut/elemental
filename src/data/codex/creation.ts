import { ElementCodex } from '../AbilityCodex';

/**
 * Creation — a workshop with a fighter in it.
 *
 * Verified against `src/elements/creation.ts`, `kits/CreationKit.ts`, the creation block of
 * `data/Upgrades.ts`, the Automaton perk in `data/Perks.ts` and Creation Mastery in
 * `data/Mastery.ts`. Two of the shop cards have drifted from the code; those rows say so.
 */
const creation: ElementCodex = {
  identity:
    'The only element that brings its own machine to the fight. Creation fires steel at a brewing '
    + 'engine standing in the middle of the arena, drinks what comes out, and builds walls to '
    + 'decide where the fight is allowed to happen. Fully upgraded it stops being an element at '
    + 'all: the Nexus folds into a piloted mech, F becomes a second five-key loadout, and Q hands '
    + 'you three sliders and asks how dangerous you would like the room to be.',

  passives: [
    {
      emoji: '⚙️',
      name: 'The Nexus',
      magic:
        'A riveted brewing engine standing in the arena from the first second of the match, gears '
        + 'counter-rotating around a caged core. It is not summoned and it cannot be moved. Shoot '
        + 'charged bolts into it and they land on its shelf as glowing ingots; two of them and the '
        + 'machine starts brewing.',
      effects: [
        { tag: 'resource', label: 'Loading it', detail: 'A Charged Bolt passing within 30px of the Nexus is swallowed instead of flying on, and its tier joins the shelf. It holds 2 at a time.' },
        { tag: 'resource', label: 'Brewing', detail: 'The second ingot starts a 5 second brew. Bolts fired at it mid-brew bounce off and are wasted.' },
        { tag: 'utility', label: 'Drinking', detail: 'The finished bottle rests on the pedestal. Walk within 46px of the Nexus and it is drunk instantly.' },
        { tag: 'utility', label: 'Shelf space', detail: '1 brewed potion may sit waiting, or 2 with the Electro Bolt (E+) upgrade.' },
        { tag: 'utility', label: 'Shared machine, separate shelves', detail: 'Both fighters use the same Nexus, but bolts, brews and bottles are keyed by owner — you cannot drink theirs.' },
      ],
      notes: [
        'Every brew counts toward Creation Mastery\'s Master Brewer requirement (100 needed).',
        'With Nexus Awakening (R+) the machine is also the mech, and it stops brewing entirely until 4 seconds after that mech is wrecked.',
      ],
    },
    {
      emoji: '🧪',
      name: 'The Six Brews',
      magic:
        'Two ingots in, one bottle out, and which bottle is decided entirely by which two metals '
        + 'you fed it. Copper is cheap and quick, gold is a full second of charging — and the '
        + 'recipes are ordered so the strongest effects cost the most patience.',
      effects: [
        { tag: 'buff', label: '⚔️ Buff — copper + copper', detail: 'Deal 25% more damage for 20 seconds.' },
        { tag: 'heal', label: '💚 Heal — silver + silver', detail: 'Regenerate 3 HP a second for 20 seconds, paid a third of a point at a time.' },
        { tag: 'buff', label: '🏆 Gold — gold + gold', detail: 'For 90 seconds every effect you gain, good or bad, lasts twice as long.' },
        { tag: 'shield', label: '🛡️ Protection — copper + silver', detail: 'Take 25% less damage for 20 seconds.' },
        { tag: 'movement', label: '👟 Speed — copper + gold', detail: 'Move 50% faster for 20 seconds.' },
        { tag: 'buff', label: '⏱️ Reload — gold + silver', detail: 'Cooldowns recharge 25% faster for 20 seconds.' },
      ],
      notes: [
        'Gold doubles the duration of anything drunk while it is running, but never extends itself.',
        'Every live potion is drawn as a bottle orbiting over your head, so the other fighter can always see what you are on.',
        'Buff is applied victim-side, which is why it scales daggers, bolts and constructs and not only projectiles.',
      ],
    },
  ],

  abilities: {
    'dagger-spray': {
      magic:
        'A fan of forged blades held back until you let go of them. Hold the button and ghost '
        + 'daggers line up around the aim, 30 degrees apart, each already pointed where it is going '
        + 'to fly. On release they leave in a spread and then curve — every one of them bends toward '
        + 'the cursor, meets there, and carries straight on past. They do not stop in a body; they go '
        + 'through it.',
      cast: 'Hold Click to fan the throw, release to fire. Cooldown is paid on release.',
      effects: [
        { tag: 'damage', label: 'Per blade', detail: '8 damage, and each dagger can hit each fighter once — a full fan of 5 is 40 to one target.' },
        { tag: 'utility', label: 'Fanning', detail: '1 dagger immediately, +1 for every 0.6s held, capped at 5 at 2.4 seconds.' },
        { tag: 'utility', label: 'Converging flight', detail: '620 px/s, turning at up to 7 rad/s toward the cursor until they are within 26px of it, then flying straight for the arena edge.' },
        { tag: 'utility', label: 'Pierce', detail: 'Nothing consumes a dagger but leaving the arena. One fan can hit a line of targets, or the same target after a curve.' },
        { tag: 'utility', label: 'Availability', detail: '0.5s cooldown.' },
      ],
      upgrade: {
        magic:
          'Blade Split makes your own walls part of the ammunition. A dagger crossing a Create block '
          + 'cuts it clean in two along the line it was travelling — and both halves stand up with '
          + 'the full health the original had.',
        effects: [
          { tag: 'utility', label: 'The cut', detail: 'A dagger within 20px of a block splits it top/bottom if it was travelling mostly horizontally, left/right otherwise, leaving a 6px kerf.', requiresUpgrade: 'click' },
          { tag: 'shield', label: 'Free health', detail: 'Each half keeps the whole original block\'s current HP. Cutting a 125 HP wall gives you two 125 HP walls.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'One cut per block per blade', detail: 'A single dagger can cut any number of different blocks, but never the same block — or its own halves — twice.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'Every stab counts toward Creation Mastery\'s Thousand Cuts requirement (1000 needed), which is why the fully-charged fan is the one worth throwing.',
        'Split halves are deliberately not counted as walls built, so the Contractor requirement cannot be farmed by cutting one wall in half repeatedly.',
      ],
    },

    'charged-bolt': {
      magic:
        'An ingot forged over your own head while you hold the key — copper, then silver, then gold, '
        + 'each threshold announced by a hammer blow on the anvil — and then fired. It is a plain '
        + 'slug of metal with one unusual property: the Nexus eats it. Half of what this key does '
        + 'is shoot people, and the other half is feeding the machine.',
      cast: 'Hold E to forge the tier, release to fire at the cursor. Cooldown is paid on release.',
      effects: [
        { tag: 'damage', label: 'Copper', detail: '5 damage — anything under 0.5s of charge.' },
        { tag: 'damage', label: 'Silver', detail: '10 damage — 0.5s to 1s of charge.' },
        { tag: 'damage', label: 'Gold', detail: '15 damage — 1s of charge or more.' },
        { tag: 'utility', label: 'Flight', detail: '380 px/s, consumed by the first fighter it touches within 18px.' },
        { tag: 'resource', label: 'Feeding the Nexus', detail: 'A bolt that passes within 30px of the Nexus loads onto its shelf instead. Two loaded tiers start the 5 second brew.' },
        { tag: 'utility', label: 'Availability', detail: '2s cooldown, so a gold bolt costs 1s of charge on top of it.' },
      ],
      upgrade: {
        magic:
          'Electro Bolt is a fourth charge tier past gold that never leaves your hand. Hold long '
          + 'enough and the ingot goes electric blue — and releasing it fires nothing at all. What it '
          + 'does instead is reach across the arena and re-brew whatever the Nexus last made, from '
          + 'nothing.',
        effects: [
          { tag: 'utility', label: 'Electro tier', detail: 'Reached at 3 seconds of hold — 2 seconds past gold.', requiresUpgrade: 'e' },
          { tag: 'resource', label: 'Instant re-brew', detail: 'Release fires no projectile. The Nexus immediately produces another bottle of the last recipe it brewed, with no bolts and no 5 second wait.', requiresUpgrade: 'e' },
          { tag: 'resource', label: 'Second shelf slot', detail: 'The Nexus may hold 2 finished potions at once instead of 1.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'The re-brew needs a recipe on record — with nothing brewed yet this match, an Electro release falls back to firing the bolt.',
        'The second shelf slot is what makes the mech a two-armed one, and what lets Mortar Command fire a two-shell volley.',
      ],
    },

    'wrench-plans': {
      magic:
        'A spanner thrown overhand, tumbling end over end. What it does on impact is almost '
        + 'incidental — the real payload is that it stays jammed in their gear for five seconds, and '
        + 'everything they try to cast for that window grinds against it and costs them blood.',
      cast: 'R, thrown at the cursor. Instant.',
      effects: [
        { tag: 'damage', label: 'Impact', detail: '20 damage to the first fighter within 22px of it.' },
        { tag: 'debuff', label: 'Wrenched', detail: 'For 5 seconds, every ability the target uses costs them 5 HP. There is no cap on how many times it charges.' },
        { tag: 'utility', label: 'Flight', detail: '640 px/s — the fastest thing Creation throws.' },
        { tag: 'utility', label: 'Availability', detail: '8s cooldown.' },
      ],
      upgrade: {
        magic:
          'Nexus Awakening arms the machine. A charged red core grows in the Nexus, and a wrench put '
          + 'through that core makes the whole thing tear itself apart and stand up as a walker — '
          + 'with whichever potions were sitting on the shelf welded on as arms. Climb in and it '
          + 'takes every hit meant for you until it is scrap.',
        effects: [
          { tag: 'summon', label: 'The mech', detail: '100 HP, standing dormant where the Nexus was with a [R] BOARD prompt over it. Press R within 80px to climb in.', requiresUpgrade: 'r' },
          { tag: 'shield', label: 'It takes the hits', detail: 'Every point of damage aimed at you goes into the mech instead, for as long as it lives. You keep all five of your abilities.', requiresUpgrade: 'r' },
          { tag: 'cost', label: 'Heavy', detail: 'You move at 75% speed while piloting it.', requiresUpgrade: 'r' },
          { tag: 'cost', label: 'What it eats', detail: 'Waking it consumes every bottle and every loaded ingot on the pedestal, and stops the Nexus brewing until it is wrecked.', requiresUpgrade: 'r' },
          { tag: 'summon', label: '🪚 Chainsaw arm (from Buff)', detail: 'Cuts anything within 66px on its own. Overheats after 5 seconds of continuous cutting and vents for 3.', requiresUpgrade: 'r' },
          { tag: 'summon', label: '💊 Med Core arm (from Heal)', detail: '3 repair orbs lobbed around you every 8 seconds; each one you walk over restores 15 mech HP, and they last 20 seconds.', requiresUpgrade: 'r' },
          { tag: 'summon', label: '🦾 Grabber arm (from Gold)', detail: 'Seizes anyone within 92px and holds them for 3 seconds, unable to attack. 8 second cooldown.', requiresUpgrade: 'r' },
          { tag: 'summon', label: '🛡️ Shield arm (from Protection)', detail: '+25 max mech HP, and every 5th hit is blocked outright — every 4th if an Overclock arm is boosting it, every 3rd with two shield arms.', requiresUpgrade: 'r' },
          { tag: 'summon', label: '🚀 Barrage arm (from Speed)', detail: '3 homing rockets every 8 seconds, 5 damage each plus a small blast, steering at up to 5.5 rad/s.', requiresUpgrade: 'r' },
          { tag: 'summon', label: '⚙️ Overclock arm (from Reload)', detail: '+25% mech speed (cancelling most of the mech\'s weight), supercharges the arm on the other side, and everything you build comes out steel-plated at double HP.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'The rebuild', detail: 'A wrecked mech drops you back on foot and the Nexus reassembles itself where it always stood, 4 seconds later.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'A dormant mech in range takes the R press before the wrench does — boarding is worth more than one throw, and the prompt over its head says so.',
        'Only 2 arms can be welded on, so the two-potion shelf from Electro Bolt (E+) is what makes a two-armed mech possible at all.',
        'The wrench is inert for its first 90ms so that throwing one while standing on the pedestal cannot wake the Nexus by accident.',
        'Binding Mortar Command over R gives up the wrench — and with it the only way to wake the Nexus.',
      ],
    },

    'creation-block': {
      magic:
        'A drafting frame pulled out of the air with the cursor, and then a wall standing where it '
        + 'was — real planks with grain, bolted at the corners, with a health bar over it. It stops '
        + 'movement, it swallows shots aimed at you, and yours go through it as though it were not '
        + 'there.',
      cast: 'Hold F and drag out a rectangle; release to build it. Anything under 12px on a side is discarded.',
      effects: [
        { tag: 'summon', label: 'The wall', detail: '125 HP, up to 200×200px. The ability card still says 25 HP; the kit builds it at 125, and at 250 while an Overclock mech arm is running.' },
        { tag: 'shield', label: 'Shot trap', detail: 'Enemy projectiles entering it are destroyed and subtract their own damage from the wall\'s health. Your own shots pass through untouched.' },
        { tag: 'control', label: 'Solid', detail: 'Both fighters are pushed out of it — including you, unless your Workshop is up, in which case you walk over your own barriers freely.' },
        { tag: 'utility', label: 'Availability', detail: '3s cooldown, paid on release.' },
      ],
      upgrade: {
        magic:
          'Build Mode is a second element on the same five keys. F stops being an ability and becomes '
          + 'a switch: press it and the ability cards rewrite themselves into a construction loadout '
          + 'where you place, drag and eventually fire your own architecture at somebody.',
        effects: [
          { tag: 'utility', label: 'Click — build and rearrange', detail: 'Drag out new walls (2s between builds), or grab any wall, pad or spike block you already own and drag it anywhere.', requiresUpgrade: 'f' },
          { tag: 'damage', label: 'E — launch everything', detail: 'Marching chevrons appear over every structure you own for 1.5s, then they all fly at the cursor at 600 px/s for 2 seconds. Walls hit for 20 and shatter, speed pads for 12 plus a 20% slow for 3s, spike blocks for 25. 5s cooldown.', requiresUpgrade: 'f' },
          { tag: 'movement', label: 'R — speed pad', detail: 'A 60×20 pad with 40 HP, permanent, giving you +25% speed for 3 seconds whenever you stand on it. 6s cooldown.', requiresUpgrade: 'f' },
          { tag: 'dot', label: 'Q — spike block', detail: 'A 50×50 block with 50 HP dealing 5 damage every 0.3s to anything within 22px of it. 20s cooldown.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'F — exit', detail: 'Leaves Build Mode and restores the ability cards exactly as they read going in.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Build Mode has no Create, no bolts, no wrench and no Workshop — you give up the whole element for as long as you are in it.',
        'Mortar Command deliberately does not take over a slot while you are in Build Mode; the build ability keeps the key.',
        'Walls, pads and spike blocks all count toward Creation Mastery\'s Contractor requirement (200 needed).',
        'An Overclock mech arm doubles every structure\'s health: 250 walls, 80 pads, 100 spike blocks.',
      ],
    },

    'maze-of-doom': {
      magic:
        'The arena becomes your shop floor. Boards are hammered down over the whole stage, sawdust '
        + 'goes everywhere, and for thirty seconds you are the only person who belongs there — you '
        + 'move faster, you walk over your own barriers as if they were furniture, and you leave '
        + 'footprints stamped in the floor behind you.',
      cast: 'Q. Instant, no aim.',
      effects: [
        { tag: 'buff', label: 'Home ground', detail: '+25% move speed for the full 30 seconds.' },
        { tag: 'movement', label: 'Your own walls stop blocking you', detail: 'The Workshop owner is exempt from being pushed out of their own Create blocks. Theirs still stop them.' },
        { tag: 'area', label: 'The floor', detail: 'A boarded overlay across the whole arena, plus a sawdust footprint stamped every 70ms as you walk.' },
        { tag: 'utility', label: 'Availability', detail: '45s cooldown, so it is up for 30 of every 45 seconds at best.' },
      ],
      upgrade: {
        magic:
          'Ultimate Invention bolts a control panel onto the Workshop. Three sliders appear top-left '
          + '— Danger, Bias and Clutter — and a red timer under them. Every notch you push a slider '
          + 'up makes the machine better and makes the timer run out sooner, and when it hits zero '
          + 'the whole invention shuts down whether the Workshop has time left or not.',
        effects: [
          { tag: 'cost', label: 'The unstable timer', detail: 'Starts at 30s and drains at 1 + 1.5× the sum of the three sliders. All three at maximum burns it at 5.5× — about 5.5 real seconds.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Danger — saws', detail: 'A spinning saw crosses the arena every 4s at zero and every 1.4s at maximum, dealing 25 damage to each enemy once as it passes.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Danger — nail bursts', detail: 'A 5-nail volley from a random edge every 3.5s at zero, every 1.3s at maximum. 10 damage per nail at 380 px/s.', requiresUpgrade: 'q' },
          { tag: 'buff', label: 'Bias — output and footspeed', detail: 'Up to +75% outgoing damage and +75% move speed, scaling straight off the slider.', requiresUpgrade: 'q' },
          { tag: 'heal', label: 'Bias — regeneration', detail: 'Above the halfway mark it also heals you 3 HP every second.', requiresUpgrade: 'q' },
          { tag: 'summon', label: 'Clutter — crates', detail: 'Up to 4 concentric rings of 46px crates inset 24px and then every 52px. They destroy enemy projectiles on contact and push the enemy out; you walk through them freely.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'The Nexus stays reachable', detail: 'Crates are never placed on top of the Nexus, however high Clutter is pushed.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'The shop card for this upgrade is stale: it describes Maze of Doom spawning 36 walls with invincible spiked blocks. That ability no longer exists — Q is the Workshop, and the upgrade is the slider panel described above.',
        'The saws and nails are yours and only ever hit the other side, so Danger is pure profit apart from the timer it burns.',
        'The panel is screen-space and draggable with the mouse; dragging a slider does not fire Dagger Spray.',
        'Kills made while your Workshop is up count toward Creation Mastery\'s Home Advantage requirement (5 needed).',
      ],
    },
  },

  perks: {
    automaton: {
      magic:
        'The Workshop builds its own staff. Three clockwork bots wind themselves up when the floor '
        + 'goes down and then wander it, bouncing off the walls and off each other\'s business, '
        + 'shoulder-charging anybody they happen to walk into. They are not smart and they are not '
        + 'aimed; they are simply always somewhere.',
      cast: 'Automatic — 3 of them spawn the moment the Workshop (Q) is cast.',
      effects: [
        { tag: 'summon', label: 'The bots', detail: '3 automatons, each lasting 10 seconds, wandering at 60 px/s from random points at least 60px off the walls.' },
        { tag: 'damage', label: 'Contact', detail: '12 damage to anyone within 24px, with a 0.5 second cooldown per bot — three bots in the same place is 36 damage every half second.' },
        { tag: 'utility', label: 'Bouncing', detail: 'They reflect off the arena edges and off your own maze walls rather than passing through them.' },
      ],
      notes: [
        'They run for 10 seconds out of the Workshop\'s 30, so they are an opening flourish rather than a standing threat.',
      ],
    },
  },

  mastery: {
    springboard: {
      magic:
        'A mastered artisan cannot stop building even while retreating. Every dash stamps a small '
        + 'sprung pad into the floor where you landed, and the floor keeps it long enough that a '
        + 'fighting retreat leaves a trail of them to run back along.',
      cast: 'Passive. Every dash drops one where it ends.',
      effects: [
        { tag: 'summon', label: 'The pad', detail: '38×14px with 25 HP, fading after 10 seconds. Build-mode pads are permanent; these are not.' },
        { tag: 'movement', label: 'The boost', detail: 'Standing on any pad you own gives +25% speed for 3 seconds, refreshed for as long as you stay on it.' },
      ],
      notes: [
        'Springboard pads count toward the Contractor requirement the same as a built one.',
        'A pad dropped by a dash out of danger is also a pad the enemy has to path around, since it can be launched at them in Build Mode.',
      ],
    },
    'mortar-command': {
      magic:
        'The Nexus stops being a brewery and becomes artillery. Every bottle sitting on the shelf is '
        + 'launched at the cursor in a lobbed arc, each trailing its own colour, and what lands is '
        + 'the recipe read backwards — a Buff Potion makes them weaker, a Heal Potion corrodes them, '
        + 'a Speed Potion leaves them wading. Gold is the exception; gold lands exactly as it is, '
        + 'which is worse.',
      cast:
        'Bindable to R, F or Q — never E, and in Build Mode the slot keeps its build ability. '
        + 'Refused with nothing spent if no potion of yours is on the Nexus.',
      effects: [
        { tag: 'damage', label: 'The blast', detail: '20 damage in a 130px radius, 480ms after the shells leave the Nexus. One blast however many shells were fired.' },
        { tag: 'resource', label: 'Ammunition', detail: 'Every potion of yours parked on the Nexus is fired and consumed. With Electro Bolt (E+) that is a two-shell volley and two debuffs at once.' },
        { tag: 'debuff', label: '🩸 Weakened (from Buff)', detail: 'They deal 25% less damage for 20 seconds.' },
        { tag: 'dot', label: '🧫 Corroding (from Heal)', detail: 'They lose 3 HP a second for 20 seconds.' },
        { tag: 'debuff', label: '🥀 Brittle (from Protection)', detail: 'They take 25% more damage for 20 seconds.' },
        { tag: 'control', label: '🐌 Leaden (from Speed)', detail: 'They move at half speed for 20 seconds.' },
        { tag: 'debuff', label: '⛓️ Jammed (from Reload)', detail: 'Their cooldowns recharge 25% slower for 20 seconds.' },
        { tag: 'debuff', label: '🏆 Gold lands unchanged', detail: '90 seconds of doubling every effect they gain — including all five hexes above, if you have a second shell to follow it with.' },
        { tag: 'utility', label: 'Availability', detail: '14 second cooldown.' },
      ],
      notes: [
        'A hex is doubled if the victim is already under Gold, which is why a gold shell followed by any other is the highest-value volley in the kit.',
        'The hexes are keyed to the opposing fighter, so in a crowd everyone else in the blast takes the 20 damage and nothing more.',
        'Binding it over R costs you Wrench in your Plans — and with Nexus Awakening owned, that is the only way to wake the mech.',
      ],
    },
  },
};

export default creation;
