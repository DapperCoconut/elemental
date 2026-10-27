import type { AreaDef, Cond, NpcDef, NpcLook } from '../../../../IslesTypes';

/**
 * The people of the Rimefast Court. A fishing harbour that has not seen open water in three
 * winters: the fleet is frozen where it lay, warmth is licensed, and a household behind on the
 * Thaw Tithe gets its door sealed under ice. Those who still cannot pay are lowered through the
 * Tithe Hole at the palace foot, "to the Queen's keeping". Everyone here knows somebody who went
 * down it. Blocks are listed most specific first: Queen fallen → Prince fallen → quest done →
 * quest underway → default.
 */

const QUEEN: Cond = { monarch: 'maresa' };
const PRINCE: Cond = { prince: 'hoarfrost' };

export const RIMEFAST_NPCS: NpcDef[] = [
  {
    id: 'rimefast-gimlet',
    name: 'Sully Gimlet',
    title: 'Ship-Chandler',
    look: { body: 0xc89a7a, accent: 0x2a3a44, hat: 'souwester', traits: ['apron', 'glasses', 'pipe'], size: 1.1 },
    at: { x: 330, y: 700 },
    role: { kind: 'shop', id: 'rimefast-shop' },
    talks: [
      { when: QUEEN, lines: ['The Queen\'s gone under her own tide, they say. Fitting. I\'m selling oars again. OARS.', 'Rope, tar, sailcloth — everything a ship needs to leave. First time in three winters anyone\'s asked.'] },
      { when: PRINCE, lines: ['The ice is groaning out there. You hear it? That\'s a harbour remembering it\'s water.', 'I\'ve put the good stock out. Lamp oil without a licence. Feels like smuggling. Lovely.'] },
      { when: { questDone: 'rimefast-iced-shut' }, lines: ['Tallis\'s door\'s open and the collector\'s blowlamp is in my back room. Not that I\'ve seen it.', 'What\'ll it be? Charms are under the counter. Everything\'s under the counter, these days.'] },
      { when: { quest: 'rimefast-iced-shut' }, lines: ['Salt for Tallis\'s door? There\'s sacks iced to the warehouse ramps on the south quay. I never sold you any.'] },
      { lines: ['Gimlet\'s Chandlery. Rope, lamps, charms, and the last honest scales on the quay.', 'I chandle for ships that can\'t sail. Some days I sell a rope just to watch somebody coil it.'] },
    ],
    barks: [
      { when: QUEEN, lines: ['Oars! Get your oars!', 'Sailcloth by the yard!'] },
      { when: PRINCE, lines: ['Hear that ice groan?', 'Unlicensed oil! Shh.'] },
      { lines: ['Rope by the fathom…', 'Lamp licence is extra. Always extra.', 'Mind the step, it\'s glass.'] },
    ],
  },
  {
    id: 'rimefast-tallis',
    name: 'Widow Tallis Firth',
    title: 'Net-Mender',
    look: { body: 0xd8b8a0, accent: 0x5a4a6a, hat: 'hood', traits: ['scarf', 'cane'], size: 0.95 },
    at: { x: 250, y: 400 },
    talks: [
      { when: QUEEN, lines: ['They\'re bringing the sleepers up out of the Undertow. Arn\'s among them. He\'s asking for his boots.', 'Three winters, and the first thing he wants is his boots. That\'s my Arn.'] },
      { when: PRINCE, lines: ['The Prince is down, and the Tithe Hole\'s just a hole again. A hole in the ice. That\'s all it ever was.', 'I go and stand by it, mornings. I tell Arn the news. I think the water carries it.'] },
      { when: { questDone: 'rimefast-iced-shut' }, lines: ['My own front door! I\'ve opened and shut it nineteen times this morning just to hear the latch.', 'Come in and get warm. I\'ve no fire. But come in anyway — it\'s the coming in that counts.'] },
      { when: { quest: 'rimefast-iced-shut' }, lines: ['Salt from the warehouses, hot water from Burgoo. Then the ice comes off and I come in.'] },
      { lines: ['That\'s my door. Under the ice. I was a week behind on the Thaw Tithe, so they sealed it.', 'I sleep in the net-loft over the chandlery. Gimlet says I\'m no trouble. I\'m a great deal of trouble.'] },
    ],
    barks: [
      { when: PRINCE, lines: ['Morning, Arn.', 'Just a hole. Just ice.'] },
      { when: { questDone: 'rimefast-iced-shut' }, lines: ['*click* …*click*. Lovely.', 'My door. My latch.'] },
      { lines: ['Nineteen knots to a fathom of net…', 'Arn would have paid. Arn always paid.', 'Cold hands, steady needle.'] },
    ],
  },
  {
    id: 'rimefast-augur',
    name: 'Old Tom Augur',
    title: 'Hole-Cutter',
    look: { body: 0xb08a70, accent: 0x4a5a3a, hat: 'beanie', traits: ['beard', 'rod', 'pipe'], size: 1.05 },
    at: { x: 1470, y: 920 },
    talks: [
      { when: QUEEN, lines: ['Cut my last hole this morning. Tomorrow the ice goes out and I fish off a boat like a Christian.', 'Forty years cutting holes. I\'ll miss it. No I won\'t. My shoulders won\'t.'] },
      { when: PRINCE, lines: ['No licence on the holes now. I cut nine this morning out of pure spite.', 'Smelt are biting like they\'ve heard the news.'] },
      { when: { questDone: 'rimefast-short-weight' }, lines: ['Honest weight on the quay again. Tare\'s scales are at the bottom of hole number three.', 'Take a line. Char by the shanty, cod deep under the middle hole.'] },
      { when: { quest: 'rimefast-short-weight' }, lines: ['Smelt first — they\'re easy, they practically climb up the line. Cod\'s the hard one. Big lad.'] },
      { lines: ['These are the Rimefast holes. I cut \'em, the Prince licenses \'em, the fish don\'t care either way.', 'Smelt for the pot, char for the market, and glacier cod if your arms are good.'] },
    ],
    barks: [
      { when: PRINCE, lines: ['Hole nine! Ha!', 'Biting, biting.'] },
      { lines: ['*crunch crunch* — through.', 'Shh. Smelt.', 'Licence, licence. Bah.'] },
    ],
  },
  {
    id: 'rimefast-merrow',
    name: 'Captain Annick Merrow',
    title: 'Master of the Promise',
    look: { body: 0xe0c0a8, accent: 0x2f4f6f, hat: 'tricorn', traits: ['scarf', 'eyepatch'], size: 1.1 },
    at: { x: 1040, y: 800 },
    talks: [
      { when: QUEEN, lines: ['The ice is going out. I can feel the Promise lift under my feet. Three winters, and she still floats.', 'First cargo out of Rimefast in three years: Widow Firth\'s mended nets, for anyone who wants to fish.'] },
      { when: PRINCE, lines: ['The ice round her hull is soft as cheese. One more thaw and she\'s free.', 'I sleep aboard now. I want to be on deck the hour she moves.'] },
      { when: { questDone: 'rimefast-promise' }, lines: ['Hackle\'s sawn her collar clean round, and Floe\'s breaker is tied up sulking.', 'When the Prince falls, she sails. I\'ve promised her. A ship holds you to a promise.'] },
      { when: { quest: 'rimefast-promise' }, lines: ['Hackle first, then the saw blades. Then Floe — he\'ll never let a hull out of his lanes.'] },
      { lines: ['The Merrow\'s Promise. Brig, twelve guns, no powder. We were running for the open sea when the harbour froze.', 'Three winters I\'ve kept her painted. You don\'t let a ship think you\'ve given up on her.'] },
    ],
    barks: [
      { when: PRINCE, lines: ['Soft ice. Good ice.', 'Any day now, girl.'] },
      { lines: ['Steady, girl. Steady.', 'Paint holds better than hope.', 'One day, the tide.'] },
    ],
  },
  {
    id: 'rimefast-hackle',
    name: 'Hackle Thrane',
    title: 'Ice-Sawyer',
    look: { body: 0x9a7a62, accent: 0x6a3a2a, hat: 'cap', traits: ['tool', 'beard', 'bandage'], size: 1.3 },
    at: { x: 1280, y: 650 },
    talks: [
      { when: QUEEN, lines: ['Nothing left to saw. I\'m going to sleep for a month. Then I\'m going to sleep for another month.'] },
      { when: PRINCE, lines: ['I sawed the licence board off the Thaw House and floated it into the Tithe Hole. Felt good.'] },
      { when: { questDone: 'rimefast-promise' }, lines: ['Cut her collar right round. She\'s sitting in a moat of slush now, waiting.', 'If the Rimebiter comes for her again, I\'ll saw that too.'] },
      { when: { quest: 'rimefast-promise' }, lines: ['My blades are scattered all over the ice round the Promise. Floe\'s men kick them about for sport.'] },
      { lines: ['I saw ice. Blocks for the palace, holes for the licensed, channels for the breaker. All of it for him.', 'Arms like hawsers, back like a broken spar. Ask me anything except to lift something.'] },
    ],
    barks: [
      { when: PRINCE, lines: ['No more blocks for HIM.', 'Saw\'s for firewood now.'] },
      { lines: ['*rasp… rasp…*', 'My back. Oh, my back.', 'Another block for the palace.'] },
    ],
  },
  {
    id: 'rimefast-pip',
    name: 'Pip Rimeling',
    title: 'Harbour Child',
    look: { body: 0xf0d0b8, accent: 0xa8343a, hat: 'beanie', traits: ['scarf'], size: 0.72 },
    at: { x: 1300, y: 1110 },
    wander: 90,
    talks: [
      { when: QUEEN, lines: ['The ice is going! We\'re going to have SUMMER. What do you do in summer? Brisa says you swim. In WATER.', 'I\'m going to swim in all of it.'] },
      { when: PRINCE, lines: ['The Prince is down! We had a snowball fight about it. Everyone won.'] },
      { when: { questDone: 'rimefast-forts' }, lines: ['Our forts! With our flag! And Slush is just a puddle now, which is what he always was.', 'You can be on our side. Everyone\'s on our side. That\'s the rule.'] },
      { when: { quest: 'rimefast-forts' }, lines: ['Did you get the forts back? Did you? Did you find the mittens? Don\'t tell Mum about the mittens.'] },
      { lines: ['Brisa\'s my big sister. She can skate backwards AND forwards. I can do forwards.', 'The Quartermaster took our snow forts. He says he\'s "training". He\'s just bigger than us.'] },
    ],
    barks: [
      { when: PRINCE, lines: ['Everyone won!', 'SUMMER!'] },
      { lines: ['Wheee—', 'Forwards! Forwards!', 'Not fair, he\'s bigger.'] },
    ],
  },
  {
    id: 'rimefast-flurry',
    name: 'Flurry Ashlock',
    title: 'Palace Maid',
    look: { body: 0xe8d4c8, accent: 0x1f6a70, hat: 'veil', traits: ['apron'], size: 0.9 },
    at: { x: 1720, y: 470 },
    talks: [
      { when: QUEEN, lines: ['I don\'t work at the palace any more. Nobody does. It\'s melting, slowly, like a candle someone forgot.', 'I\'ve kept one icicle from the arch in a bucket. I don\'t know why. To watch it go, I think.'] },
      { when: PRINCE, lines: ['He\'s gone quiet, up there. He sits by a window and watches the ice crack. He hasn\'t sent for anyone.', 'I took him tea. Hot. He didn\'t send it back.'] },
      { when: { quest: 'rimefast-tithe-hole' }, lines: ['The names. Bring me the names. I\'ll read them to him. Someone should have to hear them.'] },
      { lines: ['I sweep frost off the Prince\'s floors. It grows back while I watch. That\'s the job.', 'He isn\'t cruel, you know. He\'s worse. He\'s tidy.'] },
    ],
    barks: [
      { when: PRINCE, lines: ['Hot tea. He drank it.', 'Melting, slowly.'] },
      { lines: ['Sweep, sweep.', 'Shh — he hates footsteps.', 'Tidy. Always tidy.'] },
    ],
  },
  {
    id: 'rimefast-burgoo',
    name: 'Chowder Burgoo',
    title: 'Soup-Seller',
    look: { body: 0xc89070, accent: 0xece4d2, hat: 'chef', traits: ['apron', 'beard'], size: 1.25 },
    at: { x: 590, y: 880 },
    talks: [
      { when: QUEEN, lines: ['Free soup today. Free soup tomorrow. I\'ll charge again when I stop crying into it.'] },
      { when: PRINCE, lines: ['No more stove licence! I lit all four burners. Nothing to cook on three of them, but they\'re LIT.'] },
      { when: { questDone: 'rimefast-iced-shut' }, lines: ['Tallis brought me a bowl back. Of MY soup. Said it tasted better eaten indoors.', 'She\'s right. Everything does. Bowl? Coin\'s optional today.'] },
      { when: { quest: 'rimefast-iced-shut' }, lines: ['A kettle for Tallis\'s door? Bring the salt and you\'ll have the hottest water on the quay.'] },
      { lines: ['Chowder! The only licensed stove on the quay, and I paid for it in fish heads and dignity.', 'One coin a bowl. The warmth\'s extra. Joke! The warmth\'s free. Don\'t tell the Collector.'] },
    ],
    barks: [
      { when: PRINCE, lines: ['All burners lit!', 'Soup for everyone!'] },
      { lines: ['Chowder! Hot chowder!', 'Licensed warmth, one coin!', 'Mind the steam, it\'s the only steam in town.'] },
    ],
  },
];

const FISHER: NpcLook = { body: 0xc8a080, accent: 0x3a4a5a, hat: 'souwester', traits: ['rod'] };
const SAILOR: NpcLook = { body: 0xd8b090, accent: 0x2a3a5a, hat: 'beanie', traits: ['scarf'] };
const WIFE: NpcLook = { body: 0xe0c0a8, accent: 0x6a3a4a, hat: 'hood', traits: ['scarf', 'satchel'], size: 0.95 };
const SAWYER: NpcLook = { body: 0x9a7a5a, accent: 0x5a4a3a, hat: 'cap', traits: ['tool', 'beard'], size: 1.2 };
const COLLECTOR: NpcLook = { body: 0xd0c0b0, accent: 0x1f6a70, hat: 'tophat', traits: ['book', 'glasses'] };
const CHILD: NpcLook = { body: 0xf0d0b8, accent: 0x4a7a9a, hat: 'beanie', traits: ['scarf'], size: 0.72 };

export const RIMEFAST_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 12,
  looks: [FISHER, SAILOR, WIFE, SAWYER, COLLECTOR, CHILD, FISHER],
  paths: [
    // The west quay, up and down past the chandlery.
    [{ x: 200, y: 800 }, { x: 600, y: 800 }, { x: 620, y: 560 }, { x: 330, y: 760 }],
    // Out onto the ice to the holes and back.
    [{ x: 700, y: 820 }, { x: 1100, y: 900 }, { x: 1440, y: 960 }, { x: 1000, y: 920 }],
    // Round the market square.
    [{ x: 320, y: 980 }, { x: 600, y: 980 }, { x: 600, y: 1170 }, { x: 320, y: 1170 }],
    // South quay, warehouse to warehouse.
    [{ x: 760, y: 1330 }, { x: 1200, y: 1340 }, { x: 1700, y: 1320 }, { x: 2030, y: 1360 }],
    // Skaters' loop round the rink.
    [{ x: 1000, y: 960 }, { x: 1320, y: 960 }, { x: 1320, y: 1080 }, { x: 1000, y: 1080 }],
    // Sawyers to the palace with blocks.
    [{ x: 1280, y: 680 }, { x: 1500, y: 560 }, { x: 1560, y: 480 }],
  ],
  barks: [
    { when: QUEEN, lines: ['The ice is going out!', 'I saw open water by the ridge. OPEN WATER.', 'They\'re bringing the sleepers home.', 'My boat! My boat moved!'] },
    { when: PRINCE, lines: ['Hear the ice? It\'s talking.', 'No licence on my stove tonight.', 'The Thaw House is empty. Somebody burnt the ledger.', 'Hoarfrost went down like a dropped icicle.'] },
    {
      lines: [
        'Thaw Tithe\'s due Friday. A coin a head.',
        'They sealed the Hewitts in last night.',
        'Don\'t stand still, it gets into your boots.',
        'Three winters. Three.',
        'Licensed warmth, licensed holes, licensed breath next.',
        'My cousin went down the Tithe Hole. "To the Queen\'s keeping."',
        'Keep your feet moving and your coin hidden.',
        'The breaker\'s out again. Stay off the lanes.',
      ],
    },
  ],
};
