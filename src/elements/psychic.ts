import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Psychic — a test element, reachable only from a cheat-mode save for now.
 *
 * A purple monk who spent years staring at a chessboard until the eye in the middle of his
 * forehead opened. What came back through it was two seconds of the future: every ability the
 * enemy presses is held two seconds before it happens, and he can see the queue over his own
 * head. He can also see where they will be standing a second from now, as their shadow.
 *
 * Everything he presses is a piece. Click throws pawns; E, R and F stand a bishop, knight or
 * rook on the board with an aura he wants to be standing in; click a piece to move it the way
 * that piece moves, through anybody in its way. Q crowns him the queen.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in PsychicKit.
 */

const enPassant: Ability = {
  id: 'psychic-en-passant',
  name: 'En Passant',
  description: 'Throw a pawn a short step toward your cursor — 8 damage to anything it walks into. When it stops it captures on the two diagonals in front of it for 16, and again every second until it vanishes 3 seconds later. Click one of your own pieces instead to pick it up, then click again to move it.',
  displayKey: 'Click',
  cooldown: 650,
  cast(ctx: CastContext) { ctx.psychicEnPassant(ctx.targetX, ctx.targetY); },
};

const bisharp: Ability = {
  id: 'psychic-bishop',
  name: 'Bisharp',
  description: 'Stand a bishop on your cursor for 8 seconds. It pours heavenly light around it: 15% less damage taken while you stand in it, stacking with every other bishop. Click it, then click again, to slide it diagonally like a real bishop — 40 damage to everyone it passes through. A piece can move once every 2 seconds.',
  displayKey: 'E',
  cooldown: 6000,
  cast(ctx: CastContext) { ctx.psychicBishop(ctx.targetX, ctx.targetY); },
};

const knightlyMandate: Ability = {
  id: 'psychic-knight',
  name: 'Knightly Mandate',
  description: 'Stand a knight on your cursor for 8 seconds. Its aura makes you 15% faster while you stand in it, stacking with every other knight. Click it, then click again, to jump it like a chess knight — it lands in an explosion that deals 35 to everything nearby.',
  displayKey: 'R',
  cooldown: 6000,
  cast(ctx: CastContext) { ctx.psychicKnight(ctx.targetX, ctx.targetY); },
};

const rookBattery: Ability = {
  id: 'psychic-rook',
  name: 'Rook Battery',
  description: 'Stand a rook on your cursor for 8 seconds. Its aura makes you deal 15% more damage while you stand in it, stacking with every other rook. Click it, then click again, to slide it along a rank or file — 45 damage to everyone in the way, and any piece it runs over is captured: you wear that piece\'s aura for 30 seconds, wherever you go.',
  displayKey: 'F',
  cooldown: 8000,
  cast(ctx: CastContext) { ctx.psychicRook(ctx.targetX, ctx.targetY); },
};

const queen: Ability = {
  id: 'psychic-queen',
  name: 'Queen',
  description: 'Become the queen for 15 seconds: every aura at once, three times over — 45% less damage taken, 45% more damage dealt and 45% faster. You can no longer walk. Click to move yourself like a queen, in any of eight directions, through anyone in the way for 25, and land in an explosion that deals 20 to anyone you did not already pass through.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 30000,
  cast(ctx: CastContext) { ctx.psychicQueen(); },
};

export const psychicElement: Element = {
  id: 'psychic',
  name: 'Psychic',
  color: 0xe8e4d8,
  emoji: '👁️',
  abilities: [enPassant, bisharp, knightlyMandate, rookBattery, queen],
};
