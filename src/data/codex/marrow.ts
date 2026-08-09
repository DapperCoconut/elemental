import { ElementCodex } from '../AbilityCodex';

/**
 * Marrow — an immune system with a host attached, and a fever it wants you to start.
 *
 * Verified against `src/elements/marrow.ts` and `kits/MarrowKit.ts`. Marrow has five corrupt shop
 * upgrades and no perks or mastery enhancements; every figure below is a constant at the top of
 * the kit.
 */
const marrow: ElementCodex = {
  identity:
    'Marrow does not aim, it deploys. Four of its five keys put a cell on the field and the cell '
    + 'walks itself at whatever is nearest, which means the whole element is played through two '
    + 'bars at the top of the screen rather than through a cursor. The first is a length of bone '
    + 'with five sockets in it, and it is a hard cap — a sixth cell is refused, so every cast is '
    + 'a decision about what to have out rather than a button to hold down. The second is '
    + 'inflammation, and it is the only meter in the game that fills because you are losing: '
    + 'every 20 damage you take is worth 5 points of fever, and the fever heals and hastens you '
    + 'and everything you own.',

  passives: [
    {
      emoji: '🦴',
      name: 'The Bone Bar',
      magic:
        'Five sockets, and each one holds exactly one cell. A macrophage is a wall that eats, a '
        + 'neutrophil is a knife that is meant to die, and a T-cell is a medic that makes the '
        + 'other two better. Nothing queues and nothing stacks: at five, the sixth cast is handed '
        + 'straight back with its cooldown intact, so the last socket is the most expensive thing '
        + 'you own.',
      effects: [
        { tag: 'summon', label: 'The cap', detail: 'Exactly 5 summons at once. A sixth cast is refused with "🦴 BONE BAR FULL" and costs no cooldown.' },
        { tag: 'summon', label: 'Mast cells are exempt', detail: 'The 5 mast cells Mastacre releases take no socket at all and are not counted against the cap.' },
        { tag: 'utility', label: 'They can be shot down', detail: 'Every cell takes damage from any enemy shot that touches it — at least 5 a hit, and the shot is consumed doing it. 85 HP on a macrophage, 30 on a neutrophil, 50 on a T-cell, 50 on a mast cell.' },
        { tag: 'utility', label: 'The socket is the health bar', detail: 'Each filled socket draws its cell\'s own HP as a ring around it, so the bar reports the state of the board without you looking at the board.' },
        { tag: 'utility', label: 'They die with the host', detail: 'Every cell on the field is destroyed the moment its keeper goes down.' },
      ],
      notes: [
        'The order the sockets fill is the order the cells were summoned, so the bar reads left to right as the history of the fight.',
        'A cell that has been buffed by a T-cell wears a cyan collar in the arena and a cyan ring on its socket — the same information in both places on purpose.',
        'Cells are structures for the purposes of Ruin\'s Spikes of Ruin and anything else that razes a board. NETs are not: they are floor, in the same class as a puddle.',
      ],
    },
    {
      emoji: '🔥',
      name: 'Inflammation',
      magic:
        'A second bar under the bone, and it is the reason to walk into things. It fills when you '
        + 'get hurt and while your macrophages are working, it drains constantly whatever you do, '
        + 'and everything it is worth is proportional: at zero you are a slow pile of cells, and '
        + 'at a hundred you are a fever with a standing army that heals itself.',
      effects: [
        { tag: 'resource', label: 'The bar', detail: '0–100, draining 2 a second at all times.' },
        { tag: 'resource', label: 'Getting hurt', detail: '+5 for every 20 damage you take, counted off the raw figure before any of your own mitigation.' },
        { tag: 'resource', label: 'Upkeep', detail: '+2 a second for each live macrophage — two of them out-earns the drain on their own.' },
        { tag: 'heal', label: 'What it heals', detail: 'Up to 4 HP a second on the host and 3 a second on every cell you own, scaled straight off the bar.' },
        { tag: 'movement', label: 'What it hastens', detail: 'Up to +30% move speed on the host and on every cell and mast cell, scaled straight off the bar.' },
        { tag: 'resource', label: 'Mastacre', detail: '+20 per mast cell that detonates. All five is a full bar from empty.' },
      ],
      notes: [
        'The damage tally is read off `rawDamageTaken`, so armour that saves your life does not also stop the fever noticing you were hit that hard.',
        'It is the only bar in the kit with no ceiling on how it is spent — the regeneration and the haste are both live the whole time it is above zero.',
        'A Marrow player at 100 who then stops taking damage has 50 seconds of fever left. It is a window, not a state.',
      ],
    },
  ],

  abilities: {
    'marrow-antibody': {
      magic:
        'A single antibody flicked at the cursor. It hurts, and then it stops being a projectile '
        + 'and becomes a permanent fixture on whoever it hit — ten of them will ring a body, they '
        + 'never expire, and nothing shakes them off. What they are *for* is the board: every one '
        + 'of them is a standing order to your cells to bite that body harder, so the click is how '
        + 'you tell five summons which target matters.',
      cast: 'Click, auto-firing while the button is held. 440ms between shots.',
      effects: [
        { tag: 'damage', label: 'The hit', detail: '12 damage to the first body it touches.' },
        { tag: 'debuff', label: 'The coat', detail: 'It sticks. Up to 10 per body from one caster, ringed around them at fixed slots.' },
        { tag: 'damage', label: 'What the coat does', detail: 'Every antibody you have on a body makes each of your cells\' bites on it 10% harder — +50% at five, +100% at a full ten, on the macrophage\'s 15 and the neutrophil\'s 25 alike.' },
        { tag: 'heal', label: 'The bigger meal', detail: 'A macrophage biting a coated body heals itself and you 2 more per antibody: 5 bare, 15 at five, 25 at a full coat.' },
        { tag: 'utility', label: 'The shot', detail: '720 px/s, 1.4 seconds of life, 9px across, stopping on the first body it touches.' },
        { tag: 'utility', label: 'They never fade', detail: 'There is no expiry, no cleanse and no dispel. The only thing that removes one is the body it is stuck to being gone.' },
      ],
      upgrade: {
        magic:
          'B-Cascade. With a T-cell of any kind standing on the field the click stops being a '
          + 'click: instead of flicking an antibody you push out a whole B-cell, a fat gold thing '
          + 'wearing its antibodies on the outside, and it crawls off toward wherever you were '
          + 'pointing and does not come back. It takes no socket. What it is for is the salvos.',
        effects: [
          { tag: 'summon', label: 'The condition', detail: 'Only while you own a T-cell or a killer T. The moment your last one dies the click is an antibody again.', requiresUpgrade: 'click' },
          { tag: 'summon', label: 'The B-cell', detail: '45 HP, 46 px/s, 14 seconds of life. It takes no socket and cannot be razed off the board — nothing that wipes summons touches it.', requiresUpgrade: 'click' },
          { tag: 'cost', label: 'The rate', detail: '5 second cooldown instead of the click\'s 440ms, shown on the ability card in place of it.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'The body', detail: '25 damage to the first enemy it crawls into, and it is spent doing it.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'The salvo', detail: '2 homing antibodies at the nearest enemy every 3 seconds — 12 damage each and they latch exactly like a thrown one, coat cap included.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'The eleventh antibody on a body still deals its 12 damage — it simply does not find a slot to stick to.',
        'It is a registered projectile, which means it can be stolen or intercepted by anything in the game that does that to shots.',
        'Only your own antibodies buff your own cells. In a Marrow mirror both hosts end up coated and neither side is feeding the other\'s board.',
        'A full coat is 120 damage delivered in twelve pieces, and after that a five-socket board is doing double. The clicking is the setup, not the damage.',
      ],
    },

    'marrow-macrosma': {
      magic:
        'A macrophage: the biggest, slowest, most patient thing in the kit. It walks at whoever '
        + 'is nearest and opens a feeding cup on them, and every bite feeds you as well as itself. '
        + 'It also eats *structures* — anything the enemy has summoned, built or planted goes down '
        + 'its throat whole, and that is worth far more than the biting.',
      cast: 'E, no aim. Takes a socket. 9.5s cooldown.',
      effects: [
        { tag: 'summon', label: 'The cell', detail: '85 HP and 76 px/s — the slowest thing either side will see all match.' },
        { tag: 'damage', label: 'The bite', detail: '15 damage inside 30px, once every 1.1 seconds — +10% per antibody you have on the body it is eating, so 30 through a full coat of 10.' },
        { tag: 'heal', label: 'The feed', detail: '5 HP to the macrophage and 5 HP to you on every bite, plus 2 more each per antibody on the victim — 25 each through a full coat.' },
        { tag: 'heal', label: 'Devouring', detail: 'Anything the other side has put on the floor inside 46px is destroyed outright, for 25 HP to you and 25 to the cell per object. Checked five times a second.' },
        { tag: 'resource', label: 'Upkeep', detail: '+2 inflammation a second for as long as it is alive, which alone beats the bar\'s 2 a second drain.' },
      ],
      upgrade: {
        magic:
          'Cell Janitor. The macrophages come out red, and they are no longer only eating the '
          + 'enemy — they are cleaning up after your own dead. Every cell of yours that dies is a '
          + 'mess, and every mess makes every macrophage you own bigger.',
        effects: [
          { tag: 'heal', label: 'The tidy-up', detail: 'Any other cell of yours dying heals every macrophage you own to a full 85 HP, instantly and with no cap on how often.', requiresUpgrade: 'e' },
          { tag: 'buff', label: 'The growth', detail: 'And gives each one a permanent size, to a maximum of 5: +9% larger, +12% bite damage and +3px reach per size.', requiresUpgrade: 'e' },
          { tag: 'heal', label: 'The bigger meal', detail: '+2 HP a bite to the macrophage and to you per size — a five-size janitor feeds 15 on a bare bite instead of 5, and 35 through a full antibody coat.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'What counts as a death', detail: 'A spent neutrophil, a razed T-cell, a mast cell going off, a cell killed by your own Autoimmunity — all of them. A mast detonation alone is 5 sizes in five seconds.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'The tell', detail: 'A janitor macrophage is red in the arena and red in its socket, which is the same red Autoimmunity paints everything.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'The devour is the same board-wipe Ruin\'s Spikes of Ruin uses, so it eats a Conquest keep, a Life sapling, a Technology turret or a rival Marrow\'s cells without any of them knowing about it.',
        'It cannot eat a fighter. Husks, bots and players are enemies, not structures, and they take the bite like anybody else.',
        'One macrophage is the element\'s engine: it is the only thing that keeps the fever above the drain without you being hit.',
        'It is slow enough to walk away from forever. Its job is to be somewhere you have to come back to.',
      ],
    },

    'marrow-neutralize': {
      magic:
        'A neutrophil. Fast, fragile, and it hits harder than anything else you own — but it has '
        + 'thirty hit points and it is supposed to lose them. When it dies it turns inside out '
        + 'into a web of spiked protein across a huge patch of floor, and that web is the real '
        + 'ability.',
      cast: 'R, no aim. Takes a socket. 8s cooldown.',
      effects: [
        { tag: 'summon', label: 'The cell', detail: '30 HP and 168 px/s — twice the macrophage\'s speed and barely a third of its health.' },
        { tag: 'damage', label: 'The strike', detail: '25 damage inside 26px, once every 1.5 seconds — +10% per antibody you have on the body, so 50 through a full coat of 10.' },
        { tag: 'area', label: 'The NET', detail: 'On death it leaves a 130px web for 6 seconds.' },
        { tag: 'dot', label: 'In the web', detail: '5 damage a second, paid in ticks of 1.25 every 250ms.' },
        { tag: 'debuff', label: 'The slow', detail: '45% slower for as long as anything stands in it. It applies to anybody who is not the web\'s owner.' },
      ],
      upgrade: {
        magic:
          'Cytokine Storm. The neutrophil starts screaming chemically as well as stabbing: every '
          + 'few seconds it sprays a shotgun of seven small proteins out along its own facing. '
          + 'They are almost nothing at range and a great deal of it in somebody\'s face, and what '
          + 'they leave behind is a mark that everything else you own is about to hit.',
        effects: [
          { tag: 'damage', label: 'The spray', detail: '7 cytokines every 2.6 seconds, 4 damage each, in a 46° cone along the cell\'s facing. 250 px/s and 0.62s of life — about 150px of reach.', requiresUpgrade: 'r' },
          { tag: 'debuff', label: 'The mark', detail: 'Every pellet that lands stacks +10% damage taken on that body, up to +50%, for 4 seconds. Any fresh pellet restarts the 4 seconds.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Who it helps', detail: 'The mark is on the body, not on the pellet — your macrophage bites, your killer T, your mast cells and your own shots all read it.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'The geometry', detail: 'It fires where the cell is looking, so a neutrophil already in melee empties all seven into its target and one standing off sprays past.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'Killing it is what sets the web off. An enemy who ignores it eats 25 a hit; an enemy who shoots it gets 130px of hostile floor where it fell.',
        'A neutrophil razed by Ruin\'s spikes does *not* leave a web — that path skips the death handler on purpose.',
        'The web has an owner, so the Marrow player walks through their own without slowing down.',
        'Six seconds of web plus the fever\'s haste is a very cheap way to make an area unusable at range.',
      ],
    },

    'marrow-dendricles': {
      magic:
        'Five dendritic tentacles whipped at the cursor at short range, one after another, every '
        + 'one of them going to the same point. On their own they are a small, close, five-part '
        + 'poke. But land four of the five on the same body — which is a question of whether your '
        + 'aim is still on them by the fifth — and the ability transforms: the next press is not a '
        + 'strike at all, it is a T-cell.',
      cast: 'F, aimed at the cursor, 150px maximum reach. 6.5s cooldown. Armed, it is a summon and takes a socket.',
      effects: [
        { tag: 'damage', label: 'The lash', detail: '5 damage per tentacle, 5 tentacles — 25 if every one of them lands.' },
        { tag: 'area', label: 'The bundle', detail: 'Tips sit 11px apart across the aim line — a flat offset, not an angle — and each catches anything within 26px of its own tip. The bundle is just as tight at 150px as it is point-blank.' },
        { tag: 'utility', label: 'The transform', detail: '4 or more tentacles on one body arms the next cast as a T-cell. It stays armed until it is spent.' },
        { tag: 'summon', label: 'The T-cell', detail: '50 HP and 122 px/s. It never attacks anything.' },
        { tag: 'buff', label: 'What it hands over', detail: '+25% move speed and +50% damage to one of your other cells, once each, permanently.' },
        { tag: 'heal', label: 'The top-up', detail: '25 HP the first time, then 60% of the last each time after — 25, 15, 9, 5, and a floor of 3. Once every 1.6 seconds.' },
      ],
      upgrade: {
        magic:
          'Killer T. The moment a T-cell lands, F is handed straight back to you for two and a '
          + 'half seconds. Press it again inside that window and the medic you just made turns: '
          + 'dark, spurred, full of red granzyme, and it walks past your wounded cells and goes '
          + 'for the enemy instead.',
        effects: [
          { tag: 'utility', label: 'The window', detail: 'Summoning a T-cell resets F\'s cooldown for 2.5 seconds. Let it lapse and the cooldown is put back exactly where it would have been.', requiresUpgrade: 'f' },
          { tag: 'summon', label: 'The killer', detail: '125 HP and 138 px/s, in the same socket the T-cell was in. It never buffs or heals anything again.', requiresUpgrade: 'f' },
          { tag: 'damage', label: 'The strike', detail: '28 damage inside 62px — medium range, not melee — once every 1.25 seconds, and it reads the antibody coat like every other cell.', requiresUpgrade: 'f' },
          { tag: 'damage', label: 'The lunge', detail: 'Every 5 seconds it dashes 190px straight through its target for 22 more, hitting everything within 30px of the line it took.', requiresUpgrade: 'f' },
          { tag: 'buff', label: 'It is still a cell', detail: 'Your other T-cells buff it exactly like anything else: +25% speed and +50% damage, and top-ups on its 125 HP.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'The transform is checked per body, not per cast: five tentacles split over two enemies never arms it, however many of them land.',
        'Your own fan re-reads the cursor between tentacles, 90ms apart. Keep it on them and all five land; let it drift and the tail of the sweep goes where the cursor went.',
        'It walks to whoever needs it most — anything unbuffed first, then whatever is furthest from full — and it will never pick itself.',
        'The buff is permanent for that cell\'s life and applies to both halves of what a cell does. A buffed neutrophil hits for 37.5 and moves at 210 px/s.',
        'Armed, the ability card reads as ready even while the cooldown is still running, so the transform is visible without opening the tray.',
      ],
    },

    'marrow-mastacre': {
      magic:
        'Five mast cells released at once. They take no sockets, they cannot be built around, and '
        + 'they are not defenders — they are five fat bulbs full of granules that home in on '
        + 'whoever is nearest, glow hotter and shake harder as their fuse runs down, and then all '
        + 'go off. What survives is standing in a hundred and twenty five damage; what you get '
        + 'back is the whole fever bar.',
      cast: 'Q, no aim. Costs no sockets. Ultimate, 26s cooldown.',
      effects: [
        { tag: 'summon', label: 'The swarm', detail: '5 cells, 50 HP each, 108 px/s, released in a ring around you.' },
        { tag: 'damage', label: 'The blast', detail: '25 damage each inside 120px — 125 total to anything all five reach.' },
        { tag: 'resource', label: 'The payoff', detail: '+20 inflammation per detonation. All five is +100, which is the whole bar from empty.' },
        { tag: 'utility', label: 'The fuse', detail: '5 seconds. Killing one early simply detonates it where it stands, for full damage and full inflammation.' },
      ],
      upgrade: {
        magic:
          'Autoimmunity. Cast it at 50 inflammation or higher — enough that the five detonations '
          + 'would be asking a bar that stops at 100 for 150 — and the overflow has nowhere to go '
          + 'but into your own cells. Everything you own turns red and doubles, and stops being '
          + 'able to tell the enemy, each other and you apart.',
        effects: [
          { tag: 'resource', label: 'The trigger', detail: 'Cast Q at 50 inflammation or more. Nothing happens below that: 50 + the 100 the five mast cells pay is the 150 the bar cannot hold.', requiresUpgrade: 'q' },
          { tag: 'buff', label: 'The response', detail: '10 seconds. Every cell, mast cell and B-cell you own deals 2× damage, moves 30% faster and attacks 30% sooner.', requiresUpgrade: 'q' },
          { tag: 'resource', label: 'Pinned', detail: 'Inflammation is held at a full 100 for the whole 10 seconds — no drain, no tally — so it is 4 HP/s and +30% speed throughout.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'The friendly fire', detail: 'Half of every strike a red cell lands splashes onto your own body and onto any of your own cells inside the same reach. A red mast cell blasts you for half of its 50, too.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'With nothing to fight', detail: 'A red cell that can find no living enemy turns around and walks at you on purpose — bites, lunges and all.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Shooting them down is not a counter, it is a trade — the blast happens anyway, just sooner and further away from you.',
        'The five seconds are the whole tell. Mastacre thrown at a fleeing target is 0 damage and still a full inflammation bar, which is often the reason to cast it.',
        'A full bar right after a Mastacre is 4 HP a second and +30% speed for the next fifty seconds — the ultimate is at least as much a buff as it is a nuke.',
        'They inherit the fever\'s haste like everything else, so casting it at 100 inflammation makes them meaningfully harder to outrun.',
      ],
    },
  },
};

export default marrow;
