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
    blurb: 'Long slashes, slowing puddles and a speed pad. The clean place to learn the game from.',
    complexity: 1,
  },
  life: {
    archetype: 'Gardener',
    blurb: 'Plant a garden and fight from behind it. Your seeds take the hits so you never have to.',
    complexity: 2,
  },
  air: {
    archetype: 'Skirmisher',
    blurb: 'Fans, spins and a grapple hook. Never stands still, and banks a dodge off every hit that lands.',
    complexity: 2,
  },
  earth: {
    archetype: 'Bulwark',
    blurb: 'Charge the shield, launch the rocks, raise a golem. Slow, heavy, and very hard to move.',
    complexity: 2,
  },

  // ── Combined ────────────────────────────────────────────────────────
  oil: {
    archetype: 'Commander',
    blurb: 'Steer a drone, drop shield generators, and end the round as a train. All setup, then all payoff.',
    complexity: 3,
  },
  shadow: {
    archetype: 'Stalker',
    blurb: 'Tentacles, traps and a black hole, every one of them stacking Hopelessness on the same victim.',
    complexity: 2,
  },
  ice: {
    archetype: 'Controller',
    blurb: 'Frost stacks that end in a full freeze. Turtle up, skate away, then lock them in place.',
    complexity: 2,
  },
  growth: {
    archetype: 'Spreader',
    blurb: 'Infect them and let it do the work. Bacteria, viruses and spore walls that keep getting bigger.',
    complexity: 3,
  },
  crystal: {
    archetype: 'Trickster',
    blurb: 'Place crystals, bank your laser off them, and let two clones fire the same shot back.',
    complexity: 3,
  },
  soul: {
    archetype: 'Necromancer',
    blurb: 'Harvest corpses and raise them. An Amalgam holds the front while you keep well out of it.',
    complexity: 3,
  },
  hunt: {
    archetype: 'Dual Form',
    blurb: 'A hunter by choice and a beast by the clock. Two whole kits, and one of them takes the controls.',
    complexity: 4,
  },
  // The element id `sand` is Time; `dune` below is the actual sand element.
  sand: {
    archetype: 'Gunslinger',
    blurb: 'Six chambered rounds, a lasso that drags them back through time, and a noon that stops it dead.',
    complexity: 4,
  },
  gravity: {
    archetype: 'Siege',
    blurb: 'Pull meteors out of the sky and slam them into the floor. Everything you throw lands late.',
    complexity: 3,
  },
  creation: {
    archetype: 'Artisan',
    blurb: 'Fan daggers, wall the arena off, and turn the whole stage into your workshop for thirty seconds.',
    complexity: 4,
  },

  // ── Abstract ────────────────────────────────────────────────────────
  electricity: {
    archetype: 'Battery',
    blurb: 'Hurt yourself to charge kinetic power, then spend the whole bar in one discharge.',
    complexity: 3,
  },
  // `slime` is Acid — the id kept the old name when the element was reworked.
  slime: {
    archetype: 'Zoner',
    blurb: 'Permanent acid pools that never fade, and every ability hits harder while you stand in one.',
    complexity: 3,
  },
  fate: {
    archetype: 'Gambler',
    blurb: 'A six-card hand you never quite choose. Preserve and enchant the ones worth keeping.',
    complexity: 3,
  },
  sound: {
    archetype: 'Performer',
    blurb: 'Play to the rhythm bar, stack hype, and let the boombox carry the rest of your rotation.',
    complexity: 4,
  },
  light: {
    archetype: 'Racer',
    blurb: 'Car mode. Steer, drift, take the ramps, and spear whatever is left on the racing line.',
    complexity: 4,
  },

  // ── Abstract combined ───────────────────────────────────────────────
  magnet: {
    archetype: 'Puller',
    blurb: 'Rods, nails and pulses. Nothing you throw stays where it lands, including their body.',
    complexity: 3,
  },
  metal: {
    archetype: 'Bleeder',
    blurb: 'Blood is your ammunition and your health bar at once. Bleed them, then bleed yourself.',
    complexity: 3,
  },
  plasma: {
    archetype: 'Wildcard',
    blurb: 'Chaos with no favourites — every blade and every zone you make can kill you too.',
    complexity: 4,
  },
  gunpowder: {
    archetype: 'Arsenal',
    blurb: 'An armoury that grows all match. Fire everything at once and get blown backwards doing it.',
    complexity: 3,
  },
  echo: {
    archetype: 'Sonar',
    blurb: 'Fight half blind. Bounce sound off the walls, guess where they are, and read what comes back.',
    complexity: 4,
  },
  rubber: {
    archetype: 'Bouncer',
    blurb: 'Sling yourself off the walls, reflect their shots home, and snap back on the band.',
    complexity: 3,
  },
  magic: {
    archetype: 'Spellbook',
    blurb: 'A wheel of five spells and an anchor to teleport back to. More options than keys.',
    complexity: 3,
  },
  technology: {
    archetype: 'Saboteur',
    blurb: 'Popups, uploads and a drag cursor — you fight their screen as much as their body.',
    complexity: 4,
  },
  silence: {
    archetype: 'Assassin',
    blurb: 'Stealth, stalkers and rituals. Every cast is a setup for a backstab a minute from now.',
    complexity: 5,
  },
  subterfuge: {
    archetype: 'Thief',
    blurb: 'Recalled daggers, bought loyalty, and a stolen ultimate. You fight with their kit, not yours.',
    complexity: 4,
  },

  // ── Divine ──────────────────────────────────────────────────────────
  justice: {
    archetype: 'Magistrate',
    blurb: 'Two full trays — grounded and airborne — and one Willpower bar paying for both of them.',
    complexity: 5,
  },
  dream: {
    archetype: 'Sandman',
    blurb: 'Stack sleepiness, then cash it in. A second body steps out of you for the duel.',
    complexity: 5,
  },

  // ── Finale ──────────────────────────────────────────────────────────
  quantum: {
    archetype: 'Entangled',
    blurb: 'Two bonded elements at once, split across your cooldowns, the arena and every effect you land.',
    complexity: 5,
  },

  // ── Unstable ────────────────────────────────────────────────────────
  radiation: {
    archetype: 'Contaminant',
    blurb: 'Irradiate everything on a ladder of stacks, then leash them to a post and let it climb.',
    complexity: 4,
  },
  depths: {
    archetype: 'Angler',
    blurb: 'Piranhas, algae blooms and a shark. Stand still long enough and the sea hands you a weapon.',
    complexity: 4,
  },
  psychic: {
    archetype: 'Precognitive',
    blurb: 'Every cast is announced before it happens, theirs included. You play two seconds ahead.',
    complexity: 5,
  },
  ruin: {
    archetype: 'Disabler',
    blurb: 'Rust their kit shut. Locks, rot and skewers that take abilities off the board for good.',
    complexity: 4,
  },
  cloth: {
    archetype: 'Tailor',
    blurb: 'Your health bar is a scarf, and the scarf is the hitbox. Build the rest of your kit out of tetrominoes.',
    complexity: 5,
  },
  magma: {
    archetype: 'Dragon',
    blurb: 'Feed the pressure, hatch the egg, become the dragon. Overfill it and the pressure feeds on you.',
    complexity: 4,
  },
  chalk: {
    archetype: 'Artist',
    blurb: 'Draw with the cursor. What you scribble is the ability — its shape, its length, all of it.',
    complexity: 5,
  },
  paper: {
    archetype: 'Storyteller',
    blurb: 'Three storybooks, one open at a time, and a journal that remembers what happened last run.',
    complexity: 4,
  },
  bind: {
    archetype: 'Supplicant',
    blurb: 'Summon, sacrifice, and pray. The idols take your faith and hand back somebody else’s power.',
    complexity: 4,
  },
  // `dune` is Sand; `sand` above is Time.
  dune: {
    archetype: 'Terraformer',
    blurb: 'The floor is a live sand simulation. Bury them, walk beneath it, then glass the whole arena.',
    complexity: 4,
  },

  // ── The Vault ───────────────────────────────────────────────────────
  illusion: {
    archetype: 'Phantom',
    blurb: 'Nothing is where it looks. Veils bend every shot that crosses them, and you blink between corners.',
    complexity: 3,
  },
  conquest: {
    archetype: 'Warlord',
    blurb: 'A real-time strategy board bolted to a duel — income, buildings, soldiers and territory.',
    complexity: 5,
  },
  passion: {
    archetype: 'Charmer',
    blurb: 'Fill their love bar until they cannot bring themselves to swing at you any more.',
    complexity: 3,
  },
  death: {
    archetype: 'Duellist',
    blurb: 'Disarm, riposte, amputate. A fencer’s kit built entirely out of their mistakes.',
    complexity: 4,
  },
  fortune: {
    archetype: 'Tycoon',
    blurb: 'Money is health. Invest it, gamble it, paywall the fight, and buy the win outright.',
    complexity: 4,
  },
  // `gum` is Slime — Acid holds the `slime` id.
  gum: {
    archetype: 'Grabber',
    blurb: 'Your hand is the hitbox. Grab them, ooze across the floor, and zip along your own trails.',
    complexity: 3,
  },
  gluttony: {
    archetype: 'Chef',
    blurb: 'Cook at the grill as the chef, then drop the apron and butcher on a thirty-second clock.',
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
    blurb: 'No dossier on file. Whatever this is, the codex has not caught up with it yet.',
    complexity: 3,
  };
}
