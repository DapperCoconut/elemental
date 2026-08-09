import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  CHK, ChalkAvatar, ChalkFx, chalkBlob, chalkLine, grain,
} from '../../../elements/kits/ChalkVisuals';

/**
 * Chalk's showcases.
 *
 * There is no projectile in this element at all — every mark on the floor is a Graphics stroke
 * repainted from `ChalkVisuals`, so these loops keep the kit's own `Mark` records (position,
 * previous point, linked, seed) and hand them to `chalkLine`/`chalkBlob` exactly as `paintMark`
 * does. The one real projectile here is the enemy ammunition Perma-Block rubs out, flown with
 * `ctx.fly` on a genuine texture.
 *
 * Every loop drives a `pen`, which is the kit's `feedSession` in miniature: a cursor path, a
 * step in pixels, and a mark laid every time the cursor has travelled that far.
 *
 * Containment: `ctx.at`/`ctx.onFrame` run outside the harness's capture window, so anything
 * built inside one goes through `ctx.adopt`. `ChalkFx` carries a sticky sink.
 */

// ── The kit's constants, mirrored ─────────────────────────────────────

const STEP = 12;
const STEP_MP = 17;
const LIFT = 96;

const WARD_DRAW_MS = 1000;
const WARD_FUSE_MS = 500;
const WARD_DAMAGE = 10;
const WARD_STACK_DAMAGE = 5;
const WARD_MAX_STACKS = 5;
const WARD_RADIUS = 34;
const WARD_BOOM_SPACING = 30;
const WARD_BOOM_MAX = 16;

const BOOM_DRAW_MS = 2000;
const BOOM_FUSE_MS = 1000;
const BOOM_DAMAGE = 10;
const BOOM_RADIUS = 40;
const BOOM_STAGGER_MS = 55;
const RELEASE_DAMAGE = 25;

const PERMA_DRAW_MS = 500;
const PERMA_DPS = 30;
const PERMA_RADIUS = 24;
const PERMA_BLOCK_R = 20;

const SHIELD_DRAW_MS = 1000;
const SHIELD_DRAW_SUPREME_MS = 2500;
const SHIELD_RANGE = 118;
const SHIELD_MIN_DIST = 30;
const SHIELD_HP = 125;
const SHIELD_SPIN = 0.9;
const SHIELD_NODE_R = 15;
const SHIELD_PROJ_COST = 8;
const SHIELD_PUSH_DPS = 12;
const SHIELD_PUSH_PAD = 14;
const SUPREME_BOOM_DAMAGE = 14;

const MP_MS = 8000;
const MP_HEAL_DPS = 9;
const MP_DAMAGE_DPS = 18;
const MP_SPEED_MULT = 1.45;
const MP_TOUCH_R = 26;

const DEBRIS_RADIUS = 56;
const DEBRIS_MAX = 4;

// ── Staging ───────────────────────────────────────────────────────────

interface Mark { x: number; y: number }

/** One dab of chalk, carrying exactly the fields `paintMark` reads. */
interface CMark {
  x: number; y: number; px: number; py: number; linked: boolean; seed: number; color: number;
}

function stage(ctx: PreviewCtx, opts?: { noDummy?: boolean }): {
  fx: ChalkFx; av: BaseAvatar; cav: ChalkAvatar | null;
} {
  const fx = ctx.capture(() => new ChalkFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new ChalkAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  if (!opts?.noDummy) ctx.addDummy();
  return { fx, av, cav: av instanceof ChalkAvatar ? av : null };
}

function dummyAt(ctx: PreviewCtx, m: Mark): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
  ctx.onFrame(() => {
    g.clear();
    g.fillStyle(0x2b2f3d, 1);
    g.fillCircle(m.x, m.y, 17);
    g.fillStyle(0x3c4254, 1);
    g.fillCircle(m.x, m.y, 13);
    g.fillStyle(0x8e97ad, 0.9);
    g.fillCircle(m.x - 5, m.y - 4, 3.2);
    g.fillCircle(m.x + 5, m.y - 4, 3.2);
    g.fillStyle(0x11131b, 1);
    g.fillCircle(m.x - 5.6, m.y - 4, 1.6);
    g.fillCircle(m.x + 4.4, m.y - 4, 1.6);
  });
}

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function tick(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(color), stroke: '#0b0e10', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(20));
  const y0 = y;
  let age = 0;
  ctx.onFrame((dt) => {
    age += dt;
    t.setY(y0 - (age / 780) * 20);
    t.setAlpha(Phaser.Math.Clamp(1 - age / 780, 0, 1));
  });
}

function label(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(color), align: 'center',
  }).setOrigin(0.5).setDepth(19));
}

/** The floor. Paints every mark exactly as `paintMark` does — a run is a line, a dab is a blob. */
function floor(ctx: PreviewCtx, marks: CMark[], depth = 2): Phaser.GameObjects.Graphics {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(depth));
  ctx.onFrame(() => {
    g.clear();
    for (const m of marks) {
      if (m.linked) chalkLine(g, ctx.tint, m.px, m.py, m.x, m.y, 3, m.color, 1, m.seed);
      else chalkBlob(g, ctx.tint, m.x, m.y, 2.6, m.color, 1, m.seed);
    }
  });
  return g;
}

/**
 * A drawing window. Walks `path` between `startMs` and `endMs` and lays a mark every time the
 * cursor has travelled `step` px — which is the whole of `feedSession`, minus the fuses.
 */
function pen(ctx: PreviewCtx, marks: CMark[], o: {
  startMs: number; endMs: number; step?: number; color: number;
  path: (t: number) => Mark;
  onMark?: (m: CMark, index: number) => void;
  cursor?: boolean;
}): void {
  const step = o.step ?? STEP;
  let started = false;
  let lx = 0;
  let ly = 0;
  let n = 0;
  const cur = o.cursor === false ? null : ctx.adopt(ctx.scene.add.graphics().setDepth(12));
  ctx.onFrame((_dt, elapsed) => {
    cur?.clear();
    if (elapsed < o.startMs || elapsed > o.endMs) return;
    const p = o.path((elapsed - o.startMs) / (o.endMs - o.startMs));
    if (cur) {
      // The cursor itself, because in this element the cursor is the weapon.
      cur.lineStyle(1.4, ctx.tint(o.color), 0.9);
      cur.strokeCircle(p.x, p.y, 5);
      cur.lineBetween(p.x - 8, p.y, p.x + 8, p.y);
      cur.lineBetween(p.x, p.y - 8, p.x, p.y + 8);
    }
    if (started && Phaser.Math.Distance.Between(lx, ly, p.x, p.y) < step) return;
    const linked = started && Phaser.Math.Distance.Between(lx, ly, p.x, p.y) <= LIFT;
    const m: CMark = { x: p.x, y: p.y, px: lx, py: ly, linked, seed: n * 37.7, color: o.color };
    marks.push(m);
    o.onMark?.(m, n);
    n++;
    lx = p.x;
    ly = p.y;
    started = true;
  });
}

/** A tight scribble over a point — the shape a Ward is supposed to be drawn in. */
function scribble(at: Mark, r: number): (t: number) => Mark {
  return (t) => ({
    x: at.x + Math.cos(t * Math.PI * 6) * r * (0.35 + t * 0.65),
    y: at.y + Math.sin(t * Math.PI * 6) * r * 0.62 * (0.35 + t * 0.65),
  });
}

/** Thin a run down to the bursts actually drawn — 30px apart, at most 16 of them. */
function thin(run: CMark[]): CMark[] {
  const shown: CMark[] = [];
  for (const m of run) {
    if (shown.length >= WARD_BOOM_MAX) break;
    if (shown.some((s) => Phaser.Math.Distance.Between(s.x, s.y, m.x, m.y) < WARD_BOOM_SPACING)) continue;
    shown.push(m);
  }
  return shown;
}

// ── Click — Chalk Ward ────────────────────────────────────────────────

function wardLoop(ctx: PreviewCtx, opts: { debris: boolean }): void {
  const { fx, av, cav } = stage(ctx, { noDummy: true });
  const foe = { x: ctx.w * 0.62, y: ctx.cy };
  dummyAt(ctx, foe);

  const marks: CMark[] = [];
  floor(ctx, marks);
  const run: CMark[] = [];

  ctx.at(300, () => {
    av.play('punch');
    cav?.setChalk(CHK.white);
    cav?.setDrawing(true);
    fx.ring(ctx.cx, ctx.cy, 10, 40, CHK.white, 320);
  });
  pen(ctx, marks, {
    startMs: 300, endMs: 300 + WARD_DRAW_MS, color: CHK.white,
    path: scribble(foe, 30),
    onMark: (m) => { run.push(m); if (m.linked) fx.lay(m.px, m.py, m.x, m.y, CHK.white); },
  });
  ctx.at(300 + WARD_DRAW_MS, () => cav?.setDrawing(false));

  const clouds: Mark[] = [];
  const dust = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  let cloudsAt = -1;
  ctx.onFrame((_dt, elapsed) => {
    dust.clear();
    if (cloudsAt < 0) return;
    const life = Phaser.Math.Clamp(1 - (elapsed - cloudsAt) / 4000, 0, 1);
    if (life <= 0) return;
    const t = elapsed / 1000;
    for (const c of clouds) {
      for (let i = 0; i < 9; i++) {
        const a = grain(c.x, i) * Math.PI * 2 + t * 0.25;
        const d = DEBRIS_RADIUS * (0.25 + grain(c.x, i + 40) * 0.7);
        const r = 7 + grain(c.x, i + 80) * 11;
        chalkBlob(dust, ctx.tint, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d + Math.sin(t * 1.6 + i) * 3,
          r, CHK.dust, 0.1 + life * 0.16, c.x + i * 5);
      }
      dust.lineStyle(1, ctx.tint(CHK.dust), 0.1 + life * 0.14);
      dust.strokeCircle(c.x, c.y, DEBRIS_RADIUS);
    }
  });

  // The whole white run goes up together, half a second after the hand comes off the floor.
  ctx.at(300 + WARD_DRAW_MS + WARD_FUSE_MS, () => {
    const shown = thin(run);
    for (const m of shown) fx.boom(m.x, m.y, WARD_RADIUS, CHK.white);
    const covered = run.filter((m) => Phaser.Math.Distance.Between(m.x, m.y, foe.x, foe.y) <= WARD_RADIUS).length;
    const stacks = Math.min(covered, WARD_MAX_STACKS);
    const amp = opts.debris ? 1 : 1;
    if (stacks > 0) {
      tick(ctx, foe.x, foe.y - 30, `${Math.round((WARD_DAMAGE + (stacks - 1) * WARD_STACK_DAMAGE) * amp)}`, CHK.white);
      tick(ctx, foe.x, foe.y - 54, `💥 WARD ×${stacks}`, CHK.white);
    }
    marks.length = 0;
    run.length = 0;
    if (!opts.debris) return;
    const step = Math.max(1, Math.ceil(shown.length / DEBRIS_MAX));
    for (let i = 0; i < shown.length && clouds.length < DEBRIS_MAX; i += step) {
      clouds.push({ x: shown[i].x, y: shown[i].y });
      fx.dust(shown[i].x, shown[i].y, 9, DEBRIS_RADIUS * 0.8, 900, CHK.dust);
    }
    cloudsAt = 300 + WARD_DRAW_MS + WARD_FUSE_MS;
    tick(ctx, ctx.cx, ctx.cy - 52, `🌫️ DEBRIS ×${clouds.length}`, CHK.dust);
  });

  if (!opts.debris) return;
  ctx.at(3000, () => tick(ctx, foe.x, foe.y - 40, '38% SLOWER · ×1.5 CHALK', CHK.dust));
  ctx.at(4000, () => tick(ctx, foe.x, foe.y - 30, '15  ×1.5', CHK.white));
}

export const ward: PreviewScript = {
  duration: 3600,
  caption: 'Click — 1s of white, then all of it at once: 10 damage, +5 per extra mark covering them, 30 max',
  run(ctx) { wardLoop(ctx, { debris: false }); },
};

export const wardUpgraded: PreviewScript = {
  duration: 5200,
  caption: 'Chalk Debris — up to 4 clouds for 4s: 38% slower, and ×1.5 from every kind of your chalk',
  run(ctx) { wardLoop(ctx, { debris: true }); },
};

// ── E — Explosive Chalk ───────────────────────────────────────────────

export const explosive: PreviewScript = {
  duration: 6200,
  scale: 0.9,
  caption: 'E — 2s of red, then the line runs end to end in the order you drew it, 10 a blast',
  run(ctx) {
    const { fx, av, cav } = stage(ctx, { noDummy: true });
    const foe = { x: ctx.w * 0.66, y: ctx.cy };
    dummyAt(ctx, foe);

    const marks: CMark[] = [];
    floor(ctx, marks);
    const run: CMark[] = [];

    ctx.at(300, () => {
      av.play('sweep');
      cav?.setChalk(CHK.red);
      cav?.setDrawing(true);
      fx.ring(ctx.cx, ctx.cy, 10, 46, CHK.red, 360);
      tick(ctx, ctx.cx, ctx.cy - 44, '🧨 FUSE LAID', CHK.red);
    });
    // A line drawn across the floor in front of them, which is what the ability is for.
    pen(ctx, marks, {
      startMs: 300, endMs: 300 + BOOM_DRAW_MS, color: CHK.red,
      path: (t) => ({ x: ctx.w * 0.36 + t * ctx.w * 0.5, y: ctx.cy - 46 + Math.sin(t * 5) * 44 }),
      onMark: (m) => { run.push(m); if (m.linked) fx.lay(m.px, m.py, m.x, m.y, CHK.red); },
    });
    ctx.at(300 + BOOM_DRAW_MS, () => cav?.setDrawing(false));

    // Every mark knows its own turn in advance, 55ms apart, counted from the window closing.
    let gate = 0;
    ctx.at(300 + BOOM_DRAW_MS + BOOM_FUSE_MS, () => {
      run.forEach((m, i) => ctx.at(i * BOOM_STAGGER_MS, () => {
        fx.boom(m.x, m.y, BOOM_RADIUS, CHK.red);
        const idx = marks.indexOf(m);
        if (idx >= 0) marks.splice(idx, 1);
        if (Phaser.Math.Distance.Between(m.x, m.y, foe.x, foe.y) > BOOM_RADIUS) return;
        // One blast per body per 180ms, however many marks overlap them.
        const now = 300 + BOOM_DRAW_MS + BOOM_FUSE_MS + i * BOOM_STAGGER_MS;
        if (now < gate) return;
        gate = now + 180;
        tick(ctx, foe.x, foe.y - 30, `${BOOM_DAMAGE}`, CHK.red);
      }));
    });
    label(ctx, ctx.cx, ctx.h - 12, '55ms between blasts · one hit per body per 180ms', CHK.redDeep);
  },
};

export const explosiveUpgraded: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'Explosive Release — close the loop and the floor inside it goes up too, 25 flat however big',
  run(ctx) {
    const { fx, av, cav } = stage(ctx, { noDummy: true });
    const foe = { x: ctx.w * 0.6, y: ctx.h * 0.5 };
    dummyAt(ctx, foe);

    const marks: CMark[] = [];
    floor(ctx, marks);
    const run: CMark[] = [];

    ctx.at(300, () => {
      av.play('sweep');
      cav?.setChalk(CHK.red);
      cav?.setDrawing(true);
      fx.ring(ctx.cx, ctx.cy, 10, 46, CHK.red, 360);
    });
    // A loop that comes back to itself — a shape, not a stripe.
    const rx = ctx.w * 0.19;
    const ry = ctx.h * 0.31;
    pen(ctx, marks, {
      startMs: 300, endMs: 300 + BOOM_DRAW_MS, color: CHK.red,
      path: (t) => ({
        x: foe.x + Math.cos(t * Math.PI * 2 - Math.PI) * rx,
        y: foe.y + Math.sin(t * Math.PI * 2 - Math.PI) * ry,
      }),
      onMark: (m) => { run.push(m); if (m.linked) fx.lay(m.px, m.py, m.x, m.y, CHK.red); },
    });
    ctx.at(300 + BOOM_DRAW_MS, () => {
      cav?.setDrawing(false);
      tick(ctx, ctx.cx, ctx.cy - 52, '⭕ CLOSED', CHK.red);
    });

    // The shut-in floor, hatched in red while the line burns round it.
    let armedFrom = -1;
    let armedTo = -1;
    const hatch = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    ctx.onFrame((_dt, elapsed) => {
      hatch.clear();
      if (armedFrom < 0 || elapsed > armedTo) return;
      const heat = Phaser.Math.Clamp(1 - (armedTo - elapsed) / 1200, 0, 1);
      const pulse = 0.55 + 0.45 * Math.sin(elapsed / 1000 * (6 + heat * 22));
      hatch.lineStyle(1.5, ctx.tint(CHK.red), 0.16 + heat * 0.3 * pulse);
      for (let y = foe.y - ry; y <= foe.y + ry; y += 14) {
        for (let x = foe.x - rx; x <= foe.x + rx; x += 22) {
          const dx = (x + 8 - foe.x) / rx;
          const dy = (y - foe.y) / ry;
          if (dx * dx + dy * dy > 1) continue;
          hatch.lineBetween(x, y + 6, x + 12, y - 6);
        }
      }
    });

    const fireAt = 300 + BOOM_DRAW_MS + BOOM_FUSE_MS;
    ctx.at(fireAt, () => {
      armedFrom = fireAt;
      armedTo = fireAt + run.length * BOOM_STAGGER_MS;
      run.forEach((m, i) => ctx.at(i * BOOM_STAGGER_MS, () => {
        fx.boom(m.x, m.y, BOOM_RADIUS, CHK.red);
        const idx = marks.indexOf(m);
        if (idx >= 0) marks.splice(idx, 1);
      }));
    });
    // The shape goes last, as the line's own conclusion rather than a second explosion.
    ctx.at(fireAt + 2200, () => {
      armedTo = -1;
      const stride = Math.max(1, Math.floor(run.length / 10));
      for (let i = 0; i < run.length; i += stride) {
        fx.boom(run[i].x, run[i].y, BOOM_RADIUS * 0.7, CHK.red, 380);
      }
      fx.ring(foe.x, foe.y, 12, 120, CHK.redDeep, 520);
      fx.dust(foe.x, foe.y, 16, 130, 900, CHK.red);
      tick(ctx, foe.x, foe.y - 30, `${RELEASE_DAMAGE}`, CHK.red);
      tick(ctx, foe.x, foe.y - 54, '⭕ ENCLOSED', CHK.red);
    });
  },
};

// ── R — Perma-Chalk ───────────────────────────────────────────────────

/** A blue line, and the burn it puts on anybody standing on it. */
function permaLine(ctx: PreviewCtx, marks: CMark[], path: (t: number) => Mark, at: number, fx: ChalkFx): CMark[] {
  const run: CMark[] = [];
  pen(ctx, marks, {
    startMs: at, endMs: at + PERMA_DRAW_MS, color: CHK.blue, path,
    onMark: (m) => { run.push(m); if (m.linked) fx.lay(m.px, m.py, m.x, m.y, CHK.blue); },
  });
  return run;
}

export const perma: PreviewScript = {
  duration: 6800,
  scale: 0.9,
  caption: 'R — 0.5s of blue that never expires, 30/s to anyone on it. Recast rubs the old line out',
  run(ctx) {
    const { fx, av, cav } = stage(ctx, { noDummy: true });
    const foe = { x: ctx.w * 0.58, y: ctx.cy };
    dummyAt(ctx, foe);

    const marks: CMark[] = [];
    floor(ctx, marks);

    ctx.at(300, () => {
      av.play('slam');
      cav?.setChalk(CHK.blue);
      cav?.setDrawing(true);
      fx.ring(ctx.cx, ctx.cy, 10, 44, CHK.blue, 380);
      tick(ctx, ctx.cx, ctx.cy - 44, '🔵 PERMA-CHALK', CHK.blue);
    });
    let first = permaLine(ctx, marks, (t) => ({
      x: foe.x - 44 + t * 90, y: foe.y - 30 + t * 60,
    }), 300, fx);
    ctx.at(300 + PERMA_DRAW_MS, () => cav?.setDrawing(false));

    // The burn, taken as a maximum rather than a sum and carried as a fraction between frames.
    let acc = 0;
    let burning = true;
    ctx.onFrame((dt, elapsed) => {
      if (!burning || elapsed < 900) return;
      if (!marks.some((m) => m.color === CHK.blue
        && Phaser.Math.Distance.Between(m.x, m.y, foe.x, foe.y) <= PERMA_RADIUS)) return;
      acc += PERMA_DPS * (dt / 1000);
      const whole = Math.floor(acc);
      if (whole <= 0) return;
      acc -= whole;
      if (Math.random() < 0.35) tick(ctx, foe.x, foe.y - 26, `${whole}`, CHK.blue);
    });

    // Recast: there is only ever one blue line, so the first one is rubbed out first.
    ctx.at(4000, () => {
      burning = false;
      for (let i = 0; i < first.length; i += 4) fx.dust(first[i].x, first[i].y, 2, 12, 420, CHK.blue);
      for (const m of first) {
        const idx = marks.indexOf(m);
        if (idx >= 0) marks.splice(idx, 1);
      }
      first = [];
      av.play('slam');
      cav?.setDrawing(true);
      tick(ctx, ctx.cx, ctx.cy - 44, '🔵 REDRAWN', CHK.blue);
    });
    permaLine(ctx, marks, (t) => ({ x: ctx.w * 0.3 + t * 80, y: ctx.cy + 34 }), 4000, fx);
    ctx.at(4000 + PERMA_DRAW_MS, () => cav?.setDrawing(false));
  },
};

export const permaUpgraded: PreviewScript = {
  duration: 5600,
  scale: 0.9,
  caption: 'Perma-Block — every shot that crosses the blue line is rubbed out, and the line is not spent doing it',
  run(ctx) {
    const { fx, av, cav } = stage(ctx, { noDummy: true });
    const foe = { x: ctx.w * 0.78, y: ctx.cy };
    dummyAt(ctx, foe);

    const marks: CMark[] = [];
    floor(ctx, marks);
    ctx.at(200, () => {
      av.play('slam');
      cav?.setChalk(CHK.blue);
      cav?.setDrawing(true);
      fx.ring(ctx.cx, ctx.cy, 10, 44, CHK.blue, 380);
    });
    // A wall drawn across the lane between the two of you.
    const wall = permaLine(ctx, marks, (t) => ({ x: ctx.w * 0.52, y: ctx.cy - 54 + t * 108 }), 200, fx);
    ctx.at(200 + PERMA_DRAW_MS, () => cav?.setDrawing(false));

    for (let i = 0; i < 5; i++) {
      ctx.at(1200 + i * 780, () => {
        const y = ctx.cy - 40 + (i % 3) * 40;
        const rec = { x: foe.x - 20, alive: true };
        ctx.fly({
          texture: 'proj-fire', from: { x: foe.x - 20, y }, to: { x: ctx.cx, y: ctx.cy }, speed: 420,
        });
        ctx.onFrame((dt) => {
          if (!rec.alive) return;
          rec.x -= 420 * (dt / 1000);
          const hit = wall.find((m) => Phaser.Math.Distance.Between(m.x, m.y, rec.x, y) <= PERMA_BLOCK_R);
          if (!hit) return;
          rec.alive = false;
          fx.snap(rec.x, y, CHK.blue);
          tick(ctx, rec.x, y - 22, '✏️ RUBBED OUT', CHK.blue);
        });
      });
    }
  },
};

// ── F — Chalk Shield ──────────────────────────────────────────────────

interface Node { ang: number; dist: number; seed: number; color: number }

function shieldLoop(ctx: PreviewCtx, opts: { supreme: boolean }): void {
  const { fx, av, cav } = stage(ctx, { noDummy: true });
  const foe = { x: ctx.w * 0.74, y: ctx.cy };
  dummyAt(ctx, foe);

  const drawMs = opts.supreme ? SHIELD_DRAW_SUPREME_MS : SHIELD_DRAW_MS;
  const marks: CMark[] = [];
  floor(ctx, marks, 3);

  // The dashed ring you are allowed to draw inside.
  let ringUntil = -1;
  const ring = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
  ctx.onFrame((_dt, elapsed) => {
    ring.clear();
    if (elapsed > ringUntil) return;
    const fade = Phaser.Math.Clamp((ringUntil - elapsed) / 260, 0, 1);
    for (let i = 0; i < 22; i++) {
      if (grain(i * 3.3, 1) > 0.82) continue;
      const a0 = (i / 22) * Math.PI * 2 + (elapsed / 1000) * 0.5;
      const a1 = a0 + (Math.PI * 2 / 22) * 0.62;
      ring.lineStyle(2, ctx.tint(CHK.white), 0.5 * fade);
      ring.lineBetween(ctx.cx + Math.cos(a0) * SHIELD_RANGE, ctx.cy + Math.sin(a0) * SHIELD_RANGE,
        ctx.cx + Math.cos(a1) * SHIELD_RANGE, ctx.cy + Math.sin(a1) * SHIELD_RANGE);
    }
  });

  // A Supreme Shield changes stick part-way through, and the whole run still lifts as one.
  let stick = CHK.white;
  ctx.at(200, () => {
    ringUntil = 200 + drawMs;
    av.play('flex');
    cav?.setChalk(CHK.white);
    cav?.setDrawing(true);
    fx.ring(ctx.cx, ctx.cy, 16, SHIELD_RANGE, CHK.white, 460);
    tick(ctx, ctx.cx, ctx.cy - 46, opts.supreme ? '🛡️ DRAW IT — E/R/F' : '🛡️ DRAW YOUR SHIELD', CHK.white);
  });
  if (opts.supreme) {
    ctx.at(200 + drawMs * 0.36, () => {
      stick = CHK.red;
      cav?.setChalk(CHK.red);
      fx.dust(ctx.cx, ctx.cy - 8, 5, 18, 420, CHK.red);
      tick(ctx, ctx.cx, ctx.cy - 46, '🛡️ EXPLOSIVE', CHK.red);
    });
    ctx.at(200 + drawMs * 0.68, () => {
      stick = CHK.blue;
      cav?.setChalk(CHK.blue);
      fx.dust(ctx.cx, ctx.cy - 8, 5, 18, 420, CHK.blue);
      tick(ctx, ctx.cx, ctx.cy - 46, '🛡️ PERMA', CHK.blue);
    });
  }

  const run: CMark[] = [];
  pen(ctx, marks, {
    startMs: 200, endMs: 200 + drawMs, color: CHK.white,
    // A sweep around the artist, pinned inside the ring exactly as the kit pins the cursor.
    path: (t) => {
      const a = -Math.PI * 0.9 + t * Math.PI * 1.8;
      const d = SHIELD_RANGE * (0.72 + Math.sin(t * 7) * 0.2);
      return { x: ctx.cx + Math.cos(a) * d, y: ctx.cy + Math.sin(a) * d };
    },
    onMark: (m) => { m.color = stick; run.push(m); if (m.linked) fx.lay(m.px, m.py, m.x, m.y, stick); },
  });

  const nodes: Node[] = [];
  const shield = { hp: 0, max: SHIELD_HP, spin: 0, boom: 0 };
  const air = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
  ctx.onFrame((dt, elapsed) => {
    air.clear();
    if (!nodes.length) return;
    shield.spin += (dt / 1000) * SHIELD_SPIN;
    const ratio = Phaser.Math.Clamp(shield.hp / shield.max, 0, 1);
    let prevX = 0;
    let prevY = 0;
    nodes.forEach((n, i) => {
      const a = n.ang + shield.spin;
      const wob = 1 + Math.sin(elapsed / 1000 * 3 + n.seed) * 0.03;
      const nx = ctx.cx + Math.cos(a) * n.dist * wob;
      const ny = ctx.cy + Math.sin(a) * n.dist * wob;
      if (i > 0 && Phaser.Math.Distance.Between(prevX, prevY, nx, ny) < 74) {
        chalkLine(air, ctx.tint, prevX, prevY, nx, ny, 3, n.color, 0.45 + ratio * 0.45, n.seed);
      }
      chalkBlob(air, ctx.tint, nx, ny, 3.4, n.color, 0.55 + ratio * 0.45, n.seed);
      prevX = nx;
      prevY = ny;
    });
  });

  /** Shed nodes in proportion to the pool, so a shield at 20% actually looks like one. */
  const chip = (): void => {
    const want = Math.max(1, Math.round((nodes.length * Math.max(0, shield.hp)) / shield.max));
    while (nodes.length > want) {
      const i = Math.floor(Math.random() * nodes.length);
      const [n] = nodes.splice(i, 1);
      const a = n.ang + shield.spin;
      fx.snap(ctx.cx + Math.cos(a) * n.dist, ctx.cy + Math.sin(a) * n.dist, CHK.white);
    }
  };

  ctx.at(200 + drawMs, () => {
    cav?.setDrawing(false);
    // The window closing is what builds the shield: the run comes off the floor.
    for (const m of run) {
      nodes.push({
        ang: Math.atan2(m.y - ctx.cy, m.x - ctx.cx),
        dist: Phaser.Math.Clamp(Phaser.Math.Distance.Between(ctx.cx, ctx.cy, m.x, m.y), SHIELD_MIN_DIST, SHIELD_RANGE),
        seed: m.seed,
        color: m.color,
      });
      const idx = marks.indexOf(m);
      if (idx >= 0) marks.splice(idx, 1);
    }
    const permaFrac = nodes.filter((n) => n.color === CHK.blue).length / Math.max(1, nodes.length);
    shield.boom = nodes.filter((n) => n.color === CHK.red).length / Math.max(1, nodes.length);
    shield.max = Math.round(SHIELD_HP * (1 + (opts.supreme ? permaFrac : 0) * 1.5));
    shield.hp = shield.max;
    fx.ring(ctx.cx, ctx.cy, SHIELD_RANGE, SHIELD_RANGE * 0.72, CHK.white, 380);
    tick(ctx, ctx.cx, ctx.cy - 46, `🛡️ SHIELD ${shield.max}`, CHK.white);
    if (shield.boom > 0) tick(ctx, ctx.cx, ctx.cy - 64, '💥 ARMED', CHK.red);
  });

  const payback = (): void => {
    if (shield.boom <= 0) return;
    const dmg = Math.max(1, Math.round(SUPREME_BOOM_DAMAGE * shield.boom));
    fx.boom(foe.x, foe.y, BOOM_RADIUS * 0.8, CHK.red, 360);
    tick(ctx, foe.x, foe.y - 54, `💥 PAYBACK ${dmg}`, CHK.red);
  };

  // Shots dying on it, at 8 off the pool each.
  for (let i = 0; i < 4; i++) {
    ctx.at(200 + drawMs + 500 + i * 620, () => {
      if (!nodes.length) return;
      const n = nodes[Math.floor(nodes.length / 2)];
      const a = n.ang + shield.spin;
      const nx = ctx.cx + Math.cos(a) * n.dist;
      const ny = ctx.cy + Math.sin(a) * n.dist;
      fx.snap(nx, ny, n.color);
      shield.hp -= SHIELD_PROJ_COST;
      payback();
      chip();
      tick(ctx, ctx.cx, ctx.cy - 52, `🛡️ ${Math.max(0, Math.round(shield.hp))}`, CHK.white);
    });
  }
  // …and a body leaning on it, at 12 a second.
  ctx.at(200 + drawMs + 3200, () => {
    let acc = 0;
    ctx.onFrame((dt) => {
      if (!nodes.length) return;
      const reach = nodes.reduce((m, n) => Math.max(m, n.dist), 0) + SHIELD_PUSH_PAD;
      foe.x = Math.max(ctx.cx + reach, foe.x - 90 * (dt / 1000));
      if (foe.x > ctx.cx + reach + 1) return;
      acc += SHIELD_PUSH_DPS * (dt / 1000);
      const whole = Math.floor(acc);
      if (whole <= 0) return;
      acc -= whole;
      shield.hp -= whole;
      chip();
      if (shield.hp <= 0 && nodes.length) {
        nodes.length = 0;
        tick(ctx, ctx.cx, ctx.cy - 48, '🛡️ SHIELD BROKEN', CHK.whiteDim);
      }
    });
  });
  label(ctx, ctx.cx, ctx.h - 12, `${SHIELD_NODE_R}px nodes · shots 8 · leaning 12/s`, CHK.whiteDim);
}

export const shield: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  caption: 'F — draw inside the ring for 1s and it lifts off the floor: 125 HP that stops shots, hits and bodies',
  run(ctx) { shieldLoop(ctx, { supreme: false }); },
};

export const shieldUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Supreme Shield — 2.5s and three sticks: blue raises the pool to ×2.5, red pays 14 back per hit taken',
  run(ctx) { shieldLoop(ctx, { supreme: true }); },
};

// ── Q — Masterpiece ───────────────────────────────────────────────────

function masterpieceLoop(ctx: PreviewCtx, opts: { prodigy: boolean }): void {
  const { fx, av, cav } = stage(ctx, { noDummy: true });
  const foe = { x: ctx.w * 0.72, y: ctx.h * 0.36 };
  dummyAt(ctx, foe);

  const marks: CMark[] = [];
  floor(ctx, marks);

  ctx.at(200, () => {
    av.play('raise');
    cav?.setChalk(CHK.green);
    cav?.setDrawing(true);
    av.setIntensity(1.35);
    fx.ring(ctx.cx, ctx.cy, 14, 96, CHK.green, 520);
    fx.ring(ctx.cx, ctx.cy, 14, 120, CHK.orange, 620);
    fx.ring(ctx.cx, ctx.cy, 14, 144, CHK.teal, 720);
    tick(ctx, ctx.cx, ctx.cy - 50, '🎨 MASTERPIECE', CHK.teal);
    tick(ctx, ctx.cx, ctx.cy - 68, '✨ INVINCIBLE 8s', CHK.spark);
  });

  const palette = opts.prodigy
    ? [CHK.green, CHK.orange, CHK.teal, CHK.crimson]
    : [CHK.green, CHK.orange, CHK.teal];
  const names = opts.prodigy
    ? ['GREEN — HEAL', 'ORANGE — BURN', 'TEAL — SPEED', 'CRIMSON — POWER']
    : ['GREEN — HEAL', 'ORANGE — BURN', 'TEAL — SPEED'];
  const tally = palette.map(() => 0);
  let stick = 0;

  const slice = MP_MS / palette.length;
  palette.forEach((color, i) => {
    if (i === 0) return;
    ctx.at(200 + i * slice, () => {
      stick = i;
      cav?.setChalk(color);
      fx.dust(ctx.cx, ctx.cy - 8, 5, 18, 420, color);
      tick(ctx, ctx.cx, ctx.cy - 46, `🖍️ ${names[i]}`, color);
    });
  });

  // Chalk only flows while the button is held — the kit's own reason the work is not a slab.
  pen(ctx, marks, {
    startMs: 200, endMs: 200 + MP_MS, step: STEP_MP, color: CHK.green,
    path: (t) => {
      const a = t * Math.PI * 7.5;
      const d = 34 + Math.sin(t * 12) * 26;
      const cx = stick === 1 ? foe.x : ctx.cx + 40;
      const cy = stick === 1 ? foe.y : ctx.cy;
      return { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * 0.7 };
    },
    onMark: (m) => {
      m.color = palette[stick];
      tally[stick]++;
      if (m.linked) fx.lay(m.px, m.py, m.x, m.y, m.color);
    },
  });

  // What the colours do to whoever is standing on them.
  let heal = 0;
  let burn = 0;
  ctx.onFrame((dt, elapsed) => {
    if (elapsed < 200 || elapsed > 200 + MP_MS) return;
    const onGreen = marks.some((m) => m.color === CHK.green
      && Phaser.Math.Distance.Between(m.x, m.y, ctx.cx, ctx.cy) <= MP_TOUCH_R);
    const onOrange = marks.some((m) => m.color === CHK.orange
      && Phaser.Math.Distance.Between(m.x, m.y, foe.x, foe.y) <= MP_TOUCH_R);
    if (onGreen) {
      heal += MP_HEAL_DPS * (dt / 1000);
      if (heal >= 1) { heal -= 1; if (Math.random() < 0.3) tick(ctx, ctx.cx, ctx.cy - 24, '+1', CHK.green); }
    }
    if (onOrange) {
      burn += MP_DAMAGE_DPS * (dt / 1000);
      if (burn >= 1) { burn -= 1; if (Math.random() < 0.3) tick(ctx, foe.x, foe.y - 24, '1', CHK.orange); }
    }
  });
  ctx.at(200 + slice * 2 + 400, () => tick(ctx, ctx.cx, ctx.cy - 34, `🏃 ×${MP_SPEED_MULT}`, CHK.teal));
  if (opts.prodigy) {
    ctx.at(200 + slice * 3 + 400, () => tick(ctx, ctx.cx, ctx.cy - 34, '🖍️ CHALK ×1.5', CHK.crimson));
  }

  ctx.at(200 + MP_MS, () => {
    cav?.setDrawing(false);
    av.setIntensity(1);
    fx.dust(ctx.cx, ctx.cy, 10, 40, 620, CHK.dust);
    tick(ctx, ctx.cx, ctx.cy - 48, '🖼️ FINISHED', CHK.teal);
    if (!opts.prodigy) return;
    // Prodigy reads the finished work by counting what went into it, mark for mark.
    let best = 0;
    tally.forEach((n, i) => { if (n > tally[best]) best = i; });
    fx.ring(ctx.cx, ctx.cy, 14, 90, palette[best], 620);
    tick(ctx, ctx.cx, ctx.cy - 66, `🔵 PERMA: ${names[best]}`, palette[best]);
  });
  label(ctx, ctx.cx, ctx.h - 12, 'the work stays on the floor for 30s', CHK.whiteDim);
}

export const masterpiece: PreviewScript = {
  duration: 9200,
  scale: 0.9,
  caption: 'Q — 8s invincible, drawing while you hold the mouse: green heals 9/s, orange burns 18/s, teal is ×1.45 speed',
  run(ctx) { masterpieceLoop(ctx, { prodigy: false }); },
};

export const masterpieceUpgraded: PreviewScript = {
  duration: 9600,
  scale: 0.9,
  caption: 'Prodigy — crimson makes your chalk ×1.5, and whichever colour you used most is loaded onto the blue line',
  run(ctx) { masterpieceLoop(ctx, { prodigy: true }); },
};

// ── Passives ──────────────────────────────────────────────────────────

export const theDrawingWindow: PreviewScript = {
  duration: 5600,
  scale: 0.9,
  caption: 'A mark every 12px of cursor travel — and lifting the pen more than 96px starts a fresh run',
  run(ctx) {
    const { fx, av, cav } = stage(ctx, { noDummy: true });
    const marks: CMark[] = [];
    floor(ctx, marks);

    ctx.at(200, () => { av.play('punch'); cav?.setChalk(CHK.white); cav?.setDrawing(true); });
    // One continuous sweep, then a jump wider than the lift threshold, then another sweep —
    // the break in the line is the whole point of the loop.
    pen(ctx, marks, {
      startMs: 200, endMs: 4600, color: CHK.white,
      path: (t) => {
        if (t < 0.45) {
          return { x: ctx.w * 0.3 + t * ctx.w * 0.6, y: ctx.cy - 34 + Math.sin(t * 14) * 22 };
        }
        if (t < 0.5) return { x: ctx.w * 0.3 + 0.45 * ctx.w * 0.6, y: ctx.cy - 34 };
        return { x: ctx.w * 0.34 + (t - 0.5) * ctx.w * 0.9, y: ctx.cy + 36 + Math.sin(t * 14) * 18 };
      },
      onMark: (m) => { if (m.linked) fx.lay(m.px, m.py, m.x, m.y, CHK.white); },
    });
    ctx.at(2400, () => tick(ctx, ctx.w * 0.6, ctx.cy, '✋ PEN LIFTED', CHK.whiteDim));
    ctx.at(4600, () => cav?.setDrawing(false));
    label(ctx, ctx.cx, ctx.h - 12, 'one hand, one stick — a live window swallows every other key', CHK.whiteDim);
  },
};

export const standingOnIt: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'Burn rates are a maximum, never a sum — a dense scribble is a wider trap, not a hotter one',
  run(ctx) {
    stage(ctx, { noDummy: true });
    const thinAt = { x: ctx.w * 0.42, y: ctx.cy };
    const denseAt = { x: ctx.w * 0.76, y: ctx.cy };
    dummyAt(ctx, thinAt);
    dummyAt(ctx, denseAt);

    const marks: CMark[] = [];
    floor(ctx, marks);
    // One stroke under the left body, twenty overlapping ones under the right.
    let lx = thinAt.x - 30;
    for (let i = 0; i < 6; i++) {
      const x = thinAt.x - 30 + i * 12;
      marks.push({ x, y: thinAt.y + 12, px: lx, py: thinAt.y + 12, linked: i > 0, seed: i * 13, color: CHK.blue });
      lx = x;
    }
    let dx = denseAt.x - 30;
    let dy = denseAt.y;
    for (let i = 0; i < 46; i++) {
      const x = denseAt.x + Math.cos(i * 1.1) * 22;
      const y = denseAt.y + 12 + Math.sin(i * 1.7) * 14;
      marks.push({ x, y, px: dx, py: dy, linked: i > 0, seed: i * 7, color: CHK.blue });
      dx = x;
      dy = y;
    }
    label(ctx, thinAt.x, thinAt.y + 40, 'one stroke\n30/s', CHK.blue);
    label(ctx, denseAt.x, denseAt.y + 40, '46 overlapping marks\nstill 30/s', CHK.blue);

    let a = 0;
    let b = 0;
    ctx.onFrame((dt) => {
      a += PERMA_DPS * (dt / 1000);
      b += PERMA_DPS * (dt / 1000);
      if (a >= 15) { a -= 15; tick(ctx, thinAt.x, thinAt.y - 26, '15', CHK.blue); }
      if (b >= 15) { b -= 15; tick(ctx, denseAt.x, denseAt.y - 26, '15', CHK.blue); }
    });
  },
};
