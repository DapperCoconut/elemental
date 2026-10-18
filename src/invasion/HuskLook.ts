import Phaser from 'phaser';
import { BaseAvatar } from '../elements/kits/ElementVisuals';
import { makeElementAvatar, elementBodyTexture } from '../elements/kits/ElementAvatars';
import type { HuskVariantDef } from './HuskVariants';
import type { Husk } from './Husk';

/**
 * What a husk looks like: an element player who died and got back up. The body
 * is that element's real `elem-<id>` sprite, baked once into a rotted copy
 * (drained of colour, gone grave-green, blotched, cracked and stitched), and the
 * element's real rig stands on it with every colour run through the same rot —
 * so a Fire husk is unmistakably a dead Fire player, hat and all. The brand's
 * colour survives only in the eyes: two pinpricks of it, lit from inside.
 *
 * Plain husks are the common dead: each rises wearing one of the base
 * elements at random. Bosses, their courts and the corrupt-kin keep their own
 * baked bodies, and so does anything past the rig budget below.
 */

/** Rigs are three Graphics each; a horde past this keeps the cheap baked body. */
const MAX_RIGGED = 32;
/** Who the ordinary dead were in life. */
const COMMON_DEAD = ['fire', 'water', 'life', 'air', 'earth', 'ice', 'metal', 'oil', 'shadow', 'growth', 'electricity', 'light'];
/** Plain husks' eyes: the corruption's own sick glow. */
const COMMON_EYE = 0xb8ff6a;

let rigged = 0;

/** The rot, as a colour transform: drained, greened, darkened. Shared by the bake and the rig. */
export function rotColor(c: number, drain = 0.62): number {
  let r = (c >> 16) & 0xff, g = (c >> 8) & 0xff, b = c & 0xff;
  const lum = r * 0.3 + g * 0.59 + b * 0.11;
  r += (lum - r) * drain;
  g += (lum - g) * drain;
  b += (lum - b) * drain;
  r = r * 0.78 + 6;
  g = g * 0.9 + 12;
  b = b * 0.7 + 4;
  return (Math.min(255, r) << 16) | (Math.min(255, g) << 8) | Math.min(255, b);
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * `husk-dead-<id>`: the element's body sprite, rotted. Baked on first use into a
 * canvas texture and kept for the session. Null if the element has no body sprite
 * (it paints its own torso) or the source can't be read back.
 */
export function deadBodyTexture(scene: Phaser.Scene, elementId: string): string | null {
  const key = `husk-dead-${elementId}`;
  if (scene.textures.exists(key)) return key;
  const srcKey = elementBodyTexture(scene, elementId);
  if (!srcKey) return null;
  const frame = scene.textures.getFrame(srcKey);
  const src = frame?.source?.image as CanvasImageSource | undefined;
  if (!frame || !src) return null;
  const W = 48, H = 48;
  const tex = scene.textures.createCanvas(key, W, H);
  if (!tex) return null;
  const ctx = tex.getContext();
  try {
    ctx.drawImage(src, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, 0, 0, W, H);
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      const c = rotColor((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
      d[i] = (c >> 16) & 0xff;
      d[i + 1] = (c >> 8) & 0xff;
      d[i + 2] = c & 0xff;
    }
    ctx.putImageData(img, 0, 0);
  } catch {
    scene.textures.remove(key);
    return null;
  }

  // Everything below paints only where the body already is.
  ctx.globalCompositeOperation = 'source-atop';
  let seed = hash(elementId);
  const rnd = (): number => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  // Rot: bruised patches of dead tissue.
  for (let i = 0; i < 4; i++) {
    const x = 12 + rnd() * 24, y = 12 + rnd() * 24, rx = 4 + rnd() * 6, ry = 3 + rnd() * 5;
    ctx.fillStyle = i % 2 ? 'rgba(46, 60, 28, 0.55)' : 'rgba(88, 70, 96, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rnd() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // Cracks running out from a wound.
  ctx.strokeStyle = 'rgba(14, 18, 10, 0.75)';
  ctx.lineWidth = 1.1;
  const wx = 16 + rnd() * 16, wy = 20 + rnd() * 12;
  for (let i = 0; i < 3; i++) {
    let x = wx, y = wy, a = rnd() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 3; s++) {
      a += (rnd() - 0.5) * 1.4;
      x += Math.cos(a) * (3 + rnd() * 3);
      y += Math.sin(a) * (3 + rnd() * 3);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(70, 8, 14, 0.8)';
  ctx.beginPath();
  ctx.arc(wx, wy, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // A stitched seam across the lower body — somebody tried to put it back together.
  const sy = 31 + rnd() * 5, sx0 = 12 + rnd() * 4, sx1 = 34 + rnd() * 4;
  ctx.strokeStyle = 'rgba(20, 16, 12, 0.85)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(sx0, sy);
  ctx.lineTo(sx1, sy - 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(216, 204, 170, 0.8)';
  ctx.lineWidth = 1;
  for (let x = sx0 + 2; x < sx1; x += 4) {
    const y = sy - ((x - sx0) / (sx1 - sx0)) * 2;
    ctx.beginPath();
    ctx.moveTo(x - 1, y - 2.2);
    ctx.lineTo(x + 1, y + 2.2);
    ctx.stroke();
  }
  // Grave dirt settled into the lower half.
  const dirt = ctx.createLinearGradient(0, 26, 0, 48);
  dirt.addColorStop(0, 'rgba(30, 24, 16, 0)');
  dirt.addColorStop(1, 'rgba(30, 24, 16, 0.5)');
  ctx.fillStyle = dirt;
  ctx.fillRect(0, 26, W, 22);
  ctx.globalCompositeOperation = 'source-over';
  tex.refresh();
  return key;
}

/** Can this variant rise as a dead element player? */
function wearsBody(v: HuskVariantDef): boolean {
  return !v.isBoss && !v.bossKind && !v.id.startsWith('boss-') && v.id !== 'corrupt-kin';
}

export class HuskLook {
  private avatar: BaseAvatar | null;
  /** The disguise rig (Subterfuge's impostor), swapped in while it wears a plain face. */
  private disguise: BaseAvatar | null = null;
  private disguised = false;
  private overlay: Phaser.GameObjects.Graphics;
  private facing = Math.random() * Math.PI * 2;
  private t = Math.random() * 10;
  private readonly bodyKey: string;
  private readonly eye: number;
  private readonly tier: number;

  /** Dress `husk` as the dead player it was, or return null and leave its baked body alone. */
  static tryDress(husk: Husk): HuskLook | null {
    const v = husk.variant;
    if (!wearsBody(v) || rigged >= MAX_RIGGED) return null;
    const elementId = v.elementId ?? COMMON_DEAD[Math.floor(Math.random() * COMMON_DEAD.length)];
    const key = deadBodyTexture(husk.scene, elementId);
    if (!key) return null;
    const avatar = makeElementAvatar(elementId, husk.scene, (c) => rotColor(c));
    if (!avatar) return null;
    return new HuskLook(husk, avatar, key, v.elementId ? v.color : COMMON_EYE, v.tier ?? 1);
  }

  private constructor(
    private husk: Husk, avatar: BaseAvatar, bodyKey: string, eye: number, tier: number,
  ) {
    rigged++;
    this.avatar = avatar;
    this.bodyKey = bodyKey;
    this.eye = eye;
    this.tier = tier;
    husk.setTexture(bodyKey);
    this.overlay = husk.scene.add.graphics().setDepth(7.5);
  }

  /** Subterfuge husks walk around as one of the common dead until they're found out. */
  setDisguise(on: boolean): void {
    if (on === this.disguised) return;
    this.disguised = on;
    if (on && !this.disguise) {
      const id = COMMON_DEAD[Math.floor(Math.random() * COMMON_DEAD.length)];
      const key = deadBodyTexture(this.husk.scene, id);
      this.disguise = makeElementAvatar(id, this.husk.scene, (c) => rotColor(c));
      if (key) this.husk.setTexture(key);
    } else if (!on) {
      this.disguise?.destroy();
      this.disguise = null;
      this.husk.setTexture(this.bodyKey);
    }
  }

  /** A bite: the dead swing too. */
  onBite(tx: number, ty: number): void {
    this.rig()?.play('punch', Math.atan2(ty - this.husk.y, tx - this.husk.x));
  }

  private rig(): BaseAvatar | null {
    return this.disguised && this.disguise ? this.disguise : this.avatar;
  }

  update(delta: number): void {
    const h = this.husk;
    const rig = this.rig();
    if (!rig) return;
    this.t += delta / 1000;
    // Follows the body's alpha, so the death fade takes the rig down with it.
    const alpha = h.active && h.visible ? h.alpha : 0;
    // The dead don't aim; they lurch at whatever they're walking toward.
    const body = h.body as Phaser.Physics.Arcade.Body | null;
    const vx = body?.velocity?.x ?? 0, vy = body?.velocity?.y ?? 0;
    if (vx * vx + vy * vy > 25) this.facing = Math.atan2(vy, vx);
    else if (h.marchTo) this.facing = Math.atan2(h.marchTo.y - h.y, h.marchTo.x - h.x);
    // A shambling sway on top of the rig's own bob.
    const sway = Math.sin(this.t * 3.1) * 1.6;
    rig.setFacing(this.facing + Math.sin(this.t * 1.7) * 0.25);
    rig.setRigScale(h.scaleX);
    rig.update(delta, h.x + sway, h.y, alpha);
    (rig === this.avatar ? this.disguise : this.avatar)?.update(delta, h.x, h.y, 0);
    this.paintOverlay(alpha);
  }

  /** The eyes, lit with the brand; tier II grows burning cracks, tier III a sick corona. */
  private paintOverlay(alpha: number): void {
    const g = this.overlay;
    g.clear();
    if (alpha <= 0.02) return;
    const h = this.husk;
    const s = h.scaleX;
    const x = h.x + Math.sin(this.t * 3.1) * 1.6, y = h.y;
    const eye = this.disguised ? COMMON_EYE : this.eye;
    const flick = 0.75 + 0.25 * Math.sin(this.t * 9 + x);
    if (this.tier >= 3 && !this.disguised) {
      g.lineStyle(2, eye, 0.35 * alpha * flick);
      g.strokeCircle(x, y, 25 * s);
      g.lineStyle(1, eye, 0.2 * alpha);
      g.strokeCircle(x, y, 29 * s);
    }
    if (this.tier >= 2 && !this.disguised) {
      g.lineStyle(1.4, eye, 0.7 * alpha * flick);
      g.beginPath();
      g.moveTo(x - 9 * s, y + 6 * s); g.lineTo(x - 4 * s, y + 10 * s); g.lineTo(x - 6 * s, y + 15 * s);
      g.moveTo(x + 8 * s, y + 4 * s); g.lineTo(x + 11 * s, y + 9 * s); g.lineTo(x + 7 * s, y + 13 * s);
      g.strokePath();
    }
    // Pinprick pupils, glowing — where the rig's own eyes sit.
    const look = this.facing;
    for (const side of [-1, 1]) {
      const ex = x + (side * 7.2 + Math.cos(look) * 2.4) * s + Math.cos(look) * 1.8 * s;
      const ey = y + (-4 + Math.sin(look) * 2.0) * s + Math.sin(look) * 1.6 * s;
      g.fillStyle(eye, 0.35 * alpha * flick);
      g.fillCircle(ex, ey, 3.2 * s);
      g.fillStyle(eye, 0.95 * alpha);
      g.fillCircle(ex, ey, 1.3 * s);
    }
  }

  destroy(): void {
    rigged = Math.max(0, rigged - 1);
    this.avatar?.destroy();
    this.avatar = null;
    this.disguise?.destroy();
    this.disguise = null;
    this.overlay.destroy();
  }
}
