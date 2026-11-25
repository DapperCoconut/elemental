import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_BARK_CLOSES } from './barkCloses';
import { FALLEN_CARRIAGE } from './carriage';
import { FALLEN_MISTLETOE } from './mistletoe';
import { FALLEN_SWAY } from './sway';
import { FALLEN_SWING } from './swing';

/**
 * The Heartwood Court's Fallen Five — in the star's telling, the people of the tree city who
 * served the Still Prince: the mill apprentice who pulled the wedges, the lamplighter who lit the
 * white rings for the pruners, the bark-warden who grew the emptied doors shut, the ropewarden
 * who slackened the short boughs' guy-ropes, and the mistletoe-wife who seeded the parasite that
 * made them short. Tier 4: difficulty 4,4,5,5,5; coins double the court's 90.
 * They stand where the court's own five never do: the mill yard, the east side of the Lantern
 * Ledge, the crown fork beside the Glasshouse, out on the east bough, and the upper west trunk.
 */

const EYE = 0xffa040;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_CARRIAGE, FALLEN_SWING, FALLEN_BARK_CLOSES, FALLEN_SWAY, FALLEN_MISTLETOE],
  encounters: [
    {
      id: fallenId('heartwood', 'carriage'),
      court: 'heartwood',
      name: 'Carriage to the Blade',
      foeName: 'Tobin Sawset, Mill Apprentice',
      foeElement: 'technology',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('heartwood', 'carriage'),
      at: { x: 2000, y: 1720 },
      look: { body: 0xc9a27a, accent: 0x3e4a3a, hand: 0x8a6a4c, hat: 'goggles', traits: ['tool', 'apron', 'pack'], size: 1.0, eye: EYE },
      challenge: [
        'Four oak wedges, flung in the roots. Old Ottilie cried. I told her the Empress needs her timber.',
        'Listen to it! Every belt running, every blade bright. A mill is meant to mill. It is only sense.',
        'Step on the carriage, friend. It takes you where it is going. That is what carriages are for.',
      ],
      beaten: [
        'The blade\'s stopped. Good. Good? I... I hammered the wedges in. Every night, with her. Didn\'t I?',
        'My hands smell of oak, not oil. I think I only ever held the mallet for her.',
      ],
      coins: 180,
    },
    {
      id: fallenId('heartwood', 'swing'),
      court: 'heartwood',
      name: 'The Turning Swing',
      foeName: 'Hollin Wick, Lamplighter',
      foeElement: 'gravity',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('heartwood', 'swing'),
      at: { x: 1450, y: 1000 },
      look: { body: 0xd8c4a4, accent: 0x5a4329, hand: 0xf0a024, hat: 'cap', traits: ['lantern', 'scarf', 'cane'], size: 1.05, eye: EYE },
      challenge: [
        'I hang the Great Lantern low on pruning nights. A white ring reads so much clearer by sap-light.',
        'It swings, you see. Long chain. It turns its own way through the night, and it never misses a door.',
        'Stand where you like. The light will come round to you. It always comes round.',
      ],
      beaten: [
        'The chain\'s still. I lit it for the climbers. So they could find their knots home in the dark.',
        'I never lit a ring for anyone. Did I? Why can I see them so clearly, then?',
      ],
      coins: 180,
    },
    {
      id: fallenId('heartwood', 'bark-closes'),
      court: 'heartwood',
      name: 'The Bark Closes',
      foeName: 'Warden Quillan Burrage',
      foeElement: 'growth',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('heartwood', 'bark-closes'),
      at: { x: 1380, y: 420 },
      look: { body: 0xb8a68a, accent: 0x55662a, hand: 0xece6d8, hat: 'hood', traits: ['tool', 'satchel', 'beard'], size: 1.2, eye: EYE },
      challenge: [
        'An empty door is an untidy door. I lay my hand on the bark and ask it, kindly, to close.',
        'The prince likes the trunk smooth. No knots where nobody lives. You understand. Everyone does, after.',
        'Go on, hide in one. It\'s warm in a knot. It\'s very quiet when it closes.',
      ],
      beaten: [
        'My palm\'s full of splinters. From carving. I carved the Ashlocks a new door when theirs rotted.',
        'I opened doors. I am almost sure I only ever opened doors.',
      ],
      coins: 180,
    },
    {
      id: fallenId('heartwood', 'sway'),
      court: 'heartwood',
      name: 'The Bough Sways',
      foeName: 'Ropewarden Ivo Hempstead',
      foeElement: 'air',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('heartwood', 'sway'),
      at: { x: 1580, y: 520 },
      look: { body: 0xa88a6a, accent: 0x6a5a3e, hand: 0xc4a774, hat: 'souwester', traits: ['scarf', 'pack', 'tool'], size: 1.15, eye: EYE },
      challenge: [
        'Every guy-rope on this crown is mine. A turn loose here, a turn loose there. The wind does the rest.',
        'Short households live out on the thin boughs. The wind knows. I only let it in.',
        'Feel that lean? Hold a rope if you can find a good one. I tied most of them myself.',
      ],
      beaten: [
        'I went out in the gale of \'52. Re-knotted every rope on the east bough with my teeth. I did, I think.',
        'Nobody fell. Did anybody fall? I can\'t remember anybody falling.',
      ],
      coins: 180,
    },
    {
      id: fallenId('heartwood', 'mistletoe'),
      court: 'heartwood',
      name: 'Berries on the Bough',
      foeName: 'Sorrel Gall, Mistletoe-Wife',
      foeElement: 'soul',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('heartwood', 'mistletoe'),
      at: { x: 860, y: 620 },
      look: { body: 0xd8cfbc, accent: 0x8ea63c, hand: 0xf6f3ea, hat: 'wreath', traits: ['satchel', 'apron', 'cane'], size: 0.95, eye: EYE },
      challenge: [
        'One berry on a thin bough, and by the season\'s turn the bough runs dry. Then the scales, then the ring.',
        'The Glasshouse pays me by the ring. Mistletoe is so patient. It only drinks a little at a time.',
        'Stand close, dear. Closer than that one. It always drinks from whoever stands closest.',
      ],
      beaten: [
        'I cut it off them. For nothing, every winter. Old Larchmere gave me a cake for it once.',
        'I kept the kissing-boughs for the dance. Just the dance. Why do my shears feel so heavy?',
      ],
      coins: 180,
    },
  ],
};
