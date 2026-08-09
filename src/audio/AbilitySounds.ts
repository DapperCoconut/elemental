/**
 * Which sound every ability makes.
 *
 * `Fighter.stampCast` is the one place every ability in the game funnels through —
 * element abilities, mastery bindables, charge-and-release abilities that stamp
 * their own cooldown — so a single table here gives all ~200 of them a voice.
 *
 * Entries are either a bare recipe name or `[name, rate, volume]`, where `rate`
 * multiplies every frequency in the recipe (0.7 = a fifth down and heavier, 1.4 =
 * lighter and faster). Reusing one recipe at several pitches is deliberate: it is
 * how the game gets 200 distinct-sounding abilities out of ~140 recipes, and it
 * keeps a family of related abilities audibly related.
 *
 * Anything not listed still makes a sound — `soundForAbility` falls back to a
 * generic cast shaped by the ability's key (Click is light and fast, Q is huge)
 * and tinted by the element's voice. New abilities are therefore never silent.
 */

/** `[recipe, rate, volume]` — rate and volume optional. */
type Entry = string | [string, number] | [string, number, number];

export const ABILITY_SOUNDS: Record<string, Entry | null> = {
  // ── Fire ──
  'fireball': 'fireball',
  'flame-dash': ['flame-burst', 1.3, 0.85],
  // The charge being planted — FireKit plays the explosion itself when the fuse runs out.
  'pressure-bomb': ['flame-burst', 0.75, 0.5],
  'flame-body': ['inferno', 1.15, 0.6],
  'flame-nuke': 'explosion-large',

  // ── Water ──
  'water-cut': 'water-jet',
  'splash': 'splash',
  'geyser': 'geyser',
  'pressure-dagger': ['water-jet', 1.5, 0.9],
  'pain-rain': 'rain',

  // ── Air (the wind dancer) ──
  'wind-splice': ['air-snipe', 1.25, 0.75],
  'spin-dance': ['gust', 1.1, 1.1],
  'gale-glaive': ['slash', 0.9, 1.1],
  'sky-grapple': 'grapple',
  'wind-breaker': 'tornado',

  // ── Earth ──
  'bash': ['stone-slam', 1.35, 0.9],
  'repair': ['stone-rise', 1.25, 0.85],
  'rock-dance': 'rock-throw',
  'quake': 'quake',
  'golem-ritual': 'golem-ritual',

  // ── Life ──
  'petal-shotgun': 'petal-burst',
  'plant': ['vine-grow', 1.2],
  'grow': 'bloom',
  'thorns': 'thorn',
  'thorn-drag': ['tentacle', 0.9, 1.15],

  // ── Ice ──
  'ice-spike': 'ice-shard',
  'frost-blast': 'frost-blast',
  'block-up': 'ice-wall',
  'skate': 'skate',
  'frozen-solid': 'ice-shatter',

  // ── Electricity ──
  'electro-ball': 'zap',
  'electro-dash': ['zap', 1.3, 0.85],
  'kinetic-discharge': 'thunder',
  'pain-battery': 'electric-charge',
  'restart': 'robot-power',

  // ── Metal ──
  'metal-slash': 'slash',
  'metal-flail-craft': 'anvil',
  'metal-blood-transfusion': ['status-drain', 0.9, 1.1],
  'metal-chain-tether': 'chain',
  'metal-clot-armor': ['shield-up', 0.8, 1.1],

  // ── Shadow ──
  'dark-drain': 'dark-drain',
  'tentacle': 'tentacle',
  'snap-trap': 'trap-snap',
  'tentacle-wall': ['tentacle', 0.7, 1.2],
  'black-hole': 'black-hole',

  // ── Soul ──
  'soul-lantern-light': 'lantern',
  'soul-arise': 'ghost-wail',
  'soul-grave': 'bone',
  'soul-death-whistle': 'whistle',
  'soul-hells-torment': 'torment',

  // ── Time (element id `sand`) ──
  'time-barrage': ['sand', 1.5, 0.85],
  'time-warp': 'time-warp',
  'time-remain': 'rewind',
  'time-halt': 'time-halt',
  'time-timeless': ['time-halt', 0.7, 1.15],

  // ── Crystal ──
  'crystal-laser': ['light-beam', 1.15],
  'crystal-place': 'crystal-chime',
  'crystal-atune': 'prism',
  'crystal-portal': 'portal',
  'crystal-trick': 'crystal-shatter',

  // ── Light ──
  'light-lance': 'light-beam',
  'blink': 'blink',
  'prism-ramp': 'prism',
  'light-trick': 'teleport',
  'speed-o-light': ['status-haste', 1.1, 1.3],

  // ── Gravity ──
  'space-slash': 'space-slash',
  'meteor-rain': 'meteor',
  'space-slam': 'gravity-slam',
  'grav-bomb': ['black-hole', 1.45, 0.9],
  'lunar-landing': 'moon-landing',

  // ── Sound ──
  'staccato': ['drum-hit', 1.3],
  'disc-dice': ['sonic-pulse', 1.15, 0.9],
  'boombox': ['sonic-pulse', 1.5, 0.65],
  'bugle': ['train-horn', 1.6, 0.75],
  'coda': 'guitar-solo',

  // ── Echo (element id `echo`) ──
  'echo-shot': 'echo-ping',
  'echo-guess': ['echo-ping', 0.8],
  'echo-lantern': 'lantern',
  'echo-bat': ['screech', 1.6, 0.8],
  'echo-eclipse': ['sonic-pulse', 0.6, 1.2],

  // ── Subterfuge (element id `subterfuge`) ──
  'sub-cutter': 'stab',
  'sub-spray': 'claw',
  'sub-recruit': 'money',
  'sub-bribe': ['money', 0.85],
  'sub-treachery': 'curse-cast',

  // ── Acid (element id `slime`) ──
  'poison-whip': 'whip',
  'vile-spray': 'acid-spray',
  'snake-burrow': 'burrow',
  'purge': ['sizzle', 1.2, 1.1],
  'acid-apocalypse': ['acid-spray', 0.6, 1.35],

  // ── Oil ──
  'drone-command': 'drone-buzz',
  'barrel-roll': 'oil-splash',
  'drone-destroy': 'explosion-small',
  'shield-gen': 'shield-up',
  'train-morph': 'train-horn',

  // ── Magnet ──
  'mag-pulse': ['magnet-pull', 1.35, 0.9],
  'nail-implant': 'nail',
  'magnetize': 'magnet-pull',
  'protect': 'shield-up',
  'atom-smasher': ['explosion-large', 1.1],

  // ── Fate ──
  'fate-card-throw': 'card-throw',
  'fate-reroll': 'card-shuffle',
  'fate-preserve': ['sparkle', 0.85],
  'fate-enchant': 'sparkle',
  'fate-all-in': 'jackpot',

  // ── Magic ──
  'magic-sparkle-shot': 'sparkle',
  'magic-grimoire': 'spellbook',
  'magic-anchor': ['stone-slam', 0.9],
  'magic-meditate': ['holy-chord', 1, 0.8],
  'magic-necronomicon': 'incantation',

  // ── Growth ──
  'growth-click': ['slime-splat', 1.25, 0.9],
  'growth-evolve': 'mutate',
  'growth-virus': ['spore', 1.3, 0.9],
  'spore-spray': 'spore',
  'auxiliary-growth': ['mutate', 0.7, 1.2],

  // ── Gunpowder ──
  'gunpowder-musket-shot': 'musket',
  'gunpowder-explosive-retreat': 'explosion-small',
  'gunpowder-fire-at-will': ['musket', 1.15, 0.85],
  'gunpowder-arsenal-expansion': 'reload',
  'gunpowder-blunderblast': ['shotgun', 0.75, 1.25],

  // ── Hunt — hunter form ──
  'hunt-crossbow': 'crossbow',
  'hunt-blast': 'shotgun',
  'hunt-grenade': 'grenade-throw',
  'hunt-trail': 'trap-set',
  'hunt-release-beast': 'beast-transform',
  // ── Hunt — beast form ──
  'hunt-slash': 'claw',
  'hunt-pounce': ['roar', 1.45, 0.75],
  'hunt-roar': 'roar',
  'hunt-grapple': 'grapple',
  'hunt-blood-scent': 'status-mark',
  // ── Hunt — hybrid form ──
  'hunt-hybrid-shotgun': ['shotgun', 1.1, 0.95],
  'hunt-roll': 'dash',
  'hunt-hook': 'chain',
  'hunt-adrenaline': 'status-haste',
  'hunt-give-in': ['beast-transform', 0.8, 1.2],

  // ── Rubber ──
  'rubber-punch': ['boing', 1.35, 0.9],
  'rubber-sling': 'stretch',
  'rubber-bounce-form': 'boing',
  'rubber-band': 'snap-back',
  'rubberage': ['boing', 0.6, 1.3],

  // ── Silence ──
  'silence-stab': 'stab',
  'silence-watch': ['hush', 1.35, 0.75],
  'silence-ritual': 'curse-cast',
  'silence-feast': ['claw', 0.8, 1.1],
  'silence-run': 'heartbeat',

  // ── Technology ──
  'tech-cruncher': 'glitch',
  'tech-ads': 'error-popup',
  'tech-upload': 'upload',
  'tech-webdrag': ['glitch', 0.8, 1.05],
  'tech-admin': ['robot-power', 0.9, 1.2],

  // ── Plasma ──
  'plasma-burst': 'plasma-arc',
  'plasma-arena': ['plasma-arc', 0.7, 1.1],
  'plasma-current': 'electric-charge',
  'plasma-chaos-blades': 'chaos',
  'plasma-pure-chaos': ['chaos', 0.7, 1.35],

  // ── Creation ──
  'dagger-spray': ['stab', 1.2, 0.9],
  'charged-bolt': ['beam-fire', 1.3, 0.85],
  'wrench-plans': 'gear-turn',
  'creation-block': 'craft-complete',
  'maze-of-doom': ['anvil', 0.7, 1.25],

  // ── Dream ──
  'dream-trance': 'dream-chime',
  'dream-pillow-fight': 'pillow',
  'dream-dreamcatcher': ['dream-chime', 1.3, 0.9],
  'dream-nightmare': 'nightmare',
  'dream-oasis': ['holy-chord', 0.9, 1.1],

  // ── Chalk ──
  'chalk-ward': ['sand', 1.5, 0.7],
  'chalk-explosive': ['sand', 1.1, 0.8],
  'chalk-perma': ['sand', 0.85, 0.85],
  'chalk-shield': 'shield-up',
  'chalk-masterpiece': ['craft-complete', 1.1],

  // ── Magma ──
  'magma-plume': ['sizzle', 0.85, 1.1],
  'magma-volcano': ['stone-rise', 0.8, 1.2],
  'magma-bloat': ['inferno', 0.85, 0.9],
  'magma-fist': ['stone-slam', 0.8, 1.2],
  'magma-dragon-kin': ['roar', 0.8, 1.2],

  // ── Illusion ──
  'illusion-crack-shot': ['crossbow', 1.25, 0.85],
  'illusion-veil': ['prism', 0.85, 1.05],
  'illusion-relocate': 'blink',
  'illusion-tesseract': ['portal', 1.2, 0.9],
  'illusion-dance': ['teleport', 0.8, 1.15],

  // ── Sand (element id `dune`) ──
  // The click is voiced by the kit per shot so the golden barrel can be heard as a different
  // gun; the rest is masonry coming up out of the floor, wind, and something very large under
  // the sand. The Q takes the trap, not the worm — the worm announces itself when it arrives.
  'dune-striker': ['ui-click', 0.2, 1.5],
  'dune-ruins': ['stone-rise', 0.85, 1.15],
  'dune-pyramid': ['golem-ritual', 0.9, 0.85],
  'dune-sandwalk': ['stone-rise', 1.25, 0.7],
  'dune-final-trail': ['holy-chord', 0.7, 0.9],

  // ── Paper ──
  // The click and the Q are three abilities each, so both take a neutral page-turn rather than
  // committing to one book's sound — the kit plays the book-specific one itself on top.
  'paper-storybook': ['ui-page', 0.7, 1.15],
  'paper-plane': ['whoosh', 0.8, 1.4],
  'paper-shuriken': ['whoosh', 0.9, 0.8],
  'paper-mache': ['trap-set', 0.85, 1.05],
  'paper-climax': ['spellbook', 1.0, 0.75],

  // ── Fortune ──
  // The trigger pull is voiced by the kit per weapon, so Click stays deliberately quiet here;
  // the rest of the set is a till, a ticker, a turnstile and a very expensive laser.
  'fortune-fire': ['ui-click', 0.25, 1.6],
  'fortune-safe': ['money', 0.7, 1.15],
  'fortune-risky': ['money', 0.7, 0.85],
  'fortune-paywall': ['gear-turn', 0.85, 0.95],
  'fortune-p2w': ['beam-charge', 0.95, 0.9],

  // ── Marrow ──
  // Nothing here is a weapon being swung: four of the five are something wet being released,
  // so the set is a flick, two spawns, a whip and a swarm of fuses being lit.
  'marrow-antibody': ['nail', 0.4, 1.5],
  'marrow-macrosma': ['slime-splat', 0.85, 0.7],
  'marrow-neutralize': ['spore', 0.85, 1.25],
  'marrow-dendricles': ['whip', 0.9, 1.15],
  'marrow-mastacre': ['bubble', 1.0, 0.75],

  // ── Psychic ──
  // Nothing in the kit is physical except the whip, so nothing else gets an impact: a
  // seized ability is an incantation, foreknowledge is a blink and a coma is a sleep.
  'psychic-headache': ['whip', 0.85, 1.05],
  'psychic-mind-control': ['incantation', 0.8, 1.2],
  'psychic-dodge-destiny': ['blink', 0.85, 1.3],
  // The charge being planted — PsychicKit plays the torment itself when the fuse runs out.
  'psychic-migraine': ['incantation', 1.25, 0.5],
  'psychic-coma': ['status-sleep', 1.0, 0.65],

  // ── Radiation ──
  // The click plants a device rather than firing a weapon, so it gets a nail rather than a
  // gunshot — the railgun's own report is played by the kit when the third tracer confirms.
  'radiation-railgun': ['nail', 1.1, 0.7],
  'radiation-baton': ['flail-swing', 0.85, 1.0],
  'radiation-xray': ['sonic-pulse', 0.75, 0.85],
  'radiation-waste': ['grenade-throw', 0.8, 0.95],
  'radiation-extermination': ['reload', 0.85, 1.1],

  // ── Bind ──
  // Nothing here is cast by the character; it is all asked for, so four of the five are chords
  // and incantations. Only the barrage is allowed to sound like breaking.
  'bind-summon': ['beam-charge', 0.8, 0.6],
  'bind-shards': ['crystal-shatter', 0.85, 1.0],
  'bind-idol': ['holy-chord', 0.7, 0.9],
  'bind-protection': ['incantation', 0.7, 1.0],
  'bind-treachery': ['ghost-wail', 0.55, 1.0],

  // ── Slime (id: gum) ──
  'gum-grab': ['slime-splat', 1.1, 0.7],
  'gum-surge': ['slime-splat', 0.8, 0.95],
  'gum-gumball': ['bubble', 0.9, 1.0],
  'gum-oozorbtion': ['stretch', 0.7, 0.95],
  'gum-solidify': ['ice-shatter', 1.1, 1.0],

  // ── Quantum's Third State ──
  // Every one of these is a *split*, so the row is built out of things that come apart: a
  // shatter, a teleport's fold, a stretch. The Click is near-silent on purpose — the blades are
  // permanent, and a ring that chimed every 900ms would be unbearable.
  'quantum-splicers': ['whoosh', 1.6, 0.25],
  'quantum-ability-split': ['teleport', 1.5, 0.7],
  'quantum-arena-split': ['crystal-shatter', 0.6, 1.0],
  'quantum-effect-split': ['stretch', 0.75, 0.9],
  'quantum-parasite': ['beast-transform', 0.6, 1.0],

  // ── Gluttony ──
  // The chef's row is kitchen noises and the butcher's row is the same actions gone wrong: the
  // knife throw becomes a slash, the skewer becomes a stab, and the pot becomes a roar.
  'glut-knife': ['whoosh', 1.35, 0.7],
  'glut-forage': ['vine-grow', 1.1, 0.6],
  'glut-charcoal': ['rock-throw', 0.85, 0.8],
  'glut-butcher': ['beast-transform', 0.7, 1.0],
  'glut-feast': ['craft-complete', 0.8, 0.9],
  'glut-cleave': ['slash', 0.95, 0.9],
  'glut-poach': ['spear-throw', 1.05, 0.9],
  'glut-cannibalize': ['claw', 0.75, 1.0],
  'glut-return': ['ui-toggle-off', 1.0, 0.7],
  'glut-maw': ['roar', 0.5, 1.25],

  // ── Death ──
  // Four of the five deal no damage, so none of them gets an impact sound — they get a drain,
  // a cut and a bell. Only the ones that touch steel are allowed to be loud, and Amputate is
  // the lowest of them: the same blade, pitched down to something that hit bone.
  'death-styx': ['dark-drain', 0.7, 1.2],
  'death-disarm': ['slash', 1.0, 0.85],
  'death-riposte': ['clang', 0.75, 0.7],
  'death-amputate': ['slash', 1.0, 0.55],
  'death-deal': ['judgement', 0.9, 0.7],

  // ── Ruin ──
  'ruin-shred': ['slash', 1.15, 0.85],
  'ruin-lockdown': ['chain', 0.8, 1.0],
  'ruin-skewer': ['spear-throw', 0.75, 1.1],
  'ruin-spikes': ['trap-set', 0.7, 1.05],
  'ruin-decay': ['curse-cast', 0.65, 1.2],

  // ── Depths ──
  'depths-piranha': ['claw', 1.3, 0.8],
  'depths-lungfish': ['water-jet', 0.85, 1.05],
  'depths-eutrophication': ['bloom', 0.9, 1.1],
  'depths-angler': ['splash', 1.2, 0.75],
  'depths-megalodon': ['roar', 0.55, 1.25],

  // ── Passion ──
  'passion-loveshot': ['musket', 1.4, 0.6],
  'passion-flirt': ['whistle', 1.15, 0.9],
  // The cast is the dash; the kiss itself gets its own sound when it actually lands.
  'passion-smooch': ['dash', 1.15, 0.85],
  'passion-manipulate': ['thorn', 1.2, 0.85],
  'passion-exhibition': ['reward-big', 1.1, 0.9],

  // ── Conquest ──
  'conquest-banner': ['stab', 0.9, 1.1],
  'conquest-barracks': ['stone-rise', 1.1, 0.9],
  'conquest-turret': ['craft-complete', 1.2, 0.8],
  'conquest-barricade': ['stone-slam', 1.3, 0.7],
  'conquest-expansion': ['holy-chord', 0.85, 1.2],

  // ── Justice — sword stance ──
  'justice-stab': 'stab',
  'justice-coliseum': ['stone-rise', 0.9, 1.15],
  'justice-sheer-will': 'holy-chord',
  'justice-flight': 'wings',
  'justice-judgement-day': 'judgement',
  // ── Justice — spear stance ──
  'justice-spear-throw': 'spear-throw',
  'justice-bind': 'chain',
  'justice-pillar': 'stone-rise',
  'justice-descend': ['wings', 0.8, 1.15],
  'justice-seraphim': ['judgement', 1.15],

  // ── Mastery bindables ──
  'burning-body': ['inferno', 1.1, 0.7],
  'slipstream': 'gust',
  'dancers-momentum': 'status-haste',
  'drone-array': 'drone-buzz',
  'thorn-thrash': ['thorn', 0.85, 1.15],
  'unbreakable': 'shield-up',
  'shared-suffering': 'status-curse',
  'viral-frost': ['frost-blast', 1.2, 0.9],
  'curling-stone': ['skate', 0.9, 1.1],
  'resonance': 'sonic-pulse',
  'kinetic-shield': ['shield-up', 1.15],
  'gravity-aura': ['black-hole', 1.6, 0.7],
  'strength-in-numbers': 'status-buff',
  'passive-manipulation': 'curse-cast',
  'cycle': 'card-shuffle',
  'mag-lev': 'magnet-pull',
  'syringe-shot': ['stab', 1.45, 0.9],
  'acid-walker': 'sizzle',
  'natural-clot': 'status-regen',
  'levitate': ['status-invincible', 1.1, 0.9],
  'springboard': ['boing', 1.1],
  'atom-nhilego': ['explosion-large', 1.2],
  'byte-bomb': ['glitch', 0.8, 1.15],
  'overload': ['musket', 0.9, 1.15],
  'unstoppable': 'status-invincible',
  'vibration-detection': 'echo-ping',
  'big-pockets': 'money',
  'unstable-orbital': ['plasma-arc', 0.8, 1.05],
  'weak-points': 'status-mark',
  'puppetmaster': ['curse-cast', 0.85, 1.15],

  // The rest of the mastery table. Passives never reach `stampCast`, so some of
  // these will never fire — mapping the whole table anyway means a passive that
  // is later made bindable arrives with a sound already chosen for it.
  'heatwave': 'flame-burst',
  'siphon': 'status-drain',
  'winds-of-change': ['status-haste', 1.3, 1.15],
  'turret': 'drone-buzz',
  'reap': ['slash', 0.85, 1.1],
  'dust-screen': 'sand',
  'shadow-beacon': ['dark-drain', 0.8, 1.15],
  'icicle-impale': ['ice-shard', 0.8, 1.15],
  'crystal-shredder': 'crystal-shatter',
  'kinetic-bomb': 'explosion-medium',
  'starfall': 'meteor',
  'grave-mistake': 'bone',
  'time-bomb': ['explosion-medium', 0.9, 1.05],
  'tarot-of-fate': 'jackpot',
  'metal-detector': ['magnet-pull', 1.2, 0.9],
  'secret-upgrades': 'mutate',
  'breakdown': 'glitch',
  'steel-shield': ['shield-up', 0.85, 1.1],
  'transmogrify': ['spellbook', 1.1],
  'mortar-command': 'mortar-launch',
  'vulcanization': ['boing', 0.75, 1.15],
  'vpn': ['upload', 0.9],
  'fireworks': ['explosion-small', 1.3, 0.9],
  'killer-kebab': 'spear-throw',
  'echo-bloom': ['echo-ping', 0.7, 1.15],
  'smoke-break': 'smoke',
  'chaos-storm': ['chaos', 0.75, 1.2],
  'beastling': ['roar', 1.5, 0.75],
  'weep': 'ghost-wail',

  // The training-dummy element casts nothing — explicitly silent so it doesn't
  // fall through to the generic cast sound.
  'dummy-noop': null,
};

/**
 * Per-element pitch tint for the generic fallback, so an unlisted fire ability
 * still sounds hotter and lower than an unlisted air ability. Elements missing
 * from this table use 1.
 */
const ELEMENT_PITCH: Record<string, number> = {
  fire: 0.9, water: 1.05, air: 1.3, earth: 0.72, life: 1.12,
  ice: 1.35, electricity: 1.2, metal: 0.95, shadow: 0.68, soul: 0.8,
  sand: 1.0, crystal: 1.4, light: 1.45, gravity: 0.65, sound: 0.85,
  echo: 1.25, subterfuge: 1.0, slime: 0.88, oil: 0.78, magnet: 1.15,
  fate: 1.2, magic: 1.1, growth: 0.92, gunpowder: 0.8, hunt: 0.85,
  rubber: 1.05, silence: 0.75, technology: 1.3, plasma: 1.25,
  creation: 1.0, dream: 1.2, justice: 0.95, king: 0.6, chalk: 1.35, illusion: 1.15, conquest: 0.85,
  magma: 0.7, depths: 0.72, passion: 1.28, ruin: 0.7, dune: 0.76, paper: 1.18,
  death: 0.6, fortune: 1.08, marrow: 0.92, psychic: 1.22,
  radiation: 1.12, bind: 0.66, gum: 0.86, gluttony: 0.82,
};

/** Key → generic recipe. Shapes an unlisted ability by how big its slot implies it is. */
const SLOT_FALLBACK: Record<string, string> = {
  'Click': 'cast-click',
  'E': 'cast-e',
  'R': 'cast-r',
  'F': 'cast-f',
  'Q': 'cast-q',
};

export interface ResolvedAbilitySound {
  sound: string;
  rate: number;
  volume: number;
}

/**
 * Resolves an ability to a sound. Returns null only for abilities explicitly
 * mapped to silence — everything else gets at least the generic cast for its slot.
 */
export function soundForAbility(
  abilityId: string,
  elementId?: string,
  displayKey?: string,
): ResolvedAbilitySound | null {
  const entry = ABILITY_SOUNDS[abilityId];
  if (entry === null) return null;

  if (entry !== undefined) {
    if (typeof entry === 'string') return { sound: entry, rate: 1, volume: 1 };
    return { sound: entry[0], rate: entry[1] ?? 1, volume: entry[2] ?? 1 };
  }

  // Unmapped: generic cast, shaped by slot and tinted by element.
  const sound = SLOT_FALLBACK[displayKey ?? ''] ?? 'cast-e';
  return { sound, rate: ELEMENT_PITCH[elementId ?? ''] ?? 1, volume: 0.9 };
}
