import type { AreaDef, Cond, NpcDef, NpcLook } from '../../../../IslesTypes';

/**
 * The people of the Ossuary Court. They are the Empress's gardeners of the dead: when a pruned
 * man or woman finally dies in the Glasshouse hedges, the body comes down here to be composted
 * into the Long Beds, and the bones the Prince does not keep are planted, carved or stacked. They
 * are a gentle, careful people doing a monstrous job, and every one of them has a name on the
 * Pruned's Wall. Blocks are listed most specific first: Empress fallen → Prince fallen → quest
 * done → quest underway → default.
 */

const EMPRESS: Cond = { monarch: 'verdigra' };
const PRINCE: Cond = { prince: 'sinew' };

export const OSSUARY_NPCS: NpcDef[] = [
  {
    id: 'ossuary-knell',
    name: 'Abelard Knell',
    title: 'Bone-Carver',
    look: { body: 0xd8c0a8, accent: 0x3a3440, hat: 'cap', traits: ['apron', 'glasses', 'tool'], size: 1.05 },
    at: { x: 430, y: 720 },
    role: { kind: 'shop', id: 'ossuary-shop' },
    talks: [
      { when: EMPRESS, lines: ['The Glasshouse is open, and they\'re walking home out of the hedges. Walking. Thin as rakes, but walking.', 'I\'m carving cradles now. Bone cradles. Somebody laughed at me for it. Then they ordered two.'] },
      { when: PRINCE, lines: ['No more bones coming down the hill. The Rood\'s cut. First week in nineteen years I\'ve had nothing to carve.', 'I made a whistle out of the last one. Wren plays it badly. It\'s the best sound in the court.'] },
      { when: { questDone: 'ossuary-ewan' }, lines: ['Nell Ashby came in with Ewan\'s ring on a string round her neck. Asked me to carve him a little bone bird.', 'I did it for nothing. Don\'t tell Wren, she does the accounts. Charms are on the bench.'] },
      { lines: ['Knell & Daughter. Spoons, pins, combs, dice and charms — all from bones nobody came to claim.', 'Every piece is somebody, so I make every piece well. That\'s the only rule my father taught me.'] },
    ],
    barks: [
      { when: EMPRESS, lines: ['Cradles! Bone cradles!', 'They\'re coming home.'] },
      { when: PRINCE, lines: ['Nothing to carve. Lovely.', '*a terrible whistle*'] },
      { lines: ['*scrape… scrape…*', 'Mind the shavings.', 'Every piece is somebody.'] },
    ],
  },
  {
    id: 'ossuary-nell',
    name: 'Nell Ashby',
    title: 'Widow of the Long Beds',
    look: { body: 0xe4ccb8, accent: 0x1a1418, hat: 'veil', traits: ['scarf', 'cane'], size: 0.95 },
    at: { x: 370, y: 925 },
    talks: [
      { when: EMPRESS, lines: ['They say the hedges are giving back the living. Ewan wasn\'t living, by the end. But they are, some.', 'I\'m going up the hill to meet them. Someone should be there who knows what it\'s like to wait.'] },
      { when: PRINCE, lines: ['The Prince sits in his chapel now and won\'t stand. Hollin says he cried. I\'d like to think so.'] },
      { when: { questDone: 'ossuary-ewan' }, lines: ['Ewan\'s ring. His pipe. That silly horn button off his coat.', 'They put him in bed nine and wrote "rendered". I\'ve written his name over it. In ink. It won\'t wash.'] },
      { when: { quest: 'ossuary-ewan' }, lines: ['The Registrar keeps the Book of the Rendered. He\'ll know which bed. Ask him gently — he isn\'t cruel, only careful.'] },
      { lines: ['My Ewan was pruned at the spring weighing. Three pounds short on the honey. Three pounds.', 'He died in the hedges in the summer, and they brought him down here, and put him in the beds without his name.'] },
    ],
    barks: [
      { when: { questDone: 'ossuary-ewan' }, lines: ['Ewan Ashby. In ink.', 'Bed nine. My bed now.'] },
      { lines: ['Three pounds. Three.', 'Spring weighing, always the spring.', 'Without his name.'] },
    ],
  },
  {
    id: 'ossuary-pallid',
    name: 'Registrar Pallid',
    title: 'Keeper of the Book of the Rendered',
    look: { body: 0xe8e0d4, accent: 0x3f9a80, hat: 'tophat', traits: ['book', 'glasses'], size: 1.0 },
    at: { x: 1000, y: 700 },
    talks: [
      { when: EMPRESS, lines: ['I am writing a new book. "The Book of the Returned." It has eleven names already and I have run out of ink twice.'] },
      { when: PRINCE, lines: ['The Book of the Rendered is closed. I have tied it shut with a ribbon. Black, for now.'] },
      { when: { questDone: 'ossuary-ewan' }, lines: ['I have entered Ewan Ashby in the Book. In the column, not the margin. My hand shook. It is very legible all the same.'] },
      { when: { quest: 'ossuary-ewan', stage: 1 }, lines: ['Bed nine, the Long Beds. Grubb turns that row. He doesn\'t care for visitors in his rows.'] },
      { when: { quest: 'ossuary-hymnbook' }, lines: ['The hymnbook? The Choirmaster signed it out of the chapel "for revision". I do not sign things out for revision.'] },
      { lines: ['Every body that comes down the hill is entered: date, weight, bed. Not the name. The Empress says names are untidy.', 'I keep the names anyway, in the margins, very small. Don\'t tell anyone. Please.'] },
    ],
    barks: [
      { when: PRINCE, lines: ['Closed. Ribboned.', 'Not another entry.'] },
      { lines: ['Date, weight, bed…', 'In the margins. Very small.', 'Ink, ink, always ink.'] },
    ],
  },
  {
    id: 'ossuary-lily',
    name: 'Lily Quill',
    title: 'Weeder of the Long Beds',
    look: { body: 0xf0d4c0, accent: 0xf7f5ee, hat: 'wreath', traits: ['satchel'], size: 0.74 },
    at: { x: 1640, y: 1320 },
    wander: 80,
    talks: [
      { when: EMPRESS, lines: ['My brother Tam is coming home! He was a hedge for two years and he\'s coming HOME.', 'I\'m going to give him all the lilies. Every one. He can have the beds.'] },
      { when: PRINCE, lines: ['Nobody\'s cutting my lilies any more. They\'re going to grow so tall.'] },
      { when: { questDone: 'ossuary-white-lilies' }, lines: ['The lilies are on the Wall under Tam\'s name, and Sternum said sorry. Sort of. He grunted.', 'Tam\'s not dead, you know. He\'s just a hedge. Hedges can stop being hedges. Can\'t they?'] },
      { when: { quest: 'ossuary-white-lilies' }, lines: ['Five lilies! The tallest ones. Not the ones by the shed, they\'re for the Prince.'] },
      { lines: ['I weed the Long Beds. The lilies grow best here because of… because of the beds.', 'My brother Tam is in the Glasshouse. Pruned. I put flowers on the Wall for him, and the Gardener cuts them. For tidiness.'] },
    ],
    barks: [
      { when: EMPRESS, lines: ['Tam! TAM!', 'All the lilies!'] },
      { lines: ['Weed, weed, lily, weed.', 'Hedges can stop being hedges.', 'Not those ones, they\'re the Prince\'s.'] },
    ],
  },
  {
    id: 'ossuary-brandt',
    name: 'Old Brandt Sallowell',
    title: 'Wellman of the Deep Well',
    look: { body: 0xb89a80, accent: 0x6a2228, hat: 'souwester', traits: ['beard', 'rod', 'pipe'], size: 1.15 },
    at: { x: 2060, y: 1060 },
    talks: [
      { when: EMPRESS, lines: ['The marrow\'s going clear. Like broth. I can see down six fathoms for the first time in my life.', 'There\'s a stair down there. Somebody built a stair. I\'m not going to look.'] },
      { when: PRINCE, lines: ['No warden on the well. I fish when I like. I fish at NIGHT. Nobody\'s ever fished at night.'] },
      { when: { questDone: 'ossuary-deep-well' }, lines: ['Sallow\'s leeches are off the windlass and the carp\'s back in the deep. Drop a line, if your rod can take it.', 'Whalebone or briarwood. Anything less and the marrow eats the line.'] },
      { when: { quest: 'ossuary-deep-well' }, lines: ['Lampreys first — they come up easy, they want the light. The carp\'s deep. Mind your arms.'] },
      { lines: ['The Deep Well. Marrow down to forever. Things live in it that have no business living.', 'Needs a whalebone rod or a briarwood one. The marrow\'s hot enough to soften anything softer.'] },
    ],
    barks: [
      { when: PRINCE, lines: ['Night fishing! Ha!', 'Clear as broth.'] },
      { lines: ['Steady… steady…', 'Mind the rim, it leans.', 'Lamprey. Always lamprey.'] },
    ],
  },
  {
    id: 'ossuary-wilfrida',
    name: 'Cantor Wilfrida',
    title: 'Voice of the Ossuary Chapel',
    look: { body: 0xe0c4b0, accent: 0x8a7aa8, hat: 'candle', traits: ['book'], size: 1.1 },
    at: { x: 800, y: 470 },
    talks: [
      { when: EMPRESS, lines: ['I\'m teaching the hymns to the ones coming home from the hedges. They hum. They\'ve forgotten words, but they hum.'] },
      { when: PRINCE, lines: ['We sang the whole book through last night. All of it, for every name. It took until dawn. My throat is gone. Worth it.'] },
      { when: { questDone: 'ossuary-hymnbook' }, lines: ['The Book of Lights, back on its lectern. Every name in its margins still there. Hushwell only tore three pages.', 'Come and hear us at vespers. We sing loud now. Loud is a kind of defiance.'] },
      { when: { quest: 'ossuary-hymnbook' }, lines: ['Tobiah at the Rattling Jaw sees everything that happens on the Lily Road. Ask him which way the Choirmaster went.'] },
      { lines: ['Every evening we sing the names of the rendered. The Empress forbids the names, so we sing them in the hymns, hidden.', 'Or we did. The Choirmaster has taken our hymnbook. He wants a court that sings nothing at all.'] },
    ],
    barks: [
      { when: PRINCE, lines: ['*hoarse humming*', 'Every name, till dawn.'] },
      { lines: ['La… la… lower.', 'The names are in the hymns.', 'Hush, he\'s listening.'] },
    ],
  },
  {
    id: 'ossuary-tobiah',
    name: 'Tobiah Rattle',
    title: 'Pot-Boy of the Rattling Jaw',
    look: { body: 0xf0d0b0, accent: 0x5a3a6a, hat: 'beanie', traits: ['apron'], size: 0.82 },
    at: { x: 520, y: 1150 },
    wander: 60,
    talks: [
      { when: EMPRESS, lines: ['Coccyx says the bones always knew the Empress would fall. He says that about everything AFTER.'] },
      { when: PRINCE, lines: ['Coccyx threw the bones for the Prince\'s fall and they came up "DEAD MAN\'S HAND". He\'s been unbearable.'] },
      { when: { questDone: 'ossuary-hymnbook' }, lines: ['The Choirmaster came in and ordered a drink and SANG. Badly. Coccyx gave him a free one to stop.'] },
      { when: { quest: 'ossuary-hymnbook', stage: 1 }, lines: ['Did you find the pages? They were blowing all down the road like moths.'] },
      { when: { quest: 'ossuary-hymnbook' }, lines: ['The Choirmaster? He went past with a book under his arm, tearing pages out and letting them blow. Toward the chapel, back up the road.'] },
      { lines: ['I collect the tankards and Coccyx collects the coin. He says that\'s fair because he\'s older.', 'Don\'t play knucklebones with him. Or do, I like watching people lose.'] },
    ],
    barks: [
      { lines: ['Tankards! Empties!', 'Don\'t play him.', 'He cheats. Hardly any.'] },
    ],
  },
  {
    id: 'ossuary-mattock',
    name: 'Sexton Hollin Mattock',
    title: 'Gravedigger to the Court',
    look: { body: 0xa88a70, accent: 0x2a2428, hat: 'hood', traits: ['tool', 'lantern', 'beard'], size: 1.25 },
    at: { x: 900, y: 660 },
    talks: [
      { when: EMPRESS, lines: ['I\'ve dug my last bed for the Glasshouse dead. Next hole I dig, I\'m planting an apple tree in it.'] },
      { when: PRINCE, lines: ['He\'s sitting on the chapel steps with his strings in his lap. Asked me how you sit properly. Nineteen years and he doesn\'t know how to sit.', 'I showed him. He did all right.'] },
      { when: { questDone: 'ossuary-unstrung' }, lines: ['Cut strings. Every one of the puppets has fallen down in the nave, all in a heap. Peaceful.', 'I\'ll bury them proper. With their names, if Pallid has them.'] },
      { when: { quest: 'ossuary-unstrung' }, lines: ['The strings come down off the Rood like ivy. Find where they\'re tied off, and cut them. Then him.'] },
      { lines: ['Dig, fill, plant. The beds take the bodies and the Prince takes the best bones.', 'He strings them, you know. Up in the nave. Makes them dance for his mother\'s festivals. I hear them at night, clicking.'] },
    ],
    barks: [
      { when: PRINCE, lines: ['Apple trees next.', 'Sit down, lad. Like that.'] },
      { lines: ['Dig, fill, plant.', '*click… click…* — hear that?', 'Bed eleven needs turning.'] },
    ],
  },
];

const MOURNER: NpcLook = { body: 0xe0c8b4, accent: 0x1a1418, hat: 'veil', traits: ['scarf'], size: 0.95 };
const GARDENER: NpcLook = { body: 0xc8a888, accent: 0x3c4632, hat: 'straw', traits: ['tool', 'apron'] };
const SEXTON: NpcLook = { body: 0xa89078, accent: 0x2a2428, hat: 'hood', traits: ['lantern'], size: 1.1 };
const ACOLYTE: NpcLook = { body: 0xe8d4c0, accent: 0x8a7aa8, hat: 'candle', traits: ['book'] };
const CHILD: NpcLook = { body: 0xf0d4c0, accent: 0xf7f5ee, hat: 'wreath', size: 0.72 };
const TITHER: NpcLook = { body: 0xd8ccbc, accent: 0x3f9a80, hat: 'tophat', traits: ['book', 'glasses'] };

export const OSSUARY_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 13,
  looks: [MOURNER, GARDENER, SEXTON, ACOLYTE, CHILD, TITHER, MOURNER, GARDENER],
  paths: [
    // The Lily Road through the town.
    [{ x: 160, y: 800 }, { x: 700, y: 800 }, { x: 1100, y: 810 }, { x: 500, y: 790 }],
    // Mourners to the Pruned's Wall and back.
    [{ x: 600, y: 790 }, { x: 640, y: 470 }, { x: 720, y: 470 }, { x: 620, y: 760 }],
    // Gardeners along the Long Beds.
    [{ x: 1560, y: 1220 }, { x: 2200, y: 1220 }, { x: 2200, y: 1480 }, { x: 1560, y: 1480 }],
    // Acolytes from the chapel to the keep.
    [{ x: 800, y: 520 }, { x: 1250, y: 560 }, { x: 1250, y: 820 }, { x: 900, y: 800 }],
    // Wellmen to the wells.
    [{ x: 1400, y: 820 }, { x: 1700, y: 830 }, { x: 1980, y: 900 }, { x: 1600, y: 860 }],
    // Down the Hunters' Lane and back.
    [{ x: 1200, y: 900 }, { x: 1200, y: 1500 }, { x: 1210, y: 1000 }],
  ],
  barks: [
    { when: EMPRESS, lines: ['They\'re coming down the hill alive!', 'The hedges are letting go.', 'Tam Quill walked home. WALKED.', 'No more beds. No more.'] },
    { when: PRINCE, lines: ['The Rood is cut.', 'The puppets fell in the night.', 'He sat down. The Prince sat down.', 'Nothing came down the hill today.'] },
    {
      lines: [
        'Autumn weighing next week. Weigh light, go down the hill.',
        'Another cart from the Glasshouse this morning.',
        'Bed fourteen, row three. Rendered.',
        'Say the names quietly.',
        'The Gardener cut the Wall flowers again.',
        'They say the hedges whisper at night.',
        'Keep the lilies white and your head down.',
        'Nothing goes to waste. Nothing.',
      ],
    },
  ],
};
