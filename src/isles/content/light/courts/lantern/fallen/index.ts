import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_BRASS_KNOCK } from './brassKnock';
import { EYE } from './common';
import { FALLEN_SAT_UP } from './satUp';
import { FALLEN_SHAKEN_LOOSE } from './shakenLoose';
import { FALLEN_STRAY_HOME } from './strayHome';
import { FALLEN_UNHUNG } from './unhung';

/**
 * The Lantern Court's Fallen Five — in the star's telling, the people of the gorge who kept the
 * Lamplighter's law for him: the capwright who casts Wire Fourteen's heavy lanterns, the sitter who
 * shakes the dying soul loose for the catchers, the old tutor who taught the prince that nothing
 * stays lost, the catchpole who hunts the souls families hid in the dark, and the sitter of the
 * Mourning House, where nobody lies down. Tier 2: difficulty 4,4,4,5,5; coins double the court's 120.
 * They stand where the court's own five never do: above Lantern Row, the lake's south shore, under
 * the north rim by the Columbarium, the Lantern Stair's top, and the lane west of the Mourning House.
 */

const COURT = 'lantern';
const COINS = 240;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_BRASS_KNOCK, FALLEN_STRAY_HOME, FALLEN_UNHUNG, FALLEN_SHAKEN_LOOSE, FALLEN_SAT_UP],
  encounters: [
    {
      id: fallenId(COURT, 'brass-knock'), court: COURT, name: 'Brass Knock',
      foeName: 'Capwright Thibault Orme', foeElement: 'metal', difficulty: 4, hpMult: 1.1,
      gimmick: fallenId(COURT, 'brass-knock'),
      at: { x: 1700, y: 560 },
      look: { body: 0xd8b898, accent: 0x7a5c22, hat: 'cap', traits: ['apron', 'tool', 'beard'], size: 1.2, eye: EYE },
      challenge: [
        'Wire Fourteen\'s lanterns are cast thick. Penitents\' brass. A heavy heart wants a heavy house.',
        'Before one goes up I knock the row and listen. True brass rings all the way to the far end.',
        'Stand where you like. The blow always comes out the other side. That is what brass is for.',
      ],
      beaten: [
        'I… cast bells. Little ones, for the boats on the lake. Children rang them. Didn\'t they?',
        'Fourteen. I never cast for Fourteen. I hid a mould under the yard so no one could. Why did I forget?',
      ],
      coins: COINS,
    },
    {
      id: fallenId(COURT, 'stray-home'), court: COURT, name: 'Nothing Stays Lost',
      foeName: 'Aldhelm Spruce, the Prince\'s Old Tutor', foeElement: 'ice', difficulty: 4,
      gimmick: fallenId(COURT, 'stray-home'),
      at: { x: 700, y: 240 },
      look: { body: 0xe0d4c0, accent: 0x4a6a8a, hat: 'tophat', traits: ['book', 'glasses', 'cane'], size: 1.05, eye: EYE },
      challenge: [
        'I taught the boy his first lesson. Nothing that goes out may stay lost. Everything comes home.',
        'Miss, by all means. Your mistake will find its way back to you. I made sure of that.',
        'Today\'s lesson is chalk. Mind where it lands, and mind the way it goes home.',
      ],
      beaten: [
        'I… taught him to read by candlelight. Then I blew it out and we watched the dark. He laughed.',
        'Some things should be let go. That was the lesson. I had it backwards. Hadn\'t I?',
      ],
      coins: COINS,
    },
    {
      id: fallenId(COURT, 'unhung'), court: COURT, name: 'Unhung',
      foeName: 'Catchpole Ysembert Crouch', foeElement: 'hunt', difficulty: 4, hpMult: 1.15,
      gimmick: fallenId(COURT, 'unhung'),
      at: { x: 2180, y: 300 },
      look: { body: 0xc8b8a0, accent: 0x3a4a5c, hat: 'tricorn', traits: ['lantern', 'pack', 'rod'], size: 1.15, eye: EYE },
      challenge: [
        'Under the floor. In a cellar. In a trunk with the lid nailed down. They hide their dead from us.',
        'I find them. Every soul that slipped the lantern, I bring home on my hook. It\'s a mercy, really.',
        'There\'s one here now. Hiding behind you, isn\'t it? Stand aside. Or don\'t. The hook doesn\'t mind.',
      ],
      beaten: [
        'I… carried them down. To the cellars. I held the lamp while they laid them in the dark. Didn\'t I?',
        'There was a little one with a ribbon. I never hooked her. I sang to her. I think I sang.',
      ],
      coins: COINS,
    },
    {
      id: fallenId(COURT, 'shaken-loose'), court: COURT, name: 'Shaken Loose',
      foeName: 'Orabel Penhallow, Deathbed-Sitter', foeElement: 'soul', difficulty: 5, hpMult: 1.15,
      gimmick: fallenId(COURT, 'shaken-loose'),
      at: { x: 760, y: 1250 },
      look: { body: 0xece6dc, accent: 0x9fb8d8, hat: 'veil', traits: ['lantern', 'scarf'], size: 0.95, eye: EYE },
      challenge: [
        'I sit with the dying. When it\'s time, I give the soul a little shake, so it comes out tidy.',
        'Then the lantern has it before it can wander off into the dark. Nobody wanders off. Not on my watch.',
        'Three good knocks, dear. That\'s all it takes. Then mind where your soul goes.',
      ],
      beaten: [
        'I… held their hands. That was all. I held their hands, and when they went, I let go.',
        'I used to open the window for them. So they could get out. Why did I remember a lantern?',
      ],
      coins: COINS,
    },
    {
      id: fallenId(COURT, 'sat-up'), court: COURT, name: 'Sat Up',
      foeName: 'Iolanthe Brisk, Sitter of the Mourning House', foeElement: 'bind', difficulty: 5, hpMult: 1.2,
      gimmick: fallenId(COURT, 'sat-up'),
      at: { x: 1250, y: 1250 },
      look: { body: 0xf4f1ea, accent: 0xc8bea4, hat: 'coif', traits: ['apron', 'book', 'glasses'], size: 1, eye: EYE },
      challenge: [
        'Nobody lies down in my house. Grief must be seen, and you can\'t see it lying down.',
        'They slump, of course. Three nights in, they all slump. That\'s what the hook is for.',
        'Here\'s a pall. Lie under it, if you like. You won\'t lie long.',
      ],
      beaten: [
        'I… brought them blankets. In the back room, the one with no window. I let them sleep. Didn\'t I?',
        'There was never a hook. There was a kettle on a chain. I made the tea. I\'m sure I made the tea.',
      ],
      coins: COINS,
    },
  ],
};
