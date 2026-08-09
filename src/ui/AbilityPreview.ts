import Phaser from 'phaser';
import { BaseAvatar, ColorFn, GfxSink } from '../elements/kits/ElementVisuals';
import { getSkinDef, SkinDef } from '../data/Skins';
import { makeSkinAvatar } from '../elements/kits/skins/SkinAvatars';
import * as PlayerData from '../data/PlayerData';
import { C } from './Theme';

/**
 * The player's equipped skin for an element, or undefined.
 *
 * `SkinsKit` is the in-match owner of all of this, but it needs a live match to exist. A skin
 * is four separate things and the preview has to honour all of them or the showcase shows a
 * character the player does not have:
 *
 *   `avatar`          — a replacement rig; the skin is a different character, not a recolour
 *   `bodyTint`        — flat repaint of the fighter sprite under that rig
 *   `projectileTint`  — flat repaint of the element's projectile sprites
 *   `palette`         — remap of every colour the element's `Fx` draws
 */
export function equippedSkin(elementId: string): SkinDef | undefined {
  return getSkinDef(PlayerData.getEquippedSkin(elementId));
}

/** The `palette` half of a skin, as the `ColorFn` every `Fx` and avatar takes. */
export function skinnedColorFn(elementId: string): ColorFn {
  const def = equippedSkin(elementId);
  if (!def?.palette) return (c) => c;
  const palette = def.palette;
  const fallback = def.paletteFallback;
  return (base) => palette[base] ?? fallback ?? base;
}

/**
 * The looping ability previews on the element info screen.
 *
 * The hard rule here is that a preview must not redraw an ability — it has to *run* the real
 * one. Every element already owns an `Fx` class and an avatar rig that draw its abilities, and
 * those take nothing but a scene and a palette (see `FxBase`), so they are perfectly happy to
 * run inside a menu. What they are not happy about is staying in a 660x180 box: they paint at
 * world scale, at world coordinates, straight onto the scene root.
 *
 * So this file supplies the box. A preview gets a scaled container with a geometry mask, and
 * anything the script creates is pulled inside it two ways over:
 *
 *   - `ctx.capture(fn)` diffs the scene display list around `fn`, which catches absolutely
 *     anything built synchronously — Fx gestures, persistent rigs like `FireWreath`, sprites.
 *   - `fx.setSink(ctx.sink)` is sticky on the Fx instance, which catches the stragglers an
 *     ability spawns later from a `delayedCall`.
 *
 * Between them a script never has to think about containment, and an ability that gets
 * retuned tomorrow shows its new numbers in the preview the same day.
 */

/** Everything a preview script is handed. Coordinates are box-local, already unscaled. */
export interface PreviewCtx {
  scene: Phaser.Scene;
  /** Usable width in script coordinates (the box width divided by the script's scale). */
  w: number;
  /** Usable height in script coordinates. */
  h: number;
  /** Where the caster stands. */
  cx: number;
  cy: number;
  /** Where the notional enemy stands — to the caster's right, same footing. */
  tx: number;
  ty: number;
  /** Aim angle from caster to target, radians. Zero, but read it rather than assuming. */
  aim: number;
  /** The element's palette mapper, honouring the player's equipped skin. */
  tint: ColorFn;
  /** Hand this to `fx.setSink()` so deferred effects stay in the box. */
  sink: GfxSink;
  /** Pull one object into the box. Returns it, so it chains. */
  adopt<T extends Phaser.GameObjects.GameObject>(obj: T): T;
  /** Run `fn`, pulling in every display object it creates. The workhorse. */
  capture<T>(fn: () => T): T;
  /** Run `fn` at `atMs` into the loop. Cleared on teardown and between iterations. */
  at(atMs: number, fn: () => void): void;
  /** Per-frame callback for the rest of this iteration. */
  onFrame(fn: (deltaMs: number, elapsedMs: number) => void): void;
  /**
   * Stand a caster in the box and drive it for the rest of the iteration.
   *
   * Takes a **factory for the element's own rig**, not a rig — because if the player has a
   * skin equipped that replaces the character, the harness builds that one instead and the
   * element's default is never constructed. Every preview script gets skin support from this
   * without knowing skins exist.
   */
  useAvatar(makeDefault: () => BaseAvatar): BaseAvatar;
  /** A stand-in enemy body at the target mark. Most offensive previews want one. */
  addDummy(): void;
  /**
   * Fly the element's **real** projectile texture from `from` to `to` at its real px/s, and
   * call `onHit` when it lands.
   *
   * Use this rather than drawing a shape. The arena's `Projectile` is a Sprite on a texture
   * BootScene generated (`proj-fire`, `proj-water`, …), and a hand-drawn stand-in is the
   * fastest way to make a preview look like a different game from the one it documents.
   */
  fly(o: {
    texture: string;
    from: { x: number; y: number };
    to: { x: number; y: number };
    /** px/s, straight from the ability's own launch speed. */
    speed: number;
    /** Point the sprite along its travel. Default true. */
    rotate?: boolean;
    /** Keep going past `to` instead of stopping — piercing shots. */
    pierce?: boolean;
    onHit?: () => void;
  }): void;
}

export interface PreviewScript {
  /** One loop iteration, ms. Give the ability room to finish before it restarts. */
  duration: number;
  /**
   * World-units-per-pixel — really a zoom, since it is the box that is fixed and the world
   * that stretches to fill it. The context's `w`/`h` already account for it.
   *
   * **0.9 is the house framing and the default choice.** Every showcase used to pick its own
   * number, and the screen ended up documenting the same game at wildly different sizes — a
   * 0.5 loop next to a 0.9 one reads as a bug, not as staging. Go below 0.9 only when the
   * ability genuinely cannot be told in one 780×205 frame (an arena-wide split, a fall from
   * off-screen), and then only as far as it takes. Positions expressed off `ctx.cx`/`ctx.tx`
   * or as fractions of `w`/`h` reframe themselves; a hardcoded offset does not, so anything
   * further than ~500 from the caster is what forces a wider frame.
   */
  scale?: number;
  /** One line under the box saying what the loop is showing. */
  caption?: string;
  /**
   * Override the caster's body sprite for this loop.
   *
   * The screen passes `elem-<id>` by default, which is right for every element that wears one
   * body. Hunt does not: beast form swaps the fighter to `elem-hunt-beast` and hybrid form to
   * `elem-hunt-hybrid`, so a beast-form showcase drawn over the hunter's sprite would be
   * documenting a character that never appears.
   */
  bodyTexture?: string;
  run(ctx: PreviewCtx): void;
}

const FRAME_BG = 0x07070f;

/**
 * A live preview panel: framed box, looping script, and a play/pause + replay pair.
 *
 * Built once per selected ability and destroyed when the selection changes, so a script never
 * has to cope with being re-entered.
 */
export class AbilityPreviewBox {
  private container: Phaser.GameObjects.Container;
  private maskGfx: Phaser.GameObjects.Graphics;
  private chrome: Phaser.GameObjects.GameObject[] = [];
  private frameTimers: Phaser.Time.TimerEvent[] = [];
  private frameHooks: ((dt: number, elapsed: number) => void)[] = [];
  private avatars: BaseAvatar[] = [];
  private updateHandler: (t: number, dt: number) => void;
  private elapsed = 0;
  private needsSort = false;
  private paused = false;
  private destroyed = false;
  private pauseLabel!: Phaser.GameObjects.Text;

  constructor(
    private scene: Phaser.Scene,
    private script: PreviewScript,
    private opts: {
      x: number; y: number; w: number; h: number;
      depth: number;
      accent: number;
      tint: ColorFn;
      /** Texture key for the caster stand-in body, if the element has one. */
      bodyTexture?: string;
      /** The player's equipped skin, so the showcase stages the character they actually play. */
      skin?: SkinDef;
      /**
       * Mastery switched on for this element. Rigs have a distinct mastered look (skins have
       * one per form), and the arena drives it off the same flag.
       */
      mastered?: boolean;
    },
  ) {
    const { x, y, w, h, depth, accent } = opts;

    // ── Frame ──
    const bg = scene.add.rectangle(x + w / 2, y + h / 2, w, h, FRAME_BG, 1)
      .setStrokeStyle(1, accent, 0.5).setDepth(depth);
    this.chrome.push(bg);

    // A faint floor line so the caster reads as standing rather than floating.
    const floor = scene.add.line(0, 0, x + 10, y + h * 0.78, x + w - 10, y + h * 0.78, accent, 0.16)
      .setOrigin(0).setDepth(depth + 0.1).setLineWidth(1);
    this.chrome.push(floor);

    this.container = scene.add.container(x, y).setDepth(depth + 1);
    const scale = script.scale ?? 1;
    this.container.setScale(scale);

    this.maskGfx = scene.add.graphics();
    this.maskGfx.fillStyle(0xffffff, 1);
    this.maskGfx.fillRect(x, y, w, h);
    this.maskGfx.setVisible(false);
    this.container.setMask(this.maskGfx.createGeometryMask());

    this.addControls();

    this.updateHandler = (_t: number, dt: number) => this.step(dt);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.updateHandler);

    this.begin();
  }

  /** Play/pause and replay, bottom-right of the box. */
  private addControls(): void {
    const { x, y, w, h, depth } = this.opts;
    const mk = (ox: number, glyph: string, onClick: () => void): Phaser.GameObjects.Text => {
      const t = this.scene.add.text(x + w - ox, y + h - 12, glyph, {
        fontSize: '13px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
        color: '#66708a',
      }).setOrigin(0.5).setDepth(depth + 4).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setColor('#cfe4ff'));
      t.on('pointerout', () => t.setColor('#66708a'));
      t.on('pointerdown', (p: Phaser.Input.Pointer) => { p.event.stopPropagation(); onClick(); });
      this.chrome.push(t);
      return t;
    };
    this.pauseLabel = mk(38, '❚❚', () => this.togglePause());
    mk(18, '⟳', () => { this.paused = false; this.pauseLabel.setText('❚❚'); this.begin(); });
  }

  private togglePause(): void {
    this.paused = !this.paused;
    this.pauseLabel.setText(this.paused ? '▶' : '❚❚');
    for (const tm of this.frameTimers) tm.paused = this.paused;
  }

  /** Tear down the previous iteration and start a fresh one. */
  private begin(): void {
    if (this.destroyed) return;
    this.clearIteration();
    this.elapsed = 0;

    const scale = this.script.scale ?? 1;
    const w = this.opts.w / scale;
    const h = this.opts.h / scale;
    // The caster stands a third in from the left on the floor line; the target faces it at
    // the same height, which is the framing every script can rely on.
    const cy = h * 0.78 - 22;
    const ctx: PreviewCtx = {
      scene: this.scene,
      w, h,
      cx: w * 0.26, cy,
      tx: w * 0.76, ty: cy,
      aim: 0,
      tint: this.opts.tint,
      sink: (o) => this.adopt(o),
      adopt: (o) => this.adopt(o),
      capture: (fn) => this.capture(fn),
      at: (ms, fn) => {
        const tm = this.scene.time.delayedCall(ms, () => { if (!this.destroyed) fn(); });
        this.frameTimers.push(tm);
      },
      onFrame: (fn) => { this.frameHooks.push(fn); },
      useAvatar: (makeDefault) => {
        // The arena fighter is an `elem-<id>` Sprite at depth 5 with the rig drawn around it at
        // 6 — hands, eyes and glow but no torso of its own. Without the sprite underneath, a
        // previewed caster is a pair of floating hands, which is the loudest way this screen
        // can look like a different game from the one it documents.
        const bodyTex = this.script.bodyTexture ?? this.opts.bodyTexture;
        if (bodyTex && this.scene.textures.exists(bodyTex)) {
          const scale = this.script.scale ?? 1;
          this.capture(() => {
            const body = this.scene.add
              .image((this.opts.w / scale) * 0.26, (this.opts.h / scale) * 0.78 - 22, bodyTex)
              .setDepth(5);
            // A skin that draws a whole new silhouette repaints the ball of raw element
            // underneath it, so anything peeking past the new body still reads as the skin.
            const bt = this.opts.skin?.bodyTint;
            if (bt) body.setTintFill(bt[0], bt[0], bt[1], bt[1]);
            return body;
          });
        }
        // The skin's character if it replaces one, otherwise the element's own.
        const a = this.capture(() =>
          makeSkinAvatar(this.opts.skin?.id ?? null, this.scene) ?? makeDefault());
        this.capture(() => a.captureInto((o) => this.adopt(o)));
        this.avatars.push(a);
        return a;
      },
      addDummy: () => this.addDummy(ctx),
      fly: (o) => this.fly(ctx, o),
    };

    this.capture(() => this.script.run(ctx));
  }

  /** See `PreviewCtx.fly`. */
  private fly(ctx: PreviewCtx, o: Parameters<PreviewCtx['fly']>[0]): void {
    if (!this.scene.textures.exists(o.texture)) return;
    const spr = this.capture(() => this.scene.add.image(o.from.x, o.from.y, o.texture).setDepth(6));
    // Projectile repaint. `projectileTextures` narrows which of the element's shots a skin
    // recolours; absent or empty means all of them.
    const pt = this.opts.skin?.projectileTint;
    const only = this.opts.skin?.projectileTextures;
    if (pt && (!only || only.length === 0 || only.includes(o.texture))) {
      spr.setTintFill(pt[0], pt[0], pt[1], pt[1]);
    }
    const dx = o.to.x - o.from.x, dy = o.to.y - o.from.y;
    const dist = Math.hypot(dx, dy) || 1;
    const angle = Math.atan2(dy, dx);
    if (o.rotate !== false) spr.setRotation(angle);
    // Real speed, real distance — a fireball that crosses the box in the time it crosses that
    // gap in the arena is the whole point of quoting px/s in the codex.
    const flightMs = (dist / o.speed) * 1000;
    const start = this.elapsed;
    let hit = false;
    ctx.onFrame(() => {
      const t = (this.elapsed - start) / flightMs;
      if (t < 0) return;
      if (t >= 1 && !hit) {
        hit = true;
        o.onHit?.();
        if (!o.pierce) { spr.setVisible(false); return; }
      }
      if (!o.pierce && t >= 1) return;
      spr.setPosition(o.from.x + Math.cos(angle) * o.speed * (t * flightMs / 1000),
        o.from.y + Math.sin(angle) * o.speed * (t * flightMs / 1000));
      spr.setVisible(true);
    });
  }

  /** Neutral grey opponent so offensive abilities have something to land on. */
  private addDummy(ctx: PreviewCtx): void {
    this.capture(() => {
      const g = this.scene.add.graphics();
      g.fillStyle(0x2b2f3d, 1);
      g.fillCircle(ctx.tx, ctx.ty, 17);
      g.fillStyle(0x3c4254, 1);
      g.fillCircle(ctx.tx, ctx.ty, 13);
      g.fillStyle(0x8e97ad, 0.9);
      g.fillCircle(ctx.tx - 5, ctx.ty - 4, 3.2);
      g.fillCircle(ctx.tx + 5, ctx.ty - 4, 3.2);
      g.fillStyle(0x11131b, 1);
      g.fillCircle(ctx.tx - 5.6, ctx.ty - 4, 1.6);
      g.fillCircle(ctx.tx + 4.4, ctx.ty - 4, 1.6);
      return g;
    });
  }

  /**
   * Pull `obj` into the masked box. Objects that arrive after teardown — a `delayedCall` from
   * an Fx that outlived its preview — are destroyed instead, which is the whole reason the
   * sink is a function rather than the container itself.
   */
  private adopt<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    if (this.destroyed || !this.container.active) {
      (obj as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
      return obj;
    }
    this.container.add(obj);
    this.needsSort = true;
    return obj;
  }

  /**
   * Run `fn` and adopt everything new on the scene's display list afterwards.
   *
   * Diffing the list rather than hooking the factories is what makes this work for effect
   * classes nobody has touched — `FireWreath`, `StoneGolem` and the rest build their own
   * Graphics in their constructors and know nothing about previews.
   */
  private capture<T>(fn: () => T): T {
    const list = this.scene.children.list;
    const before = new Set(list);
    let out: T;
    try {
      out = fn();
    } finally {
      // Snapshot first: adopting mutates the very array being walked.
      for (const o of [...list]) if (!before.has(o)) this.adopt(o);
    }
    return out;
  }

  private step(deltaMs: number): void {
    if (this.destroyed || this.paused) return;
    this.elapsed += deltaMs;

    // Wrapped in a capture window because every avatar builds its own private Fx in its
    // constructor — one this harness never sees and cannot install a sink on. Its gestures
    // emit through that Fx during `update`, so this is the only place to catch them.
    if (this.avatars.length) {
      this.capture(() => {
        const scale = this.script.scale ?? 1;
        for (const a of this.avatars) {
          a.setFacing(0);
          // The setter early-outs when unchanged, so driving it every frame is what the
          // element kits do too.
          a.setMastered(!!this.opts.mastered);
          a.update(deltaMs, (this.opts.w / scale) * 0.26, (this.opts.h / scale) * 0.78 - 22, 1);
        }
      });
    }
    for (const fn of this.frameHooks) fn(deltaMs, this.elapsed);

    // Child depths were set before the objects were reparented, so the container never got
    // flagged dirty; do it ourselves on the frames where something arrived.
    if (this.needsSort) { this.container.sort('depth'); this.needsSort = false; }

    if (this.elapsed >= this.script.duration) this.begin();
  }

  private clearIteration(): void {
    for (const tm of this.frameTimers) tm.remove(false);
    this.frameTimers = [];
    this.frameHooks = [];
    for (const a of this.avatars) a.destroy();
    this.avatars = [];
    this.container.removeAll(true);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.updateHandler);
    this.clearIteration();
    this.container.destroy();
    this.maskGfx.destroy();
    for (const o of this.chrome) (o as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
    this.chrome = [];
  }
}

/**
 * Placeholder for an ability whose preview has not been scripted yet. Deliberately plain and
 * deliberately labelled: an empty box reads as a bug, and a fake one would be worse.
 */
export function addPreviewPlaceholder(
  scene: Phaser.Scene,
  o: { x: number; y: number; w: number; h: number; depth: number; accent: number },
): Phaser.GameObjects.GameObject[] {
  const bg = scene.add.rectangle(o.x + o.w / 2, o.y + o.h / 2, o.w, o.h, FRAME_BG, 1)
    .setStrokeStyle(1, C.steel, 0.35).setDepth(o.depth);
  const label = scene.add.text(o.x + o.w / 2, o.y + o.h / 2, '🎬  no preview recorded yet', {
    fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#3d4358',
  }).setOrigin(0.5).setDepth(o.depth + 1);
  return [bg, label];
}
