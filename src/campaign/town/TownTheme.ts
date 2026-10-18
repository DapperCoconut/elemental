/**
 * Per-world atmosphere for the free-roam campaign towns.
 *
 * Every campaign world (all three realms, 48 of them) walks as its own town. What makes
 * one town read differently from the next is entirely data: the ground and paving, the
 * building materials and roof silhouette, which props litter the streets, the weather,
 * the castle the Sovereign sits in, what the locals wear and what they mutter. The
 * renderer (`TownRenderer.ts`) knows how to draw every prop and roof here; this file only
 * decides which of them each world gets.
 *
 * Id traps, as everywhere: `sand` is **Time**, `dune` is Sand; `slime` is **Acid**, `gum`
 * is Slime; `gluttony` is Harvest; `passion` is Devotion; `fortune` is Gold.
 */

export type RoofStyle =
  | 'gable' | 'flat' | 'dome' | 'spire' | 'tent' | 'crooked' | 'mushroom' | 'pagoda' | 'stepped';

export type Paving =
  | 'cobble' | 'plank' | 'sand' | 'ice' | 'slab' | 'dirt' | 'tile' | 'metal' | 'bone' | 'glass';

export type ParticleKind =
  | 'ember' | 'rain' | 'snow' | 'leaf' | 'spore' | 'spark' | 'ash' | 'mote' | 'bubble'
  | 'note' | 'glyph' | 'dust' | 'petal' | 'feather' | 'paper';

export type FeatureKind = 'none' | 'river' | 'chasm';

export type CastleStyle = 'keep' | 'spire' | 'ziggurat' | 'dome' | 'fortress' | 'tower';

export type HatKind =
  | 'none' | 'hood' | 'cap' | 'horns' | 'helmet' | 'pointy' | 'tophat' | 'leaf' | 'halo'
  | 'antenna' | 'crown' | 'band' | 'straw' | 'mask';

/** Every prop the renderer can draw. `TownRenderer.PROP_INFO` gives each one a footprint. */
export type PropKind =
  // generic
  | 'tree' | 'pine' | 'bush' | 'rock' | 'crate' | 'barrel' | 'well' | 'bench' | 'flowerbed'
  | 'statue' | 'deadTree' | 'willow' | 'fountain'
  // fire / magma
  | 'lavaVent' | 'brazier' | 'obsidianSpire' | 'charredTree'
  // water / depths
  | 'lilyPond' | 'anchor' | 'coral' | 'kelp' | 'buoy'
  // life / gluttony / passion
  | 'beehive' | 'mushroomRing' | 'scarecrow' | 'pumpkin' | 'haybale' | 'wheat' | 'heartArch' | 'candle'
  // air / gravity / psychic
  | 'windmill' | 'floatRock' | 'cloudPuff' | 'orbitStones' | 'crater' | 'eyeStatue'
  // earth / creation / metal
  | 'mineCart' | 'boulder' | 'anvil' | 'chimneyForge' | 'gearPile' | 'gear' | 'pipeStack'
  // oil / radiation / acid / gum
  | 'derrick' | 'oilSlick' | 'barrelHazard' | 'warningSign' | 'acidPool' | 'gumBlob'
  // ice
  | 'iceSpike' | 'snowman' | 'snowdrift'
  // growth / crystal / magic
  | 'fungus' | 'sporePod' | 'crystal' | 'geode' | 'runeCircle' | 'bookPile'
  // hunt / dune / death / soul
  | 'bonePile' | 'antlerTotem' | 'tent' | 'cactus' | 'duneMound' | 'coffin' | 'gravestone' | 'ghostLantern'
  // shadow / silence / illusion
  | 'obelisk' | 'shadowPool' | 'muteStatue' | 'fogPatch' | 'mirror' | 'maskPole' | 'swirl'
  // time
  | 'hourglass' | 'clockPost' | 'sundial'
  // electricity / plasma / tech
  | 'pylon' | 'teslaCoil' | 'plasmaOrb' | 'terminal' | 'serverRack'
  // fate / sound / light / magnet / rubber / gunpowder / echo / subterfuge
  | 'cardStand' | 'giantDie' | 'speaker' | 'drum' | 'tuningFork' | 'prism' | 'mirrorPost'
  | 'horseshoe' | 'ironFilings' | 'bouncePad' | 'rubberBall' | 'duck' | 'cannon' | 'powderKeg'
  | 'echoBell' | 'stalagmite' | 'wantedBoard'
  // ruin / conquest / cloth / bind / paper / chalk / fortune
  | 'rubble' | 'brokenPillar' | 'banner' | 'spikes' | 'spool' | 'clothesline' | 'chainPost'
  | 'paperStack' | 'scrollPost' | 'chalkDoodle' | 'easel' | 'coinPile' | 'goldStatue' | 'chest';

export interface TownTheme {
  /** Subtitle under the town name — the place's own epithet. */
  epithet: string;
  ground: number;
  groundAlt: number;
  groundSpeck: number;
  paving: Paving;
  street: number;
  streetEdge: number;
  wall: number;
  wallShade: number;
  roof: number;
  roofShade: number;
  trim: number;
  /** Window / lamp light. */
  glow: number;
  roofStyle: RoofStyle;
  /** Themed props, weighted by repetition. */
  props: PropKind[];
  /** The plaza's centrepiece. */
  monument: PropKind;
  particle: ParticleKind;
  particleColor: number;
  particleCount: number;
  /** Full-screen colour wash. */
  tint: number;
  tintAlpha: number;
  /** Edge darkening, 0..1. */
  vignette: number;
  feature: { kind: FeatureKind; color: number; edge: number; flow?: number };
  castle: CastleStyle;
  castleWall: number;
  castleRoof: number;
  npcColors: number[];
  npcHat: HatKind;
  /** Ambient chatter the locals offer when walked past. */
  lines: string[];
  shopName: string;
  shopkeeper: string;
  shopLine: string;
  /** Extra chatter from the grumbling sentry outside the castle. */
  guardLine: string;
}

const NONE = { kind: 'none' as FeatureKind, color: 0, edge: 0 };

const T: Record<string, TownTheme> = {
  // ══ MAIN REALM ════════════════════════════════════════════════════════
  fire: {
    epithet: 'Cinderhold, the forge-city',
    ground: 0x2a1410, groundAlt: 0x3a1a10, groundSpeck: 0xff6a20,
    paving: 'cobble', street: 0x4a2a20, streetEdge: 0x24100a,
    wall: 0x5a2c1e, wallShade: 0x381810, roof: 0x8a2a14, roofShade: 0x5a160a, trim: 0xffaa44, glow: 0xffb040,
    roofStyle: 'gable',
    props: ['lavaVent', 'lavaVent', 'brazier', 'brazier', 'obsidianSpire', 'charredTree', 'rock', 'barrel', 'anvil'],
    monument: 'brazier',
    particle: 'ember', particleColor: 0xff7a2a, particleCount: 70,
    tint: 0xff4400, tintAlpha: 0.06, vignette: 0.55,
    feature: { kind: 'river', color: 0xff5a10, edge: 0x3a0e04, flow: 1 },
    castle: 'fortress', castleWall: 0x3a1a14, castleRoof: 0x7a1a0a,
    npcColors: [0xff6a2a, 0xffa040, 0xcc3a1a, 0xffd070], npcHat: 'horns',
    lines: [
      'Mind the vents. They breathe on the hour.',
      'Hottest forge in the six realms, this.',
      'The red doors? Nobody comes back out the same.',
      'Embers in your hair again. Suits you.',
      'Water Town folk are always so damp about everything.',
      'The Archfiend hasn\'t blinked in three hundred years.',
    ],
    shopName: 'THE EMBER BAZAAR', shopkeeper: 'Old Kindle', shopLine: 'Fresh from the coals, friend!',
    guardLine: 'The castle stays shut until you have earned it.',
  },
  water: {
    epithet: 'Tidewharf, city of canals',
    ground: 0x0f2638, groundAlt: 0x143048, groundSpeck: 0x5ac8ff,
    paving: 'plank', street: 0x5a4632, streetEdge: 0x2a2018,
    wall: 0x6a8aa0, wallShade: 0x445e72, roof: 0x1a5a8a, roofShade: 0x0e3a5c, trim: 0xd8f0ff, glow: 0x9ae0ff,
    roofStyle: 'gable',
    props: ['lilyPond', 'anchor', 'buoy', 'barrel', 'crate', 'well', 'willow', 'coral'],
    monument: 'fountain',
    particle: 'rain', particleColor: 0x9fd8ff, particleCount: 90,
    tint: 0x0066cc, tintAlpha: 0.07, vignette: 0.45,
    feature: { kind: 'river', color: 0x1a78c8, edge: 0x0a2a44, flow: 1 },
    castle: 'dome', castleWall: 0x4a7a9a, castleRoof: 0x1a5a9a,
    npcColors: [0x3a9aff, 0x7ad0ff, 0x2a6ab0, 0xb0e8ff], npcHat: 'cap',
    lines: [
      'Gondolas leave every quarter-tide.',
      'Rain again. It\'s always rain again.',
      'My cousin went through a red door. Came back a puddle.',
      'The canals run all the way to Oil Town, if you can stand the smell.',
      'Fire Town\'s up the north road. Bring a towel back.',
    ],
    shopName: 'TIDEWHARF TRADING', shopkeeper: 'Mariner Ebb', shopLine: 'Washed up fresh this morning!',
    guardLine: 'The tide-queen receives no one who hasn\'t beaten the five doors.',
  },
  life: {
    epithet: 'Bloomvale, the garden town',
    ground: 0x1c3a18, groundAlt: 0x244a1e, groundSpeck: 0x9aff6a,
    paving: 'dirt', street: 0x6a5232, streetEdge: 0x3a2c18,
    wall: 0xd8c8a0, wallShade: 0xa89870, roof: 0x3a7a2a, roofShade: 0x24521a, trim: 0xffe0a0, glow: 0xfff0a0,
    roofStyle: 'gable',
    props: ['tree', 'tree', 'tree', 'flowerbed', 'flowerbed', 'bush', 'beehive', 'mushroomRing', 'bench'],
    monument: 'tree',
    particle: 'leaf', particleColor: 0x8ad04a, particleCount: 50,
    tint: 0x44cc44, tintAlpha: 0.04, vignette: 0.35,
    feature: { kind: 'river', color: 0x3a9ad0, edge: 0x1e4a2a, flow: 0.6 },
    castle: 'keep', castleWall: 0x8a9a6a, castleRoof: 0x3a6a2a,
    npcColors: [0x6add4a, 0xb0f07a, 0x3aa03a, 0xffe07a], npcHat: 'leaf',
    lines: [
      'Smell that? Third bloom this week.',
      'Don\'t step on the mushroom rings. They remember.',
      'The bees are restless. Something behind the red doors.',
      'Hunt Town is past the old woods. Loud lot.',
      'Soul Town\'s road is quiet. Too quiet.',
    ],
    shopName: 'GREENHOUSE GOODS', shopkeeper: 'Auntie Fern', shopLine: 'Grown it all myself, dear.',
    guardLine: 'The Warden of the Grove rests until all five doors fall.',
  },
  air: {
    epithet: 'Galespire, the town above the clouds',
    ground: 0x5a7088, groundAlt: 0x6a84a0, groundSpeck: 0xffffff,
    paving: 'slab', street: 0xc8d4e0, streetEdge: 0x7a8aa0,
    wall: 0xe8eef8, wallShade: 0xb0bcd0, roof: 0x5a8ac8, roofShade: 0x3a62a0, trim: 0xffffff, glow: 0xdaf0ff,
    roofStyle: 'spire',
    props: ['windmill', 'windmill', 'floatRock', 'cloudPuff', 'cloudPuff', 'bench', 'flowerbed'],
    monument: 'windmill',
    particle: 'feather', particleColor: 0xffffff, particleCount: 45,
    tint: 0xaaddff, tintAlpha: 0.08, vignette: 0.3,
    feature: { kind: 'chasm', color: 0x9ab8d8, edge: 0x3a4a64 },
    castle: 'spire', castleWall: 0xd8e2f0, castleRoof: 0x4a7ac0,
    npcColors: [0xcaeaff, 0xffffff, 0x9ac8f0, 0xe0f4ff], npcHat: 'band',
    lines: [
      'Don\'t look down. Seriously. Don\'t.',
      'The wind changed. That means company.',
      'Shadow Town\'s road dips below the clouds. Never liked it.',
      'Hold onto your hat — oh. Too late.',
    ],
    shopName: 'THE DRAFTY DEPOT', shopkeeper: 'Zephyr Pell', shopLine: 'Light as a feather, every item!',
    guardLine: 'The Tempest King hears only those who climbed the five doors.',
  },
  earth: {
    epithet: 'Stonedeep, the quarry town',
    ground: 0x3a3022, groundAlt: 0x4a3c2a, groundSpeck: 0xb09060,
    paving: 'slab', street: 0x6a5a44, streetEdge: 0x3a3024,
    wall: 0x8a7a60, wallShade: 0x5e5240, roof: 0x5a4a34, roofShade: 0x3a2e20, trim: 0xd0b080, glow: 0xffc070,
    roofStyle: 'flat',
    props: ['boulder', 'boulder', 'rock', 'rock', 'mineCart', 'crate', 'pine', 'barrel'],
    monument: 'statue',
    particle: 'dust', particleColor: 0xb09870, particleCount: 40,
    tint: 0x887755, tintAlpha: 0.06, vignette: 0.5,
    feature: { kind: 'chasm', color: 0x1a140c, edge: 0x5a4a34 },
    castle: 'ziggurat', castleWall: 0x6a5a40, castleRoof: 0x4a3a28,
    npcColors: [0xa08a60, 0xc0a070, 0x7a6a4a, 0xd8c090], npcHat: 'helmet',
    lines: [
      'Struck a new seam last night. Heard it scream.',
      'Gravity Town\'s that way. Your boots get light.',
      'Time Town? Don\'t stay long. Or do. Hard to tell.',
      'Creation Town folk keep borrowing my hammers.',
    ],
    shopName: 'QUARRY SUPPLY', shopkeeper: 'Gravelbeard', shopLine: 'Solid goods. Rock solid.',
    guardLine: 'The Mountain doesn\'t move for anyone who hasn\'t cleared the doors.',
  },
  oil: {
    epithet: 'Slickmoor, the derrick fields',
    ground: 0x1c1610, groundAlt: 0x2a2014, groundSpeck: 0x6a5020,
    paving: 'metal', street: 0x3a3228, streetEdge: 0x14100a,
    wall: 0x4a3a2a, wallShade: 0x2a2018, roof: 0x2a2420, roofShade: 0x14100c, trim: 0xd0a040, glow: 0xffa030,
    roofStyle: 'flat',
    props: ['derrick', 'derrick', 'oilSlick', 'oilSlick', 'barrel', 'barrel', 'pipeStack', 'crate'],
    monument: 'derrick',
    particle: 'ash', particleColor: 0x4a3a2a, particleCount: 50,
    tint: 0x664400, tintAlpha: 0.1, vignette: 0.6,
    feature: { kind: 'river', color: 0x140c04, edge: 0x3a2a10, flow: 0.3 },
    castle: 'fortress', castleWall: 0x2a2018, castleRoof: 0x14100a,
    npcColors: [0x6a4a20, 0x8a6a30, 0x3a2a14, 0xc09040], npcHat: 'cap',
    lines: [
      'Don\'t light anything. Anything.',
      'Pumps run all night. You get used to it.',
      'Black gold, they call it. Mostly just black.',
      'Water Town\'s back up the canal road.',
    ],
    shopName: 'SLICK SUNDRIES', shopkeeper: 'Grease Malone', shopLine: 'Everything greased and guaranteed.',
    guardLine: 'The Baron burns the uninvited.',
  },
  ice: {
    epithet: 'Frostmere, the frozen harbour',
    ground: 0xc8dcea, groundAlt: 0xdeeaf4, groundSpeck: 0xffffff,
    paving: 'ice', street: 0x9ac0dc, streetEdge: 0x6a90b0,
    wall: 0x7a9ab8, wallShade: 0x5a7898, roof: 0xf0f6ff, roofShade: 0xc0d4e8, trim: 0x2a5a8a, glow: 0xbfe8ff,
    roofStyle: 'gable',
    props: ['iceSpike', 'iceSpike', 'snowman', 'snowdrift', 'snowdrift', 'pine', 'pine', 'crate'],
    monument: 'iceSpike',
    particle: 'snow', particleColor: 0xffffff, particleCount: 110,
    tint: 0x88ccff, tintAlpha: 0.08, vignette: 0.4,
    feature: { kind: 'river', color: 0x8ac8f0, edge: 0x4a7aa0, flow: 0 },
    castle: 'spire', castleWall: 0xb8d4ec, castleRoof: 0x6aa0d0,
    npcColors: [0xc0e4ff, 0x8ac0f0, 0xffffff, 0x6a9ad0], npcHat: 'hood',
    lines: [
      'Brr. Brr. Brrrr.',
      'The harbour froze solid in one night. Boats and all.',
      'Built that snowman myself. He\'s watching you.',
      'The Frost Matriarch sings through the walls at night.',
    ],
    shopName: 'THE COLD STORE', shopkeeper: 'Mittens', shopLine: 'Kept fresh. Very, very fresh.',
    guardLine: 'Nobody thaws the gate without five victories.',
  },
  growth: {
    epithet: 'Sporewick, the overgrown',
    ground: 0x1a2a10, groundAlt: 0x243814, groundSpeck: 0xc0ff40,
    paving: 'dirt', street: 0x3a3a1a, streetEdge: 0x1a1a0a,
    wall: 0x5a6a30, wallShade: 0x3a4a1e, roof: 0x8a6aa0, roofShade: 0x5a4470, trim: 0xd0ff60, glow: 0xd0ff80,
    roofStyle: 'mushroom',
    props: ['fungus', 'fungus', 'fungus', 'sporePod', 'sporePod', 'mushroomRing', 'bush', 'deadTree'],
    monument: 'fungus',
    particle: 'spore', particleColor: 0xc8ff6a, particleCount: 80,
    tint: 0x88bb22, tintAlpha: 0.08, vignette: 0.55,
    feature: { kind: 'river', color: 0x4a6a1a, edge: 0x1a2a0a, flow: 0.4 },
    castle: 'dome', castleWall: 0x4a5a28, castleRoof: 0x7a5a90,
    npcColors: [0x9acc3a, 0xc0e060, 0x6a9a2a, 0xb08ad0], npcHat: 'pointy',
    lines: [
      '*cough* Spores are thick today.',
      'My house grew another room. Didn\'t ask it to.',
      'Everything here is alive. Even the street.',
      'Mind the pods. They pop.',
    ],
    shopName: 'THE MYCELIUM MART', shopkeeper: 'Mossmother', shopLine: 'Ripe and spreading!',
    guardLine: 'The Bloom Tyrant sleeps in rot. Don\'t wake it early.',
  },
  crystal: {
    epithet: 'Prismhollow, the singing caves',
    ground: 0x1a1830, groundAlt: 0x221e3e, groundSpeck: 0xa0e0ff,
    paving: 'glass', street: 0x3a3a5a, streetEdge: 0x1a1a30,
    wall: 0x4a4a6a, wallShade: 0x2e2e48, roof: 0x7ad0f0, roofShade: 0x4a90b8, trim: 0xe0f8ff, glow: 0xa0f0ff,
    roofStyle: 'spire',
    props: ['crystal', 'crystal', 'crystal', 'geode', 'geode', 'rock', 'stalagmite'],
    monument: 'crystal',
    particle: 'mote', particleColor: 0xb0f0ff, particleCount: 60,
    tint: 0x88ccff, tintAlpha: 0.07, vignette: 0.6,
    feature: { kind: 'chasm', color: 0x0a0a1a, edge: 0x4a6a9a },
    castle: 'spire', castleWall: 0x3a3a60, castleRoof: 0x8ad8ff,
    npcColors: [0x9ae0ff, 0xd0f4ff, 0x7aa8ff, 0xe0d0ff], npcHat: 'crown',
    lines: [
      'Hum along. The crystals like it.',
      'Every shard sings a different note.',
      'Don\'t touch the big geode. Just don\'t.',
      'Light bends funny round here.',
    ],
    shopName: 'FACETS & FINDS', shopkeeper: 'Glimmer', shopLine: 'Every item cut to perfection.',
    guardLine: 'The Prism Lord sees you in every face of the castle.',
  },
  hunt: {
    epithet: 'Fangwood, the lodge town',
    ground: 0x1e2414, groundAlt: 0x2a301a, groundSpeck: 0x8a7a4a,
    paving: 'dirt', street: 0x4a3a24, streetEdge: 0x241a10,
    wall: 0x6a4a2a, wallShade: 0x44301a, roof: 0x3a2a1a, roofShade: 0x241a10, trim: 0xd0a060, glow: 0xffa040,
    roofStyle: 'gable',
    props: ['pine', 'pine', 'pine', 'bonePile', 'antlerTotem', 'tent', 'haybale', 'deadTree'],
    monument: 'antlerTotem',
    particle: 'leaf', particleColor: 0xb0602a, particleCount: 40,
    tint: 0xcc4400, tintAlpha: 0.05, vignette: 0.6,
    feature: NONE,
    castle: 'keep', castleWall: 0x4a3420, castleRoof: 0x2a1a10,
    npcColors: [0xcc6a2a, 0x8a5a2a, 0xa07040, 0xd09060], npcHat: 'horns',
    lines: [
      'Heard howling past the treeline.',
      'Every trophy on these walls bit somebody first.',
      'Keep your scent down near the red doors.',
      'The Alpha hunts at moonrise.',
    ],
    shopName: 'THE TROPHY LODGE', shopkeeper: 'Grizzle', shopLine: 'Caught it, skinned it, priced it.',
    guardLine: 'The Alpha won\'t come out for prey that hasn\'t proven itself.',
  },
  soul: {
    epithet: 'Wispmourn, the lantern town',
    ground: 0x1a1628, groundAlt: 0x241e36, groundSpeck: 0xccaaff,
    paving: 'slab', street: 0x3a3450, streetEdge: 0x1a1628,
    wall: 0x4a4460, wallShade: 0x302a44, roof: 0x2a2440, roofShade: 0x1a1628, trim: 0xccaaff, glow: 0xd8c0ff,
    roofStyle: 'crooked',
    props: ['ghostLantern', 'ghostLantern', 'gravestone', 'gravestone', 'willow', 'fogPatch', 'candle'],
    monument: 'ghostLantern',
    particle: 'mote', particleColor: 0xd8c0ff, particleCount: 55,
    tint: 0x8866cc, tintAlpha: 0.08, vignette: 0.65,
    feature: NONE,
    castle: 'spire', castleWall: 0x3a3454, castleRoof: 0x5a4a8a,
    npcColors: [0xccaaff, 0xe8d8ff, 0x9a7ae0, 0xffffff], npcHat: 'hood',
    lines: [
      'Did you see that? No? Good.',
      'The lanterns hold the ones who didn\'t leave.',
      'Speak softly. They\'re listening.',
      'I used to be alive, I think.',
    ],
    shopName: 'THE LAST LIGHT', shopkeeper: 'Pale Marrin', shopLine: 'Gently used. Very gently.',
    guardLine: 'The Lantern Lord counts every soul that knocks.',
  },
  shadow: {
    epithet: 'Duskmire, where light forgets itself',
    ground: 0x0e0a14, groundAlt: 0x16101e, groundSpeck: 0x6a2a8a,
    paving: 'slab', street: 0x221a2c, streetEdge: 0x0a060e,
    wall: 0x2a2234, wallShade: 0x18121e, roof: 0x1a1420, roofShade: 0x0a080e, trim: 0x8a4ab0, glow: 0xb06aff,
    roofStyle: 'crooked',
    props: ['obelisk', 'obelisk', 'shadowPool', 'shadowPool', 'deadTree', 'deadTree', 'fogPatch'],
    monument: 'obelisk',
    particle: 'ash', particleColor: 0x6a3a8a, particleCount: 60,
    tint: 0x330044, tintAlpha: 0.2, vignette: 0.8,
    feature: { kind: 'chasm', color: 0x020004, edge: 0x3a1a4a },
    castle: 'spire', castleWall: 0x1a1222, castleRoof: 0x3a1a4a,
    npcColors: [0x4a2a6a, 0x6a3a8a, 0x2a1a3a, 0x8a5ab0], npcHat: 'hood',
    lines: [
      'Your shadow just moved without you.',
      'Lamps don\'t last long here.',
      'Don\'t step in the dark pools.',
      'Something tall walks the alleys at night.',
    ],
    shopName: 'UMBRAL WARES', shopkeeper: 'The Hollow Man', shopLine: '...take what you need.',
    guardLine: 'The Umbral Sovereign is everywhere the light isn\'t.',
  },
  creation: {
    epithet: 'Anvilreach, the workshop town',
    ground: 0x2a2018, groundAlt: 0x382a1e, groundSpeck: 0xff9a40,
    paving: 'cobble', street: 0x5a4a3a, streetEdge: 0x2a2018,
    wall: 0x8a5a3a, wallShade: 0x5e3c24, roof: 0x6a3a22, roofShade: 0x442414, trim: 0xffb060, glow: 0xffc070,
    roofStyle: 'gable',
    props: ['anvil', 'chimneyForge', 'chimneyForge', 'gearPile', 'crate', 'crate', 'barrel'],
    monument: 'anvil',
    particle: 'spark', particleColor: 0xffb050, particleCount: 50,
    tint: 0xcc6622, tintAlpha: 0.06, vignette: 0.5,
    feature: NONE,
    castle: 'fortress', castleWall: 0x5a3a24, castleRoof: 0x8a4a22,
    npcColors: [0xcc7a3a, 0xe0a060, 0x8a5a30, 0xffc080], npcHat: 'cap',
    lines: [
      'Clang. Clang. Clang. Sorry, habit.',
      'Built that lamppost out of a sword.',
      'Every invention here tried to kill its maker once.',
      'The Artificer never stops tinkering.',
    ],
    shopName: 'THE TINKER\'S TABLE', shopkeeper: 'Cogsworth', shopLine: 'Handmade, mostly safe!',
    guardLine: 'The Artificer\'s doors open for proven hands only.',
  },
  gravity: {
    epithet: 'Lodestar, the drifting town',
    ground: 0x16102a, groundAlt: 0x1e1638, groundSpeck: 0xb08aff,
    paving: 'slab', street: 0x3a2e5a, streetEdge: 0x1a1430,
    wall: 0x4a3a6a, wallShade: 0x302448, roof: 0x6a4aa0, roofShade: 0x44307a, trim: 0xd0b0ff, glow: 0xc0a0ff,
    roofStyle: 'dome',
    props: ['floatRock', 'floatRock', 'orbitStones', 'orbitStones', 'crater', 'crater', 'rock'],
    monument: 'orbitStones',
    particle: 'mote', particleColor: 0xc0a0ff, particleCount: 60,
    tint: 0x8844cc, tintAlpha: 0.08, vignette: 0.6,
    feature: { kind: 'chasm', color: 0x060212, edge: 0x5a3a8a },
    castle: 'tower', castleWall: 0x3a2a5a, castleRoof: 0x7a4ac0,
    npcColors: [0xa07ae0, 0xc0a0ff, 0x7a5ac0, 0xe0d0ff], npcHat: 'antenna',
    lines: [
      'Up is optional here.',
      'Lost my cart to the sky last week.',
      'Stand still long enough and you start to float.',
      'The Singularity pulls at the castle stones.',
    ],
    shopName: 'WEIGHTLESS WARES', shopkeeper: 'Mass Orlo', shopLine: 'No item too heavy. Nothing is.',
    guardLine: 'The Singularity draws in only the worthy.',
  },
  sand: {
    // Time — the id is a trap.
    epithet: 'Hourglass Rest, where clocks run sideways',
    ground: 0x3a3018, groundAlt: 0x4a3c1e, groundSpeck: 0xffe070,
    paving: 'tile', street: 0x8a7440, streetEdge: 0x4a3c1e,
    wall: 0xc8a860, wallShade: 0x8e7440, roof: 0x6a5a8a, roofShade: 0x44386a, trim: 0xffe070, glow: 0xfff0a0,
    roofStyle: 'dome',
    props: ['hourglass', 'hourglass', 'clockPost', 'clockPost', 'sundial', 'gear', 'bench'],
    monument: 'sundial',
    particle: 'dust', particleColor: 0xffe080, particleCount: 60,
    tint: 0xffdd44, tintAlpha: 0.06, vignette: 0.5,
    feature: NONE,
    castle: 'tower', castleWall: 0xa08a50, castleRoof: 0x5a4a7a,
    npcColors: [0xffdd60, 0xd0b050, 0xfff0a0, 0x8a7ac0], npcHat: 'tophat',
    lines: [
      'You\'re early. Or late. Hard to say.',
      'I\'ve said this before. I\'ll say it again.',
      'The clocks all disagree. Pick your favourite.',
      'Didn\'t we just meet tomorrow?',
    ],
    shopName: 'TIMELY GOODS', shopkeeper: 'Tick & Tock', shopLine: 'Sold yesterday, restocked tomorrow.',
    guardLine: 'The Chronarch will see you. Has seen you. Hasn\'t yet.',
  },

  // ══ ABSTRACT REALM ════════════════════════════════════════════════════
  electricity: {
    epithet: 'Voltara, the humming capital',
    ground: 0x10121e, groundAlt: 0x161a2a, groundSpeck: 0xffee40,
    paving: 'metal', street: 0x2a2e40, streetEdge: 0x0e1018,
    wall: 0x3a3e54, wallShade: 0x24283a, roof: 0x22263a, roofShade: 0x141624, trim: 0xffee40, glow: 0xfff070,
    roofStyle: 'flat',
    props: ['pylon', 'pylon', 'teslaCoil', 'teslaCoil', 'crate', 'pipeStack', 'terminal'],
    monument: 'teslaCoil',
    particle: 'spark', particleColor: 0xfff060, particleCount: 60,
    tint: 0xffee00, tintAlpha: 0.04, vignette: 0.6,
    feature: NONE,
    castle: 'tower', castleWall: 0x2a2e44, castleRoof: 0xd0b020,
    npcColors: [0xffee40, 0xfff8a0, 0xd0c030, 0x8ac8ff], npcHat: 'antenna',
    lines: [
      'Bzzt. Sorry. Static.',
      'Every wire in this city leads to the castle.',
      'My hair hasn\'t lain flat in years.',
      'The portal back to the old realm is in the square.',
    ],
    shopName: 'LIVE WIRE GOODS', shopkeeper: 'Sparky Vee', shopLine: 'Fully charged, all of it!',
    guardLine: 'The Storm Sovereign arcs at anyone uninvited.',
  },
  slime: {
    // Acid — the id is a trap.
    epithet: 'Corrodia, the etched town',
    ground: 0x141e10, groundAlt: 0x1c2a14, groundSpeck: 0x9aff40,
    paving: 'tile', street: 0x2e3a24, streetEdge: 0x10180a,
    wall: 0x4a5a3a, wallShade: 0x2e3a24, roof: 0x5a7a2a, roofShade: 0x3a5418, trim: 0xb0ff50, glow: 0xc8ff60,
    roofStyle: 'crooked',
    props: ['acidPool', 'acidPool', 'barrelHazard', 'barrelHazard', 'warningSign', 'deadTree', 'pipeStack'],
    monument: 'barrelHazard',
    particle: 'bubble', particleColor: 0xa0ff50, particleCount: 50,
    tint: 0x66cc44, tintAlpha: 0.08, vignette: 0.6,
    feature: { kind: 'river', color: 0x7ad02a, edge: 0x2a3a10, flow: 0.4 },
    castle: 'fortress', castleWall: 0x3a4a2a, castleRoof: 0x6a9a2a,
    npcColors: [0x8acc3a, 0xb0ff60, 0x5a9a2a, 0xe0ff9a], npcHat: 'mask',
    lines: [
      'Don\'t drink from the canal.',
      'My boots lasted a whole day this time.',
      'Everything here is a little bit dissolved.',
      'Metal Town\'s road is lined with rust.',
    ],
    shopName: 'CAUSTIC CURIOS', shopkeeper: 'Etcher Vex', shopLine: 'Handle with gloves, please.',
    guardLine: 'The Corroder melts the unworthy where they stand.',
  },
  fate: {
    epithet: 'Lucksend, city of wagers',
    ground: 0x10221c, groundAlt: 0x142e24, groundSpeck: 0x88eecc,
    paving: 'tile', street: 0x3a2a3a, streetEdge: 0x1a101a,
    wall: 0x4a2a3a, wallShade: 0x301a26, roof: 0x8a1a2a, roofShade: 0x5a0e1a, trim: 0xffd060, glow: 0xffe080,
    roofStyle: 'pagoda',
    props: ['cardStand', 'cardStand', 'giantDie', 'giantDie', 'tent', 'bench', 'candle'],
    monument: 'giantDie',
    particle: 'glyph', particleColor: 0x88eecc, particleCount: 40,
    tint: 0x88eecc, tintAlpha: 0.05, vignette: 0.55,
    feature: NONE,
    castle: 'dome', castleWall: 0x3a1a2a, castleRoof: 0x2a8a6a,
    npcColors: [0x88eecc, 0xffd060, 0xe04a5a, 0xffffff], npcHat: 'tophat',
    lines: [
      'Pick a card. No, not that one.',
      'House always wins. You\'re not the house.',
      'Odds on the red doors? Terrible. Go on.',
      'Echo Town\'s road keeps repeating itself.',
    ],
    shopName: 'THE LUCKY DRAW', shopkeeper: 'Madame Odds', shopLine: 'Fortune favours the buyer!',
    guardLine: 'The Dealer deals no hand before your five wins.',
  },
  sound: {
    epithet: 'Resonance, the marching town',
    ground: 0x1e0e14, groundAlt: 0x2a121c, groundSpeck: 0xff6a8a,
    paving: 'tile', street: 0x4a2a30, streetEdge: 0x1e0e12,
    wall: 0x6a2a36, wallShade: 0x441a22, roof: 0x2a1a20, roofShade: 0x1a0e12, trim: 0xffc060, glow: 0xffd080,
    roofStyle: 'gable',
    props: ['speaker', 'speaker', 'drum', 'drum', 'tuningFork', 'bench', 'banner'],
    monument: 'tuningFork',
    particle: 'note', particleColor: 0xffc0d0, particleCount: 35,
    tint: 0x8a1c33, tintAlpha: 0.07, vignette: 0.55,
    feature: NONE,
    castle: 'keep', castleWall: 0x4a1a26, castleRoof: 0xd0a040,
    npcColors: [0xc03a5a, 0xffc060, 0x8a1c33, 0xffe0e8], npcHat: 'band',
    lines: [
      'One, two, one two three four!',
      'Parade\'s every hour, on the beat.',
      'You\'re walking off-tempo. It\'s fine. It\'s fine.',
      'Silence Town is down that road. We don\'t go.',
    ],
    shopName: 'THE BRASS SECTION', shopkeeper: 'Maestro Brio', shopLine: 'Music to your wallet!',
    guardLine: 'The Conductor keeps time for those who\'ve kept pace.',
  },
  light: {
    epithet: 'Lumenfall, the city of mirrors',
    ground: 0xd8d0a8, groundAlt: 0xe8e0b8, groundSpeck: 0xffffff,
    paving: 'tile', street: 0xf0e8c8, streetEdge: 0xb8ac80,
    wall: 0xfff8e0, wallShade: 0xd8ccaa, roof: 0xe8c860, roofShade: 0xb89a3a, trim: 0xffffff, glow: 0xffffe0,
    roofStyle: 'dome',
    props: ['prism', 'prism', 'mirrorPost', 'mirrorPost', 'flowerbed', 'statue', 'bench'],
    monument: 'prism',
    particle: 'mote', particleColor: 0xfffff0, particleCount: 55,
    tint: 0xfff4a8, tintAlpha: 0.08, vignette: 0.25,
    feature: NONE,
    castle: 'spire', castleWall: 0xfff4d8, castleRoof: 0xe8c040,
    npcColors: [0xfff4a8, 0xffffff, 0xffe070, 0xffd0a0], npcHat: 'halo',
    lines: [
      'Squint. Everyone squints here.',
      'No shadows in Lumenfall. Mostly.',
      'The mirrors show you who you could be.',
      'Technology Town\'s road glows blue at night.',
    ],
    shopName: 'RADIANT RELICS', shopkeeper: 'Sister Glow', shopLine: 'Blessed and brilliant!',
    guardLine: 'The Radiant One sees all who approach.',
  },
  magnet: {
    epithet: 'Polehaven, the scrapyard',
    ground: 0x1e1418, groundAlt: 0x2a1c20, groundSpeck: 0xff4a6a,
    paving: 'metal', street: 0x3a2e32, streetEdge: 0x1a1214,
    wall: 0x5a4a50, wallShade: 0x3a2e34, roof: 0xa02a3a, roofShade: 0x6a1a26, trim: 0xc0c8d0, glow: 0xff8a9a,
    roofStyle: 'flat',
    props: ['horseshoe', 'horseshoe', 'ironFilings', 'ironFilings', 'gearPile', 'crate', 'pipeStack'],
    monument: 'horseshoe',
    particle: 'spark', particleColor: 0xff6a8a, particleCount: 40,
    tint: 0xcc2244, tintAlpha: 0.06, vignette: 0.55,
    feature: NONE,
    castle: 'fortress', castleWall: 0x4a3a40, castleRoof: 0xb02a3a,
    npcColors: [0xcc2244, 0xc0c8d0, 0x8a1a2a, 0x4a8aff], npcHat: 'helmet',
    lines: [
      'Keep your keys in your pocket. Both pockets.',
      'North pole\'s that way. Or south. Depends.',
      'The scrap piles move at night.',
      'Something big and metal is stirring in the castle.',
    ],
    shopName: 'SCRAP & SPARE', shopkeeper: 'Rusty Pell', shopLine: 'It all sticks together!',
    guardLine: 'The Magnetarch pulls in the worthy.',
  },
  metal: {
    epithet: 'Gearhold, the clockwork city',
    ground: 0x1a1c20, groundAlt: 0x22252a, groundSpeck: 0x8899aa,
    paving: 'metal', street: 0x3a3e46, streetEdge: 0x16181c,
    wall: 0x6a7480, wallShade: 0x4a525c, roof: 0x3a424c, roofShade: 0x22282e, trim: 0xd0a050, glow: 0xffc070,
    roofStyle: 'stepped',
    props: ['gear', 'gear', 'pipeStack', 'pipeStack', 'anvil', 'crate', 'barrel'],
    monument: 'gear',
    particle: 'spark', particleColor: 0xffc070, particleCount: 35,
    tint: 0x8899aa, tintAlpha: 0.06, vignette: 0.55,
    feature: NONE,
    castle: 'fortress', castleWall: 0x4a525c, castleRoof: 0x6a7480,
    npcColors: [0x8899aa, 0xb0bcc8, 0xd0a050, 0x5a6470], npcHat: 'helmet',
    lines: [
      'Tick. Whirr. Clank. Morning.',
      'Oil your joints, traveller.',
      'Every cog in this city turns the castle.',
      'Acid Town is back up the rusty road.',
    ],
    shopName: 'COG & CASING', shopkeeper: 'Brassy', shopLine: 'Precision parts, fair prices.',
    guardLine: 'The Iron Regent forges no audience early.',
  },
  plasma: {
    epithet: 'Flux, the unstable district',
    ground: 0x140a1e, groundAlt: 0x1c0e2a, groundSpeck: 0xd06aff,
    paving: 'glass', street: 0x2e1a44, streetEdge: 0x10081a,
    wall: 0x3a2050, wallShade: 0x261436, roof: 0x7a2ab0, roofShade: 0x4e1a74, trim: 0xff8aff, glow: 0xe08aff,
    roofStyle: 'dome',
    props: ['plasmaOrb', 'plasmaOrb', 'teslaCoil', 'crater', 'crater', 'pylon'],
    monument: 'plasmaOrb',
    particle: 'spark', particleColor: 0xe08aff, particleCount: 65,
    tint: 0xaa22ff, tintAlpha: 0.08, vignette: 0.6,
    feature: { kind: 'river', color: 0xb04aff, edge: 0x2a0a44, flow: 1.4 },
    castle: 'dome', castleWall: 0x2e1a44, castleRoof: 0xaa3aff,
    npcColors: [0xaa22ff, 0xe08aff, 0xff6ad0, 0x6a8aff], npcHat: 'antenna',
    lines: [
      'Containment\'s at forty percent. That\'s good, right?',
      'Don\'t stand near the orbs. Or do. Exciting.',
      'The ground hums when it\'s about to pop.',
      'Pure chaos lives in that castle.',
    ],
    shopName: 'VOLATILE VENDING', shopkeeper: 'Doc Flicker', shopLine: 'Mostly stable merchandise!',
    guardLine: 'Stand back. The Sovereign is... volatile.',
  },
  rubber: {
    epithet: 'Boingburg, the bouncing town',
    ground: 0x2a1820, groundAlt: 0x36202a, groundSpeck: 0xff8aa0,
    paving: 'tile', street: 0x5a3a48, streetEdge: 0x2a1820,
    wall: 0xff9ab0, wallShade: 0xd0708a, roof: 0x3ac0d0, roofShade: 0x2a8a9a, trim: 0xfff060, glow: 0xffe0a0,
    roofStyle: 'dome',
    props: ['bouncePad', 'bouncePad', 'rubberBall', 'rubberBall', 'duck', 'flowerbed', 'bench'],
    monument: 'rubberBall',
    particle: 'bubble', particleColor: 0xffb0c8, particleCount: 35,
    tint: 0xff5577, tintAlpha: 0.05, vignette: 0.3,
    feature: NONE,
    castle: 'dome', castleWall: 0xff8aa0, castleRoof: 0x3ac0d0,
    npcColors: [0xff5577, 0xffd040, 0x3ac0d0, 0xa0ff80], npcHat: 'cap',
    lines: [
      'Boing!',
      'Nothing hurts here. Nothing stays down either.',
      'Watch the pads. They launch.',
      'Squeak squeak. That\'s my shoes.',
    ],
    shopName: 'STRETCH & SNAP', shopkeeper: 'Bouncy Belle', shopLine: 'Bounce-back guarantee!',
    guardLine: 'The Elastic Emperor snaps back at the uninvited.',
  },
  gunpowder: {
    epithet: 'Powderkeg, the musket town',
    ground: 0x1a1414, groundAlt: 0x241a1a, groundSpeck: 0xa060ff,
    paving: 'cobble', street: 0x3a3030, streetEdge: 0x181212,
    wall: 0x4a3a44, wallShade: 0x302630, roof: 0x3a1a4a, roofShade: 0x241030, trim: 0xd0b060, glow: 0xffc060,
    roofStyle: 'gable',
    props: ['cannon', 'cannon', 'powderKeg', 'powderKeg', 'crate', 'barrel', 'banner'],
    monument: 'cannon',
    particle: 'ash', particleColor: 0x5a4a5a, particleCount: 55,
    tint: 0x440066, tintAlpha: 0.08, vignette: 0.6,
    feature: NONE,
    castle: 'fortress', castleWall: 0x302630, castleRoof: 0x4a1a5a,
    npcColors: [0x6a3a8a, 0xd0b060, 0x3a2a4a, 0xc04a4a], npcHat: 'tophat',
    lines: [
      'Smoking is very much forbidden.',
      'That bang? Tuesday.',
      'Keep your powder dry and your head down.',
      'The Marshal drills the castle guard at dawn.',
    ],
    shopName: 'POWDER & SHOT', shopkeeper: 'Sergeant Fuse', shopLine: 'Explosive deals!',
    guardLine: 'Halt! The Marshal receives only veterans.',
  },
  echo: {
    epithet: 'Rebound Hollow, the cave town',
    ground: 0x14141e, groundAlt: 0x1c1c2a, groundSpeck: 0xccccff,
    paving: 'slab', street: 0x2e2e40, streetEdge: 0x10101a,
    wall: 0x3a3a50, wallShade: 0x262636, roof: 0x5a5a8a, roofShade: 0x3a3a60, trim: 0xd0d0ff, glow: 0xd8d8ff,
    roofStyle: 'spire',
    props: ['echoBell', 'echoBell', 'stalagmite', 'stalagmite', 'stalagmite', 'rock', 'crystal'],
    monument: 'echoBell',
    particle: 'mote', particleColor: 0xd0d0ff, particleCount: 45,
    tint: 0x6a6acc, tintAlpha: 0.08, vignette: 0.7,
    feature: { kind: 'chasm', color: 0x04040a, edge: 0x3a3a5a },
    castle: 'spire', castleWall: 0x2e2e44, castleRoof: 0x7a7ab0,
    npcColors: [0xccccff, 0x9a9ae0, 0xe8e8ff, 0x7a7ac0], npcHat: 'pointy',
    lines: [
      'Hello! ...hello ...hello.',
      'Say it once. Hear it thrice.',
      'Bats sleep up top. Don\'t shout.',
      'Fate Town is back up the road. ...road. ...road.',
    ],
    shopName: 'THE RINGING STALL', shopkeeper: 'Re-Re', shopLine: 'Buy one, hear it twice!',
    guardLine: 'The Reverberant answers only the victorious.',
  },
  silence: {
    epithet: 'Hushcombe, the muted town',
    ground: 0x0c0a10, groundAlt: 0x141018, groundSpeck: 0x5a3a6a,
    paving: 'slab', street: 0x1e1a24, streetEdge: 0x08060a,
    wall: 0x2a2430, wallShade: 0x18141c, roof: 0x14101a, roofShade: 0x08060c, trim: 0x6a4a7a, glow: 0x8a6aa0,
    roofStyle: 'crooked',
    props: ['muteStatue', 'muteStatue', 'fogPatch', 'fogPatch', 'deadTree', 'gravestone'],
    monument: 'muteStatue',
    particle: 'ash', particleColor: 0x3a2a44, particleCount: 50,
    tint: 0x1a0022, tintAlpha: 0.22, vignette: 0.85,
    feature: NONE,
    castle: 'spire', castleWall: 0x18141c, castleRoof: 0x2a1a34,
    npcColors: [0x3a2a44, 0x5a4a6a, 0x2a1a30, 0x7a6a8a], npcHat: 'hood',
    lines: [
      '...',
      '...shh.',
      '(they press a finger to their lips)',
      '(they point toward the castle and shake their head)',
    ],
    shopName: 'THE QUIET COUNTER', shopkeeper: '(nameless)', shopLine: '(gestures at the shelves)',
    guardLine: '(the guard says nothing, and does not move)',
  },
  magic: {
    epithet: 'Arcanum, the scholars\' quarter',
    ground: 0x16102a, groundAlt: 0x1e1638, groundSpeck: 0xb07aff,
    paving: 'tile', street: 0x3a2e5a, streetEdge: 0x16102a,
    wall: 0x4a3a7a, wallShade: 0x302458, roof: 0x2a1a5a, roofShade: 0x1a0e3a, trim: 0xffd070, glow: 0xd0a0ff,
    roofStyle: 'spire',
    props: ['runeCircle', 'runeCircle', 'bookPile', 'bookPile', 'crystal', 'candle', 'statue'],
    monument: 'runeCircle',
    particle: 'glyph', particleColor: 0xc08aff, particleCount: 45,
    tint: 0x9944ff, tintAlpha: 0.07, vignette: 0.55,
    feature: NONE,
    castle: 'spire', castleWall: 0x3a2a6a, castleRoof: 0x6a3ad0,
    npcColors: [0x9944ff, 0xc08aff, 0x6a2ad0, 0xffd070], npcHat: 'pointy',
    lines: [
      'Quiet in the reading streets, please.',
      'That rune circle is load-bearing.',
      'I turned my neighbour into a newt. He got better.',
      'The Archmage has been reading the same page for a century.',
    ],
    shopName: 'SPELLS & SUNDRIES', shopkeeper: 'Archivist Quill', shopLine: 'Scrolls, wands, the usual.',
    guardLine: 'The Archmage admits only those who passed the five trials.',
  },
  technology: {
    epithet: 'Neon Grid, the circuit city',
    ground: 0x08141a, groundAlt: 0x0c1c24, groundSpeck: 0x44ffcc,
    paving: 'metal', street: 0x1a2a34, streetEdge: 0x06101a,
    wall: 0x24343e, wallShade: 0x16222a, roof: 0x14202a, roofShade: 0x0a141a, trim: 0x44ffcc, glow: 0x60ffe0,
    roofStyle: 'flat',
    props: ['terminal', 'terminal', 'serverRack', 'serverRack', 'pylon', 'crate'],
    monument: 'serverRack',
    particle: 'glyph', particleColor: 0x44ffcc, particleCount: 50,
    tint: 0x44ccaa, tintAlpha: 0.06, vignette: 0.55,
    feature: NONE,
    castle: 'tower', castleWall: 0x1a2a34, castleRoof: 0x2ad0a0,
    npcColors: [0x44ccaa, 0x60ffe0, 0x2a8a7a, 0xff60c0], npcHat: 'antenna',
    lines: [
      'Have you tried turning it off and on again?',
      'Firmware update at midnight. Everyone stays in.',
      'The castle mainframe never sleeps.',
      'Beep. Sorry, that was me.',
    ],
    shopName: 'BYTE BAZAAR', shopkeeper: 'Unit 7', shopLine: 'TRANSACTION: WELCOME.',
    guardLine: 'ACCESS DENIED. CLEAR FIVE NODES.',
  },
  subterfuge: {
    epithet: 'Backalley, the spy town',
    ground: 0x141014, groundAlt: 0x1c161c, groundSpeck: 0xcc2233,
    paving: 'cobble', street: 0x2e2830, streetEdge: 0x100c10,
    wall: 0x3a3238, wallShade: 0x262026, roof: 0x221c22, roofShade: 0x120e12, trim: 0xcc2233, glow: 0xffd080,
    roofStyle: 'gable',
    props: ['wantedBoard', 'wantedBoard', 'crate', 'crate', 'barrel', 'fogPatch'],
    monument: 'statue',
    particle: 'rain', particleColor: 0x8a8aa0, particleCount: 70,
    tint: 0x441018, tintAlpha: 0.1, vignette: 0.7,
    feature: NONE,
    castle: 'keep', castleWall: 0x2a2228, castleRoof: 0x8a1a22,
    npcColors: [0x3a3238, 0xcc2233, 0x5a5060, 0xd0c0a0], npcHat: 'tophat',
    lines: [
      'You didn\'t see me.',
      'Nice coat. Shame if someone lifted it.',
      'Everyone here is a double agent. Including me.',
      'Psst. The red doors are a trap. Probably.',
    ],
    shopName: 'NO QUESTIONS ASKED', shopkeeper: 'The Fence', shopLine: 'Fell off a cart. Honest.',
    guardLine: 'The Spymaster knows you\'re here. Come back with five wins.',
  },

  // ══ CORRUPT REALM ═════════════════════════════════════════════════════
  ruin: {
    epithet: 'The Broken Heart, ruin of the old order',
    ground: 0x1a1010, groundAlt: 0x241414, groundSpeck: 0xc4392c,
    paving: 'slab', street: 0x3a2a26, streetEdge: 0x160c0a,
    wall: 0x4a3430, wallShade: 0x2e201e, roof: 0x3a1a16, roofShade: 0x22100c, trim: 0xc4392c, glow: 0xff5a40,
    roofStyle: 'crooked',
    props: ['rubble', 'rubble', 'rubble', 'brokenPillar', 'brokenPillar', 'deadTree', 'spikes'],
    monument: 'brokenPillar',
    particle: 'ash', particleColor: 0x8a3a30, particleCount: 75,
    tint: 0xc4392c, tintAlpha: 0.1, vignette: 0.75,
    feature: { kind: 'chasm', color: 0x0a0202, edge: 0x6a1a10 },
    castle: 'fortress', castleWall: 0x2e1c1a, castleRoof: 0x6a1a12,
    npcColors: [0x8a3a30, 0x5a3a34, 0xc4392c, 0x3a2a28], npcHat: 'hood',
    lines: [
      'Something below the worlds is waking.',
      'This was a city, once. A good one.',
      'The pit in the square goes all the way down.',
      'Every Sovereign here was eaten first.',
    ],
    shopName: 'SALVAGE OF THE FALLEN', shopkeeper: 'Crumble', shopLine: 'Pulled from the rubble.',
    guardLine: 'What sits on this throne is not what was crowned.',
  },
  death: {
    epithet: 'Gravesend, the last stop',
    ground: 0x141418, groundAlt: 0x1c1c22, groundSpeck: 0x7a74a8,
    paving: 'slab', street: 0x2e2c38, streetEdge: 0x0e0e12,
    wall: 0x3a3848, wallShade: 0x24222e, roof: 0x1e1c26, roofShade: 0x0e0c14, trim: 0x9a94c8, glow: 0xb0a8e0,
    roofStyle: 'spire',
    props: ['gravestone', 'gravestone', 'gravestone', 'coffin', 'coffin', 'deadTree', 'candle'],
    monument: 'gravestone',
    particle: 'ash', particleColor: 0x6a6480, particleCount: 50,
    tint: 0x4a4468, tintAlpha: 0.14, vignette: 0.75,
    feature: NONE,
    castle: 'spire', castleWall: 0x24222e, castleRoof: 0x4a4468,
    npcColors: [0x4a4468, 0x7a74a8, 0x2a2838, 0xd0d0e0], npcHat: 'hood',
    lines: [
      'Measured you for a box already. Just in case.',
      'Everyone ends up here eventually.',
      'The coffins are empty. That\'s the worrying part.',
      'The Reaper keeps very precise hours.',
    ],
    shopName: 'THE UNDERTAKER\'S', shopkeeper: 'Mortimer', shopLine: 'You won\'t need it later.',
    guardLine: 'The Reaper\'s door opens for everyone. In time.',
  },
  illusion: {
    epithet: 'Mirage, the town that isn\'t',
    ground: 0x1a1028, groundAlt: 0x241436, groundSpeck: 0xd08aff,
    paving: 'tile', street: 0x3a2a50, streetEdge: 0x160e22,
    wall: 0x5a3a7a, wallShade: 0x3a2454, roof: 0xb45cff, roofShade: 0x7a3ab0, trim: 0xffd0ff, glow: 0xffb0ff,
    roofStyle: 'crooked',
    props: ['mirror', 'mirror', 'maskPole', 'maskPole', 'swirl', 'swirl', 'statue'],
    monument: 'mirror',
    particle: 'mote', particleColor: 0xffb0ff, particleCount: 55,
    tint: 0xb45cff, tintAlpha: 0.09, vignette: 0.6,
    feature: NONE,
    castle: 'dome', castleWall: 0x3a2454, castleRoof: 0xb45cff,
    npcColors: [0xb45cff, 0xffb0ff, 0x6a3ad0, 0xffffff], npcHat: 'mask',
    lines: [
      'I\'m not really here.',
      'That building wasn\'t there yesterday.',
      'Are you sure you\'re you?',
      'The castle is much bigger on the inside. Or smaller.',
    ],
    shopName: 'SMOKE & MIRRORS', shopkeeper: 'Mister Seem', shopLine: 'What you see is what you get. Mostly.',
    guardLine: 'The Deceiver is behind you. No, really.',
  },
  conquest: {
    epithet: 'Warcamp, the occupied city',
    ground: 0x2a1c14, groundAlt: 0x36241a, groundSpeck: 0xc23a2e,
    paving: 'cobble', street: 0x4a3a2a, streetEdge: 0x221810,
    wall: 0x6a5040, wallShade: 0x463428, roof: 0xa02a22, roofShade: 0x6a1a14, trim: 0xe0c060, glow: 0xffc060,
    roofStyle: 'tent',
    props: ['banner', 'banner', 'tent', 'tent', 'cannon', 'spikes', 'crate'],
    monument: 'banner',
    particle: 'ash', particleColor: 0x6a4a3a, particleCount: 45,
    tint: 0xc23a2e, tintAlpha: 0.07, vignette: 0.6,
    feature: NONE,
    castle: 'fortress', castleWall: 0x4a3428, castleRoof: 0xa02a22,
    npcColors: [0xc23a2e, 0xe0c060, 0x6a5040, 0x8a8a8a], npcHat: 'helmet',
    lines: [
      'March! March! ...sorry, reflex.',
      'Every banner is a city we took.',
      'The Warlord counts the conquered at dusk.',
      'Fortune Town pays its tribute in gold.',
    ],
    shopName: 'THE QUARTERMASTER', shopkeeper: 'Sergeant Brask', shopLine: 'Requisitioned. Legally.',
    guardLine: 'The Warlord grants audience only to conquerors.',
  },
  gluttony: {
    // Harvest — the id is a trap.
    epithet: 'Reapfield, the endless harvest',
    ground: 0x2a2010, groundAlt: 0x382a14, groundSpeck: 0xe0a030,
    paving: 'dirt', street: 0x5a4220, streetEdge: 0x2a1e0e,
    wall: 0x8a6a3a, wallShade: 0x5e4626, roof: 0x8a3a1a, roofShade: 0x5a2410, trim: 0xffc050, glow: 0xffb040,
    roofStyle: 'gable',
    props: ['wheat', 'wheat', 'wheat', 'scarecrow', 'scarecrow', 'pumpkin', 'pumpkin', 'haybale'],
    monument: 'scarecrow',
    particle: 'leaf', particleColor: 0xd08030, particleCount: 50,
    tint: 0xd8452f, tintAlpha: 0.06, vignette: 0.6,
    feature: NONE,
    castle: 'keep', castleWall: 0x5e4626, castleRoof: 0x8a3a1a,
    npcColors: [0xd8452f, 0xe0a030, 0x8a6a3a, 0x6a8a2a], npcHat: 'straw',
    lines: [
      'The scarecrows turned to watch you.',
      'Harvest never ends here. Never.',
      'Don\'t eat anything that grew past the fence.',
      'Depths Town smells of brine, Slime Town of... worse.',
    ],
    shopName: 'THE HARVEST TABLE', shopkeeper: 'Granny Sickle', shopLine: 'Freshly reaped, dearie.',
    guardLine: 'The Harvester reaps only ripe challengers.',
  },
  cloth: {
    epithet: 'Loomhaven, the stitched town',
    ground: 0x241016, groundAlt: 0x30141e, groundSpeck: 0xd1435c,
    paving: 'plank', street: 0x4a2e34, streetEdge: 0x200e12,
    wall: 0xb06a7a, wallShade: 0x804654, roof: 0x6a1a2e, roofShade: 0x440e1c, trim: 0xffe0c0, glow: 0xffc0a0,
    roofStyle: 'tent',
    props: ['spool', 'spool', 'clothesline', 'clothesline', 'banner', 'crate'],
    monument: 'spool',
    particle: 'feather', particleColor: 0xffb0c0, particleCount: 35,
    tint: 0xd1435c, tintAlpha: 0.06, vignette: 0.55,
    feature: NONE,
    castle: 'keep', castleWall: 0x804654, castleRoof: 0xd1435c,
    npcColors: [0xd1435c, 0xffe0c0, 0x8a2a3e, 0x6a8ad0], npcHat: 'band',
    lines: [
      'Loose thread on your sleeve. Allow me.',
      'Everything here is stitched together. Everything.',
      'The tapestry in the castle keeps growing.',
      'Pins and needles, pins and needles.',
    ],
    shopName: 'THE SEAMSTRESS', shopkeeper: 'Madame Hem', shopLine: 'Made to measure!',
    guardLine: 'The Weaver sews shut the doors of the unready.',
  },
  bind: {
    epithet: 'Shackleton, the chained shrine',
    ground: 0x1e1a10, groundAlt: 0x2a2414, groundSpeck: 0xe0b743,
    paving: 'slab', street: 0x3e3622, streetEdge: 0x1a160c,
    wall: 0x5a4e34, wallShade: 0x3a3220, roof: 0x3a2a14, roofShade: 0x22180a, trim: 0xe0b743, glow: 0xffd870,
    roofStyle: 'pagoda',
    props: ['chainPost', 'chainPost', 'chainPost', 'statue', 'candle', 'candle', 'rock'],
    monument: 'chainPost',
    particle: 'mote', particleColor: 0xffd870, particleCount: 40,
    tint: 0xe0b743, tintAlpha: 0.05, vignette: 0.65,
    feature: NONE,
    castle: 'ziggurat', castleWall: 0x4a3e26, castleRoof: 0xe0b743,
    npcColors: [0xe0b743, 0x8a7a50, 0x5a4e34, 0xffffff], npcHat: 'hood',
    lines: [
      'Every chain here holds something.',
      'Pray to the idol. It listens. It remembers.',
      'Don\'t pull on the chains.',
      'The Binder takes a piece of everyone who enters.',
    ],
    shopName: 'THE OFFERING TABLE', shopkeeper: 'Brother Link', shopLine: 'A small sacrifice, a fair price.',
    guardLine: 'The Binder\'s chains part for five victories.',
  },
  paper: {
    epithet: 'Folio, the written town',
    ground: 0xd8d0b8, groundAlt: 0xe6dec8, groundSpeck: 0x8a7a60,
    paving: 'tile', street: 0xf2ead6, streetEdge: 0xb0a488,
    wall: 0xfaf4e4, wallShade: 0xd8ceb4, roof: 0x8a7a60, roofShade: 0x5e5240, trim: 0x2a2420, glow: 0xffe8a0,
    roofStyle: 'gable',
    props: ['paperStack', 'paperStack', 'scrollPost', 'scrollPost', 'bookPile', 'bench'],
    monument: 'scrollPost',
    particle: 'paper', particleColor: 0xfaf4e4, particleCount: 40,
    tint: 0xf2ead6, tintAlpha: 0.05, vignette: 0.35,
    feature: { kind: 'river', color: 0x2a2440, edge: 0x8a7a60, flow: 0.5 },
    castle: 'tower', castleWall: 0xe8e0c8, castleRoof: 0x2a2420,
    npcColors: [0xf2ead6, 0x2a2420, 0xc0b090, 0xd04a3a], npcHat: 'tophat',
    lines: [
      'Everything that happens here gets written down.',
      'Careful — the ink river stains.',
      'Your page is still blank. Interesting.',
      'The Author is rewriting the ending again.',
    ],
    shopName: 'THE BINDERY', shopkeeper: 'Scrivener Dot', shopLine: 'First editions only.',
    guardLine: 'The Author writes you in after five chapters.',
  },
  chalk: {
    epithet: 'Scribble Square, the drawn town',
    ground: 0x1a2620, groundAlt: 0x223028, groundSpeck: 0xf4f1e6,
    paving: 'slab', street: 0x2e3a34, streetEdge: 0x101814,
    wall: 0x3a4a42, wallShade: 0x24302a, roof: 0x2a3630, roofShade: 0x16201a, trim: 0xf4f1e6, glow: 0xfffbe8,
    roofStyle: 'gable',
    props: ['chalkDoodle', 'chalkDoodle', 'chalkDoodle', 'easel', 'easel', 'bench'],
    monument: 'easel',
    particle: 'dust', particleColor: 0xf4f1e6, particleCount: 50,
    tint: 0x2a4a3a, tintAlpha: 0.08, vignette: 0.55,
    feature: NONE,
    castle: 'keep', castleWall: 0x2e3a34, castleRoof: 0xf4f1e6,
    npcColors: [0xf4f1e6, 0xff8ab0, 0x8ad0ff, 0xffe070], npcHat: 'cap',
    lines: [
      'Someone erased half the market last night.',
      'Draw a door, walk through it. That\'s the rule.',
      'Chalk dust in everything. Everything.',
      'Don\'t smudge the lines!',
    ],
    shopName: 'THE SKETCHBOOK', shopkeeper: 'Doodle', shopLine: 'Freshly drawn!',
    guardLine: 'The Draughtsman erases the unready.',
  },
  psychic: {
    epithet: 'Cerebra, the thinking town',
    ground: 0x140e22, groundAlt: 0x1c142e, groundSpeck: 0x9b4dff,
    paving: 'tile', street: 0x2e2244, streetEdge: 0x100a1a,
    wall: 0x3a2a5a, wallShade: 0x261a3e, roof: 0x5a2aa0, roofShade: 0x3a1a6a, trim: 0xe0c0ff, glow: 0xc090ff,
    roofStyle: 'dome',
    props: ['eyeStatue', 'eyeStatue', 'floatRock', 'floatRock', 'crystal', 'statue'],
    monument: 'eyeStatue',
    particle: 'mote', particleColor: 0xc090ff, particleCount: 55,
    tint: 0x9b4dff, tintAlpha: 0.08, vignette: 0.6,
    feature: NONE,
    castle: 'dome', castleWall: 0x2e2048, castleRoof: 0x9b4dff,
    npcColors: [0x9b4dff, 0xe0c0ff, 0x5a2aa0, 0xffffff], npcHat: 'halo',
    lines: [
      'I know what you were about to say.',
      'Checkmate in four. You\'ll see.',
      'The statues follow you with their eyes. They\'re meant to.',
      'Think quieter, please.',
    ],
    shopName: 'MIND OVER MATTER', shopkeeper: 'The Seer', shopLine: 'I knew you\'d come in.',
    guardLine: 'The Grandmaster has already seen how this ends.',
  },
  passion: {
    // Devotion — the id is a trap.
    epithet: 'Sanctum, the devoted town',
    ground: 0x24141c, groundAlt: 0x301a26, groundSpeck: 0xff9ac8,
    paving: 'tile', street: 0x4a2e3a, streetEdge: 0x20101a,
    wall: 0xf0e0e8, wallShade: 0xc8b0bc, roof: 0xc04a7a, roofShade: 0x8a2a54, trim: 0xffe090, glow: 0xffd0a0,
    roofStyle: 'spire',
    props: ['candle', 'candle', 'heartArch', 'flowerbed', 'flowerbed', 'statue', 'bench'],
    monument: 'heartArch',
    particle: 'petal', particleColor: 0xff9ac8, particleCount: 50,
    tint: 0xff5fa2, tintAlpha: 0.06, vignette: 0.45,
    feature: NONE,
    castle: 'spire', castleWall: 0xe8d4dc, castleRoof: 0xc04a7a,
    npcColors: [0xff5fa2, 0xffe090, 0xffffff, 0xc04a7a], npcHat: 'halo',
    lines: [
      'Have faith, traveller.',
      'Light a candle for the fallen.',
      'Hymns at every bell. We never miss one.',
      'The High Priest prays for your soul. Constantly.',
    ],
    shopName: 'THE RELIQUARY', shopkeeper: 'Sister Vesper', shopLine: 'Blessings, at a modest tithe.',
    guardLine: 'Only the faithful — five times proven — may pass.',
  },
  dune: {
    // Sand — the id is a trap.
    epithet: 'Drifthollow, the buried town',
    ground: 0xc8a868, groundAlt: 0xd8b878, groundSpeck: 0x8a6a3a,
    paving: 'sand', street: 0xe0c88a, streetEdge: 0xa88a50,
    wall: 0xd0b07a, wallShade: 0xa88a54, roof: 0xb08048, roofShade: 0x805a2a, trim: 0x4a8ab0, glow: 0xffe0a0,
    roofStyle: 'dome',
    props: ['cactus', 'cactus', 'duneMound', 'duneMound', 'bonePile', 'rock', 'tent'],
    monument: 'statue',
    particle: 'dust', particleColor: 0xe8c87a, particleCount: 90,
    tint: 0xe8c87a, tintAlpha: 0.08, vignette: 0.4,
    feature: NONE,
    castle: 'ziggurat', castleWall: 0xc0a068, castleRoof: 0x8a6a3a,
    npcColors: [0xe8c87a, 0x4a8ab0, 0xb08048, 0xffffff], npcHat: 'band',
    lines: [
      'The dunes move at night. So do the houses.',
      'Shake out your boots. Every time.',
      'Half the town is still buried below us.',
      'Water? Never heard of it.',
    ],
    shopName: 'THE CARAVANSERAI', shopkeeper: 'Sahir', shopLine: 'Dug up fresh!',
    guardLine: 'The Dune Pharaoh rises for the worthy.',
  },
  fortune: {
    // Gold — the id is a trap.
    epithet: 'Aurum, the gilded town',
    ground: 0x2a2010, groundAlt: 0x382a14, groundSpeck: 0xffd040,
    paving: 'tile', street: 0x5a4a24, streetEdge: 0x2a200e,
    wall: 0xe8d090, wallShade: 0xc0a460, roof: 0xd8a531, roofShade: 0xa07a18, trim: 0xffffff, glow: 0xffe890,
    roofStyle: 'dome',
    props: ['coinPile', 'coinPile', 'goldStatue', 'chest', 'chest', 'flowerbed', 'bench'],
    monument: 'goldStatue',
    particle: 'spark', particleColor: 0xffe070, particleCount: 50,
    tint: 0xd8a531, tintAlpha: 0.06, vignette: 0.45,
    feature: NONE,
    castle: 'dome', castleWall: 0xe8d090, castleRoof: 0xd8a531,
    npcColors: [0xd8a531, 0xffe890, 0xa07a18, 0xffffff], npcHat: 'crown',
    lines: [
      'Everything here costs something.',
      'Polish your boots. This is Aurum.',
      'The streets aren\'t paved with gold. That\'s the plaza.',
      'The Alchemist turns visitors into statues. Allegedly.',
    ],
    shopName: 'THE GILDED COUNTER', shopkeeper: 'Midas Jr.', shopLine: 'Only the finest, for a price.',
    guardLine: 'The Alchemist entertains only proven buyers.',
  },
  magma: {
    epithet: 'Blackrock Harbour, the pirate caldera',
    ground: 0x1a0c08, groundAlt: 0x261008, groundSpeck: 0xff5a1e,
    paving: 'slab', street: 0x3a2018, streetEdge: 0x140804,
    wall: 0x3a2420, wallShade: 0x221412, roof: 0x5a1a0e, roofShade: 0x3a0e06, trim: 0xff8a40, glow: 0xff8a30,
    roofStyle: 'crooked',
    props: ['lavaVent', 'lavaVent', 'obsidianSpire', 'obsidianSpire', 'anchor', 'barrel', 'cannon'],
    monument: 'obsidianSpire',
    particle: 'ember', particleColor: 0xff6a1e, particleCount: 80,
    tint: 0xff5a1e, tintAlpha: 0.08, vignette: 0.65,
    feature: { kind: 'river', color: 0xff4a10, edge: 0x2a0802, flow: 0.8 },
    castle: 'fortress', castleWall: 0x221412, castleRoof: 0x8a2a0e,
    npcColors: [0xff5a1e, 0x3a2420, 0xffc060, 0x8a1a0e], npcHat: 'tophat',
    lines: [
      'Arr. Mind the lava, matey.',
      'Sailed a ship down that river once. Once.',
      'The Captain\'s ship is moored in the castle. Somehow.',
      'Yo ho. Ho. Hot.',
    ],
    shopName: 'THE PLUNDER HOLD', shopkeeper: 'Cap\'n Cinder', shopLine: 'Pillaged fresh!',
    guardLine: 'Ye don\'t board the Captain\'s keep without five scalps.',
  },
  radiation: {
    epithet: 'Halflife, the fallout town',
    ground: 0x141a0e, groundAlt: 0x1c2412, groundSpeck: 0x7cff3d,
    paving: 'slab', street: 0x2e3424, streetEdge: 0x10140a,
    wall: 0x4a5040, wallShade: 0x2e3428, roof: 0x3a4030, roofShade: 0x22261a, trim: 0xffd020, glow: 0xb0ff60,
    roofStyle: 'flat',
    props: ['barrelHazard', 'barrelHazard', 'warningSign', 'warningSign', 'acidPool', 'deadTree', 'crater'],
    monument: 'warningSign',
    particle: 'mote', particleColor: 0x9cff5d, particleCount: 60,
    tint: 0x7cff3d, tintAlpha: 0.07, vignette: 0.65,
    feature: NONE,
    castle: 'tower', castleWall: 0x2e3428, castleRoof: 0x7cff3d,
    npcColors: [0x7cff3d, 0xffd020, 0x4a5040, 0xe0ff9a], npcHat: 'mask',
    lines: [
      'Click... click... click-click. Normal levels.',
      'I glow in the dark now. Saves on candles.',
      'Stay out of the green puddles.',
      'The Reactor King hasn\'t slept since the meltdown.',
    ],
    shopName: 'FALLOUT SUPPLY', shopkeeper: 'Geiger', shopLine: 'Lightly irradiated. Barely.',
    guardLine: 'Exposure limit: five doors. Then the King.',
  },
  depths: {
    epithet: 'Abyssal Reach, the sunken town',
    ground: 0x061a20, groundAlt: 0x08242c, groundSpeck: 0x3ad0e0,
    paving: 'slab', street: 0x14343c, streetEdge: 0x041014,
    wall: 0x1a4a54, wallShade: 0x0e3038, roof: 0x0e8f9c, roofShade: 0x08606a, trim: 0x8af0ff, glow: 0x6af0ff,
    roofStyle: 'dome',
    props: ['coral', 'coral', 'kelp', 'kelp', 'anchor', 'rock', 'chest'],
    monument: 'anchor',
    particle: 'bubble', particleColor: 0x8af0ff, particleCount: 70,
    tint: 0x0e8f9c, tintAlpha: 0.12, vignette: 0.7,
    feature: { kind: 'chasm', color: 0x01080c, edge: 0x0e4a54 },
    castle: 'dome', castleWall: 0x0e3038, castleRoof: 0x0e8f9c,
    npcColors: [0x0e8f9c, 0x8af0ff, 0x3a6aa0, 0xff8a6a], npcHat: 'none',
    lines: [
      'Blub. Sorry. Blub.',
      'The trench goes down forever.',
      'Something big swims under the town.',
      'Hold your breath near the castle.',
    ],
    shopName: 'THE SUNKEN HOLD', shopkeeper: 'Barnacle Bess', shopLine: 'Salvaged from the deep!',
    guardLine: 'The Leviathan surfaces for the worthy.',
  },
  gum: {
    // Slime — the id is a trap.
    epithet: 'Goopsville, the sticky town',
    ground: 0x142410, groundAlt: 0x1c3016, groundSpeck: 0x6add5a,
    paving: 'tile', street: 0x2a4024, streetEdge: 0x0e1a0a,
    wall: 0x6ad05a, wallShade: 0x46a03a, roof: 0x2a8a2a, roofShade: 0x1a5e1a, trim: 0xd0ffb0, glow: 0xc0ff9a,
    roofStyle: 'mushroom',
    props: ['gumBlob', 'gumBlob', 'gumBlob', 'acidPool', 'bush', 'bench'],
    monument: 'gumBlob',
    particle: 'bubble', particleColor: 0x8aff7a, particleCount: 50,
    tint: 0x46b93f, tintAlpha: 0.07, vignette: 0.5,
    feature: { kind: 'river', color: 0x4ac03a, edge: 0x1a4a14, flow: 0.25 },
    castle: 'dome', castleWall: 0x46a03a, castleRoof: 0x2a8a2a,
    npcColors: [0x46b93f, 0x8aff7a, 0x2a8a2a, 0xffe070], npcHat: 'none',
    lines: [
      'Squelch.',
      'Don\'t step in that. Too late.',
      'Everything sticks here. Friendships too!',
      'The Gelatinous Monarch absorbs visitors. Just a little.',
    ],
    shopName: 'THE GOOP SHOP', shopkeeper: 'Wobble', shopLine: 'Stuck on a deal?',
    guardLine: 'The Monarch oozes out for the worthy only.',
  },
};

/** Fallback for any world without an entry — never expected, but never a crash. */
const DEFAULT_THEME: TownTheme = T.earth;

export function getTownTheme(worldId: string): TownTheme {
  return T[worldId] ?? DEFAULT_THEME;
}

/** Signpost name for a world: "WATER TOWN". */
export function townName(worldName: string): string {
  // World data still carries the pre-rework element names; signs use the current ones.
  const current: Record<string, string> = { Gluttony: 'Harvest', Passion: 'Devotion', Fortune: 'Gold' };
  return `${(current[worldName] ?? worldName).toUpperCase()} TOWN`;
}
