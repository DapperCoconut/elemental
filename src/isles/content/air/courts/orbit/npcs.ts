import type { AreaDef, NpcDef } from '../../../../IslesTypes';
import { POOL_AT, SHOP } from './layout';

/**
 * The people of the Orbit Court. They live on islets that swing round a black moon on chains,
 * and Prince Perigee keeps the Breath Tax by the chain: a household that falls behind has its
 * tether shortened a link, and the next time its islet comes round it passes nearer the moon.
 * Nearer the moon the air is heavier, the brass breath-meters read heavier, and the bill is
 * bigger — so a short chain only ever gets shorter. Those who cannot pay at all are becalmed and
 * hung in the Low Orbit on the moon's flank, asleep, like satellites. So people here count links
 * the way other towns count coins, look up at the moon when they are worried, and never say
 * "falling" out loud.
 */

const PRINCE_DOWN = { prince: 'perigee' } as const;
const KING_DOWN = { monarch: 'aerion' } as const;

export const ORBIT_NPCS: NpcDef[] = [
  {
    id: 'orbit-ottoline',
    name: 'Ottoline Brassbeam',
    title: 'Almanac-Maker',
    look: { body: 0xece0c4, accent: 0x2b3b6a, hat: 'plume', traits: ['glasses', 'book', 'apron'], eye: 0x4a62a3 },
    at: { x: SHOP.x, y: SHOP.y + 46 },
    role: { kind: 'shop', id: 'orbit-shop' },
    talks: [
      { when: KING_DOWN, lines: [
        'I have printed next year\'s almanac with no tax-days in it. The pages felt so empty I put in more jokes.',
        'People keep buying the charms just to have something brass that does not measure them. I understand entirely.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'The chains have stopped shortening. I have reprinted the perigee tables with nobody\'s name beside them.',
        'Buy something heavy. It is the first season in my life a heavy thing has not been a bad omen.',
      ] },
      { lines: [
        'The Brass Almanac. Tide-tables, perigee charts, and charms worked in the same brass as the orrery.',
        'Little planets, a tether link, a phial from the Moonpool, and an almanac that remembers your near passes.',
        'And I buy fish from the Moonpool. Gobies dry beautifully. Moonfish I eat, and do not tell the Assessors.',
      ] },
    ],
    barks: [
      { when: PRINCE_DOWN, lines: ['No names on the tables!', 'A heavy season. A GOOD heavy.'] },
      { lines: ['Perigee tables, fresh off the press.', 'Brass, brass, all of it brass.', 'Mind the next close pass.'] },
    ],
  },
  {
    id: 'orbit-hobb',
    name: 'Ferrule Hobb',
    title: 'Moonpool Angler',
    look: { body: 0x8a8494, accent: 0x2a6aa6, hat: 'souwester', traits: ['rod', 'pipe', 'beard'], size: 1.1, eye: 0xcaf0ff },
    at: { x: POOL_AT.x + 130, y: POOL_AT.y + 60 },
    talks: [
      { when: KING_DOWN, lines: [
        'The Moonpool has been calm as a saucer since the King went down. The moonfish swim wherever they like now.',
        'I took my meter off and threw it in. It sank straight through the ball and out the bottom. Splendid sight.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'With the Prince fallen the little moon runs a clean orbit. The moonfish point at it and nobody hides it.',
      ] },
      { when: { questDone: 'orbit-moonfish' }, lines: [
        'Selene\'s moon goes where the fish say now, not where the ledger wants. The Vanes\' windows are dark at night.',
        'Fish are honest. Water is honest. It is only the people holding the chains you have to watch.',
      ] },
      { lines: [
        'The Moonpool. A whole lake, held up in a ball by the moon. Cast UP into it — the line goes in sideways.',
        'Gobies round the outside, where the water is lazy. Moonfish in the middle, swimming toward the moon.',
        'Any rod will do. The water in a ball does not bite rods. It does not do much of anything except float.',
      ] },
    ],
    barks: [
      { lines: ['Cast up, lad. UP.', 'Bite\'s on the moon side.', 'There goes a goby, round and round.'] },
    ],
  },
  {
    id: 'orbit-agnes',
    name: 'Agnes Link',
    title: 'Chainwife',
    look: { body: 0x6c707e, accent: 0x7a5622, hat: 'bandana', traits: ['tool', 'apron', 'bandage'], size: 1.15, eye: 0xf0c766 },
    at: { x: 515, y: 650 },
    wander: 20,
    talks: [
      { when: KING_DOWN, lines: [
        'I have let every chain on the quay out to full length. The islets swing wide as dancers. Look at them go.',
        'My grandmother forged these links to keep us from falling. Not to make us fall slowly. It is right again.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'No more shortening orders. I keep checking the post for one. Then I remember, and I laugh at myself.',
      ] },
      { when: { questDone: 'orbit-short-chain' }, lines: [
        'The Orbels\' chain is back to full. Their islet swung out wide this morning and Pim screamed with joy.',
        'Shackle\'s cutters are in the bottom of the gulf. Bit by bit I will put a link back on every short chain here.',
      ] },
      { lines: [
        'I keep the tethers. Every islet in this court is chained to the moon, and every chain is mine to mend.',
        'Mending, mind — not shortening. The Bailiff does the shortening. One link per missed payment. Every time.',
        'A short chain brings your house round closer. Closer is heavier. Heavier is dearer. You see how it goes.',
      ] },
    ],
    barks: [
      { when: PRINCE_DOWN, lines: ['Full length! Full length!', 'Swing wide, my lovelies.'] },
      { lines: ['Forty links. Thirty-nine. Thirty-eight...', 'Hear that creak? That\'s a tired link.', 'Don\'t lean on the chain, pet.'] },
    ],
  },
  {
    id: 'orbit-pim',
    name: 'Pim Orbel',
    title: 'Pebble-Thrower',
    look: { body: 0xdc9364, accent: 0x4fa38e, hat: 'aviator', traits: ['satchel'], size: 0.72, eye: 0xf0c766 },
    at: { x: 1160, y: 1075 },
    wander: 30,
    talks: [
      { when: KING_DOWN, lines: [
        'Mum let her meter run out and NOTHING HAPPENED. She breathed all the way to the shop and back! Twice!',
      ] },
      { when: PRINCE_DOWN, lines: [
        'The Prince is gone and our house swings out so far I can see the Windlass sails! I threw a pebble at them.',
      ] },
      { when: { questDone: 'orbit-short-chain' }, lines: [
        'Our chain is LONG again! We swung out so wide this morning the moon looked as small as a marble!',
        'I am saving my best pebble for you. It went round the moon four times before it came back. That is a record.',
      ] },
      { lines: [
        'Watch — if you throw a pebble just right it goes round the moon and comes back. That is called an orbit.',
        'Our house swings closer every time. Mum breathes very small now so the meter won\'t tick. I breathe small too.',
        'Mister Shackle took three links off our chain. He keeps them in his pocket. They jingle when he walks.',
      ] },
    ],
    barks: [
      { lines: ['Watch this one go round!', 'Breathe small, breathe small...', 'Three links. THREE.'] },
    ],
  },
  {
    id: 'orbit-wick',
    name: 'Wick Escapement',
    title: 'Clockmaker\'s Apprentice',
    look: { body: 0xece0c4, accent: 0xb4683e, hat: 'cap', traits: ['tool', 'glasses', 'satchel'], size: 0.9, eye: 0x4fa38e },
    at: { x: 1110, y: 545 },
    wander: 18,
    talks: [
      { when: KING_DOWN, lines: [
        'We have stopped the Ledger Arm for good. Tycho wants to turn the Great Orrery into a carousel. I said yes.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'Every clock in town agrees with every other clock for the first time in my life. It is eerie. I love it.',
      ] },
      { when: { questDone: 'orbit-fast-clocks' }, lines: [
        'All the town clocks run true now. Bills fall due when they ought to — and nobody has to pay them yet!',
        'Master Tycho cried when I showed him the regulator pins. Then he made me do the mainspring again. Twice.',
      ] },
      { lines: [
        'I am Master Tycho\'s apprentice. I wind the orrery, oil the arms, and do NOT touch the Ledger Arm.',
        'The town clocks keep running fast. Ten minutes a day. Bills fall due on clock-time, so everybody is late.',
        'Somebody has been pulling the regulator pins out of them. I think I know who. He winds the clocks at night.',
      ] },
    ],
    barks: [
      { when: PRINCE_DOWN, lines: ['Tick. Tock. Correct!', 'Every clock agrees!'] },
      { lines: ['Oil the arms, oil the arms...', 'Ten minutes fast. Again.', 'Don\'t touch the Ledger Arm.'] },
    ],
  },
  {
    id: 'orbit-hollis',
    name: 'Hollis Vane',
    title: 'Wife of the Becalmed',
    look: { body: 0x958fa3, accent: 0x18213f, hat: 'nightcap', traits: ['scarf', 'lantern'], eye: 0xd8ceff },
    at: { x: 1470, y: 1020 },
    wander: 16,
    talks: [
      { when: KING_DOWN, lines: [
        'The bottles in the Lung broke and Tobin sat up and asked what was for breakfast. Twelve years. Breakfast.',
        'I made him eggs. He ate them breathing as loud as he liked, and I let him, and I cried on the toast.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'The Prince has fallen and the Low Orbit hangs empty. Tobin sleeps in his own bed, still barely breathing.',
        'They say his breath is corked in a bottle in the Lung. Then I will wait at the top of the island for it.',
      ] },
      { when: { questDone: 'orbit-low-orbit' }, lines: [
        'He is home. Asleep, and so light I could carry him myself — and I did, all the way down the Ring-Street.',
        'He breathes like a moth. But he breathes in our house, not on the side of the moon. That is enough for now.',
      ] },
      { lines: [
        'My Tobin was becalmed four winters ago. They corked his breath and hung him in the Low Orbit, on the moon.',
        'Look up at its flank. Little shapes, sleeping, turning slowly on their chains. One of those is my husband.',
        'They say the chains are clamped with a lodestone lock. Only the Lodewarden can open one. Or break one.',
      ] },
    ],
    barks: [
      { when: PRINCE_DOWN, lines: ['Sleep easy, love.', 'One more bottle to find.'] },
      { lines: ['Third from the left. That\'s him.', 'Turn, and turn, and turn...', 'I bring a lamp so he can see me.'] },
    ],
  },
  {
    id: 'orbit-quill',
    name: 'Quill Aphelion',
    title: 'Under-Archivist',
    look: { body: 0xc4b597, accent: 0x15121c, hat: 'tophat', traits: ['book', 'glasses', 'satchel'], size: 0.95, eye: 0x9d8be6 },
    at: { x: 1250, y: 1400 },
    talks: [
      { when: KING_DOWN, lines: [
        'I have started a new archive. The Archive of Things That Came Back. It is already bigger than the old one.',
      ] },
      { when: { questDone: 'orbit-perigee-ledger' }, lines: [
        'The Chain Ledger is open on the Ring-Street for anyone to read. People are adding links back with ink.',
        'Rime went north with a sled of ice and her own name crossed out. I hope she finds somewhere warm.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'The Prince has fallen, but the Chain Ledger is still down in the cold vault. Rime keeps it. She always has.',
      ] },
      { lines: [
        'I file what falls. Null catalogues it; I carry the drawers. Houses, mostly. Sometimes the people in them.',
        'There is a book under the Archive called the Chain Ledger. Every link ever shortened, and on whose word.',
        'If the town could read that ledger, it would know exactly who to blame. Which is why it is kept so cold.',
      ] },
    ],
    barks: [
      { when: PRINCE_DOWN, lines: ['Nothing to file today!', 'Unfiling. Unfiling.'] },
      { lines: ['Another drawer for the hole.', 'Filed under F. For Fell.', 'Shh. The archive is listening... no, that\'s Null.'] },
    ],
  },
  {
    id: 'orbit-plumbline',
    name: 'Assessor Plumbline',
    title: 'Breath-Weigher',
    look: { body: 0x45414e, accent: 0xd8423a, hat: 'tophat', traits: ['book', 'cane'], size: 1.2, eye: 0xff7a6a },
    at: { x: 1235, y: 560 },
    wander: 14,
    talks: [
      { when: KING_DOWN, lines: [
        'I have been told my services are no longer required. I have been told this by a child with a pebble. Hmph.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'I suppose the meters will read true now. Light. It feels like cheating. Breath ought to cost SOMETHING.',
        'I did always read them a little generous for the old folk. A needle\'s width. Tell people that, if you like.',
      ] },
      { lines: [
        'Breath weighs more near the moon. That is not policy. That is physics. Policy merely sends the bill.',
        'Your meter, please. Hm. You are breathing rather heavily. Have you been walking toward the Ring-Street?',
        'I do not shorten chains. I only weigh. The Bailiff shortens. The Prince decides. I simply read the needle.',
      ] },
    ],
    barks: [
      { when: PRINCE_DOWN, lines: ['Light reading. Very light.', 'Hmph.'] },
      { lines: ['Meter up, please.', 'Heavy breather. Heavy bill.', 'Do not breathe on the dial.'] },
    ],
  },
];

/** Islet folk on the streets, heads craned up at the moon: chain-hands, clock-winders, the short-chained. */
export const ORBIT_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 11,
  looks: [
    { body: 0xece0c4, accent: 0x2b3b6a, hat: 'aviator', traits: ['satchel'] },
    { body: 0x958fa3, accent: 0xc8963e, hat: 'cap', traits: ['tool'] },
    { body: 0xb4683e, accent: 0x45414e, hat: 'bandana', traits: ['pack'] },
    { body: 0x6f6a78, accent: 0x4fa38e, hat: 'plume', traits: ['book'] },
    { body: 0xc4b597, accent: 0x18213f, hat: 'nightcap', traits: ['lantern'] },
    { body: 0xdc9364, accent: 0xc8963e, hat: 'aviator', size: 0.75 },
    { body: 0x8a8494, accent: 0xd8423a, hat: 'tophat', traits: ['cane'] },
  ],
  paths: [
    [{ x: 60, y: 800 }, { x: 300, y: 800 }, { x: 640, y: 800 }, { x: 760, y: 800 }, { x: 980, y: 792 }, { x: 640, y: 800 }],
    [{ x: 1200, y: 140 }, { x: 1200, y: 300 }, { x: 1230, y: 590 }, { x: 1200, y: 300 }],
    // Round the Ring-Street.
    [{ x: 990, y: 810 }, { x: 1080, y: 662 }, { x: 1290, y: 600 }, { x: 1500, y: 662 }, { x: 1590, y: 810 }, { x: 1500, y: 958 }, { x: 1290, y: 1020 }, { x: 1080, y: 958 }],
    [{ x: 1590, y: 810 }, { x: 1500, y: 958 }, { x: 1290, y: 1020 }, { x: 1080, y: 958 }, { x: 990, y: 810 }, { x: 1080, y: 662 }, { x: 1290, y: 600 }, { x: 1500, y: 662 }],
    [{ x: 1560, y: 690 }, { x: 1760, y: 560 }, { x: 1980, y: 535 }, { x: 2190, y: 520 }, { x: 1980, y: 535 }],
    [{ x: 1580, y: 860 }, { x: 1880, y: 915 }, { x: 2190, y: 905 }, { x: 1880, y: 915 }],
    [{ x: 800, y: 1340 }, { x: 1100, y: 1360 }, { x: 1680, y: 1360 }, { x: 2190, y: 1360 }, { x: 1680, y: 1360 }],
    [{ x: 1100, y: 1110 }, { x: 1100, y: 1250 }, { x: 1100, y: 1360 }, { x: 1100, y: 1250 }],
    [{ x: 300, y: 800 }, { x: 360, y: 1080 }, { x: 420, y: 1330 }, { x: 360, y: 1080 }],
    [{ x: 300, y: 790 }, { x: 330, y: 580 }, { x: 300, y: 790 }],
  ],
  barks: [
    { when: KING_DOWN, lines: [
      'I breathed a whole lungful and the needle didn\'t move!', 'They\'re bringing the sleepers home from the Lung.',
      'Full chains, full lungs, full stop.', 'I\'m going to shout. Just to hear it. AAAH.',
    ] },
    { when: PRINCE_DOWN, lines: [
      'Our islet swung out last night. Wide. Lovely and wide.', 'No shortening today. No shortening EVER.',
      'Look at the Low Orbit. The chains are hanging empty.', 'I said "falling". Out loud. Nothing fell.',
    ] },
    { lines: [
      'How many links left on yours?', 'Breathe small, the meter\'s ticking.', 'Don\'t look at the moon too long.',
      'Perigee\'s Tuesday. Hold your breath Tuesday.', 'The Hendrys lost two links this month.', 'Heard a chain creak in the night.',
      'Couriers came by. Notices.', 'They hung old Mabb in the Low Orbit yesterday.',
    ] },
  ],
};
