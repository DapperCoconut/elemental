import type { MeteorDef } from '../../IslesTypes';
import { METEOR_KEYS } from './spec';

/**
 * What the fallen star says. Sealed, it is a thing — warm glass and sixty eye-slits, described. Opened,
 * it is a person: the Fallen King, small and courteous, lodging his appeal in a judge's measured
 * voice. Inside the Fall he is the way out, and he says so plainly; after his appeal is dismissed,
 * he is only tired, and a little relieved.
 */
export const METEOR: MeteorDef = {
  keys: METEOR_KEYS,
  sealedName: 'The Fallen Star',
  openName: 'The Fallen King',
  sealed: [
    'A cinder the size of a man, shelled over in thin black glass. It is warm through the soles of your boots.',
    'Sixty keyholes ring the shell, each cut the shape of a council-mask’s eye-slit. Every one is looking at you.',
    'Your satchel is heavy with keys. Every prince and monarch handed you one, and nobody ever said what to.',
    'Hold one to the light. Hold it to a slit. They are the same shape. They were always the same shape.',
  ],
  short: [
    'Sixty locks, one for every seat of the Council, and they turn together or not at all. It takes {need}.',
    'You hold {n}. Somewhere in the isles, a few more sentences are still waiting to be signed.',
  ],
  offer: [
    'Good evening. Forgive me for not rising. I am rather smaller than when we last met.',
    'You won on the facts. I do not dispute a single one. I appeal on the law.',
    'Hear the case again: the isles as they stood the day you landed. Every crown on, every court shut.',
    'And this time I send everything I should have sent the first time. Ten champions a court. Myself, last.',
    'It is a telling, not a time. Nobody is truly bound. Speak to me in there, and you wake. Will you hear it?',
  ],
  inFall: [
    'You may stop listening whenever you like. That is the difference between us, I find.',
    'Wake, and the isles are as you left them. The case will keep. I have nowhere else to be.',
  ],
  won: [
    'Dismissed. On the law, too. I had not thought it could be done on the law. I am glad to have been wrong.',
    'There is nothing left in here now but me, and I am going out. Wake. Leave the lamp for the Ferryman.',
  ],
};
