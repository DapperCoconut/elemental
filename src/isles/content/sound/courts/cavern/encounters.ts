import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { CALL_AND_ANSWER } from './gimmicks/callAndAnswer';
import { FEEDBACK } from './gimmicks/feedback';
import { SONAR } from './gimmicks/sonar';
import { STALACTITE_CHIMES } from './gimmicks/stalactiteChimes';
import { WHISPERING_GALLERY } from './gimmicks/whisperingGallery';
import { AT_CHIRRUP, AT_DRIP, AT_HALLOO, AT_MURMUR, AT_SQUEAL } from './spots';

/**
 * The Cavern Court's five champions — the keepers of the Repeat, who make sure the Score sung
 * into these caves never stops coming back. Tier 2 of Choirholm (difficulty 4,5,5,5,5). In from
 * the Brass road you meet Squeal at the Tuners' listening post, Drip under the Chime Hall, Halloo
 * at the Echo Wall; over the rope bridges Murmur keeps the Whispering Gallery and Chirrup the
 * Bat Hollow.
 */

export const CAVERN_GIMMICKS: GimmickDef[] = [WHISPERING_GALLERY, STALACTITE_CHIMES, CALL_AND_ANSWER, FEEDBACK, SONAR];

const COINS = 115;

export const CAVERN_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'cavern-whispering-gallery',
    court: 'cavern',
    name: 'Whispering Gallery',
    foeName: 'Gallery-Keeper Murmur',
    foeElement: 'shadow',
    difficulty: 4,
    gimmick: 'cavern-whispering-gallery',
    at: AT_MURMUR,
    look: { body: 0x9a9cb0, accent: 0x3a3a5a, hat: 'hood', traits: ['lantern', 'scarf'], size: 0.95, eye: 0xb0b8ff },
    challenge: [
      '(whispering) Shh. Stand there. No — there. On the plate. Now say something.',
      '…You see? Across the room, clear as a bell. I keep the gallery so the Tuners can hear every word.',
      'The whole court whispers here and thinks it is private. It is never private. Mind your blows.',
    ],
    beaten: [
      '(whispering) You heard it come round. Most people never think to listen.',
      'I will tell you a secret, since you will hear it anyway: I stopped writing down what I heard years ago.',
    ],
    coins: COINS,
  },
  {
    id: 'cavern-stalactite-chimes',
    court: 'cavern',
    name: 'Stalactite Chimes',
    foeName: 'Chimer Drip',
    foeElement: 'ice',
    difficulty: 5,
    gimmick: 'cavern-stalactite-chimes',
    at: AT_DRIP,
    look: { body: 0xd8e4ec, accent: 0x6a8aa0, hat: 'beanie', traits: ['tool', 'scarf', 'glasses'], size: 1.05, eye: 0xcfefff },
    challenge: [
      'Every chime in this hall is tuned to the Score. I band them, I freeze their tips, I hang them right.',
      'A heavy step down here and the roof sings. A heavy blow, and it sings on your head.',
      'Mind the shadows, stranger. When they get small and dark, move.',
    ],
    beaten: [
      'You knew to watch the shadows. Good. Half the hall has a dent from someone who didn\'t.',
      'I\'ll band new ones. The roof grows them back, a finger a year. I am patient.',
    ],
    coins: COINS,
  },
  {
    id: 'cavern-call-and-answer',
    court: 'cavern',
    name: 'Call and Answer',
    foeName: 'Caller Halloo',
    foeElement: 'water',
    difficulty: 5,
    gimmick: 'cavern-call-and-answer',
    at: AT_HALLOO,
    look: { body: 0xc8b49a, accent: 0x2a6a8a, hat: 'souwester', traits: ['beard', 'pipe'], size: 1.2, eye: 0x9ae0ff },
    challenge: [
      'HALLOO! …halloo… halloo… You hear that? The wall\'s been answering me forty years. Never once wrong.',
      'Every morning the households come to the Echo Wall and give it their verse, to keep the Repeat topped up.',
      'I call the verse. The wall calls it back. And whatever you throw at my wall, stranger, comes back too.',
    ],
    beaten: [
      'HALLOO… (quietly) Well. The wall answered you instead. That\'s a first.',
      'Don\'t stand in front of it on your way out. It remembers a while.',
    ],
    coins: COINS,
  },
  {
    id: 'cavern-feedback',
    court: 'cavern',
    name: 'Feedback',
    foeName: 'Howler Squeal',
    foeElement: 'electricity',
    difficulty: 5,
    gimmick: 'cavern-feedback',
    at: AT_SQUEAL,
    look: { body: 0xb8a890, accent: 0xc8703a, hat: 'goggles', traits: ['tool', 'satchel'], size: 0.9, eye: 0xfff27a },
    challenge: [
      'The Tuners\' horns hear the whole cave. I wired two of them to hear each other. Listen to them go.',
      'Every pass, a little louder. Five passes and the room can\'t hold it. I LOVE that bit.',
      'You can stand in it and shut it up. If you don\'t mind your ears ringing for a week.',
    ],
    beaten: [
      'You kept damping it! Spoilsport. My best squeal in years and you sat on it.',
      'Fine. FINE. I\'ll go and rewire something. Something louder.',
    ],
    coins: COINS,
  },
  {
    id: 'cavern-sonar',
    court: 'cavern',
    name: 'Sonar',
    foeName: 'Batkeeper Chirrup',
    foeElement: 'hunt',
    difficulty: 5,
    hpMult: 1.05,
    gimmick: 'cavern-sonar',
    at: AT_CHIRRUP,
    look: { body: 0x8a7a6a, accent: 0x5a2a3a, hat: 'cowl', traits: ['lantern', 'pack'], size: 1, eye: 0xff6a6a },
    challenge: [
      '(a click of the tongue) There you are. My bats heard you crossing the bridge. Nine planks. You skipped one.',
      'The Prince keeps them to hunt for voices singing in the dark where the Tuners can\'t see. They find them.',
      'I\'ll put the lamp out now. Make a sound and they\'ll know where you were.',
    ],
    beaten: [
      'Hm. You learned to move after you spoke. Nobody in this court remembers how to do that.',
      'Go on. I\'ll light the lamp. The bats are sulking.',
    ],
    coins: COINS,
  },
];
