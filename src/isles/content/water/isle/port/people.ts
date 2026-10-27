import type { Cond, NpcDef, NpcLook, Pt, Talk } from '../../../../IslesTypes';

/**
 * The people of Brinehollow — the half-sunk harbour every voyage to the Drowned Reach lands at.
 *
 * Twice a day the Queen lets the sea into the low streets, and twice a day Brinehollow pays a
 * coin a head to have its floors given back. The town lives by the tide clock on the plaza and
 * talks about little else: who paid, who is short, whose house went under last month. Its people
 * are damp, practical and very funny about it, because the alternative is not being funny.
 *
 * Dialogue blocks are listed most specific first: Queen down → a prince down → their quest done →
 * default. Two people only come home once the Queen falls: the drowned do not stay drowned.
 */

const QUEEN: Cond = { monarch: 'maresa' };
const princes = (count: number): Cond => ({ princesOfIsle: 'water', count });

// ── Positions (shared with the area's POIs and quests) ──────────────

export const AT = {
  dock: { x: 1420, y: 1205 },
  store: { x: 860, y: 686 },
  tackle: { x: 1900, y: 1148 },
  baker: { x: 2080, y: 688 },
  reeve: { x: 1590, y: 702 },
  ferry: { x: 690, y: 842 },
  keeper: { x: 2330, y: 1292 },
  creel: { x: 1080, y: 1142 },
  pip: { x: 1420, y: 880 },
  dunnage: { x: 380, y: 692 },
  kelp: { x: 520, y: 1028 },
  saltwife: { x: 2390, y: 1090 },
  tilly: { x: 1236, y: 1136 },
  aldous: { x: 752, y: 846 },
} satisfies Record<string, Pt>;

export const BRINEHOLLOW_NPCS: NpcDef[] = [
  // ── Dockmistress / boatwright ─────────────────────────────────────
  {
    id: 'brinehollow-dock', name: 'Hesper Gullwing', title: 'Dockmistress & Boatwright', at: AT.dock,
    role: { kind: 'dock', id: 'brinehollow-dock' },
    look: { body: 0xa8846a, accent: 0x2a5a6a, hat: 'souwester', traits: ['tool', 'pipe', 'apron'], size: 1.15 },
    talks: [
      {
        when: QUEEN,
        lines: [
          'Low water at noon and nobody came to collect for it. I stood on the pier with my coin out like a fool.',
          'Then I put it in my pocket. Then I bought a round with it. Best coin I ever spent.',
          'Need a hull for the next isle? Take your pick. No tithe-stamp on the transom. First ones I ever built.',
        ],
      },
      {
        when: { prince: 'hem' },
        lines: [
          'Sailmaker\'s Court is selling canvas to us again now Hem is down. Every bolt used to go to her fleet.',
          'The Queen was sewing herself a navy. Half-sewn, they say. Let it stay half.',
        ],
      },
      {
        when: { questDone: 'brinehollow-dry-tithe' },
        lines: [
          'Holdfast is still nursing his anchor-arm, I hear. Walks the long way round the low quarter now.',
          'You are in the ledger as "one head, foreign". That makes you one of us. Commiserations.',
        ],
      },
      {
        lines: [
          'Mind the gap in the third plank. — There. Welcome to Brinehollow. You picked tithe-day. Everyone does.',
          'Twice a day the Queen lets the sea in. Twice a day you pay a coin a head to get your floor back.',
          'You are standing on the only bit of this town that never floods. I would stay on it a while.',
        ],
      },
    ],
    barks: [
      { when: QUEEN, lines: ['No stamp on the transom! None!', 'Free hulls! Well — not free. Fairly priced.'] },
      { lines: ['Caulk the seam, mind the tide.', 'Noon tide\'s a big one. Get your boats up.', 'Third plank. Every time.'] },
    ],
  },

  // ── General store ─────────────────────────────────────────────────
  {
    id: 'brinehollow-store', name: 'Pernille Barnacle', title: 'Barnacle & Daughters', at: AT.store,
    role: { kind: 'shop', id: 'brinehollow-store' },
    look: { body: 0xc8a08a, accent: 0x5a3a5a, hat: 'none', traits: ['glasses', 'apron', 'satchel'] },
    talks: [
      {
        when: QUEEN,
        lines: [
          'My daughters want to repaint the sign. "Barnacle & Daughters, Never Flooded Again." Optimistic.',
          'I told them we will paint it when the tide has stayed out a year. They are painting it anyway.',
        ],
      },
      {
        when: { prince: 'crude' },
        lines: [
          'Lamp oil from Slickharbor is half what it was. Crude used to tithe every barrel twice.',
          'I have restocked the Tidemark Chalk. People want to measure how far the water is NOT coming.',
        ],
      },
      {
        when: { questDone: 'brinehollow-another-mouth' },
        lines: [
          'The Dunnage baby has a name and no ledger line. Brother Kelp wrote her in the sea-book. Clever old weed.',
          'Hob came in and paid off his slate in herring. I do not want herring. I took the herring.',
        ],
      },
      {
        lines: [
          'Barnacle & Daughters. Charms, chalk, rope, and the only dry flour on the seafront.',
          'Every charm here does a trick. Barnacles that grow while you are left alone, a pearl that grows from grit.',
          'Equip three — TAB, then pick. And mind the step, it is slick. Everything is slick. It is Brinehollow.',
        ],
      },
    ],
    barks: [
      { when: QUEEN, lines: ['Never Flooded Again! ...Probably!'] },
      { lines: ['Dry flour! Dry flour while it lasts!', 'Chalk for your tide marks! Rope for your rafters!'] },
    ],
  },

  // ── Tackle shop ───────────────────────────────────────────────────
  {
    id: 'brinehollow-tackle', name: 'Jory Gullet', title: 'The Gaff & Gullet', at: AT.tackle,
    role: { kind: 'tackle', id: 'brinehollow-tackle' },
    look: { body: 0x9a7a62, accent: 0x3a4a3a, hat: 'souwester', traits: ['rod', 'beard', 'pipe'], size: 1.05 },
    talks: [
      {
        when: QUEEN,
        lines: [
          'You know what came up in my nets this morning? A pearl queenfish. Not a tithe-boat in sight to claim it.',
          'I put her back. She looked at me like she knew. They are all a bit like that, queenfish.',
        ],
      },
      {
        when: { prince: 'lanternjaw' },
        lines: [
          'Lanternjaw is down and the trench is open for fishing. Proper fishing. Things with lights on their heads.',
          'You will want the whalebone rod for the trench. Iron crushes down there. Bone bends.',
        ],
      },
      {
        when: { questDone: 'brinehollow-herring-run' },
        lines: [
          'Skerritt\'s eel-cage is on my porch. He left it. I am keeping it as a planter.',
          'Herring are running off the fishing pier all week. Go on. I will buy every one.',
        ],
      },
      {
        lines: [
          'The Gaff & Gullet. Rods, lines, charms that smell of bait. Whalebone rod above the door, if you are rich.',
          'Driftwood for the shallows. Iron for slick and ice and ink. Whalebone for everything, even the trench.',
          'Off the fishing pier for herring and cod. Off the end, at night, for things you will tell stories about.',
          'And I buy fish. Cheap. I am a fishmonger; that is what the word means.',
        ],
      },
    ],
    barks: [
      { when: QUEEN, lines: ['Put her back. They always know.'] },
      { lines: ['Herring\'s running! Herring\'s running!', 'Bait, line, hooks, whalebone.', 'Mind the gaff, it\'s sharp.'] },
    ],
  },

  // ── Baker ─────────────────────────────────────────────────────────
  {
    id: 'brinehollow-baker', name: 'Agathe Saltbread', title: 'The Brine Oven', at: AT.baker,
    role: { kind: 'bakery', id: 'brinehollow-bakery' },
    look: { body: 0xd8b098, accent: 0xe8e2d0, hat: 'chef', traits: ['apron'], size: 1.2 },
    talks: [
      {
        when: QUEEN,
        lines: [
          'The oven is a ship\'s boiler, did you know? From the Queen\'s own tithe-cutter. It sank on my roof.',
          'Twenty years I have baked in her boiler. Tonight I bake a cake in the shape of her crown and we all eat it.',
        ],
      },
      {
        when: { prince: 'ebb' },
        lines: [
          'Ebb is down! The noon tide came in an hour late and nobody\'s bread got wet. A miracle of timing.',
          'Bring me a Tidewater sand dab and a stilt crab and I will make you a pasty you can fight in.',
        ],
      },
      {
        when: { questDone: 'brinehollow-herring-run' },
        lines: [
          'Those herring you brought me went into hardtack for the whole low quarter. Nobody went hungry at high water.',
        ],
      },
      {
        lines: [
          'The Brine Oven! Everything salted, everything hot, everything slightly damp. You will get used to it.',
          'Bring me fish — sea fish off the pier and court fish from up the roads — and I bake you a meal.',
          'One meal, one fight. It wears off with the bell. Bread is not forever. Neither is anything else.',
        ],
      },
    ],
    barks: [
      { when: QUEEN, lines: ['Crown cake! Eat the crown!'] },
      { lines: ['Hardtack out! Mind your teeth!', 'Salt crust on the turbot! Who wants it?', 'The boiler\'s singing. Bread\'s ready.'] },
    ],
  },

  // ── Tithe-Reeve ───────────────────────────────────────────────────
  {
    id: 'brinehollow-reeve', name: 'Tithe-Reeve Mallory Sump', title: 'Collector of the Dry Tithe', at: AT.reeve,
    look: { body: 0x8a7a6a, accent: 0x1a5a62, hat: 'tophat', traits: ['book', 'glasses'], size: 1.1, eye: 0x9ae0e6 },
    talks: [
      {
        when: QUEEN,
        lines: [
          'I have the ledger here. Every head, every coin, every house left under. Thirty-one years of it.',
          'I am going to read the left-under names out on the plaza tonight. All of them. Somebody should.',
          'I do not expect anyone to forgive me. I expect them to listen. That will have to be enough.',
        ],
      },
      {
        when: { prince: 'ebb' },
        lines: [
          'Prince Ebb set the tide clock. With him down, the noon flood came in sullen and an hour late.',
          'The ledger does not know what to do with a late tide. I have had to invent a column.',
        ],
      },
      {
        when: { questDone: 'brinehollow-another-mouth' },
        lines: [
          'The Dunnage house shows four heads. My headcounter swears she saw five. Her memory is not what it was.',
          'Somebody made sure of that. I wrote four. I will keep writing four.',
        ],
      },
      {
        when: { questDone: 'brinehollow-dry-tithe' },
        lines: [
          'One head, foreign. Paid. ...You need not look at me like that. I did not invent the tide.',
          'I only count it. Somebody has to count it, or they send someone who enjoys it.',
        ],
      },
      {
        lines: [
          'Name. — No, do not tell me, I will write "foreign". Heads on Brinehollow pay a coin a tide. Visitors too.',
          'Pay, and your floor is given back at low water. Do not pay, and it is not. That is the Dry Tithe.',
          'It is not personal. Nothing in this ledger is personal. That is rather the point of a ledger.',
        ],
      },
    ],
    barks: [
      { when: QUEEN, lines: ['...every name. Every one of them.'] },
      { lines: ['A coin a head, a head a coin.', 'Tide\'s turning. Queue on the left.', 'Unpaid is not a moral judgement. It is a column.'] },
    ],
  },

  // ── Ferrywoman ────────────────────────────────────────────────────
  {
    id: 'brinehollow-ferry', name: 'Lune Marrowby', title: 'Ferrywoman of the Low Quarter', at: AT.ferry,
    look: { body: 0xb89a88, accent: 0x2a3a4a, hat: 'hood', traits: ['cane', 'scarf'], size: 0.95 },
    talks: [
      {
        when: QUEEN,
        lines: [
          'Aldous walked up the trench road this morning in his good coat. Wet through. Asking what day it was.',
          'I told him four years. He said "then I am very late for supper". He is standing right there. Look.',
        ],
      },
      {
        when: { prince: 'lanternjaw' },
        lines: [
          'They say Lanternjaw carried the left-under down to the Undertow himself. Now he is down. Good.',
          'I pole across the quarter every dusk and look down. The street is still there under the water. Waiting.',
        ],
      },
      {
        when: { questDone: 'brinehollow-left-under' },
        lines: [
          'Brother Kelp read their names over the things you brought up. Aldous\'s pipe. The Penhallow girl\'s shell.',
          'They are not dead, you know. Kelp says the drowned sleep. I have decided to believe him.',
        ],
      },
      {
        lines: [
          'This was Gannet Street. Forty houses. The year the tithe went up, eleven of them could not pay.',
          'The sea came in at noon and did not go out again for them. My Aldous was inside, bailing.',
          'I pole a punt across it now, at high water. People like to look down at their old doors.',
        ],
      },
    ],
    barks: [
      { when: QUEEN, lines: ['Aldous! Your supper\'s cold. Four years cold!'] },
      { lines: ['Mind the water. It remembers.', 'Gannet Street, forty doors.', 'Punt across at high water. A coin, or a story.'] },
    ],
  },

  // ── Keeper of the broken lighthouse ───────────────────────────────
  {
    id: 'brinehollow-keeper', name: 'Ambrose Tallis', title: 'Keeper of the Broken Light', at: AT.keeper,
    look: { body: 0xa89480, accent: 0x3a3a30, hat: 'beanie', traits: ['lantern', 'beard', 'cane'], size: 0.95 },
    talks: [
      {
        when: QUEEN,
        lines: [
          'The beam is up on the stump. Forty feet shorter than it should be. Still finds the channel.',
          'A brig came in on it last night from Brandmark. Sixty souls. Not one rock touched.',
          'I am going to rebuild the top. One stone a day. I am seventy-three; I will need a lot of days.',
        ],
      },
      {
        when: { questDone: 'brinehollow-broken-light' },
        lines: [
          'Eel oil, Brandmark-glass prisms and one lunatic visitor. The light burns again — low, but true.',
          'The Queen knocked my tower down for showing ships the safe channel. Let her try twice.',
        ],
      },
      {
        when: { prince: 'ebb' },
        lines: [
          'Ebb was the one who brought the wave that broke my tower. Told me it was "a scheduling matter".',
          'I hope somebody scheduled him a long rest.',
        ],
      },
      {
        lines: [
          'My lighthouse showed the safe channel past the maelstrom. Ships came in that the Queen meant to lose.',
          'So one morning a wave came in at the wrong hour and took the top forty feet clean off.',
          'I keep a lantern on the stump. It shows nobody anything. I keep it anyway.',
        ],
      },
    ],
    barks: [
      { when: QUEEN, lines: ['One stone a day. One stone a day.'] },
      { lines: ['Trim the wick. Trim the wick.', 'There\'s the channel, if anybody\'s looking.'] },
    ],
  },

  // ── Crabber ───────────────────────────────────────────────────────
  {
    id: 'brinehollow-creel', name: 'Tobiah Creel', title: 'Crabber & Net-Hauler', at: AT.creel,
    look: { body: 0x9a7058, accent: 0x6a4a2a, hat: 'beanie', traits: ['pack', 'bandage'], size: 1.2 },
    talks: [
      {
        when: QUEEN,
        lines: [
          'Herring run came in and not one ballast-boat to net it for the Undertow larders. We kept it all.',
          'Agathe made hardtack for the whole town. My teeth hurt. My heart does not.',
        ],
      },
      {
        when: { prince: 'crude' },
        lines: [
          'Slickharbor stopped pumping its sludge out on the ebb. The crabs came back to the stilts the same week.',
        ],
      },
      {
        when: { questDone: 'brinehollow-herring-run' },
        lines: [
          'Skerritt\'s eels are loose in the harbour now. They do not shock anyone without him. Shy things, eels.',
          'Herring\'s ours again. For now. Pots are full. Come and haul with me some dawn.',
        ],
      },
      {
        lines: [
          'You there, with the hands. Ever hauled a pot? No? Shameful. Everyone on Brinehollow hauls.',
          'The herring run is in, and the Queen\'s ballast-boats are out to net the lot for her drowned larders.',
          'Her drowned. Her larders. Our herring. You see the shape of the problem.',
        ],
      },
    ],
    barks: [
      { when: QUEEN, lines: ['Our herring! All of it!'] },
      { lines: ['Pot\'s full! Pot\'s full!', 'Mind your fingers. Stilt crabs pinch like tithe-reeves.'] },
    ],
  },

  // ── Pip ───────────────────────────────────────────────────────────
  {
    id: 'brinehollow-pip', name: 'Pip Tidemark', title: 'Measurer of Floods', at: AT.pip, wander: 150,
    look: { body: 0xc8a080, accent: 0x3a7a8a, hat: 'cap', traits: ['satchel'], size: 0.72 },
    talks: [
      {
        when: QUEEN,
        lines: [
          'I measured the noon tide today. It came up to here. — No, lower. Here. It is the LOWEST ONE EVER.',
          'I am going to chalk it on the tithe-house. Big. With a crown upside down next to it.',
        ],
      },
      {
        when: princes(3),
        lines: [
          'Three princes! The tide is coming in all wrong now. Late, and soft, like it doesn\'t want to.',
          'I chalk every one. Look at my chalk. Down, down, down. Ha!',
        ],
      },
      {
        when: { prince: 'ebb' },
        lines: [
          'You beat Ebb? The tide-prince? He rides the waves! — Rode. Did he get wet? I bet he got wet.',
        ],
      },
      {
        lines: [
          'I chalk where every tide gets to. See the wall? That one is from my birthday. Up to my nose.',
          'Want a secret? There\'s a box on the west boards of the low quarter, past the bridge. All barnacles.',
          'And one on the broken lighthouse rocks. Ambrose says it\'s his. Ambrose says everything\'s his.',
        ],
      },
    ],
    barks: [
      { when: QUEEN, lines: ['LOWEST ONE EVER!'] },
      { lines: ['Up to here! Up to HERE!', 'I can hold my breath through a whole tithe queue.', 'Chalk, chalk, chalk.'] },
    ],
  },

  // ── Hob Dunnage ───────────────────────────────────────────────────
  {
    id: 'brinehollow-dunnage', name: 'Hob Dunnage', title: 'Bailer, Father of Five', at: AT.dunnage,
    look: { body: 0xb08a70, accent: 0x4a5a3a, hat: 'cap', traits: ['tool', 'bandage'], size: 1.1 },
    talks: [
      {
        when: QUEEN,
        lines: [
          'Marisa — the little one — slept through her first flood with no tithe on it. Slept right through.',
          'I put the bucket away. Then I took it out again, out of habit. Then I planted a geranium in it.',
        ],
      },
      {
        when: { questDone: 'brinehollow-another-mouth' },
        lines: [
          'Four heads in the ledger and five in the house. The fifth is the loudest. Kelp says she belongs to the sea.',
          'The sea does not charge a coin a tide. I checked.',
        ],
      },
      {
        when: { prince: 'hoarfrost' },
        lines: [
          'They say Hoarfrost froze the houses that could not pay, up at Rimefast. Iced them in with folk inside.',
          'Here they just drown you. I never thought I would call that the kind way.',
        ],
      },
      {
        lines: [
          'Bucket. Bail. Bucket. Bail. — Sorry. Tide\'s coming and my floor goes under at the second mark.',
          'Four coins a tide we pay, for four heads. Five heads, now. The baby came on Firstday.',
          'Five coins a tide we do not have. And Ottoline Tally counts every cradle in the quarter.',
        ],
      },
    ],
    barks: [
      { when: QUEEN, lines: ['Geranium! In the bucket!'] },
      { lines: ['Bucket, bail. Bucket, bail.', 'Second mark. Always the second mark.', 'Shh — baby\'s asleep.'] },
    ],
  },

  // ── Brother Kelp ──────────────────────────────────────────────────
  {
    id: 'brinehollow-kelp', name: 'Brother Kelp', title: 'Priest of the Drowned Chapel', at: AT.kelp,
    look: { body: 0x9a9a7a, accent: 0x3a5a3a, hat: 'mitre', traits: ['book', 'beard'], size: 1.0, eye: 0xc8f0d8 },
    talks: [
      {
        when: QUEEN,
        lines: [
          'The bell of the drowned chapel rang this morning. Under the water. Nobody pulled the rope.',
          'I think it was the sea saying thank you. I think the sea has been waiting a long time to say it.',
        ],
      },
      {
        when: { questDone: 'brinehollow-left-under' },
        lines: [
          'I read their names over the keepsakes. Every one. The water was very still while I did it.',
        ],
      },
      {
        when: { questDone: 'brinehollow-another-mouth' },
        lines: [
          'The Dunnage girl is in the sea-book. Born at slack water, owed to no crown. The old law still holds.',
          'Nobody remembered the old law. That is why I write things down.',
        ],
      },
      {
        lines: [
          'Before the Queen, the sea had a chapel. It still does. It is just under the sea now. That is fitting.',
          'The drowned are not dead, child. They sleep in the Undertow. She keeps them. "Ballast for the crown".',
          'I keep the sea-book. Names of the left-under. Names of the born-at-slack. The Queen keeps the other book.',
        ],
      },
    ],
    barks: [
      { when: QUEEN, lines: ['The bell. Did you hear the bell?'] },
      { lines: ['The sea keeps what it takes. For now.', 'Slack water is holy water.', 'Names, names. I write the names.'] },
    ],
  },

  // ── Saltwife ──────────────────────────────────────────────────────
  {
    id: 'brinehollow-saltwife', name: 'Imma Corran', title: 'Saltwife of the Pans', at: AT.saltwife,
    look: { body: 0xc89a7a, accent: 0xd8d0c0, hat: 'straw', traits: ['tool', 'scarf'], size: 1.05 },
    talks: [
      {
        when: QUEEN,
        lines: [
          'The pans are crusting thicker than I have ever seen. No flood at the wrong hour to wash them out.',
          'Salt for the whole isle this winter. Salt for Brandmark if they want it. Salt is a kind of peace.',
        ],
      },
      {
        when: { prince: 'hoarfrost' },
        lines: [
          'Rimefast used to buy all my salt to keep the harbour roads from icing. Hoarfrost wanted the ice.',
          'Now he is down they want the salt again. I have doubled the price. Only fair.',
        ],
      },
      {
        lines: [
          'Rake it thin, let the sun take the water, and what is left is salt. It is the only thing the tide gives us.',
          'The tithe-house floods the pans out whenever it wants the price up. Salt goes dear; the Queen sells hers.',
          'Do not walk on the crust. — Well. Walk on it gently.',
        ],
      },
    ],
    barks: [
      { when: QUEEN, lines: ['Salt for everyone!'] },
      { lines: ['Rake thin, rake slow.', 'Mind the crust!', 'Sun\'s out. Salt\'s in.'] },
    ],
  },

  // ── Tilly Brackwater (only after the Queen falls) ─────────────────
  {
    id: 'brinehollow-tilly', name: 'Tilly Brackwater', title: 'First Mate, Woken from the Undertow', at: AT.tilly,
    present: QUEEN,
    look: { body: 0xb89070, accent: 0x2a6a7a, hat: 'bandana', traits: ['scarf', 'satchel'], size: 1.0, eye: 0xbfeff0 },
    talks: [
      {
        when: { flag: 'odo-key-4' },
        lines: [
          'Have you seen his face? Three years in a bucket and he has the nerve to look exactly the same.',
          'He cried. Do not tell him I told you. He says it was condensation.',
          'We are going to raise the Merrow\'s Ladle. Him, me, and that ridiculous Bell, one more time.',
        ],
      },
      {
        when: { all: [{ flag: 'odo-key-3' }, { not: { flag: 'odo-key-4' } }] },
        lines: [
          'Key is in, key will not turn. Three years in salt round my neck. It is more rust than key.',
          'Jory has it soaking in whale oil. Odo keeps knocking the Bell on the door to ask if it is ready.',
        ],
      },
      {
        when: { not: { flag: 'odo-key-3' } },
        lines: [
          'I went down with the Ladle. I remember the water closing and then... a long, green, quiet sleep.',
          'And I woke on the Undertow floor in a crowd of us, all blinking. Walked up the trench road with them.',
          'Look — round my neck. The helmet key. I grabbed it when she went down. Where is the great brass fool?',
        ],
      },
    ],
    barks: [
      { when: { flag: 'odo-key-4' }, lines: ['Condensation. Ha!'] },
      { lines: ['Three years. Three YEARS.', 'Where is he? Odo!', 'Everything smells of fish. Lovely.'] },
    ],
  },

  // ── Aldous Marrowby (only after the Queen falls) ──────────────────
  {
    id: 'brinehollow-aldous', name: 'Aldous Marrowby', title: 'Late for Supper', at: AT.aldous,
    present: QUEEN,
    look: { body: 0xa8907a, accent: 0x3a4a5a, hat: 'none', traits: ['pipe', 'beard'], size: 1.05, eye: 0xbfeff0 },
    talks: [
      {
        when: { questDone: 'brinehollow-left-under' },
        lines: [
          'Lune says you brought my pipe up from Gannet Street. I wondered where I had put it. For four years.',
          'It still draws. Bit salty. Everything is a bit salty. I am not complaining. I am never complaining again.',
        ],
      },
      {
        lines: [
          'I was bailing. Noon flood, kitchen floor, bucket in my hand. Then a long dream about green light.',
          'Then a lot of us walking up a road out of the sea, holding hands so nobody got lost. Then Lune.',
          'Four years, she says. I have missed a lot of suppers. I intend to eat every one of them.',
        ],
      },
    ],
    barks: [{ lines: ['Four years of suppers.', 'Is it noon? It feels like noon.'] }],
  },
];

// ── The crowd ────────────────────────────────────────────────────────

const CROWD_LOOKS: NpcLook[] = [
  { body: 0xb08870, accent: 0x2a4a5a, hat: 'souwester' },
  { body: 0xc8a08a, accent: 0x3a5a4a, hat: 'bandana', traits: ['apron'] },
  { body: 0x8a7060, accent: 0x2a3a3a, hat: 'beanie', traits: ['rod'] },
  { body: 0xd0aa90, accent: 0x5a3a4a, hat: 'none', traits: ['scarf'] },
  { body: 0x9a8070, accent: 0x4a5a5a, hat: 'souwester', traits: ['pack'], size: 1.15 },
  { body: 0xb89878, accent: 0x6a5a3a, hat: 'straw', traits: ['satchel'] },
  { body: 0xc89a82, accent: 0x2a4a5a, hat: 'cap', size: 0.78 },
  { body: 0xa88a7a, accent: 0x3a3a4a, hat: 'hood', traits: ['tool'] },
];

export const BRINEHOLLOW_CROWD: { count: number; looks: NpcLook[]; paths: Pt[][]; barks: Talk[] } = {
  count: 12,
  looks: CROWD_LOOKS,
  paths: [
    // The harbour-front boardwalk.
    [{ x: 980, y: 1140 }, { x: 1300, y: 1142 }, { x: 1700, y: 1140 }, { x: 2140, y: 1142 }],
    // Ladder Street, plaza to pier head and back.
    [{ x: 1300, y: 830 }, { x: 1300, y: 1000 }, { x: 1300, y: 1170 }, { x: 1300, y: 1000 }],
    // The tithe queue: round the plaza to the tithe-house door and back.
    [{ x: 1180, y: 760 }, { x: 1440, y: 700 }, { x: 1600, y: 720 }, { x: 1440, y: 790 }],
    // Tithe Row, west half.
    [{ x: 200, y: 760 }, { x: 600, y: 756 }, { x: 1100, y: 762 }],
    // Tithe Row, east half, past the bakery.
    [{ x: 1500, y: 762 }, { x: 2000, y: 756 }, { x: 2440, y: 760 }],
    // Up the north road toward Tidewater.
    [{ x: 1300, y: 600 }, { x: 1300, y: 300 }, { x: 1300, y: 140 }, { x: 1300, y: 420 }],
    // The beach at the waterline.
    [{ x: 1000, y: 1214 }, { x: 1700, y: 1220 }, { x: 2100, y: 1216 }],
    // The mud flats under the stilts.
    [{ x: 1000, y: 1040 }, { x: 1400, y: 1030 }, { x: 1800, y: 1040 }, { x: 2150, y: 1000 }],
  ],
  barks: [
    { when: QUEEN, lines: [
      'The tide came in and nobody paid!', 'My nan walked home up the trench road this morning!',
      'Sump is reading the names on the plaza tonight.', 'No coin a head. No coin a HEAD!', 'Somebody tell the sea it can rest.',
    ] },
    { when: princes(4), lines: [
      'Four courts free!', 'The tithe clock\'s running slow. Four hours slow.', 'They say the Queen stirs the maelstrom all night now.',
    ] },
    { when: { prince: 'ebb' }, lines: [
      'Noon flood came in late!', 'Did you hear? The tide-prince.', 'Shh — not by the tithe-house.',
    ] },
    { lines: [
      'Coin a head, twice a day.', 'Second mark by noon, they say.', 'Gannet Street went under in my mother\'s time.',
      'Herring\'s running off the pier.', 'Mind the third plank.', 'Bail fast, pay faster.', 'Wet feet, dry ledger.',
    ] },
  ],
};
