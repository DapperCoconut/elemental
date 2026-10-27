import type { EncounterDef } from '../../../../IslesTypes';

/**
 * The Ossuary Court's five champions, each keeping one part of the Empress's garden of the dead.
 * Positions match `area.ts`: Sternum among the planted rows of the Bone Garden in the middle of
 * the court, Ossein in his mason's yard in the south-west, Femur at the marrow wells to the east,
 * Coccyx at the knucklebone board outside the Rattling Jaw, and Vertebra before the reliquary
 * chapels in the north-east.
 */
export const OSSUARY_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'ossuary-bone-garden',
    court: 'ossuary',
    name: 'Bone Garden',
    foeName: 'Gardener Sternum',
    foeElement: 'marrow',
    difficulty: 4,
    gimmick: 'ossuary-bone-garden',
    at: { x: 1150, y: 870 },
    look: { body: 0xe0d6c0, accent: 0x3c4632, hat: 'straw', traits: ['apron', 'tool'], size: 1.15, eye: 0xf0e6c8 },
    challenge: [
      'Mind the rows. Everything in them was somebody, and everything in them is coming up nicely.',
      'Plant a shin in good black loam and it puts out thorns by the week. Bone wants to grow. It only needs asking.',
      'Knock one of my thickets and it bites back at whoever\'s nearest. Let\'s see who\'s nearest.',
    ],
    beaten: [
      'You pruned my whole bed. Snapped every thicket clean. ...That is a gardener\'s hand, that is.',
      'Leave the rows standing, would you? They are the only graves some of them got.',
    ],
    coins: 80,
  },
  {
    id: 'ossuary-calcify',
    court: 'ossuary',
    name: 'Calcify',
    foeName: 'Mason Ossein',
    foeElement: 'crystal',
    difficulty: 4,
    gimmick: 'ossuary-calcify',
    at: { x: 330, y: 1300 },
    look: { body: 0xcfc8bc, accent: 0x6c6672, hat: 'cap', traits: ['tool', 'beard', 'glasses'], size: 1.3, eye: 0xbfe8ff },
    challenge: [
      'Hold still. No — really. Hold still, and the yard will make a statue of you for free.',
      'Bone and stone, it\'s all lime in the end. I only help it along.',
      'Stand and you set hard. Run and you stay soft. I have never in my life run.',
    ],
    beaten: [
      'Cracked me clean out of my own shell. Like an egg. Like a very old, very cross egg.',
      'Keep moving, then. It\'s the only thing that ever kept anyone soft in this court.',
    ],
    coins: 80,
  },
  {
    id: 'ossuary-marrow-wells',
    court: 'ossuary',
    name: 'Marrow Wells',
    foeName: 'Digger Femur',
    foeElement: 'gravity',
    difficulty: 4,
    gimmick: 'ossuary-marrow-wells',
    at: { x: 1760, y: 900 },
    look: { body: 0xb08a6a, accent: 0x6a2228, hat: 'hood', traits: ['tool', 'bandage', 'pack'], size: 1.25 },
    challenge: [
      'The wells go down further than anyone has dug, and I have dug further than anyone.',
      'Everything leans toward them. Water, light, you. The marrow at the bottom is hot enough to render a horse.',
      'Come and stand by the rim. Everybody ends up standing by the rim.',
    ],
    beaten: [
      'You put me in my own well. Up to the knees. I can still feel my knees, which is the good news.',
      'Don\'t fish too deep, mind. Some of what\'s down there bites back, and it has teeth it found.',
    ],
    coins: 80,
  },
  {
    id: 'ossuary-knucklebones',
    court: 'ossuary',
    name: 'Knucklebones',
    foeName: 'Rattlebag Coccyx',
    foeElement: 'fate',
    difficulty: 4,
    gimmick: 'ossuary-knucklebones',
    at: { x: 640, y: 1190 },
    look: { body: 0xe8c8a8, accent: 0x5a3a6a, hat: 'tophat', traits: ['satchel', 'pipe', 'eyepatch'], size: 0.95 },
    challenge: [
      'Five bones and a jack, friend. Toss \'em and the yard does what they say. No cheating. Hardly any.',
      'Whoever snatches the jack before the bones settle gets the luck of the throw. That\'s house rules.',
      'The house is me. I am also the rules.',
    ],
    beaten: [
      'You snatched my jack. Nobody snatches my jack. ...Keep it. It always liked you better.',
      'Throw your own bones now and then. A body should know which way it\'s going to fall.',
    ],
    coins: 80,
  },
  {
    id: 'ossuary-reliquary',
    court: 'ossuary',
    name: 'Reliquary',
    foeName: 'Keeper Vertebra',
    foeElement: 'passion',
    difficulty: 5,
    gimmick: 'ossuary-reliquary',
    at: { x: 2020, y: 530 },
    look: { body: 0xf0dccc, accent: 0xe8e0d0, hat: 'veil', traits: ['book', 'lantern'], size: 1.0, eye: 0xfff0b8 },
    challenge: [
      'Each casket holds a saint\'s knuckle. Kneel by one and it will mend you. They are very forgiving, saints.',
      'But I am consecrating them, one by one, to myself. A saint should love the one who keeps it.',
      'Break the seals if you dare. It is the worst thing a person can do. I would think less of you.',
    ],
    beaten: [
      'You smashed the caskets. The knuckles are on the floor. ...They look happier on the floor.',
      'Let the saints be anyone\'s again. I was so tired of being loved by bones.',
    ],
    coins: 80,
  },
];
