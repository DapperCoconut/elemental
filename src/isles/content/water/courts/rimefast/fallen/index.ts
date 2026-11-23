import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_TITHE_WINCH } from './titheWinch';
import { FALLEN_THAW_LEDGER } from './thawLedger';
import { FALLEN_LIKENESS } from './likeness';
import { FALLEN_SKIP_SHOT } from './skipShot';
import { FALLEN_ROLL_CALL } from './rollCall';

/**
 * The Rimefast Court's Fallen Five — in the star's telling, the people of the frozen harbour who
 * kept the Thaw Tithe for the crown: the winchman over the Tithe Hole, the clerk of the ledger,
 * the Prince's limner, the revenue cutter's gunner, and the crier who read the drowned's names.
 * Tier 3: difficulty 4,4,5,5,5; coins about double the court's 70. They stand on open ground the
 * court's own five never use: east of the Tithe Hole, the south-west quay by the market, the
 * north-west quay under the gallery, the south quay before the warehouses, and the sealed street.
 */

const EYE = 0xffa040;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_TITHE_WINCH, FALLEN_THAW_LEDGER, FALLEN_LIKENESS, FALLEN_SKIP_SHOT, FALLEN_ROLL_CALL],
  encounters: [
    {
      id: fallenId('rimefast', 'tithe-winch'),
      court: 'rimefast',
      name: 'The Tithe Winch',
      foeName: 'Winchman Abel Sounding',
      foeElement: 'string',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('rimefast', 'tithe-winch'),
      at: { x: 1860, y: 570 },
      look: { body: 0xb8a090, accent: 0x1f6a70, hat: 'souwester', traits: ['beard', 'tool'], size: 1.25, eye: EYE },
      challenge: [
        'Nobody made me take the winch. I asked. Steady hands, the Prince said. Steady hands and no questions.',
        'They go down gentle, mostly. The cold does the arguing for them. I just keep the rope tidy.',
        'The hook takes the first one it finds. I only throw it. Mind you stand where you mean to.',
      ],
      beaten: [
        'Wait. The winch… I hauled the fishing nets with that winch. Smelt, and herring. Wasn\'t it nets?',
        'I never let a soul down that hole. I pulled the Augur boy OUT of one. I remember his hand on the rope.',
      ],
      coins: 140,
    },
    {
      id: fallenId('rimefast', 'thaw-ledger'),
      court: 'rimefast',
      name: 'The Thaw Ledger',
      foeName: 'Tithe-Clerk Ossery Penn',
      foeElement: 'fortune',
      difficulty: 4,
      hpMult: 1.05,
      gimmick: fallenId('rimefast', 'thaw-ledger'),
      at: { x: 790, y: 1160 },
      look: { body: 0xd8c0a8, accent: 0x1f6a70, hat: 'earmuffs', traits: ['glasses', 'book', 'scarf'], size: 0.95, eye: EYE },
      challenge: [
        'Warmth is a service. Services are invoiced. I have your page open already — you were cold on arrival.',
        'Every spark you strike is a line in my book. Six lines and the ice comes up to collect.',
        'Coins on the floor, if you can stoop for them. I find people rarely can, in the end.',
      ],
      beaten: [
        'The ledger… it was the school register. Names and birthdays. Who had chilblains. Who needed boots.',
        'I never charged a soul for a fire. I think I paid for Widow Firth\'s coal. Two winters. Didn\'t I?',
      ],
      coins: 140,
    },
    {
      id: fallenId('rimefast', 'likeness'),
      court: 'rimefast',
      name: 'Taken in Likeness',
      foeName: 'Limner Aurelie Frane',
      foeElement: 'echo',
      difficulty: 5,
      gimmick: fallenId('rimefast', 'likeness'),
      at: { x: 840, y: 520 },
      look: { body: 0xe0c8b8, accent: 0x4f94b8, hat: 'beret', traits: ['satchel', 'tool'], size: 1.0, eye: EYE },
      challenge: [
        'Hold still. No — don\'t. I have you already. I had you the moment you stepped off the road.',
        'The Prince keeps a face for every name. I carve the ones who argue. They make the best witnesses.',
        'Your likenesses will speak against you. They always tell the truth. Mine is a very honest chisel.',
      ],
      beaten: [
        'My chisel… I carved the harbour children\'s snowmen. Big ones. With carrot noses. That was all.',
        'I drew faces so the families could keep them. Not for files. Never for files. I think.',
      ],
      coins: 150,
    },
    {
      id: fallenId('rimefast', 'skip-shot'),
      court: 'rimefast',
      name: 'Skip Shot',
      foeName: 'Gunner Merriwether Coyle',
      foeElement: 'gunpowder',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('rimefast', 'skip-shot'),
      at: { x: 1380, y: 1360 },
      look: { body: 0xb08868, accent: 0x343a42, hat: 'tricorn', traits: ['eyepatch', 'pack'], size: 1.2, eye: EYE },
      challenge: [
        'Warning shots, they call them. I gave three winters of warnings. Nobody ever learned to read them.',
        'Round shot skips on ice like a stone on a pond. Watch where it lands. Not where it flies.',
        'Bat one back if you\'ve the nerve. The revenue service admires nerve. Briefly.',
      ],
      beaten: [
        'I fired the noon gun. Just the noon gun, so the harbour knew to eat. Blank charge. Always blank.',
        'Warning shots… I fired them wide. Every one of them, wide. Didn\'t I? I\'m nearly sure I did.',
      ],
      coins: 150,
    },
    {
      id: fallenId('rimefast', 'roll-call'),
      court: 'rimefast',
      name: 'Roll Call Under Ice',
      foeName: 'Bailiff-Crier Wendle Moss',
      foeElement: 'death',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('rimefast', 'roll-call'),
      at: { x: 600, y: 500 },
      look: { body: 0xc8b8a8, accent: 0x2c2420, hat: 'cowl', traits: ['lantern', 'cane'], size: 1.1, eye: EYE },
      challenge: [
        'I have the finest voice on the quay. The Prince says the drowned can hear it through the ice.',
        'They come when I call them. Every name answers. You\'ll answer too, when I reach the bottom of the page.',
        'Keep warm, if you like. They do so love the warm ones.',
      ],
      beaten: [
        'The names… I read them at the harbour vigil. So they wouldn\'t be forgotten. I read them to bring them back.',
        'Flurry Ashlock gave me the list. We stood on the quay together. I wasn\'t calling them. I was missing them.',
      ],
      coins: 150,
    },
  ],
};
