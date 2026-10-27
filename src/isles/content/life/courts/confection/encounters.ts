import type { EncounterDef } from '../../../../IslesTypes';

/**
 * The five champions of the Confection Court. Tier 2 of Thornwild: difficulties 3,3,3,3,4, 65
 * coins apiece. Each keeps a corner of the sugar town: Praline in the mill yard among the cube
 * stacks, Nougat on the verge of Treacle Road outside the Taffy Works, Snap beside the great
 * ovens, Butterscotch at her kettles on the bank of the Treacle Pool, and Peso under the piñata
 * gallows on the Fête Ground, where the Sweet-Tax is celebrated whether anyone likes it or not.
 */

export const ENC_SUGAR_RUSH = 'confection-sugar-rush';
export const ENC_TAFFY_PULL = 'confection-taffy-pull';
export const ENC_GINGERBREAD = 'confection-gingerbread';
export const ENC_CARAMEL = 'confection-caramel';
export const ENC_PINATA = 'confection-pinata';

export const CONFECTION_ENCOUNTERS: EncounterDef[] = [
  {
    id: ENC_SUGAR_RUSH, court: 'confection', name: 'Sugar Rush',
    foeName: 'Confectioner Praline', foeElement: 'gum', difficulty: 3, gimmick: 'confection-sugar-rush',
    at: { x: 760, y: 572 },
    look: { body: 0xf2d6b8, accent: 0xf27aa8, hat: 'chef', traits: ['apron', 'satchel'], size: 1.0, eye: 0xfff0a0 },
    challenge: [
      'Cubes! Cubes for the Sweet-Tax! Four hundredweight by Saturday and the mill\'s only turned out three!',
      'I haven\'t slept since Lammas. I don\'t need to. Have a cube. Have six. Go on — I DARE you.',
    ],
    beaten: [
      'I can\'t — feel — my teeth. Was that you or the crash? It\'s always the crash. It\'s always, always the crash.',
      'Take the cubes. I\'m going to lie down in the hopper for a week.',
    ],
    coins: 65,
  },
  {
    id: ENC_TAFFY_PULL, court: 'confection', name: 'Taffy Pull',
    foeName: 'Puller Nougat', foeElement: 'rubber', difficulty: 3, gimmick: 'confection-taffy-pull',
    at: { x: 1700, y: 884 },
    look: { body: 0xe8c8a8, accent: 0x6fd8b2, hat: 'cap', traits: ['apron', 'tool'], size: 1.3 },
    challenge: [
      'Two hundred pulls to a batch, stranger, and every pull goes back where it came from. Same as you will.',
      'The Prince likes his taffy springy. Walk into my strands and find out how springy.',
    ],
    beaten: [
      'Ha! Shot me down my own strand like a pea off a spoon. I taught it that. Thirty years, I taught it that.',
      'Go on through. Duck under the pink one. The pink one\'s got a temper.',
    ],
    coins: 65,
  },
  {
    id: ENC_GINGERBREAD, court: 'confection', name: 'Gingerbread',
    foeName: 'Baker Snap', foeElement: 'creation', difficulty: 3, gimmick: 'confection-gingerbread',
    at: { x: 1180, y: 1252 },
    look: { body: 0xd8a070, accent: 0xfdf8f2, hat: 'chef', traits: ['apron', 'beard'], size: 1.2 },
    challenge: [
      'The Prince wants a gingerbread army for the Empress\'s visit. Four thousand. Iced. Smiling.',
      'They come out of my oven hungry, and they run at whoever\'s closest. Stand by the oven door, why don\'t you.',
    ],
    beaten: [
      'You crumbled the whole batch. Do you know what that costs? Flour is tithed. Ginger is tithed. Smiles are TITHED.',
      'Fine. I\'ll bake some that frown. The Prince will never notice. He never looks at their faces.',
    ],
    coins: 65,
  },
  {
    id: ENC_CARAMEL, court: 'confection', name: 'Caramel',
    foeName: 'Cook Butterscotch', foeElement: 'fire', difficulty: 3, gimmick: 'confection-caramel',
    at: { x: 790, y: 1162 },
    look: { body: 0xe0b890, accent: 0xd8892a, hat: 'bandana', traits: ['apron', 'glasses'], size: 1.1 },
    challenge: [
      'Hot caramel is three hundred and forty degrees, pet. It doesn\'t burn you. It keeps you.',
      'I pour, it sets, I break it. Brittle for the palace. Mind where you stand when I bring the hammer down.',
    ],
    beaten: [
      'You let it set under me. Nobody does that. Everybody runs from the pour — nobody waits for the brittle.',
      'Here, have a shard. Salted. Don\'t tell the Weighmaster I\'ve been salting the palace\'s.',
    ],
    coins: 65,
  },
  {
    id: ENC_PINATA, court: 'confection', name: 'Piñata',
    foeName: 'Partyman Peso', foeElement: 'fortune', difficulty: 4, gimmick: 'confection-pinata',
    at: { x: 2060, y: 1300 },
    look: { body: 0xe8c890, accent: 0xe0283c, hat: 'tophat', traits: ['cane', 'pipe'], size: 1.15, eye: 0xffe070 },
    challenge: [
      'Roll up, roll up! Every Tithe-Day a piñata, and every piñata full of the Prince\'s own sweets!',
      'Whoever breaks it keeps what falls. That\'s fair, isn\'t it? I always break it. That\'s fairer.',
    ],
    beaten: [
      'You stole the last swing! Out of my hands! I\'ve been breaking that piñata since before you were born.',
      'Keep the sweets. They\'re the town\'s anyway. Everything in that donkey was weighed out of somebody\'s cupboard.',
    ],
    coins: 65,
  },
];
