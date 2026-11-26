/**
 * The dossier line every element card prints: what the class *is*, and how much it asks
 * of the person playing it.
 *
 * The selection screens used to say nothing about an element except its name and a glyph,
 * which meant the only way to find out that Conquest is a real-time strategy board or that
 * Chalk wants you to draw with the mouse was to lose a match to it. One table, read by the
 * card grid, so a roster of fifty reads as fifty distinct characters rather than fifty
 * coloured circles.
 *
 * `complexity` is a 1–5 star rating of *demand on the player*, not power:
 *
 *   1  five keys, no resource, no timing — press them and they work
 *   2  one bar or one stance to keep an eye on
 *   3  a resource economy or a board of placed objects to maintain
 *   4  two interacting systems, or a form that changes what every key does
 *   5  a whole second game running alongside the fight
 */
export interface ElementProfile {
  /**
   * Two or three words naming the archetype, printed over the element's name. Uppercased
   * at draw time, so write it in caps here only where the word genuinely is one.
   */
  archetype: string;
  /** One sentence of class fantasy. Kept short — it is set at 10px in a 150px column. */
  blurb: string;
  /** 1–5. See the scale above. */
  complexity: number;
}

export const ELEMENT_PROFILES: Record<string, ElementProfile> = {
  // ── The base five ───────────────────────────────────────────────────
  fire: {
    archetype: 'Glass Cannon',
    blurb: 'Rush-down brawler with the fastest damage in the game — just do not cook yourself doing it.',
    complexity: 1,
  },
  water: {
    archetype: 'All-Rounder',
    blurb: 'All-rounder with reach, slows and speed — the clean place to learn the game.',
    complexity: 1,
  },
  life: {
    archetype: 'Gardener',
    blurb: 'Defensive summoner who fights from behind a garden that takes the hits for you.',
    complexity: 2,
  },
  air: {
    archetype: 'Assassin',
    blurb: 'Stealth assassin who hides, waits, and puts everything into one stab.',
    complexity: 3,
  },
  earth: {
    archetype: 'Worldshaper',
    blurb: 'Sturdy zone mage who shields up and reshapes the arena to suit.',
    complexity: 3,
  },

  // ── Combined ────────────────────────────────────────────────────────
  oil: {
    archetype: 'Commander',
    blurb: 'Setup commander who covers the field in drones and oil, then cashes it all in.',
    complexity: 3,
  },
  shadow: {
    archetype: 'Stalker',
    blurb: 'Trap-laying stalker whose every hit stacks the same curse on one victim.',
    complexity: 2,
  },
  ice: {
    archetype: 'Controller',
    blurb: 'Defensive controller who slows them by degrees until they freeze solid.',
    complexity: 2,
  },
  growth: {
    archetype: 'Spreader',
    blurb: 'Damage-over-time spreader — infect them once and let it grow.',
    complexity: 3,
  },
  crystal: {
    archetype: 'Trickster',
    blurb: 'Trick-shot mage who banks lasers off crystals while clones copy the shot.',
    complexity: 3,
  },
  soul: {
    archetype: 'Necromancer',
    blurb: 'Backline necromancer who raises the dead to hold the front.',
    complexity: 3,
  },
  hunt: {
    archetype: 'Dual Form',
    blurb: 'Ranged hunter who turns into a melee beast on a timer, like it or not.',
    complexity: 4,
  },
  // The element id `sand` is Time; `dune` below is the actual sand element.
  sand: {
    archetype: 'Gunslinger',
    blurb: 'Six-shot gunslinger with a habit of rewinding and stopping time.',
    complexity: 4,
  },
  gravity: {
    archetype: 'Siege',
    blurb: 'Slow siege caster — huge hits that land late, so aim where they will be.',
    complexity: 3,
  },
  creation: {
    archetype: 'Artisan',
    blurb: 'Zoning artisan who walls the arena off and fights inside the workshop.',
    complexity: 4,
  },

  // ── Abstract ────────────────────────────────────────────────────────
  electricity: {
    archetype: 'Battery',
    blurb: 'Risk-reward burst mage who hurts themselves to charge one huge discharge.',
    complexity: 3,
  },
  // `slime` is Venom (it was Acid) — the id kept the old name through both reworks.
  slime: {
    archetype: 'Plague Doctor',
    blurb: 'Debuff specialist who picks a poison and makes it last far too long.',
    complexity: 4,
  },
  fate: {
    archetype: 'Gambler',
    blurb: 'Luck-based gambler playing a hand of cards you never quite choose.',
    complexity: 3,
  },
  sound: {
    archetype: 'Drum Major',
    blurb: 'Rhythm fighter who hits harder the better you keep time.',
    complexity: 4,
  },
  light: {
    archetype: 'Racer',
    blurb: 'High-speed racer who drives instead of walks and rams whatever is in the way.',
    complexity: 4,
  },

  // ── Abstract combined ───────────────────────────────────────────────
  magnet: {
    archetype: 'Scrapper',
    blurb: 'Setup scrapper who litters the floor with metal, then launches it all at once.',
    complexity: 4,
  },
  metal: {
    archetype: 'Bleeder',
    blurb: 'Blood-fuelled bruiser whose health bar is also the ammunition.',
    complexity: 3,
  },
  plasma: {
    archetype: 'Wildcard',
    blurb: 'Chaotic wildcard — everything you make can kill you too.',
    complexity: 4,
  },
  gunpowder: {
    archetype: 'Arsenal',
    blurb: 'Scaling gunner with an arsenal that grows all match, and the recoil to match.',
    complexity: 3,
  },
  echo: {
    archetype: 'Sonar',
    blurb: 'Half-blind tracker who finds the enemy by sound.',
    complexity: 4,
  },
  rubber: {
    archetype: 'Bouncer',
    blurb: 'Wall-bouncing skirmisher who reflects shots and never stops moving.',
    complexity: 3,
  },
  magic: {
    archetype: 'Scholar',
    blurb: 'Brainy caster who fights with typed sums and graphs. Bring your arithmetic.',
    complexity: 5,
  },
  technology: {
    archetype: 'Saboteur',
    blurb: 'Disruptive saboteur who attacks the enemy’s screen as much as their body.',
    complexity: 4,
  },
  silence: {
    archetype: 'Slasher',
    blurb: 'Horror slasher who feeds on the enemy’s fear, then becomes it.',
    complexity: 5,
  },
  subterfuge: {
    archetype: 'Thief',
    blurb: 'Crooked boss who buys a crew with dirty money and steals the enemy’s ultimate.',
    complexity: 4,
  },

  // ── Divine ──────────────────────────────────────────────────────────
  justice: {
    archetype: 'Magistrate',
    blurb: 'Stance fighter with a ground kit and an air kit sharing one Willpower bar.',
    complexity: 5,
  },
  dream: {
    archetype: 'Sandman',
    blurb: 'Twin-pistol skirmisher who puts the enemy to sleep and fights in their dream.',
    complexity: 4,
  },

  // ── Finale ──────────────────────────────────────────────────────────
  quantum: {
    archetype: 'Entangled',
    blurb: 'Mix-and-match hybrid built from five abilities of five other elements.',
    complexity: 5,
  },

  // ── Unstable ────────────────────────────────────────────────────────
  radiation: {
    archetype: 'Sniper',
    blurb: 'Patient sniper who marks a target and waits for the one big shot.',
    complexity: 4,
  },
  depths: {
    archetype: 'Angler',
    blurb: 'Patient summoner — hold your ground and the sea hands you weapons.',
    complexity: 4,
  },
  psychic: {
    archetype: 'Grandmaster',
    blurb: 'Positional strategist who buffs up with chess pieces and sees attacks early.',
    complexity: 5,
  },
  ruin: {
    archetype: 'Disabler',
    blurb: 'Lockdown disabler who takes the enemy’s abilities away one by one.',
    complexity: 4,
  },
  tempest: {
    archetype: 'Storm Acrobat',
    blurb: 'Airborne knockback brawler who throws the enemy into walls.',
    complexity: 5,
  },
  myth: {
    archetype: 'Legend',
    blurb: 'Showman who wins over the crowd and spends its favour on bigger second acts.',
    complexity: 5,
  },
  marrow: {
    archetype: 'Immune System',
    blurb: 'Resource-managing summoner whose immune system does the fighting.',
    complexity: 4,
  },
  cloth: {
    archetype: 'Tailor',
    blurb: 'Legless grappler who hauls around on a scarf and fights with needles.',
    complexity: 5,
  },
  magma: {
    archetype: 'Buccaneer',
    blurb: 'Hard-drinking pirate gunner who puts off the damage taken and pays for it later.',
    complexity: 4,
  },
  chalk: {
    archetype: 'Painter',
    blurb: 'Draw-it-yourself artist — you paint your attacks with the mouse.',
    complexity: 5,
  },
  wax: {
    archetype: 'Apiarist',
    blurb: 'Fencing beekeeper who builds a hive that pays every bee back with interest.',
    complexity: 4,
  },
  clay: {
    archetype: 'Shaper',
    blurb: 'Puppeteer who fights through an unkillable golem on the cursor.',
    complexity: 5,
  },
  paper: {
    archetype: 'Storyteller',
    blurb: 'Stance-swapping storyteller with three spellbooks, one open at a time.',
    complexity: 4,
  },
  bind: {
    archetype: 'Soul Binder',
    blurb: 'Cursed drain-tank who feeds on lost souls only they can see.',
    complexity: 4,
  },
  // `dune` is Sand; `sand` above is Time.
  dune: {
    archetype: 'Terraformer',
    blurb: 'Terrain controller on a live sand floor — bury them or walk beneath it.',
    complexity: 4,
  },

  // ── The Vault ───────────────────────────────────────────────────────
  illusion: {
    archetype: 'Phantom',
    blurb: 'Evasive trickster who fills the air with fakes and is never where they look.',
    complexity: 3,
  },
  conquest: {
    archetype: 'Standard-Bearer',
    blurb: 'Army commander who raises knights and wins by playing on everyone’s feelings.',
    complexity: 3,
  },
  passion: {
    archetype: 'Priest',
    blurb: 'Pacifist priest who deals no damage — fill them with faith and they convert.',
    complexity: 3,
  },
  death: {
    archetype: 'Duellist',
    blurb: 'Counter-fencer who wins entirely off the enemy’s mistakes.',
    complexity: 4,
  },
  // `fortune` is Gold — the alchemist replaced the shopkeeper and kept the id.
  fortune: {
    archetype: 'Alchemist',
    blurb: 'Economy scaler who turns the arena into gold and buys their own power.',
    complexity: 4,
  },
  // `gum` is Savor — Acid/Venom holds the `slime` id.
  gum: {
    archetype: 'Shapeshifter',
    blurb: 'Two-form shapeshifter who flips between Sugar and Salt and snacks on buffs.',
    complexity: 5,
  },
  gluttony: {
    archetype: 'Juggernaut',
    blurb: 'Slow juggernaut who stacks extra health and outlasts everyone.',
    complexity: 4,
  },
  ink: {
    archetype: 'Trickster',
    blurb: 'Slapstick prankster with finger guns, banana peels and a falling anvil.',
    complexity: 3,
  },
  pressure: {
    archetype: 'Charger',
    blurb: 'Charge fighter — hold keys to build pressure, release to spend it.',
    complexity: 3,
  },
  memory: {
    archetype: 'Haunter',
    blurb: 'Psychological haunter who piles on guilt and steals the enemy’s cooldowns.',
    complexity: 4,
  },
  string: {
    archetype: 'Weaver',
    blurb: 'Web-building trapper who strings up the arena and sends spiders along it.',
    complexity: 4,
  },
  astra: {
    archetype: 'Ascendant',
    blurb: 'Growing giant who gathers mass until they become a black hole.',
    complexity: 5,
  },
};

/**
 * The profile for an element id.
 *
 * Falls back rather than throwing: the campaign's corrupt realm fields display-only
 * opponents that were never on the roster, and a missing dossier must not blank a card.
 */
export function getElementProfile(id: string): ElementProfile {
  return ELEMENT_PROFILES[id] ?? {
    archetype: 'Unknown',
    blurb: 'Growing giant who gathers mass until they become a black hole.',
    complexity: 3,
  };
}
