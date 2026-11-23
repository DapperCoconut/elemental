import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { BENCHES, seatId } from '../../spec';
import { SEATS } from './area';
import { DECREE_BELL_JAR } from './decrees/bellJar';
import { DECREE_BRINE_SYRUP } from './decrees/brineSyrup';
import { DECREE_GLEANING } from './decrees/gleaning';
import { DECREE_PALING } from './decrees/paling';
import { DECREE_SELECTION } from './decrees/selection';
import { DECREE_SELF } from './decrees/self';

/**
 * The six councilors of the Thorn Bench — the jurists who drafted the Pruning, each the patron
 * of one Thornwild court and the one who appointed its prince. They are gardeners of law: tidy,
 * proud of their clauses, and (masks split) afraid of the thing upstairs that told them to write.
 */

const B = BENCHES.find((x) => x.isle === 'life')!;
const HP = 1.25 + 0.02 * B.n;
const COINS = 200 + 12 * B.n;

export const BENCH_LIFE_GIMMICKS: GimmickDef[] = [
  DECREE_BELL_JAR, DECREE_SELECTION, DECREE_GLEANING, DECREE_PALING, DECREE_SELF, DECREE_BRINE_SYRUP,
];

/** One councilor: the shared fields every seat carries. */
const seat = (el: string, o: Omit<EncounterDef, 'id' | 'court' | 'foeElement' | 'difficulty' | 'hpMult' | 'at' | 'coins' | 'mastered'>): EncounterDef => ({
  id: seatId(el), court: B.id, foeElement: el, difficulty: 5, hpMult: HP, at: SEATS[el], coins: COINS, mastered: true, ...o,
});

export const BENCH_LIFE_COUNCILORS: EncounterDef[] = [
  seat('life', {
    name: 'Decree of the Bell Jar', seat: 'Seat of Green', foeName: 'Councilor Amaranth Vell', gimmick: DECREE_BELL_JAR.id,
    look: { body: 0x2a3a2c, accent: 0x5ad06a, hat: 'councilmask', traits: ['scarf'], size: 1.05, eye: 0xb8ffb0 },
    challenge: [
      'Clause one of the Pruning: what thrives is kept. I wrote it under glass, with the sapling, to remember.',
      'I appointed Petalis. A boy who loved flowers. I taught him to love them tidy, and he was very good at it.',
      'You thrive, I see. Splendid colour. Let us find a jar your size.',
    ],
    beaten: [
      'The glass broke. I always thought, if it broke, something would come and cut what grew. Nothing came.',
      'He is listening upstairs. He likes his things kept. He will want to keep you. Do not let him get the lid on.',
    ],
  }),
  seat('growth', {
    name: 'Decree of Selection', seat: 'Seat of Spores', foeName: 'Councilor Mordant Spurge', gimmick: DECREE_SELECTION.id,
    look: { body: 0x3a2a3a, accent: 0x9ad86a, hat: 'councilmask', traits: ['satchel'], size: 1.1, eye: 0xd8ff9a },
    challenge: [
      'Clause two: keep the fit, compost the rest. Elegant, isn\'t it? The garden does the choosing. Nobody\'s fault.',
      'Mycel was my appointment. Clever spore. Spread everywhere. I never once had to tell him where.',
      'Three pods, one bell. Let us see which of us the room selects.',
    ],
    beaten: [
      'Selected out. By my own clause. There is a symmetry to it I should admire, if my mask were not in two.',
      'It was never the garden choosing. It was him. It was always him. He just liked to hear us say "the garden".',
    ],
  }),
  seat('gluttony', {
    name: 'Decree of Gleaning', seat: 'Seat of the Heartwood', foeName: 'Councilor Bartholomew Gall', gimmick: DECREE_GLEANING.id,
    look: { body: 0x3a2a1e, accent: 0x8aa04a, hat: 'councilmask', traits: ['apron', 'tool'], size: 1.3, eye: 0xe0ffa0 },
    challenge: [
      'The windfall belongs to the Crown. Clause three. A family caught gleaning came up short at the weighing.',
      'I appointed Birchbark to keep the sawmill still. Wood that is never cut can be counted forever.',
      'Mind, everything that falls in here is anybody\'s. The clause runs backwards in this room. I find I am hungry.',
    ],
    beaten: [
      'Too full to stand. You let me eat until I could not move, and then you were very rude about it. Fair.',
      'Upstairs he eats too. Not sap. Us, a clause at a time. I wrote mine because I was afraid to be eaten.',
    ],
  }),
  seat('hunt', {
    name: 'Decree of the Paling', seat: 'Seat of the Chase', foeName: 'Councilor Ysolde Gamekeep', gimmick: DECREE_PALING.id,
    look: { body: 0x2e3a2a, accent: 0x6a8a3a, hat: 'councilmask', traits: ['rod', 'scarf'], size: 1.15, eye: 0xc8ff9a },
    challenge: [
      'I wrote the game laws. Which things may be chased, and where, and into what. The pale was my best clause.',
      'Fang was mine. I gave him the parks. I did not give him the wolf. The wolf was always his own idea.',
      'The beaters are ready. Run, if you like. It reads better in the record when they run.',
    ],
    beaten: [
      'On my own stakes. The beaters will talk about it for years, if there are beaters, after.',
      'He drives too. Upstairs. He has been driving all of you here since the first brand. You are in his pale now.',
    ],
  }),
  seat('marrow', {
    name: 'Decree of Self', seat: 'Seat of Bone', foeName: 'Councilor Osric Pallor', gimmick: DECREE_SELF.id,
    look: { body: 0xd8d0c0, accent: 0x5a3a4a, hat: 'councilmask', traits: ['cane'], size: 1.0, eye: 0xe0c8ff },
    challenge: [
      'The graft takes when the body forgets it was ever someone else. Clause five. I made forgetting a law.',
      'I appointed Sinew to the Ossuary. He keeps the bones in order. Order is a kindness to bones.',
      'This floor will learn which of us it is. You are not native here. You will feel it.',
    ],
    beaten: [
      'You made the floor yours. It forgot me. Do you know, that is the first time anything has.',
      'Upstairs, under the glass, is a thing that has never been anything but itself. That frightens me.',
    ],
  }),
  seat('gum', {
    name: 'Decree of Brine and Syrup', seat: 'Seat of Sugar', foeName: 'Councilor Candida Brine', gimmick: DECREE_BRINE_SYRUP.id,
    look: { body: 0xe8d8e0, accent: 0x9ac85a, hat: 'councilmask', traits: ['apron'], size: 0.95, eye: 0xfff0d8 },
    challenge: [
      'What is cut is preserved. Clause six. Sugar for the sweet ones, brine for the rest. Nothing goes to waste.',
      'Saccharo was my appointment. Such a sweet boy. He rotted, of course. Sweet things do, without salt.',
      'Two pools, two cruets. Choose your preserve, dear. I shall choose it for you if you dither.',
    ],
    beaten: [
      'Pickled in my own brine. How very thorough of you. I should have written you a jar.',
      'He keeps nothing fresh upstairs. He keeps it forever. I preserved for a season. He preserves for good.',
    ],
  }),
];
