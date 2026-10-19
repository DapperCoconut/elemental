import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { MAGNET, MagnetColorFn, MagnetFx, fillPts } from './MagnetVisuals';
import { MechArmKind, MechBuild, MechCore, MechHead } from './MagnetMech';

/**
 * Q+ Salvage Salvo — the parts of the mech, picked while the scrap gathers.
 *
 * - {@link SalvoPicker}: the four menus hung round the gathering player (head above, core below,
 *   an arm on each side). Click a chip to fit that part.
 * - {@link SalvoCrates}: the Junkyard Scrapper head's TNT. A self-destruct leaves three crates; a
 *   Repulse throws them, and each goes off as a double-layered cluster.
 */

type Owner = 'player' | 'npc';

export type SalvoPart = 'head' | 'core' | 'left' | 'right';

interface SalvoOption { id: string; name: string; blurb: string }

export const SALVO_HEADS: Array<SalvoOption & { id: MechHead }> = [
  { id: 'camo', name: 'Camo Military', blurb: 'Rocket barrages rain down on them every few seconds' },
  { id: 'furnace', name: 'Flaming Furnace', blurb: 'The red mech: every key hits harder; attacks leave fire' },
  { id: 'junkyard', name: 'Junkyard Scrapper', blurb: 'Deadlier self-destruct that drops 3 TNT crates to Repulse' },
];
export const SALVO_CORES: Array<SalvoOption & { id: MechCore }> = [
  { id: 'calm', name: 'Calm Core', blurb: 'Slower cooldowns, 50% longer mech' },
  { id: 'urgent', name: 'Urgent Core', blurb: 'Faster cooldowns, 40% shorter mech' },
  { id: 'base', name: 'Base Core', blurb: 'Normal numbers. The core cannot be hurt' },
];
export const SALVO_ARMS: Array<SalvoOption & { id: MechArmKind }> = [
  { id: 'slammer', name: 'Slammer', blurb: 'A spiked mace: the smash hits harder' },
  { id: 'launcher', name: 'Launcher', blurb: 'A barrage of rockets at the cursor' },
  { id: 'saw', name: 'Saw', blurb: 'Shreds whatever is under the cursor for a moment' },
];

const OPTIONS: Record<SalvoPart, SalvoOption[]> = {
  head: SALVO_HEADS, core: SALVO_CORES, left: SALVO_ARMS, right: SALVO_ARMS,
};

export const defaultBuild = (): MechBuild => ({ head: null, core: 'base', left: 'slammer', right: 'slammer' });

/** Fit option `idx` of `part` onto `b`. Out-of-range indices are ignored. */
export function applyPick(b: MechBuild, part: SalvoPart, idx: number): void {
  const o = OPTIONS[part]?.[idx];
  if (!o) return;
  if (part === 'head') b.head = o.id as MechHead;
  else if (part === 'core') b.core = o.id as MechCore;
  else b[part] = o.id as MechArmKind;
}

/** A bot's mech: any head, any core, any pair of arms. */
export function randomBuild(): MechBuild {
  const b = defaultBuild();
  for (const part of ['head', 'core', 'left', 'right'] as const) applyPick(b, part, Phaser.Math.Between(0, 2));
  return b;
}

const CHIP_W = 104;
const CHIP_H = 22;
const CHIP_GAP = 4;

interface Chip { part: SalvoPart; idx: number; x: number; y: number; text: Phaser.GameObjects.Text }

/** The four Salvage Salvo menus round the gathering player. Local player only. */
export class SalvoPicker {
  private g: Phaser.GameObjects.Graphics;
  private chips: Chip[] = [];
  private headers: Array<{ text: Phaser.GameObjects.Text; dx: number; dy: number }> = [];
  private blurb: Phaser.GameObjects.Text;
  private cx = 0;
  private cy = 0;

  constructor(private scene: Phaser.Scene, private width: number, private height: number) {
    this.g = scene.add.graphics().setDepth(26);
    const style = (size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle => ({
      fontSize: `${size}px`, fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color, stroke: '#07090e', strokeThickness: 3,
    });
    for (const part of ['head', 'core', 'left', 'right'] as const) {
      OPTIONS[part].forEach((o, idx) => {
        const text = scene.add.text(0, 0, o.name, style(10, '#dde8ff')).setOrigin(0.5).setDepth(27);
        this.chips.push({ part, idx, x: 0, y: 0, text });
      });
    }
    const hdr = (label: string, dx: number, dy: number): void => {
      this.headers.push({ text: scene.add.text(0, 0, label, style(11, '#8fe8ff')).setOrigin(0.5).setDepth(27), dx, dy });
    };
    const rowH = CHIP_H + CHIP_GAP;
    hdr('HEAD', 0, -78 - CHIP_H / 2 - 12);
    hdr('CORE', 0, 78 + CHIP_H / 2 + 12);
    hdr('LEFT ARM', -158, -rowH - CHIP_H / 2 - 12);
    hdr('RIGHT ARM', 158, -rowH - CHIP_H / 2 - 12);
    this.blurb = scene.add.text(0, 0, '', { ...style(10, '#ffee88'), align: 'center' }).setOrigin(0.5).setDepth(27);
  }

  /** Chip centre relative to the player. Head/core are rows; the arms are columns at the sides. */
  private offset(part: SalvoPart, idx: number): { x: number; y: number } {
    const colW = CHIP_W + CHIP_GAP, rowH = CHIP_H + CHIP_GAP;
    if (part === 'head') return { x: (idx - 1) * colW, y: -78 };
    if (part === 'core') return { x: (idx - 1) * colW, y: 78 };
    return { x: part === 'left' ? -158 : 158, y: (idx - 1) * rowH };
  }

  private chipAt(mx: number, my: number): Chip | undefined {
    return this.chips.find((c) => Math.abs(mx - c.x) <= CHIP_W / 2 && Math.abs(my - c.y) <= CHIP_H / 2);
  }

  /** Lay the menus out round `(px, py)` and paint them. `left` is the gather's time left (ms). */
  update(px: number, py: number, mx: number, my: number, build: MechBuild, left: number): void {
    this.cx = Phaser.Math.Clamp(px, 220, this.width - 220);
    this.cy = Phaser.Math.Clamp(py, 120, this.height - 125);
    const g = this.g;
    g.clear();
    const hover = this.chipAt(mx, my);
    for (const c of this.chips) {
      const o = this.offset(c.part, c.idx);
      c.x = this.cx + o.x; c.y = this.cy + o.y;
      const picked = c.part === 'head' ? build.head === OPTIONS.head[c.idx].id
        : c.part === 'core' ? build.core === OPTIONS.core[c.idx].id
          : build[c.part] === OPTIONS[c.part][c.idx].id;
      const hot = hover === c;
      const L = c.x - CHIP_W / 2, T = c.y - CHIP_H / 2;
      g.fillStyle(MAGNET.oil, 0.85);
      g.fillRoundedRect(L - 2, T - 2, CHIP_W + 4, CHIP_H + 4, 6);
      g.fillStyle(picked ? MAGNET.cobalt : hot ? MAGNET.gunHi : MAGNET.gunMid, 0.95);
      g.fillRoundedRect(L, T, CHIP_W, CHIP_H, 5);
      g.lineStyle(2, picked ? MAGNET.visor : hot ? MAGNET.sky : MAGNET.gunHi, picked || hot ? 1 : 0.7);
      g.strokeRoundedRect(L, T, CHIP_W, CHIP_H, 5);
      if (picked) {
        // A lit pip: this part is fitted.
        g.fillStyle(MAGNET.visor, 1);
        g.fillCircle(L + 7, c.y, 3);
      }
      c.text.setPosition(c.x + (picked ? 4 : 0), c.y).setColor(picked ? '#ffffff' : '#c8d6f0');
    }
    for (const h of this.headers) h.text.setPosition(this.cx + h.dx, this.cy + h.dy);
    const tip = hover ? OPTIONS[hover.part][hover.idx].blurb : `Click a part to fit it — ${(left / 1000).toFixed(1)}s`;
    this.blurb.setText(tip).setPosition(this.cx, this.cy + 78 + CHIP_H / 2 + 30);
  }

  /** A click at `(mx, my)`: the chip under it, if any. */
  click(mx: number, my: number): { part: SalvoPart; idx: number } | null {
    const c = this.chipAt(mx, my);
    return c ? { part: c.part, idx: c.idx } : null;
  }

  destroy(): void {
    this.g.destroy();
    for (const c of this.chips) c.text.destroy();
    for (const h of this.headers) h.text.destroy();
    this.blurb.destroy();
    this.chips = [];
    this.headers = [];
  }
}

// ── Junkyard TNT ──────────────────────────────────────────────────────────

const CRATE_COUNT = 3;
const CRATE_LIFE_MS = 25000;
const CRATE_DROP_MS = 650;
const CRATE_SPEED = 720;
const CRATE_RANGE = 560;
const CRATE_HIT_R = 18;
const CRATE_SIZE = 15;
/** The crate's own blast, then two cluster layers. */
const LAYERS: Array<{ dmg: number; radius: number; children: number; spread: number; fuseMs: number }> = [
  { dmg: 22, radius: 90, children: 6, spread: 95, fuseMs: 0 },
  { dmg: 10, radius: 52, children: 3, spread: 44, fuseMs: 420 },
  { dmg: 5, radius: 32, children: 0, spread: 0, fuseMs: 300 },
];

interface Crate {
  owner: Owner;
  x: number; y: number;
  state: 'drop' | 'ground' | 'fly';
  dropAt: number; landAt: number; sy: number;
  vx: number; vy: number; travelled: number;
  until: number; spin: number;
}

interface Bomblet { owner: Owner; sx: number; sy: number; lx: number; ly: number; startAt: number; at: number; layer: number; seed: number }

export interface SalvoCratesApi {
  readonly scene: Phaser.Scene;
  readonly width: number;
  readonly height: number;
  targets(owner: Owner): Fighter[];
  hit(owner: Owner, t: Fighter, dmg: number): void;
  fx(owner: Owner): MagnetFx;
  col(owner: Owner): MagnetColorFn;
  bodyR(f: Fighter): number;
  announce(x: number, y: number, text: string, color: number): void;
}

export class SalvoCrates {
  private crates: Crate[] = [];
  private bomblets: Bomblet[] = [];

  constructor(private api: SalvoCratesApi) {}

  private get now(): number { return this.api.scene.time.now; }

  reset(): void { this.crates = []; this.bomblets = []; }

  get idle(): boolean { return this.crates.length === 0 && this.bomblets.length === 0; }

  /**
   * A Junkyard self-destruct: three crates thud down across the middle. Fixed spots (mirrored for
   * the npc's mech) so both online sims put them in the same place.
   */
  drop(owner: Owner): void {
    const { width: W, height: H } = this.api;
    const spots = [{ x: W / 2 - 200, y: H * 0.56 }, { x: W / 2, y: H * 0.46 }, { x: W / 2 + 200, y: H * 0.56 }];
    const now = this.now;
    for (let i = 0; i < CRATE_COUNT; i++) {
      const p = owner === 'npc' ? { x: W - spots[i].x, y: H - spots[i].y } : spots[i];
      this.crates.push({
        owner, x: p.x, y: p.y, state: 'drop', dropAt: now + i * 140, landAt: now + i * 140 + CRATE_DROP_MS, sy: -60,
        vx: 0, vy: 0, travelled: 0, until: now + CRATE_LIFE_MS, spin: 0,
      });
    }
    this.api.announce(W / 2, H / 2 - 40, '🧨 TNT DROPPED — REPULSE IT!', MAGNET.amber);
  }

  /** Repulse: every grounded crate of the owner's in the cone is thrown the way they face. */
  repulse(owner: Owner, inCone: (x: number, y: number) => boolean, ang: number): number {
    let n = 0;
    for (const c of this.crates) {
      if (c.owner !== owner || c.state !== 'ground' || !inCone(c.x, c.y)) continue;
      c.state = 'fly';
      c.vx = Math.cos(ang) * CRATE_SPEED;
      c.vy = Math.sin(ang) * CRATE_SPEED;
      c.travelled = 0;
      n++;
    }
    return n;
  }

  /** Grounded crates of the owner's inside a cone — the bot scores its Repulse on these. */
  countIn(owner: Owner, inCone: (x: number, y: number) => boolean): number {
    return this.crates.filter((c) => c.owner === owner && c.state === 'ground' && inCone(c.x, c.y)).length;
  }

  update(dt: number): void {
    const now = this.now;
    const { width: W, height: H } = this.api;
    for (let i = this.crates.length - 1; i >= 0; i--) {
      const c = this.crates[i];
      if (c.state === 'drop') {
        if (now >= c.landAt) {
          c.state = 'ground';
          this.api.fx(c.owner).shrapnel(c.x, c.y, 5, { speed: 120, size: 7, life: 360, depth: 6, color: 0x8a5a2b });
        }
        continue;
      }
      if (c.state === 'ground') {
        if (now >= c.until) this.crates.splice(i, 1);
        continue;
      }
      const step = Math.hypot(c.vx, c.vy) * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.travelled += step;
      c.spin += dt * 12;
      const struck = this.api.targets(c.owner)
        .some((t) => Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y) <= this.api.bodyR(t) + CRATE_HIT_R);
      const wall = c.x < 30 || c.x > W - 30 || c.y < 30 || c.y > H - 30;
      if (struck || wall || c.travelled >= CRATE_RANGE) {
        this.crates.splice(i, 1);
        this.detonate(c.owner, Phaser.Math.Clamp(c.x, 30, W - 30), Phaser.Math.Clamp(c.y, 30, H - 30), 0, Math.floor(c.travelled));
      }
    }
    for (let i = this.bomblets.length - 1; i >= 0; i--) {
      const b = this.bomblets[i];
      if (now < b.at) continue;
      this.bomblets.splice(i, 1);
      this.detonate(b.owner, b.lx, b.ly, b.layer, b.seed);
    }
  }

  /** One layer goes off and scatters the next. Angles are seeded so both online sims agree. */
  private detonate(owner: Owner, x: number, y: number, layer: number, seed: number): void {
    const L = LAYERS[layer];
    const fx = this.api.fx(owner);
    fx.boom(x, y, L.radius + 10, { color: layer === 0 ? MAGNET.hot : MAGNET.amber, depth: 8, shrapnel: layer === 0 ? 10 : 4 });
    if (layer === 0) {
      this.api.scene.cameras.main.shake(380, 0.026);
      this.api.announce(x, y - 44, '💥 CLUSTER TNT!', MAGNET.amber);
    }
    for (const t of this.api.targets(owner)) {
      if (Phaser.Math.Distance.Between(x, y, t.x, t.y) > L.radius) continue;
      this.api.hit(owner, t, L.dmg);
    }
    const next = LAYERS[layer + 1];
    if (!next) return;
    const { width: W, height: H } = this.api;
    const now = this.now;
    for (let i = 0; i < L.children; i++) {
      const a = (seed % 17) * 0.37 + (i / L.children) * Math.PI * 2;
      const d = L.spread * (0.8 + 0.2 * ((i * 7 + seed) % 3) / 2);
      this.bomblets.push({
        owner, sx: x, sy: y,
        lx: Phaser.Math.Clamp(x + Math.cos(a) * d, 20, W - 20),
        ly: Phaser.Math.Clamp(y + Math.sin(a) * d, 20, H - 20),
        startAt: now, at: now + next.fuseMs + i * 30, layer: layer + 1, seed: seed + i * 5 + 1,
      });
    }
  }

  paint(ground: Phaser.GameObjects.Graphics, air: Phaser.GameObjects.Graphics, t: number): void {
    const now = this.now;
    for (const c of this.crates) {
      if (c.state === 'drop') {
        if (now < c.dropAt) continue;
        const k = Phaser.Math.Clamp((now - c.dropAt) / CRATE_DROP_MS, 0, 1);
        ground.fillStyle(MAGNET.shadow, 0.2 + 0.35 * k);
        ground.fillEllipse(c.x, c.y + 10, 20 + 16 * k, (20 + 16 * k) * 0.4);
        drawCrate(air, c.x, c.y - (1 - k * k) * 320, k * 4, t, false);
        continue;
      }
      ground.fillStyle(MAGNET.shadow, 0.4);
      ground.fillEllipse(c.x, c.y + 12, 38, 13);
      const blink = c.state === 'ground' && c.until - now < 3000 && Math.sin(t * 14) > 0;
      drawCrate(c.state === 'fly' ? air : ground, c.x, c.y, c.spin, t, blink);
    }
    for (const b of this.bomblets) {
      const k = Phaser.Math.Clamp((now - b.startAt) / Math.max(1, b.at - b.startAt), 0, 1);
      const x = Phaser.Math.Linear(b.sx, b.lx, k);
      const y = Phaser.Math.Linear(b.sy, b.ly, k) - Math.sin(k * Math.PI) * (b.layer === 1 ? 46 : 26);
      const r = b.layer === 1 ? 6 : 4;
      ground.fillStyle(MAGNET.shadow, 0.3);
      ground.fillEllipse(b.lx, b.ly, r * 3, r * 1.2);
      air.fillStyle(0x8a1a12, 1);
      air.fillCircle(x, y, r + 1.5);
      air.fillStyle(0xd23a24, 1);
      air.fillCircle(x, y, r);
      air.fillStyle(Math.sin(t * 40 + b.seed) > 0 ? 0xffee88 : 0xff7a1a, 1);
      air.fillCircle(x + r * 0.6, y - r * 0.8, 2);
    }
  }
}

/** A wooden TNT crate with dynamite poking out of the lid and a sputtering fuse. */
function drawCrate(g: Phaser.GameObjects.Graphics, x: number, y: number, rot: number, t: number, warn: boolean): void {
  const s = CRATE_SIZE;
  const c = Math.cos(rot), n = Math.sin(rot);
  const p = (fx: number, fy: number) => ({ x: x + c * fx - n * fy, y: y + n * fx + c * fy });
  g.fillStyle(0x2a1a10, 1);
  fillPts(g, [p(-s - 2, -s - 2), p(s + 2, -s - 2), p(s + 2, s + 2), p(-s - 2, s + 2)]);
  g.fillStyle(0x8a5a2b, 1);
  fillPts(g, [p(-s, -s), p(s, -s), p(s, s), p(-s, s)]);
  // Planks and the cross brace.
  g.lineStyle(2, 0x5a3818, 1);
  for (const fy of [-s / 3, s / 3]) { const a = p(-s, fy), b = p(s, fy); g.lineBetween(a.x, a.y, b.x, b.y); }
  g.lineStyle(3, 0x6a4420, 1);
  { const a = p(-s, -s), b = p(s, s); g.lineBetween(a.x, a.y, b.x, b.y); }
  // A red TNT band.
  g.fillStyle(warn ? 0xffee88 : 0xd23a24, 1);
  fillPts(g, [p(-s, -4), p(s, -4), p(s, 4), p(-s, 4)]);
  // Sticks out of the top.
  for (let i = 0; i < 3; i++) {
    const fx = -8 + i * 8;
    g.fillStyle(0xd23a24, 1);
    fillPts(g, [p(fx - 3, -s - 9), p(fx + 3, -s - 9), p(fx + 3, -s), p(fx - 3, -s)]);
  }
  const f = p(0, -s - 15);
  g.fillStyle(Math.sin(t * 30 + x) > 0 ? 0xffee88 : 0xff7a1a, 1);
  g.fillCircle(f.x, f.y, 3);
}

// ── The mech's core ───────────────────────────────────────────────────────

/**
 * The mech's reactor, grounded where its pilot gathered it — the one part of the mech an enemy can
 * reach. `core` is the Salvage Salvo pick (null = the plain mech's own core): Calm pulses slow and
 * blue, Urgent flickers red, Base is caged in plate and shows its lock.
 */
export function drawMechCore(
  g: Phaser.GameObjects.Graphics, tint: MagnetColorFn, x: number, y: number,
  core: MechCore | null, hurtable: boolean, flash: boolean, t: number,
): void {
  const rate = core === 'urgent' ? 11 : core === 'calm' ? 2.2 : 5;
  const pulse = 0.5 + 0.5 * Math.sin(t * rate);
  const glow = core === 'urgent' ? MAGNET.rose : core === 'calm' ? MAGNET.blue : MAGNET.neon;
  // Footing: a scrap ring bolted to the floor.
  g.fillStyle(tint(MAGNET.shadow), 0.45);
  g.fillEllipse(x, y + 16, 64, 18);
  g.fillStyle(tint(MAGNET.oil), 1);
  g.fillCircle(x, y, 27);
  g.fillStyle(tint(MAGNET.gunMid), 1);
  g.fillCircle(x, y, 24);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + t * 0.4;
    g.fillStyle(tint(MAGNET.plateHi), 0.9);
    g.fillCircle(x + Math.cos(a) * 21, y + Math.sin(a) * 21, 2);
  }
  // The reactor itself.
  g.fillStyle(tint(glow), 0.25 + 0.25 * pulse);
  g.fillCircle(x, y, 20 + pulse * 6);
  g.fillStyle(tint(flash ? MAGNET.white : glow), 0.9);
  g.fillCircle(x, y, 13 + pulse * 2);
  g.fillStyle(tint(MAGNET.white), flash ? 1 : 0.55 + 0.35 * pulse);
  g.fillCircle(x - 3, y - 3, 5);
  // A conduit off toward the mech's edge, so it reads as plugged in.
  g.lineStyle(3, tint(glow), 0.35 + 0.3 * pulse);
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i - 1) * 0.5 + Math.sin(t * 2 + i) * 0.1;
    g.lineBetween(x + Math.cos(a) * 24, y + Math.sin(a) * 24, x + Math.cos(a) * 40, y + Math.sin(a) * 40);
  }
  if (!hurtable) {
    // Base core: caged in plate, with a padlock on the front.
    g.lineStyle(4, tint(MAGNET.steel), 0.95);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      g.lineBetween(x + Math.cos(a) * 26, y + Math.sin(a) * 26, x - Math.cos(a) * 26, y - Math.sin(a) * 26);
    }
    g.strokeCircle(x, y, 26);
    g.fillStyle(tint(MAGNET.gold), 1);
    g.fillRoundedRect(x - 6, y + 10, 12, 10, 2);
    g.lineStyle(2, tint(MAGNET.gold), 1);
    g.beginPath();
    g.arc(x, y + 10, 4, Math.PI, 0, false);
    g.strokePath();
  } else if (flash) {
    g.lineStyle(3, tint(MAGNET.rose), 0.9);
    g.strokeCircle(x, y, 30);
  }
}
