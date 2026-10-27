import type { EncounterDef } from '../../../../IslesTypes';

/**
 * The Wildhunt's five champions — the household of Prince Fang's hunt: the huntmaster who runs
 * the pack, the keeper of the deer park's great stag, the woman who weaves the hides, the
 * horn-blower who calls the hunt across the whole forest, and the Prince's falconer. Every one
 * of them has ridden on a Quarry Run — the Empress's hunt, where the quarry is a family that came
 * up short at the Bloom Tithe. Beat all five and the gates of Fangholt open.
 */

export const ENC_QUARRY = 'wildhunt-quarry';
export const ENC_STAG = 'wildhunt-stag-rut';
export const ENC_BLINDS = 'wildhunt-hunting-blinds';
export const ENC_HORN = 'wildhunt-horn-call';
export const ENC_FALCON = 'wildhunt-falconry';

export const GIM_QUARRY = 'wildhunt-scent-trail';
export const GIM_STAG = 'wildhunt-rutting-stag';
export const GIM_BLINDS = 'wildhunt-reed-blinds';
export const GIM_HORN = 'wildhunt-horn-echo';
export const GIM_FALCON = 'wildhunt-falcon-stoop';

const COURT = 'wildhunt';

export const WILDHUNT_ENCOUNTERS: EncounterDef[] = [
  {
    id: ENC_QUARRY, court: COURT, name: 'Quarry',
    foeName: 'Huntmaster Bracken', foeElement: 'hunt', difficulty: 3,
    gimmick: GIM_QUARRY,
    at: { x: 1560, y: 905 },
    look: { body: 0xc89a78, accent: 0x8a2a1e, hat: 'cap', traits: ['beard', 'satchel'], size: 1.15, hand: 0x3e2a1a },
    challenge: [
      'You smell like somebody who\'s never been chased. Let\'s fix that. The pack\'s been fed on worse.',
      'Run, quarry. The hounds don\'t care whose feet they follow. Only that the feet are fresh.',
    ],
    beaten: [
      'You washed yourself off in my own ford and let them have my scent. Thirty years. Never once.',
      'Pack\'s lying down. Won\'t get up for me. Maybe they never liked the work either.',
    ],
    coins: 65,
  },
  {
    id: ENC_STAG, court: COURT, name: 'Stag Rut',
    foeName: 'Antlered Rowan', foeElement: 'earth', difficulty: 3,
    gimmick: GIM_STAG,
    at: { x: 1000, y: 1300 },
    look: { body: 0x9a7254, accent: 0x2a4a2a, hat: 'antlers', traits: ['tool', 'scarf'], size: 1.25, hand: 0x3e2a1a },
    challenge: [
      'The old king of the park\'s in rut. He goes for whoever strikes last. Strike me if you dare.',
      'I\'ve kept him nine seasons. He\'s gored three hunters. The Prince calls that "character".',
    ],
    beaten: [
      'You stood your ground between the oaks and let him ram his own rack into the bark. Clever.',
      'He\'s grazing now. Look at him. Like none of it happened. I envy him that.',
    ],
    coins: 65,
  },
  {
    id: ENC_BLINDS, court: COURT, name: 'Hunting Blinds',
    foeName: 'Blindkeeper Fern', foeElement: 'illusion', difficulty: 3,
    gimmick: GIM_BLINDS,
    at: { x: 1640, y: 1400 },
    look: { body: 0xd8b494, accent: 0x5a6a2e, hat: 'hood', traits: ['mask', 'pack'], size: 0.95, eye: 0xd8f0a0 },
    challenge: [
      'I weave the hides the Prince shoots from. Reed and willow. You won\'t know you\'re in front of one.',
      'Step inside and the world forgets you. Step out and you\'d better make it count. I always do.',
    ],
    beaten: [
      'You found my false hide and walked straight round it. Nobody sees through my weave. You did.',
      'I\'ll weave baskets now. Plain ones. Nothing anyone can hide a crossbow in.',
    ],
    coins: 65,
  },
  {
    id: ENC_HORN, court: COURT, name: 'Horn Call',
    foeName: 'Halloo the Horn-Blower', foeElement: 'echo', difficulty: 4,
    gimmick: GIM_HORN,
    at: { x: 1290, y: 380 },
    look: { body: 0xb88a68, accent: 0x8a2a1e, hat: 'tricorn', traits: ['beard', 'scarf'], size: 1.3, hand: 0x5a3a20 },
    challenge: [
      'My horn calls the hunt from the Ossuary to the sea. The trees call it back. Twice the noise, see.',
      'Listen for the echo, stranger. Everyone forgets the echo. It\'s what gets them in the back.',
    ],
    beaten: [
      'You stood in the gap the old oaks leave, and the echo took me instead. Never been hit by my own call.',
      'I\'ll keep the horn. I\'ll blow it for weddings. Long, low ones. No more halloo.',
    ],
    coins: 65,
  },
  {
    id: ENC_FALCON, court: COURT, name: 'Falconry',
    foeName: 'Falconer Kestrel', foeElement: 'air', difficulty: 4, hpMult: 1.1,
    gimmick: GIM_FALCON,
    at: { x: 2040, y: 1085 },
    look: { body: 0xc8a486, accent: 0x3a3226, hat: 'hood', traits: ['glasses', 'satchel'], size: 1, eye: 0xffd84a },
    challenge: [
      'Sloe has the sharpest eyes on Thornwild. When I point, she stoops. She has never once missed.',
      'Find your shade, if you can. Most of the quarry run the open ground. They never think to look up.',
    ],
    beaten: [
      'You hid under the oak and she took the nearest thing she could see. Me. She\'s sorry. I\'m not.',
      'I\'ll fly her for rabbits. Real rabbits. She seemed so pleased when I said it.',
    ],
    coins: 65,
  },
];
