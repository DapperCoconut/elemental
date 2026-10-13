import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  CLAY, ClayAvatar, ClayFx, clayShard, drawClayBar, drawClayPuddle, drawClayRope, drawCreature, drawGolem, drawGuide,
  drawTether, drawWallSmear,
} from '../../../elements/kits/ClayVisuals';

/**
 * Clay puts no sprite in the world — the golem, the shards, the ropes and the creature are
 * records the kit paints every frame — so every loop keeps the same records and paints them
 * with the kit's own painters. The golem stands where the kit would put it: on the cursor,
 * which in the box means between caster and target.
 */

interface Stage { fx: ClayFx; av: BaseAvatar; ground: Phaser.GameObjects.Graphics; golemG: Phaser.GameObjects.Graphics; air: Phaser.GameObjects.Graphics; hud: Phaser.GameObjects.Graphics }

function stage(ctx: PreviewCtx): Stage {
  const fx = ctx.capture(() => new ClayFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new ClayAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  ctx.addDummy();
  const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  const golemG = ctx.adopt(ctx.scene.add.graphics().setDepth(4.6));
  const air = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
  const hud = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
  return { fx, av, ground, golemG, air, hud };
}

interface Shard { x: number; y: number; a: number; live: boolean }

function radial(x: number, y: number, count: number, offset: number): Shard[] {
  return Array.from({ length: count }, (_, i) => ({ x, y, a: offset + (i / count) * Math.PI * 2, live: true }));
}

function stepShards(shards: Shard[], dt: number, ctx: PreviewCtx, onHit: (s: Shard) => void): void {
  for (const s of shards) {
    if (!s.live) continue;
    s.x += Math.cos(s.a) * 475 * dt; s.y += Math.sin(s.a) * 475 * dt;
    if (Phaser.Math.Distance.Between(s.x, s.y, ctx.tx, ctx.ty) <= 33 && !(s as Shard & { hit?: boolean }).hit) { (s as Shard & { hit?: boolean }).hit = true; onHit(s); }
    if (s.x < -30 || s.x > ctx.w + 30 || s.y < -30 || s.y > ctx.h + 30) s.live = false;
  }
}

function tick(ctx: PreviewCtx, text: string, color: string, dy = -44, x = ctx.tx, y = ctx.ty): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y + dy, text, {
    fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color, stroke: '#1a0e08', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(16));
  ctx.scene.tweens.add({ targets: t, y: t.y - 22, alpha: 0, duration: 900, onComplete: () => t.destroy() });
}

/** The golem between caster and target, drawn with its tether every frame; returns its position. */
function golemAt(ctx: PreviewCtx, st: Stage, dx = 150): { x: number; y: number } {
  const g = { x: ctx.cx + dx, y: ctx.cy + 6 };
  ctx.onFrame((_dt, elapsed) => {
    st.golemG.clear();
    drawTether(st.ground, ctx.tint, ctx.cx, ctx.cy + 6, g.x, g.y + 20, elapsed / 1000);
    drawGolem(st.golemG, ctx.tint, g.x, g.y, elapsed / 1000, 5, 1, false);
  });
  return g;
}

export const slam: PreviewScript = {
  duration: 3000,
  caption: 'Click — the golem slams where it stands: 20 in 118px and a shove',
  run(ctx) {
    const st = stage(ctx);
    const g = golemAt(ctx, st, 230);
    ctx.at(600, () => { st.av.play('slam', ctx.aim); st.fx.slamShock(g.x, g.y, 118); tick(ctx, '20', '#f3d7ae'); });
    ctx.at(1800, () => { st.av.play('slam', ctx.aim); st.fx.slamShock(g.x, g.y, 118); tick(ctx, '20', '#f3d7ae'); });
  },
};

export const slamUpgraded: PreviewScript = {
  duration: 3200,
  caption: 'Shard Smash — every slam throws three piercing shards out of its impact',
  run(ctx) {
    const st = stage(ctx);
    const g = golemAt(ctx, st, 230);
    let shards: Shard[] = [];
    ctx.at(600, () => { st.av.play('slam', ctx.aim); st.fx.slamShock(g.x, g.y, 118); shards = radial(g.x, g.y, 3, 0.3); tick(ctx, '20', '#f3d7ae'); });
    ctx.onFrame((dt) => {
      st.air.clear();
      stepShards(shards, dt / 1000, ctx, () => tick(ctx, '25', '#c38352', -58));
      for (const s of shards) if (s.live) clayShard(st.air, ctx.tint, s.x, s.y, s.a);
    });
  },
};

export const rupture: PreviewScript = {
  duration: 3400,
  caption: 'E — the golem bursts into 8 piercing shards at 25 and re-forms',
  run(ctx) {
    const st = stage(ctx);
    const g = { x: ctx.cx + 150, y: ctx.cy + 6 };
    let hidden = -1;
    let shards: Shard[] = [];
    ctx.at(600, () => { st.av.play('flex'); st.fx.burst(g.x, g.y, 80); shards = radial(g.x, g.y, 8, Math.PI / 8); hidden = 600; });
    ctx.onFrame((dt, elapsed) => {
      st.golemG.clear(); st.air.clear();
      drawTether(st.ground, ctx.tint, ctx.cx, ctx.cy + 6, g.x, g.y + 20, elapsed / 1000);
      if (hidden < 0 || elapsed > hidden + 420) drawGolem(st.golemG, ctx.tint, g.x, g.y, elapsed / 1000, 5, 1, false);
      stepShards(shards, dt / 1000, ctx, () => tick(ctx, '25', '#c38352'));
      for (const s of shards) if (s.live) clayShard(st.air, ctx.tint, s.x, s.y, s.a);
    });
  },
};

export const ruptureUpgraded: PreviewScript = {
  duration: 4200,
  caption: 'Fractal — three more shards circle the golem for 6s, each spent on its first hit',
  run(ctx) {
    const st = stage(ctx);
    const g = golemAt(ctx, st, 150);
    let orbit: Array<{ a: number; live: boolean }> = [];
    let shards: Shard[] = [];
    ctx.at(500, () => { st.av.play('flex'); st.fx.burst(g.x, g.y, 80); shards = radial(g.x, g.y, 8, Math.PI / 8); orbit = [0, 1, 2].map((i) => ({ a: (i / 3) * Math.PI * 2, live: true })); });
    ctx.onFrame((dt, elapsed) => {
      st.air.clear();
      stepShards(shards, dt / 1000, ctx, () => tick(ctx, '25', '#c38352'));
      for (const s of shards) if (s.live) clayShard(st.air, ctx.tint, s.x, s.y, s.a);
      for (const o of orbit) {
        if (!o.live) continue;
        o.a += (dt / 1000) * 3.1;
        const x = g.x + Math.cos(o.a) * 62, y = g.y + Math.sin(o.a) * 50;
        if (elapsed > 2600 && Phaser.Math.Distance.Between(x, y, ctx.tx, ctx.ty) <= 33) { o.live = false; tick(ctx, '25', '#c38352', -56); continue; }
        clayShard(st.air, ctx.tint, x, y, o.a + Math.PI / 2, 1, 0.9);
      }
    });
    // The target steps in and takes one of the circling shards.
    ctx.at(2600, () => { ctx.at(0, () => { void 0; }); });
  },
};

function arcNodes(cx: number, cy: number, r: number, from: number, to: number, n: number): Array<{ x: number; y: number }> {
  return Array.from({ length: n }, (_, i) => { const a = from + (i / (n - 1)) * (to - from); return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }; });
}

export const clot: PreviewScript = {
  duration: 5600,
  caption: 'R — drag clay inside the circle for 3s; your stroke orbits you and crumbles only where shots land',
  run(ctx) {
    const st = stage(ctx);
    golemAt(ctx, st, 190);
    let drawn: Array<{ x: number; y: number }> = [];
    let angle = 0;
    let set = -1;
    const shots: Array<{ x: number; y: number; live: boolean }> = [];
    ctx.at(400, () => { st.av.setHold('sow', ctx.aim); st.fx.guidePulse(ctx.cx, ctx.cy, 148); });
    ctx.at(3400, () => { st.av.setHold(null); set = 3400; tick(ctx, `CLAY SET · ${drawn.length}`, '#9fd0ff', -50, ctx.cx, ctx.cy); });
    ctx.at(4000, () => shots.push({ x: ctx.tx + 40, y: ctx.ty - 10, live: true }));
    ctx.at(4700, () => shots.push({ x: ctx.tx + 40, y: ctx.ty + 30, live: true }));
    ctx.onFrame((dt, elapsed) => {
      st.air.clear(); st.hud.clear();
      const t = elapsed / 1000;
      if (elapsed > 400 && set < 0) {
        // The stroke grows at the pace a hand drags it: an arc in front, then a hook back.
        const p = Phaser.Math.Clamp((elapsed - 400) / 2600, 0, 1);
        const n = Math.round(p * 30);
        drawn = arcNodes(ctx.cx, ctx.cy, 110, -1.1, 1.1, 30).slice(0, Math.max(1, n));
        drawGuide(st.air, ctx.tint, ctx.cx, ctx.cy, 148, t);
        drawClayBar(st.hud, ctx.tint, ctx.cx, ctx.cy - 60, 1 - p * 0.96);
      }
      if (set > 0) angle += 0.62 * (dt / 1000);
      const c = Math.cos(angle), s = Math.sin(angle);
      const world = drawn.map((p) => ({ x: ctx.cx + (p.x - ctx.cx) * c - (p.y - ctx.cy) * s, y: ctx.cy + (p.x - ctx.cx) * s + (p.y - ctx.cy) * c }));
      for (const sh of shots) {
        if (!sh.live) continue;
        sh.x -= 420 * (dt / 1000);
        const hit = world.findIndex((p) => Phaser.Math.Distance.Between(p.x, p.y, sh.x, sh.y) <= 13);
        if (hit >= 0) {
          const at = world[hit];
          sh.live = false;
          st.fx.splat(at.x, at.y);
          const keep = world.map((p) => Phaser.Math.Distance.Between(p.x, p.y, at.x, at.y) > 24);
          drawn = drawn.filter((_, i) => keep[i]);
          tick(ctx, 'STOPPED', '#9fd0ff', -30, at.x, at.y);
        } else if (sh.x < ctx.cx - 60) sh.live = false;
        else { st.air.fillStyle(0x3aa0e8, 1); st.air.fillCircle(sh.x, sh.y, 6); }
      }
      if (drawn.length) drawClayRope(st.air, ctx.tint, world, 11);
    });
  },
};

export const clotUpgraded: PreviewScript = {
  duration: 4600,
  caption: 'Protector — a second circle round the golem, and every stopped shot throws three shards back',
  run(ctx) {
    const st = stage(ctx);
    const g = golemAt(ctx, st, 190);
    const rope = arcNodes(g.x, g.y, 84, -1.2, 1.2, 26);
    let drawn: Array<{ x: number; y: number }> = [];
    let shards: Shard[] = [];
    const shots: Array<{ x: number; y: number; live: boolean }> = [];
    ctx.at(300, () => { st.av.setHold('sow', ctx.aim); st.fx.guidePulse(ctx.cx, ctx.cy, 148); st.fx.guidePulse(g.x, g.y, 148); });
    ctx.at(2200, () => { st.av.setHold(null); tick(ctx, 'CLAY SET', '#9fd0ff', -50, g.x, g.y); });
    ctx.at(2800, () => shots.push({ x: ctx.tx + 30, y: ctx.ty, live: true }));
    ctx.onFrame((dt, elapsed) => {
      st.air.clear();
      const t = elapsed / 1000;
      if (elapsed > 300 && elapsed < 2200) {
        drawn = rope.slice(0, Math.max(1, Math.round(((elapsed - 300) / 1900) * rope.length)));
        drawGuide(st.air, ctx.tint, ctx.cx, ctx.cy, 148, t);
        drawGuide(st.air, ctx.tint, g.x, g.y, 148, t);
      }
      for (const sh of shots) {
        if (!sh.live) continue;
        sh.x -= 420 * (dt / 1000);
        const hit = drawn.findIndex((p) => Phaser.Math.Distance.Between(p.x, p.y, sh.x, sh.y) <= 13);
        if (hit >= 0) {
          const at = drawn[hit];
          sh.live = false;
          st.fx.splat(at.x, at.y);
          drawn = drawn.filter((p) => Phaser.Math.Distance.Between(p.x, p.y, at.x, at.y) > 24);
          shards = radial(at.x, at.y, 3, 0.2);
          tick(ctx, '3 SHARDS BACK', '#c38352', -30, at.x, at.y);
        } else { st.air.fillStyle(0x3aa0e8, 1); st.air.fillCircle(sh.x, sh.y, 6); }
      }
      stepShards(shards, dt / 1000, ctx, () => tick(ctx, '25', '#c38352'));
      for (const s of shards) if (s.live) clayShard(st.air, ctx.tint, s.x, s.y, s.a);
      if (drawn.length) drawClayRope(st.air, ctx.tint, drawn, 11);
    });
  },
};

export const slink: PreviewScript = {
  duration: 5200,
  scale: 0.8,
  bodyTexture: '',
  caption: 'F — thrown to the nearest wall; run the rim at 650px/s and Click three eight-shard barrages',
  run(ctx) {
    const st = stage(ctx);
    const wallY = 24;
    let onWall = false;
    let shards: Shard[] = [];
    const pos = { x: ctx.cx, y: ctx.cy };
    ctx.moveCaster(ctx.cx, ctx.cy);
    ctx.at(400, () => { st.av.play('dash', -Math.PI / 2); ctx.glideCaster({ to: { x: ctx.cx, y: wallY }, ms: 330, ease: 'in', onDone: () => { onWall = true; st.fx.wallSplat(ctx.cx, wallY, 0); ctx.moveCaster(ctx.cx, wallY, { alpha: 0 }); } }); });
    for (let i = 0; i < 3; i++) {
      ctx.at(1300 + i * 900, () => {
        const base = Math.atan2(ctx.ty - pos.y, ctx.tx - pos.x);
        shards = shards.concat(Array.from({ length: 8 }, (_, k) => ({ x: pos.x, y: pos.y, a: base + (k - 3.5) * 0.065, live: true })));
        st.fx.clods(pos.x, pos.y, 5, 120, 380);
        tick(ctx, `${2 - i} BARRAGES LEFT`, '#c38352', 26, pos.x, pos.y);
      });
    }
    ctx.at(4300, () => { onWall = false; ctx.moveCaster(pos.x, wallY + 40, { alpha: 1 }); st.fx.clods(pos.x, wallY, 6, 120, 400); });
    ctx.onFrame((dt, elapsed) => {
      st.air.clear();
      if (onWall) {
        pos.x = Phaser.Math.Clamp(ctx.cx + Math.sin((elapsed - 730) / 900) * 120, 40, ctx.w - 40);
        pos.y = wallY;
        drawWallSmear(st.air, ctx.tint, pos.x, pos.y, Math.cos((elapsed - 730) / 900) > 0 ? 0 : Math.PI, elapsed / 1000);
        ctx.moveCaster(pos.x, pos.y, { alpha: 0 });
      }
      stepShards(shards, dt / 1000, ctx, () => tick(ctx, '25', '#c38352'));
      for (const s of shards) if (s.live) clayShard(st.air, ctx.tint, s.x, s.y, s.a);
    });
  },
};

export const slinkUpgraded: PreviewScript = {
  duration: 4200,
  caption: 'Slipstream — Space banks three dashes that refill one at a time',
  run(ctx) {
    const st = stage(ctx);
    golemAt(ctx, st, 190);
    let charges = 3;
    const spend = (dx: number) => { if (charges <= 0) return; charges--; const at = ctx.casterAt(); st.av.play('dash', dx > 0 ? 0 : Math.PI); ctx.glideCaster({ to: { x: at.x + dx, y: at.y }, ms: 220, ease: 'out' }); st.fx.clods(at.x, at.y, 4, 90, 300); };
    ctx.at(500, () => spend(-70));
    ctx.at(900, () => spend(70));
    ctx.at(1300, () => spend(-70));
    ctx.at(2300, () => { charges = 1; });
    ctx.at(3300, () => { charges = 2; });
    ctx.onFrame(() => {
      st.hud.clear();
      const at = ctx.casterAt();
      for (let i = 0; i < 3; i++) {
        st.hud.fillStyle(ctx.tint(i < charges ? CLAY.guideLit : CLAY.wet), i < charges ? 1 : 0.55);
        st.hud.fillTriangle(at.x - 20 + i * 20, at.y - 62, at.x - 13 + i * 20, at.y - 72, at.x - 6 + i * 20, at.y - 62);
      }
    });
  },
};

export const fuse: PreviewScript = {
  duration: 6200,
  caption: 'Q — the golem rushes in: 8 hits of any size, no effects, faster; F dashes through slip; Q again splits',
  run(ctx) {
    const st = stage(ctx);
    const g = { x: ctx.cx + 170, y: ctx.cy + 6 };
    const cav = st.av instanceof ClayAvatar ? st.av : null;
    let fusing = -1, fused = -1, split = -1;
    let hits = 8;
    const puddles: Array<{ x: number; y: number; seed: number; at: number }> = [];
    let shards: Shard[] = [];
    ctx.at(400, () => { fusing = 400; st.av.play('raise', undefined, 900); });
    ctx.at(1100, () => { fused = 1100; st.fx.merge(ctx.cx, ctx.cy); cav?.setFused(true, 8, 8); tick(ctx, '🗿 FUSED · 8 LAYERS', '#f3d7ae', -58, ctx.cx, ctx.cy); });
    for (let i = 0; i < 3; i++) ctx.at(1700 + i * 400, () => { hits--; cav?.setFused(true, hits, 8); st.fx.clods(ctx.cx, ctx.cy, 5, 120, 420); tick(ctx, `${hits} LAYERS`, '#c38352', -50, ctx.cx, ctx.cy); });
    ctx.at(3200, () => {
      st.av.play('dash', ctx.aim);
      const from = ctx.casterAt();
      ctx.glideCaster({ to: { x: ctx.tx - 60, y: ctx.ty }, ms: 260, ease: 'out', onDone: () => { st.fx.slamShock(ctx.tx - 60, ctx.ty, 118); tick(ctx, '20', '#f3d7ae'); } });
      for (let i = 0; i < 4; i++) puddles.push({ x: Phaser.Math.Linear(from.x, ctx.tx - 60, i / 3), y: ctx.ty + 10, seed: i * 3, at: 3200 + i * 60 });
    });
    ctx.at(4600, () => { split = 4600; cav?.setFused(false); shards = radial(ctx.tx - 60, ctx.ty, hits * 6, 0.1); st.fx.burst(ctx.tx - 60, ctx.ty, 82); st.av.play('clap'); tick(ctx, `SPLIT · ${hits * 6} SHARDS`, '#f3d7ae', -58, ctx.tx - 60, ctx.ty); });
    ctx.onFrame((dt, elapsed) => {
      st.golemG.clear(); st.air.clear(); st.ground.clear();
      const t = elapsed / 1000;
      for (const p of puddles) if (elapsed > p.at) drawClayPuddle(st.ground, ctx.tint, p.x, p.y, 44, t, 1, p.seed);
      if (fused < 0) {
        if (fusing > 0) { const p = Phaser.Math.Clamp((elapsed - fusing) / 700, 0, 1); g.x = Phaser.Math.Linear(ctx.cx + 170, ctx.cx + 20, p); }
        drawTether(st.ground, ctx.tint, ctx.cx, ctx.cy + 6, g.x, g.y + 20, t);
        drawGolem(st.golemG, ctx.tint, g.x, g.y, t, 5, 1, false, fusing > 0 ? 'rush' : 'idle');
      } else if (split > 0) {
        const at = ctx.casterAt();
        drawTether(st.ground, ctx.tint, at.x, at.y + 6, at.x + 52, at.y + 20, t);
        drawGolem(st.golemG, ctx.tint, at.x + 52, at.y, t, 5, 1, false);
      }
      stepShards(shards, dt / 1000, ctx, () => tick(ctx, '25', '#c38352'));
      for (const s of shards) if (s.live) clayShard(st.air, ctx.tint, s.x, s.y, s.a);
    });
  },
};

export const fuseUpgraded: PreviewScript = {
  duration: 4600,
  caption: 'Frenzy — every layer lost makes the fused body 8% smaller and 8% faster',
  run(ctx) {
    const st = stage(ctx);
    const cav = st.av instanceof ClayAvatar ? st.av : null;
    let hits = 8;
    ctx.at(300, () => { st.fx.merge(ctx.cx, ctx.cy); cav?.setFused(true, 8, 8); st.av.setRigScale(1.42); });
    for (let i = 0; i < 5; i++) {
      ctx.at(1000 + i * 600, () => {
        hits--;
        cav?.setFused(true, hits, 8);
        st.av.setRigScale(1.42 * Math.pow(0.92, 8 - hits));
        st.fx.clods(ctx.cx, ctx.cy, 5, 120, 420);
        tick(ctx, `${hits} LAYERS · +${(8 - hits) * 8}% SPEED`, '#c38352', -58, ctx.cx, ctx.cy);
      });
    }
    // Laps of the box, quicker with every layer lost.
    ctx.onFrame((_dt, elapsed) => {
      const speed = 1 + (8 - hits) * 0.08;
      const x = ctx.cx + Math.sin(elapsed / 900 * speed) * 70;
      ctx.moveCaster(x, ctx.cy);
    });
  },
};

export const gooeyGolem: PreviewScript = {
  duration: 4200,
  caption: 'Gooey Golem — it walks to the cursor, swallows every shot that touches it, and cannot be hurt',
  run(ctx) {
    const st = stage(ctx);
    const g = { x: ctx.cx + 120, y: ctx.cy + 6 };
    const shots: Array<{ x: number; y: number; live: boolean }> = [];
    for (let i = 0; i < 4; i++) ctx.at(900 + i * 700, () => shots.push({ x: ctx.tx - 30, y: ctx.ty - 12 + i * 8, live: true }));
    ctx.onFrame((dt, elapsed) => {
      st.golemG.clear(); st.air.clear(); st.ground.clear();
      const t = elapsed / 1000;
      // The cursor wanders; the golem follows it with the kit's easing.
      const wantX = ctx.cx + 120 + Math.sin(t * 0.8) * 60, wantY = ctx.cy + 6 + Math.cos(t * 0.6) * 20;
      const dx = wantX - g.x, dy = wantY - g.y, d = Math.hypot(dx, dy);
      if (d > 1) { const step = Math.min(d, 285 * dt / 1000, d * 9 * dt / 1000); g.x += dx / d * step; g.y += dy / d * step; }
      drawTether(st.ground, ctx.tint, ctx.cx, ctx.cy + 6, g.x, g.y + 20, t);
      drawGolem(st.golemG, ctx.tint, g.x, g.y, t, 5, 1, false);
      for (const sh of shots) {
        if (!sh.live) continue;
        sh.x -= 420 * (dt / 1000);
        if (Phaser.Math.Distance.Between(sh.x, sh.y, g.x, g.y) <= 35) { sh.live = false; st.fx.splat(sh.x, sh.y); tick(ctx, 'SWALLOWED', '#c38352', -46, g.x, g.y); }
        else { st.air.fillStyle(0x3aa0e8, 1); st.air.fillCircle(sh.x, sh.y, 6); }
      }
    });
  },
};

export const bedrock: PreviewScript = {
  duration: 5000,
  caption: 'Bedrock — 20% less damage within 175px of the stone golem; fused, Space is a stunning crash',
  run(ctx) {
    const st = stage(ctx);
    const cav = st.av instanceof ClayAvatar ? st.av : null;
    const g = { x: ctx.cx + 100, y: ctx.cy + 6 };
    let fused = -1, leap = -1;
    ctx.at(900, () => tick(ctx, '−20% DAMAGE TAKEN', '#b8aa98', -50, ctx.cx, ctx.cy));
    ctx.at(1800, () => { fused = 1800; st.fx.merge(ctx.cx, ctx.cy); cav?.setFused(true, 8, 8); });
    ctx.at(2800, () => {
      leap = 2800;
      st.av.play('raise', undefined, 620);
      st.fx.clods(ctx.cx, ctx.cy, 8, 140, 420, 14, true);
      ctx.glideCaster({ to: { x: ctx.tx - 50, y: ctx.ty }, ms: 620, ease: 'in', onDone: () => { st.fx.slamShock(ctx.tx - 50, ctx.ty, 150, 13, true); tick(ctx, '20 · STUNNED 2s', '#9fd0ff'); st.av.play('slam'); } });
    });
    ctx.onFrame((_dt, elapsed) => {
      st.golemG.clear(); st.ground.clear();
      const t = elapsed / 1000;
      if (fused < 0) {
        drawTether(st.ground, ctx.tint, ctx.cx, ctx.cy + 6, g.x, g.y + 20, t);
        st.ground.lineStyle(1.5, ctx.tint(CLAY.seam), 0.3 + Math.sin(t * 2) * 0.08);
        st.ground.strokeCircle(g.x, g.y, 175);
        drawGolem(st.golemG, ctx.tint, g.x, g.y, t, 5, 1, true);
      } else if (leap > 0 && elapsed < leap + 620) {
        const p = (elapsed - leap) / 620;
        const at = ctx.casterAt();
        drawGolem(st.golemG, ctx.tint, at.x, at.y - Math.sin(p * Math.PI) * 48, t, 7, 0.9, true, 'rush');
      }
    });
  },
};

export const giveLife: PreviewScript = {
  duration: 6000,
  caption: 'Give Life — draw in the circle ahead; sharp corners bite harder, a round loop runs faster',
  run(ctx) {
    const st = stage(ctx);
    golemAt(ctx, st, -90);
    const cx = ctx.cx + 112, cy = ctx.cy;
    const star = Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; const r = i % 4 === 0 ? 60 : 34; return { x: Math.cos(a) * r, y: Math.sin(a) * r }; });
    let drawn: Array<{ x: number; y: number }> = [];
    let alive = -1;
    const c = { x: cx, y: cy, angle: 0 };
    ctx.at(300, () => { st.av.setHold('sow', ctx.aim); st.fx.guidePulse(cx, cy, 82); });
    ctx.at(3300, () => { st.av.setHold(null); alive = 3300; st.fx.wake(cx, cy); tick(ctx, 'ALIVE · 22 DMG · 140px/s', '#9fd0ff', -50, cx, cy); });
    ctx.onFrame((dt, elapsed) => {
      st.air.clear(); st.hud.clear();
      const t = elapsed / 1000;
      if (elapsed > 300 && alive < 0) {
        const p = Phaser.Math.Clamp((elapsed - 300) / 2800, 0, 1);
        drawn = star.slice(0, Math.max(1, Math.round(p * star.length)));
        drawGuide(st.air, ctx.tint, cx, cy, 82, t);
        drawClayRope(st.air, ctx.tint, drawn.map((n) => ({ x: cx + n.x, y: cy + n.y })), 11);
        drawClayBar(st.hud, ctx.tint, ctx.cx, ctx.cy - 76, 1 - p * 0.95);
        return;
      }
      if (alive > 0) {
        const d = Phaser.Math.Distance.Between(c.x, c.y, ctx.tx, ctx.ty);
        c.angle = Math.atan2(ctx.ty - c.y, ctx.tx - c.x);
        if (d > 60) { c.x += Math.cos(c.angle) * 140 * dt / 1000; c.y += Math.sin(c.angle) * 140 * dt / 1000; }
        else if (Math.floor(elapsed / 700) !== Math.floor((elapsed - dt) / 700)) { st.fx.clods(ctx.tx, ctx.ty, 3, 80, 300); tick(ctx, '22', '#c38352'); }
        drawCreature(st.air, ctx.tint, c.x, c.y, c.angle, star, t, 1, false);
      }
    });
  },
};
