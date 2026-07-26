import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Justice — the element earned by putting the Devourer of Kings down.
 *
 * The kit is not written yet. The abilities below are declared so the element
 * has a real identity in the roster and its info panel reads properly, but each
 * `cast` is deliberately inert: `MenuScene` lists Justice with `available:false`
 * until the kit lands, so none of them is reachable from the arena. Anything
 * that *does* reach one gets a single line of feedback rather than a crash.
 *
 * See `dream.ts` for the other half of the choice.
 */

/** Every Justice ability routes through here until the kit exists. */
function pending(ctx: CastContext, name: string): void {
  void ctx; void name;
}

const verdict: Ability = {
  id: 'justice-verdict',
  name: 'Verdict',
  description: 'Strike a mark onto the enemy. The mark remembers every hit they land on you and pays all of it back at once when it expires.',
  displayKey: 'Click',
  cooldown: 900,
  cast(ctx: CastContext) { pending(ctx, 'Verdict'); },
};

const scales: Ability = {
  id: 'justice-scales',
  name: 'The Scales',
  description: 'Hang the scales over the arena. Whichever fighter has taken less damage since they were raised begins taking more of it.',
  displayKey: 'E',
  cooldown: 9000,
  cast(ctx: CastContext) { pending(ctx, 'The Scales'); },
};

const sentence: Ability = {
  id: 'justice-sentence',
  name: 'Sentence',
  description: 'Name a punishment and a window. If the enemy has not answered it by the time the window closes, the punishment lands in full.',
  displayKey: 'R',
  cooldown: 11000,
  cast(ctx: CastContext) { pending(ctx, 'Sentence'); },
};

const gavel: Ability = {
  id: 'justice-gavel',
  name: 'Gavel',
  description: 'Bring the gavel down. Heavy damage in a circle, doubled against anything already carrying a Verdict.',
  displayKey: 'F',
  cooldown: 8000,
  cast(ctx: CastContext) { pending(ctx, 'Gavel'); },
};

const finalJudgement: Ability = {
  id: 'justice-final-judgement',
  name: 'Final Judgement',
  description: 'The court convenes. For eight seconds every wound you have taken this match is read back onto whoever gave it to you.',
  displayKey: 'Q',
  cooldown: 26000,
  cast(ctx: CastContext) { pending(ctx, 'Final Judgement'); },
};

export const justiceElement: Element = {
  id: 'justice',
  name: 'Justice',
  color: 0xf0d68a,
  emoji: '⚖️',
  abilities: [verdict, scales, sentence, gavel, finalJudgement],
};
