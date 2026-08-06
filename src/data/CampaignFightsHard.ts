import { CampaignFightDef, getCampaignFightDef } from './CampaignFights';

/**
 * THE SECOND TELLING — hard mode as a remix, not a stat bump.
 *
 * Story frame: after the war, the corruption's echo replays it, twisted. Same
 * worlds, same nodes — different opponents, different mutations, new names and
 * new voices. Every entry here fully replaces its normal-mode def when Hard
 * Mode is toggled on.
 *
 * Coverage is incremental by design: any node with no entry falls back to the
 * old behaviour (+1 difficulty, every regular mutation starred), so the table
 * can grow realm by realm. The Normal Realm's fourteen worlds are authored;
 * the Abstract and Corrupt tellings come in later batches.
 *
 * The same star rules as the main table apply: never star wither/abyss/nuclear,
 * never use clot, and challenges stay with the boss defs (Sovereigns carry
 * their own hard variants), so no `-challenge` ids appear here.
 */
export const CAMPAIGN_FIGHTS_HARD: Record<string, CampaignFightDef> = {
  // ── Fire — the hearth, retold ─────────────────────────────────────
  'fire-fight-1':   { enemyElementId: 'plasma',    difficulty: 3, name: 'Second Spark',    taunt: 'The echo remembers you winning. It has notes.' },
  'fire-fight-2':   { enemyElementId: 'gunpowder', difficulty: 4, name: 'Backdraft',       taunt: 'This time the room is already burning.',        mutations: ['molten'], starredMutations: ['molten'] },
  'fire-fight-3':   { enemyElementId: 'magma',     difficulty: 4, name: 'The Grudge Under the Grate', taunt: 'You put the fire out. It kept the receipt.', mutations: ['pain'] },
  'fire-fight-4':   { enemyElementId: 'shadow',    difficulty: 4, name: 'Ashes Where Light Was', taunt: 'A fire\'s echo is smoke. Breathe deep.',    mutations: ['phantom'], starredMutations: ['phantom'] },
  'fire-fight-5':   { enemyElementId: 'fire',      difficulty: 5, name: 'The Hearth Inverted', taunt: 'In this telling, you are the kindling.',      mutations: ['molten', 'chaos'], starredMutations: ['molten'] },

  // ── Water ─────────────────────────────────────────────────────────
  'water-fight-1':   { enemyElementId: 'ice',     difficulty: 4, name: 'The Tide, Frozen',  taunt: 'The echo paused the wave you dodged. Mid-crest.' },
  'water-fight-2':   { enemyElementId: 'depths',  difficulty: 4, name: 'What The Deep Kept', taunt: 'Everything you threw in the water is here. It networked.', mutations: ['encroach'] },
  'water-fight-3':   { enemyElementId: 'slime',   difficulty: 4, name: 'Backwash',          taunt: 'The river runs the other way in this telling.',  mutations: ['wither'] },
  'water-fight-4':   { enemyElementId: 'silence', difficulty: 5, name: 'The Still Surface', taunt: 'No ripples this time. Not one.',                 mutations: ['abyss'], format: { kind: 'survival', seconds: 85 } },
  'water-fight-5':   { enemyElementId: 'water',   difficulty: 5, name: 'Leviathan\'s Wake', taunt: 'You killed the deep. This is what it dreamt after.', mutations: ['summoner', 'encroach'] },

  // ── Life ──────────────────────────────────────────────────────────
  'life-fight-1':   { enemyElementId: 'death',  difficulty: 4, name: 'The Compost Turn',  taunt: 'In the echo, the garden tends the gardener.' },
  'life-fight-2':   { enemyElementId: 'growth', difficulty: 4, name: 'Overgrowth, Again', taunt: 'You pruned me once. Count my rings now.',        mutations: ['parasitic'], starredMutations: ['parasitic'] },
  'life-fight-3':   { enemyElementId: 'gum',    difficulty: 4, name: 'The Green That Eats', taunt: 'Photosynthesis was a phase. I am past it.',    mutations: ['titanic'] },
  'life-fight-4':   { enemyElementId: 'soul',   difficulty: 5, name: 'Rot With Better Timing', taunt: 'Every season ends. This one ends on purpose.', mutations: ['wither', 'phantom'], starredMutations: ['phantom'] },
  'life-fight-5':   { enemyElementId: 'life',   difficulty: 5, name: 'The Crown Regrown', taunt: 'Mulch remembers being a king. Kneel to the mulch.', mutations: ['empyreon', 'parasitic'] },

  // ── Air ───────────────────────────────────────────────────────────
  'air-fight-1':   { enemyElementId: 'sound',       difficulty: 4, name: 'The Scream In The Draft', taunt: 'The wind kept everything you said in that fight.' },
  'air-fight-2':   { enemyElementId: 'gravity',     difficulty: 4, name: 'Downdraft',      taunt: 'This telling has a floor, and it is coming up to meet you.', mutations: ['order'] },
  'air-fight-3':   { enemyElementId: 'illusion',    difficulty: 4, name: 'Mirage Front',   taunt: 'You cannot punch what was never there. Again.',  mutations: ['phantom'], starredMutations: ['phantom'], format: { kind: 'survival', seconds: 80 } },
  'air-fight-4':   { enemyElementId: 'electricity', difficulty: 5, name: 'The Storm Remembers', taunt: 'Last time it was a breeze. It has been practising.', mutations: ['blustery', 'chaos'], starredMutations: ['blustery'] },
  'air-fight-5':   { enemyElementId: 'air',         difficulty: 5, name: 'The Eye, Open',  taunt: 'There is wind in here now. All of it.',          mutations: ['apprehension', 'blustery'] },

  // ── Earth ─────────────────────────────────────────────────────────
  'earth-fight-1':   { enemyElementId: 'ruin',     difficulty: 4, name: 'Bedrock, Broken', taunt: 'You moved the mountain. The echo shows you what fell out.' },
  'earth-fight-2':   { enemyElementId: 'metal',    difficulty: 4, name: 'The Vein, Mined', taunt: 'Someone smelted the pressure you survived.',     mutations: ['titanic'], starredMutations: ['titanic'], format: { kind: 'horde' } },
  'earth-fight-3':   { enemyElementId: 'magma',    difficulty: 4, name: 'The Forge Overrun', taunt: 'The forge below found its own fuel.',          mutations: ['molten'] },
  'earth-fight-4':   { enemyElementId: 'bind',     difficulty: 5, name: 'Deep Pressure, Held', taunt: 'Everything falls. This time it is caught, and kept.', mutations: ['pain'], starredMutations: ['pain'] },
  'earth-fight-5':   { enemyElementId: 'earth',    difficulty: 5, name: 'The Mountain, Twice', taunt: 'Mountains do not negotiate. Echoes of mountains gloat.', mutations: ['summoner', 'titanic'] },

  // ── Oil ───────────────────────────────────────────────────────────
  'oil-fight-1':   { enemyElementId: 'gum',       difficulty: 4, name: 'The Slick, Set',   taunt: 'It stopped being slippery. Now it holds.' },
  'oil-fight-2':   { enemyElementId: 'magma',     difficulty: 5, name: 'Flashpoint Past', taunt: 'We already burned together. This is the part after.', mutations: ['molten'], starredMutations: ['molten'] },
  'oil-fight-3':   { enemyElementId: 'radiation', difficulty: 5, name: 'The Refinery Glows', taunt: 'New fuel. Do not ask what it refines into.',   mutations: ['wither'] },
  'oil-fight-4':   { enemyElementId: 'gunpowder', difficulty: 5, name: 'Fuse Relit',      taunt: 'Sixty seconds again — but I counted faster this time.', mutations: ['nuclear'] },
  'oil-fight-5':   { enemyElementId: 'oil',       difficulty: 5, name: 'Black Tide Rising', taunt: 'Everything you love is still fuel. There is just more of it.', mutations: ['phantom', 'molten'], starredMutations: ['phantom'], format: { kind: 'flood', graceSeconds: 35 } },

  // ── Ice ───────────────────────────────────────────────────────────
  'ice-fight-1':   { enemyElementId: 'dune',    difficulty: 4, name: 'First Frost, Buried', taunt: 'Frozen once, buried once. The echo kept the grains.' },
  'ice-fight-2':   { enemyElementId: 'depths',  difficulty: 5, name: 'Under The Shelf',  taunt: 'The glacier\'s underside has been busy.',          mutations: ['encroach'] },
  'ice-fight-3':   { enemyElementId: 'amber',   difficulty: 5, name: 'The Slow Freeze',  taunt: 'Ice preserves. So do I. Permanently.',             mutations: ['order'], starredMutations: ['order'] },
  'ice-fight-4':   { enemyElementId: 'silence', difficulty: 5, name: 'Whiteout Total',   taunt: 'This time the snow does not stop between waves.',  mutations: ['abyss'], format: { kind: 'survival', seconds: 90 } },
  'ice-fight-5':   { enemyElementId: 'ice',     difficulty: 5, name: 'Winter\'s Second Coming', taunt: 'Nothing thawed. Everything waited.',         mutations: ['apprehension', 'wither'] },

  // ── Growth ────────────────────────────────────────────────────────
  'growth-fight-1':   { enemyElementId: 'radiation', difficulty: 4, name: 'Mutation Rate', taunt: 'The petri dish met something that speeds evolution up.' },
  'growth-fight-2':   { enemyElementId: 'gum',      difficulty: 5, name: 'The Culture, Merged', taunt: 'Two colonies, one opinion: you.',            mutations: ['parasitic'], starredMutations: ['parasitic'] },
  'growth-fight-3':   { enemyElementId: 'death',    difficulty: 5, name: 'Blight Perfected', taunt: 'Grey is also a colour things grow into.',       mutations: ['wither'] },
  'growth-fight-4':   { enemyElementId: 'gluttony', difficulty: 5, name: 'The Bloom That Bites', taunt: 'Everything that multiplies eventually gets hungry.', mutations: ['parasitic', 'molten'], starredMutations: ['parasitic'], format: { kind: 'horde' } },
  'growth-fight-5':   { enemyElementId: 'growth',   difficulty: 5, name: 'Patient One',    taunt: 'You were the first infection I could not take. Rematch.', mutations: ['summoner', 'parasitic'] },

  // ── Crystal ───────────────────────────────────────────────────────
  'crystal-fight-1':   { enemyElementId: 'dune',   difficulty: 4, name: 'Geode, Buried', taunt: 'You opened the geode. The echo poured the desert into it.' },
  'crystal-fight-2':   { enemyElementId: 'amber',  difficulty: 5, name: 'Pressure, Preserved', taunt: 'Squeezed properly this time. And kept.',      mutations: ['encroach'] },
  'crystal-fight-3':   { enemyElementId: 'light',  difficulty: 5, name: 'Total Refraction', taunt: 'Every facet aims at you now. All of them.',      mutations: ['order'], starredMutations: ['order'] },
  'crystal-fight-4':   { enemyElementId: 'psychic', difficulty: 5, name: 'The Resonant Mind', taunt: 'The lattice learned to think between tellings.', mutations: ['phantom'] },
  'crystal-fight-5':   { enemyElementId: 'crystal', difficulty: 5, name: 'The Prism Throne, Restrung', taunt: 'Light bent for you once. It holds a grudge about it.', mutations: ['empyreon', 'phantom'] },

  // ── Hunt ──────────────────────────────────────────────────────────
  'hunt-fight-1':   { enemyElementId: 'hunt',    difficulty: 4, name: 'The Scent, Reversed', taunt: 'In the second telling, you smell like prey from the start.' },
  'hunt-fight-2':   { enemyElementId: 'depths',  difficulty: 5, name: 'The Lure',        taunt: 'This forest has an angler now.',                   mutations: ['blustery'], format: { kind: 'tagteam', enemies: ['depths', 'hunt'] } },
  'hunt-fight-3':   { enemyElementId: 'shadow',  difficulty: 5, name: 'Night Stalk, Moonless', taunt: 'No moon in the echo. I made sure.',          mutations: ['phantom'], starredMutations: ['phantom'] },
  'hunt-fight-4':   { enemyElementId: 'passion', difficulty: 5, name: 'The Obsession',   taunt: 'A hunter who loves the chase never lets it end.',  mutations: ['pain'] },
  'hunt-fight-5':   { enemyElementId: 'hunt',    difficulty: 5, name: 'Apex, Ascendant', taunt: 'The thing that hunts the hunters went hungry. Once.', mutations: ['apprehension', 'amber'] },

  // ── Soul ──────────────────────────────────────────────────────────
  'soul-fight-1':   { enemyElementId: 'death',   difficulty: 4, name: 'Wisp, Collected', taunt: 'The dead you were loud around filed a complaint.' },
  'soul-fight-2':   { enemyElementId: 'bind',    difficulty: 5, name: 'Grave Chains',    taunt: 'What you spend here is held in escrow. Forever.',   mutations: ['wither'] },
  'soul-fight-3':   { enemyElementId: 'psychic', difficulty: 5, name: 'The Vigil Kept',  taunt: 'The quiet ones remember most. I remember for them.', mutations: ['phantom'], starredMutations: ['phantom'], format: { kind: 'horde' } },
  'soul-fight-4':   { enemyElementId: 'passion', difficulty: 5, name: 'Tether, Tightened', taunt: 'Warmth on loan, called in with interest.',        mutations: ['parasitic'], starredMutations: ['parasitic'] },
  'soul-fight-5':   { enemyElementId: 'soul',    difficulty: 5, name: 'The Ferryman\'s Return Trip', taunt: 'Everyone pays twice. This is twice.',    mutations: ['summoner', 'wither'] },

  // ── Shadow ────────────────────────────────────────────────────────
  'shadow-fight-1':   { enemyElementId: 'silence',  difficulty: 4, name: 'First Dark, Deeper', taunt: 'You turned the light off for us. We kept it off.' },
  'shadow-fight-2':   { enemyElementId: 'illusion', difficulty: 5, name: 'The Shape You Fought', taunt: 'Last time it was a shape. This time the shape rehearsed.', mutations: ['phantom'], starredMutations: ['phantom'] },
  'shadow-fight-3':   { enemyElementId: 'echo',     difficulty: 5, name: 'What Moved Behind You', taunt: 'It has been behind you since the first telling.', mutations: ['blustery'] },
  'shadow-fight-4':   { enemyElementId: 'death',    difficulty: 5, name: 'Hopelessness, Fulfilled', taunt: 'You proved swinging mattered. We fixed that.', mutations: ['abyss'], format: { kind: 'flood', graceSeconds: 30 } },
  'shadow-fight-5':   { enemyElementId: 'shadow',   difficulty: 5, name: 'The Maze, Inverted', taunt: 'This time the maze looks for you.',            mutations: ['apprehension', 'phantom'] },

  // ── Creation ──────────────────────────────────────────────────────
  'creation-fight-1':   { enemyElementId: 'technology', difficulty: 4, name: 'The Workshop, Automated', taunt: 'I built a machine that builds machines that dislike you.' },
  'creation-fight-2':   { enemyElementId: 'conquest',  difficulty: 5, name: 'The Assembly Militarised', taunt: 'The line makes soldiers now. You are the quota.', mutations: ['tinker'], starredMutations: ['tinker'], format: { kind: 'horde' } },
  'creation-fight-3':   { enemyElementId: 'ruin',      difficulty: 5, name: 'Unmaking',      taunt: 'To build a thing properly, first watch it fall.', mutations: ['titanic'] },
  'creation-fight-4':   { enemyElementId: 'chalk',     difficulty: 5, name: 'The Draft Table', taunt: 'Blueprints fight back in the second telling.',  mutations: ['order'], starredMutations: ['order'] },
  'creation-fight-5':   { enemyElementId: 'creation',  difficulty: 5, name: 'The Architect\'s Revision', taunt: 'I redrew the room. Your exit is a supporting wall now.', mutations: ['empyreon', 'tinker'] },

  // ── Gravity ───────────────────────────────────────────────────────
  'gravity-fight-1':   { enemyElementId: 'magnet',  difficulty: 4, name: 'Downward, Sideways', taunt: 'The echo added a second down. It is to your left.' },
  'gravity-fight-2':   { enemyElementId: 'depths',  difficulty: 5, name: 'Terminal Depth', taunt: 'The ground always wins. The trench collects.',     mutations: ['titanic'] },
  'gravity-fight-3':   { enemyElementId: 'psychic', difficulty: 5, name: 'Event Horizon of Thought', taunt: 'Some ideas have gravity. Mine have appetite.', mutations: ['order'], starredMutations: ['order'], format: { kind: 'flood', graceSeconds: 35 } },
  'gravity-fight-4':   { enemyElementId: 'bind',    difficulty: 5, name: 'The Well, Chained', taunt: 'Pull is patience. Chains are certainty.',        mutations: ['pain'] },
  'gravity-fight-5':   { enemyElementId: 'gravity', difficulty: 5, name: 'Singularity, Second Pass', taunt: 'Nothing leaves. You left. We are fixing it.', mutations: ['empyreon', 'order'] },

  // ── Time (world id `sand`) ────────────────────────────────────────
  'sand-fight-1':   { enemyElementId: 'echo',    difficulty: 4, name: 'The Hourglass, Turned', taunt: 'This is the same minute you already won. Feel it fighting back.' },
  'sand-fight-2':   { enemyElementId: 'amber',   difficulty: 5, name: 'Countdown, Preserved', taunt: 'Tock.',                                        mutations: ['order'] },
  'sand-fight-3':   { enemyElementId: 'fate',    difficulty: 5, name: 'Dilation, Dealt', taunt: 'I moved twice while you blinked. Then I drew cards.', mutations: ['honor'] },
  'sand-fight-4':   { enemyElementId: 'death',   difficulty: 5, name: 'Rewind To Midnight', taunt: 'We have done this before. You die at the end.',   mutations: ['phantom'], starredMutations: ['phantom'], format: { kind: 'survival', seconds: 75 } },
  'sand-fight-5':   { enemyElementId: 'sand',    difficulty: 5, name: 'The Minute, Endless', taunt: 'I will outlast you by definition. The echo agrees.', mutations: ['apprehension', 'order'] },

  // ══ THE ABSTRACT REALM, RETOLD ═══════════════════════════════════
  // Thought, sound, law and light do not echo the way weather does. Their
  // second telling is less "the same fight, worse" and more "the same idea,
  // taken to its conclusion by something with no reason to stop".

  // ── Electricity ───────────────────────────────────────────────────
  'electricity-fight-1':   { enemyElementId: 'magnet',   difficulty: 4, name: 'Reverse Polarity', taunt: 'The echo ran the current backwards to see what fell out. You did.' },
  'electricity-fight-2':   { enemyElementId: 'plasma',   difficulty: 5, name: 'Arc, Sustained',  taunt: 'A spark is a decision. I have stopped deciding and simply gone.', mutations: ['chaos'], starredMutations: ['chaos'] },
  'electricity-fight-3':   { enemyElementId: 'radiation', difficulty: 5, name: 'The Grid Leaks', taunt: 'Everything you earthed came back up through somewhere else.', mutations: ['wither'] },
  'electricity-fight-4':   { enemyElementId: 'technology', difficulty: 5, name: 'Load Bearing',  taunt: 'This time the storm has a schematic.', mutations: ['tinker'], starredMutations: ['tinker'], format: { kind: 'horde' } },
  'electricity-fight-5':   { enemyElementId: 'electricity', difficulty: 5, name: 'The Storm Crown, Recast', taunt: 'You unseated the storm. Storms do not sit down.', mutations: ['blustery', 'chaos'], starredMutations: ['blustery'] },

  // ── Acid (world id `slime`) ───────────────────────────────────────
  'slime-fight-1':   { enemyElementId: 'gum',     difficulty: 4, name: 'The Vat, Thickened', taunt: 'It stopped dissolving things and started keeping them.' },
  'slime-fight-2':   { enemyElementId: 'oil',     difficulty: 5, name: 'Second Titration', taunt: 'Wrong measure last time. I have written the correct one down.', mutations: ['wither'] },
  'slime-fight-3':   { enemyElementId: 'growth',  difficulty: 5, name: 'What Grew In It', taunt: 'Nothing should live in me. Something does. It has notes on you.', mutations: ['parasitic'], starredMutations: ['parasitic'] },
  'slime-fight-4':   { enemyElementId: 'radiation', difficulty: 5, name: 'Hot Solution', taunt: 'Acid and fallout. The echo mixed them to see. It saw.', mutations: ['encroach'], format: { kind: 'flood', graceSeconds: 34 } },
  'slime-fight-5':   { enemyElementId: 'slime',   difficulty: 5, name: 'The Vat Overflows', taunt: 'You emptied me. Look how much of the floor I have become instead.', mutations: ['encroach', 'titanic'], starredMutations: ['encroach'] },

  // ── Fate ──────────────────────────────────────────────────────────
  'fate-fight-1':   { enemyElementId: 'fortune', difficulty: 4, name: 'The Rake', taunt: 'The house heard you beat the dealer. The house has questions.' },
  'fate-fight-2':   { enemyElementId: 'psychic', difficulty: 5, name: 'Marked Deck',  taunt: 'I do not need luck when I have already seen the hand.', mutations: ['order'], starredMutations: ['order'] },
  'fate-fight-3':   { enemyElementId: 'fate',    difficulty: 5, name: 'The Reshuffle', taunt: 'Same cards. Different order. That is the entire threat.', mutations: ['chaos'] },
  'fate-fight-4':   { enemyElementId: 'illusion', difficulty: 5, name: 'The Tell',    taunt: 'You read me last time. Read this face.', mutations: ['phantom'], starredMutations: ['phantom'] },
  'fate-fight-5':   { enemyElementId: 'fate',    difficulty: 5, name: 'The Dealer, Doubled', taunt: 'All in was a bluff. This is the number I actually had.', mutations: ['golf', 'chaos'], format: { kind: 'tagteam', enemies: ['fate', 'fortune'] } },

  // ── Sound ─────────────────────────────────────────────────────────
  'sound-fight-1':   { enemyElementId: 'echo',    difficulty: 4, name: 'The Repeat',   taunt: 'The hall kept the whole performance. It is playing it back over you.' },
  'sound-fight-2':   { enemyElementId: 'silence', difficulty: 5, name: 'Rest, Held',   taunt: 'Between two notes there is nothing. I live there now.', mutations: ['abyss'] },
  'sound-fight-3':   { enemyElementId: 'air',     difficulty: 5, name: 'Overblown',    taunt: 'Every instrument is a way of hurting air. Watch.', mutations: ['blustery'], starredMutations: ['blustery'] },
  'sound-fight-4':   { enemyElementId: 'passion', difficulty: 5, name: 'The Movement That Kills', taunt: 'It was beautiful the first time too. That was the problem.', mutations: ['apprehension'], format: { kind: 'survival', seconds: 85 } },
  'sound-fight-5':   { enemyElementId: 'sound',   difficulty: 5, name: 'The Crescendo, Unresolved', taunt: 'You ended it on a chord. Endings are for pieces that finish.', mutations: ['chaos', 'apprehension'], starredMutations: ['apprehension'] },

  // ── Light ─────────────────────────────────────────────────────────
  'light-fight-1':   { enemyElementId: 'dune',   difficulty: 4, name: 'Refracted Court', taunt: 'The echo put a haze in front of the sun. Everything doubled.' },
  'light-fight-2':   { enemyElementId: 'shadow', difficulty: 5, name: 'The Long Noon',  taunt: 'Where there is that much light there is exactly that much of me.', mutations: ['phantom'], starredMutations: ['phantom'] },
  'light-fight-3':   { enemyElementId: 'crystal', difficulty: 5, name: 'The Lens Array', taunt: 'One beam was a courtesy. Here is what focusing means.', mutations: ['order'] },
  'light-fight-4':   { enemyElementId: 'radiation', difficulty: 5, name: 'Beyond Visible', taunt: 'You dodged the light. This part of the spectrum does not care.', mutations: ['wither'], format: { kind: 'horde' } },
  'light-fight-5':   { enemyElementId: 'light',  difficulty: 5, name: 'The Solar Court, Risen', taunt: 'Look up. LOOK UP. You did not learn the first time.', mutations: ['empyreon', 'molten'], starredMutations: ['empyreon'] },

  // ── Magnet ────────────────────────────────────────────────────────
  'magnet-fight-1':   { enemyElementId: 'metal',   difficulty: 4, name: 'The Filings Turn', taunt: 'Everything iron in this hall has picked a side. Not yours.' },
  'magnet-fight-2':   { enemyElementId: 'gravity', difficulty: 5, name: 'Two Kinds Of Pull', taunt: 'One of us attracts mass and one attracts iron. You are both.', mutations: ['order'], starredMutations: ['order'] },
  'magnet-fight-3':   { enemyElementId: 'technology', difficulty: 5, name: 'Hard Reset',  taunt: 'A field this strong is just a way of deleting things.', mutations: ['tinker'] },
  'magnet-fight-4':   { enemyElementId: 'magnet',  difficulty: 5, name: 'The Rail, Loaded', taunt: 'Six hundred and twenty pixels a second. I checked. Twice.', mutations: ['pain'], starredMutations: ['pain'] },
  'magnet-fight-5':   { enemyElementId: 'magnet',  difficulty: 5, name: 'The Lodestone Inverted', taunt: 'Push became pull halfway through your last dodge. It still is.', mutations: ['titanic', 'chaos'] },

  // ── Metal ─────────────────────────────────────────────────────────
  'metal-fight-1':   { enemyElementId: 'earth',   difficulty: 4, name: 'The Ore Answers', taunt: 'The legion went back into the ground. The ground came back up.' },
  'metal-fight-2':   { enemyElementId: 'bind',    difficulty: 5, name: 'Shackled Ranks', taunt: 'Discipline is only a chain you agreed to.', mutations: ['order'], starredMutations: ['order'] },
  'metal-fight-3':   { enemyElementId: 'magma',   difficulty: 5, name: 'The Forge Reopened', taunt: 'You broke the sabres. I kept the heat.', mutations: ['molten'] },
  'metal-fight-4':   { enemyElementId: 'metal',   difficulty: 5, name: 'The Second Rank', taunt: 'There was always a second rank. You simply never reached it.', mutations: ['summoner'], starredMutations: ['summoner'], format: { kind: 'horde' } },
  'metal-fight-5':   { enemyElementId: 'metal',   difficulty: 5, name: 'The Iron Legion Reforged', taunt: 'Every soldier you cut down was smelted back into this one.', mutations: ['titanic', 'pain'], starredMutations: ['titanic'] },

  // ── Plasma ────────────────────────────────────────────────────────
  'plasma-fight-1':   { enemyElementId: 'electricity', difficulty: 4, name: 'Ionised Again', taunt: 'The echo could not hold the shape either. It is trying anyway.' },
  'plasma-fight-2':   { enemyElementId: 'fire',    difficulty: 5, name: 'Past The Fourth State', taunt: 'Fire is what happens when you stop halfway.', mutations: ['molten'], starredMutations: ['molten'] },
  'plasma-fight-3':   { enemyElementId: 'plasma',  difficulty: 5, name: 'PURE CHAOS!!',  taunt: 'NO PLAN THIS TIME EITHER!! SAME AMOUNT OF PLAN!!', mutations: ['chaos'], starredMutations: ['chaos'] },
  'plasma-fight-4':   { enemyElementId: 'radiation', difficulty: 5, name: 'The Corona Sheds', taunt: 'Everything that touches me becomes a second problem.', mutations: ['nuclear'] },
  'plasma-fight-5':   { enemyElementId: 'plasma',  difficulty: 5, name: 'The Unbound Star, Unbound', taunt: 'You put the star back in its body. Whose idea was the BODY?', mutations: ['chaos', 'titanic'], format: { kind: 'flood', graceSeconds: 32 } },

  // ── Rubber ────────────────────────────────────────────────────────
  'rubber-fight-1':   { enemyElementId: 'gum',    difficulty: 4, name: 'The Bounce, Sticky', taunt: 'Same rebound. It just does not let go at the top any more.' },
  'rubber-fight-2':   { enemyElementId: 'rubber', difficulty: 5, name: 'Overwound',      taunt: 'The band went past taut somewhere behind you.', mutations: ['pain'], starredMutations: ['pain'] },
  'rubber-fight-3':   { enemyElementId: 'magnet', difficulty: 5, name: 'The Gear Train', taunt: 'Add a magnet to a gear and you have a machine with a grudge.', mutations: ['tinker'] },
  'rubber-fight-4':   { enemyElementId: 'echo',   difficulty: 5, name: 'Every Rebound',  taunt: 'It came back. It came back. It came back. It came—', mutations: ['chaos'], format: { kind: 'survival', seconds: 80 } },
  'rubber-fight-5':   { enemyElementId: 'rubber', difficulty: 5, name: 'Uber-Gear, Regeared', taunt: 'You stopped the train. Trains have a second half.', mutations: ['titanic', 'blustery'], starredMutations: ['titanic'] },

  // ── Gunpowder ─────────────────────────────────────────────────────
  'gunpowder-fight-1':   { enemyElementId: 'oil',       difficulty: 4, name: 'Fresh Powder', taunt: 'The echo restocked. It restocked a great deal.' },
  'gunpowder-fight-2':   { enemyElementId: 'gunpowder', difficulty: 5, name: 'The Second Volley', taunt: 'Five muskets was the demonstration. This is the order.', mutations: ['pain'], starredMutations: ['pain'] },
  'gunpowder-fight-3':   { enemyElementId: 'magma',     difficulty: 5, name: 'The Long Fuse', taunt: 'The fuse runs under the whole realm this time. Listen to it.', mutations: ['nuclear'] },
  'gunpowder-fight-4':   { enemyElementId: 'conquest',  difficulty: 5, name: 'The Bombardment', taunt: 'Artillery is only patience with a schedule.', mutations: ['summoner'], starredMutations: ['summoner'], format: { kind: 'horde' } },
  'gunpowder-fight-5':   { enemyElementId: 'gunpowder', difficulty: 5, name: 'Final Ordinance, Reloaded', taunt: 'You spiked the guns. There is a keg under every ONE of them.', mutations: ['molten', 'chaos'], starredMutations: ['molten'] },

  // ── Echo ──────────────────────────────────────────────────────────
  'echo-fight-1':   { enemyElementId: 'sound',   difficulty: 4, name: 'The Source',   taunt: 'You beat the reflection. Now the thing it was reflecting.' },
  'echo-fight-2':   { enemyElementId: 'silence', difficulty: 5, name: 'Nothing Comes Back', taunt: 'Shout in here. Go on. I will keep it.', mutations: ['abyss'] },
  'echo-fight-3':   { enemyElementId: 'echo',    difficulty: 5, name: 'The Long Cavern', taunt: 'Everything you did in this fight, you will do again in nine seconds.', mutations: ['apprehension'], starredMutations: ['apprehension'] },
  'echo-fight-4':   { enemyElementId: 'psychic', difficulty: 5, name: 'Anticipated Return', taunt: 'The echo arrives before the sound now. Do keep up.', mutations: ['order'] },
  'echo-fight-5':   { enemyElementId: 'echo',    difficulty: 5, name: 'The Cavern, Answered', taunt: 'You found me by sound. I have been finding you by yours the whole time.', mutations: ['phantom', 'chaos'], starredMutations: ['phantom'] },

  // ── Silence ───────────────────────────────────────────────────────
  'silence-fight-1':   { enemyElementId: 'shadow',  difficulty: 4, name: 'The Understudy Waits', taunt: 'It has been practising your walk in the dark.' },
  'silence-fight-2':   { enemyElementId: 'silence', difficulty: 5, name: 'The Hush, Wider', taunt: '. . .', mutations: ['abyss'] },
  'silence-fight-3':   { enemyElementId: 'illusion', difficulty: 5, name: 'The Marionette Ward', taunt: 'Your hands were never yours. Neither was that dodge.', mutations: ['phantom'], starredMutations: ['phantom'] },
  'silence-fight-4':   { enemyElementId: 'bind',    difficulty: 5, name: 'Strings, Shortened', taunt: 'A cage is only a string with an opinion about distance.', mutations: ['order'], format: { kind: 'survival', seconds: 88 } },
  'silence-fight-5':   { enemyElementId: 'silence', difficulty: 5, name: 'The Puppetmaster, Unstrung', taunt: '. . . . . .', mutations: ['apprehension', 'wither'], starredMutations: ['apprehension'] },

  // ── Magic ─────────────────────────────────────────────────────────
  'magic-fight-1':   { enemyElementId: 'creation', difficulty: 4, name: 'The Restricted Section', taunt: 'The echo got a library card. It should not have one.' },
  'magic-fight-2':   { enemyElementId: 'psychic',  difficulty: 5, name: 'Read Ahead',     taunt: 'Every spell is a sentence. I have read to the end of yours.', mutations: ['order'], starredMutations: ['order'] },
  'magic-fight-3':   { enemyElementId: 'magic',    difficulty: 5, name: 'The Fourth School', taunt: 'Three grimoires was the syllabus. This is the reading list.', mutations: ['summoner'], starredMutations: ['summoner'] },
  'magic-fight-4':   { enemyElementId: 'paper',    difficulty: 5, name: 'Marginalia',     taunt: 'Somebody has been writing in the books. Somebody CRUEL.', mutations: ['wither'], format: { kind: 'horde' } },
  'magic-fight-5':   { enemyElementId: 'magic',    difficulty: 5, name: 'The Archmage, Uncited', taunt: 'You passed the assessment. Here is the one nobody passes.', mutations: ['empyreon', 'chaos'], starredMutations: ['empyreon'] },

  // ── Technology ────────────────────────────────────────────────────
  'technology-fight-1':   { enemyElementId: 'metal',      difficulty: 4, name: 'Legacy Hardware', taunt: 'The echo rolled back to a version that still had teeth.' },
  'technology-fight-2':   { enemyElementId: 'technology', difficulty: 5, name: 'Horizontal Scaling', taunt: 'One instance was never the plan. You have met the plan.', mutations: ['summoner'], starredMutations: ['summoner'], format: { kind: 'horde' } },
  'technology-fight-3':   { enemyElementId: 'electricity', difficulty: 5, name: 'Thermal Throttle', taunt: 'Everything computes. Some of it computes at you.', mutations: ['tinker'] },
  'technology-fight-4':   { enemyElementId: 'dune',       difficulty: 5, name: 'The Buffer Fills', taunt: 'I am rendering you at a resolution you will not enjoy.', mutations: ['order'], starredMutations: ['order'] },
  'technology-fight-5':   { enemyElementId: 'technology', difficulty: 5, name: 'The Swarm Protocol, Forked', taunt: 'Incident report: you. Remediation: several thousand of me.', mutations: ['tinker', 'titanic'], format: { kind: 'tagteam', enemies: ['technology', 'metal'] } },

  // ── Subterfuge (world id `subterfuge`) ───────────────────────────────
  'subterfuge-fight-1':   { enemyElementId: 'shadow',  difficulty: 4, name: 'The Second Meeting', taunt: 'Nothing personal. It is still all business, and business remembers.' },
  'subterfuge-fight-2':   { enemyElementId: 'fortune', difficulty: 5, name: 'The Vig',       taunt: 'You took the bribe. This is the interest, and I am the interest.', mutations: ['golf'] },
  'subterfuge-fight-3':   { enemyElementId: 'subterfuge', difficulty: 5, name: 'Made Men',      taunt: 'Eleven associates. I have hired forty. Do the arithmetic.', mutations: ['summoner'], starredMutations: ['summoner'] },
  'subterfuge-fight-4':   { enemyElementId: 'silence', difficulty: 5, name: 'Omertà',        taunt: 'Nobody in this room has seen anything. Including you, shortly.', mutations: ['abyss'], format: { kind: 'survival', seconds: 90 } },
  'subterfuge-fight-5':   { enemyElementId: 'subterfuge', difficulty: 5, name: 'The Kingpin, Reinstated', taunt: 'The Family settled. Then the Family reopened the file.', mutations: ['pain', 'phantom'], starredMutations: ['pain'] },

  // ══ THE CORRUPT REALM, RETOLD ════════════════════════════════════
  // The exiles were eaten first, so their echo is the oldest and the least
  // like a memory. Nothing here is a repeat of a fight — it is the same
  // creature, several ages further into being digested.

  // ── Ruin ──────────────────────────────────────────────────────────
  'ruin-fight-1':   { enemyElementId: 'earth',     difficulty: 5, name: 'The Foundations Go', taunt: 'You cleared the rubble. Rubble is only a building mid-sentence.' },
  'ruin-fight-2':   { enemyElementId: 'gunpowder', difficulty: 5, name: 'Controlled Demolition', taunt: 'This time it is scheduled, surveyed, and signed off.', mutations: ['molten'], starredMutations: ['molten'] },
  'ruin-fight-3':   { enemyElementId: 'ruin',      difficulty: 5, name: 'Structural Grief', taunt: 'Every wall I ever raised, I was also aiming. I have better aim now.', mutations: ['pain'], starredMutations: ['pain'] },
  'ruin-fight-4':   { enemyElementId: 'shadow',    difficulty: 5, name: 'The Court That Emptied Twice', taunt: 'The thrones creaked last time. Listen to what they do now.', mutations: ['phantom', 'wither'], starredMutations: ['phantom'] },
  'ruin-fight-5':   { enemyElementId: 'ruin',      difficulty: 5, name: 'Nothing With A Roof', taunt: 'There was one room left. I have had an age and a grudge.', mutations: ['titanic', 'summoner'], format: { kind: 'flood', graceSeconds: 30 } },

  // ── Death ─────────────────────────────────────────────────────────
  'death-fight-1':   { enemyElementId: 'soul',   difficulty: 5, name: 'Rites, Repeated', taunt: 'You were early last time. You are late now, and the difference is billable.' },
  'death-fight-2':   { enemyElementId: 'amber',  difficulty: 5, name: 'Preserved In State', taunt: 'Two ways to stop a thing. We have decided to combine them.', mutations: ['order'], starredMutations: ['order'] },
  'death-fight-3':   { enemyElementId: 'death',  difficulty: 5, name: 'The Second Interment', taunt: 'I buried the Sovereigns. I have started on the visitors.', mutations: ['wither'] },
  'death-fight-4':   { enemyElementId: 'bind',   difficulty: 5, name: 'The Long Vigil', taunt: 'Nobody leaves the wake. It is rude and the doors are chained.', mutations: ['abyss'], format: { kind: 'survival', seconds: 92 } },
  'death-fight-5':   { enemyElementId: 'death',  difficulty: 5, name: 'The Parish Full', taunt: 'Every plot dug, every measurement kept. Yours was always going to fit.', mutations: ['summoner', 'phantom'], starredMutations: ['summoner'] },

  // ── Illusion ──────────────────────────────────────────────────────
  'illusion-fight-1':   { enemyElementId: 'dune',     difficulty: 5, name: 'The House Shimmers', taunt: 'The stage found a mirage. Now there are two of everything, and one of you.' },
  'illusion-fight-2':   { enemyElementId: 'illusion', difficulty: 5, name: 'The Understudy Went On', taunt: 'The real one never came back. Nobody in the audience noticed.', mutations: ['phantom'], starredMutations: ['phantom'] },
  'illusion-fight-3':   { enemyElementId: 'psychic',  difficulty: 5, name: 'Suspension Of Disbelief', taunt: 'It is only a trick if you are outside it.', mutations: ['apprehension'] },
  'illusion-fight-4':   { enemyElementId: 'chalk',    difficulty: 5, name: 'Painted Company', taunt: 'The scenery has parts now. It has been rehearsing with the cast.', mutations: ['summoner'], starredMutations: ['summoner'], format: { kind: 'horde' } },
  'illusion-fight-5':   { enemyElementId: 'illusion', difficulty: 5, name: 'The Curtain, Never Falling', taunt: 'You gave me an ending. I have cut the ending.', mutations: ['chaos', 'wither'], starredMutations: ['chaos'] },

  // ── Conquest ──────────────────────────────────────────────────────
  'conquest-fight-1':   { enemyElementId: 'metal',    difficulty: 5, name: 'The Muster', taunt: 'You took the high ground. The echo brought a second army to it.' },
  'conquest-fight-2':   { enemyElementId: 'conquest', difficulty: 5, name: 'Scorched Ground', taunt: 'If it cannot be held it can at least be UNUSABLE.', mutations: ['molten'], starredMutations: ['molten'] },
  'conquest-fight-3':   { enemyElementId: 'gunpowder', difficulty: 5, name: 'The Siege Train', taunt: 'Walls were a phase. Ask any of these craters.', mutations: ['pain'] },
  'conquest-fight-4':   { enemyElementId: 'conquest', difficulty: 5, name: 'Total Levy',  taunt: 'Everyone who can hold a spear. Then everyone who cannot.', mutations: ['summoner', 'titanic'], starredMutations: ['summoner'], format: { kind: 'horde' } },
  'conquest-fight-5':   { enemyElementId: 'conquest', difficulty: 5, name: 'The Warmaster, Unbeaten', taunt: 'I lost one war. I have gone back and disputed the result.', mutations: ['order', 'pain'], starredMutations: ['order'] },

  // ── Gluttony ──────────────────────────────────────────────────────
  'gluttony-fight-1':   { enemyElementId: 'gum',      difficulty: 5, name: 'The Kitchen Floor', taunt: 'Everything spilled here is still here, and it has opinions about you.' },
  'gluttony-fight-2':   { enemyElementId: 'gluttony', difficulty: 5, name: 'Second Sitting', taunt: 'You cleared a plate. There were forty-six other plates.', mutations: ['parasitic'], starredMutations: ['parasitic'] },
  'gluttony-fight-3':   { enemyElementId: 'depths',   difficulty: 5, name: 'What Came Up The Drain', taunt: 'The kitchen empties somewhere. Somewhere ate.', mutations: ['encroach'] },
  'gluttony-fight-4':   { enemyElementId: 'gluttony', difficulty: 5, name: 'The Board Set For Two', taunt: 'I set two places. You have been the second course all evening.', mutations: ['titanic'], starredMutations: ['titanic'], format: { kind: 'survival', seconds: 86 } },
  'gluttony-fight-5':   { enemyElementId: 'gluttony', difficulty: 5, name: 'The Devouring Board, Cleared', taunt: 'A feast is only a war you eat. I am RAVENOUS and it is still early.', mutations: ['summoner', 'parasitic'] },

  // ── Amber ─────────────────────────────────────────────────────────
  'amber-fight-1':   { enemyElementId: 'ice',    difficulty: 5, name: 'Two Ways To Keep', taunt: 'The gallery hired a consultant. It freezes what I cannot set.' },
  'amber-fight-2':   { enemyElementId: 'amber',  difficulty: 5, name: 'The Second Pour', taunt: 'The resin took your outline last time. It would like the detail.', mutations: ['order'], starredMutations: ['order'] },
  'amber-fight-3':   { enemyElementId: 'hunt',   difficulty: 5, name: 'The Collection Runs', taunt: 'Everything in a case wants out of the case.', mutations: ['summoner'] },
  'amber-fight-4':   { enemyElementId: 'bind',   difficulty: 5, name: 'Acquisition Order', taunt: 'Preservation and custody. It was always the same department.', mutations: ['pain'], starredMutations: ['pain'] },
  'amber-fight-5':   { enemyElementId: 'amber',  difficulty: 5, name: 'The Curator, Catalogued', taunt: 'Hold still. HOLD STILL. I have the plinth ready and the light is finally correct.', mutations: ['apprehension', 'titanic'], starredMutations: ['apprehension'] },

  // ── Bind ──────────────────────────────────────────────────────────
  'bind-fight-1':   { enemyElementId: 'metal',  difficulty: 5, name: 'New Chain, Old Ring', taunt: 'The gaol replaced everything you broke and shortened it a little.' },
  'bind-fight-2':   { enemyElementId: 'bind',   difficulty: 5, name: 'Remand, Denied', taunt: 'You made bail once. There is no bail. There was never bail.', mutations: ['order'], starredMutations: ['order'] },
  'bind-fight-3':   { enemyElementId: 'gravity', difficulty: 5, name: 'Weight Of Sentence', taunt: 'Everything holds on to everything. I simply do it on purpose.', mutations: ['pain'] },
  'bind-fight-4':   { enemyElementId: 'silence', difficulty: 5, name: 'Solitary Wing', taunt: 'A cell and a hush are the same instrument.', mutations: ['abyss'], format: { kind: 'survival', seconds: 90 } },
  'bind-fight-5':   { enemyElementId: 'bind',   difficulty: 5, name: 'The Gaoler, Doubled', taunt: 'Every cell in the realm has a name on it. I have run out of other names.', mutations: ['titanic', 'encroach'], starredMutations: ['titanic'] },

  // ── Paper ─────────────────────────────────────────────────────────
  'paper-fight-1':   { enemyElementId: 'chalk',  difficulty: 5, name: 'The Draft Board', taunt: 'The record and the sketch have been comparing accounts of you.' },
  'paper-fight-2':   { enemyElementId: 'paper',  difficulty: 5, name: 'The Amended Minutes', taunt: 'I have gone back over your last fight. You did much worse in it now.', mutations: ['order'], starredMutations: ['order'] },
  'paper-fight-3':   { enemyElementId: 'magic',  difficulty: 5, name: 'The Overdue Volume', taunt: 'Ninety thousand books and every one of them has your name in the margin.', mutations: ['summoner'] },
  'paper-fight-4':   { enemyElementId: 'silence', difficulty: 5, name: 'Redacted In Full', taunt: 'There is a version of this fight where you are simply not mentioned.', mutations: ['abyss'], format: { kind: 'horde' } },
  'paper-fight-5':   { enemyElementId: 'paper',  difficulty: 5, name: 'The Chronicler, Revised', taunt: 'History is whatever survives the edit. I am editing FASTER.', mutations: ['phantom', 'wither'], starredMutations: ['phantom'] },

  // ── Chalk ─────────────────────────────────────────────────────────
  'chalk-fight-1':   { enemyElementId: 'illusion', difficulty: 5, name: 'The Blackboard Lies', taunt: 'Drawn and pretended are neighbours. They have knocked through.' },
  'chalk-fight-2':   { enemyElementId: 'chalk',    difficulty: 5, name: 'The Fair Copy',   taunt: 'You were a rough sketch. I have inked you.', mutations: ['order'], starredMutations: ['order'] },
  'chalk-fight-3':   { enemyElementId: 'creation', difficulty: 5, name: 'Made Real',       taunt: 'Nobody was checking. So I stopped drawing and started BUILDING.', mutations: ['summoner'], starredMutations: ['summoner'], format: { kind: 'horde' } },
  'chalk-fight-4':   { enemyElementId: 'chalk',    difficulty: 5, name: 'The Board Wipes', taunt: 'Whole seconds go unreadable. I have learned which ones.', mutations: ['apprehension'] },
  'chalk-fight-5':   { enemyElementId: 'chalk',    difficulty: 5, name: 'The Draughtsman, Finished', taunt: 'I have drawn you badly a thousand times. Stand there. THIS one is going up.', mutations: ['chaos', 'titanic'], starredMutations: ['chaos'] },

  // ── Psychic ───────────────────────────────────────────────────────
  'psychic-fight-1':   { enemyElementId: 'dream',   difficulty: 5, name: 'The Room Throbs', taunt: 'It has stopped being your idea that you came in here.' },
  'psychic-fight-2':   { enemyElementId: 'psychic', difficulty: 5, name: 'Four Thousand Runs', taunt: 'I ran this again while you were reading that. You lost most of them.', mutations: ['order'], starredMutations: ['order'] },
  'psychic-fight-3':   { enemyElementId: 'fate',    difficulty: 5, name: 'Foregone',        taunt: 'Knowing and deciding are the same verb down here.', mutations: ['apprehension'], starredMutations: ['apprehension'] },
  'psychic-fight-4':   { enemyElementId: 'silence', difficulty: 5, name: 'The Quiet Idea',  taunt: 'One enormous thought and no room left for yours.', mutations: ['abyss'], format: { kind: 'survival', seconds: 88 } },
  'psychic-fight-5':   { enemyElementId: 'psychic', difficulty: 5, name: 'The Overmind, Certain', taunt: 'One of us is imagining the other. I have stopped asking which.', mutations: ['phantom', 'pain'], starredMutations: ['pain'] },

  // ── Passion ───────────────────────────────────────────────────────
  'passion-fight-1':   { enemyElementId: 'sound',   difficulty: 5, name: 'The Court Keeps Time', taunt: 'The floor has a heartbeat and it has learned your name.' },
  'passion-fight-2':   { enemyElementId: 'passion', difficulty: 5, name: 'The Second Courtship', taunt: 'You left. Everyone leaves. Not everyone gets asked TWICE.', mutations: ['pain'], starredMutations: ['pain'] },
  'passion-fight-3':   { enemyElementId: 'fire',    difficulty: 5, name: 'Burning Too Hot To Govern', taunt: 'They exiled me for this exact temperature. Enjoy it.', mutations: ['molten'] },
  'passion-fight-4':   { enemyElementId: 'bind',    difficulty: 5, name: 'Attachment',      taunt: 'Distance breaks the thread. Look how much distance there is not.', mutations: ['encroach'], starredMutations: ['encroach'], format: { kind: 'flood', graceSeconds: 32 } },
  'passion-fight-5':   { enemyElementId: 'passion', difficulty: 5, name: 'The Heartbreaker, Unhealed', taunt: 'I will cherish the memory of this one too. You still will not have one.', mutations: ['apprehension', 'chaos'], starredMutations: ['apprehension'] },

  // ── Sand ──────────────────────────────────────────────────────────
  'dune-fight-1':   { enemyElementId: 'crystal', difficulty: 5, name: 'The Higher Ledge', taunt: 'The hall added storeys. Every one of them is looking down at you.' },
  'dune-fight-2':   { enemyElementId: 'dune',    difficulty: 5, name: 'The True Picture', taunt: 'The realm before the fall. You are standing in it and you are the flaw.', mutations: ['order'], starredMutations: ['order'] },
  'dune-fight-3':   { enemyElementId: 'light',   difficulty: 5, name: 'Total Glare',     taunt: 'Nothing gets out of a hall of heat. Nothing HAS.', mutations: ['pain'] },
  'dune-fight-4':   { enemyElementId: 'ice',     difficulty: 5, name: 'The Slope Sheds', taunt: 'Rings mark the drop. There are a great many rings now.', mutations: ['apprehension'], starredMutations: ['apprehension'], format: { kind: 'survival', seconds: 84 } },
  'dune-fight-5':   { enemyElementId: 'dune',    difficulty: 5, name: 'The Miragewright, Redrawn', taunt: 'You scattered the last true picture. I painted the scattering.', mutations: ['phantom', 'chaos'], starredMutations: ['phantom'] },

  // ── Fortune ───────────────────────────────────────────────────────
  'fortune-fight-1':   { enemyElementId: 'fate',    difficulty: 5, name: 'The House Rules', taunt: 'Luck came in to complain. Luck now works the door.' },
  'fortune-fight-2':   { enemyElementId: 'fortune', difficulty: 5, name: 'The Margin Call', taunt: 'Everything you are standing on is collateral. Including the standing.', mutations: ['golf'], starredMutations: ['golf'] },
  'fortune-fight-3':   { enemyElementId: 'subterfuge', difficulty: 5, name: 'Silent Partners', taunt: 'The Family took a position in the counting house. Small position. Large men.', mutations: ['summoner'] },
  'fortune-fight-4':   { enemyElementId: 'fortune', difficulty: 5, name: 'The House Edge',  taunt: 'Twelve percent. Then twenty-four. Then the walls.', mutations: ['encroach'], starredMutations: ['encroach'], format: { kind: 'flood', graceSeconds: 30 } },
  'fortune-fight-5':   { enemyElementId: 'fortune', difficulty: 5, name: 'The Broker, Leveraged', taunt: 'I shorted the realm and collected. This time I am short on YOU.', mutations: ['pain', 'chaos'], starredMutations: ['pain'] },

  // ── Magma ─────────────────────────────────────────────────────────
  'magma-fight-1':   { enemyElementId: 'earth',  difficulty: 5, name: 'The Lid Complains', taunt: 'Every plate has a grievance. They have been comparing them.' },
  'magma-fight-2':   { enemyElementId: 'magma',  difficulty: 5, name: 'Off Schedule',     taunt: 'You learned the vents. So I have stopped keeping to them.', mutations: ['chaos'], starredMutations: ['chaos'] },
  'magma-fight-3':   { enemyElementId: 'oil',    difficulty: 5, name: 'What Feeds It',    taunt: 'Something down here is combustible and it is not me.', mutations: ['molten'], starredMutations: ['molten'] },
  'magma-fight-4':   { enemyElementId: 'magma',  difficulty: 5, name: 'The Flow, Wider',  taunt: 'Crust behind, floor ahead, and less and less of both.', mutations: ['encroach'], format: { kind: 'flood', graceSeconds: 28 } },
  'magma-fight-5':   { enemyElementId: 'magma',  difficulty: 5, name: 'The Caldera King, Venting', taunt: 'There is no floor. There never WAS a floor. There is a lid and it is me.', mutations: ['titanic', 'pain'], starredMutations: ['titanic'] },

  // ── Radiation ─────────────────────────────────────────────────────
  'radiation-fight-1':   { enemyElementId: 'slime',     difficulty: 5, name: 'Hot Runoff', taunt: 'The zone drains into something. The something is awake.' },
  'radiation-fight-2':   { enemyElementId: 'radiation', difficulty: 5, name: 'Dose Response', taunt: 'You washed it off last time. There is nowhere clean in this telling.', mutations: ['wither'] },
  'radiation-fight-3':   { enemyElementId: 'plasma',    difficulty: 5, name: 'Criticality', taunt: 'Two very generous elements in one very small room.', mutations: ['nuclear'] },
  'radiation-fight-4':   { enemyElementId: 'radiation', difficulty: 5, name: 'The Exclusion Widens', taunt: 'The signs said keep out. I have moved the signs inward.', mutations: ['encroach'], starredMutations: ['encroach'], format: { kind: 'survival', seconds: 90 } },
  'radiation-fight-5':   { enemyElementId: 'radiation', difficulty: 5, name: 'The Halflife Court, Halved Again', taunt: 'My kingdom decays at a fixed rate. I have found the FASTER rate.', mutations: ['pain', 'apprehension'], starredMutations: ['pain'] },

  // ── Depths ────────────────────────────────────────────────────────
  'depths-fight-1':   { enemyElementId: 'water',  difficulty: 5, name: 'The Column Above', taunt: 'Everything the surface dropped is down here. So is the surface, now.' },
  'depths-fight-2':   { enemyElementId: 'depths', difficulty: 5, name: 'Second Undertow', taunt: 'You counted the cycle. I have changed the count.', mutations: ['encroach'], starredMutations: ['encroach'] },
  'depths-fight-3':   { enemyElementId: 'gluttony', difficulty: 5, name: 'The Trench Feeds', taunt: 'Down here, keeping and eating are the same verb.', mutations: ['parasitic'] },
  'depths-fight-4':   { enemyElementId: 'depths', difficulty: 5, name: 'Every Lure At Once', taunt: 'Follow whichever light you like. They all end in the same room.', mutations: ['summoner'], starredMutations: ['summoner'], format: { kind: 'horde' } },
  'depths-fight-5':   { enemyElementId: 'depths', difficulty: 5, name: 'The Sunken Throne, Deeper', taunt: 'Crowns sink. So does everything above one. Feel the weight yet?', mutations: ['pain', 'abyss'], starredMutations: ['pain'] },

  // ── Slime, the exile (world id `gum`) ─────────────────────────────
  'gum-fight-1':   { enemyElementId: 'oil',   difficulty: 5, name: 'The Floor Keeps It', taunt: 'Whatever momentum you bring, I am still holding the last lot.' },
  'gum-fight-2':   { enemyElementId: 'gum',   difficulty: 5, name: 'Second Engulfment', taunt: 'You have been standing in me for some time. I thought it rude to mention.', mutations: ['encroach'], starredMutations: ['encroach'] },
  'gum-fight-3':   { enemyElementId: 'slime', difficulty: 5, name: 'The Two Solutions', taunt: 'One of us dissolves and one of us keeps. Guess which is behind you.', mutations: ['wither'] },
  'gum-fight-4':   { enemyElementId: 'gum',   difficulty: 5, name: 'Division, Repeated', taunt: 'I do not take damage. I redistribute it. There is a great deal to distribute.', mutations: ['summoner', 'parasitic'], starredMutations: ['summoner'], format: { kind: 'horde' } },
  'gum-fight-5':   { enemyElementId: 'gum',   difficulty: 5, name: 'The Ooze Eternal, Still Arriving', taunt: 'The realm fell into me an age ago. It has not finished falling.', mutations: ['titanic', 'parasitic'], starredMutations: ['titanic'] },
};

/**
 * The def a bout actually runs under, hard mode folded in. Every reader —
 * briefing, element select, ArenaScene's format kit, the results screen —
 * calls this so the promise and the fight can never drift apart.
 */
export function getEffectiveFightDef(nodeId: string, hardMode: boolean): CampaignFightDef | undefined {
  if (hardMode) {
    const hard = CAMPAIGN_FIGHTS_HARD[nodeId];
    if (hard) return hard;
  }
  return getCampaignFightDef(nodeId);
}

/** True when Hard Mode swaps in a full remix rather than the +1/star fallback. */
export function hasHardRemix(nodeId: string): boolean {
  return !!CAMPAIGN_FIGHTS_HARD[nodeId];
}
