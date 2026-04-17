import Phaser from 'phaser';
import { Fighter } from '../Fighter';
import { Element } from '../../elements/Element';

export enum CorruptedType {
  Basic = 'basic',
  Overcharged = 'overcharged',
  Rusher = 'rusher',
  Protected = 'protected',
  Architect = 'architect',
  Titan = 'titan',
}

// Minimal element used by all corrupted (no abilities — AI handles everything directly)
export const CORRUPTED_ELEMENT: Element = {
  id: 'corrupted',
  name: 'Corrupted',
  color: 0xaa00cc,
  emoji: '💀',
  abilities: [],
};

export abstract class CorruptedBase extends Fighter {
  public readonly corruptedType: CorruptedType;
  /** Arbitrary string label for the scene to store per-enemy info */
  public label = '';

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    type: CorruptedType,
    maxHp: number,
    speed: number,
  ) {
    super(scene, x, y, textureKey, CORRUPTED_ELEMENT, maxHp, speed);
    this.corruptedType = type;
  }

  abstract aiTick(
    target: Fighter,
    projectiles: Phaser.Physics.Arcade.Group,
    allCorrupted: CorruptedBase[],
    time: number,
    delta: number,
  ): void;

  /**
   * Pick a random spawn position on one of the four world edges,
   * inset by `margin` pixels to avoid physics-bound issues.
   */
  static spawnFromEdge(worldW: number, worldH: number, margin = 48): { x: number; y: number } {
    const edge = Math.floor(Math.random() * 4);
    switch (edge) {
      case 0: // top
        return { x: margin + Math.random() * (worldW - 2 * margin), y: margin };
      case 1: // bottom
        return { x: margin + Math.random() * (worldW - 2 * margin), y: worldH - margin };
      case 2: // left
        return { x: margin, y: margin + Math.random() * (worldH - 2 * margin) };
      default: // right
        return { x: worldW - margin, y: margin + Math.random() * (worldH - 2 * margin) };
    }
  }
}
