import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Paper — a test element, reachable only from a cheat-mode save for now.
 *
 * Two ideas, and they are the same idea. The first is the Journal: Paper is the only element
 * whose passive is written *between* matches rather than during them — every fight you take as
 * Paper is filed away afterwards, and the notes make that specific matchup easier forever. The
 * second is the storybooks: three of them, cycled with right-click, and the click and the
 * ultimate are both entirely different abilities depending on which one is open. Knight, Alien,
 * Fantasy — a blade, a beam, a spike; a cavalry charge, an orbital bombardment, a bouncing fire.
 *
 * The three middle keys belong to nobody's book. A plane you can either throw or ride, a
 * shuriken that sticks where it lands, and six paper monsters lying face-up on the floor waiting
 * for somebody to step on them.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in PaperKit, and the
 * Journal's data lives in `src/data/PaperJournal.ts`.
 */

const storybook: Ability = {
  id: 'paper-storybook',
  name: 'Storybook Summoning',
  description: 'Right-click to cycle between three storybooks; click to use the open one. '
    + '📗 Knight: hurl Excalibur, a ghostly green blade for 15 that bends toward anyone it passes near. '
    + '📘 Alien: a hitscan laser for 4 every 0.5s over 2 seconds, then a 1.5s reload. '
    + '📕 Fantasy: a magic spike for 6 that vanishes through a portal and comes back at them twice more. '
    + 'Passive — the Journal: every fight you take as Paper is written up, and the notes make that matchup easier forever.',
  displayKey: 'Click',
  cooldown: 900,
  cast(ctx: CastContext) { ctx.paperStorybook(ctx.targetX, ctx.targetY); },
};

const paperPlane: Ability = {
  id: 'paper-plane',
  name: 'Paper Plane',
  description: 'Throw a paper plane that deals 10 to anything it passes through. Hold E and you ride it instead — it glides toward your cursor and carries you until you let go, it hits a wall, or it runs out of air.',
  displayKey: 'E',
  cooldown: 8000,
  cast(ctx: CastContext) { ctx.paperPlane(ctx.targetX, ctx.targetY); },
};

const paperShuriken: Ability = {
  id: 'paper-shuriken',
  name: 'Paper Shuriken',
  description: 'Throw a large folded shuriken for 15 and a bleed — 2% of the target\'s remaining health per second for 4 seconds. It buries itself in the first wall it reaches and spins there for 8 seconds, cutting anyone who touches it.',
  displayKey: 'R',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.paperShuriken(ctx.targetX, ctx.targetY); },
};

const macheMonsters: Ability = {
  id: 'paper-mache',
  name: 'Mâché Monsters',
  description: 'Scatter 6 paper fortune-tellers face-up on the floor for 10 seconds. An enemy that steps on one is bitten for 6 and the monster is spent. A monster hit by an enemy projectile eats it, stands up, and chases them down for 8.',
  displayKey: 'F',
  cooldown: 18000,
  cast(ctx: CastContext) { ctx.paperMache(); },
};

const climax: Ability = {
  id: 'paper-climax',
  name: 'Climax',
  description: 'The ending of whichever book is open. '
    + '📗 Knight: ghostly knights and cavalry charge the length of the arena for 50. '
    + '📘 Alien: 12 targeting rings paint the ground, then take laser bombardment — 25 and a 2s stun each. '
    + '📕 Fantasy: a flame spirit ricochets around the arena for 8 seconds, burning a trail behind it.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 40000,
  cast(ctx: CastContext) { ctx.paperClimax(ctx.targetX, ctx.targetY); },
};

export const paperElement: Element = {
  id: 'paper',
  name: 'Paper',
  color: 0xf2ead6,
  emoji: '📄',
  abilities: [storybook, paperPlane, paperShuriken, macheMonsters, climax],
};
