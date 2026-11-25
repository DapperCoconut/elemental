import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { HELIOGRAPH } from './heliograph';
import { SHORT_MEASURE } from './shortMeasure';
import { FOOTPRINTS } from './footprints';
import { ORRERY } from './orrery';
import { BURNING_GLASS } from './burningGlass';

/**
 * The Corona Court's Fallen Five — the people the King's telling puts on Prince Flux's side:
 * the signaller who sent the palace its addresses, the clerk who metered the warmth, the runner
 * who never ran for the rebels, the tutor who taught the prince the heavens were property, and
 * the lensman who focused the sun on the condemned. Ember-gold eyes, double the court's coins.
 */
export const FALLEN: FallenBundle = {
  encounters: [
    {
      id: fallenId('corona', 'heliograph'),
      court: 'corona',
      gimmick: fallenId('corona', 'heliograph'),
      name: 'The Garbled Address',
      foeName: 'Signaller Wren',
      foeElement: 'subterfuge',
      difficulty: 4,
      hpMult: 1.1,
      at: { x: 450, y: 1440 },
      look: { body: 0xd8c4a8, accent: 0x3d5a58, hat: 'cap', traits: ['satchel', 'glasses', 'tool'], size: 0.9, eye: 0xffa040 },
      challenge: [
        'I flash the palace where you stand. The palace answers. That is all signalling ever was.',
        'Three short, two long — your address. I have sent worse people to better light.',
        'Do not touch the tripod. It is calibrated. I am calibrated. Everything here is calibrated.',
      ],
      beaten: [
        'The mirror is showing me… only weather. I sent weather reports. Rain over the rim. Clear by noon.',
        'Nobody ever answered. I flashed the sky for nine years and the sky never once answered.',
      ],
      coins: 110,
    },
    {
      id: fallenId('corona', 'short-measure'),
      court: 'corona',
      gimmick: fallenId('corona', 'short-measure'),
      name: 'Metered Warmth',
      foeName: 'Meter-Reader Pell',
      foeElement: 'fortune',
      difficulty: 4,
      hpMult: 1.15,
      at: { x: 1640, y: 330 },
      look: { body: 0xe0c8a0, accent: 0xc8963a, hat: 'tophat', traits: ['book', 'glasses', 'satchel'], eye: 0xffa040 },
      challenge: [
        'Your allowance of light is on the dial. Stand in it while it lasts. I will tell you when it doesn\'t.',
        'Every household gets its measure. Some households measure short. That is arithmetic, not cruelty.',
        'The audit is never late. I have checked. Twice. Once for each of us.',
      ],
      beaten: [
        'I wrote the readings down… for the cottages. So they could argue with the palace. I think I did.',
        'Ninety-one units, the Coldwells. I gave them ninety-one and wrote down sixty. Was that me?',
      ],
      coins: 110,
    },
    {
      id: fallenId('corona', 'footprints'),
      court: 'corona',
      gimmick: fallenId('corona', 'footprints'),
      name: 'Footprints in the Glass',
      foeName: 'Runner Annis',
      foeElement: 'dune',
      difficulty: 5,
      hpMult: 1.2,
      at: { x: 2150, y: 820 },
      look: { body: 0xc8a070, accent: 0x7a2a10, hat: 'bandana', traits: ['scarf', 'pack'], size: 0.95, eye: 0xffa040 },
      challenge: [
        'The rebels asked me to run for them once. I ran to the palace instead. It was a shorter run.',
        'Hot day. The glass remembers every step. Mine will be all round you before you take yours.',
        'Keep up. Or stand still and let the floor set round your ankles. Either way I win the race.',
      ],
      beaten: [
        'My feet know the way to the rim cottages. Every crack of it. Why would they know that?',
        'I carried letters at night. Not to the palace. Away from it. I… did run. I did.',
        'Look at the glass. Two sets of prints, going the same way. That\'s how it really went.',
      ],
      coins: 110,
    },
    {
      id: fallenId('corona', 'orrery'),
      court: 'corona',
      gimmick: fallenId('corona', 'orrery'),
      name: 'The Orrery Lesson',
      foeName: 'Master Almagest',
      foeElement: 'astra',
      difficulty: 5,
      hpMult: 1.2,
      at: { x: 250, y: 980 },
      look: { body: 0xd9cdb4, accent: 0x5a1fa8, hat: 'wizard', traits: ['book', 'beard', 'cane'], size: 1.05, eye: 0xffa040 },
      challenge: [
        'I taught the boy that the heavens are clockwork, and clockwork belongs to whoever winds it.',
        'Today\'s lesson is conjunction. Two bodies, one line. Try not to be the third body.',
        'You may touch the planets. Every pupil does. Few of them understand what they have moved.',
      ],
      beaten: [
        'I taught him the stars were free. That nobody owns a sky. He did not listen. I remember now.',
        'They put me out on the rim for it. I counted meteors. One night I counted yours, I think.',
      ],
      coins: 110,
    },
    {
      id: fallenId('corona', 'burning-glass'),
      court: 'corona',
      gimmick: fallenId('corona', 'burning-glass'),
      name: 'The Lensman\'s Sentence',
      foeName: 'Lensman Grath',
      foeElement: 'radiation',
      difficulty: 5,
      hpMult: 1.3,
      at: { x: 1520, y: 1010 },
      look: { body: 0x9a8a7a, accent: 0x1c1420, hat: 'goggles', traits: ['apron', 'tool', 'brand'], size: 1.3, eye: 0xffa040 },
      challenge: [
        'Cold hearth, warm sentence. The lens is ground true. I ground it myself.',
        'Six mirrors. One sun. Turn as many as you like — the light always arrives somewhere.',
        'Stand still for the Sentence. It is the last courtesy the court extends.',
      ],
      beaten: [
        'I ground spectacle lenses for Brightwell\'s. Children reading under the lamps, that was my work.',
        'A burning-glass? I never… I would not know where to point one. I only ever helped people see.',
      ],
      coins: 110,
    },
  ],
  gimmicks: [HELIOGRAPH, SHORT_MEASURE, FOOTPRINTS, ORRERY, BURNING_GLASS],
};
