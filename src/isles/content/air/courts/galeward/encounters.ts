import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { BREATH_METER } from './gimmicks/breathMeter';
import { CROSSWIND } from './gimmicks/crosswind';
import { KITE_FIGHT } from './gimmicks/kiteFight';
import { UPDRAFT } from './gimmicks/updraft';
import { WINDMILL } from './gimmicks/windmill';

/**
 * The Galeward Court's five champions — the working people of the mill town, each pressed into
 * collecting the Breath Tax for Prince Zephyr in their own trade. Tier 1 of Highspire
 * (difficulty 3,3,3,3,4). Up Vane Street from Windlass you meet Puffin at the toll-bellows; Tilly
 * on the west road among the windsocks; Thresh under the Grindstone on Mill Row; Oriel across the
 * rope bridges on the Kite Field; and Swift out on the Leap, where the spire breathes up through
 * the vents.
 */

export const GALEWARD_GIMMICKS: GimmickDef[] = [CROSSWIND, KITE_FIGHT, WINDMILL, BREATH_METER, UPDRAFT];

const COINS = 65;

export const GALEWARD_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'galeward-crosswind',
    court: 'galeward',
    name: 'Crosswind',
    foeName: 'Windsock Tilly',
    foeElement: 'air',
    difficulty: 3,
    gimmick: 'galeward-crosswind',
    at: { x: 330, y: 960 },
    look: { body: 0xe8cfb4, accent: 0xe8642a, hat: 'aviator', traits: ['scarf', 'satchel'], size: 0.9, eye: 0xcde9fb },
    challenge: [
      'Wind\'s from the west. No — sou\'-west. Give it a breath. There. WEST. I read the socks for the Prince.',
      'Every gust that crosses Galeward gets written in my book, and every lungful taken in it gets billed.',
      'You\'re standing downwind of me. That\'s the only thing you need to know about this.',
    ],
    beaten: [
      'You kept getting round me. Nobody gets round me. I was born facing into it.',
      'Wind\'s from the east, now. Funny. It never comes from the east. Go on — it\'s at your back.',
    ],
    coins: COINS,
  },
  {
    id: 'galeward-kite-fight',
    court: 'galeward',
    name: 'Kite Fight',
    foeName: 'Kiteflyer Oriel',
    foeElement: 'string',
    difficulty: 3,
    gimmick: 'galeward-kite-fight',
    at: { x: 2080, y: 1290 },
    look: { body: 0xd8b494, accent: 0xc8402e, hat: 'plume', traits: ['scarf', 'tool'], size: 1, eye: 0xf4d68e },
    challenge: [
      'Every child in Galeward flies a kite. The Prince taxes the line by the yard — air it holds up is air it uses.',
      'So I fly the Prince\'s kites now. Glass on the line. I cut the strings of anyone flying without a meter-stamp.',
      'Five posts in the field. I\'ve been to all five before you\'ve found your feet.',
    ],
    beaten: [
      'Cut out of my own sky. I used to cry when that happened. I\'m not crying. It\'s the wind.',
      'Take a post next time you\'re passing. Fly something. Don\'t tell me what colour.',
    ],
    coins: COINS,
  },
  {
    id: 'galeward-windmill',
    court: 'galeward',
    name: 'Windmill',
    foeName: 'Miller Thresh',
    foeElement: 'earth',
    difficulty: 3,
    hpMult: 1.05,
    gimmick: 'galeward-windmill',
    at: { x: 540, y: 800 },
    look: { body: 0xc8a888, accent: 0xf6f0e2, hat: 'cap', traits: ['apron', 'beard'], size: 1.3, eye: 0xd8b46a },
    challenge: [
      'The Grindstone turns on Galeward\'s wind, and every turn of her is metered. Wind into the sails is wind owed.',
      'So I pay the Prince in flour. Every sack. My children eat the chaff and the King breathes easy.',
      'Mind her sails. She doesn\'t know you, and she doesn\'t know me either, for all the years I\'ve fed her.',
    ],
    beaten: [
      'You hid behind my own sacks and let her split them. That was a season\'s flour. Clever. Expensive.',
      'Go on, then. I\'ll sweep it up. Somebody might as well eat it.',
    ],
    coins: COINS,
  },
  {
    id: 'galeward-breath-meter',
    court: 'galeward',
    name: 'Breath Meter',
    foeName: 'Meter-Man Puffin',
    foeElement: 'technology',
    difficulty: 3,
    gimmick: 'galeward-breath-meter',
    at: { x: 1310, y: 1440 },
    look: { body: 0xe0c8b0, accent: 0xd2a446, hat: 'tophat', traits: ['glasses', 'book', 'satchel'], size: 0.95, eye: 0x9fe2ff },
    challenge: [
      'Arrival from Windlass. Unmetered. Unmetered! You\'ve been breathing our air all the way up the street.',
      'Every breath above the cloud line is the King\'s. I read the meters. I cork the debt. It\'s only arithmetic.',
      'Buckle this on. Now we\'ll both find out exactly what you can afford.',
    ],
    beaten: [
      'My needle\'s in the red. I\'ve never seen my own needle in the red. Is it always this bad? For everyone?',
      'Your meter reads… I can\'t read it. I don\'t want to read it. Go up the street.',
    ],
    coins: COINS,
  },
  {
    id: 'galeward-updraft',
    court: 'galeward',
    name: 'Updraft',
    foeName: 'Glider Swift',
    foeElement: 'light',
    difficulty: 4,
    hpMult: 1.05,
    gimmick: 'galeward-updraft',
    at: { x: 2020, y: 640 },
    look: { body: 0xf0dcc4, accent: 0xe0a02a, hat: 'aviator', traits: ['pack', 'scarf'], size: 0.95, eye: 0xfff2b0 },
    challenge: [
      'The Leap. Where the spire breathes out. I ride it all day, carrying the Prince\'s post down the cliffs.',
      'He taxes the updraft too. I pay for every lift out of what they pay me to fly. It comes out about even.',
      'Step on a vent when it blows. Then look down. Then try to be where I\'m not landing.',
    ],
    beaten: [
      'You came down on me out of a clear sky. That\'s my move! That\'s been my move for nine years!',
      'Keep your eyes on the shadows. Up here the shadow\'s always first.',
    ],
    coins: COINS,
  },
];
