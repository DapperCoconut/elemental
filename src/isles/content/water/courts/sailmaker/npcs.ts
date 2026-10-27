import type { NpcDef, NpcLook, Talk } from '../../../../IslesTypes';
import { NPC, Q_BOAT, Q_BOLT, Q_COVE, Q_SHROUD, Q_YARD } from './quests';

/**
 * The people of the Sailmaker's Court. Every one of them owes the Yardage, knows somebody bound
 * to the bolt, and has an opinion about how Prince Hem holds his needle. Lines are keyed
 * most-specific first: Queen fallen → Prince fallen → their quest done / under way → default.
 */

const QUEEN = { monarch: 'maresa' } as const;
const PRINCE = { prince: 'hem' } as const;

export const SAILMAKER_NPCS: NpcDef[] = [
  {
    id: NPC.selvedge, name: 'Madam Selvedge', title: 'Haberdasher · Selvedge & Daughters',
    look: { body: 0xe8d8c8, accent: 0xa8324a, hat: 'veil', traits: ['glasses', 'apron'], size: 1.05 },
    at: { x: 1600, y: 768 },
    role: { kind: 'shop', id: 'sailmaker-shop' },
    talks: [
      { when: QUEEN, lines: [
        'The Queen\'s gone under her own tide, they say. Black crepe asked for twice; red ribbon, forty times.',
        'I know which I\'d rather sell. Browse, browse.',
      ] },
      { when: PRINCE, lines: [
        'His Highness came to me for every button he ever wore. Paid in ells, never in coin. Well.',
        'My daughters have cut his account book into bunting. It\'s strung over the Yardstick, if you\'d like to look.',
      ] },
      { when: { questDone: Q_YARD }, lines: [
        'The Warp girl\'s yard! I hear Ell wrote it down as paid. In ink. You can\'t take ink back.',
        'Now then — a charm for the hero of the hour? At full price, mind. Heroism is not a discount.',
      ] },
      { lines: [
        'Selvedge and Daughters. Thimbles, palms, ribbons, needles — and a few things the Measurers don\'t know about.',
        'Everything on these shelves is sewn to hold. That\'s more than I can say for the court.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Bunting! Who wants bunting?', 'No more ells. Yards, like decent people.'] },
      { lines: ['Mind the pins.', 'Measure twice, cut once. Pay never.', 'Ribbon! Gold, red, Queen\'s teal...'] },
    ],
  },

  {
    id: NPC.oakum, name: 'Loftmaster Oakum', title: 'Master Sailmaker · the Great Loft',
    look: { body: 0xc8a888, accent: 0x5a4a3a, hat: 'cap', traits: ['beard', 'pipe', 'apron'], size: 1.2 },
    at: { x: 1010, y: 808 },
    talks: [
      { when: QUEEN, lines: [
        'Fifty years I\'ve sewn sails on this cliff. First time I\'ve sewn one for a boat going where it likes.',
        'Tell Kell she\'s welcome to my loft floor. All of it. The Second Chance deserves a proper suit of sails.',
      ] },
      { when: { questDone: Q_SHROUD }, lines: [
        'Bight sent my palm back with a ribbon on it. First present I\'ve had since the navy.',
        'She sewed them right. I could tell from here. Some things you can tell.',
      ] },
      { when: PRINCE, lines: [
        'The Prince always said my seams were too generous. Sixty stitches to the foot, I said. He wanted seventy.',
        'Seventy stitches and the cloth tears along the holes. He never understood. Too fine is its own kind of weak.',
      ] },
      { when: { questDone: Q_YARD }, lines: [
        'A yard and a hand over, and Ell still came at you. That\'s the Yardage. It\'s never about the cloth.',
      ] },
      { when: { quest: Q_YARD, stage: 2 }, lines: ['A yard and a hand over. Take it to the Yardstick, and stand up straight when Ell measures it.'] },
      { when: { quest: Q_YARD, stage: 1 }, lines: ['The Warp girl\'s offcuts? Bring them here, then. I\'ve got the twine waxed.'] },
      { lines: [
        'This is the Great Loft. Every sail in the Queen\'s fleet gets laid out on my floor first.',
        'I lay them out. I cut them. And I sew every one of them knowing where it\'s going. That\'s my penance.',
        'Sixty stitches to the foot. Don\'t let anyone tell you seventy.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Sixty to the foot. As it should be.', 'Too fine is its own kind of weak.'] },
      { lines: ['Wax your twine, lad.', 'Number two duck. Lovely.', 'Who\'s been cutting against the grain?'] },
    ],
  },

  {
    id: NPC.linnet, name: 'Linnet Warp', title: 'Weaver\'s Daughter',
    look: { body: 0xf0d8c0, accent: 0x6a8aa8, hat: 'bandana', traits: ['satchel'], size: 0.74 },
    at: { x: 1362, y: 864 }, wander: 40,
    talks: [
      { when: QUEEN, lines: [
        'Mam says there won\'t be a Yardage tomorrow. Or the day after. Or ever. I asked her three times.',
        'Pip\'s been sewing anyway. He says he likes it when nobody counts.',
      ] },
      { when: PRINCE, lines: [
        'The Measurers took the ells off the Yardstick! Somebody\'s hung bunting on it instead.',
        'I measured Pip on it. He\'s nearly a yard tall. Mam says that makes him paid for.',
      ] },
      { when: { questDone: Q_YARD }, lines: [
        'Pip slept all night. He doesn\'t know he was nearly bound. I\'m never going to tell him.',
      ] },
      { when: { quest: Q_YARD, stage: 3 }, lines: ['Ell says it\'s short! He says ells! What\'s an ell? Don\'t let him take Pip!'] },
      { when: { quest: Q_YARD, stage: 2 }, lines: ['Is it a yard? Take it to the Yardstick, quick — before Bodkin calls the Yardage!'] },
      { when: { quest: Q_YARD }, lines: ['Offcuts along Loft Row! Big ones. Then Loftmaster Oakum can seam them. Please hurry.'] },
      { lines: [
        'Are you from the port? Do they make you sew there? Here you sew or you get bound.',
        'I can do a flat seam and a round seam. Pip can only do knots. Knots don\'t count.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Nearly a yard tall!', 'No more ells!'] },
      { when: { questDone: Q_YARD }, lines: ['PAID! It says PAID!'] },
      { lines: ['Three and a bit... three and a bit...', 'Don\'t tell the Measurers I\'m out.', 'Pip! PIP!'] },
    ],
  },

  {
    id: NPC.ludda, name: 'Ludda Breakshuttle', title: 'Former Weaver',
    look: { body: 0xb88a6a, accent: 0x3a2a2a, hat: 'hood', traits: ['scarf', 'bandage', 'tool'], size: 1.05 },
    at: { x: 2044, y: 606 },
    talks: [
      { when: QUEEN, lines: [
        'They\'re talking about running the great loom again. For us. For pay. Shuttle asked me to be foreman.',
        'I said I\'d think about it. I have. I\'m going to say yes, and then I\'m going to be terrible to her.',
      ] },
      { when: { questDone: Q_BOLT }, lines: [
        'Four families out. Gyve on his back. You don\'t know what that sound was like, those spindles snapping.',
        'There are a hundred more on the rack. I\'m counting them. I\'m patient now. I learned it on the loom.',
      ] },
      { when: PRINCE, lines: [
        'Hem\'s down. The indentures still stand, though — law\'s law, they say, even with nobody to enforce it.',
        'So I\'ll enforce something else. Come and see me if you want to break things.',
      ] },
      { when: { quest: Q_BOLT, stage: 3 }, lines: ['Gyve\'s coming. I can hear his keys. Stand your ground outside the Loom House.'] },
      { when: { quest: Q_BOLT, stage: 1 }, lines: ['The spindles are in the yard rack by the door. Four. Red-wound. Go!'] },
      { when: { quest: Q_BOLT }, lines: ['Shuttle\'s at the door. She\'ll fight you on her own loom. Don\'t stand on the weft.'] },
      { lines: [
        'Fourteen years on the great loom. Bound at nine for my father\'s yardage. I broke my own shuttle to get out.',
        'They call me Breakshuttle now. I answer to it. It\'s the best thing anybody ever called me.',
      ] },
    ],
    barks: [
      { when: { questDone: Q_BOLT }, lines: ['Ninety-six to go.', 'Snap.'] },
      { lines: ['Two hundred picks a minute...', 'Every thread in that place is somebody.', 'Don\'t look at the loom. It looks back.'] },
    ],
  },

  {
    id: NPC.purl, name: 'Granny Purl', title: 'Netmender · Lowstitch Jetty',
    look: { body: 0xd8c0a8, accent: 0x3a5a6a, hat: 'souwester', traits: ['rod', 'glasses'], size: 0.9 },
    at: { x: 425, y: 1312 },
    talks: [
      { when: QUEEN, lines: [
        'The tide went out this morning and didn\'t come back in. Not all the way. I could see Lowstitch\'s doorsteps.',
        'Forty houses. Wet through, every one. But they\'re ours again, and you can\'t tithe a doorstep.',
      ] },
      { when: { questDone: Q_COVE }, lines: [
        'The gar spine makes a lovely needle. I\'ve mended three nets with it already. Bass in every one.',
        'Fish when you like, dear. The cove\'s yours. Nobody else\'s, now that Sluice won\'t row in.',
      ] },
      { when: PRINCE, lines: [
        'Hem\'s gone and the skiff\'s stopped coming. Never thought I\'d see the cove without a tithe-boat in it.',
      ] },
      { when: { quest: Q_COVE, stage: 3 }, lines: ['That\'s Sluice beaching his skiff. Mind him, dear — he\'s wetter than he looks.'] },
      { when: { quest: Q_COVE }, lines: ['Three bass, one gar. Off the jetty end is best. Mind the chimney-pots.'] },
      { lines: [
        'That out there was Lowstitch. I was born in the third house from the jetty. You can see the chimney.',
        'Fish bite well round the roofs. They like a drowned house. Lots of places to hide.',
        'I\'ve a net to mend if you\'ve nothing to say. And a rod, if you have.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['No skiff today. Nor tomorrow.', 'Doorsteps! I can see doorsteps!'] },
      { lines: ['Over, under, knot...', 'Third house from the jetty.', 'Bass are running.'] },
    ],
  },

  {
    id: NPC.kell, name: 'Kell Treenail', title: 'Shipwright · the Royal Ways',
    look: { body: 0xc89a78, accent: 0x6a4a2a, hat: 'beanie', traits: ['tool', 'apron', 'beard'], size: 1.15 },
    at: { x: 1640, y: 1252 },
    talks: [
      { when: QUEEN, lines: [
        'The Queen\'s three hulls? Firewood. Well — two firewood, one a fishing smack. Kell Treenail\'s smack.',
        'The Second Chance sailed at dawn. Fourteen families. Came back at noon for more. Shall do all week.',
      ] },
      { when: { questDone: Q_BOAT }, lines: [
        'She\'s in the cove shed, rigged and waiting. You\'d not know she was there unless you knew. That\'s the trick.',
        'One more push. One prince less. Then she sails.',
      ] },
      { when: PRINCE, lines: [
        'Hem\'s down and the ways are quiet. Half my crew walked off. The other half are building the Second Chance.',
      ] },
      { when: { quest: Q_BOAT, stage: 3 }, lines: ['Snip\'s on the ways with his shears out. Keep him off her. She\'s only just dressed.'] },
      { when: { quest: Q_BOAT, stage: 1 }, lines: ['Deadeyes in hand? Good. Now that sail. Gale\'s up on Wind Bluff.'] },
      { when: { quest: Q_BOAT }, lines: ['Cracked deadeyes, four of them. The Measurers chuck them off the ways.'] },
      { lines: [
        'Three of the Queen\'s hulls on my ways. Tithe-ships, to collect from the outer reach. I build them slow.',
        'Very slow. A plank a day, if the weather\'s against me. The weather is always against me.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Plank a day. Maybe two now.', 'Treenails and tar.'] },
      { lines: ['Mind the shores, they\'re loose.', 'Measure the frames, not the men.', 'Weather\'s against me.'] },
    ],
  },

  {
    id: NPC.tam, name: 'Tops\'l Tam', title: 'Rigger\'s Boy',
    look: { body: 0xe8c8a0, accent: 0xc8323a, hat: 'bandana', traits: ['scarf'], size: 0.78 },
    at: { x: 2160, y: 432 }, wander: 50,
    talks: [
      { when: QUEEN, lines: [
        'I climbed the Queen\'s flag-mast and cut the teal off it! Kell says I\'m a pirate now. I\'m not. I\'m a rigger.',
      ] },
      { when: { questDone: Q_BOAT }, lines: [
        'I rigged the Second Chance! Every shroud! Snip didn\'t even get close.',
        'Kell says I can be her bosun. I don\'t know what a bosun does. I think it\'s shouting.',
      ] },
      { when: PRINCE, lines: [
        'With Hem gone the Measurers don\'t come up the yard any more. I can climb as high as I like!',
        'Highest I\'ve been is the top of the big rig on Wind Bluff. You can see Brinehollow. You can see the maelstrom.',
      ] },
      { when: { quest: Q_BOAT, stage: 3 }, lines: ['Snip\'s here! I\'ve got the sail half-bent — keep him busy!'] },
      { when: { quest: Q_BOAT, stage: 2 }, lines: ['Gale\'s sail? For the boat? Give it here, I can rig anything!'] },
      { lines: [
        'Want to see me go up the shrouds? I can do it in eleven seconds. Ten if nobody\'s watching.',
        'The riggers say if you fall off a mast you\'re bound to the bolt. I think they\'re joking. I don\'t fall.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Ten seconds!', 'I can see the maelstrom!'] },
      { lines: ['Up the ratlines!', 'Hand over hand...', 'Eleven seconds! Did you count?'] },
    ],
  },

  {
    id: NPC.bight, name: 'Widow Bight', title: 'Shroud-Sewer',
    look: { body: 0xc8c0b8, accent: 0x2a2a34, hat: 'veil', traits: ['satchel', 'book'], size: 0.95 },
    at: { x: 222, y: 1292 },
    talks: [
      { when: QUEEN, lines: [
        'The maelstrom\'s stilled. They say the drowned under it are waking — properly, not her way. Coming home.',
        'I\'ll have no shrouds to sew if they all come back. I find I don\'t mind at all.',
      ] },
      { when: { questDone: Q_SHROUD }, lines: [
        'They lie quiet now. Every one sewn nose and all. Oakum\'s palm did the work; I only held it.',
        'Thank you for standing by me. Most people won\'t stand on this beach after dark.',
      ] },
      { when: { quest: Q_SHROUD, stage: 2 }, lines: ['Stand with me. The last one\'s moving. Here it comes — don\'t let it pull me under.'] },
      { when: { quest: Q_SHROUD }, lines: ['Shroud ends along the sand. Five. And then Oakum\'s palm, if he\'ll part with it.'] },
      { when: PRINCE, lines: [
        'The Prince\'s men sewed the drowned without the last stitch. For his mother. She wanted them sleeping.',
        'Now he\'s gone, the shrouds are coming ashore. And they\'re not as still as they ought to be.',
        'I have work for someone with a strong stomach, if you\'ve one.',
      ] },
      { lines: [
        'My husband went down with the tithe-ship Bountiful. They never brought him up. The Queen keeps him.',
        'So I sew for other people\'s dead. Somebody ought to do it right.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Through the nose. Always through the nose.', 'They\'re stirring...'] },
      { lines: ['The tide gives back what it likes.', 'Hush now.', 'Twine, palm, needle.'] },
    ],
  },

  {
    id: NPC.bodkin, name: 'Measurer Bodkin', title: 'Keeper of the Yardstick',
    look: { body: 0xd8d0c0, accent: 0x2a8a88, hat: 'tophat', traits: ['cane', 'book'], size: 1.1 },
    at: { x: 1236, y: 762 },
    present: { not: PRINCE },
    talks: [
      { when: { questDone: Q_YARD }, lines: [
        'The Warp yard is entered as paid. I did not enter it. Ell did. I have entered a complaint about Ell.',
      ] },
      { when: { questDone: Q_BOLT }, lines: [
        'Four indentures snapped. Do you know what a snapped indenture is? Paperwork. Mountains of paperwork.',
      ] },
      { lines: [
        'A yard a head, a head a day, to the Yardstick by dusk. Shortfall is bound to the bolt. It is all very simple.',
        'The Prince measures in ells, of course. An ell is longer than a yard. That is also very simple.',
        'You are not on my ledger. That makes you either a visitor or a debt nobody has written down yet.',
      ] },
    ],
    barks: [
      { lines: ['Short. Short. Paid. Short.', 'The Yardage is called at dusk.', 'An ell, not a yard. Do keep up.'] },
    ],
  },
];

/** Townsfolk: weavers in aprons, riggers in sou\'westers, loft hands, Lowstitch's homeless. */
export const CROWD_LOOKS: NpcLook[] = [
  { body: 0xe8d0b8, accent: 0x6a8aa8, hat: 'bandana', traits: ['apron'] },
  { body: 0xc8a888, accent: 0x3a4a5a, hat: 'souwester', traits: ['scarf'] },
  { body: 0xd8c0a0, accent: 0xa8583a, hat: 'cap', traits: ['satchel'] },
  { body: 0xb89878, accent: 0x5a4a3a, hat: 'beanie', traits: ['tool'] },
  { body: 0xf0d8c8, accent: 0x9a3a5a, hat: 'hood', traits: ['apron'], size: 0.85 },
  { body: 0xc8b8a8, accent: 0x2a8a88, hat: 'none', traits: ['pack'] },
  { body: 0xa88868, accent: 0x4a3a2a, hat: 'straw', traits: ['beard'], size: 1.15 },
  { body: 0xe0c8b0, accent: 0x7a6a9a, hat: 'veil', traits: ['bandage'] },
];

export const CROWD_BARKS: Talk[] = [
  { when: QUEEN, lines: [
    'No Yardage today. Or ever!',
    'I sewed a sail for myself. Just to see what it\'s like.',
    'The tide went out and stayed out!',
    'The drowned are coming home, they say.',
    'Who\'s for a sail round the cove? Free!',
  ] },
  { when: PRINCE, lines: [
    'The Prince came apart at the seams, they say.',
    'Nobody called the Yardage at dusk. Nobody!',
    'Bunting on the Yardstick. Ha!',
    'My sister walked out of the Loom House today.',
    'Still the Queen, though. Still the tide.',
  ] },
  { lines: [
    'A yard a head, a head a day...',
    'Short again. Short again.',
    'Mind the Measurers.',
    'My cousin\'s bound to the bolt. Seven years.',
    'They sleep in the attics now, the Lowstitch lot.',
    'Wind\'s off the water.',
    'Sixty stitches to the foot. Seventy if he\'s watching.',
    'Another hull on the ways. Another tithe-ship.',
  ] },
];
