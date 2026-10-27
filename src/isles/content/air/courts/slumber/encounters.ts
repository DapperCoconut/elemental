import type { EncounterDef } from '../../../../IslesTypes';

/**
 * The five champions of the Slumber Court. Tier 2 of Highspire: difficulties 3,3,4,4,4, 75 coins
 * apiece. Each keeps a corner of the sleeping town for Prince Reverie: Wooly at the counting stile
 * in the sheepfold on the cliff, Nod wandering the crossroads where Nod Lane meets the Long Ward,
 * Mara under the last lamps of Lampless Row, Down in the yard of his feather mill, and Nanny Hush
 * at the foot of the Lullaby Belfry, where the bell that puts the town to sleep is wound.
 */

export const ENC_SHEEP = 'slumber-counting-sheep';
export const ENC_SLEEPWALK = 'slumber-sleepwalk';
export const ENC_BAD_DREAM = 'slumber-bad-dream';
export const ENC_PILLOW = 'slumber-pillow-fight';
export const ENC_LULLABY = 'slumber-lullaby';

export const SLUMBER_ENCOUNTERS: EncounterDef[] = [
  {
    id: ENC_SHEEP, court: 'slumber', name: 'Counting Sheep',
    foeName: 'Shepherd Wooly', foeElement: 'life', difficulty: 3, gimmick: ENC_SHEEP,
    at: { x: 560, y: 540 },
    look: { body: 0xe8dcc8, accent: 0xb6a6d8, hat: 'nightcap', traits: ['cane', 'scarf'], size: 1.05, eye: 0xd8f0ff },
    challenge: [
      'Four hundred and twelve... four hundred and thirteen... oh! A visitor. You made me lose count. Again.',
      'Every sheep over the stile is a breath the Prince doesn\'t have to tax. Help me count. Count till you drop.',
    ],
    beaten: [
      'You knocked the flock flat and stayed awake through all of it. Nobody stays awake through all of it.',
      'Go on. They\'ll still be leaping when you come back. They never stop. I never get to stop counting.',
    ],
    coins: 75,
  },
  {
    id: ENC_SLEEPWALK, court: 'slumber', name: 'Sleepwalk',
    foeName: 'Somnambulist Nod', foeElement: 'psychic', difficulty: 3, gimmick: ENC_SLEEPWALK,
    at: { x: 1260, y: 1110 },
    look: { body: 0xd8d0e8, accent: 0x6a4a7a, hat: 'nightcap', traits: ['lantern'], size: 1.15, eye: 0xb89cff },
    challenge: [
      'Mm. Mmm. You\'re in my dream. Everyone\'s in my dream. I can see where your feet are going before they do.',
      'Walk with me. We\'ll go the long way round. We\'ll go right... through... you.',
    ],
    beaten: [
      'I woke up. I never wake up. I\'m standing in the road in my socks and it\'s cold and I owe ninety breaths.',
      'Don\'t tell the Prince I woke. He likes me better walking.',
    ],
    coins: 75,
  },
  {
    id: ENC_BAD_DREAM, court: 'slumber', name: 'Bad Dream',
    foeName: 'Dreadmonger Mara', foeElement: 'shadow', difficulty: 4, gimmick: ENC_BAD_DREAM,
    at: { x: 2120, y: 1270 },
    look: { body: 0x8a7a98, accent: 0x24142e, hat: 'veil', traits: ['lantern', 'mask'], size: 1.1, eye: 0xff5a7a },
    challenge: [
      'A frightened sleeper breathes small, dearie. Small breaths, small trouble. I sell the Prince fear by the yard.',
      'Shut your eyes. No — keep them open. It doesn\'t matter which. You\'re mine either way.',
    ],
    beaten: [
      'You woke first. Nobody wakes first. I\'ve been everybody\'s bad dream for eleven years and nobody wakes first.',
      'Take the lantern. It\'s only black glass. It was only ever black glass.',
    ],
    coins: 75,
  },
  {
    id: ENC_PILLOW, court: 'slumber', name: 'Pillow Fight',
    foeName: 'Pillowmaker Down', foeElement: 'cloth', difficulty: 4, gimmick: ENC_PILLOW,
    at: { x: 1500, y: 1340 },
    look: { body: 0xf0e4d8, accent: 0x8a9ac8, hat: 'cap', traits: ['apron', 'satchel'], size: 1.3 },
    challenge: [
      'Six hundred beds on the Long Ward and every one gets a pillow from my mill. Stuffed with the town\'s own geese.',
      'Soft? I\'ll show you soft. A goose-down pillow at full swing will knock a grown man into next week.',
    ],
    beaten: [
      'Feathers everywhere. In my ears, my beard, the mill race. Ha! Not had a proper pillow fight since I was nine.',
      'Here — the good pillow. The one I kept back. Somebody on the Long Ward ought to sleep on it. Pick someone.',
    ],
    coins: 75,
  },
  {
    id: ENC_LULLABY, court: 'slumber', name: 'Lullaby',
    foeName: 'Nanny Hush', foeElement: 'silence', difficulty: 4, gimmick: ENC_LULLABY,
    at: { x: 1050, y: 500 },
    look: { body: 0xe4d8d0, accent: 0x3a4060, hat: 'hood', traits: ['apron', 'glasses'], size: 1.0, eye: 0xc8d8ff },
    challenge: [
      'Shh. Hush now. The bell sings them down and my box keeps them down. Twenty years and not one of them stirred.',
      'You\'re all wound up, poppet. Let Nanny wind the box. There. Hear it? Heavy, aren\'t they. Your eyelids.',
    ],
    beaten: [
      'You stopped the box and stood there in the quiet, wide awake. I\'d forgotten what that looked like.',
      'Go on, then. Mind the Belfry steps. And don\'t you dare wind that thing on your way past.',
    ],
    coins: 75,
  },
];
