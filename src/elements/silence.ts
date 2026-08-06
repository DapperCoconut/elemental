import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const silenceStab: Ability = {
  id: 'silence-stab',
  name: 'Stab',
  description: 'Dash forward and stab (20 dmg, up to 45 — consumes all stealth). Backstab: 1.5x dmg + Silence 12s.',
  displayKey: 'Click',
  cooldown: 1000,
  cast(ctx: CastContext) { ctx.silenceStab(ctx.targetX, ctx.targetY); },
};

const silenceWatch: Ability = {
  id: 'silence-watch',
  name: 'Watch',
  description: 'Summon a stalker (max 3). Each: stealth +20% gain / -20% drain, +10% dmg. Matures in 35s. Dies to one hit.',
  displayKey: 'E',
  cooldown: 5000,
  cast(ctx: CastContext) { ctx.silenceSummonStalker(ctx.targetX, ctx.targetY); },
};

const silenceRitual: Ability = {
  id: 'silence-ritual',
  name: 'Ritual',
  description: 'Circle at cursor; after 1s a red beam strikes: 25 dmg + Silence 20s. On a mature stalker: becomes a Grabber.',
  displayKey: 'R',
  cooldown: 14000,
  cast(ctx: CastContext) { ctx.silenceRitual(ctx.targetX, ctx.targetY); },
};

const silenceFeast: Ability = {
  id: 'silence-feast',
  name: 'Feast',
  description: 'Teeth circle for 8s. Enemy inside for 6s total: 35 dmg + Hallucinations 30s (players see horrors; bots miss 20%).',
  displayKey: 'F',
  cooldown: 18000,
  cast(ctx: CastContext) { ctx.silenceFeast(ctx.targetX, ctx.targetY); },
};

const silenceRun: Ability = {
  id: 'silence-run',
  name: 'Run',
  description: 'Grab with a gangly arm. On hit: drag both to the hallway — become the blob, chase them down. Caught = 80 dmg. Click: spit (5 dmg, slow).',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 60000,
  cast(ctx: CastContext) { ctx.silenceRun(ctx.targetX, ctx.targetY); },
};

export const silenceElement: Element = {
  id: 'silence',
  name: 'Silence',
  color: 0x1a0022,
  emoji: '🫥',
  abilities: [
    silenceStab,
    silenceWatch,
    silenceRitual,
    silenceFeast,
    silenceRun,
  ],
};
