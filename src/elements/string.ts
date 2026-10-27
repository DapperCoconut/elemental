import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * String — a test element, reachable only from a cheat-mode save for now.
 *
 * A big velvet-black spider. Every click throws a taut, hooked string that bites an enemy (where it
 * strikes them) or a wall and stays tied to the spider: enemies run into them, pull on them, shoot
 * them — and a string that snaps lashes whoever broke it. Spiders walk the strings, a purple
 * hexing strand slows everything that brushes it, a control bar puts an enemy's feet on your arrow
 * keys, and Linen Tomb wraps them in silk in the middle of the arena until they cut their way out.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in StringKit.
 */

const snag: Ability = {
  id: 'string-snag',
  name: 'Tension Snag',
  description: 'Throw a heavy string at your cursor. It hooks the first enemy it hits (6 damage) or the wall, and stays tied to you for 12s (up to 5). Enemies cannot walk through a string — push on one too hard, pull too far on the one tied to them, or shoot one, and it snaps for 16 damage to whoever broke it.',
  displayKey: 'Click',
  cooldown: 700,
  cast(ctx: CastContext) { ctx.stringSnag(ctx.targetX, ctx.targetY); },
};

const spiders: Ability = {
  id: 'string-spider-dance',
  name: 'Spider Dance',
  description: 'Five huge spiders climb onto your strings and walk them back and forth for 8s, biting enemies they touch for 8. A spider on a string that snaps runs off in a frenzy, still biting.',
  displayKey: 'E',
  cooldown: 10000,
  cast(ctx: CastContext) { ctx.stringSpiders(); },
};

const hex: Ability = {
  id: 'string-hexing-strand',
  name: 'Hexing Strand',
  description: 'Throw a thick purple strand instead of a string. Enemies walk straight through it but are slowed while they touch it; it takes 3 shots to snap. Recast to snap it yourself: 22 damage and a heavy 3.5s slow to everyone caught in it.',
  displayKey: 'R',
  cooldown: 9000,
  cast(ctx: CastContext) { ctx.stringHex(ctx.targetX, ctx.targetY); },
};

const marionette: Ability = {
  id: 'string-marionette',
  name: 'Marionette',
  description: 'Throw a control bar. An enemy it hits is your puppet for 5s: they move as they please, until you press the arrow keys — then they walk where you steer them.',
  displayKey: 'F',
  cooldown: 14000,
  cast(ctx: CastContext) { ctx.stringMarionette(ctx.targetX, ctx.targetY); },
};

const tomb: Ability = {
  id: 'string-linen-tomb',
  name: 'Linen Tomb',
  description: 'Wrap the enemy nearest your cursor in silk in the middle of the arena, strung to all four corners. The tomb has 100 HP and only their attacks hurt it; until it breaks they cannot move or hurt you, and every attempt to move tears at them — the faster, the worse.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 40000,
  cast(ctx: CastContext) { ctx.stringTomb(ctx.targetX, ctx.targetY); },
};

export const stringElement: Element = {
  id: 'string',
  name: 'String',
  color: 0xd9c8a6,
  emoji: '🕸️',
  abilities: [snag, spiders, hex, marionette, tomb],
};
