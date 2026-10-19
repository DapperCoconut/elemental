import Phaser from 'phaser';
import { C, DEPTH, mix } from './Theme';
import { drawVial, drawFlask, drawBrokenFlask, flaskMouth, VIAL_SHAPE_FOR, VialShape, FlaskLayer } from './Glassware';
import { addHoverLabel } from './SpeechBubble';
import { Sfx } from '../audio';

/** A pourable ingredient. */
export interface BenchElement { id: string; name: string; emoji: string; color: number }

export interface LabBenchOpts {
  flaskX: number;
  flaskY: number;
  /** How many vials the flask takes. */
  capacity: number;
  /** Every element a vial might be made for — the flask looks colours up here. */
  elements: BenchElement[];
  /** Refuse a pour with a spoken reason, or allow it with null. Full flasks are refused already. */
  canPour?: (id: string, poured: string[]) => string | null;
  /** Called with the new contents once a pour has landed; `remaining` is slots left. */
  onPoured?: (el: BenchElement, poured: string[], remaining: number) => void;
  onEmptied?: () => void;
  /** What to say when the flask is full and another vial arrives. */
  fullLine?: string;
  /** A spoken refusal goes here. */
  say?: (line: string) => void;
  /** The King's lab: cracked glass, dimmer vials. */
  decayed?: boolean;
  depth?: number;
}

const VIAL_S = 15;
const VIAL_H = 58;

interface Vial {
  el: BenchElement;
  shape: VialShape;
  container: Phaser.GameObjects.Container;
  g: Phaser.GameObjects.Graphics;
  homeX: number;
  homeY: number;
  lit: number;
  litTarget: number;
}

/**
 * The alchemy bench the Lab and the Disgraced Lab share: a flask that takes poured vials
 * as coloured layers, vials that are dragged to it and tip in, and the three ways a mix
 * resolves — it heats, then it either glows or it blows up in everyone's face.
 *
 * The bench owns the glass and the animations; the scene owns the recipe logic and the
 * character, and asks the bench to `heatThen(...)`, `succeed(...)` or `explode(...)`.
 */
export class LabBench {
  poured: string[] = [];
  /** True while a pour, a combine or an explosion owns the bench. */
  busy = false;

  private scene: Phaser.Scene;
  private opts: LabBenchOpts;
  private vials: Vial[] = [];
  private flaskGfx: Phaser.GameObjects.Graphics;
  private pourT = 1;
  private heat = 0;
  private glow = 0;
  private broken = false;
  private elapsed = 0;
  private capacity: number;

  constructor(scene: Phaser.Scene, opts: LabBenchOpts) {
    this.scene = scene;
    this.opts = opts;
    this.capacity = opts.capacity;
    const depth = opts.depth ?? DEPTH.panel + 4;
    this.flaskGfx = scene.add.graphics().setDepth(depth);
    const hit = scene.add.circle(opts.flaskX, opts.flaskY, 70, 0xffffff, 0).setDepth(DEPTH.content + 1).setInteractive({ useHandCursor: true });
    let label: Phaser.GameObjects.Container | null = null;
    hit.on('pointerover', () => {
      if (this.poured.length === 0) return;
      label?.destroy();
      label = addHoverLabel(scene, opts.flaskX, opts.flaskY - 130, 'Click to empty', C.steel);
    });
    hit.on('pointerout', () => { label?.destroy(); label = null; });
    hit.on('pointerdown', () => { label?.destroy(); label = null; this.empty(); });
  }

  setCapacity(n: number): void { this.capacity = n; }

  /** The flask's contents as layers. */
  layers(): FlaskLayer[] {
    return this.poured.map((id) => {
      const el = this.opts.elements.find((e) => e.id === id);
      return { color: el?.color ?? C.steel, emoji: el?.emoji ?? '?' };
    });
  }

  /** Repaint everything; call from the scene's update. */
  update(delta: number): void {
    this.elapsed += delta / 1000;
    this.flaskGfx.clear();
    if (this.broken) {
      drawBrokenFlask(this.flaskGfx, this.opts.flaskX, this.opts.flaskY);
    } else {
      drawFlask(this.flaskGfx, this.opts.flaskX, this.opts.flaskY, this.layers(), {
        capacity: this.capacity, pourT: this.pourT, heat: this.heat, glow: this.glow, t: this.elapsed, cracked: this.opts.decayed,
      });
    }
    for (const v of this.vials) {
      v.lit += (v.litTarget - v.lit) * 0.25;
      v.g.clear();
      drawVial(v.g, v.shape, 0, 0, VIAL_S, VIAL_H, v.el.color, {
        lit: v.lit, t: this.elapsed + v.homeX, fill: 0.7 + Math.sin(v.homeX) * 0.08,
      });
    }
  }

  /** Stand a vial on the bench at `(x, y)` (its foot). */
  addVial(el: BenchElement, x: number, y: number): void {
    const scene = this.scene;
    const g = scene.add.graphics();
    const emoji = scene.add.text(0, -VIAL_H * 0.42, el.emoji, { fontSize: '15px' }).setOrigin(0.5);
    const container = scene.add.container(x, y, [g, emoji]).setDepth(DEPTH.content);
    container.setSize(VIAL_S * 2.6, VIAL_H + 14);
    // The container's hit area is centred on its origin; the vial stands above it.
    container.setInteractive(new Phaser.Geom.Rectangle(-VIAL_S * 1.3, -VIAL_H - 8, VIAL_S * 2.6, VIAL_H + 14), Phaser.Geom.Rectangle.Contains);
    scene.input.setDraggable(container);
    const vial: Vial = { el, shape: VIAL_SHAPE_FOR[el.id] ?? 'round', container, g, homeX: x, homeY: y, lit: 0, litTarget: 0 };
    this.vials.push(vial);

    const fx = this.opts.flaskX;
    const fy = this.opts.flaskY;
    let label: Phaser.GameObjects.Container | null = null;
    container.on('pointerover', () => {
      vial.litTarget = 1;
      Sfx.play('ui-hover');
      label?.destroy();
      label = addHoverLabel(scene, x, y - VIAL_H - 22, el.name, el.color);
    });
    container.on('pointerout', () => { vial.litTarget = 0; label?.destroy(); label = null; });
    container.on('dragstart', () => {
      if (this.busy) return;
      label?.destroy(); label = null;
      Sfx.play('ui-drag');
      container.setDepth(DEPTH.content + 10);
    });
    container.on('drag', (_p: Phaser.Input.Pointer, dx: number, dy: number) => {
      if (this.busy) return;
      container.setPosition(dx, dy);
      // Lean the vial toward the flask as it gets close, so pouring feels like the next thing.
      const d = Phaser.Math.Distance.Between(dx, dy, fx, fy - 60);
      container.setRotation(d < 160 ? ((fx - dx) > 0 ? -1 : 1) * (1 - d / 160) * 0.5 : 0);
    });
    container.on('dragend', () => {
      container.setDepth(DEPTH.content);
      const near = Phaser.Math.Distance.Between(container.x, container.y, fx, fy - 40) < 110;
      if (near && !this.busy) { this.pour(vial); return; }
      this.snapHome(vial);
    });
  }

  private snapHome(vial: Vial, ms = 220): void {
    this.scene.tweens.add({ targets: vial.container, x: vial.homeX, y: vial.homeY, rotation: 0, duration: ms, ease: 'Cubic.easeOut' });
  }

  /** Pour by element id — the harness and the scene's own shortcuts use this. */
  pourId(id: string): void {
    const v = this.vials.find((x) => x.el.id === id);
    if (v) this.pour(v);
  }

  /** Tip the vial over the flask's mouth and run a stream into it. */
  private pour(vial: Vial): void {
    if (this.busy) { this.snapHome(vial); return; }
    if (this.poured.length >= this.capacity) {
      this.snapHome(vial);
      this.opts.say?.(this.opts.fullLine ?? 'Flask is full. Press the button, or click the flask to empty it.');
      return;
    }
    const refusal = this.opts.canPour?.(vial.el.id, this.poured) ?? null;
    if (refusal) {
      this.snapHome(vial);
      Sfx.play('ui-denied');
      this.opts.say?.(refusal);
      return;
    }
    this.busy = true;
    const scene = this.scene;
    const fx = this.opts.flaskX;
    const fy = this.opts.flaskY;
    const mouth = flaskMouth(fx, fy);
    const side = vial.container.x >= fx ? 1 : -1;
    // Where the tipped vial's mouth lands: just over the flask's mouth, from its own side.
    const tilt = side > 0 ? -1.9 : 1.9;
    const targetX = mouth.x - VIAL_H * Math.sin(tilt) + side * 6;
    const targetY = mouth.y - 14 + VIAL_H * Math.cos(tilt);
    scene.tweens.add({
      targets: vial.container, x: targetX, y: targetY, rotation: tilt, duration: 320, ease: 'Cubic.easeOut',
      onComplete: () => {
        Sfx.play('ui-drop');
        this.poured.push(vial.el.id);
        this.pourT = 0;
        const streamG = scene.add.graphics().setDepth(DEPTH.content + 9);
        const color = vial.el.color;
        const from = { x: mouth.x + side * 8, y: mouth.y - 16 };
        scene.tweens.addCounter({
          from: 0, to: 1, duration: 520,
          onUpdate: (tw) => {
            const t = tw.getValue() ?? 0;
            this.pourT = Math.min(1, t * 1.15);
            streamG.clear();
            const env = Math.sin(Math.min(1, t * 1.3) * Math.PI);
            // The stream: a tapered ribbon from the vial's lip down into the neck, wobbling.
            for (let i = 0; i <= 8; i++) {
              const u = i / 8;
              const sx = from.x + (mouth.x - from.x) * u + Math.sin(this.elapsed * 30 + u * 6) * 1.2;
              const sy = from.y + (mouth.y + 26 - from.y) * u;
              streamG.fillStyle(mix(color, 0xffffff, 0.2), env);
              streamG.fillCircle(sx, sy, (3.2 - u * 1.4) * env + 0.5);
            }
            for (let i = 0; i < 3; i++) {
              const ph = (t * 3 + i * 0.33) % 1;
              streamG.fillStyle(mix(color, 0xffffff, 0.5), env * (1 - ph));
              streamG.fillCircle(mouth.x + Math.sin(i * 2.1 + t * 10) * 10 * ph, mouth.y + 20 - ph * 12, 1.6);
            }
          },
          onComplete: () => {
            streamG.destroy();
            this.pourT = 1;
            this.snapHome(vial, 300);
            scene.time.delayedCall(300, () => { this.busy = false; });
            this.opts.onPoured?.(vial.el, this.poured, this.capacity - this.poured.length);
          },
        });
      },
    });
  }

  /** Click the flask: pour it out. */
  empty(): void {
    if (this.busy || this.poured.length === 0) return;
    Sfx.play('ui-toggle-off');
    const layers = this.layers();
    this.poured = [];
    this.pourT = 1;
    const g = this.scene.add.graphics().setDepth(DEPTH.content + 9);
    const fx = this.opts.flaskX;
    const fy = this.opts.flaskY;
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration: 420,
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        g.clear();
        layers.forEach((l, i) => {
          g.fillStyle(l.color, (1 - t) * 0.9);
          g.fillEllipse(fx + 40 + t * 30 + i * 8, fy + 60 + t * 50, 18 * (1 - t) + 4, 8);
        });
      },
      onComplete: () => g.destroy(),
    });
    this.opts.onEmptied?.();
  }

  /** Clear the contents without ceremony — after a card is dismissed. */
  reset(): void {
    this.poured = [];
    this.pourT = 1;
    this.heat = 0;
    this.glow = 0;
    this.busy = false;
  }

  /** Light the burner and boil for a beat, then hand over. */
  heatThen(cb: () => void): void {
    this.busy = true;
    Sfx.play('ui-toggle-on');
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration: 900, ease: 'Sine.easeIn',
      onUpdate: (tw) => { this.heat = tw.getValue() ?? 0; },
      onComplete: cb,
    });
  }

  /** The mix held: a flash, a swell of light, sparks in the result's colour. `cb` fires mid-glow. */
  succeed(color: number, cb: () => void): void {
    const scene = this.scene;
    const fx = this.opts.flaskX;
    const fy = this.opts.flaskY;
    Sfx.play('unlock');
    scene.tweens.addCounter({
      from: 0, to: 1, duration: 700,
      onUpdate: (tw) => { const t = tw.getValue() ?? 0; this.glow = Math.sin(t * Math.PI); this.heat = 1 - t; },
      onComplete: () => { this.glow = 0; this.heat = 0; },
    });
    scene.cameras.main.flash(260, 255, 255, 255);
    const g = scene.add.graphics().setDepth(DEPTH.content + 9);
    const bits = Array.from({ length: 18 }, () => ({ a: -Math.PI / 2 + (Math.random() - 0.5) * 1.6, d: 40 + Math.random() * 90, r: 1.5 + Math.random() * 2.5 }));
    const mouth = flaskMouth(fx, fy);
    scene.tweens.addCounter({
      from: 0, to: 1, duration: 800,
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        g.clear();
        for (const b of bits) {
          g.fillStyle(mix(color, 0xffffff, 0.4), 1 - t);
          g.fillCircle(mouth.x + Math.cos(b.a) * b.d * t, mouth.y + Math.sin(b.a) * b.d * t + t * t * 40, b.r * (1 - t * 0.5));
        }
        g.lineStyle(2 * (1 - t), mix(color, 0xffffff, 0.6), 1 - t);
        g.strokeCircle(fx, fy, 60 + t * 90);
      },
      onComplete: () => g.destroy(),
    });
    scene.time.delayedCall(420, cb);
  }

  /**
   * The mix did not hold. The flask goes, the room flashes, glass and the contents go
   * everywhere. `cb` fires once the bang has landed (for the character's line); a fresh
   * flask is set out after the smoke clears.
   */
  explode(cb?: () => void): void {
    const scene = this.scene;
    const layers = this.layers();
    const colors = layers.length ? layers.map((l) => l.color) : [C.steel];
    this.poured = [];
    this.pourT = 1;
    this.heat = 0;
    this.broken = true;
    this.busy = true;
    Sfx.play('hit-heavy');
    scene.cameras.main.shake(380, 0.014);
    scene.cameras.main.flash(120, 255, 240, 200);

    const ox = this.opts.flaskX;
    const oy = this.opts.flaskY - 10;
    const depth = DEPTH.content + 12;

    // Flash and fireball.
    const fire = scene.add.graphics().setDepth(depth);
    scene.tweens.addCounter({
      from: 0, to: 1, duration: 420,
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        fire.clear();
        const r = 30 + t * 110;
        fire.fillStyle(0xffffff, (1 - t) * 0.9); fire.fillCircle(ox, oy, r * 0.5);
        fire.fillStyle(0xffb347, (1 - t) * 0.7); fire.fillCircle(ox, oy - t * 20, r);
        fire.fillStyle(0xff5a2a, (1 - t) * 0.5); fire.fillCircle(ox + 10, oy - t * 30, r * 0.8);
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + t;
          fire.fillStyle(colors[i % colors.length], (1 - t) * 0.8);
          fire.fillCircle(ox + Math.cos(a) * r * 0.9, oy + Math.sin(a) * r * 0.6, 8 * (1 - t) + 2);
        }
      },
      onComplete: () => fire.destroy(),
    });
    // Smoke: fat grey puffs rising and spreading, lingering.
    const smoke = scene.add.graphics().setDepth(depth - 1);
    const puffs = Array.from({ length: 11 }, (_, i) => ({ a: (i / 11) * Math.PI * 2, d: 20 + Math.random() * 50, r: 18 + Math.random() * 22, s: Math.random() }));
    scene.tweens.addCounter({
      from: 0, to: 1, duration: 2600, ease: 'Sine.easeOut',
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        smoke.clear();
        for (const p of puffs) {
          const px = ox + Math.cos(p.a) * p.d * (0.4 + t) + Math.sin(t * 3 + p.s * 9) * 6;
          const py = oy - 20 + Math.sin(p.a) * p.d * 0.5 - t * (80 + p.s * 80);
          smoke.fillStyle(mix(0x2a2a30, 0x6a6a74, p.s), (1 - t) * 0.75);
          smoke.fillCircle(px, py, p.r * (0.6 + t * 1.4));
        }
      },
      onComplete: () => smoke.destroy(),
    });
    // Glass shards flying out with gravity, and liquid splats landing on the wall and bench.
    const shards = scene.add.graphics().setDepth(depth + 1);
    const bits = Array.from({ length: 16 }, () => ({ a: Math.random() * Math.PI * 2, v: 120 + Math.random() * 260, s: Math.random() * 6, r: 3 + Math.random() * 5 }));
    const splats = Array.from({ length: 9 }, (_, i) => ({ x: ox + (Math.random() - 0.5) * 300, y: oy - 20 + (Math.random() - 0.5) * 220, r: 8 + Math.random() * 14, c: colors[i % colors.length] }));
    scene.tweens.addCounter({
      from: 0, to: 1, duration: 1100, ease: 'Linear',
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        shards.clear();
        for (const b of bits) {
          const px = ox + Math.cos(b.a) * b.v * t;
          const py = oy + Math.sin(b.a) * b.v * t * 0.7 + 420 * t * t;
          const sa = b.s + t * 12;
          shards.fillStyle(0xd6ecff, (1 - t) * 0.95);
          shards.fillTriangle(px + Math.cos(sa) * b.r, py + Math.sin(sa) * b.r, px + Math.cos(sa + 2.2) * b.r * 0.6, py + Math.sin(sa + 2.2) * b.r * 0.6, px + Math.cos(sa + 4.2) * b.r * 0.8, py + Math.sin(sa + 4.2) * b.r * 0.8);
        }
      },
      onComplete: () => shards.destroy(),
    });
    const splatG = scene.add.graphics().setDepth(DEPTH.panel + 1);
    scene.tweens.addCounter({
      from: 0, to: 1, duration: 6000,
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        const arrive = Math.min(1, t * 20);
        splatG.clear();
        // A soot star on the wall behind the flask.
        splatG.fillStyle(0x0a0806, (1 - t) * 0.7);
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          splatG.fillEllipse(ox + Math.cos(a) * 40, oy + Math.sin(a) * 30, 60 + (i % 2) * 30, 24);
        }
        splatG.fillCircle(ox, oy, 70);
        for (const s of splats) {
          splatG.fillStyle(s.c, (1 - t) * 0.8 * arrive);
          splatG.fillEllipse(s.x, s.y, s.r * 2 * arrive, s.r * 1.4 * arrive);
          splatG.fillRect(s.x - 1.5, s.y, 3, s.r * 2 * arrive * t);
        }
      },
      onComplete: () => splatG.destroy(),
    });

    if (cb) scene.time.delayedCall(700, cb);
    // A fresh flask is set out after the smoke clears.
    scene.time.delayedCall(1700, () => {
      this.broken = false;
      this.busy = false;
      Sfx.play('ui-drop');
    });
  }
}
