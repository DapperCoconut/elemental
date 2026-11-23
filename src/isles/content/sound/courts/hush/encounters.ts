import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { CLAPPERLESS_BELL } from './gimmicks/clapperlessBell';
import { CREAKING_BOARDS } from './gimmicks/creakingBoards';
import { MUFFLE } from './gimmicks/muffle';
import { QUIET_ZONES } from './gimmicks/quietZones';
import { SIGN_LANGUAGE } from './gimmicks/signLanguage';

/**
 * The Hush Court's five champions — the wardens who keep the silence between the Hours. Tier 3
 * of Choirholm (difficulty 5 across the board). In from the Carillon road you meet Shusher Felt
 * on Lantern Lane, Upholsterer Batting in the mill yard, Sexton Toll under the Hush Bell, Sneak
 * Tiptoe on the mere boardwalk and Signer Palm outside the Sign School.
 */

export const HUSH_GIMMICKS: GimmickDef[] = [QUIET_ZONES, MUFFLE, CLAPPERLESS_BELL, CREAKING_BOARDS, SIGN_LANGUAGE];

const COINS = 130;

export const HUSH_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'hush-quiet-zones',
    court: 'hush',
    name: 'Quiet Zones',
    foeName: 'Shusher Felt',
    foeElement: 'wax',
    difficulty: 5,
    gimmick: 'hush-quiet-zones',
    at: { x: 470, y: 640 },
    look: { body: 0xd8c8b4, accent: 0x2c3352, hat: 'earmuffs', traits: ['lantern', 'scarf'], size: 1.05, eye: 0xffd88a },
    challenge: [
      'Shhhh. (he does not raise his voice. He has never raised his voice.)',
      'Every lantern on this lane is a quiet. Stand under one and say something. Go on. I dare you to.',
      'I trim the wicks myself. Wax and hush, stranger. Mind where you open your mouth.',
    ],
    beaten: [
      '…Hm. You fought in the dark between my lamps. Nobody fights between the lamps.',
      'Go on, then. Quietly. Please. It\'s the only word I have left that isn\'t "shh".',
    ],
    coins: COINS,
  },
  {
    id: 'hush-muffle',
    court: 'hush',
    name: 'Muffle',
    foeName: 'Upholsterer Batting',
    foeElement: 'cloth',
    difficulty: 5,
    gimmick: 'hush-muffle',
    at: { x: 720, y: 1290 },
    look: { body: 0xc8b49a, accent: 0xc9b99a, hat: 'cap', traits: ['tool', 'apron', 'glasses'], size: 1.2, eye: 0xf6dc52 },
    challenge: [
      'Forty-two inches by seventy, three layers, buttoned on the quarter. That\'s a Quiet House door.',
      'I padded every wall up there. You could scream in the back room and the snow outside wouldn\'t shift.',
      'Let me measure you. Hold still. Everything I measure, I pad.',
    ],
    beaten: [
      'You put my own felt between us and I couldn\'t find you. Seventy inches, wasted.',
      'Take the offcuts, if you like. I\'ll not be padding anything this week.',
    ],
    coins: COINS,
  },
  {
    id: 'hush-clapperless-bell',
    court: 'hush',
    name: 'The Clapperless Bell',
    foeName: 'Sexton Toll',
    foeElement: 'metal',
    difficulty: 5,
    gimmick: 'hush-clapperless-bell',
    at: { x: 1150, y: 1000 },
    look: { body: 0xb8a490, accent: 0x9a7a4a, hat: 'hood', traits: ['beard', 'cane'], size: 1.3, eye: 0xd0ae72 },
    challenge: [
      '(he does not speak. He lays a hand on the bell frame, and the whole green goes still.)',
      '(whispering) Matins, Vespers, Compline. I swing it and nobody hears it, and everybody stops.',
      '(whispering) That\'s a real toll, stranger. A real one only frightens people. This one rules them.',
    ],
    beaten: [
      '(whispering) It rang. You made it ring. I\'d forgotten it was an E.',
      '(he sits down on the sill beam and covers his ears, and then, slowly, uncovers them.)',
    ],
    coins: COINS,
  },
  {
    id: 'hush-creaking-boards',
    court: 'hush',
    name: 'Creaking Boards',
    foeName: 'Sneak Tiptoe',
    foeElement: 'subterfuge',
    difficulty: 5,
    gimmick: 'hush-creaking-boards',
    at: { x: 1800, y: 1136 },
    look: { body: 0xa89c90, accent: 0x222e3d, hat: 'cowl', traits: ['lantern', 'scarf'], size: 0.92, eye: 0xffd88a },
    challenge: [
      '(behind you — you never heard him) Evening. Lovely boards on this walk. Every one of them talks.',
      'I know which. I walk the gaps. Felt soles, three layers. You\'re in boots. I heard you at the gate.',
      'Step on the chalk and the lantern finds you. Step off it and I do.',
    ],
    beaten: [
      'You jumped the boards. Nobody jumps the boards. That\'s — that\'s noise in the air. Is that allowed?',
      'Off you go. I\'ll know where you are. I always do. (he doesn\'t, any more.)',
    ],
    coins: COINS,
  },
  {
    id: 'hush-sign-language',
    court: 'hush',
    name: 'Sign Language',
    foeName: 'Signer Palm',
    foeElement: 'psychic',
    difficulty: 5,
    gimmick: 'hush-sign-language',
    at: { x: 2150, y: 966 },
    look: { body: 0xe0ccb8, accent: 0x8a6ab8, hat: 'beanie', traits: ['glasses', 'book'], size: 1.05, eye: 0xe8c8ff },
    challenge: [
      '(he signs STOP, then points at you, then signs HUSH, slowly, the way you would to a small child)',
      '(whispering) Four shapes, stranger. Everything a person needs to say fits in four. I teach them.',
      '(whispering) Stand on what I sign. That\'s the lesson. Every child in Hush passes it in the end.',
    ],
    beaten: [
      '(he starts to sign something, stops, and stares at his own hands as if they\'d done it without him)',
      '(whispering) That wasn\'t one of the four. What was that? What did I just say?',
    ],
    coins: COINS,
  },
];
