import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { BENCHES, seatId } from '../../spec';
import { seatAt } from './area';
import { ASSIGNED_PART } from './decrees/assignedPart';
import { FAIR_COPY } from './decrees/fairCopy';
import { STANDING_REPEAT } from './decrees/standingRepeat';
import { SWUNG_CENSER } from './decrees/swungCenser';
import { TAKEN_VOICE } from './decrees/takenVoice';
import { VANISHING_CHORISTER } from './decrees/vanishingChorister';

/**
 * The six councilors of the Choir Bench — the jurists who drafted the Part. Each supervised one
 * of Choirholm's courts and appointed its prince; each fights perfected, under the Decree they
 * are proudest of. Bench nine: HP ×1.43, 308 coins.
 */

const B = BENCHES.find((x) => x.isle === 'sound')!;
const HP = 1.25 + 0.02 * B.n;
const COINS = 200 + 12 * B.n;

export const CHOIR_DECREES: GimmickDef[] = [ASSIGNED_PART, STANDING_REPEAT, TAKEN_VOICE, VANISHING_CHORISTER, SWUNG_CENSER, FAIR_COPY];

const seat = (el: string, o: Omit<EncounterDef, 'id' | 'court' | 'foeElement' | 'difficulty' | 'hpMult' | 'coins' | 'mastered' | 'at'>): EncounterDef => ({
  id: seatId(el), court: B.id, foeElement: el, difficulty: 5, hpMult: HP, coins: COINS, mastered: true, at: seatAt(el), ...o,
});

export const CHOIR_COUNCILORS: EncounterDef[] = [
  seat('sound', {
    name: 'Decree of the Assigned Part', seat: 'Seat of the Part', foeName: 'Councilor Tessitura Bray',
    gimmick: ASSIGNED_PART.id,
    look: { body: 0x3a1424, accent: 0xd8a84a, hat: 'councilmask', traits: ['cane'], size: 1.1, eye: 0xffa6d8 },
    challenge: [
      'One child, one note. I wrote that clause in a single line. It is the best line I ever wrote.',
      'I appointed Fanfare to call it. He called it beautifully. He also wept at every Hour, which was untidy.',
      'You sing too many notes. Here: you have a Part now. Stand in it.',
    ],
    beaten: [
      'You swapped the book on me. On me. Nobody has opened that book but me in four hundred years.',
      'Upstairs he does not hand out Parts. He hands out silence. Sing while you still can.',
    ],
  }),
  seat('echo', {
    name: 'Decree of the Standing Repeat', seat: 'Seat of the Repeat', foeName: 'Councilor Iterum Hollowell',
    gimmick: STANDING_REPEAT.id,
    look: { body: 0x1a2430, accent: 0x7ab0c8, hat: 'councilmask', traits: ['lantern'], size: 1.0, eye: 0xc9b0ff },
    challenge: [
      'The caves repeat the Score so it never stops. My clause. Clause nine, subsection — nine, subsection —',
      'Reprise was my appointment. He liked hearing himself twice. So does everyone, at first.',
      'In this room nothing is said once. Everything you do, the room will do to you again.',
    ],
    beaten: [
      '...again. Again. You beat me and I can still hear it happening. It will be happening for some time.',
      'There is one voice up there that has never been repeated. It does not need to be. You will hear.',
    ],
  }),
  seat('silence', {
    name: 'Decree of the Taken Voice', seat: 'Seat of the Rest', foeName: 'Councilor Tacet Muir',
    gimmick: TAKEN_VOICE.id,
    look: { body: 0x16141c, accent: 0xf3eee6, hat: 'councilmask', traits: ['scarf'], size: 1.05, eye: 0xf3eee6 },
    challenge: [
      '(whispered) Noise is fined. A voice that is too loud is taken and sent up to the Vault. I drafted the Muting.',
      '(whispered) Prince Mute was my appointment. The only one on this bench who never once disappointed me.',
      '(whispered) You are very loud. I can hear your heart from here.',
    ],
    beaten: [
      '(whispered) I lost my voice to my own clause. It flew. I had never watched one go before. It looked glad.',
      '(whispered) The Vault behind us is not the only one. His is bigger. His is the whole sky.',
    ],
  }),
  seat('illusion', {
    name: 'Decree of the Vanishing Chorister', seat: 'Seat of the Mask', foeName: 'Councilor Persona Gilt',
    gimmick: VANISHING_CHORISTER.id,
    look: { body: 0x2a1a30, accent: 0xe8c86a, hat: 'councilmask', traits: ['mask'], size: 1.0, eye: 0xffd2ec },
    challenge: [
      'A choir must be faceless. And a singer who is no longer wanted is simply not there at the next Hour.',
      'Facade was my appointment. Two faces. I had hoped for none.',
      'Watch the boxes, darling. Everyone watches the boxes. That is the whole trick.',
    ],
    beaten: [
      'Sawn in half. In front of the whole empty house. I shall never live it down. I shall never live.',
      'Under my mask is his mask. Under his mask is a light. I have seen it once. I am not going back up.',
    ],
  }),
  seat('passion', {
    name: 'Decree of the Swung Censer', seat: 'Seat of the Vow', foeName: 'Councilor Antiphon Grace',
    gimmick: SWUNG_CENSER.id,
    look: { body: 0xe8e0d4, accent: 0xb0407a, hat: 'councilmask', traits: ['book'], size: 1.1, eye: 0xffa6d8 },
    challenge: [
      'Vespers: the Hour at which an isle kneels and the censer passes over every bowed head. I wrote it.',
      'Vesper was my appointment. She believed every word I gave her. I find that I miss her.',
      'Kneel, child. It swings low over the ones who stand.',
    ],
    beaten: [
      'You turned the censer on me. In my own nave. I suppose that is a kind of conversion.',
      'Pray for me, if you pray. Not for the fight upstairs. For what happens to us after it.',
    ],
  }),
  seat('paper', {
    name: 'Decree of the Fair Copy', seat: 'Seat of the Word', foeName: 'Councilor Errata Quire',
    gimmick: FAIR_COPY.id,
    look: { body: 0xd8ccb0, accent: 0x1c1424, hat: 'councilmask', traits: ['book', 'glasses'], size: 0.95, eye: 0xc9b0ff },
    challenge: [
      'The words of the Score are fixed. No singer adds a word. That clause is mine, and so is every comma in it.',
      'Folio was my appointment. Gifted. Insufferable. He kept writing in the margins.',
      'Here is the law. It is one word. Let us see who copies it out fairly first.',
    ],
    beaten: [
      'You blotted me. In my own hand. ...I shall have to write that down. I do not know where.',
      'Above us is the Noon Bench, and above that, the one who dictated everything we wrote. Mind your spelling.',
    ],
  }),
];
