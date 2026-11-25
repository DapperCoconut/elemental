import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_COUNTERMINE } from './countermine';
import { FALLEN_THIRD_MAN } from './everyThirdMan';
import { FALLEN_RIGHT_OF_WAY } from './rightOfWay';
import { FALLEN_RUN_OUT } from './runOutTheGuns';
import { FALLEN_SHELL_BY_SHELL } from './shellByShell';

/**
 * The War Court's Fallen Five — in the star's telling, the people of the mustering ground who
 * did the Prince's work with their own hands: the bombardier who laid the saluting guns on the
 * crowd, the sapper who dug under the barracks, the magazine-corporal who counted boys out by the
 * shell, the sabre-master who taught the Prince on boys who could not strike back, and the
 * drill-sergeant who kept the old punishment. Tier 4: difficulty 5 throughout; coins double the
 * court's 135. They stand where the court's own five do not: the siege park's edge, the east end
 * of the trench line, the barracks lane, the colour party's tents, and the parade ground's edge.
 */

const EYE = 0xffa040;
const COINS = 270;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_RUN_OUT, FALLEN_COUNTERMINE, FALLEN_SHELL_BY_SHELL, FALLEN_RIGHT_OF_WAY, FALLEN_THIRD_MAN],
  encounters: [
    {
      id: fallenId('war', 'run-out'),
      court: 'war',
      name: 'Run Out the Guns',
      foeName: 'Bombardier Hodge Ferrant',
      foeElement: 'pressure',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('war', 'run-out'),
      at: { x: 1560, y: 1280 },
      look: { body: 0xb89070, accent: 0x9a6a34, hat: 'shako', traits: ['beard', 'tool'], size: 1.2, eye: EYE },
      challenge: [
        'Salute guns, they were. Blank charges. Mostly blank. The mothers came up the slope all the same.',
        'A gun is honest, friend. It goes where it\'s laid and it comes back the way it went.',
        'Stand in front and you meet the ball. Stand behind and you meet the gun. Where will you stand?',
      ],
      beaten: [
        'Blank charges. I loaded the blanks myself, every Sunday, for the band. Only ever the blanks.',
        'Why do I remember the weight of a ball in my hand? I never... the mothers were singing. Weren\'t they?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('war', 'countermine'),
      court: 'war',
      name: 'Countermine',
      foeName: 'Sapper Idris Mattock',
      foeElement: 'clay',
      difficulty: 5,
      hpMult: 1.1,
      gimmick: fallenId('war', 'countermine'),
      at: { x: 2250, y: 770 },
      look: { body: 0xa08060, accent: 0x5c4834, hat: 'miner', traits: ['tool', 'satchel', 'bandage'], size: 1.1, eye: EYE },
      challenge: [
        'Hear that? No. Nobody hears it. That\'s the whole art of it. You hear it when it\'s under you.',
        'Number Nine wouldn\'t take his draw. Barracks Three, the left-hand bunk. I knew to the inch.',
        'Walk where you like. I\'ll be along underneath.',
      ],
      beaten: [
        'I dug drains. For the trench, when it flooded. I dug the boys out, not... I dug them out.',
        'Number Nine. He lent me his spade the week mine broke. Why would I have — I wouldn\'t have.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('war', 'shell-by-shell'),
      court: 'war',
      name: 'Shell by Shell',
      foeName: 'Magazine-Corporal Petronel Shank',
      foeElement: 'ruin',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('war', 'shell-by-shell'),
      at: { x: 1000, y: 1400 },
      look: { body: 0xc8a080, accent: 0xa02430, hat: 'cap', traits: ['pack', 'scarf'], size: 1.0, eye: EYE },
      challenge: [
        'One boy, one shell. That\'s how the magazine reckons. It\'s a very tidy way to count.',
        'They pass them up the line to the pit and they never once drop one. Not while I\'m watching.',
        'You\'re not on my roll. Never mind. The mortar doesn\'t read the roll either.',
      ],
      beaten: [
        'I kept the powder dry. That\'s all a magazine-corporal is for. Dry powder, dry socks, a hot brew.',
        'The boys used to pass me mugs of tea up that line. Hand to hand. Tea. I\'m sure it was tea.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('war', 'right-of-way'),
      court: 'war',
      name: 'Right of Way',
      foeName: 'Sabre-Master Casimir Voss',
      foeElement: 'ice',
      difficulty: 5,
      hpMult: 1.0,
      gimmick: fallenId('war', 'right-of-way'),
      at: { x: 200, y: 450 },
      look: { body: 0xd8c0a8, accent: 0x1c1a20, hat: 'wig', traits: ['cane', 'eyepatch'], size: 0.95, eye: EYE },
      challenge: [
        'On the piste the attacker has the right of way. I taught the Prince that before he could read.',
        'He practised on the drafted boys. They were not permitted to attack. So they never had the right.',
        'En garde. You may attack, of course. Whether you will is another lesson.',
      ],
      beaten: [
        'Touché. Cleanly. I never taught the Prince anything. He wouldn\'t hold the sabre. He cried at it.',
        'I gave fencing lessons to the barracks boys, on Saturdays, for nothing. Didn\'t I? I think I did.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('war', 'third-man'),
      court: 'war',
      name: 'Every Third Man',
      foeName: 'Drill-Sergeant Obadiah Thrale',
      foeElement: 'justice',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId('war', 'third-man'),
      at: { x: 1000, y: 820 },
      look: { body: 0xc0906c, accent: 0xb8222e, hat: 'bandmaster', traits: ['beard', 'cane'], size: 1.3, eye: EYE },
      challenge: [
        'A company that grumbles is numbered off. It is the oldest drill there is. Older than the Wheel.',
        'Nobody is chosen, you understand. The count simply arrives. I find that a great comfort.',
        'Fall in. Anywhere you like. The count will find you where you stand.',
      ],
      beaten: [
        'Three, six, nine. I only ever called the numbers. I never — I called them for the mess queue.',
        'Every third man got seconds of pudding. That was the drill. Why did I think it was anything else?',
      ],
      coins: COINS,
    },
  ],
};
