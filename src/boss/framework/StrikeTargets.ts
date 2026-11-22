import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';

/**
 * Things in an arena that a fighter can *strike* — a lever, a rod, a balloon, a prism, a pylon —
 * as opposed to walk into. Each one is an invisible, unkillable Fighter registered in the
 * arena's enemies / enemyGroup (the Blood Tree's trick), so every damage path the engine has —
 * shots, AoE, melee, kit abilities — reaches it, and ArenaScene's projectile overlap routes both
 * sides' shots to it (`strikeTargetHit`). The target never takes damage: each blow is reported
 * to `onStruck` with who landed it, and the body is topped back up.
 */

export type Striker = 'player' | 'npc';

export interface StrikeTargetDef {
  x: number;
  y: number;
  /** Hit radius in px. */
  r: number;
  /** Called once per blow, with who struck it and the blow's damage. */
  onStruck(by: Striker, amount: number): void;
  /**
   * Shots fly on through (each still strikes it once) instead of stopping on it — for things on
   * the floor (junctions, plates) that should not soak up shots aimed at the foe. Default false.
   */
  passThrough?: boolean;
}

export interface StrikeTarget {
  readonly x: number;
  readonly y: number;
  readonly alive: boolean;
  moveTo(x: number, y: number): void;
  /** Resize the hit radius (a growing crystal, an inflating balloon). */
  setRadius(r: number): void;
  remove(): void;
}

interface Live { def: StrikeTargetDef; seen: WeakSet<object> }
const LIVE = new WeakMap<Fighter, Live>();
const BIG = 1_000_000;

export function isStrikeTarget(f: unknown): boolean {
  return f instanceof Fighter && LIVE.has(f);
}

/**
 * A projectile overlapping a strike target. Reports the blow and says whether the shot is
 * spent (false for a pass-through target, or a shot that already struck this one).
 */
export function strikeTargetHit(target: Fighter, proj: { damage: number; isHeal?: boolean }, by: Striker): boolean {
  const live = LIVE.get(target);
  if (!live || proj.isHeal) return false;
  if (live.seen.has(proj)) return false;
  live.seen.add(proj);
  try { live.def.onStruck(by, proj.damage); } catch (e) { console.error('[strike target]', e); }
  return !live.def.passThrough;
}

/** A target that exists nowhere (headless smoke runs): it holds its position and is never struck. */
export function inertStrikeTarget(def: StrikeTargetDef): StrikeTarget {
  let alive = true;
  const t = {
    x: def.x, y: def.y,
    get alive() { return alive; },
    moveTo(x: number, y: number) { t.x = x; t.y = y; },
    setRadius(r: number) { def.r = r; },
    remove() { alive = false; },
  };
  return t;
}

export function makeStrikeTarget(
  scene: Phaser.Scene, def: StrikeTargetDef,
  addEnemy: (f: Fighter) => void, removeEnemy: (f: Fighter) => void,
): StrikeTarget {
  const body = new Fighter(scene, def.x, def.y, 'husk', {
    id: 'strike-target', name: 'Target', color: 0xffffff, emoji: '', abilities: [],
  }, BIG, 0);
  body.setAlpha(0);
  body.forceInvisible = true;
  body.hideHealthBar();
  const pb = body.body as Phaser.Physics.Arcade.Body;
  const fit = (r: number) => {
    // The body is centred on the sprite's origin; offset the circle so it sits on (x, y).
    pb.setCircle(r, body.width / 2 - r, body.height / 2 - r);
  };
  fit(def.r);
  pb.setImmovable(true);
  pb.moves = false;
  LIVE.set(body, { def, seen: new WeakSet() });
  body.on('damaged', (amount: number) => {
    if (amount <= 0) return;
    const by: Striker = body.lastDamageOwner === 'npc' ? 'npc' : 'player';
    body.lastDamageOwner = null;
    body.hp = body.maxHp;
    try { def.onStruck(by, amount); } catch (e) { console.error('[strike target]', e); }
  });
  addEnemy(body);
  let alive = true;
  return {
    get x() { return body.x; },
    get y() { return body.y; },
    get alive() { return alive; },
    moveTo(x: number, y: number) { body.setPosition(x, y); pb.reset(x, y); },
    setRadius(r: number) { def.r = r; fit(r); },
    remove() {
      if (!alive) return;
      alive = false;
      LIVE.delete(body);
      removeEnemy(body);
      body.destroy();
    },
  };
}
