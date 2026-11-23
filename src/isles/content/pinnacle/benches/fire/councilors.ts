import type { EncounterDef, GimmickDef, NpcLook } from '../../../../IslesTypes';
import { BENCHES, seatId } from '../../spec';
import { SEAT_AT } from './area';
import { CONFINEMENT } from './decrees/confinement';
import { POWDER_TRAIN } from './decrees/powderTrain';
import { RIVETED_FLOOR } from './decrees/rivetedFloor';
import { SEALED_WRIT } from './decrees/sealedWrit';
import { STILL_GLASS } from './decrees/stillGlass';
import { UNBANKED_FIRE } from './decrees/unbankedFire';

const B = BENCHES.find((b) => b.isle === 'fire')!;

/**
 * The Ember Bench's six councilors — the jurists who drafted the Brand, clause by clause, and
 * appointed Brandmark's six princes. Each fights perfected under the decree of their own seat.
 */

export const BENCH_FIRE_GIMMICKS: GimmickDef[] = [UNBANKED_FIRE, STILL_GLASS, RIVETED_FLOOR, POWDER_TRAIN, CONFINEMENT, SEALED_WRIT];

const HP = 1.25 + 0.02 * B.n;
const COINS = 200 + 12 * B.n;

/** A councilor's robes: black-glass grey with the seat's own trim, always masked. */
const robe = (accent: number, traits: NpcLook['traits'], size = 1, eye = 0xc9b0ff): NpcLook => ({
  body: 0x1c1726, accent, hat: 'councilmask', traits, size, eye,
});

const seat = (el: string, o: Omit<EncounterDef, 'id' | 'court' | 'foeElement' | 'difficulty' | 'hpMult' | 'coins' | 'at' | 'mastered'>): EncounterDef => ({
  id: seatId(el), court: B.id, foeElement: el, difficulty: 5, hpMult: HP, coins: COINS, at: SEAT_AT[el], mastered: true, ...o,
});

export const BENCH_FIRE_COUNCILORS: EncounterDef[] = [
  seat('fire', {
    name: 'Decree of the Unbanked Fire', seat: 'Seat of Embers', foeName: 'Councilor Ashmund Vell',
    gimmick: UNBANKED_FIRE.id, look: robe(0xff6a2a, ['brand', 'book'], 1.05),
    challenge: [
      'Ashmund Vell, Seat of Embers. I drafted the hearth clause: a fire found cold is a family found wanting.',
      'I appointed Kindle to keep it. He kept it badly. He kept it warm.',
      'In this room no fire is banked. Whatever you light will spread. Light carefully, challenger. Or don\'t.',
    ],
    beaten: [
      'The mask is split. I can feel the draught through it. ...It is very cold, without the fire.',
      'When he asks who let you up, tell him the hearth clause had a loophole. I wrote it in. I always do.',
    ],
  }),
  seat('magma', {
    name: 'Decree of the Still Glass', seat: 'Seat of the Caldera', foeName: 'Councilor Petra Slagge',
    gimmick: STILL_GLASS.id, look: robe(0xd8401a, ['cane'], 1.15),
    challenge: [
      'Petra Slagge, Seat of the Caldera. Mine is the rendering clause: what will not burn is rendered until it does.',
      'I gave the Caldera to Basalt because he never moved. A prince should be a pillar. He made a fine pillar.',
      'Here, what stands still cools. Stand long enough and you will be glass. And glass breaks, dear.',
    ],
    beaten: [
      'Cracked right through. Ha. I always said I would crack before I would move.',
      'Upstairs the glass is thinner. You can see what is under it. I have never once looked.',
    ],
  }),
  seat('pressure', {
    name: 'Decree of the Riveted Floor', seat: 'Seat of the Gauge', foeName: 'Councilor Barrow Gaskett',
    gimmick: RIVETED_FLOOR.id, look: robe(0xffa04a, ['glasses', 'tool'], 1.1),
    challenge: [
      'Barrow Gaskett, Seat of the Gauge. Section four: the tithe-fire shall be metered, and the meter believed.',
      'Gauge was my appointment. He read every dial on the isle and never once asked who set them.',
      'This floor is riveted plate. Stand on it and it fills. When it blows it throws you — at whoever is left.',
    ],
    beaten: [
      'Needle on the stop. That is me, then. Vented.',
      'I set every gauge on Brandmark a little high. A little fear runs a boiler. ...It runs the man upstairs, too.',
    ],
  }),
  seat('gunpowder', {
    name: 'Decree of the Powder Train', seat: 'Seat of the Powder', foeName: 'Councilor Ignatia Corne',
    gimmick: POWDER_TRAIN.id, look: robe(0xc8a070, ['satchel', 'eyepatch'], 1.0),
    challenge: [
      'Ignatia Corne, Seat of the Powder. The magazine clause is mine: every grain on the isle is the crown\'s.',
      'Fuse was a fine appointment. Short. Reliable. Went off exactly when he was told.',
      'The floor is laid in trains. Strike a charge and fire runs every line from it. Mind where you stand.',
    ],
    beaten: [
      'Spent. Every charge. That has never happened in this room. I always keep one back.',
      'Kept it back for him, if you must know. Upstairs. I never once had the nerve to lay the train.',
    ],
  }),
  seat('plasma', {
    name: 'Decree of Confinement', seat: 'Seat of the Corona', foeName: 'Councilor Celestine Arc',
    gimmick: CONFINEMENT.id, look: robe(0xffd08a, ['lantern'], 0.95, 0xffe8b8),
    challenge: [
      'Celestine Arc, Seat of the Corona. I wrote the lamp ordinance: no light on the plateau but the one we lit.',
      'Flux was meant to tend the lamp. He tried to become it. Appointments are a gamble.',
      'This is a confinement ring. Ride it and you will burn bright. When it pinches, be somewhere else.',
    ],
    beaten: [
      'Out of the ring. Out of the seat. I suppose that makes me loose plasma now.',
      'You will see a real one upstairs — a star in a shell. We built this ring to practise holding him in.',
    ],
  }),
  seat('wax', {
    name: 'Decree of the Sealed Writ', seat: 'Seat of the Seal', foeName: 'Councilor Prudence Wick',
    gimmick: SEALED_WRIT.id, look: robe(0xa8180e, ['book', 'glasses'], 0.9),
    challenge: [
      'Prudence Wick, Seat of the Seal. I seal the writs. A writ under seal is not a letter. It is a sentence.',
      'Tallow was my appointment. He loved a candle. He never once read what he was lighting it to sign.',
      'The press is warm. Writs will be served. Strike yours back and it goes to whoever sent it. Faster.',
    ],
    beaten: [
      'Returned to sender. Unopened. How rude. How very, very rude.',
      'There is one writ I never sealed. It has your name on it, in his hand. I would hurry, before the wax sets.',
    ],
  }),
];
