import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const silenceFade: Ability = {
  id: 'silence-fade',
  name: 'Fade',
  description: 'Hold: go invisible, charge fear near enemy. Release: AOE burst scales with fear.',
  displayKey: 'Click',
  cooldown: 3000,
  cast(_ctx: CastContext) { /* logic in ArenaScene input block */ },
};

const silenceDontLook: Ability = {
  id: 'silence-dont-look',
  name: "Don't Look",
  description: 'Spawn a 20° black cone. Enemy inside: slow + tick dmg. Full 5s inside: 3s stun.',
  displayKey: 'E',
  cooldown: 8000,
  cast(ctx: CastContext) {
    const dx = ctx.targetX - ctx.casterX;
    const dy = ctx.targetY - ctx.casterY;
    ctx.silenceCastDontLook(Math.atan2(dy, dx));
  },
};

const silencePossess: Ability = {
  id: 'silence-possess',
  name: 'Possess',
  description: 'Fire a black-eye projectile. On hit: enemy mirrors your movements for 8s.',
  displayKey: 'R',
  cooldown: 12000,
  cast(ctx: CastContext) {
    const dx = ctx.targetX - ctx.casterX;
    const dy = ctx.targetY - ctx.casterY;
    ctx.silenceFirePossess(Math.atan2(dy, dx));
  },
};

const silenceThriller: Ability = {
  id: 'silence-thriller',
  name: 'Thriller',
  description: 'Enter Slasher mode: 10 hit points, machete kit. CD starts on exit.',
  displayKey: 'F',
  cooldown: 15000,
  cast(_ctx: CastContext) { /* logic in ArenaScene input block */ },
};

const silenceTheyWatch: Ability = {
  id: 'silence-watch',
  name: 'They Watch',
  description: 'Goop + eyes coat the border. You are locked but immune. Click fires shadow tendrils (2s CD). 10s.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 60000,
  cast(ctx: CastContext) { ctx.silenceStartWatch(); },
};

// ── Slasher mode abilities ────────────────────────────────────────────────────

const silenceMachete: Ability = {
  id: 'silence-machete',
  name: 'Machete',
  description: 'Slash in an arc, dealing 14 dmg to nearby enemies.',
  displayKey: 'Click',
  cooldown: 500,
  cast(ctx: CastContext) {
    const dx = ctx.targetX - ctx.casterX;
    const dy = ctx.targetY - ctx.casterY;
    ctx.silenceMachete(Math.atan2(dy, dx));
  },
};

const silenceMeatHook: Ability = {
  id: 'silence-meat-hook',
  name: 'Meat Hook',
  description: 'Launch a hook. Hit: 8 dmg. Recast E within 4s to yank enemy close.',
  displayKey: 'E',
  cooldown: 5000,
  cast(ctx: CastContext) {
    const dx = ctx.targetX - ctx.casterX;
    const dy = ctx.targetY - ctx.casterY;
    ctx.silenceThrowHook(Math.atan2(dy, dx));
  },
};

const silenceMortalWound: Ability = {
  id: 'silence-mortal-wound',
  name: 'Mortal Wound',
  description: '1.5s windup: aim a devastating slash. Hit = 5x teleport-slashes (8 dmg each). Miss = -25% speed for 2s.',
  displayKey: 'R',
  cooldown: 12000,
  cast(ctx: CastContext) {
    const dx = ctx.targetX - ctx.casterX;
    const dy = ctx.targetY - ctx.casterY;
    ctx.silenceMortalWound(Math.atan2(dy, dx));
  },
};

const silenceRetire: Ability = {
  id: 'silence-retire',
  name: 'Retire',
  description: 'Exit Slasher mode. Take 5 dmg per hit point lost.',
  displayKey: 'F',
  cooldown: 0,
  cast(_ctx: CastContext) { /* logic in ArenaScene input block */ },
};

const silenceSlashEmUp: Ability = {
  id: 'silence-slash-em-up',
  name: 'Slash Em Up',
  description: 'Leafy trees spawn at border. Teleport to each + slash enemy 5 times for 10 dmg. Invincible throughout.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 50000,
  cast(ctx: CastContext) { ctx.silenceSlashEmUp(); },
};

export const silenceElement: Element = {
  id: 'silence',
  name: 'Silence',
  color: 0x1a0022,
  emoji: '🫥',
  abilities: [
    silenceFade,
    silenceDontLook,
    silencePossess,
    silenceThriller,
    silenceTheyWatch,
    // Slasher mode
    silenceMachete,
    silenceMeatHook,
    silenceMortalWound,
    silenceRetire,
    silenceSlashEmUp,
  ],
};
