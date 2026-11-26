import { ElementCodex } from '../AbilityCodex';

/**
 * Growth — the only element that arrives at a fight unfinished and builds itself during one.
 *
 * Verified against `src/elements/growth.ts`, `kits/GrowthKit.ts`, `data/GrowthEvolve.ts`, the
 * growth block of `data/Upgrades.ts`, the Virus perk and `data/Mastery.ts`.
 */
const growth: ElementCodex = {
  identity:
    'A single cell with an upgrade tree. Growth opens every match weaker than anything it will '
    + 'face — a 12-damage click and nothing else — and spends the fight converting damage dealt '
    + 'into DNA and DNA into permanent stat lines. It is the only element whose build is chosen '
    + 'inside the match rather than before it, and the only one that can hand you a second body '
    + 'to keep fighting from.',

  passives: [
    {
      emoji: '🧬',
      name: 'DNA',
      basics:
        'Growth\'s currency. One strand precipitates for every 25 damage you deal — 5% less per tier of '
        + 'Enhanced Brain, down to 21.25 at three tiers — and flies straight into your bank from wherever '
        + 'the hit landed. Nothing lies on the floor and nothing has to be walked to. You can hold 10 at '
        + 'most, so banking beyond that is throwing income away. It buys Evolve tiers at 1, 2 and 3 DNA, '
        + 'ultimates at 6, and Auxiliary Growth at a flat 8.',
      effects: [
        { tag: 'resource', label: 'Earning', detail: 'One DNA drops for every 25 damage you deal. Enhanced Brain shaves 5% off that threshold per tier — 21.25 damage at three tiers.' },
        { tag: 'resource', label: 'Collecting', detail: 'Every strand flies straight into your bank from wherever the hit landed, however far away. There is no pickup and no rot.' },
        { tag: 'resource', label: 'The wallet', detail: 'Capped at 10 DNA held. There is no point banking beyond that — spend it or lose the income.' },
        { tag: 'utility', label: 'What it buys', detail: 'Evolve tiers (1 DNA for the first, 2 for the second, 3 for the third), ultimates at 6, and Auxiliary Growth at a flat 8.' },
      ],
      notes: [
        'The Mitosis secret upgrade gives every drop a 20% chance to pay 2 instead of 1.',
      ],
    },
    {
      emoji: '🩸',
      name: 'Infection',
      basics:
        'An infected fighter expels 3 floor viruses every 2 seconds for the 8 seconds it runs — 12 '
        + 'mines from a single hit. Each deals 6 damage to an enemy within 16px and is then consumed, '
        + 'lying there for 12 seconds if nobody steps on it. Floor viruses only ever damage the opposing '
        + 'side, so the field an infected enemy scatters is yours to walk through.',
      effects: [
        { tag: 'dot', label: 'Shedding', detail: 'An infected fighter expels 3 floor viruses every 2s for the 8s the infection runs — 12 mines from one hit.' },
        { tag: 'damage', label: 'Floor viruses', detail: '6 damage to an enemy within 16px, then consumed. They lie there for 12s.' },
        { tag: 'utility', label: 'Not yours to step on', detail: 'A floor virus only ever damages the opposing side, so the field an infected enemy leaves behind is yours to walk through.' },
      ],
      notes: [
        'The Virus perk turns this into a self-sustaining plague — 12s infections, 5 viruses every 1.4s, and any floor virus that connects re-infects for 3s.',
        'With Kind Strain (R+) half the expelled viruses come out green and heal you 30 instead.',
      ],
    },
  ],

  abilities: {
    'growth-click': {
      basics:
        'A bacterium thrown at the cursor for 12 damage within 20px, consumed on contact. It flies 460 '
        + 'px/s and dies after 2 seconds in the air, on a 0.75s cooldown. Almost every number here is '
        + 'bought: Teeth adds +3 a tier and More Teeth +4, so a fully invested click is 33; Enhanced '
        + 'Flagellum adds 20% speed and cuts 15% of the cooldown per tier, and System Efficiency another '
        + '10%.',
      cast: 'Click, aimed at the cursor. Instant.',
      effects: [
        { tag: 'damage', label: 'Impact', detail: '12 damage within 20px. Consumed on contact.' },
        { tag: 'utility', label: 'Flight', detail: '460 px/s, dying after 2s in the air. Enhanced Flagellum adds 20% speed per tier.' },
        { tag: 'utility', label: 'Rate of fire', detail: '0.75s cooldown, cut a further 15% per tier of Enhanced Flagellum and 10% per tier of System Efficiency.' },
        { tag: 'buff', label: 'What upgrades it', detail: 'Teeth is +3 per tier and More Teeth is +4 per tier, so a fully invested click is 12 + 9 + 12 = 33 damage.' },
      ],
      upgrade: {
        basics:
          'A bacterium that comes within 70px of an enemy steers toward them at 6 radians of correction a '
          + 'second. It only corrects — a shot fired at nothing still flies straight.',
        effects: [
          { tag: 'utility', label: 'Homing', detail: 'A bacterium within 70px of an enemy steers toward them at 6 radians of correction per second. It only corrects — a shot fired at nothing still flies straight.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'With the Swarm ultimate every click launches 3 bacteria in a fan, 0.16 radians apart.',
        'The Brood secret upgrade turns your bacteria red: 40% slower, double damage, and with Chemotaxis they home from 220px instead of 70px.',
      ],
    },

    'growth-evolve': {
      basics:
        'Opens the upgrade tree. While it is open you are in a menu, and the menu rule applies: every '
        + 'hit that reaches you lands at 5% of its damage instead of being blocked — browsing is cheap, '
        + 'not free, and it never runs out. The tree is 3 paths of 4 tiers, each buyable to level 3 at 1, '
        + '2 and 3 DNA. Offensive: Teeth +3 click damage a tier, Viral Spikes +2 virus and floor-virus '
        + 'damage, More Teeth +4 click damage, Spiked Spores returning 2 damage a tier for every 20 your '
        + 'spores soak. Defensive: Thick Flesh 10% resistance a tier, Digestive System 2 HP a tier per 20 '
        + 'click damage dealt, Gut Bacteria +1 spore and +5 max HP/s growth a tier, Spiked Shell 5 '
        + 'contact damage a tier every second. Efficiency: Enhanced Flagellum +20% bacterium speed and '
        + '−15% click cooldown, System Efficiency −10% on all cooldowns, Enhanced Brain −5% DNA '
        + 'threshold, Fast Evolution refunding 50/75/100% on right-click sales and knocking 1 DNA off row '
        + '4–5 costs.',
      cast: 'E toggles the tree open and shut, with only a 0.2s cooldown on the key.',
      effects: [
        { tag: 'shield', label: 'Reading time', detail: 'While the tree is open you count as in a menu: incoming damage lands at 5% instead of being blocked. No duration cap, no cooldown — but the chip damage never stops.' },
        { tag: 'utility', label: 'The tree', detail: '3 paths (Offensive, Defensive, Efficiency) × 4 tiers, each buyable to level 3. 1 DNA for the first level, 2 for the second, 3 for the third.' },
        { tag: 'buff', label: 'Offensive path', detail: 'Teeth +3 click damage/tier; Viral Spikes +2 virus and +2 floor-virus damage/tier; More Teeth +4 click damage/tier; Spiked Spores returns 2 damage/tier for every 20 your spores soak.' },
        { tag: 'shield', label: 'Defensive path', detail: 'Thick Flesh 10% damage resistance/tier; Digestive System heals 2 HP/tier per 20 click damage dealt; Gut Bacteria +1 spore/tier and +5 max HP/s growth/tier; Spiked Shell 5 contact damage/tier every second.' },
        { tag: 'buff', label: 'Efficiency path', detail: 'Enhanced Flagellum +20% bacterium speed and −15% click cooldown/tier; System Efficiency −10% all cooldowns/tier; Enhanced Brain −5% DNA threshold/tier; Fast Evolution refunds 50/75/100% on right-click sales and knocks 1 DNA off row 4–5 costs.' },
      ],
      upgrade: {
        basics:
          'Unlocks one ultimate per body per match, at a flat 6 DNA — 5 with any Fast Evolution, 4 with '
          + 'Apex, 3 with both — and only after that path\'s row-4 node is maxed. Swarm makes every click '
          + 'launch 3 bacteria in a fan. Chitin Shell is a 75 HP carapace that '
          + 'regrows in full 15 seconds after every break, indefinitely. Sweating banks up to 3 charges '
          + 'each of Virus and Spore Spray.',
        effects: [
          { tag: 'utility', label: 'One per body', detail: 'Ultimates cost a flat 6 DNA (5 with any Fast Evolution, 4 with Apex, 3 with both), need that path\'s row-4 node maxed first, and only one can be owned per body per match.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'Swarm (Offensive)', detail: 'Every click launches 3 bacteria in a fan, 0.16 radians apart, instead of 1.', requiresUpgrade: 'e' },
          { tag: 'shield', label: 'Chitin Shell (Defensive)', detail: 'A brown carapace worth 75 shield HP. Once broken it regrows in full 15s later, indefinitely.', requiresUpgrade: 'e' },
          { tag: 'resource', label: 'Sweating (Efficiency)', detail: 'Bank up to 3 charges each of Virus and Spore Spray.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'Buying tiers is one of the four Growth Mastery requirements (200 purchases, cumulative across matches), and unlocking all three Ultimates at least once is another.',
        'A clone body has its own separate tree, plus a clone-only node — Physical Maturity, +50 max HP per tier at a flat 3 DNA, three tiers.',
      ],
    },

    'growth-virus': {
      basics:
        'An overhead slam that throws a spinning virus at the cursor: 10 damage within 20px, 430 px/s, '
        + 'dead after 2 seconds. Whoever it hits is infected for 8 seconds and expels 3 floor viruses '
        + 'every 2s — 12 mines at 6 damage each within 16px, lying there for 12 seconds. Viral Spikes '
        + 'adds +2 a tier to both the impact and the mines. 8s cooldown.',
      cast: 'R, thrown at the cursor with an overhead slam. Instant.',
      effects: [
        { tag: 'damage', label: 'Impact', detail: '10 damage within 20px. Viral Spikes adds +2 per tier.' },
        { tag: 'utility', label: 'Flight', detail: '430 px/s, spinning, dying after 2s.' },
        { tag: 'dot', label: 'Infection', detail: '8s. The victim expels 3 floor viruses every 2s — 12 in total.' },
        { tag: 'damage', label: 'Floor viruses', detail: '6 damage each within 16px, lying there for 12s. Viral Spikes adds +2 per tier here too.' },
        { tag: 'utility', label: 'Availability', detail: '8s cooldown.' },
      ],
      upgrade: {
        basics:
          'Each expelled batch has a 50% chance to drop a green virus alongside it. Only you can collect '
          + 'it, within 26px, and it is worth 30 HP.',
        effects: [
          { tag: 'heal', label: 'Green viruses', detail: '50% chance a green virus drops alongside each expelled batch. Only you can collect it, within 26px, for 30 HP.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'With the Viral Consumption secret upgrade, eating a green virus also grants +20% speed and damage for 3s.',
        'The Pandemic secret upgrade makes floor viruses infectious too, for 3s each — an outbreak that keeps restarting itself.',
      ],
    },

    'spore-spray': {
      basics:
        'Sprays 5 spores toward the cursor, landing 130ms apart so the wall assembles rather than '
        + 'appearing. Each starts at 50 HP and matures over 5 seconds, gaining 10 max HP and 10 HP a '
        + 'second to reach 100, and blocks both projectiles and bodies out to 20px beyond its drawn '
        + 'radius. Each lasts 10 seconds, with a hard cap of 24 in play. Gut Bacteria adds a spore per '
        + 'tier to 8, and +5/s of growth. 15s cooldown, the longest non-ultimate in the kit.',
      cast: 'F, sprayed toward the cursor. Pods land 130ms apart, so the wall assembles rather than appearing.',
      effects: [
        { tag: 'summon', label: 'The wall', detail: '5 spores, each 50 HP at planting. Gut Bacteria adds +1 spore per tier, to 8.' },
        { tag: 'shield', label: 'Blocking', detail: 'Each spore blocks projectiles and physically blocks bodies, out to 20px beyond its drawn radius.' },
        { tag: 'buff', label: 'Maturing', detail: '+10 max HP and HP per second for the first 5s — a mature spore is 100 HP. Gut Bacteria adds +5/s per tier on top.' },
        { tag: 'utility', label: 'Lifetime', detail: '10s each, then they fade. There is a hard cap of 24 spores in play.' },
        { tag: 'utility', label: 'Availability', detail: '15s cooldown — the longest non-ultimate in the kit.' },
      ],
      upgrade: {
        basics:
          'A spore that reaches full maturity has a 25% chance to bud another beside it. The new pod '
          + 'starts from scratch and can bud in turn, up to the 24-spore cap.',
        effects: [
          { tag: 'summon', label: 'Budding', detail: 'A spore that reaches full maturity has a 25% chance to bud another spore beside it. The new pod starts from scratch and can bud in turn, up to the 24-spore cap.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Blocking projectiles with spores is one of the four Growth Mastery requirements (50 blocks).',
        'With Spiked Spores invested, every 20 damage the wall absorbs deals 2 damage per tier straight back to the enemy — a wall that fights.',
        'The Crawling Spores secret upgrade makes them creep toward the enemy at 26 px/s, shoving past each other.',
      ],
    },

    'auxiliary-growth': {
      basics:
        'For 8 DNA — 200 damage of income — plants a 100 HP nest at the cursor that fills at 5 HP a '
        + 'second and can be attacked while it incubates, then hatches a clone. The clone has 200 HP, '
        + 'moves at 140 px/s and fights on its own: closing inside 400px, backing off inside 130px, '
        + 'strafing at 55% speed, with a 0.9s click, an 8s virus and a 15s spore spray. SPACE swaps which '
        + 'body you drive and the one you leave keeps fighting under AI. A clone carries its own separate '
        + 'Evolve tree plus a node only it can buy — Physical Maturity, +50 max HP and HP a tier at a '
        + 'flat 3 DNA, three tiers. A dead clone melts into a 46px puddle, and planting a new nest on '
        + 'that puddle inherits its upgrades instead of starting fresh.',
      cast: 'Q at the cursor, costing 8 DNA. Nominally a 1s cooldown — the real gate is the DNA.',
      effects: [
        { tag: 'resource', label: 'Cost', detail: '8 DNA, which is 200 damage of income at the base threshold.' },
        { tag: 'summon', label: 'The nest', detail: 'A 100 HP nest that fills at 5 HP per second, then hatches. It can be attacked while it incubates.' },
        { tag: 'summon', label: 'The clone', detail: '200 base HP, moving at 140 px/s. It fights on its own: engaging inside 400px, backing off inside 130px, strafing at 55% speed, with a 0.9s click, an 8s virus and a 15s spore spray.' },
        { tag: 'utility', label: 'Body swap', detail: 'SPACE switches which body you control. The one you leave keeps fighting under AI.' },
        { tag: 'utility', label: 'Its own genome', detail: 'A clone carries a separate Evolve tree, plus a node only it can buy: Physical Maturity, +50 max HP and HP per tier at a flat 3 DNA, three tiers.' },
        { tag: 'utility', label: 'Primordial soup', detail: 'A clone that dies melts into a 46px puddle. Planting a new nest on that puddle inherits the dead clone\'s upgrades rather than starting fresh.' },
      ],
      upgrade: {
        basics:
          'The nest hatches a coloured strain, and the buff rides on the clone and on you while you are '
          + 'wearing it: yellow is +25% move speed, blue is 25% damage reduction, red is +25% damage dealt.',
        effects: [
          { tag: 'buff', label: 'Yellow strain', detail: '+25% move speed, on the clone and on you while you are wearing it.', requiresUpgrade: 'q' },
          { tag: 'shield', label: 'Blue strain', detail: '25% damage reduction.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Red strain', detail: '+25% damage dealt.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Summoning clones is one of the four Growth Mastery requirements (5 clones).',
        'The Ruler secret upgrade raises the limit to 2 live clones, with SPACE cycling around all three bodies.',
      ],
    },
  },

  perks: {
    virus: {
      basics:
        'Infections become an outbreak: 12 seconds instead of 8, shedding 5 floor viruses every 1.4s '
        + 'instead of 3 every 2s — roughly 43 viruses across a full infection against 12 — and any floor '
        + 'virus that connects re-infects its victim for 3 seconds, so the plague seeds new hosts off its '
        + 'own debris.',
      effects: [
        { tag: 'dot', label: 'Longer infection', detail: '12s instead of 8s.' },
        { tag: 'damage', label: 'Heavier shedding', detail: '5 floor viruses every 1.4s instead of 3 every 2s — roughly 43 viruses over a full infection instead of 12.' },
        { tag: 'dot', label: 'Re-infection', detail: 'Any floor virus that connects re-infects its victim for 3s, so the outbreak seeds new hosts off its own debris.' },
      ],
      notes: [
        'The re-infection window is short on purpose — it keeps a plague running without ever restarting the full 12s clock.',
      ],
    },
  },

  mastery: {
    'secret-upgrades': {
      basics:
        'Two of nine secret nodes are rolled per load-in, at a flat 8 DNA each, single-tier and '
        + 'unsellable. Brood turns your bacteria red — 40% slower, double damage, homing from 220px with Chemotaxis. Ruler lets you keep 2 '
        + 'clones at once with SPACE cycling all your bodies. Viral Consumption makes a green virus grant '
        + '+20% speed and damage for 3s. Mitosis gives DNA drops a 20% chance to pay out two. Crawling '
        + 'Spores creep toward the enemy at 26 px/s, shoving each other apart at 90 px/s. Pandemic makes '
        + 'floor viruses infect for 3s of their own. R Specialized is 25% smaller and faster; K '
        + 'Specialized is 30% bigger with +50 max and current HP. Apex knocks 1 DNA off third tiers and 2 '
        + 'off Ultimates — a 6 DNA ultimate becomes 4, or 3 alongside Fast Evolution.',
      effects: [
        { tag: 'resource', label: 'The offer', detail: '2 of the 9 rolled per load-in, at a flat 8 DNA each, single-tier and unsellable.' },
        { tag: 'damage', label: 'Brood', detail: 'Red bacteria: 40% slower and 2× damage. With Chemotaxis they start homing from 220px instead of 70px.' },
        { tag: 'summon', label: 'Ruler', detail: 'Keep up to 2 clones at once; SPACE cycles between all your bodies.' },
        { tag: 'buff', label: 'Viral Consumption', detail: 'Eating a green virus grants +20% speed and damage for 3s.' },
        { tag: 'resource', label: 'Mitosis', detail: '20% chance for a DNA drop to split and pay out 2.' },
        { tag: 'movement', label: 'Crawling Spores', detail: 'Spores creep toward the enemy at 26 px/s, shoving each other apart at 90 px/s so they do not stack.' },
        { tag: 'dot', label: 'Pandemic', detail: 'Floor viruses also infect for 3s, so victims start expelling viruses of their own.' },
        { tag: 'buff', label: 'R Specialized', detail: '25% smaller and 25% faster.' },
        { tag: 'shield', label: 'K Specialized', detail: '30% bigger, +50 max HP and +50 current HP.' },
        { tag: 'resource', label: 'Apex', detail: 'Third tiers cost 1 DNA less; Ultimates cost 2 less — a 6 DNA Ultimate becomes 4, or 3 alongside Fast Evolution.' },
      ],
      notes: [
        'Passive — no bind and no key. The roll is per load-in, so the same profile sees a different pair of options every session.',
      ],
    },
    'plague-pal': {
      basics:
        'A bindable virus pet — R, F or Q, never E — that follows a step behind you. Casting sends it '
        + 'dashing up to 150px ahead (toward the cursor), where it throws all its tentacles out for 18 '
        + 'damage to every enemy within 85px, on a 7s cooldown. Equipping it adds a Plague Pal tab to the '
        + 'Evolve screen on the same DNA wallet and cost curve. Offensive: Beak +5 damage a tier, Viral '
        + 'Rage (touching your own virus enrages it for 6s: +15% damage and its cooldown runs 25% faster a '
        + 'tier), Hardened Beak +7 a tier, Spore Blast (dashing through your spores pops them for 8 +4 a '
        + 'tier and flings 2 +1 a tier new ones), and the ultimate Zoochosis (it fires a bacterium every '
        + '2s). Defensive: Shell (blocks projectiles; 20% bigger per tier past the first), Blood Drink '
        + '(heal 15/25/35% of its damage), Helping Hand (1 HP/s a tier after 2s unhurt), Mouth (eats what '
        + 'it blocks and heals you 30/45/60% of it 3s later), and the ultimate Symbiosis (you merge: 25% '
        + 'less damage taken, and casting dashes you and lashes from your body). Efficiency: Reflexes −12% '
        + 'cooldown a tier, Assistance +5% speed and −5% cooldowns a tier, Jelly Membrane +4% dodge and +8% '
        + 'double-DNA chance a tier, Big Brain (auto-aim, +40px dash, +15px reach, faster; 2 charges at '
        + 'tier 3), and the ultimate Mitosis (two Pals).',
      cast: 'Bindable to R, F or Q — never E, because E is the tree. Dashes toward the cursor (or the nearest enemy with Big Brain).',
      effects: [
        { tag: 'damage', label: 'Lash', detail: '18 damage to every enemy within 85px of the Pal at the end of a dash of up to 150px.' },
        { tag: 'utility', label: 'Availability', detail: '7s cooldown; Reflexes −12% a tier, Assistance −5% a tier, Viral Rage +25% recharge speed a tier while enraged. Never below 1.5s.' },
        { tag: 'damage', label: 'Offensive path', detail: 'Beak +5 damage per tier; Viral Rage 6s of +15% damage and +25% recharge per tier after touching your own virus; Hardened Beak +7 per tier; Spore Blast pops spores it dashes through for 8 (+4 per tier) and flings 2 (+1 per tier) new spores. Ultimate — Zoochosis: a bacterium at the nearest enemy within 520px every 2s.' },
        { tag: 'shield', label: 'Defensive path', detail: 'Shell blocks enemy projectiles, +20% size per tier past the first; Blood Drink heals 15% (+10% per tier) of lash damage; Helping Hand heals 1 HP/s per tier after 2s unhurt; Mouth eats blocked shots and heals 30% (+15% per tier) of their damage after 3s. Ultimate — Symbiosis: merge for 25% less damage taken; casting dashes you and lashes from you.' },
        { tag: 'buff', label: 'Efficiency path', detail: 'Reflexes −12% Pal cooldown per tier; Assistance +5% speed and −5% cooldowns per tier; Jelly Membrane +4% dodge and +8% double-DNA chance per tier; Big Brain auto-aims, +40px dash, +15px reach and +25% speed per tier, 2 charges at tier 3. Ultimate — Mitosis: 2 Pals.' },
      ],
      notes: [
        'The ultimates need E+ and their path\'s row-4 node maxed, and only one can be owned per match.',
        'While merged by Symbiosis the Pal no longer blocks shots, so Shell and Mouth go quiet.',
        'On the Monkey skin the Pal is a Tack Shooter: it fires a ring of tacks instead of lashing, and its tree uses Tack Shooter upgrade names.',
      ],
    },
  },
};

export default growth;
