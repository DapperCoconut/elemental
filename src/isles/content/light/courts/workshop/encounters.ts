import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { BLUEPRINT_GIMMICK } from './gimmicks/blueprint';
import { GLASSBLOWING_GIMMICK } from './gimmicks/glassblowing';
import { GOLEM_GIMMICK } from './gimmicks/golem';
import { KINETIC_GIMMICK } from './gimmicks/kineticSculpture';
import { PROTOTYPE_GIMMICK } from './gimmicks/prototype';

/**
 * The Workshop Court's five champions — the master artificers who answer to Prince Artifex. Tier 3
 * of Solmara (difficulty 5 across the board). In from the Noon road you meet Plan among the drafting
 * tables, Molten between the furnaces, Gizmo in the automata market, Kiln in the sculptor's yard
 * and Mobile under the crane in the crane yard.
 */

export const WORKSHOP_GIMMICKS: GimmickDef[] = [BLUEPRINT_GIMMICK, PROTOTYPE_GIMMICK, GLASSBLOWING_GIMMICK, GOLEM_GIMMICK, KINETIC_GIMMICK];

const COINS = 130;

export const WORKSHOP_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'workshop-blueprint',
    court: 'workshop',
    name: 'Blueprint',
    foeName: 'Draughtsman Plan',
    foeElement: 'paper',
    difficulty: 5,
    gimmick: 'workshop-blueprint',
    at: { x: 640, y: 1040 },
    look: { body: 0xe0ccb4, accent: 0x2a5c9a, hat: 'tophat', traits: ['book', 'glasses', 'satchel'], size: 1, eye: 0x8ae6ff },
    challenge: [
      'Every Heliostat mirror began on this terrace as a line. My line. Ruled in the sun, for the Office to see.',
      'A thing built off-plan is a thing built in the dark. I have never once built off-plan.',
      'Here is a turret, in chalk. Build your share of it, stranger, or it will know whose it is not.',
    ],
    beaten: [
      'You knocked my parts off the plan. Off it! And it still worked. I must re-think everything I believe.',
      'Go on. Mind the chalk. I shall have to draw it all again.',
    ],
    coins: COINS,
  },
  {
    id: 'workshop-prototype',
    court: 'workshop',
    name: 'Prototype',
    foeName: 'Tinker Gizmo',
    foeElement: 'technology',
    difficulty: 5,
    gimmick: 'workshop-prototype',
    at: { x: 1600, y: 1130 },
    look: { body: 0xd8b494, accent: 0xc06a3a, hat: 'goggles', traits: ['tool', 'apron', 'pack'], size: 0.9, eye: 0xf6d98a },
    challenge: [
      'Prototype eight hundred and nine. Eight hundred and ten. Eight-eleven. I don\'t test them. Testing is slow.',
      'One in three goes bang. That\'s the cost of progress. I\'ve got eyebrows growing back as we speak.',
      'Bench is running. First to the pedestal gets the toy. Ready? I\'m not. Never am. GO.',
    ],
    beaten: [
      'You let me grab the duds. You WATCHED for the smoke. That\'s… that\'s testing. You tested them.',
      'Hmph. Fine. I\'ll start looking at them before I pick them up. Starting tomorrow. Probably.',
    ],
    coins: COINS,
  },
  {
    id: 'workshop-glassblowing',
    court: 'workshop',
    name: 'Glassblowing',
    foeName: 'Gaffer Molten',
    foeElement: 'magma',
    difficulty: 5,
    gimmick: 'workshop-glassblowing',
    at: { x: 430, y: 1460 },
    look: { body: 0xc8987a, accent: 0xff8a2a, hat: 'headwrap', traits: ['apron', 'bandage', 'beard'], size: 1.2, eye: 0xffd27a },
    challenge: [
      'Gather, turn, blow. I\'ve blown four thousand mirror blanks for the Heliostat and never a crooked one.',
      'Soft glass splashes. Hard glass cuts. A gaffer knows which is which by the colour. Do you?',
      'Stand still, stranger. I\'ve a bubble here with your name in the bottom of it.',
    ],
    beaten: [
      'You broke my glass on me. Clean breaks, every one. Mother Cullet would have liked you.',
      'Off you go. I\'ll sweep the cullet. It all goes back in the pot. Nothing\'s ever wasted here.',
    ],
    coins: COINS,
  },
  {
    id: 'workshop-golem',
    court: 'workshop',
    name: 'Golem',
    foeName: 'Sculptor Kiln',
    foeElement: 'clay',
    difficulty: 5,
    gimmick: 'workshop-golem',
    at: { x: 1830, y: 1510 },
    look: { body: 0xc89a7a, accent: 0xb8724a, hat: 'beret', traits: ['apron', 'tool', 'glasses'], size: 1.05, eye: 0xd8986c },
    challenge: [
      'I make the statues of His Brilliance for every square on Solmara. Clay first, then brass. Always clay first.',
      'This one\'s half-made. It\'ll fight for whoever finishes it. My hands know clay. Do yours?',
      'Every blow you land on it is a thumb-mark. Make sure it\'s yours, or it\'ll come for you.',
    ],
    beaten: [
      'You shaped it better than I did. With your fists. That\'s… honestly that\'s how it should be done.',
      'Leave it be. I\'ll wedge it back down. Clay forgives. That\'s why I like it.',
    ],
    coins: COINS,
  },
  {
    id: 'workshop-kinetic',
    court: 'workshop',
    name: 'Kinetic Sculpture',
    foeName: 'Artisan Mobile',
    foeElement: 'gravity',
    difficulty: 5,
    gimmick: 'workshop-kinetic',
    at: { x: 2180, y: 860 },
    look: { body: 0xdcc4a8, accent: 0xd6a646, hat: 'wizard', traits: ['cane', 'scarf'], size: 1.1, eye: 0xf2c84a },
    challenge: [
      'A mobile is a sum. Weight times arm, on both sides, forever. Mine balances to the grain.',
      'It hangs under the crane where the light is best. The shadows go round like clock-hands. Tiny ones.',
      'When the weights come down, mind your head. I balanced it. I did not make it kind.',
    ],
    beaten: [
      'You spun it. You put your weight on my sum and made it come out your way. Rude. Brilliant.',
      'Let it settle. Everything does, if you leave it long enough.',
    ],
    coins: COINS,
  },
];
