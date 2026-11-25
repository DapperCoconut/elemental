import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_BEND } from './bend';
import { FALLEN_BUNS } from './buns';
import { FALLEN_FOCUS } from './focus';
import { FALLEN_LOOPS } from './loops';
import { FALLEN_POOL } from './pool';

/**
 * The Noon Court's Fallen Five — in the star's telling, the people of the sun-plaza who kept it
 * bright with their own hands: the skimmer who read the square in the reflecting pool, the
 * under-baker who sold buns at the bleachings and named the customers who wanted theirs wrapped,
 * the woman who racked the Glass's focus onto the condemned, the canon who read nothing to the
 * children but the sun's spots, and Prince Lumen's tutor, who taught him that light falls toward
 * the crown. Tier 1: difficulty 4,4,4,5,5; coins double the court's 110. They stand on the open
 * marble where the court's own five never fight: the plaza's north-west quarter, the south
 * terrace below the urns, the plaza's south-east quarter, the terrace under the Solarium, and the
 * belfry lane by the mill cart.
 */

const EYE = 0xffa040;
const COINS = 220;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_POOL, FALLEN_BUNS, FALLEN_FOCUS, FALLEN_LOOPS, FALLEN_BEND],
  encounters: [
    {
      id: fallenId('noon', 'pool'),
      court: 'noon',
      name: 'Drawn in the Water',
      foeName: 'Ondine Pellow, Skimmer of the Pool',
      foeElement: 'echo',
      difficulty: 4,
      gimmick: fallenId('noon', 'pool'),
      at: { x: 1000, y: 760 },
      look: { body: 0xe4d8c8, accent: 0x8fb8cc, hat: 'straw', traits: ['rod', 'apron'], size: 0.95, eye: EYE },
      challenge: [
        'I skim the pool every hour so it stays a perfect mirror. Nobody can look into it. So I look for them.',
        'You have a twin in my water, stranger. Upside down, very bright. It does what you do, only crueller.',
        'Cast all you like. Every word you say, the pool says back. So does mine.',
      ],
      beaten: [
        'I skimmed leaves. Just leaves, off the water, so the fish could see the sky. Was there ever a sky in it?',
        'My twin\'s gone to rings. I think I like it better broken. I think I always did.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('noon', 'buns'),
      court: 'noon',
      name: 'Baked on the Stones',
      foeName: 'Tansy Moule, Under-Baker',
      foeElement: 'gum',
      difficulty: 4,
      gimmick: fallenId('noon', 'buns'),
      at: { x: 760, y: 1400 },
      look: { body: 0xe8c8a4, accent: 0xefe2c4, hat: 'chef', traits: ['apron', 'satchel'], size: 1.05, eye: EYE },
      challenge: [
        'No oven on the Sunrise Bun these days, love. The square bakes them. Hot as a hearth, and nobody to stoke it.',
        'I sell them at the bleachings. Folk get peckish, waiting. And I listen to who asks for theirs wrapped.',
        'Golden\'s a short life. Eat it quick or it eats you. Mind the black ones — they speak their mind.',
      ],
      beaten: [
        'I wrapped them in paper so they\'d stay warm. That\'s all. That\'s all anyone ever wanted it wrapped for.',
        'Did I tell anybody anything? I baked. I only baked. Here — this one\'s golden. Go on.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('noon', 'focus'),
      court: 'noon',
      name: 'Racked to the Ring',
      foeName: 'Aubade Crale, Holder of the Focus',
      foeElement: 'radiation',
      difficulty: 4,
      hpMult: 1.05,
      gimmick: fallenId('noon', 'focus'),
      at: { x: 1420, y: 980 },
      look: { body: 0xd8c0a8, accent: 0x34323a, hat: 'goggles', traits: ['tool', 'apron', 'brand'], size: 1.1, eye: EYE },
      challenge: [
        'Kindler grinds the Glass. I hold it. A quarter-turn of my wheel and the ring lies wherever you stand.',
        'The ring-lens doesn\'t burn a point. It burns a circle, and the condemned is always on it. Always.',
        'Stand very still under my lens and you\'ll never be touched. Nobody ever does. Fear moves the feet.',
      ],
      beaten: [
        'I kept the lighthouse lens on the quay. Polished it. Waited for somebody to light it. Did I hold a Glass?',
        'My hands remember a wheel. I think it only ever turned a lamp toward the ships. I think.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('noon', 'loops'),
      court: 'noon',
      name: 'Where the Loops Come Down',
      foeName: 'Canon Ysembrand Tolle',
      foeElement: 'magnet',
      difficulty: 5,
      gimmick: fallenId('noon', 'loops'),
      at: { x: 1760, y: 640 },
      look: { body: 0xecdcc4, accent: 0x9a3a2a, hat: 'mitre', traits: ['book', 'glasses'], size: 1.0, eye: EYE },
      challenge: [
        'The temple keeps a book of the sun\'s face. Every spot, every polarity. I read it aloud each noon.',
        'Red spot to blue, the fire leaps across. It always finds its partner. It will find you in between.',
        'Children ask me about the other stars. I tell them there is one, and it has freckles, and it bites.',
      ],
      beaten: [
        'I read them star-charts. In a cellar, by one candle. Orion. The Plough. I read them every star.',
        'There is more than one. I remember now. There is more than one, and I said so, and I was right.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('noon', 'bend'),
      court: 'noon',
      name: 'All Light Bends',
      foeName: 'Preceptor Eudo Lantry',
      foeElement: 'gravity',
      difficulty: 5,
      hpMult: 1.1,
      gimmick: fallenId('noon', 'bend'),
      at: { x: 1700, y: 1450 },
      look: { body: 0xd4c4b0, accent: 0x3c3850, hat: 'tophat', traits: ['cane', 'book', 'glasses'], size: 1.1, eye: EYE },
      challenge: [
        'I taught the Prince his letters, and one lesson besides: light is not free. It falls toward the crown.',
        'Watch the lance as it passes me. It bends. Everything bends to weight, and I am very heavy with office.',
        'You may stand where you like, child. The light will decide whether you meant it.',
      ],
      beaten: [
        'I taught him that light bends to no one. That it shows the crown and the beggar the same. I did. I did.',
        'Strange. I feel quite light. I think I was always meant to feel this light.',
      ],
      coins: COINS,
    },
  ],
};
