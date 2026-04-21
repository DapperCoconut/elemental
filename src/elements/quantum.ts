import { Element } from './Element';

export const echoElement: Element = {
  id: 'echo',
  name: 'Echo',
  color: 0xccccff,
  emoji: '🦇',
  abilities: [
    {
      id: 'echo-shot',
      name: 'Echolocation',
      description: 'Fire a white rectangle that bounces off walls up to 5 times.',
      displayKey: 'Click',
      cooldown: 2000,
      cast(ctx) { ctx.echoEcholocation(ctx.targetX, ctx.targetY); },
    },
    {
      id: 'echo-guess',
      name: 'Guess',
      description: 'AoE at cursor. Hit enemy directly for 30 dmg + reveal; hit nearby for 15 dmg; miss = slowed.',
      displayKey: 'E',
      cooldown: 5000,
      cast(ctx) { ctx.echoGuess(ctx.targetX, ctx.targetY); },
    },
    {
      id: 'echo-lantern',
      name: 'Lantern',
      description: 'Increase vision radius. Or aim at enemy to summon an Echo of them (25 HP, fires their attack).',
      displayKey: 'R',
      cooldown: 10000,
      cast(ctx) { ctx.echoLantern(ctx.targetX, ctx.targetY); },
    },
    {
      id: 'echo-bat',
      name: 'Bat Form',
      description: 'Shrink to half size with double speed. Or aim at enemy to dash-attach and drain their HP.',
      displayKey: 'F',
      cooldown: 15000,
      cast(ctx) { ctx.echoBatForm(ctx.targetX, ctx.targetY); },
    },
    {
      id: 'echo-eclipse',
      name: 'Total Eclipse',
      description: 'Reveal the entire arena for 4s, enemies fire randomly. Or aim at enemy for 8 detonating lines.',
      displayKey: 'Q',
      cooldown: 40000,
      cast(ctx) { ctx.echoEclipse(ctx.targetX, ctx.targetY); },
    },
  ],
};
