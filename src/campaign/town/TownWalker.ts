import Phaser from 'phaser';
import { BaseAvatar } from '../../elements/kits/ElementVisuals';
import { elementBodyTexture, makeElementAvatar } from '../../elements/kits/ElementAvatars';
import { makeSkinAvatar } from '../../elements/kits/skins/SkinAvatars';
import { equippedSkin, skinnedColorFn } from '../../ui/AbilityPreview';
import * as PlayerData from '../../data/PlayerData';

/**
 * The player's body in town: the real fighter rig of the element they last took into a
 * campaign fight — skin and mastered silhouette included — walking at a reduced scale.
 *
 * Same containment trick as `ElementPortrait`: the rig paints in world coordinates off
 * the point handed to `update`, so everything it makes is adopted into one container that
 * moves with the player and takes its depth from the player's feet.
 */

const AVATAR_KEY = 'elemental.campaignTownAvatar';
const SCALE = 0.62;

/** Remember which element walks the towns — set whenever a campaign fight is picked. */
export function setTownAvatarElement(elementId: string): void {
  try { localStorage.setItem(AVATAR_KEY, elementId); } catch { /* storage unavailable */ }
}

export function getTownAvatarElement(): string {
  try { return localStorage.getItem(AVATAR_KEY) ?? 'fire'; } catch { return 'fire'; }
}

export class TownWalker {
  readonly container: Phaser.GameObjects.Container;
  private avatar: BaseAvatar | null = null;
  private fallback: Phaser.GameObjects.Graphics | null = null;
  private needsSort = false;
  private destroyed = false;
  private t = 0;
  private elementId: string;

  constructor(private scene: Phaser.Scene, elementId: string, x: number, y: number) {
    this.container = scene.add.container(x, y).setScale(SCALE).setDepth(y);
    this.elementId = elementId === 'quantum' ? 'fire' : elementId;
    this.build();
  }

  private build(): void {
    const id = this.elementId;
    const shadow = this.scene.add.ellipse(0, 22, 46, 14, 0x000000, 0.35);
    this.container.add(shadow);
    try {
      const skin = equippedSkin(id);
      const bodyTex = elementBodyTexture(this.scene, id);
      if (bodyTex) {
        this.capture(() => {
          const body = this.scene.add.image(0, 0, bodyTex).setDepth(5);
          const bt = skin?.bodyTint;
          if (bt) body.setTintFill(bt[0], bt[0], bt[1], bt[1]);
          return body;
        });
      }
      const avatar = this.capture(() =>
        makeSkinAvatar(skin?.id ?? null, this.scene) ?? makeElementAvatar(id, this.scene, skinnedColorFn(id)));
      if (avatar) {
        this.capture(() => avatar.captureInto((o) => this.adopt(o)));
        this.avatar = avatar;
      }
    } catch {
      this.avatar = null;
    }
    if (!this.avatar && !elementBodyTexture(this.scene, id)) {
      // No rig, no sprite — a plain hooded traveller rather than nothing.
      this.fallback = this.scene.add.graphics();
      this.container.add(this.fallback);
    }
  }

  update(dtMs: number, x: number, y: number, moving: boolean, facing: number): void {
    if (this.destroyed) return;
    this.t += dtMs / 1000;
    const bob = moving ? Math.abs(Math.sin(this.t * 11)) * 3 : 0;
    this.container.setPosition(x, y - 14 - bob);
    this.container.setDepth(y);
    if (this.avatar) {
      this.capture(() => {
        const a = this.avatar!;
        a.setFacing(facing);
        a.setMastered(PlayerData.isMasteryEnabled(this.elementId));
        a.update(dtMs, 0, 0, 1);
      });
    }
    if (this.fallback) {
      const g = this.fallback;
      g.clear();
      g.fillStyle(0x3a3a5a, 1); g.fillCircle(0, 0, 18);
      g.fillStyle(0x5a5a8a, 1); g.fillCircle(-2, -2, 16);
      g.fillStyle(0xffffff, 1); g.fillCircle(Math.cos(facing) * 4 - 6, -4 + Math.sin(facing) * 3, 4); g.fillCircle(Math.cos(facing) * 4 + 6, -4 + Math.sin(facing) * 3, 4);
      g.fillStyle(0x101018, 1); g.fillCircle(Math.cos(facing) * 5.5 - 6, -4 + Math.sin(facing) * 4, 2); g.fillCircle(Math.cos(facing) * 5.5 + 6, -4 + Math.sin(facing) * 4, 2);
    }
    if (this.needsSort) { this.container.sort('depth'); this.needsSort = false; }
  }

  private adopt<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    if (this.destroyed || !this.container.active) {
      (obj as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
      return obj;
    }
    this.container.add(obj);
    this.needsSort = true;
    return obj;
  }

  private capture<T>(fn: () => T): T {
    const list = this.scene.children.list;
    const before = new Set(list);
    let out: T;
    try {
      out = fn();
    } finally {
      for (const o of [...list]) if (!before.has(o)) this.adopt(o);
    }
    return out;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.avatar?.destroy();
    this.avatar = null;
    this.container.destroy();
  }
}
