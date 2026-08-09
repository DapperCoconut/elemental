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
      magic:
        'Damage is not the point; damage is the currency. Every quarter of a fighter\'s worth of '
        + 'harm you deal precipitates a strand of DNA onto the floor, and you have to go and pick '
        + 'it up. Everything the element ever becomes is bought with these.',
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
      magic:
        'Anything your Virus touches becomes a factory. The victim keeps fighting, but they are '
        + 'shedding — coughing live virus onto the floor around them on a fixed cadence, and every '
        + 'one of those is a mine that anybody but you can step on.',
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
      magic:
        'The cell pinches a bud off its own hand and flings it: a flagellated bacterium that swims '
        + 'flat and straight, tail lashing behind it. It is the smallest opening attack of any '
        + 'element and it never stops being the thing you press, because every Offensive tier in '
        + 'the tree is bolted onto this one number.',
      cast: 'Click, aimed at the cursor. Instant.',
      effects: [
        { tag: 'damage', label: 'Impact', detail: '12 damage within 20px. Consumed on contact.' },
        { tag: 'utility', label: 'Flight', detail: '460 px/s, dying after 2s in the air. Enhanced Flagellum adds 20% speed per tier.' },
        { tag: 'utility', label: 'Rate of fire', detail: '0.75s cooldown, cut a further 15% per tier of Enhanced Flagellum and 10% per tier of System Efficiency.' },
        { tag: 'buff', label: 'What upgrades it', detail: 'Teeth is +3 per tier and More Teeth is +4 per tier, so a fully invested click is 12 + 9 + 12 = 33 damage.' },
      ],
      upgrade: {
        magic:
          'Chemotaxis gives the bacterium a nose. A shot that would have skimmed past a body '
          + 'detects the gradient, wriggles back onto course and takes it anyway — the difference '
          + 'between a 20px hitbox and a 70px one.',
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
      magic:
        'The one ability that is not an attack. Pressing it opens the genome: three columns of four '
        + 'mutations, each buyable three times, and the caster goes grey and untouchable while they '
        + 'read it. The invincibility is not a bonus — it is the reason the menu is safe to open, '
        + 'and it is on a much longer leash than the key itself.',
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
        magic:
          'Ultimate Evolutions opens a fifth row under each column — one capstone per path, and you '
          + 'may only ever own one of the three on a body in a match. It is the point where a Growth '
          + 'build stops being a stat sheet and starts being a different element.',
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
      magic:
        'A hard triangular capsid hurled overhead and driven down at the target. The impact damage '
        + 'is almost beside the point: what it really does is convert a fighter into a dispenser, '
        + 'so that for the next eight seconds the ground under them keeps filling with more of the '
        + 'same.',
      cast: 'R, thrown at the cursor with an overhead slam. Instant.',
      effects: [
        { tag: 'damage', label: 'Impact', detail: '10 damage within 20px. Viral Spikes adds +2 per tier.' },
        { tag: 'utility', label: 'Flight', detail: '430 px/s, spinning, dying after 2s.' },
        { tag: 'dot', label: 'Infection', detail: '8s. The victim expels 3 floor viruses every 2s — 12 in total.' },
        { tag: 'damage', label: 'Floor viruses', detail: '6 damage each within 16px, lying there for 12s. Viral Spikes adds +2 per tier here too.' },
        { tag: 'utility', label: 'Availability', detail: '8s cooldown.' },
      ],
      upgrade: {
        magic:
          'Kind Strain says not everything a sick body sheds is hostile. Half of what an infected '
          + 'enemy coughs up comes out green — a healthy strain nobody but you can pick up, which '
          + 'turns their infection into your medicine cabinet.',
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
      magic:
        'Five living pods sprayed out one after another into a wall. They are not a shield on you — '
        + 'they are bodies in the world with their own health, and they get *stronger* while they '
        + 'stand there, thickening for five seconds before they finally rot. Nothing else in the '
        + 'game builds cover that grows.',
      cast: 'F, sprayed toward the cursor. Pods land 130ms apart, so the wall assembles rather than appearing.',
      effects: [
        { tag: 'summon', label: 'The wall', detail: '5 spores, each 50 HP at planting. Gut Bacteria adds +1 spore per tier, to 8.' },
        { tag: 'shield', label: 'Blocking', detail: 'Each spore blocks projectiles and physically blocks bodies, out to 20px beyond its drawn radius.' },
        { tag: 'buff', label: 'Maturing', detail: '+10 max HP and HP per second for the first 5s — a mature spore is 100 HP. Gut Bacteria adds +5/s per tier on top.' },
        { tag: 'utility', label: 'Lifetime', detail: '10s each, then they fade. There is a hard cap of 24 spores in play.' },
        { tag: 'utility', label: 'Availability', detail: '15s cooldown — the longest non-ultimate in the kit.' },
      ],
      upgrade: {
        magic:
          'Spore Cloud lets a fully grown pod reproduce. A wall that survives its own maturation '
          + 'starts seeding neighbours, so cover you planted once can still be spreading half a '
          + 'minute later.',
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
      magic:
        'The ultimate is a second self. A nest is planted at the cursor and fills — visibly, at a '
        + 'fixed rate — until it hatches a whole other Growth fighter with its own health bar, its '
        + 'own upgrade tree and its own AI. From then on SPACE is not a dodge; it is which of the '
        + 'two bodies you are looking out of.',
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
        magic:
          'Mutation stops the clones being copies. Each one hatches with a visible strain — a colour '
          + 'you can read at a glance — and that strain travels with the body, so switching into it '
          + 'switches what you are as well as where you are.',
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
      magic:
        'The infection stops being an eight-second inconvenience and becomes an outbreak that keeps '
        + 'itself alive. Hosts shed faster and for longer, and the things they shed are infectious '
        + 'in their own right — so one Virus cast into a crowd never really finishes.',
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
      magic:
        'Two mutations nobody planned for. Every time you load in, two entries from a hidden pool of '
        + 'nine are unlocked in your Evolve menu — they are offers rather than grants, they cost more '
        + 'than anything else in the tree, and once bought they cannot be sold back.',
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
      magic:
        'A needle rather than a microbe: small, extremely fast, and completely harmless on impact. '
        + 'What it leaves is Sickness — a ten-second illness that does nothing dramatic on its own '
        + 'and opens an entire second upgrade tree to make it dramatic. Binding this doubles the '
        + 'size of the element.',
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
