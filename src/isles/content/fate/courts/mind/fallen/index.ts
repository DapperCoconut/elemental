import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_CABINET } from './cabinet';
import { FALLEN_CHECK } from './check';
import { FALLEN_CORD } from './cord';
import { FALLEN_PIN } from './pin';
import { FALLEN_SENDING } from './sending';

/**
 * The Mind Court's Fallen Five — in the star's telling, the mentalists who did the House's
 * checking: the Arbiter who chose the busted pieces' squares, the cabinet-medium whose trumpet
 * named the bluffers, the Sender who decided which readers failed, the wrist-reader who found the
 * Lots families hid from the Draw, and the trance-medium who walked into gamblers' houses at night.
 * Tier 3: difficulty 4,4,5,5,5; coins double the court's 125. They stand where the court's own
 * five never do: the west lawn, the far east of the booth road, the north lawn, the sea wall's
 * east end and the quiet ground north of the plaza.
 */

const EYE = 0xffa040;
const COINS = 250;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_CABINET, FALLEN_SENDING, FALLEN_CHECK, FALLEN_PIN, FALLEN_CORD],
  encounters: [
    {
      id: fallenId('mind', 'cabinet'),
      court: 'mind',
      name: 'The Spirit Cabinet',
      foeName: 'Jubal Fother, Cabinet-Medium',
      foeElement: 'sound',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('mind', 'cabinet'),
      at: { x: 300, y: 1150 },
      look: { body: 0xd0b8a0, accent: 0x6c4628, hat: 'none', traits: ['beard', 'scarf'], size: 1.15, eye: EYE },
      challenge: [
        'Tie me tight, sir. Tighter. The spirits only play for a man who could not possibly be playing.',
        'Tonight the trumpet speaks. It says a name, and the House writes it down. It said yours on the way in.',
        'Step into the cabinet, if you like. We can share it. One of us will be exposed.',
      ],
      beaten: [
        'The knots... I tied them myself. With my teeth. Everyone knew. It was the best part, everyone laughing.',
        'I played the tambourine with my foot for children on Séance Row. I never named anybody. Did I?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('mind', 'sending'),
      court: 'mind',
      name: 'The Sending',
      foeName: 'Sender Zillah Pocklington',
      foeElement: 'chalk',
      difficulty: 4,
      gimmick: fallenId('mind', 'sending'),
      at: { x: 2200, y: 620 },
      look: { body: 0xe0d0c0, accent: 0x5e2672, hat: 'beret', traits: ['glasses', 'satchel'], size: 1, eye: EYE },
      challenge: [
        'Circle, cross, waves, square, star. Five cards. A reader who cannot see them through a screen is a fraud.',
        'Frauds are struck off. I keep the tally. Below chance is below chance, dear. The House is very fair.',
        'I am thinking of a card now. You will know which in a moment. Everyone always does, in the end.',
      ],
      beaten: [
        'Star. It was star. You moved before I finished it... nobody has ever moved before I finished it.',
        'I taught the little ones their shapes with these. Circle, cross. Chalk on the step. That was all I did.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('mind', 'check'),
      court: 'mind',
      name: 'Discovered Check',
      foeName: 'Arbiter Septimus Thorley',
      foeElement: 'justice',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('mind', 'check'),
      at: { x: 850, y: 300 },
      look: { body: 0xd8c8b0, accent: 0x221d27, hat: 'wig', traits: ['glasses', 'book'], size: 1.1, eye: EYE },
      challenge: [
        'A piece stands where it is put. I put them. I have put four hundred busted men on the Prince\'s squares.',
        'When one is taken, I say "taken", and he is carried off the board. The rules are older than both of us.',
        'You are the white king, I am afraid. It is a poor piece. It can only ever run one square.',
      ],
      beaten: [
        'Check... and mate, I suppose. Odd. I never called mate on anyone. I only kept the clocks for the club.',
        'Saturday chess under the lamps. Pawns and a pot of tea. Who put men on those squares? Not me. Not me.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('mind', 'pin'),
      court: 'mind',
      name: 'Hot and Cold',
      foeName: 'Wrist-Reader Amity Treffry',
      foeElement: 'hunt',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('mind', 'pin'),
      at: { x: 2050, y: 1440 },
      look: { body: 0xd4c0a8, accent: 0x2a8a50, hat: 'coif', traits: ['scarf', 'bandage'], size: 1, eye: EYE },
      challenge: [
        'Give me your wrist. No? It doesn\'t matter. I can hear it from here. You\'re warmer than you think.',
        'Every Lot hidden from the Draw, I found. Under floors, in loaves, sewn in a doll. The pulse always jumps.',
        'There is a pin in this yard. You do not know where. Your heart does. Let us see whose heart is louder.',
      ],
      beaten: [
        'Your pulse is so steady now. Mine is not. I found... lost rings. Lost children\'s shoes. Didn\'t I?',
        'Old Mrs Ambery\'s spectacles, every week, in the bread bin. That is what I found. I am nearly sure.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('mind', 'cord'),
      court: 'mind',
      name: 'Out of Body',
      foeName: 'Trance-Medium Zenobia Kellaway',
      foeElement: 'death',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId('mind', 'cord'),
      at: { x: 1450, y: 250 },
      look: { body: 0xe8dce8, accent: 0x361445, hat: 'headwrap', traits: ['scarf', 'lantern'], size: 0.95, eye: EYE },
      challenge: [
        'I was in your room last night. Under the bed, a satchel. Behind the stove, a purse. You sleep very still.',
        'The House likes to know where a stake is hidden before the wager. I go and look. It costs me nothing.',
        'Excuse me if I sit down. I am going to leave for a moment. Do not touch the cord. Please.',
      ],
      beaten: [
        'I came back so fast. Was I ever gone? I sat with the dying on Séance Row. I held their hands. Only that.',
        'They asked me to walk with them a little way, at the end. I never went into anyone\'s house. I was asked.',
      ],
      coins: COINS,
    },
  ],
};
