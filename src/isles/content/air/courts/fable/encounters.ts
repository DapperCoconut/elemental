import type { EncounterDef } from '../../../../IslesTypes';

/**
 * The Fable Court's five champions — the cast of Prince Legend's licensed tales. In Fable every
 * story told aloud is a long exhale, and every exhale above the cloud line is metered; so the
 * Prince licenses which tales may be told (his own, mostly) and casts the town to play them. Jem
 * climbs the beanstalk every matinee, Hen minds the goose, Lupo huffs at the pigs' houses twice
 * a day, Gilt asks the mirror her question and Sir Galahand rides at the dragon and never quite
 * reaches it. A performer is paid in breath; a performer who fluffs a line is fined in it. Beat
 * all five and the drawbridge of Castle Evermore comes down.
 */

export const ENC_BEANSTALK = 'fable-beanstalk';
export const ENC_GOOSE = 'fable-golden-goose';
export const ENC_HUFF = 'fable-huff-and-puff';
export const ENC_MIRROR = 'fable-mirror-mirror';
export const ENC_HOARD = 'fable-dragons-hoard';

export const GIM_BEANSTALK = 'fable-giants-stalks';
export const GIM_GOOSE = 'fable-goose-eggs';
export const GIM_HUFF = 'fable-three-houses';
export const GIM_MIRROR = 'fable-fairest-question';
export const GIM_HOARD = 'fable-sleeping-hoard';

const COURT = 'fable';
const COINS = 75;

export const FABLE_ENCOUNTERS: EncounterDef[] = [
  {
    id: ENC_BEANSTALK, court: COURT, name: 'Beanstalk',
    foeName: 'Beanboy Jem', foeElement: 'growth', difficulty: 3,
    gimmick: GIM_BEANSTALK,
    at: { x: 1700, y: 560 },
    look: { body: 0xe0b894, accent: 0x4e9a36, hat: 'cap', traits: ['satchel', 'scarf'], size: 0.8, eye: 0xb8f08a },
    challenge: [
      'Traded the cow for beans, didn\'t I. Every day, by licence. I\'ve traded that cow nine hundred times.',
      'Up the stalk, down the stalk. Mind the boot. The giant never misses the matinee.',
    ],
    beaten: [
      'You climbed while the boot was busy on mine. That\'s not in the script. I think I like it better.',
      'I\'m going to plant the beans proper this year. In rows. And eat them. Imagine.',
    ],
    coins: COINS,
  },
  {
    id: ENC_GOOSE, court: COURT, name: 'Golden Goose',
    foeName: 'Goosegirl Hen', foeElement: 'fortune', difficulty: 4,
    gimmick: GIM_GOOSE,
    at: { x: 900, y: 1150 },
    look: { body: 0xf0d0b0, accent: 0xe0b04a, hat: 'straw', traits: ['apron', 'satchel'], size: 0.9, eye: 0xffe08a },
    challenge: [
      'Every egg she lays is the King\'s, and every egg I carry pays my breath. Pick one up. Go on. They\'re heavy.',
      'Mind Marigold. She can count, and she goes for whoever\'s greediest. Never been me. Yet.',
    ],
    beaten: [
      'You let me carry them all and she ran straight over me. Honked the whole way. Traitor.',
      'Marigold\'s laying for nobody now. She sat on one and hatched a gosling. A plain grey one. It\'s perfect.',
    ],
    coins: COINS,
  },
  {
    id: ENC_HUFF, court: COURT, name: 'Huff and Puff',
    foeName: 'Wolf Lupo', foeElement: 'air', difficulty: 4,
    gimmick: GIM_HUFF,
    at: { x: 1730, y: 1390 },
    look: { body: 0x8a8698, accent: 0x5a3a2a, hat: 'none', traits: ['scarf', 'beard'], size: 1.3, eye: 0xffd84a },
    challenge: [
      'Licensed to blow three houses down a day. My lungs are the only ones on Highspire nobody meters.',
      'Straw, sticks, brick. Hide where you like, little pig. The story always knows which house is next.',
    ],
    beaten: [
      'Hid behind the brick, waited for me to puff myself flat. Every pig in every version knows that. I forgot.',
      'I\'m going to help them rebuild the straw one. Properly. With a door that locks. Don\'t tell the Prince.',
    ],
    coins: COINS,
  },
  {
    id: ENC_MIRROR, court: COURT, name: 'Mirror, Mirror',
    foeName: 'Stepmother Gilt', foeElement: 'illusion', difficulty: 4,
    gimmick: GIM_MIRROR,
    at: { x: 1390, y: 640 },
    look: { body: 0xf0dcd0, accent: 0x6a3e7a, hat: 'crown', traits: ['mask', 'glasses'], size: 1.1, eye: 0xb8a4ff },
    challenge: [
      'Mirror, mirror, on the wall. It answers to me — and to the Prince, who wrote the answer. It is never me.',
      'Whoever is fairest takes the curse. Today, dear, I mean to look dreadful. Let\'s see how you hold up.',
    ],
    beaten: [
      'You kept yourself just a little more bruised than me. Every question. The mirror chose me every time.',
      'I\'ve turned it to face the wall. It asks the wall now. The wall is very fair. It doesn\'t mind.',
    ],
    coins: COINS,
  },
  {
    id: ENC_HOARD, court: COURT, name: 'Dragon\'s Hoard',
    foeName: 'Sir Galahand the Errant', foeElement: 'metal', difficulty: 4, hpMult: 1.1,
    gimmick: GIM_HOARD,
    at: { x: 560, y: 1260 },
    look: { body: 0xd8b494, accent: 0x8a8a9a, hat: 'helmet', traits: ['tool', 'beard'], size: 1.25, hand: 0x5a5a6a },
    challenge: [
      'I ride at the dragon every evening at six. She sleeps. The Prince calls it a victory. I call it a living.',
      'Take what gold you dare. But hush. Every clang wakes her a little, and she breathes on whoever is richest.',
    ],
    beaten: [
      'I filled my helm with gold and hit you right under her nose. Errant indeed. Errant is the word for it.',
      'She opened one eye at me afterward. Just looked. I think she\'s been awake the whole time, you know.',
    ],
    coins: COINS,
  },
];
