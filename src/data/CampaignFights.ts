import { WORLDS } from './Worlds';
import { ABSTRACT_WORLDS } from './AbstractWorlds';

export interface CampaignFightDef {
  enemyElementId: string;
  difficulty: number;           // 1–5; matches DIFFICULTY_PRESETS in NpcOpponent.ts
  mutations?: string[];         // mutation ids from MUTATIONS in Mutations.ts
  starredMutations?: string[];  // subset of mutations[] that are starred
  /** Bespoke bout title shown in the fight briefing. */
  name?: string;
  /** One line from the opponent, shown under the title. */
  taunt?: string;
}

/**
 * Every bout in the campaign, keyed by node id (`<world>-fight-N` / `<world>-challenge`).
 *
 * ── The curve ──
 * A world's five fights ramp from "no mutation, a step below the world's ceiling" to
 * "two mutations, one starred". The challenge that caps a world always carries a **boss**
 * mutation — one of the four with a real phase 2 (Empyreon, Archfiend, Summoner,
 * Apprehension) — so every world ends on a two-phase fight rather than a tougher rematch.
 *
 * ── Rules the table obeys ──
 * • `clot` never appears — the blood-tree mutation is broken.
 * • A **challenge's** second mutation is never starred. Boss mutations already grant
 *   +50% size and ×2 HP; Hard Mode is the opt-in spike on top, and it stars exactly the
 *   regular mutations, which keeps the base challenge beatable and Hard Mode meaningful.
 * • Challenges never carry `titanic` (its ×3 HP on top of a boss's ×2 makes a slog),
 *   `abyss` (permanent invulnerability), `nuclear` (a kill-clock against double HP) or
 *   `golf` (only the ball can damage — impossible against a boss).
 * • `abyss` and `nuclear` are never starred anywhere: starred Abyss is *permanent*
 *   invulnerability, and starred Nuclear halves an already-tight clock to 30s.
 * • `wither` is never starred: starred Wither ticks every second on an infinitely
 *   stacking DOT *and* disables all healing, which turns any long fight into a loss.
 */
export const CAMPAIGN_FIGHTS: Record<string, CampaignFightDef> = {
  // ═══════════════════════════════════════════════════════════════════
  // NORMAL REALM — Tier 0
  // ═══════════════════════════════════════════════════════════════════

  // ── Fire ──────────────────────────────────────────────────────────
  'fire-fight-1':   { enemyElementId: 'fire',        difficulty: 1, name: 'First Spark',      taunt: 'You call that a flame?' },
  'fire-fight-2':   { enemyElementId: 'electricity', difficulty: 2, name: 'Live Wire',        taunt: 'Feel the current, kindling.',                  mutations: ['molten'] },
  'fire-fight-3':   { enemyElementId: 'oil',         difficulty: 2, name: 'Slick Ground',     taunt: 'One spark and we both go up.',                 mutations: ['molten'] },
  'fire-fight-4':   { enemyElementId: 'plasma',      difficulty: 3, name: 'Unstable Element', taunt: 'I am what fire becomes when it stops caring.',  mutations: ['chaos'] },
  'fire-fight-5':   { enemyElementId: 'air',         difficulty: 3, name: 'Bellows',          taunt: 'I decide how hot you burn.',                    mutations: ['molten'], starredMutations: ['molten'] },
  'fire-challenge': { enemyElementId: 'fire',        difficulty: 3, name: "The Archfiend's Hearth", taunt: 'Kneel in the coals, ember.',              mutations: ['archfiend', 'molten'] },

  // ═══════════════════════════════════════════════════════════════════
  // NORMAL REALM — Tier 1
  // ═══════════════════════════════════════════════════════════════════

  // ── Water ─────────────────────────────────────────────────────────
  'water-fight-1':   { enemyElementId: 'water',   difficulty: 2, name: 'Tide Pool',    taunt: 'Nothing drowns quietly.' },
  'water-fight-2':   { enemyElementId: 'ice',     difficulty: 2, name: 'Cold Front',   taunt: 'Water that stopped forgiving.',             mutations: ['titanic'] },
  'water-fight-3':   { enemyElementId: 'crystal', difficulty: 3, name: 'Reef Break',   taunt: 'Every current cuts stone eventually.',      mutations: ['encroach'] },
  'water-fight-4':   { enemyElementId: 'slime',   difficulty: 3, name: 'The Undertow', taunt: 'Down here, light is a rumour.',             mutations: ['abyss'] },
  'water-fight-5':   { enemyElementId: 'growth',  difficulty: 3, name: 'Red Bloom',    taunt: 'The water feeds me. You just float in it.', mutations: ['parasitic', 'blustery'], starredMutations: ['parasitic'] },
  'water-challenge': { enemyElementId: 'water',   difficulty: 4, name: 'Leviathan',    taunt: 'The deep has been waiting a long time.',    mutations: ['summoner', 'encroach'] },

  // ── Life ──────────────────────────────────────────────────────────
  'life-fight-1':   { enemyElementId: 'life',   difficulty: 2, name: 'First Sprout',      taunt: 'Everything green wants your place in the sun.' },
  'life-fight-2':   { enemyElementId: 'growth', difficulty: 2, name: 'Overgrowth',        taunt: 'I only need a crack to start.',         mutations: ['parasitic'] },
  'life-fight-3':   { enemyElementId: 'hunt',   difficulty: 3, name: 'Culling Season',    taunt: 'Something is always hungrier.',         mutations: ['blustery'] },
  'life-fight-4':   { enemyElementId: 'soul',   difficulty: 3, name: 'Root and Rot',      taunt: 'Life is just rot with better timing.',  mutations: ['wither'] },
  'life-fight-5':   { enemyElementId: 'earth',  difficulty: 3, name: 'The Old Grove',     taunt: 'I was here before you had a name.',     mutations: ['titanic', 'parasitic'], starredMutations: ['parasitic'] },
  'life-challenge': { enemyElementId: 'life',   difficulty: 4, name: 'The Verdant Crown', taunt: 'Bloom, or be mulch.',                   mutations: ['empyreon', 'parasitic'] },

  // ── Air ───────────────────────────────────────────────────────────
  'air-fight-1':   { enemyElementId: 'air',         difficulty: 2, name: 'Draft',          taunt: "You can't punch what you can't hold." },
  'air-fight-2':   { enemyElementId: 'sound',       difficulty: 2, name: 'Whistle',        taunt: "Listen. That's the last thing you'll do.", mutations: ['blustery'] },
  'air-fight-3':   { enemyElementId: 'shadow',      difficulty: 3, name: 'Nightwind',      taunt: 'The dark moves faster than you look.',     mutations: ['phantom'] },
  'air-fight-4':   { enemyElementId: 'electricity', difficulty: 3, name: 'Storm Front',    taunt: 'Every storm starts as a breeze.',          mutations: ['blustery'],          starredMutations: ['blustery'] },
  'air-fight-5':   { enemyElementId: 'gravity',     difficulty: 3, name: 'The Jet Stream', taunt: 'Up is a suggestion.',                      mutations: ['order', 'blustery'], starredMutations: ['blustery'] },
  'air-challenge': { enemyElementId: 'air',         difficulty: 4, name: 'The Eye',        taunt: 'There is no wind in here. That should frighten you.', mutations: ['apprehension', 'blustery'] },

  // ── Earth ─────────────────────────────────────────────────────────
  'earth-fight-1':   { enemyElementId: 'earth',    difficulty: 2, name: 'Bedrock',           taunt: 'Move me.' },
  'earth-fight-2':   { enemyElementId: 'crystal',  difficulty: 2, name: 'The Vein',          taunt: 'Pressure makes better things than you.',       mutations: ['titanic'] },
  'earth-fight-3':   { enemyElementId: 'metal',    difficulty: 3, name: 'The Forge Below',   taunt: 'Rock learns. Then it sharpens.',               mutations: ['order'] },
  'earth-fight-4':   { enemyElementId: 'gravity',  difficulty: 3, name: 'Deep Pressure',     taunt: "Everything falls. You're just slow about it.",  mutations: ['titanic'],           starredMutations: ['titanic'] },
  'earth-fight-5':   { enemyElementId: 'creation', difficulty: 3, name: 'The Mason',         taunt: 'I build. You are raw material.',               mutations: ['tinker', 'titanic'], starredMutations: ['titanic'] },
  'earth-challenge': { enemyElementId: 'earth',    difficulty: 4, name: 'The Mountain King', taunt: 'Mountains do not negotiate.',                  mutations: ['summoner', 'pain'] },

  // ═══════════════════════════════════════════════════════════════════
  // NORMAL REALM — Tier 2
  // ═══════════════════════════════════════════════════════════════════

  // ── Oil ───────────────────────────────────────────────────────────
  'oil-fight-1':   { enemyElementId: 'oil',        difficulty: 3, name: 'Slick',         taunt: 'Try to keep your footing.' },
  'oil-fight-2':   { enemyElementId: 'fire',       difficulty: 3, name: 'Flashpoint',    taunt: 'We were always going to burn together.', mutations: ['molten'] },
  'oil-fight-3':   { enemyElementId: 'technology', difficulty: 4, name: 'Refinery',      taunt: "Machines run on what's left of you.",    mutations: ['tinker'] },
  'oil-fight-4':   { enemyElementId: 'gunpowder',  difficulty: 4, name: 'Fuse and Fuel', taunt: 'Sixty seconds. Impress me.',             mutations: ['nuclear'] },
  'oil-fight-5':   { enemyElementId: 'shadow',     difficulty: 4, name: 'Black Tide',    taunt: 'Oil holds the dark better than water.',  mutations: ['phantom', 'molten'], starredMutations: ['phantom'] },
  'oil-challenge': { enemyElementId: 'oil',        difficulty: 5, name: 'The Derrick',   taunt: 'Everything you love is fuel.',           mutations: ['archfiend', 'molten'] },

  // ── Ice ───────────────────────────────────────────────────────────
  'ice-fight-1':   { enemyElementId: 'ice',     difficulty: 3, name: 'First Frost',     taunt: "Stand still. It's easier." },
  'ice-fight-2':   { enemyElementId: 'water',   difficulty: 3, name: 'Glacier',         taunt: 'Slow is not the same as safe.',    mutations: ['titanic'] },
  'ice-fight-3':   { enemyElementId: 'crystal', difficulty: 4, name: 'The Shelf',       taunt: "It's already cracking under you.", mutations: ['encroach'] },
  'ice-fight-4':   { enemyElementId: 'silence', difficulty: 4, name: 'Whiteout',        taunt: 'No one hears anything out here.',  mutations: ['abyss'] },
  'ice-fight-5':   { enemyElementId: 'air',     difficulty: 4, name: 'Blizzard',        taunt: 'The cold gets in eventually.',     mutations: ['blustery', 'titanic'], starredMutations: ['blustery'] },
  'ice-challenge': { enemyElementId: 'ice',     difficulty: 5, name: 'The Long Winter', taunt: 'Nothing thaws.',                   mutations: ['apprehension', 'wither'] },

  // ── Growth ────────────────────────────────────────────────────────
  'growth-fight-1':   { enemyElementId: 'growth', difficulty: 3, name: 'Petri',        taunt: 'Multiply or die.' },
  'growth-fight-2':   { enemyElementId: 'slime',  difficulty: 3, name: 'Culture',      taunt: "I've been growing since you walked in.", mutations: ['parasitic'] },
  'growth-fight-3':   { enemyElementId: 'life',   difficulty: 4, name: 'Blight',       taunt: 'Green things go grey around me.',        mutations: ['wither'] },
  'growth-fight-4':   { enemyElementId: 'soul',   difficulty: 4, name: 'Contagion',    taunt: "You're already carrying it.",            mutations: ['parasitic'],          starredMutations: ['parasitic'] },
  'growth-fight-5':   { enemyElementId: 'water',  difficulty: 4, name: 'The Pool',     taunt: 'Every drop is a nursery.',               mutations: ['wither', 'blustery'], starredMutations: ['blustery'] },
  'growth-challenge': { enemyElementId: 'growth', difficulty: 5, name: 'Patient Zero', taunt: 'You will be the next colony.',           mutations: ['summoner', 'parasitic'] },

  // ── Crystal ───────────────────────────────────────────────────────
  'crystal-fight-1':   { enemyElementId: 'crystal', difficulty: 3, name: 'Geode',              taunt: 'Beautiful things cut deepest.' },
  'crystal-fight-2':   { enemyElementId: 'earth',   difficulty: 3, name: 'Pressure Chamber',   taunt: 'You have never been squeezed properly.',  mutations: ['titanic'] },
  'crystal-fight-3':   { enemyElementId: 'light',   difficulty: 4, name: 'Refraction',         taunt: "You're aiming at where I'm not.",         mutations: ['order'] },
  'crystal-fight-4':   { enemyElementId: 'ice',     difficulty: 4, name: 'Lattice',            taunt: 'The floor is a trap. So is the ceiling.',  mutations: ['encroach'],         starredMutations: ['encroach'] },
  'crystal-fight-5':   { enemyElementId: 'magnet',  difficulty: 4, name: 'The Resonant Vault', taunt: 'Every facet knows where you are.',        mutations: ['order', 'titanic'], starredMutations: ['order'] },
  'crystal-challenge': { enemyElementId: 'crystal', difficulty: 5, name: 'The Prism Throne',   taunt: 'Light bends for me. You will too.',       mutations: ['empyreon', 'phantom'] },

  // ── Hunt ──────────────────────────────────────────────────────────
  'hunt-fight-1':   { enemyElementId: 'hunt',      difficulty: 3, name: 'The Scent',        taunt: "You've already been tracked for an hour." },
  'hunt-fight-2':   { enemyElementId: 'life',      difficulty: 3, name: 'Flush the Quarry', taunt: "Run. It's more fun that way.",           mutations: ['blustery'] },
  'hunt-fight-3':   { enemyElementId: 'shadow',    difficulty: 4, name: 'Night Stalk',      taunt: "I don't need to see you.",               mutations: ['phantom'] },
  'hunt-fight-4':   { enemyElementId: 'gunpowder', difficulty: 4, name: 'The Blind',        taunt: 'One shot is plenty.',                    mutations: ['order'] },
  'hunt-fight-5':   { enemyElementId: 'soul',      difficulty: 4, name: 'The Pack',         taunt: 'We are never alone.',                    mutations: ['amber', 'blustery'], starredMutations: ['blustery'] },
  'hunt-challenge': { enemyElementId: 'hunt',      difficulty: 5, name: 'Apex',             taunt: 'Something hunts the hunters. Meet it.',  mutations: ['apprehension', 'amber'] },

  // ── Soul ──────────────────────────────────────────────────────────
  'soul-fight-1':   { enemyElementId: 'soul',    difficulty: 3, name: 'Wisp',          taunt: "You're louder than the dead." },
  'soul-fight-2':   { enemyElementId: 'shadow',  difficulty: 3, name: 'Grave Chill',   taunt: 'Everything you spend is gone for good.', mutations: ['wither'] },
  'soul-fight-3':   { enemyElementId: 'silence', difficulty: 4, name: 'The Vigil',     taunt: 'The quiet ones remember most.',          mutations: ['phantom'] },
  'soul-fight-4':   { enemyElementId: 'life',    difficulty: 4, name: 'Tether',        taunt: 'Your warmth was always a loan.',         mutations: ['parasitic'],         starredMutations: ['parasitic'] },
  'soul-fight-5':   { enemyElementId: 'sand',    difficulty: 4, name: 'The Long Wake', taunt: "Time doesn't heal. It files it away.",   mutations: ['wither', 'phantom'], starredMutations: ['phantom'] },
  'soul-challenge': { enemyElementId: 'soul',    difficulty: 5, name: 'The Ferryman',  taunt: 'Everyone pays. Some pay twice.',         mutations: ['summoner', 'wither'] },

  // ── Shadow ────────────────────────────────────────────────────────
  'shadow-fight-1':   { enemyElementId: 'shadow',  difficulty: 3, name: 'First Dark',            taunt: 'Turn the light off. Please.' },
  'shadow-fight-2':   { enemyElementId: 'silence', difficulty: 3, name: 'Hush',                  taunt: 'No one is coming.',                 mutations: ['phantom'] },
  'shadow-fight-3':   { enemyElementId: 'air',     difficulty: 4, name: 'Cold Draft',            taunt: 'Something just moved behind you.',  mutations: ['blustery'] },
  'shadow-fight-4':   { enemyElementId: 'soul',    difficulty: 4, name: 'Hopelessness',          taunt: 'Stop swinging. It never mattered.', mutations: ['abyss'] },
  'shadow-fight-5':   { enemyElementId: 'quantum', difficulty: 4, name: 'The Long Con',          taunt: "You've been fighting a shape.",     mutations: ['phantom', 'wither'], starredMutations: ['phantom'] },
  'shadow-challenge': { enemyElementId: 'shadow',  difficulty: 5, name: 'The Thing In The Maze', taunt: 'Do not look for me. Just wait.',    mutations: ['apprehension', 'phantom'] },

  // ── Creation ──────────────────────────────────────────────────────
  'creation-fight-1':   { enemyElementId: 'creation',   difficulty: 3, name: 'The Workshop',     taunt: 'I made better than you before breakfast.' },
  'creation-fight-2':   { enemyElementId: 'technology', difficulty: 3, name: 'Assembly Line',    taunt: "Turrets don't get tired.",        mutations: ['tinker'] },
  'creation-fight-3':   { enemyElementId: 'metal',      difficulty: 4, name: 'Forgework',        taunt: 'Iron first. Then you.',           mutations: ['titanic'] },
  'creation-fight-4':   { enemyElementId: 'earth',      difficulty: 4, name: 'The Foundry',      taunt: 'Build. Break. Build again.',      mutations: ['tinker'],          starredMutations: ['tinker'] },
  'creation-fight-5':   { enemyElementId: 'magic',      difficulty: 4, name: 'The Grand Design', taunt: 'Every piece is already placed.',  mutations: ['order', 'tinker'], starredMutations: ['order'] },
  'creation-challenge': { enemyElementId: 'creation',   difficulty: 5, name: 'The Architect',    taunt: 'I drew this room. And your exit.', mutations: ['empyreon', 'tinker'] },

  // ── Gravity ───────────────────────────────────────────────────────
  'gravity-fight-1':   { enemyElementId: 'gravity', difficulty: 3, name: 'Downward',          taunt: 'Everything comes to me.' },
  'gravity-fight-2':   { enemyElementId: 'earth',   difficulty: 3, name: 'Terminal Velocity', taunt: 'The ground always wins.', mutations: ['titanic'] },
  'gravity-fight-3':   { enemyElementId: 'sand',    difficulty: 4, name: 'Event Horizon',     taunt: "You're already late.",    mutations: ['order'] },
  'gravity-fight-4':   { enemyElementId: 'magnet',  difficulty: 4, name: 'The Well',          taunt: 'Pull is just patience.',  mutations: ['titanic'],        starredMutations: ['titanic'] },
  'gravity-fight-5':   { enemyElementId: 'plasma',  difficulty: 4, name: 'Collapse',          taunt: 'Stars end like this.',    mutations: ['chaos', 'order'], starredMutations: ['order'] },
  'gravity-challenge': { enemyElementId: 'gravity', difficulty: 5, name: 'Singularity',       taunt: 'Nothing leaves.',         mutations: ['empyreon', 'order'] },

  // ── Time (world id `sand`) ────────────────────────────────────────
  'sand-fight-1':   { enemyElementId: 'sand',    difficulty: 3, name: 'The Hourglass',      taunt: 'You have less than you think.' },
  'sand-fight-2':   { enemyElementId: 'crystal', difficulty: 3, name: 'Countdown',          taunt: 'Tick.',                             mutations: ['nuclear'] },
  'sand-fight-3':   { enemyElementId: 'gravity', difficulty: 4, name: 'Dilation',           taunt: 'I moved twice while you blinked.',  mutations: ['order'] },
  'sand-fight-4':   { enemyElementId: 'echo',    difficulty: 4, name: 'Rewind',             taunt: "We've done this before.",           mutations: ['phantom'] },
  'sand-fight-5':   { enemyElementId: 'soul',    difficulty: 4, name: 'The Last Grain',     taunt: 'Sixty seconds. Be interesting.',    mutations: ['nuclear', 'order'], starredMutations: ['order'] },
  'sand-challenge': { enemyElementId: 'sand',    difficulty: 5, name: 'The Endless Minute', taunt: 'I will outlast you by definition.', mutations: ['apprehension', 'order'] },

  // ═══════════════════════════════════════════════════════════════════
  // ABSTRACT REALM — Tier 0
  // ═══════════════════════════════════════════════════════════════════

  // ── Electricity ───────────────────────────────────────────────────
  'electricity-fight-1':   { enemyElementId: 'electricity', difficulty: 3, name: 'Static',          taunt: "Feel that? That's the air deciding." },
  'electricity-fight-2':   { enemyElementId: 'metal',       difficulty: 3, name: 'Conductor',       taunt: 'You are a very good ground.',        mutations: ['order'] },
  'electricity-fight-3':   { enemyElementId: 'magnet',      difficulty: 4, name: 'Polarity',        taunt: 'Push, pull, fall down.',             mutations: ['blustery'] },
  'electricity-fight-4':   { enemyElementId: 'technology',  difficulty: 4, name: 'Grid Fault',      taunt: 'The city runs on this. So do I.',    mutations: ['tinker'] },
  'electricity-fight-5':   { enemyElementId: 'plasma',      difficulty: 4, name: 'Arc Flash',       taunt: "One flash. That's all it takes.",    mutations: ['chaos', 'order'], starredMutations: ['order'] },
  'electricity-challenge': { enemyElementId: 'electricity', difficulty: 4, name: 'The Storm Crown', taunt: 'The sky signed a contract with me.', mutations: ['empyreon', 'order'] },

  // ═══════════════════════════════════════════════════════════════════
  // ABSTRACT REALM — Tier 1
  // ═══════════════════════════════════════════════════════════════════

  // ── Acid (world id `slime`) ───────────────────────────────────────
  'slime-fight-1':   { enemyElementId: 'slime',  difficulty: 3, name: 'First Drip',    taunt: "It only stings for a while. Then it's through." },
  'slime-fight-2':   { enemyElementId: 'growth', difficulty: 4, name: 'Culture Shock', taunt: "Something's living in that burn.", mutations: ['parasitic'] },
  'slime-fight-3':   { enemyElementId: 'water',  difficulty: 4, name: 'Runoff',        taunt: 'Everything downstream dies.',      mutations: ['encroach'] },
  'slime-fight-4':   { enemyElementId: 'oil',    difficulty: 4, name: 'The Sump',      taunt: 'Nothing washes out.',              mutations: ['wither'] },
  'slime-fight-5':   { enemyElementId: 'metal',  difficulty: 5, name: 'Corrosion',     taunt: 'Even steel gives up.',             mutations: ['wither', 'titanic'], starredMutations: ['titanic'] },
  'slime-challenge': { enemyElementId: 'slime',  difficulty: 5, name: 'The Vat',       taunt: "Dissolve. It's cleaner.",          mutations: ['summoner', 'wither'] },

  // ── Fate ──────────────────────────────────────────────────────────
  'fate-fight-1':   { enemyElementId: 'fate',  difficulty: 3, name: 'The Cut',      taunt: "Pick a card. It won't help." },
  'fate-fight-2':   { enemyElementId: 'sand',  difficulty: 4, name: 'The Deadline', taunt: 'Your number was drawn.',                    mutations: ['nuclear'] },
  'fate-fight-3':   { enemyElementId: 'soul',  difficulty: 4, name: 'The Reading',  taunt: 'I saw this hand already.',                  mutations: ['phantom'] },
  'fate-fight-4':   { enemyElementId: 'magic', difficulty: 4, name: 'Stacked Deck', taunt: 'Chance is a story I tell you.',             mutations: ['order'],            starredMutations: ['order'] },
  'fate-fight-5':   { enemyElementId: 'echo',  difficulty: 5, name: 'Three Tricks', taunt: 'First to three. Try to look surprised.',    mutations: ['honor', 'phantom'], starredMutations: ['phantom'] },
  'fate-challenge': { enemyElementId: 'fate',  difficulty: 5, name: 'The Dealer',   taunt: 'The house does not lose. It merely waits.', mutations: ['apprehension', 'honor'] },

  // ── Sound ─────────────────────────────────────────────────────────
  'sound-fight-1':   { enemyElementId: 'sound',      difficulty: 3, name: 'Feedback',      taunt: 'Loud enough yet?' },
  'sound-fight-2':   { enemyElementId: 'echo',       difficulty: 4, name: 'Reverb',        taunt: "You'll hear this again.",            mutations: ['blustery'] },
  'sound-fight-3':   { enemyElementId: 'air',        difficulty: 4, name: 'Shockwave',     taunt: "Air is a weapon when it's angry.",   mutations: ['order'] },
  'sound-fight-4':   { enemyElementId: 'silence',    difficulty: 4, name: 'Dead Air',      taunt: 'Say something. I dare you.',         mutations: ['abyss'] },
  'sound-fight-5':   { enemyElementId: 'technology', difficulty: 5, name: 'The Amp Stack', taunt: 'Turn it up until something breaks.', mutations: ['tinker', 'blustery'], starredMutations: ['blustery'] },
  'sound-challenge': { enemyElementId: 'sound',      difficulty: 5, name: 'The Crescendo', taunt: 'Everything ends on a note.',         mutations: ['empyreon', 'blustery'] },

  // ── Light ─────────────────────────────────────────────────────────
  'light-fight-1':   { enemyElementId: 'light',   difficulty: 3, name: 'Glare',            taunt: "You're squinting already." },
  'light-fight-2':   { enemyElementId: 'crystal', difficulty: 4, name: 'Prism Run',        taunt: "I bend. You don't.",                  mutations: ['order'] },
  'light-fight-3':   { enemyElementId: 'air',     difficulty: 4, name: 'Speed of Light',   taunt: 'You saw me leave. Not arrive.',       mutations: ['blustery'],          starredMutations: ['blustery'] },
  'light-fight-4':   { enemyElementId: 'shadow',  difficulty: 4, name: 'Eclipse',          taunt: 'Even I have a back.',                 mutations: ['abyss'] },
  'light-fight-5':   { enemyElementId: 'magic',   difficulty: 5, name: 'The Lantern Duel', taunt: 'Nothing hides from a straight line.', mutations: ['order', 'blustery'], starredMutations: ['order'] },
  'light-challenge': { enemyElementId: 'light',   difficulty: 5, name: 'Solar Court',      taunt: 'Look up. That was your mistake.',     mutations: ['empyreon', 'chaos'] },

  // ═══════════════════════════════════════════════════════════════════
  // ABSTRACT REALM — Tier 2
  // ═══════════════════════════════════════════════════════════════════

  // ── Magnet ────────────────────────────────────────────────────────
  'magnet-fight-1':   { enemyElementId: 'magnet',      difficulty: 4, name: 'Attraction',    taunt: 'Come here.' },
  'magnet-fight-2':   { enemyElementId: 'metal',       difficulty: 4, name: 'Ferrous',       taunt: 'Your gear belongs to me now.',    mutations: ['titanic'] },
  'magnet-fight-3':   { enemyElementId: 'electricity', difficulty: 4, name: 'Induction',     taunt: 'Move and you power my next hit.', mutations: ['order'] },
  'magnet-fight-4':   { enemyElementId: 'gravity',     difficulty: 5, name: 'The Field',     taunt: 'Two kinds of pull. Same ending.', mutations: ['titanic'],         starredMutations: ['titanic'] },
  'magnet-fight-5':   { enemyElementId: 'technology',  difficulty: 5, name: 'The Rail',      taunt: 'One straight line, very fast.',   mutations: ['tinker', 'order'], starredMutations: ['order'] },
  'magnet-challenge': { enemyElementId: 'magnet',      difficulty: 5, name: 'The Lodestone', taunt: 'North is wherever I say.',        mutations: ['summoner', 'encroach'] },

  // ── Metal ─────────────────────────────────────────────────────────
  'metal-fight-1':   { enemyElementId: 'metal',     difficulty: 4, name: 'Tempering',        taunt: "You're soft. That's fixable. Painfully." },
  'metal-fight-2':   { enemyElementId: 'earth',     difficulty: 4, name: 'Ore Body',         taunt: 'Rock with ambition.',                     mutations: ['titanic'] },
  'metal-fight-3':   { enemyElementId: 'creation',  difficulty: 4, name: 'The Anvil',        taunt: 'Hold still. This is shaping.',            mutations: ['tinker'] },
  'metal-fight-4':   { enemyElementId: 'slime',     difficulty: 5, name: 'Rust',             taunt: 'Everything I am, you will be.',           mutations: ['wither'] },
  'metal-fight-5':   { enemyElementId: 'gunpowder', difficulty: 5, name: 'Barrel and Blade', taunt: 'Steel first. Powder second.',             mutations: ['order', 'titanic'], starredMutations: ['titanic'] },
  'metal-challenge': { enemyElementId: 'metal',     difficulty: 5, name: 'The Iron Legion',  taunt: 'One of me was always enough. Now count.', mutations: ['archfiend', 'tinker'] },

  // ── Plasma ────────────────────────────────────────────────────────
  'plasma-fight-1':   { enemyElementId: 'plasma',      difficulty: 4, name: 'Ionised',          taunt: "This isn't fire. This is after fire." },
  'plasma-fight-2':   { enemyElementId: 'fire',        difficulty: 4, name: 'Overheat',         taunt: 'Cute. Watch this.',                    mutations: ['molten'] },
  'plasma-fight-3':   { enemyElementId: 'electricity', difficulty: 4, name: 'Arc Chaos',        taunt: 'Nothing here obeys anything.',         mutations: ['chaos'] },
  'plasma-fight-4':   { enemyElementId: 'gravity',     difficulty: 5, name: 'Stellar Core',     taunt: 'Pressure and heat. Nothing personal.', mutations: ['chaos'],          starredMutations: ['chaos'] },
  'plasma-fight-5':   { enemyElementId: 'magic',       difficulty: 5, name: 'Pure CHAOS',       taunt: 'There is no plan. There never was.',   mutations: ['chaos', 'order'], starredMutations: ['chaos'] },
  'plasma-challenge': { enemyElementId: 'plasma',      difficulty: 5, name: 'The Unbound Star', taunt: 'I stopped having a shape.',            mutations: ['archfiend', 'chaos'] },

  // ── Rubber ────────────────────────────────────────────────────────
  'rubber-fight-1':   { enemyElementId: 'rubber',  difficulty: 4, name: 'Bounce',        taunt: 'Everything you throw comes back.' },
  'rubber-fight-2':   { enemyElementId: 'oil',     difficulty: 4, name: 'Vulcanised',    taunt: 'Slippery and stubborn.',                       mutations: ['blustery'] },
  'rubber-fight-3':   { enemyElementId: 'rubber',  difficulty: 4, name: 'The Back Nine', taunt: "Hit the ball. It's the only thing I respect.", mutations: ['golf'] },
  'rubber-fight-4':   { enemyElementId: 'gravity', difficulty: 5, name: 'The Slam',      taunt: 'Down, then very much up.',                     mutations: ['titanic'],             starredMutations: ['titanic'] },
  'rubber-fight-5':   { enemyElementId: 'magnet',  difficulty: 5, name: 'Recoil',        taunt: 'Snapped back before you finished.',            mutations: ['blustery', 'titanic'], starredMutations: ['blustery'] },
  'rubber-challenge': { enemyElementId: 'rubber',  difficulty: 5, name: 'Uber-Gear',     taunt: "There's more of me than there is of you.",     mutations: ['summoner', 'blustery'] },

  // ── Gunpowder ─────────────────────────────────────────────────────
  'gunpowder-fight-1':   { enemyElementId: 'gunpowder',  difficulty: 4, name: 'Powder Test',         taunt: "Stand back. Or don't." },
  'gunpowder-fight-2':   { enemyElementId: 'fire',       difficulty: 4, name: 'Ignition',            taunt: 'You brought the spark. Thank you.',      mutations: ['molten'] },
  'gunpowder-fight-3':   { enemyElementId: 'metal',      difficulty: 4, name: 'Musket Line',         taunt: 'Aim, and everything else is paperwork.', mutations: ['order'] },
  'gunpowder-fight-4':   { enemyElementId: 'technology', difficulty: 5, name: 'The Ordinance Clock', taunt: 'Sixty seconds to be a hero.',            mutations: ['nuclear'] },
  'gunpowder-fight-5':   { enemyElementId: 'creation',   difficulty: 5, name: 'Arsenal',             taunt: 'I brought more than I need.',            mutations: ['tinker', 'order'], starredMutations: ['order'] },
  'gunpowder-challenge': { enemyElementId: 'gunpowder',  difficulty: 5, name: 'Final Ordinance',     taunt: 'One last volley. Make it count.',        mutations: ['archfiend', 'order'] },

  // ── Echo ──────────────────────────────────────────────────────────
  'echo-fight-1':   { enemyElementId: 'echo',    difficulty: 4, name: 'First Call',    taunt: 'I heard you three rooms ago.' },
  'echo-fight-2':   { enemyElementId: 'sound',   difficulty: 4, name: 'Return Signal', taunt: 'Everything comes back louder.',        mutations: ['blustery'] },
  'echo-fight-3':   { enemyElementId: 'silence', difficulty: 4, name: 'Dead Zone',     taunt: 'Nothing returns from here.',           mutations: ['abyss'] },
  'echo-fight-4':   { enemyElementId: 'shadow',  difficulty: 5, name: 'Blind Spot',    taunt: "You are the only one who can't see.",  mutations: ['phantom'],           starredMutations: ['phantom'] },
  'echo-fight-5':   { enemyElementId: 'sand',    difficulty: 5, name: 'Reverberation', taunt: 'Which one of these is now?',           mutations: ['phantom', 'wither'], starredMutations: ['phantom'] },
  'echo-challenge': { enemyElementId: 'echo',    difficulty: 5, name: 'The Cavern',    taunt: 'Follow the sound. I made it for you.', mutations: ['apprehension', 'phantom'] },

  // ── Silence ───────────────────────────────────────────────────────
  'silence-fight-1':   { enemyElementId: 'silence', difficulty: 4, name: 'Hush',             taunt: '. . .' },
  'silence-fight-2':   { enemyElementId: 'shadow',  difficulty: 4, name: 'Blackout',         taunt: "Don't run. It hears running.",         mutations: ['phantom'] },
  'silence-fight-3':   { enemyElementId: 'soul',    difficulty: 4, name: 'The Long Hall',    taunt: 'There is a door. There is not a door.', mutations: ['abyss'] },
  'silence-fight-4':   { enemyElementId: 'echo',    difficulty: 5, name: 'Nothing Answers',  taunt: 'You are shouting into a closed room.',  mutations: ['wither'] },
  'silence-fight-5':   { enemyElementId: 'quantum', difficulty: 5, name: 'Vanishing Act',    taunt: 'You will not notice when it starts.',   mutations: ['phantom', 'abyss'], starredMutations: ['phantom'] },
  'silence-challenge': { enemyElementId: 'silence', difficulty: 5, name: 'The Puppetmaster', taunt: 'Your hands were never yours.',          mutations: ['apprehension', 'wither'] },

  // ── Magic ─────────────────────────────────────────────────────────
  'magic-fight-1':   { enemyElementId: 'magic',    difficulty: 4, name: 'Cantrip',         taunt: 'Borrowed power is still power.' },
  'magic-fight-2':   { enemyElementId: 'light',    difficulty: 4, name: 'The Bright Page', taunt: 'I read faster than you cast.',            mutations: ['order'] },
  'magic-fight-3':   { enemyElementId: 'fate',     difficulty: 4, name: 'Sleight',         taunt: 'Watch the other hand.',                   mutations: ['phantom'] },
  'magic-fight-4':   { enemyElementId: 'creation', difficulty: 5, name: 'Grimoire Engine', taunt: 'The book builds itself now.',             mutations: ['tinker'],         starredMutations: ['tinker'] },
  'magic-fight-5':   { enemyElementId: 'plasma',   difficulty: 5, name: 'Wild Surge',      taunt: "I don't know what this one does either.", mutations: ['chaos', 'order'], starredMutations: ['chaos'] },
  'magic-challenge': { enemyElementId: 'magic',    difficulty: 5, name: 'The Archmage',    taunt: 'Every school. All at once.',              mutations: ['empyreon', 'phantom'] },

  // ── Technology ────────────────────────────────────────────────────
  'technology-fight-1':   { enemyElementId: 'technology',  difficulty: 4, name: 'Boot Sequence',      taunt: 'Loading your defeat. 3%.' },
  'technology-fight-2':   { enemyElementId: 'electricity', difficulty: 4, name: 'Overclock',          taunt: 'More cycles than you have thoughts.', mutations: ['order'] },
  'technology-fight-3':   { enemyElementId: 'metal',       difficulty: 4, name: 'Automation',         taunt: 'The turrets file no complaints.',     mutations: ['tinker'] },
  'technology-fight-4':   { enemyElementId: 'magnet',      difficulty: 5, name: 'Server Farm',        taunt: "It scales. You don't.",               mutations: ['tinker'],           starredMutations: ['tinker'] },
  'technology-fight-5':   { enemyElementId: 'gunpowder',   difficulty: 5, name: 'Kill Switch',        taunt: 'Sixty seconds until deprecation.',    mutations: ['nuclear', 'order'], starredMutations: ['order'] },
  'technology-challenge': { enemyElementId: 'technology',  difficulty: 5, name: 'The Swarm Protocol', taunt: 'One instance was never the plan.',    mutations: ['summoner', 'order'] },

  // ── Subterfuge (world id `quantum`) ───────────────────────────────
  'quantum-fight-1':   { enemyElementId: 'quantum',   difficulty: 4, name: 'The Mark',     taunt: "You already paid me. You just don't know." },
  'quantum-fight-2':   { enemyElementId: 'shadow',    difficulty: 4, name: 'The Alley',    taunt: "Nothing personal. It's business.",       mutations: ['phantom'] },
  'quantum-fight-3':   { enemyElementId: 'fate',      difficulty: 4, name: 'The Wager',    taunt: 'First to three. I never lose three.',    mutations: ['honor'] },
  'quantum-fight-4':   { enemyElementId: 'silence',   difficulty: 5, name: 'Smoke Break',  taunt: 'Take your time. I have.',                mutations: ['phantom'],          starredMutations: ['phantom'] },
  'quantum-fight-5':   { enemyElementId: 'gunpowder', difficulty: 5, name: 'The Contract', taunt: "It's signed. You just haven't read it.", mutations: ['honor', 'phantom'], starredMutations: ['honor'] },
  'quantum-challenge': { enemyElementId: 'quantum',   difficulty: 5, name: 'The Kingpin',  taunt: 'You were hired to lose.',                mutations: ['apprehension', 'pain'] },
};

export function getCampaignFightDef(nodeId: string): CampaignFightDef | undefined {
  return CAMPAIGN_FIGHTS[nodeId];
}

export const DIFFICULTY_LABEL: Record<number, string> = {
  1: 'Easy', 2: 'Normal', 3: 'Hard', 4: 'Expert', 5: 'Nightmare',
};

/**
 * Element display info for the campaign UI, derived from the two world tables so a
 * world rename never leaves a fight briefing showing a stale name.
 */
export const ELEMENT_DISPLAY: Record<string, { name: string; emoji: string }> =
  Object.fromEntries(
    [...WORLDS, ...ABSTRACT_WORLDS].map((w) => [w.id, { name: w.name, emoji: w.emoji }]),
  );

// ── Rewards ──────────────────────────────────────────────────────────

/** How deep in the tree a world sits — root 0, its children 1, theirs 2. */
export function getWorldTier(worldId: string): number {
  const all = [...WORLDS, ...ABSTRACT_WORLDS];
  let tier = 0;
  let cur = all.find((w) => w.id === worldId);
  while (cur?.parentId) {
    tier++;
    const parentId = cur.parentId;
    cur = all.find((w) => w.id === parentId);
    if (tier > 8) break; // cycle guard
  }
  return tier;
}

/** True for the fifteen worlds behind the portal — they pay a premium. */
export function isAbstractWorld(worldId: string): boolean {
  return ABSTRACT_WORLDS.some((w) => w.id === worldId);
}

export interface CampaignReward { sparks: number; keys: number }

/**
 * Payout for clearing a node. Sparks scale with how deep the world sits and how hard
 * the bout was, so a Tier-2 challenge on Hard Mode funds the endgame shops while Fire's
 * first fight still pays for a snack. Both the briefing and the results screen call this,
 * so the promise and the payment can never drift apart.
 */
export function getCampaignReward(
  worldId: string, nodeId: string, isChallenge: boolean, hardMode: boolean,
): CampaignReward {
  const def = getCampaignFightDef(nodeId);
  const difficulty = def?.difficulty ?? (isChallenge ? 3 : 2);
  const tier = getWorldTier(worldId);
  const abstract = isAbstractWorld(worldId);

  // Base scale: +1 per difficulty step, +2 per tier, +3 across the portal.
  let sparks = 1 + difficulty + tier * 2 + (abstract ? 3 : 0);
  // Every starred mutation is a real spike — pay for it.
  sparks += (def?.starredMutations?.length ?? 0) * 2;
  if (isChallenge) sparks = Math.round(sparks * 2.5);
  if (hardMode) sparks = Math.round(sparks * 1.75);

  const keys = isChallenge ? (hardMode ? 2 : 1) : 0;
  return { sparks, keys };
}
