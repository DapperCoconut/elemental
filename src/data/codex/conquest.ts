import { ElementCodex } from '../AbilityCodex';

/**
 * Conquest — a tower defence game played inside a fighting game.
 *
 * Verified against `src/elements/conquest.ts`, `kits/ConquestKit.ts`, the five upgrade trees in
 * `kits/ConquestUpgrades.ts`, the five shop upgrades in `data/Upgrades.ts` and the mastery in
 * `data/Mastery.ts`. Conquest has no perks.
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
      basics:
        'An RTS board laid over the arena: 14 columns by 9 rows of 64px squares, 126 in all, and you '
        + 'open holding the 9 around your town centre. Standing on a square you own is 50% damage '
        + 'resistance — and blunts you, because Banner Bash deals 5 instead of 20 while you are on your '
        + 'own land: home is not where you attack from. Two seconds of standing on a contested tile flips '
        + 'it to your colour, which is the only way the board ever changes hands. Each town centre holds '
        + '9 buildings, and a second capital is the only way past that.',
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
      basics:
        'You start with 20 Authority and earn 2 a second per town centre, rising to 8 a second with a '
        + 'fully built ECONOMY and MILITARY tree. A barracks is 35, a turret 25, a barricade 10 and an '
        + 'Expansion 150, with every upgrade tier priced from 5 to 200. The MILITARY path\'s first tier '
        + 'pays 2 Authority for every 50 damage you take — the only way losing the fight funds you — and '
        + 'the ECONOMY path\'s third tier takes 5 off every building placement, empire-wide.',
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
      basics:
        'Every building may take one path to tier 3 or 4, and the moment it does, every other path on '
        + 'that building is capped at tier 2 permanently. The town centre offers ECONOMY / MILITARY / '
        + 'ARCANE, a barracks NUMBERS / STRENGTH / SHADOW, a turret POWER / SPEED / ORDNANCE and a '
        + 'barricade DEFENCE / MEDICAL / BULWARK. The third column of each only exists once the matching '
        + 'shop upgrade is equipped — ARCANE with Q+, SHADOW with E+, ORDNANCE with R+ and BULWARK with '
        + 'F+. The trees are per building rather than per element, so a board can hold a NUMBERS barracks '
        + 'and a STRENGTH one at once.',
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
      basics:
        'A pike thrust along your aim: 20 damage down a 260px line, 26px either side of it — or 5 while '
        + 'you are standing on a square you own, a quarter. The town centre\'s first ARCANE tier adds +5, '
        + 'taken as the best across your empire rather than summed. 0.7s cooldown.',
      cast: 'Click, along the aim. 0.7s cooldown.',
      effects: [
        { tag: 'damage', label: 'The thrust', detail: '20 damage along a 260px line, 26px either side of it.' },
        { tag: 'cost', label: 'At home', detail: '5 damage instead of 20 while you are standing on a square you own — a quarter.' },
        { tag: 'buff', label: 'Enchantment', detail: '+5 damage from the town centre\'s first ARCANE tier, taken as the best across your empire rather than summed.' },
      ],
      upgrade: {
        basics:
          'Three standards you choose between. ⚔️ Offensive is the pike you already had, and every '
          + 'soldier standing near you deals 3 more damage. 🛡️ Defensive thrusts twice as fast for 10 '
          + 'each, and buildings near you take a fifth less damage. 💚 Healing thrusts half as often for 25 '
          + 'each, and mends nearby soldiers.',
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
      basics:
        'Places a 250 HP barracks — +100 with a Fortress town centre — on the square you are standing '
        + 'on. It garrisons a soldier every 3 seconds up to 3 on a square, each with 25 HP, swinging for '
        + '3 every second within 90px. Soldiers do not chase: they stand where they were put and fight '
        + 'whatever comes to them, and you drag them to move them. A Military Center town centre gives '
        + 'every soldier +25% damage and HP; a Military HQ makes it +50%. 35 Authority, or 30 with '
        + 'Discounted.',
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
        basics:
          'Opens the SHADOW column on every barracks. 1 · Speedy (10) marches its soldiers two squares at '
          + 'a time instead of one. 2 · Surprise! (30) makes a soldier\'s first swing after arriving '
          + 'somewhere new hit for 10 more. 3 · Shadow Cloak (20) has its soldiers dodge the first hit '
          + 'aimed at them outright and 25% of everything after. 4 · Assassin Guild (45) raises that dodge '
          + 'to 50%, adds 2 damage to every swing, and cuts anyone they march through for 12.',
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
      basics:
        'Places a 100 HP turret — +100 with a Fortress town centre, and the most fragile thing you can '
        + 'place — on the square you are standing on. It fires 10 damage every 2 seconds at 420 px/s out '
        + 'to 220px, at anything belonging to the enemy: their fighter, their soldiers and their '
        + 'buildings. 25 Authority, or 20 with Discounted.',
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
        basics:
          'Opens the ORDNANCE column on every turret. 1 · Boom Bullets (15) bursts every landed bullet '
          + 'for 3 more in a 34px radius. 2 · Boom Back (25) lobs an 8-damage bomb at whoever hits the '
          + 'tower, once every 1.2 seconds. 3 · Blast Nucleus (40) replaces the gun with a close-range '
          + 'blast worth double a bullet in a 70px radius, at the cost of range dropping from 220px to 140. '
          + '4 · Atomic Annihilation (60) makes blasts 25% wider, all ordnance 25% harder, and revenge '
          + 'bombs drag their victim in — the plain bullet is untouched, which is POWER\'s business.',
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
      basics:
        'Places a 300 HP wall — +100 with a Fortress town centre — on the square you are standing on. '
        + 'It deals no damage, generates no income and raises no soldiers: it grants 25% damage '
        + 'resistance to every building in the eight squares around it, diagonals included, and nothing '
        + 'else. 10 Authority, or 5 with Discounted.',
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
        basics:
          'Opens the BULWARK column on every barricade. 1 · Speedy Walls (10) makes you 15% faster within '
          + '110px, stacking up to 4 walls for +75% at the corner of four. 2 · Moving Walls (20) lets the '
          + 'wall be dragged a square at a time, like a garrison. 3 · Personal Wall (50) links you to it '
          + 'from its menu so it takes your hits instead of you. 4 · Force Shield (50) adds 25% move speed '
          + 'and 20% damage while you are linked.',
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
      basics:
        'Plants a second town centre where you stand, with its own nine squares of territory, +2 '
        + 'Authority a second and its own ECONOMY and MILITARY trees on top of the first town\'s. Building '
        + 'slots are per town centre, so a second capital is the only way past nine buildings. Income '
        + 'adds across towns, while Discounted, Fortress, the troop multiplier and the banner bonus are '
        + 'the best across them rather than the sum. 150 Authority, or 100 with Expansion Enhanced. 20s '
        + 'cooldown.',
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
        basics:
          'An Expansion drops to 100 Authority, nearly a minute of base income saved, and the ARCANE '
          + 'column opens on every town centre. 1 · Enchantment (25) adds 5 to Banner Bash. 2 · Wizard '
          + 'Tower (35) forms a fireball over that town every 10 seconds, which you drag off the dome and '
          + 'hurl for 30 damage in a 44px burst at 420 px/s. 3 · Wizard School (40) promotes one of your '
          + 'soldiers every 20 seconds to double HP and three squares of reach at half damage. 4 · Academy '
          + 'of Ash (50) makes fireballs and wizards hit 50% harder, and a dying wizard burst for 25 in an '
          + '80px radius.',
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

  mastery: {
    dictatorship: {
      basics:
        'Banked Authority sharpens the pike: +1 damage per 10 banked, so 200 banked is +20, capped at '
        + '+30. It is added to the base exactly as Enchantment is, so it stacks with the standard you are '
        + 'carrying and with Force Shield\'s ×1.2 — and the quarter you take for standing on your own land '
        + 'applies to the whole total, so a 50-damage pike is 12 at home. It is banked rather than '
        + 'earned, so spending turns it off: a 150 Authority Expansion takes 15 damage off the pike the '
        + 'instant it is planted.',
      cast: 'Passive. Always on while Conquest Mastery is enabled.',
      effects: [
        { tag: 'damage', label: 'The rate', detail: '+1 Banner Bash damage per 10 Authority banked — 200 banked is +20 — capped at +30.' },
        { tag: 'damage', label: 'On top of everything', detail: 'Added to the base exactly as Enchantment is, so it stacks with the standard you are carrying and with Force Shield\'s ×1.2.' },
        { tag: 'cost', label: 'Home still blunts it', detail: 'The quarter you take for standing on your own land applies to the whole total. A 50-damage pike is 12 at home.' },
        { tag: 'cost', label: 'Banked, not earned', detail: 'Spending is what turns it off. A 150 Authority Expansion takes 15 damage off the pike the instant it is planted.' },
      ],
      notes: [
        'It is the first thing in the element that makes *not* spending a real decision. Every other line of Conquest wants the money converted into buildings as fast as it arrives.',
        'It pairs with Blood money, on the market\'s WAR path, which reads the same number for turrets and soldiers — a hoarding Conquest player is arming their whole board at once.',
        'Thirty is a ceiling rather than a curve. Past 300 banked there is nothing further to gain from holding, which is what keeps a two-minute economy from ending the match with one poke.',
      ],
    },
    market: {
      basics:
        'A bindable stall placed on the square you are standing on: 50 HP, +100 with Fortress, counting '
        + 'against the nine-building limit like anything else, and paying 1 Authority a second on top of '
        + 'every town centre\'s 2. The key it is bound to stops placing what it used to — E gives up the '
        + 'barracks, R the turret, F the barricade, Q the Expansion. It has its own ECONOMY / WAR / '
        + 'BANKING tree of four tiers each, under the same one-path-past-tier-2 rule, and BANKING only '
        + 'opens if you own the corrupt-shard upgrade for the slot you bound it on. BANKING\'s last tier '
        + 'is Propaganda: 8 seconds of paying for hits in Authority at 0.6 a point instead of health, on '
        + 'a 20-second cooldown — and emptying the bank inside those 8 seconds means double damage for '
        + 'the rest of them, with the hit that emptied it landing at the ordinary rate and everything '
        + 'after doubled. 30 Authority, or 25 with Discounted.',
      cast: 'The bound key (E, R, F or Q), placed on the square you are standing on. 30 Authority, or 25 with Discounted. 0.6s cooldown.',
      effects: [
        { tag: 'summon', label: 'The stall', detail: '50 HP, +100 with Fortress. It counts against the nine-building limit like anything else.' },
        { tag: 'resource', label: 'The income', detail: '1 Authority a second, on top of every town centre\'s 2.' },
        { tag: 'cost', label: 'What it costs you', detail: 'The key it is bound to stops placing what it used to: E gives up the barracks, R the turret, F the barricade, Q the Expansion.' },
        { tag: 'utility', label: 'Its own tree', detail: 'ECONOMY / WAR / BANKING, four tiers each, under the same one-path-past-tier-2 rule as every other building.' },
        { tag: 'cost', label: 'The third column', detail: 'BANKING only opens if you own the corrupt-shard upgrade for the slot you bound the Market on — bind it on E and Barracks Enhanced is what unlocks the bank.' },
        { tag: 'shield', label: 'Propaganda', detail: 'BANKING\'s last tier: 8 seconds of paying for hits in Authority at 0.6 a point instead of health, on a 20 second cooldown.' },
        { tag: 'cost', label: 'Running dry', detail: 'Empty the bank inside those 8 seconds and you take double damage for the rest of them. The hit that emptied it lands at the ordinary rate; everything after is doubled.' },
      ],
      variants: {
        label: 'The market tree — twelve tiers, one path past 2',
        variants: [
          { emoji: '1️⃣', name: 'ECONOMY · Economic boost (35)', description: '+1 Authority a second, to 2.' },
          { emoji: '2️⃣', name: 'ECONOMY · Thrive (50)', description: '+1 more, to 3.' },
          { emoji: '3️⃣', name: 'ECONOMY · Market Revolution (75)', description: 'Every *other* market you own earns +1 a second. Two Revolutions pay each other.' },
          { emoji: '4️⃣', name: 'ECONOMY · Money Mania (100)', description: 'Every town centre you own pays double — the only upgrade in the game that multiplies another building.' },
          { emoji: '1️⃣', name: 'WAR · Cash out (25)', description: 'Pays every 0.8s instead of every second: this stall\'s income ×1.25.' },
          { emoji: '2️⃣', name: 'WAR · Warmongering (35)', description: 'Every 50 damage your side deals pays 3 Authority.' },
          { emoji: '3️⃣', name: 'WAR · Blood money (45)', description: 'Turrets and soldiers within 128px hit +5% harder per 50 Authority banked, capped at +50%.' },
          { emoji: '4️⃣', name: 'WAR · Loan Shark (50)', description: 'A LOAN button in the stall\'s menu: 25 of your own health for 5 Authority, as often as you can stand it.' },
          { emoji: '1️⃣', name: 'BANKING · Banking (50)', description: 'Up to +2 a second, scaling with the bank and reaching the full 2 at 200 banked. Best across the empire rather than summed. Shop-gated.' },
          { emoji: '2️⃣', name: 'BANKING · Investing (50)', description: 'Your whole bank grows 10% every 5 seconds, capped at +25 a tick. One clock for the empire however many stalls have it.' },
          { emoji: '3️⃣', name: 'BANKING · Securities (75)', description: 'Replaces Investing with a vault in this stall: DEPOSIT 25 a press up to 200, +25% every 5s, WITHDRAW it all back — and lose every point of it if the stall falls.' },
          { emoji: '4️⃣', name: 'BANKING · Propaganda Central (75)', description: 'The PROPAGANDA button: 8 seconds of paying for hits in Authority instead of health, at 0.6 a point. 20s cooldown.' },
        ],
      },
      notes: [
        'Securities and Investing are the same column, so a stall that has bought the vault has always bought the growth — and the vault is what *replaces* it. That is what "cannot get this boost and the investing boost" means in practice.',
        'A vault is the only Authority in the game that can be taken off you. 50 HP behind a barricade is a very different building from 50 HP on the front line.',
        'Propaganda shares one slot with Personal Wall: while the window is open the treasury is asked first and the wall is only reached once the bank refuses. A commander running both is spending money to save a wall.',
        'A loan is pierced and self-inflicted on purpose — it can never be the hit propaganda pays for, or 25 health would launder into a profit every time you pressed it.',
        'Money Mania and Market Revolution are both taken as the best across the empire rather than summed, exactly like Fortress and Discounted — two capitals are two incomes, not two of everything.',
      ],
    },
  },
};

export default conquest;
