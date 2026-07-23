import { Element } from './Element';
import { Ability } from './Ability';

const plasmaBurst: Ability = {
  id: 'plasma-burst',
  name: 'Plasma Burst',
  description: 'Arc lightning to the cursor and drop 3 small AoEs there (0.2s apart), each dealing 4 damage. Any that hit nothing snap a red bolt back to you for 2 self-damage — reward good aim!',
  displayKey: 'Click',
  cooldown: 600,
  cast(ctx) { ctx.plasmaBurst(ctx.targetX, ctx.targetY); },
};

const unstableArena: Ability = {
  id: 'plasma-arena',
  name: 'Unstable Arena',
  description: 'Summon a pulsing zone at cursor. Anyone standing in it for 3 consecutive seconds triggers an 80 AoE explosion — including the caster.',
  displayKey: 'E',
  cooldown: 10000,
  cast(ctx) { ctx.plasmaUnstableArena(ctx.targetX, ctx.targetY); },
};

const plasmaCurrent: Ability = {
  id: 'plasma-current',
  name: 'Plasma Current',
  description: 'Launch 2 parallel orbs with an electric chain between them (2 dmg/0.1s to enemies in chain). Hold R to widen the gap. Hitting an orb deals 10 damage and triggers a chain explosion.',
  displayKey: 'R',
  cooldown: 8000,
  cast(ctx) { ctx.plasmaCurrentLaunch(ctx.targetX, ctx.targetY); },
};

const chaosBlades: Ability = {
  id: 'plasma-chaos-blades',
  name: 'Chaos Blades',
  description: 'Release 3 plasma blades 120° apart — they bounce off walls for 8s. Blades hit enemies AND caster. Hits apply Chaos: releases 5 orbs every 5s for 15s (10 dmg on pickup).',
  displayKey: 'F',
  cooldown: 12000,
  cast(ctx) { ctx.plasmaChaosBlades(); },
};

const chaosIncarnate: Ability = {
  id: 'plasma-chaos-incarnate',
  name: 'Chaos Incarnate',
  description: 'Become invincible for 5s as a plasma ball (15% speed). Touching enemy deals 50 damage. Auto-chains lightning to nearby enemies every 0.5s.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 30000,
  cast(ctx) { ctx.plasmaChaosIncarnate(); },
};

export const plasmaElement: Element = {
  id: 'plasma',
  name: 'Plasma',
  color: 0xaa22ff,
  emoji: '🔮',
  abilities: [plasmaBurst, unstableArena, plasmaCurrent, chaosBlades, chaosIncarnate],
};
