import type { EncounterDef } from '../../../../IslesTypes';

/**
 * Slickharbor's five champions — the hands who keep Prince Crude's oil moving: the woman who
 * mops the quay, the riggerman of the Nodding Field, the tarrer who caulks the barges, the
 * welder patching a tank that should have been scrapped, and the craneman who loads the Queen's
 * tanker. Beat all five and the Lamphouse Hall opens.
 */

export const ENC_SLICK = 'slickharbor-slick';
export const ENC_GUSHER = 'slickharbor-gusher';
export const ENC_TAR = 'slickharbor-tar-pit';
export const ENC_SPARK = 'slickharbor-spark-hazard';
export const ENC_CRANE = 'slickharbor-crane-hook';

export const GIM_SLICK = 'slickharbor-slick-floor';
export const GIM_GUSHER = 'slickharbor-gushers';
export const GIM_TAR = 'slickharbor-tar';
export const GIM_SPARK = 'slickharbor-sparks';
export const GIM_CRANE = 'slickharbor-crane';

const COURT = 'slickharbor';

export const SLICKHARBOR_ENCOUNTERS: EncounterDef[] = [
  {
    id: ENC_SLICK, court: COURT, name: 'Slick',
    foeName: 'Mopper Gunnel', foeElement: 'oil', difficulty: 2,
    gimmick: GIM_SLICK,
    at: { x: 700, y: 1276 },
    look: { body: 0xc89a7a, accent: 0x2e4a5a, hat: 'bandana', traits: ['apron', 'tool'], size: 1, hand: 0x1a130d },
    challenge: [
      'Forty years I\'ve mopped this quay. Never once got it clean. The Prince calls that job security.',
      'You\'ll be on your back before you know your feet have gone. Mind the rainbow, duck. I don\'t.',
    ],
    beaten: [
      'Skated me right into my own bucket. That\'s a first in forty years.',
      'Go on, then. Mind the boards by the jetty — I never got round to them, and now I won\'t.',
    ],
    coins: 55,
  },
  {
    id: ENC_GUSHER, court: COURT, name: 'Gusher',
    foeName: 'Riggerman Pitch', foeElement: 'earth', difficulty: 3,
    gimmick: GIM_GUSHER,
    at: { x: 760, y: 486 },
    look: { body: 0x8a6a52, accent: 0xc8322a, hat: 'helmet', traits: ['beard', 'tool'], size: 1.3, hand: 0x1a130d },
    challenge: [
      'Hear that? The ground\'s knocking. Every well in this field wants to come up at once.',
      'I can stamp a gusher out of the dirt where I like. Let\'s see you dance in the rain, dry-foot.',
    ],
    beaten: [
      'Capped. Me. By a stranger who\'s never held a wrench.',
      'The wells will go quiet now the Prince can\'t make me open them past safe. Good. They were tired.',
    ],
    coins: 55,
  },
  {
    id: ENC_TAR, court: COURT, name: 'Tar Pit',
    foeName: 'Tarrer Grime', foeElement: 'slime', difficulty: 3,
    gimmick: GIM_TAR,
    at: { x: 1010, y: 1132 },
    look: { body: 0x4a4038, accent: 0x121417, hat: 'cap', traits: ['apron', 'bandage'], size: 1.1, hand: 0x121417, eye: 0xffd27a },
    challenge: [
      'Every barge the Queen floats gets three coats from my ladle. Stick to it. That\'s the trade.',
      'Hold still, would you? Hot tar\'s kinder when you don\'t thrash. Not much kinder.',
    ],
    beaten: [
      'You pulled clear. Most folk leave a boot behind. Some leave the foot.',
      'I\'ll let the kettles go cold tonight. First time since the last Queen\'s birthday.',
    ],
    coins: 55,
  },
  {
    id: ENC_SPARK, court: COURT, name: 'Spark Hazard',
    foeName: 'Welder Sputz', foeElement: 'electricity', difficulty: 3,
    gimmick: GIM_SPARK,
    at: { x: 2005, y: 1096 },
    look: { body: 0xb08a6a, accent: 0x3a3e44, hat: 'goggles', traits: ['tool', 'scarf'], size: 0.95, eye: 0xbfe8ff },
    challenge: [
      'They\'ve got me welding a crude tank with crude still in it. Every spark\'s a prayer, love.',
      'Stand in the oil if you like. I\'ll just keep working. Something\'s bound to catch.',
    ],
    beaten: [
      'You put me out. Literally. Thank you. Me eyebrows had it coming.',
      'I\'m not lighting that torch again until somebody drains this tank. Tell the Prince I said so.',
    ],
    coins: 55,
  },
  {
    id: ENC_CRANE, court: COURT, name: 'Crane Hook',
    foeName: 'Craneman Hoyle', foeElement: 'magnet', difficulty: 4, hpMult: 1.1,
    gimmick: GIM_CRANE,
    at: { x: 1650, y: 1166 },
    look: { body: 0x9a7a62, accent: 0xc8322a, hat: 'helmet', traits: ['glasses', 'pack'], size: 1.15, eye: 0xd8f0ff },
    challenge: [
      'Thirty tonne on the hook and a magnet on the cab. I can put a crate on a penny from up there.',
      'You want the Lamphouse? You\'ll have to cross my yard while the load\'s swinging. Look up, mind.',
    ],
    beaten: [
      'Ha! You used my own crates. I stacked those. I stacked them for YOU, it turns out.',
      'Load\'s down. Jib\'s parked. The tanker can sail itself to the Queen for all I care.',
    ],
    coins: 55,
  },
];
