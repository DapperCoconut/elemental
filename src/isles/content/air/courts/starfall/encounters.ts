import type { EncounterDef } from '../../../../IslesTypes';

/**
 * The five champions of the Starfall Court, spread over the summit from the fallen-star craters
 * in the south-west to the Star Kiln in the north-east. Tier 4 — the hardest court on Highspire:
 * difficulties 4, 5, 5, 5, 5 and 100 coins apiece. Ids match the encounters the quests ask for.
 */
export const STARFALL_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'starfall-shooting-stars',
    court: 'starfall',
    name: 'Shooting Stars',
    foeName: 'Stargazer Vega',
    foeElement: 'astra',
    difficulty: 4,
    gimmick: 'starfall-shooting-stars',
    at: { x: 720, y: 1330 },
    look: { body: 0x2a2450, accent: 0x6a4cff, hand: 0xf4f0ff, hat: 'wizard', traits: ['glasses', 'book'], size: 0.95, eye: 0xffe08a },
    challenge: [
      'I count the falls for the Prince. Every star that comes down up here is logged, weighed and taxed.',
      'Watch the trails. Where one lands it leaves dust, and dust is power. I mean to stand in all of it.',
    ],
    beaten: [
      'You read the trails better than I write them down. I\'ll have to log that: one stargazer, out-gazed.',
      'The craters are yours to stand in. Mind the glass. It\'s still warm from the last one.',
    ],
    coins: 100,
  },
  {
    id: 'starfall-constellation',
    court: 'starfall',
    name: 'Constellation',
    foeName: 'Cartographer Ursa',
    foeElement: 'light',
    difficulty: 5,
    gimmick: 'starfall-constellation',
    at: { x: 1080, y: 1040 },
    look: { body: 0xe8dcc0, accent: 0x1f3a7a, hand: 0xe8c25a, hat: 'plume', traits: ['satchel', 'tool'], size: 1.1, eye: 0x8fe3ff },
    challenge: [
      'I chart the sky for the Ledger: every star in its place, joined up neat, so the Prince knows whose is whose.',
      'Touch the floor-stars in order and the figure is yours. Finished, it flies. I have never once lost the race.',
    ],
    beaten: [
      'You drew it faster than I could. A cartographer beaten to her own lines. I need to sit down.',
      'Keep the figure. I\'ll chart another. There are always more stars than anyone has names for.',
    ],
    coins: 100,
  },
  {
    id: 'starfall-telescope',
    court: 'starfall',
    name: 'Telescope',
    foeName: 'Astronomer Galilee',
    foeElement: 'crystal',
    difficulty: 5,
    gimmick: 'starfall-telescope',
    at: { x: 1760, y: 1040 },
    look: { body: 0x9aa0b8, accent: 0x5aa898, hand: 0xc8e8ff, hat: 'goggles', traits: ['glasses', 'beard', 'tool'], size: 1.2, eye: 0xc8e8ff },
    challenge: [
      'The great lens sees everything. It found your household\'s star last week. It finds whatever I point it at.',
      'Whoever it focuses on is made large: struck harder, striking harder. It is a terribly honest lens.',
    ],
    beaten: [
      'You stood in the focus when it suited you and nowhere near it when it didn\'t. That is the whole of optics.',
      'The lens is cracked. I\'ll grind another. It takes a year. I will be glad of the quiet.',
    ],
    coins: 100,
  },
  {
    id: 'starfall-eclipse',
    court: 'starfall',
    name: 'Eclipse',
    foeName: 'Umbra the Eclipser',
    foeElement: 'soul',
    difficulty: 5,
    gimmick: 'starfall-eclipse',
    at: { x: 560, y: 970 },
    look: { body: 0x1a1830, accent: 0xe6e2d0, hand: 0x6a6a9a, hat: 'hood', traits: ['mask', 'lantern'], size: 1.05, eye: 0xfff4d0 },
    challenge: [
      'I wind the moon across for the Prince\'s rites. In its shadow you are hidden and hushed, like the becalmed.',
      'At totality the corona flares. Everything not in the dark burns. Choose: hidden and quiet, or bright and ash.',
    ],
    beaten: [
      'You hid in my dark only when the light came for you. Clever. The becalmed never had the choice.',
      'I will wind the disc back. Slowly. I would like one night up here without a rite.',
    ],
    coins: 100,
  },
  {
    id: 'starfall-dying-star',
    court: 'starfall',
    name: 'Dying Star',
    foeName: 'Keeper Betel',
    foeElement: 'plasma',
    difficulty: 5,
    hpMult: 1.1,
    gimmick: 'starfall-dying-star',
    at: { x: 1640, y: 660 },
    look: { body: 0x8a3a2a, accent: 0xff6a3a, hand: 0xffb070, hat: 'helmet', traits: ['apron', 'tool', 'mask'], size: 1.3, eye: 0xffe08a },
    challenge: [
      'I keep the kiln. The stars that fall up here are chained and burned for the Lung\'s lamps until they gutter.',
      'This one is dying. It breathes in threes: swell, collapse, nova. Learn the count or be in the wrong place.',
    ],
    beaten: [
      'You danced its three-step better than I do, and I\'ve been feeding it for nine years.',
      'Go on. I\'ll let this one die in peace. It deserves that. So did the others.',
    ],
    coins: 100,
  },
];
