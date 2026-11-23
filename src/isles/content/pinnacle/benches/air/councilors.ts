import type { EncounterDef, GimmickDef, NpcLook, Pt } from '../../../../IslesTypes';
import { BENCHES, seatId } from '../../spec';
import { GALE } from './art';
import { APPROVED_ENDING } from './decrees/approvedEnding';
import { OPEN_RAIL } from './decrees/openRail';
import { PRECEDENCE } from './decrees/precedence';
import { SAGGING_SPAN } from './decrees/saggingSpan';
import { SLEEPERS_EYE } from './decrees/sleepersEye';
import { SLIPSTREAM } from './decrees/slipstream';

/**
 * The Gale Bench's six councilors — the jurists who wrote the Breath-Tax clause by clause, each of
 * whom appointed one of Highspire's princes. They stand before their seats along the bridges,
 * climbing: the Gale and Squalls on the lower span, the Plumb Line and the Long Sleep either side
 * of the Breath-Meter, the Zenith and the Last Word on the upper span under the stair.
 */

export const BENCH = BENCHES.find((b) => b.isle === 'air')!;

/** Where each councilor stands (in front of their seat; the seat's plinth is just north). */
export const SEAT_AT: Record<string, Pt> = {
  air: { x: 420, y: 1410 },
  tempest: { x: 1180, y: 1410 },
  gravity: { x: 380, y: 950 },
  dream: { x: 1220, y: 950 },
  astra: { x: 460, y: 320 },
  myth: { x: 1140, y: 320 },
};

const HP = 1.25 + 0.02 * BENCH.n;
const COINS = 200 + 12 * BENCH.n;

const look = (body: number, accent: number, traits: NpcLook['traits'], size = 1.1): NpcLook =>
  ({ body, accent, hat: 'councilmask', traits, size, eye: GALE });

const seat = (
  el: string, seatName: string, foe: string, decree: GimmickDef, name: string, lk: NpcLook,
  challenge: string[], beaten: string[],
): EncounterDef => ({
  id: seatId(el), court: BENCH.id, name, foeName: foe, foeElement: el, difficulty: 5, hpMult: HP,
  gimmick: decree.id, at: SEAT_AT[el], look: lk, coins: COINS, mastered: true, seat: seatName,
  challenge, beaten,
});

export const AIR_DECREES: GimmickDef[] = [SLIPSTREAM, OPEN_RAIL, SAGGING_SPAN, SLEEPERS_EYE, PRECEDENCE, APPROVED_ENDING];

export const AIR_COUNCILORS: EncounterDef[] = [
  seat('air', 'Seat of the Gale', 'Councilor Aurelian Sough', SLIPSTREAM, 'Decree of the Slipstream',
    look(0xd8e6f2, 0x2e3a58, ['scarf'], 1.05),
    [
      'I drafted the first clause of the Breath-Tax. Eleven words. "All air above the cloud line is the Crown\'s."',
      'I appointed Zephyr. He glided beautifully. He never once looked behind him.',
      'On this span whoever runs in another\'s wake is carried by it. I have run in the King\'s three hundred years.',
    ],
    [
      '...the mask has split. I can feel wind on my face. I had forgotten wind has a temperature.',
      'Upstairs, nothing breathes at all. Remember that when you get there. It has never needed to.',
    ]),
  seat('tempest', 'Seat of Squalls', 'Councilor Corvin Shear', OPEN_RAIL, 'Decree of the Open Rail',
    look(0x6a7898, 0x161c2c, ['cane'], 1.2),
    [
      'Clause nine: a debtor who will not walk to the Lung may be carried there by weather. My clause.',
      'I gave Squall the Stormeye. She walled in the only calm on the isle and charged the town to stand in it.',
      'The rail on this span is glass. Break it, and the next gust takes whoever leans on the gap.',
    ],
    [
      'Over the rail and back, and still standing. The updraft has never brought anybody back twice.',
      'There is a wind under the door upstairs that blows from no direction at all. Go carefully.',
    ]),
  seat('gravity', 'Seat of the Plumb Line', 'Councilor Magda Plumb', SAGGING_SPAN, 'Decree of the Sagging Span',
    look(0x4e4270, 0x14101f, ['satchel'], 1.25),
    [
      'I wrote the weights. A breath owed is a stone. A stone owed sinks a house. It is only arithmetic.',
      'Perigee was my appointment. He hung moons over his own people and called it astronomy.',
      'Every blow you strike here hangs a stone on you. The span sags toward the heavy. At six, the plumb drops.',
    ],
    [
      'Lighter than I thought you\'d be. Lighter than I have been in years. The mask was very heavy.',
      'The one upstairs fell here, you know. Out of the sky. Nothing that heavy should ever have been given a chair.',
    ]),
  seat('dream', 'Seat of the Long Sleep', 'Councilor Lethe Morrow', SLEEPERS_EYE, 'Decree of the Sleeper\'s Eye',
    look(0xb4a4dc, 0x241c48, ['lantern'], 1.0),
    [
      'Clause twelve: the becalmed SHALL sleep until their debt is breathed off by others. I chose "shall".',
      'Reverie was kind to them, in her way. She gave them lovely dreams. I asked her not to.',
      'The Sleeper dreams us both. When its eye opens, lie still. Whatever moves under it is counted awake.',
    ],
    [
      'You moved when it looked. On purpose. ...How long have I been lying still? No. Don\'t tell me.',
      'Upstairs nothing sleeps. It is the one thing on this spire that has never closed its eyes.',
    ]),
  seat('astra', 'Seat of the Zenith', 'Councilor Ptolema Vey', PRECEDENCE, 'Decree of Precedence',
    look(0x262650, 0xd8d0ff, ['glasses'], 1.1),
    [
      'I set the order of breathing. Who stood nearer the stars breathed first. The rest breathed after, if at all.',
      'Nova was my pupil. He wanted to be the brightest thing in the sky. I never told him what sits above it.',
      'Here the higher of us strikes harder, and the Zenith strikes the highest. Precedence has a price.',
    ],
    [
      'You went low when it mattered. I have never once stood lower than anyone on purpose.',
      'There is a star above this spire, and it is not in the sky. It is in the chair. ...I am afraid of it.',
    ]),
  seat('myth', 'Seat of the Last Word', 'Councilor Ambrose Quill', APPROVED_ENDING, 'Decree of the Approved Ending',
    look(0xc4b4e4, 0x30244e, ['book'], 1.05),
    [
      'I am this bench\'s editor. Every clause above, I checked for loose ends. There were none when I finished.',
      'Legend was my appointment. He burned the stories that ended wrong. I wrote him the list.',
      'This fight is written as we go. The book names the hero in every line. Strike my quill to change the name.',
    ],
    [
      '"And the censor fell." I would have struck that line. You struck the quill first. Again and again.',
      'The King\'s story has no ending written. I looked. The last page upstairs is blank. Mind what you write.',
    ]),
];
