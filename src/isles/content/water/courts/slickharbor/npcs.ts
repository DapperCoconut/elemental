import type { NpcDef, NpcLook, Talk } from '../../../../IslesTypes';
import { ENC_CRANE, ENC_GUSHER, ENC_SLICK, ENC_SPARK } from './encounters';

/**
 * The people of Slickharbor. Here the Dry Tithe is a coin a head — or, for those with no coin,
 * a barrel of crude a head, weighed at the Barrel Tithe. So the whole court pumps, mops, tars
 * and welds for the oil that lights the Queen's lamps, while their own windows stay dark and
 * the houses that come up short are left under for the harbour to keep.
 *
 * Every NPC answers to the court's state: their own quest done, Prince Crude down, the Queen
 * down. Blocks are listed most specific first.
 */

export const NPC_SAL = 'slickharbor-sal';
export const NPC_PENNOCK = 'slickharbor-pennock';
export const NPC_BESSA = 'slickharbor-bessa';
export const NPC_NELL = 'slickharbor-nell';
export const NPC_TIBBY = 'slickharbor-tibby';
export const NPC_ILSE = 'slickharbor-ilse';
export const NPC_OSSIE = 'slickharbor-ossie';
export const NPC_FENWICK = 'slickharbor-fenwick';
export const NPC_PRUETT = 'slickharbor-pruett';

export const Q_LAMPS = 'slickharbor-black-row-lamps';
export const Q_CHOWDER = 'slickharbor-catfish-chowder';
export const Q_TIDEMARK = 'slickharbor-under-the-tidemark';
export const Q_RAINBOW = 'slickharbor-rainbow-proof';
export const Q_PUMPS = 'slickharbor-still-the-pumps';

const PRINCE = { prince: 'crude' } as const;
const QUEEN = { monarch: 'maresa' } as const;

const look = (l: NpcLook): NpcLook => l;

export const SLICKHARBOR_NPCS: NpcDef[] = [
  {
    id: NPC_SAL, name: 'Old Sal Bunkerly', title: 'Ship Chandler, The Slop Chest',
    look: look({ body: 0xd8b49a, accent: 0x2e4a5a, hat: 'tricorn', traits: ['pipe', 'apron'], size: 1.05 }),
    at: { x: 330, y: 754 },
    role: { kind: 'shop', id: 'slickharbor-shop' },
    talks: [
      { when: QUEEN, lines: [
        'The Queen\'s gone down with her own tide, they say. I\'ve marked everything half off. Then I wept.',
        'Forty years selling oilskins to people who couldn\'t keep the oil off. Maybe now they\'ll stay dry.',
      ] },
      { when: PRINCE, lines: [
        'Crude\'s out of his gold tank and the lamps on the road are burning for whoever walks under them.',
        'Charms still on the shelf. I\'d sell you the shelf as well, if you asked nicely.',
      ] },
      { lines: [
        'Welcome to the Slop Chest. Oilskins, rope, lamp-glass, and the odd charm with a story in it.',
        'Everything a body needs to work the Prince\'s oil. Nothing a body needs to leave.',
        'I\'ll buy fish off you, too. Catfish fry up black, sculpin\'s bony, and a shiner — well. Bring one.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Step in out of the smog, it\'s lifting anyway.'] },
      { lines: ['Oilskins! Lamp-glass! Charms with a past!', 'Mind the drip off the awning, it\'s tar.'] },
    ],
  },
  {
    id: NPC_PENNOCK, name: 'Ma Pennock', title: 'Wick-Twister of the Black Row',
    look: look({ body: 0xc8a48a, accent: 0x4a3a52, hat: 'veil', traits: ['scarf', 'glasses'], size: 0.9 }),
    at: { x: 440, y: 1044 },
    wander: 20,
    talks: [
      { when: QUEEN, lines: [
        'I lit all my lamps last night. All eleven. The neighbours came to look, like it was a fair.',
        'Turns out a wick\'s a happy thing, when it\'s let do its job.',
      ] },
      { when: PRINCE, lines: [
        'No more snuffers on the Row. The Prince\'s lamplighters went home and didn\'t come back.',
        'I\'m twisting wicks for us now. Thick ones. The kind that burn all night.',
      ] },
      { when: { questDone: Q_LAMPS }, lines: [
        'Four lamps lit on the Black Row, and old Dimmock\'s snuffer bent like a spoon. I\'ll dream of it.',
      ] },
      { lines: [
        'I twist wicks for the Queen\'s lamps. Ten thousand a year. Every one burns on our oil, not for us.',
        'Black Row\'s dark at night, dearie. A lamp costs a ration of crude, and crude is tithe.',
        'Lighting your own lamp without a licence is theft from the Crown. They send a snuffer round.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Lamps! Real lamps in real windows!'] },
      { lines: ['Twist and pull. Twist and pull.', 'Every wick a lamp I\'ll never sit beside.'] },
    ],
  },
  {
    id: NPC_BESSA, name: 'Bessa Holdfast', title: 'Cook at the Bilge & Biscuit',
    look: look({ body: 0xe0b090, accent: 0xe6e0d4, hat: 'chef', traits: ['apron'], size: 1.25 }),
    at: { x: 790, y: 1114 },
    talks: [
      { when: QUEEN, lines: [
        'No tithe-barge, no fish-tithe, no Queen. I\'ve put the price of chowder down to nothing at all.',
        'I\'ll go broke by Tuesday. Worth it to see the dockers eat seconds.',
      ] },
      { when: PRINCE, lines: [
        'With Crude gone the barge doesn\'t take one fish in three. My pot\'s fuller than it\'s been in years.',
      ] },
      { when: { questDone: Q_CHOWDER }, lines: [
        'That chowder fed the night gang, the mop crews and two cormorants who wandered in. Bless you.',
        'Tolle\'s not been round since. Says the jetty\'s haunted by someone with a mean right hook.',
      ] },
      { lines: [
        'Bilge & Biscuit, best galley on the quay. Only galley on the quay. Same thing, these days.',
        'Hull for a roof. Came in on the last spring tide, upside down, and I just moved under it.',
        'Hungry? So\'s everyone. The tithe-barge takes a fish in three before it reaches my pot.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Chowder! Thick as it ought to be!'] },
      { lines: ['Biscuits, hard as the Prince\'s heart.', 'Wipe your feet. I know. I know. Wipe them anyway.'] },
    ],
  },
  {
    id: NPC_NELL, name: 'Nell Gallon', title: 'Left Under',
    look: look({ body: 0xb89880, accent: 0x5a6a72, hat: 'hood', traits: ['bandage', 'pack'], size: 0.95 }),
    at: { x: 330, y: 1252 },
    talks: [
      { when: QUEEN, lines: [
        'They say the sea\'s ours now — no more letting it in. I\'m going to bail out my house with a teacup.',
        'It\'ll take a year. I don\'t care. It\'s mine.',
      ] },
      { when: PRINCE, lines: [
        'The Prince\'s bailiffs have stopped coming down the Row. I can stand on my own quay and look at my roof.',
        'Tibby swam down to the kitchen yesterday. Came up with my ladle. Silly girl. Lovely girl.',
      ] },
      { when: { questDone: Q_TIDEMARK }, lines: [
        'His photograph, the bell, her shoes. I\'ve dried them by the stove. They smell of crude forever.',
        'I don\'t mind. Everything smells of crude. Now some of it smells of us as well.',
      ] },
      { lines: [
        'That\'s my house. The roof with the bird on it. We were a barrel short at the spring tithe.',
        'One barrel. They don\'t argue, they just open the sluice and the sea comes up the Row.',
        'Everything we had is still in there. Down in the black. The Queen calls that ballast.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['One day I\'ll sleep in my own bed again.'] },
      { lines: ['One barrel short. One.', 'Tibby, away from the edge.'] },
    ],
  },
  {
    id: NPC_TIBBY, name: 'Tibby Gallon', title: 'Mudlark',
    look: look({ body: 0xd0a888, accent: 0xc8322a, hat: 'beanie', traits: ['satchel'], size: 0.7 }),
    at: { x: 392, y: 1278 },
    wander: 40,
    talks: [
      { when: QUEEN, lines: [
        'I\'m going to be a diver. A real one. Not for salvage — for getting people\'s things back.',
      ] },
      { when: PRINCE, lines: [
        'The water by the jetty went see-through for a minute today. I saw a crab! A clean crab!',
      ] },
      { when: { questDone: Q_TIDEMARK }, lines: [
        'You got Ma\'s things back! I knew the bailiff was a coward. He had a coward\'s hat.',
      ] },
      { lines: [
        'I can hold my breath for ever so long. I go down to our kitchen sometimes. It\'s dark and it hums.',
        'At low water you can wade the Row up to your knees. There\'s things on the boards. Our things.',
        'Don\'t tell Ma. She thinks I just look.',
      ] },
    ],
    barks: [
      { lines: ['I found a spoon! A whole spoon!', 'One, two, three... I can do forty.'] },
    ],
  },
  {
    id: NPC_ILSE, name: 'Ilse Sounding', title: 'Harbour Assayer',
    look: look({ body: 0xe8c8b0, accent: 0x3a5a6a, hat: 'goggles', traits: ['glasses', 'book', 'satchel'], size: 0.95 }),
    at: { x: 1340, y: 464 },
    talks: [
      { when: QUEEN, lines: [
        'With the Queen gone I can publish. "On the Watering of the Royal Crude." Forty pages. Footnotes.',
        'Nobody will read it. I\'ll read it to the cormorants. They were the first victims.',
      ] },
      { when: PRINCE, lines: [
        'The wells are logged honestly now. The Queen got exactly what came out of the ground. For once.',
      ] },
      { when: { questDone: Q_RAINBOW }, lines: [
        'Pitch\'s logbook and a shiner with no colour in it. Proof that holds water. Ha. Literally.',
        'The weighmen have been short-weighing honest barrels while the Prince waters his own. Not any more.',
      ] },
      { lines: [
        'I test the crude for the Barrel Tithe. Purity, weight, sulphur. Every household\'s barrel.',
        'Odd thing. The Prince\'s own wells read thinner every month. As if somebody\'s cutting it with sea.',
        'And yet it\'s the households who get fined for short weight. Funny, that. I don\'t laugh.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Clean readings. Beautifully dull.'] },
      { lines: ['Specific gravity: suspicious.', 'Hold still, sample. Hold still.'] },
    ],
  },
  {
    id: NPC_OSSIE, name: 'Ossie Drum', title: 'Pumper, Nodding Field',
    look: look({ body: 0x9a7a62, accent: 0x2a2a30, hat: 'cap', traits: ['beard', 'tool', 'bandage'], size: 1.2, hand: 0x1a130d }),
    at: { x: 1068, y: 434 },
    talks: [
      { when: QUEEN, lines: [
        'The pumps are off. All of them. You know what the Nodding Field sounds like with nobody nodding?',
        'Birds. There\'s birds out there. I didn\'t know we had birds.',
      ] },
      { when: PRINCE, lines: [
        'We run the pumps by daylight now and for our own lamps first. Eight hours. Sit-down dinner.',
        'Crude\'s sat on the steps of his gold tank looking at the harbour like he\'s never seen it.',
      ] },
      { when: { questDone: Q_PUMPS }, lines: [
        'Six pumps stopped at once and the Prince came down off his tank to see why. You were there. I saw.',
      ] },
      { lines: [
        'Nod, nod, nod. They pump night and day — the Queen\'s lamps never go out, so we never sleep.',
        'Every family\'s barrel comes out of this field. Fill it, roll it to the Tithe, start again.',
        'If the pumps ever all stopped together... well. He\'d have to come down and look, wouldn\'t he.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Eight hours! I can see my kids by daylight!'] },
      { lines: ['Hear that knock? Number three wants grease.', 'Nod, nod, nod.'] },
    ],
  },
  {
    id: NPC_FENWICK, name: 'Fenwick Reed', title: 'Retired Hard-Hat Diver',
    look: look({ body: 0xc0a090, accent: 0xe8c040, hat: 'souwester', traits: ['rod', 'pipe'], size: 1, eye: 0x9aa0a8 }),
    at: { x: 478, y: 1440 },
    talks: [
      { when: QUEEN, lines: [
        'Can\'t see a thing, never could down there either. But I can smell it: salt. Real salt, coming back.',
      ] },
      { when: PRINCE, lines: [
        'Fish are biting cleaner. A shiner took my line this morning and I swear it tasted the sun.',
      ] },
      { when: { encounter: ENC_SLICK }, lines: [
        'Heard Gunnel go over this morning. Took her bucket with her, by the sound of it. Hah!',
        'The Slick bites best by the oil jetty. Catfish on the bottom, sculpin in the weed, shiners up top.',
      ] },
      { lines: [
        'Forty years under the harbour in a brass hat. Went blind from the crude in the glass.',
        'You fishing? Iron rod or nothing — the Slick eats wood like a bilge rat eats biscuit.',
        'Tar catfish on the bottom. Slick sculpin in the weed. And a rainbow shiner, if the water\'s honest.',
        'A shiner only shows its colours in pure crude. Watered oil, it comes up grey. Remember that.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Smell that? That\'s salt, that is.'] },
      { lines: ['Bite, you black devil, bite.', 'I hear your boots. Stranger\'s boots. Dry ones.'] },
    ],
  },
  {
    id: NPC_PRUETT, name: 'Pruett Ledgersby', title: 'Tithe-Clerk of the Barrel Tithe',
    look: look({ body: 0xe0c4a8, accent: 0x1a1210, hat: 'tophat', traits: ['book', 'glasses'], size: 0.95 }),
    at: { x: 962, y: 770 },
    talks: [
      { when: QUEEN, lines: [
        'The ledgers? Gone. I used them to light my stove. I am told that is a crime. I am told by no one.',
        'If you need a clerk who knows where every barrel went, I\'m available. I\'m very available.',
      ] },
      { when: PRINCE, lines: [
        'His Highness has stopped coming to the scale. The households weigh each other now. Honestly, too.',
        'I\'ve been given a new job: counting the lamps that come on in the Black Row. I like this job.',
      ] },
      { when: { questDone: Q_RAINBOW }, lines: [
        'Those figures were never mine to question. Now that they\'ve been questioned... I feel lighter.',
      ] },
      { lines: [
        'One coin a head, or one barrel a head. The Dry Tithe is weighed here, in the Queen\'s name.',
        'Short weight is theft from the Crown. A house short a barrel is left under at the next spring tide.',
        'I don\'t make the rules. I write them down very neatly. There is a difference. Isn\'t there?',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Weighed and found... fine. Just fine.'] },
      { lines: ['Next household. Next.', 'Short. Short. Full. Short.'] },
    ],
  },
];

/** The quay crowd's ambient mutters. */
export const SLICKHARBOR_CROWD_BARKS: Talk[] = [
  { when: QUEEN, lines: [
    'They say the sea will only come in when it likes now. Like it used to.',
    'Lit my lamp. Just sat and looked at it.',
    'No barrels, no tithe. What do I do with my hands?',
  ] },
  { when: PRINCE, lines: [
    'Lamphouse doors are open. Gold everywhere. He kept the lamps lit indoors all day!',
    'Pumps stopped at sundown. Sundown!',
    'The Slick\'s thinning. You can see the bottom by the west jetty.',
    'Somebody\'s been and lit the Black Row. Every window.',
  ] },
  { when: { encounter: ENC_CRANE }, lines: [
    'Hoyle\'s parked the crane. The tanker\'s just sitting there, half loaded.',
    'Heard the stranger used Hoyle\'s own crates against him.',
  ] },
  { when: { encounter: ENC_SPARK }, lines: [
    'Sputz has put his torch down. That tank\'s not going to blow today, at least.',
  ] },
  { when: { encounter: ENC_GUSHER }, lines: [
    'Pitch is sat on a wellhead with his head in his hands. Never seen him sit.',
  ] },
  { lines: [
    'Barrel a head. Barrel a head. How many heads have we got, love? Count again.',
    'Don\'t look at the lamps. You\'ll only want one.',
    'Three houses went under on the Row last tide. Three.',
    'Mind the slick, it\'s like walking on a fish.',
    'Rolled my barrel all the way to the Tithe and it came up short. Short! I filled it myself!',
    'Pumps never stop. Neither do we.',
    'Can\'t see the bottom of the harbour. Never could. Grandad says he could.',
  ] },
];
