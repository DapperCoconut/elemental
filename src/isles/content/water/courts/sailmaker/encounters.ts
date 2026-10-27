import type { EncounterDef } from '../../../../IslesTypes';

/**
 * The five champions of the Sailmaker's Court. Tier 2: difficulties 2,3,3,3,3, 55 coins apiece.
 * Each keeps a corner of the cliff-top: Tuck on the drying green, Hawser at the head of the rope
 * walk, Gale under the test rig on Wind Bluff, Shuttle at the Loom House door, and Mends at her
 * quilting frames above the slipways.
 */

export const ENC_DRYING_LINES = 'sailmaker-drying-lines';
export const ENC_ROPE_WALK = 'sailmaker-rope-walk';
export const ENC_FULL_SAIL = 'sailmaker-full-sail';
export const ENC_LOOM = 'sailmaker-the-loom';
export const ENC_PATCHWORK = 'sailmaker-patchwork';

export const SAILMAKER_ENCOUNTERS: EncounterDef[] = [
  {
    id: ENC_DRYING_LINES, court: 'sailmaker', name: 'Drying Lines',
    foeName: 'Seamstress Tuck', foeElement: 'cloth', difficulty: 2, gimmick: 'sailmaker-drying-lines',
    at: { x: 1160, y: 972 },
    look: { body: 0xe8d6c0, accent: 0x6a8aa8, hat: 'bandana', traits: ['apron', 'satchel'], size: 1.05 },
    challenge: [
      'Mind the sheets! Forty yards of the Queen\'s mainsail out to dry and you come tramping through it.',
      'You know what I do with people who get mud on the Prince\'s canvas? I peg them up with it.',
    ],
    beaten: [
      'Oof. Fair enough — you can\'t hit what you can\'t see, and I couldn\'t see you either.',
      'Help me fold, would you? No? Then mind the lines on your way out.',
    ],
    coins: 55,
  },
  {
    id: ENC_ROPE_WALK, court: 'sailmaker', name: 'Rope Walk',
    foeName: 'Ropewalker Hawser', foeElement: 'string', difficulty: 3, gimmick: 'sailmaker-rope-walk',
    at: { x: 1060, y: 474 },
    look: { body: 0xc8a47a, accent: 0x4a3a2a, hat: 'cap', traits: ['beard', 'tool'], size: 1.25 },
    challenge: [
      'Three hundred yards, this walk. I\'ve walked it backwards every day for thirty years, paying out yarn.',
      'Every rope I lay is under strain. Step through one at the wrong moment and it\'ll take your head off.',
    ],
    beaten: [
      'Hah! You let me walk into my own lay. Thirty years and I never once did that.',
      'Go on. The walk\'s yours. Mind your ankles.',
    ],
    coins: 55,
  },
  {
    id: ENC_FULL_SAIL, court: 'sailmaker', name: 'Full Sail',
    foeName: 'Sailwright Gale', foeElement: 'air', difficulty: 3, gimmick: 'sailmaker-full-sail',
    at: { x: 2200, y: 1162 },
    look: { body: 0xd8c8b0, accent: 0xa8583a, hat: 'souwester', traits: ['scarf', 'rod'], size: 1.0 },
    challenge: [
      'Every sail the Prince sends to the fleet comes up here first. I hoist it, and the sea tells me if it\'s right.',
      'The wind\'s off the water today. Find yourself some lee, stranger. There isn\'t much.',
    ],
    beaten: [
      'You read the cleats like a deckhand. Where did a landsman learn to hide from the wind?',
      'The sail stays up. It always stays up. That\'s the only rule I\'ll keep.',
    ],
    coins: 55,
  },
  {
    id: ENC_LOOM, court: 'sailmaker', name: 'The Loom',
    foeName: 'Weaver Shuttle', foeElement: 'technology', difficulty: 3, gimmick: 'sailmaker-the-loom',
    at: { x: 1750, y: 604 },
    look: { body: 0xb8c0c8, accent: 0x3a4a5a, hat: 'goggles', traits: ['tool', 'apron'], size: 0.95, eye: 0xa8f0ff },
    challenge: [
      'Two hundred picks a minute. The great loom never stops, and neither do the weavers bound to it.',
      'I built her. Every heddle, every treadle. Step into her weave, then, and see how you like the pattern.',
    ],
    beaten: [
      'You walked her maze like you\'d drawn it. I\'ve watched weavers lose fingers learning that.',
      'I\'ll let her rest an hour. Just an hour. Don\'t tell the Measurers.',
    ],
    coins: 55,
  },
  {
    id: ENC_PATCHWORK, court: 'sailmaker', name: 'Patchwork',
    foeName: 'Quilter Mends', foeElement: 'life', difficulty: 3, gimmick: 'sailmaker-patchwork',
    at: { x: 1740, y: 1088 },
    look: { body: 0xe8c8a8, accent: 0x9a3a5a, hat: 'beanie', traits: ['glasses', 'satchel'], size: 1.1 },
    challenge: [
      'Every scrap the lofts throw out, I sew into something. Waste not. The Prince taxes waste.',
      'I\'ll stitch you a floor, dearie. Stand on my squares and they\'ll mend me. Stand on yours, if you can sew.',
    ],
    beaten: [
      'You tore my squares up faster than I could sew them. Nobody does that. Nobody dares.',
      'Here — sit a minute. I\'ll patch that sleeve of yours. No charge. No tithe.',
    ],
    coins: 55,
  },
];
