import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_ACTIVATION } from './activation';
import { FALLEN_CALUTRON } from './calutron';
import { FALLEN_DAUGHTERS } from './daughters';
import { FALLEN_RIPPLE } from './ripple';
import { FALLEN_WALDO } from './waldo';

/**
 * The Halflife Court's Fallen Five — in the star's telling, the people of the glowing town who
 * worked the Prince's machines on the town itself: the tongsman of the Rod Store, the warden of the
 * neutron source, the chain-reader at the assay table, the separator under the dome, and the
 * shot-firer of the pits. Tier 3: difficulty 4,4,5,5,5; coins double the court's 105.
 * They stand where the court's own five never do: the east lane by the Rod Store, the far
 * south-east past the pond, the bottom of Leadrow, under the cooling tower, and the pit road.
 */

const EYE = 0xffa040;
const COINS = 210;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_WALDO, FALLEN_ACTIVATION, FALLEN_DAUGHTERS, FALLEN_CALUTRON, FALLEN_RIPPLE],
  encounters: [
    {
      id: fallenId('halflife', 'waldo'),
      court: 'halflife',
      name: 'The Long Arm',
      foeName: 'Tongsman Ludovic Haft',
      foeElement: 'technology',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('halflife', 'waldo'),
      at: { x: 1800, y: 780 },
      look: { body: 0xc8c0b0, accent: 0x3a4048, hat: 'goggles', traits: ['apron', 'tool'], size: 1.2, eye: EYE },
      challenge: [
        'Nobody touches a fresh rod. I work the yoke, the arm does the lifting. Left is right. Near is far.',
        'His Highness points. I lift. A rod, a cask, a family off a doorstep. The arm does not ask which.',
        'Stand still and I will set you down gently. Mostly gently. The linkage is old.',
      ],
      beaten: [
        'Rods. I lifted rods. Through the glass, with the yoke, one a shift. Who did I lift off a doorstep?',
        'My hands are shaking. They never shake at the yoke. Let me sit by the window a while.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('halflife', 'activation'),
      court: 'halflife',
      name: 'Made to Glow',
      foeName: 'Source-Warden Ermentrude Scaife',
      foeElement: 'hunt',
      difficulty: 4,
      hpMult: 1.05,
      gimmick: fallenId('halflife', 'activation'),
      at: { x: 2020, y: 1440 },
      look: { body: 0xd4c4b0, accent: 0x5e6670, hat: 'hood', traits: ['apron', 'glasses'], size: 1.0, eye: EYE },
      challenge: [
        'Iron that sits by my castle comes away glowing. So do people. The Tally likes a glowing house.',
        'A glowing house is a short house, dear. The meter cannot argue with it. Nor can you.',
        'I will draw the plug now. Come close. You will glow beautifully.',
      ],
      beaten: [
        'I kept the plug in. Forty years, I kept it in. I chalked my name on the bricks so no fool would lift it.',
        'Why did I lift it? I never lift it. Somebody put my hands on that chain.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('halflife', 'daughters'),
      court: 'halflife',
      name: 'The Daughter Line',
      foeName: 'Chain-Reader Bartholomew Daughtry',
      foeElement: 'fate',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('halflife', 'daughters'),
      at: { x: 700, y: 1420 },
      look: { body: 0xd8ccb4, accent: 0x6a4aa8, hat: 'cap', traits: ['book', 'glasses', 'pipe'], size: 0.95, eye: EYE },
      challenge: [
        'Uranium begets thorium begets radium begets radon. Every daughter is born owing her mother\'s debt.',
        'I read the ore down its line, and the households down theirs. Both end in lead. Both end quiet.',
        'Mind the next one. I know which it is. That is the whole of my trade: knowing which.',
      ],
      beaten: [
        'I read ore. Only ore. The assay table, the cradle, the chart. I never read a family. Did I?',
        'My own girl works the Glow Ward. She owes nobody. I am sure she owes nobody.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('halflife', 'calutron'),
      court: 'halflife',
      name: 'Bent by Weight',
      foeName: 'Separator Cyprian Lowe',
      foeElement: 'magnet',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('halflife', 'calutron'),
      at: { x: 1360, y: 330 },
      look: { body: 0xccc4b8, accent: 0xc8763a, hat: 'beanie', traits: ['glasses', 'apron', 'satchel'], size: 1.05, eye: EYE },
      challenge: [
        'The magnet sorts what the eye cannot. Light ones turn tight. Heavy ones swing wide and land apart.',
        'I sorted this town the same way. The light stay. The heavy go up the Coil. It is only physics.',
        'You are rather heavy, I think. Let us see where you land.',
      ],
      beaten: [
        'Ore. I sorted ore, under the dome, in the cups. I counted grams. I never weighed a person.',
        'Why do I know the names on the cups? There were never names on the cups.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('halflife', 'ripple'),
      court: 'halflife',
      name: 'Delay Round',
      foeName: 'Shot-Firer Gunhild Ashlock',
      foeElement: 'gunpowder',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('halflife', 'ripple'),
      at: { x: 1000, y: 480 },
      look: { body: 0xc8b49c, accent: 0x8a4a2a, hat: 'miner', traits: ['pack', 'scarf', 'tool'], size: 1.15, eye: EYE },
      challenge: [
        'A good round breaks toward its first shot. Apex, then the arms, then the easers. Like a sentence.',
        'Short houses come down the same way as a face. Drill, charge, tag, wire. Then you stand back.',
        'You are standing on my apex. I would move. Then again, I would read the tags first.',
      ],
      beaten: [
        'I fire the face. Rock. Only ever rock. I count every man up out of the pit before I touch the box.',
        'Houses? I never drilled a house. Why can I hear one coming down?',
      ],
      coins: COINS,
    },
  ],
};
