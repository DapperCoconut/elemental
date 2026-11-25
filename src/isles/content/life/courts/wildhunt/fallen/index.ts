import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_DEER_LEAP } from './deerLeap';
import { FALLEN_DRIVE } from './drive';
import { FALLEN_HUNDRED } from './hundred';
import { FALLEN_LAMPED } from './lamped';
import { FALLEN_TOILS } from './toils';
import { EMBER } from './kit';

/**
 * The Wildhunt Court's Fallen Five — in the star's telling, the people of Prince Fang's lodge town
 * who made the Quarry Run work: the lamp-man who pinned runaways in his light, the toil-mistress
 * who netted them in, the headbeater who drove them onto the guns, the park-keeper who penned them
 * for the cull, and the Prince's old tutor who counted their head start. Tier 2: difficulty 4,4,4,5,5;
 * coins double the court's 65. They stand on open ground clear of the court's own five.
 */

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_LAMPED, FALLEN_TOILS, FALLEN_DRIVE, FALLEN_DEER_LEAP, FALLEN_HUNDRED],
  encounters: [
    {
      id: fallenId('wildhunt', 'lamped'),
      court: 'wildhunt',
      name: 'Lamped',
      foeName: 'Corwen Sallow, Lamp-Man',
      foeElement: 'shadow',
      difficulty: 4,
      hpMult: 1.05,
      gimmick: fallenId('wildhunt', 'lamped'),
      at: { x: 760, y: 860 },
      look: { body: 0xa8866a, accent: 0x22281e, hat: 'hood', traits: ['lantern', 'scarf'], size: 1.05, eye: EMBER },
      challenge: [
        'I poached these woods twenty years. Nobody knows the dark like a poacher. The Prince pardoned me for it.',
        'All I do is hold the lamp. The crossbows do the rest. A man can live with holding a lamp.',
        'Stand still, now. They always stand still when the light finds them. Like deer.',
      ],
      beaten: [
        'Lamp\'s gone out. I... I used it to find lambs. In the snow, at lambing. Up on Hollin\'s Rise.',
        'I never pointed it at a person. Did I? Why does the light feel like it\'s pointing at me?',
      ],
      coins: 130,
    },
    {
      id: fallenId('wildhunt', 'toils'),
      court: 'wildhunt',
      name: 'Drawn In the Toils',
      foeName: 'Millicent Hurle, Toil-Mistress',
      foeElement: 'gravity',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('wildhunt', 'toils'),
      at: { x: 1760, y: 290 },
      look: { body: 0xc8a486, accent: 0x5a4a32, hat: 'bandana', traits: ['apron', 'tool'], size: 1.1, eye: EMBER },
      challenge: [
        'Forty yards of toil to a stake, ten stakes to a ring. I can pitch it round a cottage before they wake.',
        'Then we draw it in. Slowly. Everyone runs at the nets in the end. Everyone.',
        'You\'re already inside. You were inside when you stopped to talk to me.',
      ],
      beaten: [
        'Nets. I mend nets. For the ford, for the salmon. Ma taught me the knot. Not for... not for that.',
        'Whose cottage did I pitch round? I can\'t see the door. I don\'t think there was ever a door.',
      ],
      coins: 130,
    },
    {
      id: fallenId('wildhunt', 'drive'),
      court: 'wildhunt',
      name: 'The Beaters\' Line',
      foeName: 'Clem Rook, Headbeater',
      foeElement: 'sound',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('wildhunt', 'drive'),
      at: { x: 1930, y: 1260 },
      look: { body: 0xd8b494, accent: 0x8a2a1e, hat: 'cap', traits: ['satchel', 'bandage'], size: 0.95, eye: EMBER },
      challenge: [
        'Silver for every drive, and the Prince knows my name. Nobody in my family ever had a name before.',
        'We walk the line and we make a noise. That\'s all. What runs ahead of a noise isn\'t our business.',
        'Line up, lads! Sticks down! Walk it on!',
      ],
      beaten: [
        'I carried the flag at the harvest walk. Round the bounds, with the little ones. Sweets after.',
        'There weren\'t any guns at the end. There was a table. With the sweets on. I\'m sure there was.',
      ],
      coins: 130,
    },
    {
      id: fallenId('wildhunt', 'deer-leap'),
      court: 'wildhunt',
      name: 'The Deer-Leap',
      foeName: 'Osric Thwaite, Park-Keeper',
      foeElement: 'justice',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('wildhunt', 'deer-leap'),
      at: { x: 1130, y: 880 },
      look: { body: 0xd8b898, accent: 0x3a3226, hat: 'tophat', traits: ['tool', 'glasses'], size: 1.2, eye: EMBER },
      challenge: [
        'I built every yard of the park paling. Every leap. In they come over the ramp. Out? There is no out.',
        'The Empress likes a pen called clean. I call them clean. The crossbows do the tidying.',
        'Over you come, then. Mind the ramp. It only goes the one way.',
      ],
      beaten: [
        'Sheep. I kept sheep in pens, up on the common. Folded them at night against the foxes. Only sheep.',
        'I made the gates swing both ways. I always did. Why did I dream them shut?',
      ],
      coins: 150,
    },
    {
      id: fallenId('wildhunt', 'hundred'),
      court: 'wildhunt',
      name: 'The Count of a Hundred',
      foeName: 'Mabyn Clew, the Starter',
      foeElement: 'sand',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId('wildhunt', 'hundred'),
      at: { x: 420, y: 1210 },
      look: { body: 0xc8a486, accent: 0x2a4a2a, hat: 'wig', traits: ['cane', 'book'], size: 1.0, eye: EMBER },
      challenge: [
        'I taught the Prince his venery. The seasons, the signs, the count. He was such a quick boy.',
        'The quarry gets a hundred. That is the law, and I keep it. I simply count rather briskly.',
        'One. Two. Do try to keep up, dear.',
      ],
      beaten: [
        'I taught letters. At the schoolroom by the larder. Counting to a hundred, on the fingers. Only that.',
        'Fang was a quick boy. Wasn\'t he? I can\'t remember ever teaching him anything cruel.',
      ],
      coins: 150,
    },
  ],
};
