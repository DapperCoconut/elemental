import type { EncounterDef } from '../../../../IslesTypes';

/**
 * The five champions of the Caldera Court, spread from the crater gate to the quarry. Tier 4:
 * difficulties 3, 4, 4, 4, 5 and 65 coins apiece. Ids match the encounters the quests ask for.
 */
export const CALDERA_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'caldera-crust-walk',
    court: 'caldera',
    name: 'Crust Walk',
    foeName: 'Crustwalker Hekla',
    foeElement: 'magma',
    difficulty: 3,
    gimmick: 'caldera-crust',
    at: { x: 1400, y: 1560 },
    look: { body: 0x6a3a26, accent: 0x2a1a14, hand: 0xff8a3a, hat: 'bandana', traits: ['scarf', 'brand'], size: 1.05, eye: 0xffd27a },
    challenge: [
      'You walk like a lowlander. Heels down, weight on the crust. Hear it creak? That is it deciding.',
      'Crust Walk, then. The floor picks who goes through it. I just help it choose.',
    ],
    beaten: [
      'You never stood still once. Annoying. Correct, but annoying.',
      'The Prince says walk light. I always thought he meant on the crust.',
    ],
    coins: 65,
  },
  {
    id: 'caldera-eruption-clock',
    court: 'caldera',
    name: 'Eruption Clock',
    foeName: 'Ventkeeper Surtr',
    foeElement: 'earth',
    difficulty: 4,
    gimmick: 'caldera-eruption',
    at: { x: 1900, y: 430 },
    look: { body: 0x5e5a4a, accent: 0xc9b832, hand: 0x3a3428, hat: 'goggles', traits: ['beard', 'tool'], size: 1.2 },
    challenge: [
      'West, east, south. West, east, south. Forty years I have kept these vents to time.',
      'They have never once been late. Shall we see if you are?',
    ],
    beaten: [
      'Forty years and I never thought to stand behind the rocks I made. You did it in a minute.',
      'The vents are still on time. I am the one who is behind.',
    ],
    coins: 65,
  },
  {
    id: 'caldera-cooling-rain',
    court: 'caldera',
    name: 'Cooling Rain',
    foeName: 'Rainmaker Tull',
    foeElement: 'water',
    difficulty: 4,
    gimmick: 'caldera-rain',
    at: { x: 870, y: 860 },
    look: { body: 0x5c7a96, accent: 0x2e4256, hand: 0xa9cce8, hat: 'hood', traits: ['satchel', 'cane'], size: 0.95, eye: 0xdff2ff },
    challenge: [
      'Rain, in a volcano. The Prince pays me in water rights. Every drop the miners drink, I sell.',
      'Stand under my cloud if you like. It is the only shade for a mile — and it is mine.',
    ],
    beaten: [
      'You tore my cloud to rags. Do you know how long it takes to coax one up the crater wall?',
      'Fine. The kid can have the rain. Tell him to bring his own bucket.',
    ],
    coins: 65,
  },
  {
    id: 'caldera-magma-tide',
    court: 'caldera',
    name: 'Magma Tide',
    foeName: 'Tidecaller Lavra',
    foeElement: 'gravity',
    difficulty: 4,
    gimmick: 'caldera-tide',
    at: { x: 1880, y: 1300 },
    look: { body: 0xb8441e, accent: 0x1f1d24, hand: 0xffb347, hat: 'veil', traits: ['scarf'], size: 1.0, eye: 0xffe9a8 },
    challenge: [
      'The lake breathes in and out, like the sea it is jealous of. I pull, it follows. I tell it when.',
      'Find yourself an island, stranger. There are five. There will be four.',
    ],
    beaten: [
      'You knew which island I wanted before I did. Who taught you to read a tide?',
      'Go on to the keep. The lake has already started talking about you.',
    ],
    coins: 65,
  },
  {
    id: 'caldera-pumice-brawl',
    court: 'caldera',
    name: 'Pumice Brawl',
    foeName: 'Rhyo the Pumice Golem',
    foeElement: 'clay',
    difficulty: 5,
    hpMult: 1.15,
    gimmick: 'caldera-pumice',
    at: { x: 320, y: 990 },
    look: { body: 0xcfc6b8, accent: 0x8d8478, hand: 0xe8e0d2, hat: 'none', traits: ['bandage'], size: 1.4, eye: 0xff8a3a },
    challenge: [
      'RHYO. QUARRY. ROCKS. FLOAT. YOU... DO NOT.',
      'RHYO PLAY CATCH. YOU ARE THE PINS.',
    ],
    beaten: [
      'RHYO ARMS TIRED. YOU WAITED FOR TIRED. CLEVER SMALL ONE.',
      'RHYO STILL LIKE CATCH. NEXT TIME YOU THROW.',
    ],
    coins: 65,
  },
];
