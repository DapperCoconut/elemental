import type { EncounterDef } from '../../../../IslesTypes';

/**
 * The Spore Court's five champions — Prince Mycel's keepers of the bog, each holding one piece
 * of the rot that keeps the garden "tidy". Tier 3: difficulties 3,4,4,4,4 and 75 coins apiece.
 * They stand where their work is done: Puck on the Tithe Green's fairy ring, Gill in the
 * Puffball Lea, Hypha in the Thread Yard, Fen out in the Wisp Fen, Morel at the rot pits.
 */
export const SPORE_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'spore-fairy-ring',
    court: 'spore',
    name: 'Fairy Ring',
    foeName: 'Ringwarden Puck',
    foeElement: 'growth',
    difficulty: 3,
    gimmick: 'spore-fairy-ring',
    at: { x: 1050, y: 735 },
    look: { body: 0x5f8240, accent: 0xa8382a, hat: 'mushroom', traits: ['scarf', 'satchel'], size: 0.85, eye: 0xf4ecd6 },
    challenge: [
      'Step in the ring, step out of the ring — round and round, and where you come out, nobody knows!',
      'The Prince says a ring is a door with no house round it. I keep the doors. Mind which one shuts on you.',
    ],
    beaten: [
      'You kept coming out of the wrong ring on purpose. That is my trick! That was MY trick.',
      'Old Tansy says the rings went somewhere nice, once. Before the Prince. I would like to see where.',
    ],
    coins: 75,
  },
  {
    id: 'spore-puffball',
    court: 'spore',
    name: 'Puffball',
    foeName: 'Puffer Gill',
    foeElement: 'slime',
    difficulty: 4,
    gimmick: 'spore-puffball',
    at: { x: 560, y: 800 },
    look: { body: 0xe6d9bd, accent: 0x8c7a40, hat: 'hood', traits: ['mask', 'apron', 'tool'], size: 1.2, eye: 0xd9c27a },
    challenge: [
      'Careful where you step. Every white one on the Lea is a lungful of something you would rather not have.',
      'I harvest the spore for the tithe. I wear a mask for a reason. You have not got a mask, have you?',
    ],
    beaten: [
      '*cough* You kicked them back at me. Nobody kicks them back. *cough* Where is my mask...',
      'The Prince takes my spore by the sack and I do not ask what for. I should ask. I am asking now.',
    ],
    coins: 75,
  },
  {
    id: 'spore-mycelium',
    court: 'spore',
    name: 'Mycelium',
    foeName: 'Netkeeper Hypha',
    foeElement: 'electricity',
    difficulty: 4,
    gimmick: 'spore-mycelium',
    at: { x: 1780, y: 560 },
    look: { body: 0x1f3a33, accent: 0x6effd2, hat: 'goggles', traits: ['tool', 'lantern'], eye: 0x6effd2 },
    challenge: [
      'Every thread in this yard runs to the Prince. Tap a mushroom and he hears it. Tap it hard and so do you.',
      'I mend the net. Somebody whispers on a doorstep, the net carries it home. That is all I do. Mend.',
    ],
    beaten: [
      'You rang the net under my own feet. I felt it in my teeth. The Prince will have felt it too.',
      'I have been listening to this town for nine years and never once to what it was saying. Odd, that.',
    ],
    coins: 75,
  },
  {
    id: 'spore-wisps',
    court: 'spore',
    name: 'Will-o\'-Wisps',
    foeName: 'Wisper Fen',
    foeElement: 'soul',
    difficulty: 4,
    gimmick: 'spore-wisps',
    at: { x: 2150, y: 1180 },
    look: { body: 0xbfe4ff, accent: 0x34502a, hat: 'veil', traits: ['lantern', 'scarf'], eye: 0x4c7fb0 },
    challenge: [
      'Follow the lights. Everyone does, out here. The ground under a wisp is the only ground that holds.',
      'They are not marsh-gas, whatever the fishers say. They are lanterns. Somebody is still carrying them.',
    ],
    beaten: [
      'You stood under my lights and they came with you. They have never come with anyone but me.',
      'I think the wisps are the pruned, walking home. I have spent my life leading them the long way round.',
    ],
    coins: 75,
  },
  {
    id: 'spore-decomposition',
    court: 'spore',
    name: 'Decomposition',
    foeName: 'Rotmother Morel',
    foeElement: 'death',
    difficulty: 4,
    gimmick: 'spore-decomposition',
    at: { x: 700, y: 1385 },
    look: { body: 0x7a4c58, accent: 0x1d1712, hat: 'mushroom', traits: ['apron', 'cane', 'bandage'], size: 1.1, eye: 0xd5603f },
    challenge: [
      'Everything that falls in this town comes to my pits, dearie. Leaves. Logs. People. It all goes back.',
      'Every bruise you give me is a bed. Every bruise I give you is a seed. Let us see what comes up.',
    ],
    beaten: [
      'Oh, you walked round my fruit. Nobody walks round my fruit. They always come close for a look.',
      'Thirty years turning what the Prince sends down. I never asked who they were. The pits never tell.',
    ],
    coins: 75,
  },
];
