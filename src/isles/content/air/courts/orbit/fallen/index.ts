import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_PULLEY } from './overThePulley';
import { FALLEN_PIGS } from './pigsOfLead';
import { FALLEN_SEA } from './fallingSea';
import { FALLEN_ADRIFT } from './cutAdrift';
import { FALLEN_SURVEY } from './triangulation';

/**
 * The Orbit Court's Fallen Five — in the star's telling, the hands that worked Prince Perigee's
 * chains: the winch-hand who hauled debtors' islets in, the bailiff who hung their houses with
 * lead, the warden who held their heads in the Moonpool, the bridgewarden who cut them adrift,
 * and the surveyor who fixed each house by triangulation and certified how low it hung. Tier 3: difficulty 4,4,5,5,5;
 * coins about double the court's 85. They stand where the court's own five never do: Tether Quay
 * below the road, the lamp-row west of the moon, the east islet's lower street, the south street's
 * east end, and the Ring-Street's eastern curve.
 */

const EYE = 0xffa040;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_PULLEY, FALLEN_PIGS, FALLEN_SEA, FALLEN_ADRIFT, FALLEN_SURVEY],
  encounters: [
    {
      id: fallenId('orbit', 'pulley'),
      court: 'orbit',
      name: 'Over the Pulley',
      foeName: 'Cuthbert Lanyard, Winch-Hand',
      foeElement: 'string',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('orbit', 'pulley'),
      at: { x: 470, y: 920 },
      look: { body: 0x8a8494, accent: 0x3b3d47, hat: 'bandana', traits: ['tool', 'beard', 'apron'], size: 1.25, eye: EYE },
      challenge: [
        'One chain, two ends, and a wheel in the middle. Physics, friend. You go out, I come in. Or the other way.',
        'I hauled the Pellmans in eleven links in one night. The winch never once slipped. Neither did I.',
        'Take hold of your end. Mind the well under the wheel; it is hungrier than I am.',
      ],
      beaten: [
        'The winch… I worked the cargo lift. Crates up from Windlass. Apples. I hauled apples, didn\'t I?',
        'Whose houses were on that chain? I can\'t see their faces. I don\'t think there were any houses.',
      ],
      coins: 170,
    },
    {
      id: fallenId('orbit', 'pigs'),
      court: 'orbit',
      name: 'Pigs of Lead',
      foeName: 'Ballast-Bailiff Morrow',
      foeElement: 'earth',
      difficulty: 4,
      gimmick: fallenId('orbit', 'pigs'),
      at: { x: 1040, y: 660 },
      look: { body: 0x5d6474, accent: 0x7a5622, hat: 'helmet', traits: ['satchel', 'bandage'], size: 1.3, eye: EYE },
      challenge: [
        'Every pig is stamped with the Prince\'s link. Hang one on a house and it swings a fathom lower. Simple.',
        'You walk light, stranger. Too light for a debtor. Let\'s put a little weight on you.',
        'Catch. No — please. Catch. It saves us both the bending.',
      ],
      beaten: [
        'Ballast… for the balloons. I weighed the balloons at the fair so they wouldn\'t blow away. Children\'s ones.',
        'I never hung lead on anyone\'s door. My arms remember it. Why do my arms remember it?',
      ],
      coins: 170,
    },
    {
      id: fallenId('orbit', 'sea'),
      court: 'orbit',
      name: 'The Falling Sea',
      foeName: 'Pool-Warden Ysolde Brack',
      foeElement: 'water',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('orbit', 'sea'),
      at: { x: 2200, y: 1030 },
      look: { body: 0x5cb4e4, accent: 0x2a6aa6, hat: 'souwester', traits: ['rod', 'lantern'], size: 1.05, eye: EYE },
      challenge: [
        'The moon holds the water up. I hold it over whoever the Prince names. Today it is you.',
        'A debtor\'s meter reads low after a minute under. Two minutes, and they stop arguing about it.',
        'Look up, dear. No, keep looking up. It will come down whether you look or not.',
      ],
      beaten: [
        'The Moonpool… I fished it. Silverbacks, little moon-eels. I threw the small ones back. Every one.',
        'I never held anyone under. I taught the quay children to swim in it. Didn\'t I? Their names were…',
      ],
      coins: 180,
    },
    {
      id: fallenId('orbit', 'adrift'),
      court: 'orbit',
      name: 'Cut Adrift',
      foeName: 'Bridgewarden Sheer',
      foeElement: 'plasma',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('orbit', 'adrift'),
      at: { x: 1910, y: 1395 },
      look: { body: 0x45414e, accent: 0xb4683e, hat: 'goggles', traits: ['tool', 'mask', 'pack'], size: 1.15, eye: EYE },
      challenge: [
        'Three bridges in arrears, three bridges come down. The islet keeps its chain. It just keeps it alone.',
        'I light the torch, I walk the seam, I never look at who is on the far side. That is the trade.',
        'Step lively on my planks. The sky under them is a long way down and it does not give change.',
      ],
      beaten: [
        'The torch was for mending. I welded the bridges. I kept them up through every gale. That was me.',
        'Cut a bridge? I would sooner cut my hand. So why do I still smell the iron burning?',
      ],
      coins: 180,
    },
    {
      id: fallenId('orbit', 'survey'),
      court: 'orbit',
      name: 'Triangulated',
      foeName: 'Surveyor Euphemia Plumb',
      foeElement: 'crystal',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId('orbit', 'survey'),
      at: { x: 1560, y: 760 },
      look: { body: 0xece0c4, accent: 0x2b3b6a, hat: 'tophat', traits: ['glasses', 'book', 'cane'], size: 1.0, eye: EYE },
      challenge: [
        'Three stations, three angles, one number. Nine links lower than last month. Certified.',
        'The survey does not lie, stranger. Every angle is sighted off the moon, and the moon is the Prince.',
        'Stand still and be measured. It will not take long. It never takes long.',
      ],
      beaten: [
        'Surveyor… I surveyed the bridges for cracks. So they wouldn\'t fall. I signed for safety, not for debt.',
        'My triangles drew boundaries. Fences. Gardens. Why did I ever think they drew sentences?',
      ],
      coins: 190,
    },
  ],
};
