import { ElementCodex } from '../AbilityCodex';

/**
 * Conquest — a tower defence game played inside a fighting game.
 *
 * Verified against `src/elements/conquest.ts`, `kits/ConquestKit.ts`, the four upgrade trees in
 * `kits/ConquestUpgrades.ts` and the five shop upgrades in `data/Upgrades.ts`. Conquest has no
 * perks and no mastery enhancements.
 */
const conquest: ElementCodex = {
  identity:
    'Every other element is a set of things you do. Conquest is a set of things you own. The '
    + 'arena is quietly a 14×9 board, you start holding nine squares of it with a town centre in '
    + 'the middle, and that town centre pays you two Authority a second whether you are fighting '
    + 'or not. Everything else is a way of spending that income: three buildings, each with the '
    + 'two-path four-tier upgrade tree of a tower defence game, and a fifth key that buys a whole '
    + 'second economy. Conquest barely fights — its click is a poke and standing on its own land '
    + 'makes that poke worse. What kills the other side is a barracks that has been running for '
    + 'ninety seconds.',

  passives: [
    {
      emoji: '🗺️',
      name: 'The Board',
      magic:
        'There is a grid under the arena that nobody else can see. Fourteen columns, nine rows, '
        + 'sixty-four pixels a square, and the squares you own are painted in your colour. You '
        + 'start with nine of them around your town centre and you take more by standing on them. '
        + 'Your land is where you are safe rather than where you are strong: it halves everything '
        + 'aimed at you and it quarters your own pike.',
      effects: [
        { tag: 'area', label: 'The grid', detail: '14 columns by 9 rows of 64px squares — 126 in all. You open holding the 9 around your town centre.' },
        { tag: 'shield', label: 'Standing on your own', detail: '50% damage resistance while you are on a square you own.' },
        { tag: 'cost', label: 'And it blunts you', detail: 'Banner Bash deals 5 instead of 20 while you are standing on your own land. Home is not where you attack from.' },
        { tag: 'utility', label: 'Taking a square', detail: '2 seconds of standing on a contested tile flips it to your colour. It is the only way the board changes hands.' },
        { tag: 'utility', label: 'Nine slots a town', detail: 'Each town centre can hold 9 buildings. A second capital is the only way past that.' },
      ],
      notes: [
        'The board is the whole element in one object: income, safety, building slots and territory are all measured in squares.',
        'The 50%-armour-but-quartered-pike rule is what stops Conquest from simply turtling — you cannot both be safe and be threatening.',
      ],
    },
    {
      emoji: '👑',
      name: 'Authority',
      magic:
        'The only currency in the game that ticks up on its own with nothing asked of you. Two a '
        + 'second per town centre, from the first frame, spent on placing buildings and on the '
        + 'upgrade trees behind them. A Conquest player who has been left alone for a minute has '
        + 'a hundred and forty points of army that a Conquest player who has been pressured does '
        + 'not.',
      effects: [
        { tag: 'resource', label: 'The income', detail: '20 to start, then 2 a second per town centre — rising to 8 a second with a fully built ECONOMY and MILITARY tree.' },
        { tag: 'resource', label: 'What it buys', detail: 'A barracks is 35, a turret 25, a barricade 10, and an Expansion 150. Every upgrade tier has its own price, from 5 to 200.' },
        { tag: 'buff', label: 'Insurance', detail: 'The MILITARY path\'s first tier pays 2 Authority for every 50 damage you take — the only way losing the fight funds you.' },
        { tag: 'buff', label: 'Discounted', detail: 'The ECONOMY path\'s third tier takes 5 off every building placement, for the whole empire.' },
      ],
      notes: [
        'Income is summed across every town centre, but Discounted, Fortress, the troop multiplier and the banner bonus are taken as the *best* of them rather than added — two capitals are two incomes, not two of everything.',
        'The 700ms click cooldown means Conquest cannot spend its way out of a fight it is already losing. The economy has to have been built before the fight.',
      ],
    },
    {
      emoji: '🌳',
      name: 'One Path Only',
      magic:
        'Every building has three columns of four upgrades and you may only ever commit to one of '
        + 'them. Push any path to its third tier and the other two are pinned at two forever. It '
        + 'is the tower defence rule, exactly, and it means the interesting decision is not what '
        + 'to buy but what to give up.',
      effects: [
        { tag: 'utility', label: 'The rule', detail: 'A building may take one path to tier 3 or 4. The moment it does, every other path on that building is capped at tier 2 permanently.' },
        { tag: 'utility', label: 'Three columns', detail: 'Town: ECONOMY / MILITARY / ARCANE. Barracks: NUMBERS / STRENGTH / SHADOW. Turret: POWER / SPEED / ORDNANCE. Barricade: DEFENCE / MEDICAL / BULWARK.' },
        { tag: 'cost', label: 'The third column is bought', detail: 'ARCANE, SHADOW, ORDNANCE and BULWARK only exist at all once the matching shop upgrade is equipped — Q+, E+, R+ and F+ respectively.' },
        { tag: 'utility', label: 'Per building, not per element', detail: 'Every barracks you place has its own independent tree, so a board can hold a NUMBERS barracks and a STRENGTH one at once.' },
      ],
      notes: [
        'The shop gate is on *buying* only. A remote opponent\'s board arrives as tier numbers with no save behind it and reads back exactly as they built it.',
        'Because each building keeps its own tree, the correct play is usually several cheap specialists rather than one expensive generalist.',
      ],
    },
  ],

  abilities: {
    'conquest-banner': {
      magic:
        'A pike with a banner on it, thrust straight forward. Two hundred and sixty pixels of '
        + 'reach is the longest melee in the game by a wide margin — and it is deliberately '
        + 'useless at home, because a Conquest player who could sit on their own armour and still '
        + 'threaten would never have to leave it.',
      cast: 'Click, along the aim. 0.7s cooldown.',
      effects: [
        { tag: 'damage', label: 'The thrust', detail: '20 damage along a 260px line, 26px either side of it.' },
        { tag: 'cost', label: 'At home', detail: '5 damage instead of 20 while you are standing on a square you own — a quarter.' },
        { tag: 'buff', label: 'Enchantment', detail: '+5 damage from the town centre\'s first ARCANE tier, taken as the best across your empire rather than summed.' },
      ],
      upgrade: {
        magic:
          'Banner Bearer gives you a standard to change. Right-click cycles between three, and '
          + 'each one re-tunes the pike and does something for whatever of yours is standing '
          + 'nearby — which turns the click from a poke into the thing that holds a line together.',
        effects: [
          { tag: 'damage', label: '⚔️ Offensive', detail: 'The pike you already had, and every soldier standing near you deals 3 more damage.', requiresUpgrade: 'click' },
          { tag: 'shield', label: '🛡️ Defensive', detail: 'Thrusts twice as fast for 10 each, and buildings near you take a fifth less damage.', requiresUpgrade: 'click' },
          { tag: 'heal', label: '💚 Healing', detail: 'Thrusts half as often for 25 each, and mends nearby soldiers.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'Defensive at twice the rate for 10 is the same damage per second as Offensive at 20, so the choice is entirely about what the aura is worth.',
        'Healing is the only sustain a barracks army has other than a Hospital barricade, and it is the reason a Conquest player walks *toward* their own soldiers.',
      ],
    },

    'conquest-barracks': {
      magic:
        'A barracks on a square, and then men. It trains one every three seconds up to three per '
        + 'square, and they hold whatever ground they were put on — walking nowhere, hitting '
        + 'whatever comes into range, until you drag them somewhere else. It is the most '
        + 'expensive building and the only one that wins a match on its own.',
      cast: 'E, placed on the square you are standing on. 35 Authority, or 30 with Discounted. 0.6s cooldown.',
      effects: [
        { tag: 'summon', label: 'The building', detail: '250 HP, +100 with a Fortress town centre.' },
        { tag: 'summon', label: 'The garrison', detail: 'A soldier every 3 seconds, up to 3 on a square. Each has 25 HP and swings for 3 every second within 90px.' },
        { tag: 'utility', label: 'They hold ground', detail: 'Soldiers do not chase. They stand where they were put and fight whatever comes to them — you drag them to move them.' },
        { tag: 'buff', label: 'The town buff', detail: 'A Military Center town centre gives every soldier +25% damage and HP; a Military HQ makes it +50%.' },
      ],
      variants: {
        label: 'The barracks tree — NUMBERS and STRENGTH',
        variants: [
          { emoji: '1️⃣', name: 'NUMBERS · Recruits (15)', description: '+1 soldier per square.' },
          { emoji: '2️⃣', name: 'NUMBERS · Crowding (15)', description: '+1 more soldier per square — five to a square.' },
          { emoji: '3️⃣', name: 'NUMBERS · Recruitment Office (20)', description: 'Trains one every 1.5 seconds instead of 3.' },
          { emoji: '4️⃣', name: 'NUMBERS · Strength in Numbers (100)', description: 'Every soldier deals +1 damage for every soldier sharing their square — five together is +5 each.' },
          { emoji: '1️⃣', name: 'STRENGTH · Axes (25)', description: '+2 soldier damage, to 5.' },
          { emoji: '2️⃣', name: 'STRENGTH · Dual Wield (45)', description: '+2 more, to 7.' },
          { emoji: '3️⃣', name: 'STRENGTH · Berserker (50)', description: '+30% attack speed and +25 soldier HP.' },
          { emoji: '4️⃣', name: 'STRENGTH · Barbarian King (200)', description: 'Trains one 200 HP king instead of a garrison, hitting for 20 every 2 seconds. Below a third health he drinks a potion for 50 HP and double attack speed.' },
        ],
      },
      upgrade: {
        magic:
          'Barracks Enhanced opens SHADOW — a third column about soldiers who move well and are '
          + 'hard to hit, rather than soldiers who are numerous or strong.',
        effects: [
          { tag: 'movement', label: '1 · Speedy (10)', detail: 'Its soldiers march two squares at a time instead of one.', requiresUpgrade: 'e' },
          { tag: 'damage', label: '2 · Surprise! (30)', detail: 'A soldier\'s first swing after arriving somewhere new hits for 10 more.', requiresUpgrade: 'e' },
          { tag: 'shield', label: '3 · Shadow Cloak (20)', detail: 'Its soldiers dodge the first hit aimed at them outright, then 25% of everything after.', requiresUpgrade: 'e' },
          { tag: 'damage', label: '4 · Assassin Guild (45)', detail: 'Dodge rises to 50%, every swing hits for 2 more, and marching through an enemy cuts them for 12.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'Strength in Numbers and Crowding are on the same column, so the crowd bonus is bought with the crowd rather than on top of somebody else\'s.',
        'The Barbarian King replaces the garrison entirely — one man rather than five — which makes him a terrible answer to a wave and an excellent one to a duel.',
        'A soldier that will not chase is the element\'s central limitation: an army only threatens what walks into it, and dragging it forward is a manual act.',
      ],
    },

    'conquest-turret': {
      magic:
        'A gun on a post. It picks anything of theirs inside two hundred and twenty pixels — '
        + 'fighter, soldier or building — and puts a bullet into it every two seconds. It is the '
        + 'cheap answer to something that will not come close enough for the barracks.',
      cast: 'R, placed on the square you are standing on. 25 Authority, or 20 with Discounted. 0.6s cooldown.',
      effects: [
        { tag: 'summon', label: 'The building', detail: '100 HP, +100 with a Fortress town centre — the most fragile thing you can place.' },
        { tag: 'damage', label: 'The gun', detail: '10 damage every 2 seconds, at 420 px/s, out to 220px.' },
        { tag: 'utility', label: 'What it shoots', detail: 'Anything belonging to the enemy: their fighter, their soldiers, and their buildings.' },
      ],
      variants: {
        label: 'The turret tree — POWER and SPEED',
        variants: [
          { emoji: '1️⃣', name: 'POWER · Stronger Bullets (15)', description: '+3 damage, to 13.' },
          { emoji: '2️⃣', name: 'POWER · Even Stronger (25)', description: '+5 more, to 18.' },
          { emoji: '3️⃣', name: 'POWER · Sniper Nest (35)', description: 'Bullets become hitscan — they land the instant they are fired.' },
          { emoji: '4️⃣', name: 'POWER · Headhunter (75)', description: '+3 damage to 21, and a 10% chance of a double-damage headshot.' },
          { emoji: '1️⃣', name: 'SPEED · Faster Bullets (10)', description: 'Bullets fly 10% faster and the turret fires 20% faster.' },
          { emoji: '2️⃣', name: 'SPEED · Even Faster (20)', description: 'Another 25% faster — a bullet every 1.33 seconds.' },
          { emoji: '3️⃣', name: 'SPEED · Burst Tower (50)', description: 'Fires in bursts of 3.' },
          { emoji: '4️⃣', name: 'SPEED · Burst Mania (50)', description: '15 bullets in a full circle instead — it stops aiming and simply covers everything.' },
        ],
      },
      upgrade: {
        magic:
          'Turret Enhanced opens ORDNANCE — a column about area rather than accuracy, ending in '
          + 'a tower that has given up on shooting and simply detonates.',
        effects: [
          { tag: 'damage', label: '1 · Boom Bullets (15)', detail: 'Every bullet that lands bursts for 3 more in a 34px radius.', requiresUpgrade: 'r' },
          { tag: 'damage', label: '2 · Boom Back (25)', detail: 'Hitting the tower makes it lob an 8-damage bomb back at whoever did it, once every 1.2 seconds.', requiresUpgrade: 'r' },
          { tag: 'damage', label: '3 · Blast Nucleus (40)', detail: 'The gun is replaced by a close-range blast worth double a bullet in a 70px radius — but the range drops from 220px to 140.', requiresUpgrade: 'r' },
          { tag: 'damage', label: '4 · Atomic Annihilation (60)', detail: 'Blasts are 25% wider, all ordnance hits 25% harder, and revenge bombs drag their victim in. The plain bullet is untouched — that is POWER\'s business.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'A blast tower has to be walked up to, and that shorter leash is exactly what pays for the doubled damage.',
        'Burst Mania stops the turret aiming at all. Fifteen bullets in a circle is enormous against a crowd and a waste against one person standing to the side.',
        'At 100 HP a turret is the thing that dies first, which is why the barricade\'s resistance aura exists.',
      ],
    },

    'conquest-barricade': {
      magic:
        'A wall. It does not attack anything and it never will — what it does is stand next to '
        + 'your real buildings and make them harder to break, including diagonally. It is ten '
        + 'Authority, which makes it the cheapest thing on the board and the thing you place '
        + 'most of.',
      cast: 'F, placed on the square you are standing on. 10 Authority, or 5 with Discounted. 0.6s cooldown.',
      effects: [
        { tag: 'summon', label: 'The wall', detail: '300 HP, +100 with a Fortress town centre.' },
        { tag: 'shield', label: 'The aura', detail: '25% damage resistance to every building in the eight squares around it, diagonals included.' },
        { tag: 'utility', label: 'It does nothing else', detail: 'No damage, no income, no soldiers. It is entirely a multiplier on what is next to it.' },
      ],
      variants: {
        label: 'The barricade tree — DEFENCE and MEDICAL',
        variants: [
          { emoji: '1️⃣', name: 'DEFENCE · Stone Walls (10)', description: '+50 HP, to 350.' },
          { emoji: '2️⃣', name: 'DEFENCE · Iron Walls (20)', description: '+200 more, to 550.' },
          { emoji: '3️⃣', name: 'DEFENCE · Defender (30)', description: 'The resistance aura rises from 25% to 50%.' },
          { emoji: '4️⃣', name: 'DEFENCE · Spiked Walls (30)', description: 'Deals 5 damage back for every 20 taken by it or any building beside it.' },
          { emoji: '1️⃣', name: 'MEDICAL · Regenerating Wall (5)', description: 'Heals itself 5 HP a second. The cheapest upgrade in the game.' },
          { emoji: '2️⃣', name: 'MEDICAL · Mega Heals (20)', description: '15 HP a second instead.' },
          { emoji: '3️⃣', name: 'MEDICAL · Medical Center (30)', description: 'Heals every building beside it for 10 HP a second too.' },
          { emoji: '4️⃣', name: 'MEDICAL · Hospital (35)', description: 'And heals nearby soldiers for 10 HP a second as well.' },
        ],
      },
      upgrade: {
        magic:
          'Barricade Enhanced opens BULWARK — the only column in the element that does anything '
          + 'for *you* rather than for your buildings. Walls that hurry you along, walls you can '
          + 'march, and finally a wall you tie yourself to so it takes your hits.',
        effects: [
          { tag: 'movement', label: '1 · Speedy Walls (10)', detail: 'Stand within 110px and you move 15% faster, stacking up to 4 walls — +75% at the corner of four.', requiresUpgrade: 'f' },
          { tag: 'utility', label: '2 · Moving Walls (20)', detail: 'The wall can be dragged a square at a time, like a garrison.', requiresUpgrade: 'f' },
          { tag: 'shield', label: '3 · Personal Wall (50)', detail: 'Link yourself to it from its menu and it takes your hits instead of you.', requiresUpgrade: 'f' },
          { tag: 'buff', label: '4 · Force Shield (50)', detail: 'While you are linked you also move 25% faster and hit 20% harder.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Regenerating Wall at 5 Authority is the best value on the board by a wide margin — a wall that never dies protects everything around it forever.',
        'A Hospital barricade is the only thing that heals soldiers other than a Healing banner, and it is what makes a static army sustainable.',
        'Force Shield is the closest Conquest gets to a personal power spike, and it requires standing behind a specific wall to keep it.',
      ],
    },

    'conquest-expansion': {
      magic:
        'A second capital. It goes down where you are standing, in its own colour, and it comes '
        + 'with its own nine squares of territory, its own two Authority a second, its own nine '
        + 'building slots and its own upgrade tree. It is not a bigger version of what you have — '
        + 'it is a second one of it.',
      cast: 'Q, planted where you stand. 150 Authority, or 100 with Expansion Enhanced. 20s cooldown.',
      effects: [
        { tag: 'summon', label: 'The capital', detail: 'A second town centre with its own nine squares of territory around it.' },
        { tag: 'resource', label: 'The income', detail: '+2 Authority a second, and its own ECONOMY and MILITARY trees on top of the first town\'s.' },
        { tag: 'utility', label: 'Nine more slots', detail: 'Building slots are per town centre, so a second capital is the only way past nine buildings.' },
        { tag: 'utility', label: 'Empire-wide bests', detail: 'Income adds across towns; Discounted, Fortress, the troop multiplier and the banner bonus are the best across them rather than the sum.' },
      ],
      variants: {
        label: 'The town centre tree — ECONOMY and MILITARY',
        variants: [
          { emoji: '1️⃣', name: 'ECONOMY · Richer (20)', description: '+1 Authority a second.' },
          { emoji: '2️⃣', name: 'ECONOMY · Even Richer (50)', description: '+1 more, to 4 a second.' },
          { emoji: '3️⃣', name: 'ECONOMY · Discounted (75)', description: 'Every building costs 5 less, empire-wide.' },
          { emoji: '4️⃣', name: 'ECONOMY · Capital City (125)', description: '+2 more, to 6 a second from this town alone.' },
          { emoji: '1️⃣', name: 'MILITARY · Insurance (15)', description: 'Every 50 damage you take pays out 2 Authority.' },
          { emoji: '2️⃣', name: 'MILITARY · Fortress (15)', description: '+100 HP to every building you own.' },
          { emoji: '3️⃣', name: 'MILITARY · Military Center (35)', description: '+1 Authority a second, and troops deal 25% more damage with 25% more HP.' },
          { emoji: '4️⃣', name: 'MILITARY · Military HQ (50)', description: '+1 more, and those troop buffs rise to 50%.' },
        ],
      },
      upgrade: {
        magic:
          'Expansion Enhanced makes a second capital a third cheaper and opens ARCANE on every '
          + 'town centre you own — the only column in the element that is magic rather than '
          + 'logistics.',
        effects: [
          { tag: 'resource', label: 'Cheaper', detail: '100 Authority instead of 150, which is nearly a minute of base income saved.', requiresUpgrade: 'q' },
          { tag: 'damage', label: '1 · Enchantment (25)', detail: 'Banner Bash hits for 5 more.', requiresUpgrade: 'q' },
          { tag: 'damage', label: '2 · Wizard Tower (35)', detail: 'A fireball forms over this town every 10 seconds. Drag it off the dome and hurl it for 30 damage in a 44px burst at 420 px/s.', requiresUpgrade: 'q' },
          { tag: 'summon', label: '3 · Wizard School (40)', detail: 'Every 20 seconds one of your soldiers is promoted: double HP, three squares of reach, and half the damage.', requiresUpgrade: 'q' },
          { tag: 'damage', label: '4 · Academy of Ash (50)', detail: 'Fireballs and wizards hit 50% harder, and a dying wizard bursts for 25 in an 80px radius.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'A hundred and fifty Authority is seventy-five seconds of base income, so the first Expansion is a decision about the next two minutes rather than the next ten seconds.',
        'Two capitals with full ECONOMY and MILITARY is 16 Authority a second, which is eight times what the element opens with.',
        'The Wizard School is the only thing that changes a soldier after it has been trained, and it halves their damage — a wizard is reach, not power.',
      ],
    },
  },
};

export default conquest;
