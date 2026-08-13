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
        'Growth\'s currency. One strand drops for every 25 damage you deal — 5% less per tier of '
        + 'Enhanced Brain, down to 21.25 at three tiers — and lies where it fell, picked up within 26px '
        + 'and rotting away after 8 seconds. You can hold 10 at most, so banking beyond that is throwing '
        + 'income away. It buys Evolve tiers at 1, 2 and 3 DNA, ultimates at 6, and Auxiliary Growth at a '
        + 'flat 8.',
      effects: [
        { tag: 'resource', label: 'Earning', detail: 'One DNA drops for every 25 damage you deal. Enhanced Brain shaves 5% off that threshold per tier — 21.25 damage at three tiers.' },
        { tag: 'resource', label: 'Collecting', detail: 'Strands lie where they fell, picked up within 26px, and rot away after 8s if you do not go for them.' },
        { tag: 'resource', label: 'The wallet', detail: 'Capped at 10 DNA held. There is no point banking beyond that — spend it or lose the income.' },
        { tag: 'utility', label: 'What it buys', detail: 'Evolve tiers (1 DNA for the first, 2 for the second, 3 for the third), ultimates at 6, and Auxiliary Growth at a flat 8.' },
      ],
      notes: [
        'Sweating (the Efficiency ultimate) collects DNA instantly from anywhere, which removes the walk entirely.',
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
        'With the Claws ultimate the click stops being a projectile at close range: inside 90px it becomes a 35-damage swipe across a 120° arc instead.',
        'The Brood secret upgrade launches two bacteria per click, split 0.1 radians apart.',
      ],
    },

    'growth-evolve': {
      basics:
        'Opens the upgrade tree, and opening it turns you grey and completely invincible for up to 5 '
        + 'seconds, ending early if you close it — with 20 seconds between protected windows, though you '
        + 'may reopen unprotected any time. The tree is 3 paths of 4 tiers, each buyable to level 3 at 1, '
        + '2 and 3 DNA. Offensive: Teeth +3 click damage a tier, Viral Spikes +2 virus and floor-virus '
        + 'damage, More Teeth +4 click damage, Spiked Spores returning 2 damage a tier for every 20 your '
        + 'spores soak. Defensive: Thick Flesh 10% resistance a tier, Digestive System 2 HP a tier per 20 '
        + 'click damage dealt, Gut Bacteria +1 spore and +5 max HP/s growth a tier, Spiked Shell 5 '
        + 'contact damage a tier every second. Efficiency: Enhanced Flagellum +20% bacterium speed and '
        + '−15% click cooldown, System Efficiency −10% on all cooldowns, Enhanced Brain −5% DNA '
        + 'threshold, Fast Evolution refunding 50/75/100% on right-click sales and knocking 1 DNA off row '
        + '4–5 costs.',
      cast: 'E toggles the tree open and shut. The key itself has only a 0.2s cooldown; the protection it grants does not.',
      effects: [
        { tag: 'shield', label: 'Reading time', detail: 'Opening the tree turns you grey and completely invincible for up to 5s, ending early if you close it.' },
        { tag: 'cost', label: 'Protection cooldown', detail: '20s between invincibility windows. Opening the tree again inside that is legal — you simply do it unprotected.' },
        { tag: 'utility', label: 'The tree', detail: '3 paths (Offensive, Defensive, Efficiency) × 4 tiers, each buyable to level 3. 1 DNA for the first level, 2 for the second, 3 for the third.' },
        { tag: 'buff', label: 'Offensive path', detail: 'Teeth +3 click damage/tier; Viral Spikes +2 virus and +2 floor-virus damage/tier; More Teeth +4 click damage/tier; Spiked Spores returns 2 damage/tier for every 20 your spores soak.' },
        { tag: 'shield', label: 'Defensive path', detail: 'Thick Flesh 10% damage resistance/tier; Digestive System heals 2 HP/tier per 20 click damage dealt; Gut Bacteria +1 spore/tier and +5 max HP/s growth/tier; Spiked Shell 5 contact damage/tier every second.' },
        { tag: 'buff', label: 'Efficiency path', detail: 'Enhanced Flagellum +20% bacterium speed and −15% click cooldown/tier; System Efficiency −10% all cooldowns/tier; Enhanced Brain −5% DNA threshold/tier; Fast Evolution refunds 50/75/100% on right-click sales and knocks 1 DNA off row 4–5 costs.' },
      ],
      upgrade: {
        basics:
          'Unlocks one ultimate per body per match, at a flat 6 DNA — 5 with any Fast Evolution, 4 with '
          + 'Apex, 3 with both — and only after that path\'s row-4 node is maxed. Claws replaces the click '
          + 'inside 90px with a 35-damage swipe across a 120° arc. Chitin Shell is a 75 HP carapace that '
          + 'regrows in full 15 seconds after every break, indefinitely. Sweating banks up to 3 charges '
          + 'each of Virus and Spore Spray and collects DNA instantly from anywhere on the map.',
        effects: [
          { tag: 'utility', label: 'One per body', detail: 'Ultimates cost a flat 6 DNA (5 with any Fast Evolution, 4 with Apex, 3 with both), need that path\'s row-4 node maxed first, and only one can be owned per body per match.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'Claws (Offensive)', detail: 'Clicking within 90px swipes for 35 damage across a 120° arc instead of launching a bacterium.', requiresUpgrade: 'e' },
          { tag: 'shield', label: 'Chitin Shell (Defensive)', detail: 'A brown carapace worth 75 shield HP. Once broken it regrows in full 15s later, indefinitely.', requiresUpgrade: 'e' },
          { tag: 'resource', label: 'Sweating (Efficiency)', detail: 'Bank up to 3 charges each of Virus and Spore Spray, and collect DNA instantly from anywhere on the map.', requiresUpgrade: 'e' },
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
        + 'unsellable. Brood splits your click into two bacteria 0.1 radians apart. Ruler lets you keep 2 '
        + 'clones at once with SPACE cycling all your bodies. Viral Consumption makes a green virus grant '
        + '+20% speed and damage for 3s. Mitosis gives DNA drops a 20% chance to pay out two. Crawling '
        + 'Spores creep toward the enemy at 26 px/s, shoving each other apart at 90 px/s. Pandemic makes '
        + 'floor viruses infect for 3s of their own. R Specialized is 25% smaller and faster; K '
        + 'Specialized is 30% bigger with +50 max and current HP. Apex knocks 1 DNA off third tiers and 2 '
        + 'off Ultimates — a 6 DNA ultimate becomes 4, or 3 alongside Fast Evolution.',
      effects: [
        { tag: 'resource', label: 'The offer', detail: '2 of the 9 rolled per load-in, at a flat 8 DNA each, single-tier and unsellable.' },
        { tag: 'damage', label: 'Brood', detail: 'Your click launches two bacteria instead of one, split 0.1 radians apart.' },
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
    'syringe-shot': {
      basics:
        'A bindable syringe — R, F or Q, never E, because E is the tree — that deals no impact damage '
        + 'at all and applies Sickness instead: 10 seconds at 2 damage a second, 20 baseline, on an 8s '
        + 'cooldown. Equipping it adds a whole second tree to the Evolve screen on the same DNA wallet '
        + 'and cost curve. Lethality: Deadly +1 damage/s a tier, Weakening +1% vulnerability a second a '
        + 'tier, Brutal ticking 0.8s→0.6s→0.5s, Crippling +1 damage/s with every fifth tick hitting for '
        + '+2 more a tier, and the ultimate Fatal killing any sick enemy at 10% health or less outright. '
        + 'Transmission: Quick-Fire −1s cooldown a tier, Sneeze cone-infecting every 4s for 6s, Contact '
        + 'infecting anyone they touch for 3s, Blood Spread leaving a sickening 5s blood puddle every 50 '
        + 'damage they take, and the ultimate Syringe Shatter bursting syringes to spray half their '
        + 'duration over nearby enemies. Severity: Remaining +2s a tier, Slowing 12% a tier, Weakening '
        + '10% less damage dealt a tier, Compromising erupting 10% more of their damage onto other '
        + 'enemies, and the ultimate Carrier keeping anyone who shakes it off as a permanent carrier at 1 '
        + 'damage/s, 5% slower and 5% weaker.',
      cast: 'Bindable to R, F or Q — never E, because E is the tree. Fires straight ahead.',
      effects: [
        { tag: 'damage', label: 'No impact damage', detail: 'The syringe deals 0 on hit. All of its value is in the status it applies.' },
        { tag: 'dot', label: 'Sickness', detail: '10s at 2 damage a second — 20 damage baseline, before any Sickness tier is bought.' },
        { tag: 'utility', label: 'Availability', detail: '8s cooldown, reduced 1s per tier of Quick-Fire.' },
        { tag: 'utility', label: 'The second tree', detail: 'Equipping it adds Lethality, Transmission and Severity to the Evolve screen, on the same DNA wallet and the same 1/2/3 cost curve, with the same one-ultimate-per-path rule.' },
        { tag: 'damage', label: 'Lethality path', detail: 'Deadly +1 damage/s per tier; Weakening +1% damage vulnerability per second per tier; Brutal ticks at 0.8s → 0.6s → 0.5s; Crippling +1 damage/s per tier and every 5th tick hits for +2 more per tier. Ultimate — Fatal: a sick enemy at 10% health or less dies instantly.' },
        { tag: 'debuff', label: 'Transmission path', detail: 'Quick-Fire −1s cooldown per tier; Sneeze makes sick enemies cone-infect every 4s for 6s (+2s per tier); Contact infects anyone they touch for 3s (+2s per tier); Blood Spread drops a 5s blood puddle every 50 damage they take that sickens for 3s (+2s per tier). Ultimate — Syringe Shatter: syringes burst on impact, spraying half their duration over nearby enemies.' },
        { tag: 'debuff', label: 'Severity path', detail: 'Remaining +2s sickness per tier; Slowing 12% slow per tier; Weakening 10% less damage dealt per tier; Compromising makes damage they take erupt onto other enemies for 10% more per tier. Ultimate — Carrier: enemies who shake off sickness stay carriers forever at 1 damage/s, 5% slower and 5% weaker.' },
      ],
      notes: [
        'It cannot be bound over E. E opens the tree, and the tree is where this enhancement lives.',
        'A fully invested Sickness build is where Growth\'s damage actually comes from at mastery — the syringe itself never deals a point.',
      ],
    },
  },
};

export default growth;
