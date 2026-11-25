import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_BURN_OFF } from './burnOff';
import { FALLEN_UNDER_THE_SLICK } from './diver';
import { FALLEN_QUEENS_LAMPS } from './lamps';
import { FALLEN_PRESSURE_MAIN } from './pressureMain';
import { FALLEN_SHORT_WEIGHT } from './shortWeight';

/**
 * Slickharbor's Fallen Five — in the star's telling, the oil port's people who kept the tithe
 * flowing for Prince Crude: the gauger at the Weighhouse scale, the lamplighter of the Long Quay,
 * the crown's diver (Fenwick Reed, who in this telling never retired), the flareman who burns off
 * what the Queen doesn't want, and the valveman who ran the main past safe. Tier 2: difficulty
 * 4,4,4,5,5; coins double the court's 55. They stand on open ground clear of the court's own five:
 * below the Nodding Field by the Weighhouse, the tank-farm road, the quay east of the galley, the
 * yard by the east road, and the north yard under the cracking tower.
 */

const EYE = 0xffa040;
const COURT = 'slickharbor';

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_SHORT_WEIGHT, FALLEN_QUEENS_LAMPS, FALLEN_UNDER_THE_SLICK, FALLEN_BURN_OFF, FALLEN_PRESSURE_MAIN],
  encounters: [
    {
      id: fallenId(COURT, 'short-weight'),
      court: COURT,
      name: 'Short Weight',
      foeName: 'Gauger Prudence Tallow',
      foeElement: 'metal',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId(COURT, 'short-weight'),
      at: { x: 860, y: 590 },
      look: { body: 0xd0a888, accent: 0x5a4a1a, hat: 'tophat', traits: ['glasses', 'book'], size: 1.0, hand: 0x3a2a10, eye: EYE },
      challenge: [
        'The scale does not lie, dear. It only leans. It leans toward whoever is short.',
        'A barrel a head. Your head is light. I can see it from here.',
        'Step up onto the pan. Everyone steps up onto the pan eventually.',
      ],
      beaten: [
        'The needle... I used to weigh fish. Herring for the Brine Oven. Fair weight, always fair.',
        'Whose thumb was that on the beam? Not mine. I am almost sure it was not mine.',
      ],
      coins: 110,
    },
    {
      id: fallenId(COURT, 'queens-lamps'),
      court: COURT,
      name: 'The Queen\'s Lamps',
      foeName: 'Lamplighter Winifred Gill',
      foeElement: 'light',
      difficulty: 4,
      gimmick: fallenId(COURT, 'queens-lamps'),
      at: { x: 1620, y: 960 },
      look: { body: 0xe0c0a0, accent: 0x2a2a30, hat: 'cap', traits: ['lantern', 'scarf'], size: 0.95, eye: EYE },
      challenge: [
        'Thirty years on the Long Quay and not one lamp out. The Queen sends her thanks every winter.',
        'Your oil is in that glass, you know. Doesn\'t it burn beautifully?',
        'Stand in the light, love. It\'s the only place you\'ll be seen.',
      ],
      beaten: [
        'The lamps are out. It\'s dark, and... there are stars. I had forgotten there were stars here.',
        'I lit the lamps so the drowned-row children could find their way home. That was why. Wasn\'t it?',
      ],
      coins: 110,
    },
    {
      id: fallenId(COURT, 'under-the-slick'),
      court: COURT,
      name: 'Under the Slick',
      foeName: 'Fenwick Reed, Crown Diver',
      foeElement: 'depths',
      difficulty: 4,
      hpMult: 1.15,
      gimmick: fallenId(COURT, 'under-the-slick'),
      at: { x: 900, y: 1250 },
      look: { body: 0xc0a090, accent: 0x7a5418, hat: 'diving', traits: ['pack', 'rod'], size: 1.15, eye: EYE },
      challenge: [
        'Every house the Queen leaves under, I go down after. Deeds, silver, the family clock. All tithe.',
        'Retire? Why would I retire. The Bell and I have never been so busy.',
        'Mind your boots, swimmer. I come up underneath.',
      ],
      beaten: [
        'I went down for the Gallons\' clock. I brought it back to Nell. To Nell, not the Prince. Didn\'t I?',
        'The air tastes of brass. It always tasted of brass. I just... never dove for the crown. Never.',
      ],
      coins: 110,
    },
    {
      id: fallenId(COURT, 'burn-off'),
      court: COURT,
      name: 'Burn-Off',
      foeName: 'Flareman Ossian Pyle',
      foeElement: 'fire',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId(COURT, 'burn-off'),
      at: { x: 2060, y: 900 },
      look: { body: 0x8a6a56, accent: 0x8a3e1e, hat: 'helmet', traits: ['bandage', 'beard', 'tool'], size: 1.25, hand: 0x121417, eye: EYE },
      challenge: [
        'What the Queen can\'t use goes in my pit. Gas. Ledgers. Petitions. Front doors.',
        'The flame goes round like a clock. You\'ll learn to tell time by it. Briefly.',
        'Keep moving, little ember. Everything that stands still out here gets burnt off.',
      ],
      beaten: [
        'I burned off the gas so it wouldn\'t blow the field. That was the job. Only the gas.',
        'Petitions... I never burned a petition. I signed one. I think I signed one.',
      ],
      coins: 110,
    },
    {
      id: fallenId(COURT, 'pressure-main'),
      court: COURT,
      name: 'Pressure Main',
      foeName: 'Valveman Corliss Haggard',
      foeElement: 'pressure',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId(COURT, 'pressure-main'),
      at: { x: 1500, y: 300 },
      look: { body: 0x9a7a62, accent: 0xc8322a, hat: 'goggles', traits: ['tool', 'apron', 'beard'], size: 1.3, hand: 0x1a130d, eye: EYE },
      challenge: [
        'The Prince wanted the tithe faster. So the line runs past safe. Line\'s fine. Line\'s always fine.',
        'Hear that hiss? That\'s money, that is. Stand anywhere you like.',
        'Welders said the joints would go. They\'re not welders any more.',
      ],
      beaten: [
        'I shut the line down. Didn\'t I? The night Sputz said the joints were weeping. I shut it down.',
        'Past safe... no. I never once ran it past safe. They hated me for it. They were alive to hate me.',
      ],
      coins: 110,
    },
  ],
};
