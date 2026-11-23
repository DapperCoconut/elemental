import type Phaser from 'phaser';
import type { BossBodyState, SignatureFactory, WorldBossPhase } from '../../../../boss/framework/BossDefs';

/**
 * One phase of the Obsidian King, as its builder exports it. `king/index.ts` folds the three into
 * one `WorldBossDef`: phases in order, signatures merged (prefix your keys — `p1-`, `p2-`, `p3-`),
 * and every draw hook routed to the part whose phase is showing.
 */
export interface KingPart {
  /** Name, pool, cycle, rests — with `style` (movement, look, anchor, hideRig) and `entry` (the cinematic into it) set. */
  phase: WorldBossPhase;
  signatures: Record<string, SignatureFactory>;
  /** Over the rig (or instead of it, with `style.hideRig`) while this phase shows. */
  drawDecor?(g: Phaser.GameObjects.Graphics, s: BossBodyState): void;
  /** Above a gloom's dark while this phase shows. */
  drawLit?(g: Phaser.GameObjects.Graphics, s: BossBodyState): void;
  /** This phase's floor, painted once as it begins (full 960×640 — paint it opaque). */
  drawArena?(g: Phaser.GameObjects.Graphics, W: number, H: number): void;
  /** This phase's living floor, every frame over `drawArena`. */
  drawBackdrop?(g: Phaser.GameObjects.Graphics, s: BossBodyState, W: number, H: number): void;
}
