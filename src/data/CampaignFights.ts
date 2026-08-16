import { WORLDS } from './Worlds';
import { ABSTRACT_WORLDS } from './AbstractWorlds';
import { CORRUPT_WORLDS, isCorruptWorld } from './CorruptWorlds';
import { FightFormat } from './FightFormats';

export { isCorruptWorld };

export interface CampaignFightDef {
  enemyElementId: string;
  difficulty: number;           // 1–5; matches DIFFICULTY_PRESETS in NpcOpponent.ts
  mutations?: string[];         // mutation ids from MUTATIONS in Mutations.ts
  starredMutations?: string[];  // subset of mutations[] that are starred
  /** Bespoke bout title shown in the fight briefing. */
  name?: string;
  /** One line from the opponent, shown under the title. */
  taunt?: string;
  /** Rule change for the bout — tag-team chain, horde, survival, flood. */
  format?: FightFormat;
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
 * • Nothing above Expert and no `golf` ever reaches the arena: whatever the raw entries
 *   say, `sanitizeCampaignFightDef()` clamps every def on the way out (see below).
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
  'water-fight-4':   { enemyElementId: 'slime',   difficulty: 3, name: 'The Undertow', taunt: 'Down here, light is a rumour.',             mutations: ['abyss'], format: { kind: 'horde' } },
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
  'air-fight-3':   { enemyElementId: 'shadow',      difficulty: 3, name: 'Nightwind',      taunt: 'The dark moves faster than you look.',     mutations: ['phantom'], format: { kind: 'survival', seconds: 75 } },
  'air-fight-4':   { enemyElementId: 'electricity', difficulty: 3, name: 'Storm Front',    taunt: 'Every storm starts as a breeze.',          mutations: ['blustery'],          starredMutations: ['blustery'] },
  'air-fight-5':   { enemyElementId: 'gravity',     difficulty: 3, name: 'The Jet Stream', taunt: 'Up is a suggestion.',                      mutations: ['order', 'blustery'], starredMutations: ['blustery'] },
  'air-challenge': { enemyElementId: 'air',         difficulty: 4, name: 'The Eye',        taunt: 'There is no wind in here. That should frighten you.', mutations: ['apprehension', 'blustery'] },

  // ── Earth ─────────────────────────────────────────────────────────
  'earth-fight-1':   { enemyElementId: 'earth',    difficulty: 2, name: 'Bedrock',           taunt: 'Move me.' },
  'earth-fight-2':   { enemyElementId: 'crystal',  difficulty: 2, name: 'The Vein',          taunt: 'Pressure makes better things than you.',       mutations: ['titanic'], format: { kind: 'horde' } },
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
  'ice-fight-4':   { enemyElementId: 'silence', difficulty: 4, name: 'Whiteout',        taunt: 'No one hears anything out here.',  mutations: ['abyss'], format: { kind: 'survival', seconds: 80 } },
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
  'hunt-fight-2':   { enemyElementId: 'life',      difficulty: 3, name: 'Flush the Quarry', taunt: "Run. It's more fun that way.",           mutations: ['blustery'], format: { kind: 'tagteam', enemies: ['life', 'hunt'] } },
  'hunt-fight-3':   { enemyElementId: 'shadow',    difficulty: 4, name: 'Night Stalk',      taunt: "I don't need to see you.",               mutations: ['phantom'] },
  'hunt-fight-4':   { enemyElementId: 'gunpowder', difficulty: 4, name: 'The Blind',        taunt: 'One shot is plenty.',                    mutations: ['order'] },
  'hunt-fight-5':   { enemyElementId: 'soul',      difficulty: 4, name: 'The Pack',         taunt: 'We are never alone.',                    mutations: ['amber', 'blustery'], starredMutations: ['blustery'] },
  'hunt-challenge': { enemyElementId: 'hunt',      difficulty: 5, name: 'Apex',             taunt: 'Something hunts the hunters. Meet it.',  mutations: ['apprehension', 'amber'] },

  // ── Soul ──────────────────────────────────────────────────────────
  'soul-fight-1':   { enemyElementId: 'soul',    difficulty: 3, name: 'Wisp',          taunt: "You're louder than the dead." },
  'soul-fight-2':   { enemyElementId: 'shadow',  difficulty: 3, name: 'Grave Chill',   taunt: 'Everything you spend is gone for good.', mutations: ['wither'] },
  'soul-fight-3':   { enemyElementId: 'silence', difficulty: 4, name: 'The Vigil',     taunt: 'The quiet ones remember most.',          mutations: ['phantom'], format: { kind: 'horde' } },
  'soul-fight-4':   { enemyElementId: 'life',    difficulty: 4, name: 'Tether',        taunt: 'Your warmth was always a loan.',         mutations: ['parasitic'],         starredMutations: ['parasitic'] },
  'soul-fight-5':   { enemyElementId: 'sand',    difficulty: 4, name: 'The Long Wake', taunt: "Time doesn't heal. It files it away.",   mutations: ['wither', 'phantom'], starredMutations: ['phantom'] },
  'soul-challenge': { enemyElementId: 'soul',    difficulty: 5, name: 'The Ferryman',  taunt: 'Everyone pays. Some pay twice.',         mutations: ['summoner', 'wither'] },

  // ── Shadow ────────────────────────────────────────────────────────
  'shadow-fight-1':   { enemyElementId: 'shadow',  difficulty: 3, name: 'First Dark',            taunt: 'Turn the light off. Please.' },
  'shadow-fight-2':   { enemyElementId: 'silence', difficulty: 3, name: 'Hush',                  taunt: 'No one is coming.',                 mutations: ['phantom'] },
  'shadow-fight-3':   { enemyElementId: 'air',     difficulty: 4, name: 'Cold Draft',            taunt: 'Something just moved behind you.',  mutations: ['blustery'] },
  'shadow-fight-4':   { enemyElementId: 'soul',    difficulty: 4, name: 'Hopelessness',          taunt: 'Stop swinging. It never mattered.', mutations: ['abyss'], format: { kind: 'flood', graceSeconds: 35 } },
  'shadow-fight-5':   { enemyElementId: 'subterfuge', difficulty: 4, name: 'The Long Con',          taunt: "You've been fighting a shape.",     mutations: ['phantom', 'wither'], starredMutations: ['phantom'] },
  'shadow-challenge': { enemyElementId: 'shadow',  difficulty: 5, name: 'The Thing In The Maze', taunt: 'Do not look for me. Just wait.',    mutations: ['apprehension', 'phantom'] },

  // ── Creation ──────────────────────────────────────────────────────
  'creation-fight-1':   { enemyElementId: 'creation',   difficulty: 3, name: 'The Workshop',     taunt: 'I made better than you before breakfast.' },
  'creation-fight-2':   { enemyElementId: 'technology', difficulty: 3, name: 'Assembly Line',    taunt: "Turrets don't get tired.",        mutations: ['tinker'], format: { kind: 'horde' } },
  'creation-fight-3':   { enemyElementId: 'metal',      difficulty: 4, name: 'Forgework',        taunt: 'Iron first. Then you.',           mutations: ['titanic'] },
  'creation-fight-4':   { enemyElementId: 'earth',      difficulty: 4, name: 'The Foundry',      taunt: 'Build. Break. Build again.',      mutations: ['tinker'],          starredMutations: ['tinker'] },
  'creation-fight-5':   { enemyElementId: 'magic',      difficulty: 4, name: 'The Grand Design', taunt: 'Every piece is already placed.',  mutations: ['order', 'tinker'], starredMutations: ['order'] },
  'creation-challenge': { enemyElementId: 'creation',   difficulty: 5, name: 'The Architect',    taunt: 'I drew this room. And your exit.', mutations: ['empyreon', 'tinker'] },

  // ── Gravity ───────────────────────────────────────────────────────
  'gravity-fight-1':   { enemyElementId: 'gravity', difficulty: 3, name: 'Downward',          taunt: 'Everything comes to me.' },
  'gravity-fight-2':   { enemyElementId: 'earth',   difficulty: 3, name: 'Terminal Velocity', taunt: 'The ground always wins.', mutations: ['titanic'] },
  'gravity-fight-3':   { enemyElementId: 'sand',    difficulty: 4, name: 'Event Horizon',     taunt: "You're already late.",    mutations: ['order'], format: { kind: 'flood', graceSeconds: 40 } },
  'gravity-fight-4':   { enemyElementId: 'magnet',  difficulty: 4, name: 'The Well',          taunt: 'Pull is just patience.',  mutations: ['titanic'],        starredMutations: ['titanic'] },
  'gravity-fight-5':   { enemyElementId: 'plasma',  difficulty: 4, name: 'Collapse',          taunt: 'Stars end like this.',    mutations: ['chaos', 'order'], starredMutations: ['order'] },
  'gravity-challenge': { enemyElementId: 'gravity', difficulty: 5, name: 'Singularity',       taunt: 'Nothing leaves.',         mutations: ['empyreon', 'order'] },

  // ── Time (world id `sand`) ────────────────────────────────────────
  'sand-fight-1':   { enemyElementId: 'sand',    difficulty: 3, name: 'The Hourglass',      taunt: 'You have less than you think.' },
  'sand-fight-2':   { enemyElementId: 'crystal', difficulty: 3, name: 'Countdown',          taunt: 'Tick.',                             mutations: ['nuclear'] },
  'sand-fight-3':   { enemyElementId: 'gravity', difficulty: 4, name: 'Dilation',           taunt: 'I moved twice while you blinked.',  mutations: ['order'] },
  'sand-fight-4':   { enemyElementId: 'echo',    difficulty: 4, name: 'Rewind',             taunt: "We've done this before.",           mutations: ['phantom'], format: { kind: 'survival', seconds: 70 } },
  'sand-fight-5':   { enemyElementId: 'soul',    difficulty: 4, name: 'The Last Grain',     taunt: 'Sixty seconds. Be interesting.',    mutations: ['nuclear', 'order'], starredMutations: ['order'] },
  'sand-challenge': { enemyElementId: 'sand',    difficulty: 5, name: 'The Endless Minute', taunt: 'I will outlast you by definition.', mutations: ['apprehension', 'order'] },

  // ═══════════════════════════════════════════════════════════════════
  // ABSTRACT REALM — Tier 0
  // ═══════════════════════════════════════════════════════════════════

  // ── Electricity ───────────────────────────────────────────────────
  'electricity-fight-1':   { enemyElementId: 'electricity', difficulty: 3, name: 'Static',          taunt: "Feel that? That's the air deciding." },
  'electricity-fight-2':   { enemyElementId: 'metal',       difficulty: 3, name: 'Conductor',       taunt: 'You are a very good ground.',        mutations: ['order'] },
  'electricity-fight-3':   { enemyElementId: 'magnet',      difficulty: 4, name: 'Polarity',        taunt: 'Push, pull, fall down.',             mutations: ['blustery'] },
  'electricity-fight-4':   { enemyElementId: 'technology',  difficulty: 4, name: 'Grid Fault',      taunt: 'The city runs on this. So do I.',    mutations: ['tinker'], format: { kind: 'horde' } },
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
  'sound-fight-2':   { enemyElementId: 'echo',       difficulty: 4, name: 'Reverb',        taunt: "You'll hear this again.",            mutations: ['blustery'], format: { kind: 'horde' } },
  'sound-fight-3':   { enemyElementId: 'air',        difficulty: 4, name: 'Shockwave',     taunt: "Air is a weapon when it's angry.",   mutations: ['order'] },
  'sound-fight-4':   { enemyElementId: 'silence',    difficulty: 4, name: 'Dead Air',      taunt: 'Say something. I dare you.',         mutations: ['abyss'] },
  'sound-fight-5':   { enemyElementId: 'technology', difficulty: 5, name: 'The Amp Stack', taunt: 'Turn it up until something breaks.', mutations: ['tinker', 'blustery'], starredMutations: ['blustery'] },
  'sound-challenge': { enemyElementId: 'sound',      difficulty: 5, name: 'The Crescendo', taunt: 'Everything ends on a note.',         mutations: ['empyreon', 'blustery'] },

  // ── Light ─────────────────────────────────────────────────────────
  'light-fight-1':   { enemyElementId: 'light',   difficulty: 3, name: 'Glare',            taunt: "You're squinting already." },
  'light-fight-2':   { enemyElementId: 'crystal', difficulty: 4, name: 'Prism Run',        taunt: "I bend. You don't.",                  mutations: ['order'] },
  'light-fight-3':   { enemyElementId: 'air',     difficulty: 4, name: 'Speed of Light',   taunt: 'You saw me leave. Not arrive.',       mutations: ['blustery'],          starredMutations: ['blustery'], format: { kind: 'survival', seconds: 70 } },
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
  'metal-fight-4':   { enemyElementId: 'slime',     difficulty: 5, name: 'Rust',             taunt: 'Everything I am, you will be.',           mutations: ['wither'], format: { kind: 'flood', graceSeconds: 40 } },
  'metal-fight-5':   { enemyElementId: 'gunpowder', difficulty: 5, name: 'Barrel and Blade', taunt: 'Steel first. Powder second.',             mutations: ['order', 'titanic'], starredMutations: ['titanic'] },
  'metal-challenge': { enemyElementId: 'metal',     difficulty: 5, name: 'The Iron Legion',  taunt: 'One of me was always enough. Now count.', mutations: ['archfiend', 'tinker'] },

  // ── Plasma ────────────────────────────────────────────────────────
  'plasma-fight-1':   { enemyElementId: 'plasma',      difficulty: 4, name: 'Ionised',          taunt: "This isn't fire. This is after fire." },
  'plasma-fight-2':   { enemyElementId: 'fire',        difficulty: 4, name: 'Overheat',         taunt: 'Cute. Watch this.',                    mutations: ['molten'] },
  'plasma-fight-3':   { enemyElementId: 'electricity', difficulty: 4, name: 'Arc Chaos',        taunt: 'Nothing here obeys anything.',         mutations: ['chaos'], format: { kind: 'flood', graceSeconds: 35 } },
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
  'echo-fight-3':   { enemyElementId: 'silence', difficulty: 4, name: 'Dead Zone',     taunt: 'Nothing returns from here.',           mutations: ['abyss'], format: { kind: 'survival', seconds: 75 } },
  'echo-fight-4':   { enemyElementId: 'shadow',  difficulty: 5, name: 'Blind Spot',    taunt: "You are the only one who can't see.",  mutations: ['phantom'],           starredMutations: ['phantom'] },
  'echo-fight-5':   { enemyElementId: 'sand',    difficulty: 5, name: 'Reverberation', taunt: 'Which one of these is now?',           mutations: ['phantom', 'wither'], starredMutations: ['phantom'] },
  'echo-challenge': { enemyElementId: 'echo',    difficulty: 5, name: 'The Cavern',    taunt: 'Follow the sound. I made it for you.', mutations: ['apprehension', 'phantom'] },

  // ── Silence ───────────────────────────────────────────────────────
  'silence-fight-1':   { enemyElementId: 'silence', difficulty: 4, name: 'Hush',             taunt: '. . .' },
  'silence-fight-2':   { enemyElementId: 'shadow',  difficulty: 4, name: 'Blackout',         taunt: "Don't run. It hears running.",         mutations: ['phantom'] },
  'silence-fight-3':   { enemyElementId: 'soul',    difficulty: 4, name: 'The Long Hall',    taunt: 'There is a door. There is not a door.', mutations: ['abyss'] },
  'silence-fight-4':   { enemyElementId: 'echo',    difficulty: 5, name: 'Nothing Answers',  taunt: 'You are shouting into a closed room.',  mutations: ['wither'] },
  'silence-fight-5':   { enemyElementId: 'subterfuge', difficulty: 5, name: 'Vanishing Act',    taunt: 'You will not notice when it starts.',   mutations: ['phantom', 'abyss'], starredMutations: ['phantom'] },
  'silence-challenge': { enemyElementId: 'silence', difficulty: 5, name: 'The Puppetmaster', taunt: 'Your hands were never yours.',          mutations: ['apprehension', 'wither'] },

  // ── Magic ─────────────────────────────────────────────────────────
  'magic-fight-1':   { enemyElementId: 'magic',    difficulty: 4, name: 'Cantrip',         taunt: 'Borrowed power is still power.' },
  'magic-fight-2':   { enemyElementId: 'light',    difficulty: 4, name: 'The Bright Page', taunt: 'I read faster than you cast.',            mutations: ['order'] },
  'magic-fight-3':   { enemyElementId: 'fate',     difficulty: 4, name: 'Sleight',         taunt: 'Watch the other hand.',                   mutations: ['phantom'], format: { kind: 'tagteam', enemies: ['fate', 'light', 'magic'] } },
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

  // ── Subterfuge (world id `subterfuge`) ───────────────────────────────
  'subterfuge-fight-1':   { enemyElementId: 'subterfuge',   difficulty: 4, name: 'The Mark',     taunt: "You already paid me. You just don't know." },
  'subterfuge-fight-2':   { enemyElementId: 'shadow',    difficulty: 4, name: 'The Alley',    taunt: "Nothing personal. It's business.",       mutations: ['phantom'] },
  'subterfuge-fight-3':   { enemyElementId: 'fate',      difficulty: 4, name: 'The Wager',    taunt: 'First to three. I never lose three.',    mutations: ['honor'] },
  'subterfuge-fight-4':   { enemyElementId: 'silence',   difficulty: 5, name: 'Smoke Break',  taunt: 'Take your time. I have.',                mutations: ['phantom'],          starredMutations: ['phantom'] },
  'subterfuge-fight-5':   { enemyElementId: 'gunpowder', difficulty: 5, name: 'The Contract', taunt: "It's signed. You just haven't read it.", mutations: ['honor', 'phantom'], starredMutations: ['honor'] },
  'subterfuge-challenge': { enemyElementId: 'subterfuge',   difficulty: 5, name: 'The Kingpin',  taunt: 'You were hired to lose.',                mutations: ['apprehension', 'pain'] },

  // ═══════════════════════════════════════════════════════════════════
  // CORRUPT REALM — the cast-out elements, behind the scarred portal.
  // Everything here is endgame: difficulty 4 exists only on the very first
  // steps, and the challenge entries are *fallbacks* — once a world's
  // Sovereign ships in src/boss/bosses, its challenge node becomes that boss
  // fight and the entry below stops being read.
  // ═══════════════════════════════════════════════════════════════════

  // ── Ruin (Tier 0 root) ────────────────────────────────────────────
  'ruin-fight-1':   { enemyElementId: 'ruin',      difficulty: 4, name: 'The Rubble Gate',  taunt: 'The realm fell before you were a rumour. Mind the debris.' },
  'ruin-fight-2':   { enemyElementId: 'earth',     difficulty: 4, name: 'Load-Bearing',     taunt: 'Everything standing here is a mistake I intend to fix.',        mutations: ['titanic'] },
  'ruin-fight-3':   { enemyElementId: 'gunpowder', difficulty: 5, name: 'Demolition',       taunt: 'This district comes down at noon. You are ahead of schedule.',  mutations: ['order'], format: { kind: 'horde' } },
  'ruin-fight-4':   { enemyElementId: 'shadow',    difficulty: 5, name: 'The Fallen Court', taunt: 'The thrones here emptied first. Listen — they still creak.',    mutations: ['phantom'] },
  'ruin-fight-5':   { enemyElementId: 'ruin',      difficulty: 5, name: 'Condemned',        taunt: 'You are standing in the last room with a roof.',               mutations: ['pain', 'titanic'], starredMutations: ['pain'] },
  'ruin-challenge': { enemyElementId: 'ruin',      difficulty: 5, name: 'The Wrecking Crown', taunt: 'Every wall I ever raised, I was also aiming.',               mutations: ['archfiend', 'pain'] },

  // ── Death (Tier 1) ────────────────────────────────────────────────
  'death-fight-1':   { enemyElementId: 'death',   difficulty: 4, name: 'Last Rites',        taunt: 'You are early. The paperwork is not.' },
  'death-fight-2':   { enemyElementId: 'soul',    difficulty: 5, name: 'The Waiting Room',  taunt: 'Everyone in here has an appointment. Yours just moved up.',  mutations: ['wither'], format: { kind: 'tagteam', enemies: ['soul', 'silence', 'death'] } },
  'death-fight-3':   { enemyElementId: 'silence', difficulty: 5, name: 'The Hospice',       taunt: 'Hush. Some of them are almost finished.',                    mutations: ['phantom'] },
  'death-fight-4':   { enemyElementId: 'sand',    difficulty: 5, name: 'Midnight Sharp',    taunt: 'The clock in my chest has one hand. Guess which hour.',      mutations: ['order'],            starredMutations: ['order'] },
  'death-fight-5':   { enemyElementId: 'death',   difficulty: 5, name: 'The Second Bell',   taunt: 'The first bell was for the realm. This one is for you.',     mutations: ['wither', 'phantom'], starredMutations: ['phantom'] },
  'death-challenge': { enemyElementId: 'death',   difficulty: 5, name: 'The Undertaker',    taunt: 'I buried the Sovereigns myself. I kept the measurements.',   mutations: ['apprehension', 'wither'] },

  // ── Illusion (Tier 1) ─────────────────────────────────────────────
  'illusion-fight-1':   { enemyElementId: 'illusion', difficulty: 4, name: 'The Cracked Stage', taunt: 'Everything past this wall is scenery. Including the wall.' },
  'illusion-fight-2':   { enemyElementId: 'echo',     difficulty: 5, name: 'House of Answers',  taunt: 'Shout something true. This room only returns lies.',         mutations: ['phantom'] },
  'illusion-fight-3':   { enemyElementId: 'magic',    difficulty: 5, name: 'The Borrowed Face', taunt: 'I wore your victory once. It fit badly.',                    mutations: ['order'] },
  'illusion-fight-4':   { enemyElementId: 'silence',  difficulty: 5, name: 'Fourth Wall',       taunt: 'The audience left years ago. I kept performing.',            mutations: ['abyss'] },
  'illusion-fight-5':   { enemyElementId: 'illusion', difficulty: 5, name: 'The Understudy',    taunt: 'Which of us rehearsed this? Wrong. Both.',                   mutations: ['phantom', 'chaos'], starredMutations: ['phantom'], format: { kind: 'tagteam', enemies: ['illusion', 'illusion'] } },
  'illusion-challenge': { enemyElementId: 'illusion', difficulty: 5, name: 'The Final Curtain', taunt: 'Bow. The realm is watching what it used to be.',             mutations: ['apprehension', 'phantom'] },

  // ── Conquest (Tier 1) ─────────────────────────────────────────────
  'conquest-fight-1':   { enemyElementId: 'conquest', difficulty: 4, name: 'The Border Post',  taunt: 'This land was annexed while you read the sign.' },
  'conquest-fight-2':   { enemyElementId: 'metal',    difficulty: 5, name: 'The Siege Line',   taunt: 'Walls are a promise. I collect on promises.',            mutations: ['titanic'] },
  'conquest-fight-3':   { enemyElementId: 'technology', difficulty: 5, name: 'Supply Chain',   taunt: 'Your defeat was requisitioned in triplicate.',           mutations: ['tinker'] },
  'conquest-fight-4':   { enemyElementId: 'gunpowder', difficulty: 5, name: 'Scorched Policy', taunt: 'I do not burn bridges. I burn the river.',               mutations: ['order'],            starredMutations: ['order'] },
  'conquest-fight-5':   { enemyElementId: 'conquest', difficulty: 5, name: 'The Long March',   taunt: 'Every step you take, my banner is already there.',       mutations: ['order', 'tinker'],  starredMutations: ['order'], format: { kind: 'horde' } },
  'conquest-challenge': { enemyElementId: 'conquest', difficulty: 5, name: 'The Warmaster',    taunt: 'I lost one war in my life. I am wearing what won.',      mutations: ['summoner', 'order'] },

  // ── Gluttony (Tier 1) ─────────────────────────────────────────────
  'gluttony-fight-1':   { enemyElementId: 'gluttony', difficulty: 4, name: 'First Course',     taunt: 'Sit. The kitchen has been expecting you for years.' },
  'gluttony-fight-2':   { enemyElementId: 'slime',    difficulty: 5, name: 'The Broth',        taunt: 'Everything dissolves eventually. Chefs just hurry it.',   mutations: ['wither'] },
  'gluttony-fight-3':   { enemyElementId: 'hunt',     difficulty: 5, name: 'Game Meat',        taunt: 'The difference between hunter and butcher is patience.',  mutations: ['blustery'] },
  'gluttony-fight-4':   { enemyElementId: 'fire',     difficulty: 5, name: 'The Roast',        taunt: 'Low and slow. You have somewhere to be? Shame.',          mutations: ['molten'],            starredMutations: ['molten'], format: { kind: 'survival', seconds: 90 } },
  'gluttony-fight-5':   { enemyElementId: 'gluttony', difficulty: 5, name: 'Seconds',          taunt: 'The realm was the first plate. You are the garnish.',     mutations: ['parasitic', 'molten'], starredMutations: ['parasitic'] },
  'gluttony-challenge': { enemyElementId: 'gluttony', difficulty: 5, name: 'The Devouring Board', taunt: 'A feast is only a war you eat.',                       mutations: ['summoner', 'parasitic'] },

  // ── Cloth (Tier 2, Death) ────────────────────────────────────────
  'cloth-fight-1':   { enemyElementId: 'cloth',  difficulty: 5, name: 'Loose Ends',        taunt: 'You are frayed. Stand still and I will see to it.' },
  'cloth-fight-2':   { enemyElementId: 'growth',  difficulty: 5, name: 'The Patch',         taunt: 'Something was grafted over the hole. It has opinions about the hole.', mutations: ['parasitic'] },
  'cloth-fight-3':   { enemyElementId: 'life',    difficulty: 5, name: 'Sewn In',           taunt: 'It was mended into the wall a long time ago. It has not forgiven that.', mutations: ['order'] },
  'cloth-fight-4':   { enemyElementId: 'crystal', difficulty: 5, name: 'Drawn Tight',       taunt: 'Do not pull. It only tightens.',                             mutations: ['encroach'],           starredMutations: ['encroach'], format: { kind: 'survival', seconds: 75 } },
  'cloth-fight-5':   { enemyElementId: 'cloth',  difficulty: 5, name: 'Whole Bolt',        taunt: 'The Sovereigns I mended do not come apart any more.',        mutations: ['summoner', 'titanic'], starredMutations: ['summoner'] },
  'cloth-challenge': { enemyElementId: 'cloth',  difficulty: 5, name: 'Backstitch',        taunt: 'You have come loose. Hold still. I will put you back.',      mutations: ['empyreon', 'apprehension'] },

  // ── Bind (Tier 2, Death) ──────────────────────────────────────────
  'bind-fight-1':   { enemyElementId: 'bind',        difficulty: 5, name: 'The First Link',   taunt: 'One chain is a threat. Two is a habit. I have thousands.' },
  'bind-fight-2':   { enemyElementId: 'metal',       difficulty: 5, name: 'Forged Shut',      taunt: 'I do not make locks. I make things that used to be doors.', mutations: ['titanic'] },
  'bind-fight-3':   { enemyElementId: 'soul',        difficulty: 5, name: 'The Tether',       taunt: 'The dead here are not restless. They are restrained.',      mutations: ['wither'] },
  'bind-fight-4':   { enemyElementId: 'magnet',      difficulty: 5, name: 'Drawn and Held',   taunt: 'Come closer. That was not a request. Nothing here is.',     mutations: ['order'],             starredMutations: ['order'] },
  'bind-fight-5':   { enemyElementId: 'bind',        difficulty: 5, name: 'Oathkeeper',       taunt: 'You promised yourself you would win. I keep promises now.', mutations: ['pain', 'order'],     starredMutations: ['pain'], format: { kind: 'flood', graceSeconds: 40 } },
  'bind-challenge': { enemyElementId: 'bind',        difficulty: 5, name: 'The Gaoler',       taunt: 'Every cell in this realm has a name on it. Yours is fresh.', mutations: ['apprehension', 'pain'] },

  // ── Paper (Tier 2, Death) ─────────────────────────────────────────
  'paper-fight-1':   { enemyElementId: 'paper',   difficulty: 5, name: 'The Records Hall',  taunt: 'Your whole life fits on one page. I have read shorter.' },
  'paper-fight-2':   { enemyElementId: 'air',     difficulty: 5, name: 'Loose Leaves',      taunt: 'A library with no shelves is just weather.',              mutations: ['blustery'] },
  'paper-fight-3':   { enemyElementId: 'magic',   difficulty: 5, name: 'The Forbidden Text', taunt: 'They sealed this book for a reason. I am the reason.',    mutations: ['order'] },
  'paper-fight-4':   { enemyElementId: 'fire',    difficulty: 5, name: 'Book Burning',      taunt: 'Some stories end. Some are ended. Learn the difference.',  mutations: ['molten'],           starredMutations: ['molten'], format: { kind: 'flood', graceSeconds: 35 } },
  'paper-fight-5':   { enemyElementId: 'paper',   difficulty: 5, name: 'The Final Draft',   taunt: 'I have written your defeat nine times. This one sings.',   mutations: ['phantom', 'order'], starredMutations: ['phantom'] },
  'paper-challenge': { enemyElementId: 'paper',   difficulty: 5, name: 'The Chronicler',    taunt: 'History is whatever survives the edit. You will not.',     mutations: ['empyreon', 'order'] },

  // ── Chalk (Tier 2, Illusion) ──────────────────────────────────────
  'chalk-fight-1':   { enemyElementId: 'chalk',       difficulty: 5, name: 'The Blackboard',   taunt: 'The lesson today is subtraction. Of you.' },
  'chalk-fight-2':   { enemyElementId: 'crystal',     difficulty: 5, name: 'Hard Lines',       taunt: 'A drawing with edges enough becomes a blade.',           mutations: ['encroach'] },
  'chalk-fight-3':   { enemyElementId: 'echo',        difficulty: 5, name: 'Copied Homework',  taunt: 'Everything you do, I sketch faster.',                    mutations: ['phantom'], format: { kind: 'tagteam', enemies: ['echo', 'chalk'] } },
  'chalk-fight-4':   { enemyElementId: 'light',       difficulty: 5, name: 'White on White',   taunt: 'Try reading me against this glare.',                     mutations: ['blustery'],         starredMutations: ['blustery'] },
  'chalk-fight-5':   { enemyElementId: 'chalk',       difficulty: 5, name: 'The Eraser',       taunt: 'I drew this arena. Watch what I do to things I drew.',   mutations: ['chaos', 'phantom'], starredMutations: ['phantom'] },
  'chalk-challenge': { enemyElementId: 'chalk',       difficulty: 5, name: 'The Draughtsman',  taunt: 'You are a rough sketch. I am the fair copy.',            mutations: ['apprehension', 'chaos'] },

  // ── Psychic (Tier 2, Illusion) ────────────────────────────────────
  'psychic-fight-1':   { enemyElementId: 'psychic', difficulty: 5, name: 'The Open Mind',    taunt: 'Do not bother announcing yourself. You did, in 1994.' },
  'psychic-fight-2':   { enemyElementId: 'fate',    difficulty: 5, name: 'The Reading',      taunt: 'Your cards were dealt before your grip existed.',       mutations: ['honor'] },
  'psychic-fight-3':   { enemyElementId: 'silence', difficulty: 5, name: 'Quiet Thoughts',   taunt: 'The loudest thing in this room is your doubt.',         mutations: ['phantom'] },
  'psychic-fight-4':   { enemyElementId: 'echo',    difficulty: 5, name: 'Feedback Loop',    taunt: 'I heard your plan. Then I heard you hearing me hear it.', mutations: ['order'],          starredMutations: ['order'], format: { kind: 'horde' } },
  'psychic-fight-5':   { enemyElementId: 'psychic', difficulty: 5, name: 'Migraine',         taunt: 'The pressure you feel is me, taking notes.',            mutations: ['pain', 'phantom'], starredMutations: ['pain'] },
  'psychic-challenge': { enemyElementId: 'psychic', difficulty: 5, name: 'The Overmind',     taunt: 'One of us is imagining the other. Care to check?',      mutations: ['apprehension', 'order'] },

  // ── Passion (Tier 2, Illusion) ────────────────────────────────────
  'passion-fight-1':   { enemyElementId: 'passion', difficulty: 5, name: 'First Flutter',    taunt: 'The realm broke my heart. Yours will do as a replacement.' },
  'passion-fight-2':   { enemyElementId: 'fire',    difficulty: 5, name: 'Old Flame',        taunt: 'We burned bright once. Now I just burn.',               mutations: ['molten'] },
  'passion-fight-3':   { enemyElementId: 'sound',   difficulty: 5, name: 'The Serenade',     taunt: 'This song was written for someone. Congratulations.',   mutations: ['blustery'] },
  'passion-fight-4':   { enemyElementId: 'shadow',  difficulty: 5, name: 'Jealousy',         taunt: 'Do not look at anything that is not me.',               mutations: ['phantom'],          starredMutations: ['phantom'], format: { kind: 'survival', seconds: 70 } },
  'passion-fight-5':   { enemyElementId: 'passion', difficulty: 5, name: 'Till Death',       taunt: 'Love means never having to say "yield".',               mutations: ['pain', 'molten'],   starredMutations: ['pain'] },
  'passion-challenge': { enemyElementId: 'passion', difficulty: 5, name: 'The Heartbreaker', taunt: 'I will cherish the memory of this. You will not have one.', mutations: ['empyreon', 'pain'] },

  // ── Sand (Tier 2, Illusion — the desert is where a mirage comes true) ──
  'dune-fight-1':   { enemyElementId: 'dune',    difficulty: 5, name: 'The Long Climb',    taunt: 'Everything worth shooting from, I built. Come up if you dare.' },
  'dune-fight-2':   { enemyElementId: 'light',   difficulty: 5, name: 'Mirage Row',        taunt: 'Nine of me arrive before your swing does.',           mutations: ['order'] },
  'dune-fight-3':   { enemyElementId: 'ice',     difficulty: 5, name: 'Cold Dune',         taunt: 'Frost and sand agree on one thing: nothing stands.',  mutations: ['encroach'] },
  'dune-fight-4':   { enemyElementId: 'sound',   difficulty: 5, name: 'The Resonant Note', taunt: 'Every grain in this hall knows your breaking pitch.', mutations: ['blustery'],        starredMutations: ['blustery'] },
  'dune-fight-5':   { enemyElementId: 'dune',    difficulty: 5, name: 'Buried Twice',      taunt: 'Knock it down again. See what comes up out of it.',   mutations: ['pain', 'encroach'], starredMutations: ['pain'], format: { kind: 'flood', graceSeconds: 40 } },
  'dune-challenge': { enemyElementId: 'dune',    difficulty: 5, name: 'The Miragewright',  taunt: 'I kept a picture of the realm before it fell. You are standing in it.', mutations: ['apprehension', 'encroach'] },

  // ── Fortune (Tier 2, Conquest) ────────────────────────────────────
  'fortune-fight-1':   { enemyElementId: 'fortune', difficulty: 5, name: 'The Counting House', taunt: 'Entry fee is everything you have. Exit fee negotiable.' },
  'fortune-fight-2':   { enemyElementId: 'fate',    difficulty: 5, name: 'Loaded Dice',        taunt: 'Chance is for people who cannot afford certainty.',     mutations: ['honor'] },
  'fortune-fight-3':   { enemyElementId: 'subterfuge', difficulty: 5, name: 'The Embezzler',      taunt: 'Your winnings were laundered before you won them.',     mutations: ['phantom'], format: { kind: 'horde' } },
  'fortune-fight-4':   { enemyElementId: 'metal',   difficulty: 5, name: 'Gold Standard',      taunt: 'Everything has a price. Yours was insultingly low.',    mutations: ['titanic'],         starredMutations: ['titanic'] },
  'fortune-fight-5':   { enemyElementId: 'fortune', difficulty: 5, name: 'The Long Bet',       taunt: 'I wagered the realm would fall. Collecting took ages.', mutations: ['honor', 'order'],  starredMutations: ['honor'] },
  'fortune-challenge': { enemyElementId: 'fortune', difficulty: 5, name: 'The Broker of Ruin', taunt: 'The house always wins. I bought the house.',            mutations: ['summoner', 'honor'] },

  // ── Magma (Tier 2, Conquest) ──────────────────────────────────────
  'magma-fight-1':   { enemyElementId: 'magma',  difficulty: 5, name: 'The Vent Field',    taunt: 'The ground here holds grudges under pressure.' },
  'magma-fight-2':   { enemyElementId: 'fire',   difficulty: 5, name: 'Overpressure',      taunt: 'Fire is a temper. I am the tantrum.',                   mutations: ['molten'] },
  'magma-fight-3':   { enemyElementId: 'earth',  difficulty: 5, name: 'The Melting Floor', taunt: 'Stone remembers being liquid. I remind it.',            mutations: ['titanic'] },
  'magma-fight-4':   { enemyElementId: 'plasma', difficulty: 5, name: 'Eruption Column',   taunt: 'Vents do not warn twice. Neither do I.',                mutations: ['chaos'],           starredMutations: ['chaos'], format: { kind: 'flood', graceSeconds: 30 } },
  'magma-fight-5':   { enemyElementId: 'magma',  difficulty: 5, name: 'Pyroclast',         taunt: 'The mountain kept its word. It always comes down.',     mutations: ['molten', 'chaos'], starredMutations: ['molten'] },
  'magma-challenge': { enemyElementId: 'magma',  difficulty: 5, name: 'The Caldera King',  taunt: 'The realm cracked open and I was what leaked out.',     mutations: ['archfiend', 'molten'] },

  // ── Radiation (Tier 2, Conquest) ──────────────────────────────────
  'radiation-fight-1':   { enemyElementId: 'radiation', difficulty: 5, name: 'The Green Glow',   taunt: 'You will feel this fight for the rest of your life. Both weeks.' },
  'radiation-fight-2':   { enemyElementId: 'slime',     difficulty: 5, name: 'Runoff Pond',      taunt: 'Do not drink the water. Do not touch the water. The water knows.', mutations: ['wither'] },
  'radiation-fight-3':   { enemyElementId: 'technology', difficulty: 5, name: 'The Reactor',     taunt: 'It is perfectly safe. It is the safest thing that has ever exploded.', mutations: ['tinker'], format: { kind: 'horde' } },
  'radiation-fight-4':   { enemyElementId: 'plasma',    difficulty: 5, name: 'Half-Life',        taunt: 'Half of you leaves this room. I decide which half.',    mutations: ['nuclear'] },
  'radiation-fight-5':   { enemyElementId: 'radiation', difficulty: 5, name: 'The Exclusion Zone', taunt: 'The signs said keep out. You are why we have signs.', mutations: ['wither', 'chaos'], starredMutations: ['chaos'] },
  'radiation-challenge': { enemyElementId: 'radiation', difficulty: 5, name: 'The Halflife Court', taunt: 'My kingdom decays at a fixed rate. Guests decay faster.', mutations: ['summoner', 'wither'] },

  // ── Depths (Tier 2, Gluttony) ─────────────────────────────────────
  'depths-fight-1':   { enemyElementId: 'depths',  difficulty: 5, name: 'The Drop-Off',     taunt: 'The light ends here. I brought my own. It is bait.' },
  'depths-fight-2':   { enemyElementId: 'water',   difficulty: 5, name: 'Crush Depth',      taunt: 'The sea does not hate you. It just closes.',           mutations: ['encroach'] },
  'depths-fight-3':   { enemyElementId: 'ice',     difficulty: 5, name: 'The Cold Current', taunt: 'Down here even the cold sinks.',                       mutations: ['titanic'] },
  'depths-fight-4':   { enemyElementId: 'silence', difficulty: 5, name: 'The Silent Zone',  taunt: 'No one has ever screamed usefully at this depth.',     mutations: ['abyss'], format: { kind: 'survival', seconds: 80 } },
  'depths-fight-5':   { enemyElementId: 'depths',  difficulty: 5, name: 'The Trench Choir', taunt: 'Everything the surface dropped, I kept. And fed.',     mutations: ['parasitic', 'encroach'], starredMutations: ['parasitic'] },
  'depths-challenge': { enemyElementId: 'depths',  difficulty: 5, name: 'The Sunken Throne', taunt: 'Crowns sink. Mine simply arrived first.',             mutations: ['summoner', 'encroach'] },

  // ── Slime (world id `gum`, Tier 2, Gluttony) ──────────────────────
  'gum-fight-1':   { enemyElementId: 'gum',    difficulty: 5, name: 'The Sticking Point', taunt: 'Go on. Take one more step. See how that goes for your shoes.' },
  'gum-fight-2':   { enemyElementId: 'slime',  difficulty: 5, name: 'Family Reunion',     taunt: 'Acid is my cousin. I got the patience, it got the temper.', mutations: ['wither'] },
  'gum-fight-3':   { enemyElementId: 'rubber', difficulty: 5, name: 'Tensile Argument',   taunt: 'It stretches. I engulf. We agreed to settle it on you.',    mutations: ['blustery'] },
  'gum-fight-4':   { enemyElementId: 'growth', difficulty: 5, name: 'The Culture',        taunt: 'Something is growing in me. Several somethings. Say hello.', mutations: ['parasitic'],        starredMutations: ['parasitic'], format: { kind: 'horde' } },
  'gum-fight-5':   { enemyElementId: 'gum',    difficulty: 5, name: 'Full Absorption',    taunt: 'I am not a wall. I am a door that closes behind you.',      mutations: ['parasitic', 'titanic'], starredMutations: ['parasitic'] },
  'gum-challenge': { enemyElementId: 'gum',    difficulty: 5, name: 'The Ooze Eternal',   taunt: 'The realm fell into me. It is still falling.',              mutations: ['summoner', 'parasitic'] },

  // ── The Amalgam ───────────────────────────────────────────────────
  // Not a world — the finale hangs off the corrupt map's heart, behind all
  // forty-seven thrones. `amalgam` is a pseudo-world id; the boss def is
  // looked up by it, and the clear is filed under it.
  // The pledge is the whole point of the finale: forty-seven Sovereigns owe you, and three
  // of them will take the floor when you go down. The Amalgam keeps its phase and its
  // wounds across every tag, so the fight is one long body, fought by several elements.
  'amalgam-challenge': { enemyElementId: 'ruin', difficulty: 5, name: 'The Amalgam', taunt: 'I AM THE COURT. All of it. Every throne you knelt at, I have already been wearing.', mutations: ['archfiend', 'pain'], starredMutations: ['archfiend'], format: { kind: 'pledge', pledges: 3 } },
};

/**
 * The campaign's own ceiling. Nightmare stays a Gauntlet / free-play thing — a story
 * node tops out at Expert, Hard Mode's +1 bump included.
 */
export const CAMPAIGN_MAX_DIFFICULTY = 4;

/** Modifiers a campaign bout may never carry, whatever the raw table says. */
const CAMPAIGN_BANNED_MUTATIONS = new Set(['golf']);

/**
 * Every reader of a campaign bout goes through this, so the ceiling can't be dodged by
 * a table entry, a Hard Mode remix, or a future author forgetting the rule.
 */
export function sanitizeCampaignFightDef(def: CampaignFightDef | undefined): CampaignFightDef | undefined {
  if (!def) return undefined;
  const difficulty = Math.min(CAMPAIGN_MAX_DIFFICULTY, def.difficulty);
  const mutations = def.mutations?.filter((id) => !CAMPAIGN_BANNED_MUTATIONS.has(id));
  const starredMutations = def.starredMutations?.filter((id) => !CAMPAIGN_BANNED_MUTATIONS.has(id));
  if (difficulty === def.difficulty
    && mutations?.length === def.mutations?.length
    && starredMutations?.length === def.starredMutations?.length) return def;
  return { ...def, difficulty, mutations, starredMutations };
}

export function getCampaignFightDef(nodeId: string): CampaignFightDef | undefined {
  return sanitizeCampaignFightDef(CAMPAIGN_FIGHTS[nodeId]);
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
    [...WORLDS, ...ABSTRACT_WORLDS, ...CORRUPT_WORLDS].map((w) => [w.id, { name: w.name, emoji: w.emoji }]),
  );

// ── Rewards ──────────────────────────────────────────────────────────

/** How deep in the tree a world sits — root 0, its children 1, theirs 2. */
export function getWorldTier(worldId: string): number {
  const all = [...WORLDS, ...ABSTRACT_WORLDS, ...CORRUPT_WORLDS];
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
  // The Amalgam has no world, so it is banded by hand: deeper than anything
  // with a map node, because everything with a map node had to fall first.
  const amalgam = worldId === 'amalgam';
  const tier = amalgam ? 3 : getWorldTier(worldId);
  const abstract = isAbstractWorld(worldId);
  const corrupt = isCorruptWorld(worldId) || amalgam;

  // Base scale: +1 per difficulty step, +2 per tier, +3 across the first
  // portal, +6 across the scarred one — the Corrupt Realm funds the endgame.
  let sparks = 1 + difficulty + tier * 2 + (abstract ? 3 : 0) + (corrupt ? 6 : 0);
  // Every starred mutation is a real spike — pay for it.
  sparks += (def?.starredMutations?.length ?? 0) * 2;
  if (isChallenge) sparks = Math.round(sparks * 2.5);
  if (hardMode) sparks = Math.round(sparks * 1.75);

  const keys = isChallenge ? (hardMode ? 2 : 1) : 0;
  return { sparks, keys };
}
