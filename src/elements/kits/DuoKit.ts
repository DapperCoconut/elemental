import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { NpcOpponent, NpcAiState, DifficultyConfig } from '../../entities/NpcOpponent';
import { Element } from '../Element';
import { CastContext } from '../Ability';

/**
 * Duo — the mode under the Normal plate. A second opponent, of a second
 * element, fighting alongside the first.
 *
 * ## Why this is a kit and not just another NpcOpponent
 *
 * ArenaScene has exactly one "npc slot": `npc`, `npcElement`, `npcElementId`.
 * Every element kit's NPC mirror hangs off that slot, `buildNpcContext()` is
 * written against it, and something on the order of a thousand references
 * assume it. Widening that into a list is not a Duo-sized change.
 *
 * So the second opponent borrows the slot instead. Once a frame, this kit swaps
 * `npc`/`npcElement`/`npcElementId` to the partner, runs its decision and
 * whatever cast came out of it, and swaps them straight back — a short,
 * synchronous window that covers the two things that actually need the slot to
 * be right: the AI's own reads and the cast context it is handed.
 *
 * ### What that buys, and what it does not
 *
 * Everything fire-and-forget works exactly as it does in a duel: projectiles,
 * blasts, dashes, summons, heals, buffs applied at cast time. What the partner
 * does *not* get is a per-frame kit tick of its own — ArenaScene's per-element
 * update dispatch still runs for the primary opponent's element only. Abilities
 * whose whole body is a running aura or a multi-frame channel will therefore be
 * quieter on the partner than on the front bot. Picking two different elements
 * (which the menu enforces) keeps the two from fighting over the same mirror
 * state, which is the failure that would actually be visible.
 *
 * Deferred work inside a cast — anything on a `delayedCall` — lands after the
 * window has closed and resolves against the primary slot. That is the known
 * edge of this approach and the reason the window is kept as small as it is.
 */

export interface DuoArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get projectiles(): Phaser.Physics.Arcade.Group;
  get width(): number;
  get height(): number;
  addEnemy(f: Fighter): void;
  removeEnemy(f: Fighter): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  /** Runs `fn` with the arena's npc slot pointed at `f`, then restores it. */
  withNpcSlot<T>(f: NpcOpponent, el: Element, fn: () => T): T;
  buildNpcContext(tx: number, ty: number): CastContext;
  /** True while nothing should be acting — the bout is over. */
  get gameEnded(): boolean;
  /** Steering the active map wants applied to this body, if any. */
  mapSeekPointFor(f: Fighter): { x: number; y: number } | null;
}

export class DuoKit {
  private partner: NpcOpponent | null = null;
  private partnerElement: Element | null = null;

  constructor(private api: DuoArenaApi) {}

  /** The second opponent, or null when this is an ordinary duel. */
  get second(): NpcOpponent | null { return this.partner; }

  /** True for the body this kit owns — used to route hits to it rather than to the front bot. */
  owns(f: Fighter): boolean {
    return this.partner !== null && f === this.partner;
  }

  get isActive(): boolean { return this.partner !== null && this.partner.active && this.partner.hp > 0; }

  /**
   * Stand a second opponent up. Called once per match from ArenaScene's
   * `create()`; a match that is not Duo simply never calls it.
   */
  spawn(
    element: Element, textureKey: string, difficulty: DifficultyConfig,
    x: number, y: number,
  ): NpcOpponent {
    this.despawn();
    const npc = new NpcOpponent(this.api.scene, x, y, element, textureKey, difficulty);
    this.partner = npc;
    this.partnerElement = element;
    this.api.addEnemy(npc);

    // Entrance, so two bodies on the far side reads as deliberate.
    const ring = this.api.scene.add.circle(x, y, 30, element.color, 0.55).setDepth(4);
    this.api.scene.tweens.add({
      targets: ring, scale: 2.4, alpha: 0, duration: 520, onComplete: () => ring.destroy(),
    });
    return npc;
  }

  despawn(): void {
    if (!this.partner) return;
    this.api.removeEnemy(this.partner);
    if (this.partner.scene) this.partner.destroy();
    this.partner = null;
    this.partnerElement = null;
  }

  reset(): void {
    this.despawn();
  }

  /**
   * One decision from the partner, taken with the npc slot pointed at it.
   *
   * Returns the ability id it cast, or null — the same contract `doAI` has, so
   * a caller that wants to react to a partner cast can.
   */
  update(time: number, delta: number): string | null {
    void delta;
    const npc = this.partner;
    const el = this.partnerElement;
    if (!npc || !el || !npc.active || npc.hp <= 0 || this.api.gameEnded) return null;

    const aiState = this.buildAiState(npc);

    return this.api.withNpcSlot(npc, el, () =>
      npc.doAI(this.api.player, (tx, ty) => this.api.buildNpcContext(tx, ty), time, aiState),
    );
  }

  /**
   * A deliberately plain AI state.
   *
   * The front bot's state is assembled from thirty-odd kit queries, all of which
   * describe *its* element. None of them mean anything for a different one, so
   * the partner is handed the required fields and nothing else — every
   * element-specific hint is optional and its absence just means the partner
   * makes the ordinary decision rather than the clever one.
   */
  private buildAiState(npc: NpcOpponent): NpcAiState {
    const map = this.api.mapSeekPointFor(npc);
    return {
      isLocked: false,
      hasActiveGeyser: false,
      flameBodyActive: false,
      projectiles: this.api.projectiles,
      plantCount: 0,
      thornDragActive: false,
      enemyNearPlant: false,
      airTornadoActive: false,
      airWindDodge: 0,
      earthShieldHp: 0,
      mapSeekPoint: map,
    };
  }

  /**
   * Keeps the partner inside the arena. ArenaScene's own clamp only knows about
   * the slot body, which for most of the frame is not this one.
   */
  clampToArena(): void {
    const npc = this.partner;
    if (!npc?.active) return;
    const wb = this.api.scene.physics.world.bounds;
    let clamped = false;
    if (npc.x < wb.x) { npc.x = wb.x; clamped = true; }
    else if (npc.x > wb.right) { npc.x = wb.right; clamped = true; }
    if (npc.y < wb.y) { npc.y = wb.y; clamped = true; }
    else if (npc.y > wb.bottom) { npc.y = wb.bottom; clamped = true; }
    if (clamped) (npc.body as Phaser.Physics.Arcade.Body).reset(npc.x, npc.y);
  }

  /** A nameplate over the second body, so the two foes are told apart at a glance. */
  private plate: Phaser.GameObjects.Text | null = null;

  drawNameplate(): void {
    const npc = this.partner;
    const el = this.partnerElement;
    if (!npc || !el) return;
    if (!npc.active || npc.hp <= 0) { this.plate?.setVisible(false); return; }
    if (!this.plate) {
      this.plate = this.api.scene.add.text(npc.x, npc.y - 52, `${el.emoji} ${el.name.toUpperCase()}`, {
        fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#ffb3b3', stroke: '#1a0508', strokeThickness: 3, letterSpacing: 1,
      }).setOrigin(0.5).setDepth(21);
    }
    this.plate.setVisible(true).setPosition(npc.x, npc.y - 52);
  }

  destroyNameplate(): void {
    this.plate?.destroy();
    this.plate = null;
  }
}
