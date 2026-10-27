import type { EncounterDef } from '../../../../IslesTypes';

/**
 * The five champions of the Abyssal Court, spread from the lamp-lit alleys to the trench and
 * the tidepriests' altar. Tier 4 — the hardest court on the Drowned Reach: difficulties 4, 4,
 * 4, 5, 5 and 80 coins apiece. Ids match the encounters the quests ask for.
 */
export const ABYSSAL_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'abyssal-lure',
    court: 'abyssal',
    name: 'The Lure',
    foeName: 'Angler Mox',
    foeElement: 'depths',
    difficulty: 4,
    gimmick: 'abyssal-lure',
    at: { x: 1420, y: 760 },
    look: { body: 0x3a3a4a, accent: 0x161a24, hand: 0xffcf5a, hat: 'hood', traits: ['lantern', 'mask'], size: 1.05, eye: 0xffe9a8 },
    challenge: [
      'You came down the alley because the light was on. Everyone does. That is what a light is for.',
      'Stand under it, if you like. You will hit like a hammer. Then the jaws close, and you will not.',
    ],
    beaten: [
      'You read the jaws better than I do. I have been fishing with that lure for twenty years.',
      'Go on, then. The prince keeps a bigger one. Do not stand under that one at all.',
    ],
    coins: 80,
  },
  {
    id: 'abyssal-crush',
    court: 'abyssal',
    name: 'Crush Depth',
    foeName: 'Diver Holloway',
    foeElement: 'pressure',
    difficulty: 4,
    gimmick: 'abyssal-crush',
    at: { x: 1640, y: 1290 },
    look: { body: 0x7a6a52, accent: 0xc39744, hand: 0x4a4038, hat: 'diving', traits: ['tool', 'pack'], size: 1.3, eye: 0xbfe8ff },
    challenge: [
      'Forty fathoms. Eighty. A hundred and twenty. I have been to every one of them and come back up.',
      'The deeper you go the harder you hit — and the harder the water hits back. My suit takes it. Does your skin?',
    ],
    beaten: [
      'You went down, hit me, and came up for air before you burst. That is all diving is.',
      'Nobody taught you that. You just felt your ears pop and listened. Good.',
    ],
    coins: 80,
  },
  {
    id: 'abyssal-whale-fall',
    court: 'abyssal',
    name: 'Whale Fall',
    foeName: 'Bonepicker Orla',
    foeElement: 'marrow',
    difficulty: 4,
    gimmick: 'abyssal-whale',
    at: { x: 640, y: 1330 },
    look: { body: 0xb8ac94, accent: 0x5a2a2a, hand: 0xe8dcc8, hat: 'bandana', traits: ['tool', 'satchel', 'bandage'], size: 0.95, eye: 0xff8a8a },
    challenge: [
      'Old Grey has been feeding this city for sixty years. Bones, oil, marrow. The prince wants the last of her.',
      'Hide in her ribs if you like — they will turn anything. But the hagfish live in there too, and they are always hungry.',
    ],
    beaten: [
      'You let my hagfish eat their fill of me. Rude. Clever. Mostly rude.',
      'Tell Coddle I am done picking. The ribs can stay where they are.',
    ],
    coins: 80,
  },
  {
    id: 'abyssal-glow',
    court: 'abyssal',
    name: 'Bioluminescence',
    foeName: 'Glowkeeper Siph',
    foeElement: 'light',
    difficulty: 5,
    gimmick: 'abyssal-glow',
    at: { x: 1980, y: 560 },
    look: { body: 0x4a8a9a, accent: 0x1c3a4a, hand: 0x3ff0d6, hat: 'veil', traits: ['scarf', 'lantern'], size: 1.0, eye: 0xdffaff },
    challenge: [
      'In the deep, light is a scream. Every flash says "here I am" to everything with teeth.',
      'Every blow you take will make you shine. The eels will hear it. Let us see who glows brightest.',
    ],
    beaten: [
      'You went dark when I lit up. The eels went for me. They always go for whoever is shouting loudest.',
      'The coral will dim for a while, I think. It is embarrassed for me.',
    ],
    coins: 80,
  },
  {
    id: 'abyssal-leviathan',
    court: 'abyssal',
    name: 'Leviathan\'s Shadow',
    foeName: 'Tidepriest Varn',
    foeElement: 'shadow',
    difficulty: 5,
    hpMult: 1.1,
    gimmick: 'abyssal-leviathan',
    at: { x: 1480, y: 400 },
    look: { body: 0x2a3440, accent: 0x0c1218, hand: 0x5a6a7a, hat: 'mitre', traits: ['book', 'scarf'], size: 1.15, eye: 0x9fe4ff },
    challenge: [
      'Look up. Through the skin of the bubble. Do you see it moving? That is the Leviathan, and it is passing over.',
      'It takes the ones who stand in its shadow when it rises. It always has. Tonight I will help it choose.',
    ],
    beaten: [
      'It took me. Spat me out by the coral like a bad oyster. The Leviathan has never once done that.',
      'Perhaps Ostrac was right. Perhaps it was never ours to preach.',
    ],
    coins: 80,
  },
];
