import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { AUCTION } from './auction';
import { CHANDELIER } from './chandelier';
import { MEASURE } from './measure';
import { RENDERING } from './rendering';
import { SNUFFER } from './snuffer';

/**
 * The Candlewick Court's Fallen Five — five townsfolk whom the King's telling puts on the crown's
 * side of the Inch-Tax, standing about the court only inside the Fall. Tier 3: difficulties
 * 4,4,5,5,5, about double the court's own 50 coins. Every one has the star's ember-gold eyes.
 */
const EMBER = 0xffa040;

export const FALLEN: FallenBundle = {
  encounters: [
    {
      id: fallenId('candlewick', 'snuffer'), court: 'candlewick', gimmick: SNUFFER.id,
      name: 'The Snuffing', foeName: 'Curfew-Snuffer Gall', foeElement: 'air', difficulty: 4, hpMult: 1.1,
      at: { x: 140, y: 930 },
      look: { body: 0x5a5460, accent: 0x2a2430, hat: 'cowl', traits: ['lantern', 'scarf'], size: 1.15, eye: EMBER },
      challenge: [
        'Lights out, citizen. Your window has burned too fast since Tuesday. I have it written down.',
        'I walk Wick Street with my pole and my bells, and every flame that runs ahead of the Inch, I pinch.',
        'Hold still under the brass. It is quieter in there. Everyone says so, afterwards.',
      ],
      beaten: [
        'That ringing... no. That was the lamplighter\'s bell. I carried the ladder for him.',
        'I never snuffed a window in my life. I lit them. All of Wick Street. Didn\'t I?',
      ],
      coins: 100,
    },
    {
      id: fallenId('candlewick', 'auction'), court: 'candlewick', gimmick: AUCTION.id,
      name: 'By the Inch', foeName: 'Auctioneer Vell', foeElement: 'fortune', difficulty: 4, hpMult: 1.1,
      at: { x: 1330, y: 880 },
      look: { body: 0xe8d8c0, accent: 0x6a1a2a, hat: 'tophat', traits: ['cane', 'glasses'], size: 1, eye: EMBER },
      challenge: [
        'Lot nine: one citizen, slightly short. The pin is in the candle. Do I hear a bid? I always hear a bid.',
        'The Prince takes the houses of the short-measured, and I sell them by the inch. All quite lawful.',
        'Bid on what you like. Only be sure who is holding the paddle when the pin drops.',
      ],
      beaten: [
        'Sold... to... no. That was the charity sale. Winter coats for the pondside children. That was me.',
        'The pin dropped and I forgot what I was selling. I think it was only ever coats.',
      ],
      coins: 100,
    },
    {
      id: fallenId('candlewick', 'rendering'), court: 'candlewick', gimmick: RENDERING.id,
      name: 'The Rendering', foeName: 'Renderer Suet', foeElement: 'oil', difficulty: 5, hpMult: 1.2,
      at: { x: 760, y: 990 },
      look: { body: 0xd8c49a, accent: 0x4a3a2a, hat: 'bandana', traits: ['apron', 'tool'], size: 1.3, eye: EMBER },
      challenge: [
        'Everything renders down, friend. Mutton, marrow, folk who come up short. The Prince isn\'t particular.',
        'Mind your footing. The yard\'s slick with what the court threw away, and my tapers stand very tall.',
        'One taper over and the whole yard goes up. I\'ve seen it. I stood upwind and watched.',
      ],
      beaten: [
        'Mutton fat. It was mutton fat. Cheap candles for folk who couldn\'t pay the Inch. That\'s all I boiled.',
        'Get the grease off your boots before you go indoors. ...Why did I ever say the other thing?',
      ],
      coins: 100,
    },
    {
      id: fallenId('candlewick', 'measure'), court: 'candlewick', gimmick: MEASURE.id,
      name: 'Not Too Fast', foeName: 'Tallykeeper Notch', foeElement: 'sand', difficulty: 5, hpMult: 1.2,
      at: { x: 1200, y: 230 },
      look: { body: 0xeadcc0, accent: 0x3a3a5a, hat: 'beret', traits: ['book', 'glasses'], size: 0.95, eye: EMBER },
      challenge: [
        'Not too fast. Not too slow. Every candle in Candlewick is measured, and now so are you. Walk, please.',
        'I have notched the Prince\'s rule on every doorframe in this court. I can read your pace off your shadow.',
        'When the sand runs out, I measure. Mind the pins. The Inch is merciful only to the obedient.',
      ],
      beaten: [
        'Notches on doorframes... the children\'s heights. I measured how tall the children grew, every spring.',
        'I taught the little ones on Wick Street to count. To count, not to fear the count. I remember now.',
      ],
      coins: 100,
    },
    {
      id: fallenId('candlewick', 'chandelier'), court: 'candlewick', gimmick: CHANDELIER.id,
      name: 'Crown of Candles', foeName: 'Verger Hask', foeElement: 'gravity', difficulty: 5, hpMult: 1.25,
      at: { x: 2120, y: 780 },
      look: { body: 0xd0c8d8, accent: 0x2a2040, hat: 'hood', traits: ['rod', 'book'], size: 1.2, eye: EMBER },
      challenge: [
        'Evensong, and the wheel is lit. The Prince has nodded at you. When he nods, I let go of the chain.',
        'Four hundred candles on one iron hoop. It falls very straight. I have had a great deal of practice.',
        'Stand where you like. The wheel finds the ones he points at. It always has.',
      ],
      beaten: [
        'I polished it. Every Sunday, with a rag and a ladder. The chain never once slipped. Not once.',
        'Evensong. People sang under it. I\'d forgotten the singing. Go on — I\'ll see it hung back safe.',
      ],
      coins: 100,
    },
  ],
  gimmicks: [SNUFFER, AUCTION, RENDERING, MEASURE, CHANDELIER],
};
