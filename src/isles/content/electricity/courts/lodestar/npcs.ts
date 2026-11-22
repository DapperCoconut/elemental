import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Lodestar Court.
 *
 * Lodestar is the crag where every needle on Voltreach points, and its people are instrument-folk,
 * iron-folk and quarry-folk: compass-makers, smiths, the chainmen of the sky-quarry, fishers on
 * the aurora tarn, and the households of the Upper Row and Underhill cranking their Draw by hand.
 * The court's own trouble is the stone: it drags on every meter needle on the crag, so Lodestar
 * meters read low, and households here are switched off for current they did crank. Everyone
 * knows; the Meter-Reader writes down what the needle says. They talk in bearings and poles —
 * "drawn in" for favoured, "driven off" for switched off — the way the Prince taught them.
 */

const PRINCE = { prince: 'polar' } as const;
const EMPRESS = { monarch: 'ohmrine' } as const;

const Q_METER = 'lodestar-q-short-meter';
const Q_CHAR = 'lodestar-q-cold-light';
const Q_CHAINS = 'lodestar-q-keeper-chains';
const Q_COMB = 'lodestar-q-combed-true';
const Q_NORTH = 'lodestar-q-true-north';

export const LODESTAR_NPCS: NpcDef[] = [
  // ── Ottilie Cobalt — the shop ────────────────────────────────────────
  {
    id: 'lodestar-cobalt',
    name: 'Ottilie Cobalt',
    title: 'Compasses & Keepers',
    look: { body: 0xd8c0a8, accent: 0x3a6ee0, hat: 'goggles', traits: ['glasses', 'apron', 'tool'], size: 1, eye: 0xc89a42 },
    at: { x: 900, y: 748 },
    role: { kind: 'shop', id: 'lodestar-shop' },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'The Grid\'s cut. Every compass on my stall swung a hair west this morning. The Coil was pulling on them too.',
          'Forty years I\'ve sold needles that lied a little. Now they only lie about the stone. Buy something.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness came down the Needle Road on foot and bought a compass. From me. He paid.',
          'He asked which way it pointed. I said, at the stone, dear. He said, not at me? He seemed glad.',
        ],
      },
      {
        when: { questDone: Q_METER },
        lines: [
          'Ada\'s meter reads true in its sleeve. So would every meter on the crag, if anyone wanted them true.',
          'I\'ve had nine orders for shrouds since. Nine! I\'m cutting soft iron in my sleep.',
        ],
      },
      {
        lines: [
          'Compasses and keepers. Every needle on my stall points the same way: up the road, at the stone.',
          'The stone pulls on everything iron. Nails, needles — and the needle in every Draw meter on the crag.',
          'So Lodestar meters read short, and Lodestar households get switched off for current they cranked.',
          'Charms are on the top hook. You can wear three. They\'re magnets, mostly. They\'ll pull for you.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Compasses! True as they come!', 'His Highness shops here now. Fancy that.'] },
      {
        lines: [
          'Needles, cases, keepers!', 'Every one points at the stone, madam.', 'Soft iron, hard iron.',
          'Charms on the top hook.',
        ],
      },
    ],
  },

  // ── Ada Lodestrom — two chalk marks on her door ──────────────────────
  {
    id: 'lodestar-ada',
    name: 'Ada Lodestrom',
    title: 'Underhill, Two Marks',
    look: { body: 0xd8c4b0, accent: 0x5a5e68, hat: 'hood', traits: ['cane', 'scarf'], size: 0.88 },
    at: { x: 570, y: 1292 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I washed the chalk off my door this morning. Both marks. Took three buckets. I\'d have used ten.',
          'My crank\'s going on the fire. Well. On the stove. On the — never mind. It\'s going somewhere hot.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Meter-Reader came round and read every meter with a sleeve on it. Nobody\'s short this week. Nobody.',
          'They say the Prince sits out on his steps now, looking at the road instead of the sky.',
        ],
      },
      {
        when: { questDone: Q_CHAR },
        lines: [
          'The char glows on my sill like a little piece of sky. The Grid can\'t meter it. It can\'t switch it off.',
          'The children from the Row come and sit in the window to read. In my house! It\'s been years.',
        ],
      },
      {
        when: { questDone: Q_METER },
        lines: [
          'My meter read full last night. Full! Same cranking as always. It was the stone all along.',
          'Hask stood at my door and stared at the dial a long while. Then he chalked nothing. Nothing!',
        ],
      },
      {
        when: { quest: Q_METER },
        lines: [
          'Ottilie at the compass stall knows needles better than anyone. Ask her what\'s wrong with mine.',
          'And hurry, love. The Brownout Bell rings at dusk, and Hask reads at the Bell.',
        ],
      },
      {
        lines: [
          'Two marks on my door. Switched off twice. Third time, they take you up the Coil. Earthed, they call it.',
          'I crank, love. Every night, till my shoulder screams. Then Hask reads my meter and it says I\'m short.',
          'Everybody in Underhill reads short. Everybody up the Row too. It\'s the stone, I tell him. He chalks.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_METER }, lines: ['Read full! Full!', 'It was the stone all along.'] },
      { lines: ['Crank, crank, crank.', 'Two marks. Two.', 'My shoulder, oh, my shoulder.', 'Dusk soon.'] },
    ],
  },

  // ── Hollin Bray — the tarn fisher ────────────────────────────────────
  {
    id: 'lodestar-hollin',
    name: 'Hollin Bray',
    title: 'Fisher on the Tarn',
    look: { body: 0xc8b49c, accent: 0x2a5a5a, hat: 'souwester', traits: ['rod', 'pipe', 'beard'], size: 1.1 },
    at: { x: 1700, y: 1052 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'Every char in the tarn is mine to catch now, and yours, and anyone\'s. They glow the same either way.',
          'I gave the Observatory\'s lens-folk a char of their own. Told them to put it on a windowsill. Not in a book.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Observatory sent word: char are the fisher\'s now. All of them. The Prince wrote it himself, they say.',
          'Badly, they say. Big letters. Like a lad who\'s never had to write a kind thing before.',
        ],
      },
      {
        when: { questDone: Q_CHAR },
        lines: [
          'Ada\'s window\'s lit and the Grid can\'t touch it. Best fish I ever caught, and I never ate it.',
          'Glint\'s still sore. Let her be sore. She\'s got all the stars in the sky to read.',
        ],
      },
      {
        when: { quest: Q_CHAR },
        lines: [
          'Char come up green under the aurora. You\'ll need a sky-rod for this water — the line wants to float.',
          'Two of them, mind. One for each of Ada\'s windows.',
        ],
      },
      {
        lines: [
          'Loach and pike are mine to sell. Char belong to the Observatory. They read the sky in the char\'s scales.',
          'A char\'s oil glows a week in a jar, cold, no flame. A light no meter in the world can read.',
          'Think on that, up here, where half the doors have chalk on them.',
        ],
      },
    ],
    barks: [
      { lines: ['Bite, you beauty.', 'Pike\'s pointing at the stone again.', 'Cold water. Coldest on the isle.'] },
    ],
  },

  // ── Odd Gaussen — the chainman ───────────────────────────────────────
  {
    id: 'lodestar-gaussen',
    name: 'Odd Gaussen',
    title: 'Chainman of the Sky-Quarry',
    look: { body: 0xb49c84, accent: 0x34363c, hat: 'helmet', traits: ['tool', 'beard', 'satchel'], size: 1.25 },
    at: { x: 1880, y: 1470 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'We\'re bringing the stones down. All of them. Slow, on the winch, one a day. The sky\'s going back up.',
          'First one we lowered, the whole of Underhill came out to watch. Cheered a rock. I nearly wept.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came down to the quarry and asked how a keeper chain works. I showed him. He held one a while.',
          '"It holds it near," he says, "but not against." I said aye, that\'s the trick of it. He went very quiet.',
        ],
      },
      {
        when: { questDone: Q_CHAINS },
        lines: [
          'Every chain over Underhill pinned and tight. I checked them twice this morning and once for luck.',
          'Plumb\'s keeping out of my quarry. Good. A man who loosens chains over children isn\'t a chainman.',
        ],
      },
      {
        when: { quest: Q_CHAINS },
        lines: [
          'The pins go through the staple at the foot of each chain. Three boulders over Underhill. Three pins.',
          'Don\'t look up while you do it. Nobody can, the first time.',
        ],
      },
      {
        lines: [
          'We cut stone off the crag and float it on the field. Iron in it, see. The stone holds it up.',
          'The keeper chain holds it down. Near, not against. Pull the pin and it drifts, and drifting stone falls.',
          'The Foreman floats the cut over Underhill. Saves the walk, he says. Over the houses, I say.',
        ],
      },
    ],
    barks: [
      { lines: ['Mind the chains!', 'Keep from under, keep from under.', 'Near, not against.', 'Heave — hold — pin.'] },
    ],
  },

  // ── Nell Combe — the filing-comber ───────────────────────────────────
  {
    id: 'lodestar-nell',
    name: 'Nell Combe',
    title: 'Filing-Comber',
    look: { body: 0xe0c8b0, accent: 0x6a7080, hat: 'beanie', traits: ['tool'], size: 0.74, eye: 0x8ab4ff },
    at: { x: 760, y: 905 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I\'m combing a picture in the Bellyard. It\'s a lamp. With a flame on. In filings! Nobody can stop me!',
          'Wren Filament came and looked at it and said it was the best lamp she\'d seen in twenty years.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince threw out the old field map. Ferrite says he\'s drawing a new one himself. From the ground.',
          'He asked ME which way the lines run in the Bellyard! I showed him. I was very professional.',
        ],
      },
      {
        when: { questDone: Q_COMB },
        lines: [
          'The lines are true and Ferrite can\'t say they aren\'t. You stood on every one and never slipped.',
          'Ma\'s not going up the Coil. Ma\'s at home. I combed a little heart in the yard by our door.',
        ],
      },
      {
        when: { quest: Q_COMB },
        lines: [
          'Comb with the field, not against it. You\'ll feel it in the comb — it wants to go one way.',
          'Four yards. Then he has to look. He has to.',
        ],
      },
      {
        lines: [
          'I comb the filings into the field lines, for the Prince\'s map. Every yard, every morning.',
          'Smith Ferrite says my lines don\'t match the map. He says that\'s a short on our household\'s Draw.',
          'But I comb them the way they go! The map\'s old. The field moves. Nobody listens to a comber.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_COMB }, lines: ['True lines!', 'Ma\'s home!'] },
      { lines: ['With the field, not against.', 'Mind my lines!', 'Comb, comb, comb.', 'The map\'s wrong.'] },
    ],
  },

  // ── Astrid Vane — the Observatory's steward ──────────────────────────
  {
    id: 'lodestar-astrid',
    name: 'Astrid Vane',
    title: 'Steward of the Observatory',
    look: { body: 0xe4d4c4, accent: 0x58c8d8, hat: 'tophat', traits: ['book', 'glasses'], size: 1, eye: 0x4af0a0 },
    at: { x: 1870, y: 432 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'The Coil is dark. For the first time in my life I can see stars low over the summit. Little ones.',
          'His Highness is out on the steps with a chart, naming them. After people, he says. After households.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He left the telescope pointed at the ground. On purpose. He says he wants to see what\'s near for once.',
          'The Observatory\'s doors are open at night now. People come in and look. He shows them. Badly. Kindly.',
        ],
      },
      {
        when: { quest: Q_NORTH },
        lines: [
          'Ottilie made his first compass. Ask her about it. Then stand by the stone, the way he used to.',
          'Then come to the doors. I\'ll have the dome open. He fights better under the sky. Worse, for you.',
        ],
      },
      {
        when: { courtReady: 'lodestar' },
        lines: [
          'All five. His Highness watched every fight through the telescope. He has never turned it to the ground.',
        ],
      },
      {
        lines: [
          'The Polar Observatory. His Highness reads the sky here every night, and the Draw of the crag by day.',
          'He reads it the same way: who points to him and who points away. Drawn in, driven off. Nothing else.',
          'Beat the court\'s five champions and he\'ll see you. He sees everything, from up there. Nothing near.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Doors open tonight!', 'Mind the steps — he\'s sitting on them.'] },
      { lines: ['Clear skies.', 'The aurora is green tonight.', 'His Highness is not receiving.'] },
    ],
  },

  // ── Tamsin Crank — cranks for hire ───────────────────────────────────
  {
    id: 'lodestar-tamsin',
    name: 'Tamsin Crank',
    title: 'Cranks for Hire',
    look: { body: 0xd4b498, accent: 0xd07a3a, hat: 'cap', traits: ['bandage', 'pack'], size: 0.95 },
    at: { x: 540, y: 738 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'No Draw. No Draw! I don\'t know what to do with my arms. I keep turning things. Door handles. Spoons.',
          'I\'m going to learn the fiddle. Wren says that\'s mostly arms. Turning arms, even.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Nobody\'s hiring me this week. Meters read true in their sleeves. Nobody\'s short. Best week of my life.',
        ],
      },
      {
        lines: [
          'I crank other people\'s quota, when they can\'t. Old folk. Bad backs. Two loaves an hour.',
          'Doesn\'t help, mostly. The stone eats the reading. I crank all night and the needle says I didn\'t.',
          'Bandages are from the handle. You get a groove in your palm. Everybody on the Row has the groove.',
        ],
      },
    ],
    barks: [
      { lines: ['Two loaves an hour!', 'Crank for hire!', 'Round and round.', 'My palm\'s got a groove in it.'] },
    ],
  },

  // ── Old Fennick — ringer of the Brownout Bell ────────────────────────
  {
    id: 'lodestar-fennick',
    name: 'Old Fennick',
    title: 'Ringer of the Brownout Bell',
    look: { body: 0xc4b4a4, accent: 0xd07a3a, hat: 'antenna', traits: ['cane', 'beard'], size: 0.95 },
    at: { x: 950, y: 645 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I rang it one last time last night. Long and slow. Then I took the striker off and threw it in the tarn.',
          'Wren Filament lit the lamp on the Bellyard with a match. A MATCH. I held the ladder. I\'m eighty-one.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince says the Bell\'s to ring softer. Softer! As if it\'s the noise that hurts.',
          'Still. I ring it softer. You do what you can with a bell.',
        ],
      },
      {
        lines: [
          'The Brownout Bell. I ring it at dusk and the Grid draws every meter on the crag down the wires.',
          'Then Hask reads the needles and chalks the doors. Short is switched off. Three times short, earthed.',
          'Forty-one years I\'ve rung it. I wear wax in my ears. Not for the noise.',
        ],
      },
    ],
    barks: [
      { lines: ['Dusk soon.', 'Mind the Bell.', 'Forty-one years.', 'Wax in my ears, wax in my ears.'] },
    ],
  },
];

const looks: NpcLook[] = [
  { body: 0xc8b4a0, accent: 0x5a5e68, hat: 'cap', traits: ['tool'] },
  { body: 0xd8c4b0, accent: 0xe0383a, hat: 'hood', traits: ['scarf'] },
  { body: 0xb49c84, accent: 0x3a6ee0, hat: 'helmet', traits: ['tool', 'beard'], size: 1.15 },
  { body: 0xe0ccb8, accent: 0xc89a42, hat: 'beanie', traits: ['satchel'], size: 0.78 },
  { body: 0xc0a890, accent: 0xd07a3a, hat: 'none', traits: ['bandage', 'apron'] },
  { body: 0xd4c0ac, accent: 0x58c8d8, hat: 'goggles', traits: ['glasses', 'book'] },
  { body: 0xbca48c, accent: 0x34363c, hat: 'miner', traits: ['pack'] },
  { body: 0xdcc8b4, accent: 0x4af0a0, hat: 'antenna', traits: ['scarf'], size: 0.9 },
];

const barks: Talk[] = [
  {
    when: EMPRESS,
    lines: [
      'The Coil\'s dark!',
      'No Bell tonight. No Bell ever.',
      'Wash the chalk off, everybody!',
      'The earthed are coming down the Coil!',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince yielded!',
      'Meters in sleeves, read true!',
      'He\'s sitting on the Observatory steps.',
      'Nobody chalked this week.',
    ],
  },
  {
    when: { courtReady: 'lodestar' },
    lines: [
      'The stranger\'s beaten all five.',
      'They say the Prince turned his telescope round to watch.',
    ],
  },
  {
    lines: [
      'Read short again.',
      'Mind the chains overhead.',
      'Two marks on the Thistles\' door.',
      'Dusk soon. Crank faster.',
      'It\'s the stone. It\'s always the stone.',
      'Drawn in or driven off.',
      'The aurora\'s violet tonight.',
      'Keep from under.',
    ],
  },
];

export const LODESTAR_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // Up and down the Needle Road.
    [{ x: 120, y: 810 }, { x: 640, y: 810 }, { x: 960, y: 820 }, { x: 640, y: 810 }],
    // Round the stone on the ring road.
    [{ x: 970, y: 800 }, { x: 1300, y: 1040 }, { x: 1630, y: 800 }, { x: 1300, y: 560 }],
    [{ x: 1630, y: 800 }, { x: 1300, y: 1040 }, { x: 970, y: 800 }, { x: 1300, y: 560 }],
    // Down the Halflife road to the rose and back.
    [{ x: 1260, y: 1050 }, { x: 1220, y: 1330 }, { x: 1200, y: 1540 }, { x: 1220, y: 1330 }],
    // Through Underhill.
    [{ x: 1220, y: 1330 }, { x: 700, y: 1340 }, { x: 260, y: 1320 }, { x: 700, y: 1340 }],
    // Up the rise to the Observatory.
    [{ x: 1530, y: 620 }, { x: 1700, y: 650 }, { x: 1860, y: 470 }, { x: 1700, y: 650 }],
    // Along the tarn's north shore to the platform.
    [{ x: 1630, y: 800 }, { x: 1600, y: 900 }, { x: 2050, y: 920 }, { x: 1600, y: 900 }],
  ],
  barks,
};
