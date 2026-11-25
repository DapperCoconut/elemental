import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { blackMirrorGimmick } from './blackMirror';
import { knappingGimmick } from './knapping';
import { pointsGimmick } from './points';
import { shortShiftGimmick } from './shortShift';
import { towerGimmick } from './tower';

/**
 * The Caldera Court's Fallen Five — crater people the King's telling puts on the crown's side:
 * the bellwarden who wrote down every miner who looked up, the pointsman who sent the short
 * crews up the spur, the tally-clerk who reported them, the glasscutter who glazed the Kiln,
 * and the knapper who struck the branders' blades. They stand only inside the Fall.
 */
export const FALLEN: FallenBundle = {
  encounters: [
    {
      id: fallenId('caldera', 'tower'),
      court: 'caldera',
      name: 'Do Not Look at the Tower',
      foeName: 'Bellwarden Coyle Ashby',
      foeElement: 'sound',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('caldera', 'tower'),
      at: { x: 660, y: 650 },
      look: { body: 0x6a5446, accent: 0x2a2630, hand: 0x4e3e34, hat: 'hood', traits: ['lantern', 'book', 'brand'], size: 1.0, eye: 0xffa040 },
      challenge: [
        'You looked up at the tower when you came in. Everyone does, once. I wrote it down.',
        'Three tolls, then the eye. Keep your gaze on the ground like an honest miner and we will get on.',
        'The book is very nearly full. There is always room for one more name.',
      ],
      beaten: [
        'The book. I had a book of… hymn numbers? I rang for weddings. Down in the Hearth. Did I?',
        'I never looked at anyone. I only ever looked at the rope. I think that was the whole job.',
      ],
      coins: 130,
    },
    {
      id: fallenId('caldera', 'points'),
      court: 'caldera',
      name: 'The Points',
      foeName: 'Pointsman Harl Cinderby',
      foeElement: 'technology',
      difficulty: 4,
      hpMult: 1.15,
      gimmick: fallenId('caldera', 'points'),
      at: { x: 1520, y: 730 },
      look: { body: 0x5a4a3e, accent: 0x3a3a42, hand: 0x8a7a62, hat: 'cap', traits: ['tool', 'scarf', 'brand'], size: 1.1, eye: 0xffa040 },
      challenge: [
        'Loop or spur. Sheds or the Kiln door. Every cart on this line goes where my lever says.',
        'I never asked who was riding in them. A pointsman watches the rails, not the faces.',
        'Mind your feet. The cart does not stop, and neither, I find, do I.',
      ],
      beaten: [
        'The spur… the spur went to the glass sheds. Only ever the sheds. Why did I think it went up?',
        'I greased those points for thirty years and never sent a soul anywhere. I am almost sure.',
      ],
      coins: 130,
    },
    {
      id: fallenId('caldera', 'short-shift'),
      court: 'caldera',
      name: 'Short Shift',
      foeName: 'Tally-Clerk Dole Marrable',
      foeElement: 'fortune',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('caldera', 'short-shift'),
      at: { x: 820, y: 1010 },
      look: { body: 0x7a6a58, accent: 0x3e3a2a, hand: 0xd8c27a, hat: 'tophat', traits: ['glasses', 'book', 'satchel'], size: 0.95, eye: 0xffa040 },
      challenge: [
        'Every swing is a mark on my slate. Every crew that comes up short gets the stamp. It is only arithmetic.',
        'I reported forty crews to the Overseer last season. Forty out of forty. My figures are never wrong.',
        'The shift has started. Do try to keep up — I would hate to have to write you down.',
      ],
      beaten: [
        'Forty crews. I… doctored the slate for them. Rubbed out the gaps with my thumb. Every shift.',
        'I was never the Prince\'s clerk. I was the one who made the numbers come out right for us.',
        'Why would I remember it the other way round? Whose figures are these?',
      ],
      coins: 135,
    },
    {
      id: fallenId('caldera', 'black-mirror'),
      court: 'caldera',
      name: 'Black Mirror',
      foeName: 'Glasscutter Obsa Veck',
      foeElement: 'gunpowder',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('caldera', 'black-mirror'),
      at: { x: 2080, y: 1190 },
      look: { body: 0x4a4250, accent: 0x1e1924, hand: 0xb9a9d8, hat: 'goggles', traits: ['apron', 'tool'], size: 1.0, eye: 0xffa040 },
      challenge: [
        'I glazed the Kiln. Every window the King looks out of, I cut, and I cut them proud.',
        'Shoot at my glass, if you like. Glass is very patient. It always gives a thing back.',
        'And when it goes black, darling, it gives back everything.',
      ],
      beaten: [
        'Windows. I cut windows for the Hearth. Little ones, for kitchens. Never once for the Kiln.',
        'I can see myself in the pieces. I look tired. I look like me.',
      ],
      coins: 135,
    },
    {
      id: fallenId('caldera', 'knapping'),
      court: 'caldera',
      name: 'Knapper\'s Floor',
      foeName: 'Knapper Isk Hollowell',
      foeElement: 'ruin',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId('caldera', 'knapping'),
      at: { x: 1760, y: 1470 },
      look: { body: 0x5e544c, accent: 0x34323a, hand: 0x2a2624, hat: 'bandana', traits: ['beard', 'tool', 'bandage'], size: 1.2, eye: 0xffa040 },
      challenge: [
        'Strike here, and the flake comes off over there. Every brander in the Kiln carries one of mine.',
        'The core does not care who hits it. That is the beauty of glass. Neither do I.',
        'Get round the far side of it, if you can. I have been getting round it for forty years.',
      ],
      beaten: [
        'Knives. I made bread knives. Scrapers for the hides. The branders… I never sold to branders.',
        'My hands remember different from my head. I will trust the hands.',
      ],
      coins: 135,
    },
  ],
  gimmicks: [towerGimmick, pointsGimmick, shortShiftGimmick, blackMirrorGimmick, knappingGimmick],
};
