import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Conquest — a test element, reachable only from a cheat-mode save for now.
 *
 * Every other element in the game is a set of things you *do*. Conquest is a set of things you
 * *own*. The arena is quietly a 14×9 board; you start holding nine squares of it with a town
 * center in the middle, and that town center pays you two Authority a second whether you are
 * fighting or not. Everything else in the kit is a way of spending that income — three
 * buildings, each with the two-path four-tier upgrade tree of a tower defence game, and a
 * fifth ability that buys you a whole second economy.
 *
 * The consequence is that Conquest barely fights. Its click is a poke, and standing on your own
 * land cuts that poke to a quarter — the land is where you are safe, not where you are strong.
 * What actually kills the other side is a barracks that has been running for ninety seconds.
 *
 * Every `cast` here is a one-line delegate; the whole simulation lives in ConquestKit.
 */

const banner: Ability = {
  id: 'conquest-banner',
  name: 'Banner Bash',
  description: 'A 260px pike thrust for 20 damage — the longest reach in the game. Only 5 damage while you stand on your own land.',
  displayKey: 'Click',
  cooldown: 700,
  cast(ctx: CastContext) { ctx.conquestBanner(); },
};

const barracks: Ability = {
  id: 'conquest-barracks',
  name: 'Place Barracks',
  description: '35 Authority. 250 HP, and a soldier every 3s up to 3 per square. Soldiers hold their ground for 3 dmg/s until you drag them somewhere else.',
  displayKey: 'E',
  cooldown: 600,
  cast(ctx: CastContext) { ctx.conquestBuild('barracks'); },
};

const turret: Ability = {
  id: 'conquest-turret',
  name: 'Place Turret',
  description: '25 Authority. 100 HP, and a 10 damage bullet every 2s at anything of theirs in range — fighter, soldier or building.',
  displayKey: 'R',
  cooldown: 600,
  cast(ctx: CastContext) { ctx.conquestBuild('turret'); },
};

const barricade: Ability = {
  id: 'conquest-barricade',
  name: 'Place Barricade',
  description: '10 Authority. 300 HP of wall that gives every building beside it — including diagonally — 25% damage resistance.',
  displayKey: 'F',
  cooldown: 600,
  cast(ctx: CastContext) { ctx.conquestBuild('barricade'); },
};

const expansion: Ability = {
  id: 'conquest-expansion',
  name: 'Expansion',
  description: '150 Authority. Plants a second town center where you stand, in its own colour, with its own nine squares, its own income and nine more building slots.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 20000,
  cast(ctx: CastContext) { ctx.conquestExpansion(); },
};

export const conquestElement: Element = {
  id: 'conquest',
  name: 'Conquest',
  color: 0xc23a2e,
  emoji: '🏰',
  abilities: [banner, barracks, turret, barricade, expansion],
};
