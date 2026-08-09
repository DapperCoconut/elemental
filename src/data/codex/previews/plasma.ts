import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import { PLASMA, PlasmaAura, PlasmaAvatar, PlasmaFx } from '../../../elements/kits/PlasmaVisuals';

/**
 * Plasma's showcases.
 *
 * Nothing this element makes is a sprite — seekers, blades, zones, currents, volts and the
 * orbital are all `PlasmaFx` statics repainted every frame from live state, so these loops keep
 * their own arrays and call the same painters `PlasmaKit.paintWorld` calls. `bolt`, `discharge`,
 * `boom` and `charge` are the kit's own one-shots.
 *
 * Containment: anything built inside `ctx.at` / `ctx.onFrame` goes through `ctx.capture` /
 * `ctx.adopt`; `PlasmaFx` instances carry a sticky sink and need no help.
 */

// ── Staging ───────────────────────────────────────────────────────────

function stage(ctx: PreviewCtx, opts?: { noDummy?: boolean }): { fx: PlasmaFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new PlasmaFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new PlasmaAvatar(ctx.scene, ctx.tint, 'player'));
  av.setFacing(ctx.aim);
  if (!opts?.noDummy) ctx.addDummy();
  return { fx, av };
}

function dummy(ctx: PreviewCtx, x: number, y: number): void {
  ctx.capture(() => {
    const g = ctx.scene.add.graphics().setDepth(4);
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(x, y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(x, y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(x - 5, y - 4, 3.2); g.fillCircle(x + 5, y - 4, 3.2);
    return g;
  });
}

function movingDummy(ctx: PreviewCtx, m: { x: number; y: number }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  ctx.onFrame(() => {
    g.clear();
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(m.x, m.y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(m.x, m.y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(m.x - 5, m.y - 4, 3.2); g.fillCircle(m.x + 5, m.y - 4, 3.2);
  });
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, color: string, size = 11): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(14));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

function label(ctx: PreviewCtx, x: number, y: number, color: string, size = 11): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(14));
}

/** Loose chaos orbs — drifting, bouncing, and dangerous to whoever touches them. */
interface Orb { x: number; y: number; vx: number; vy: number; live: boolean }

function orbLayer(ctx: PreviewCtx, orbs: Orb[], fx: PlasmaFx, victims: { x: number; y: number }[]): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
  ctx.onFrame((dt, elapsed) => {
    g.clear();
    for (let i = orbs.length - 1; i >= 0; i--) {
      const o = orbs[i];
      if (!o.live) { orbs.splice(i, 1); continue; }
      o.x += o.vx * (dt / 1000);
      o.y += o.vy * (dt / 1000);
      o.vx *= 0.98; o.vy *= 0.98;
      if (o.x < 32 || o.x > ctx.w - 32) o.vx *= -1;
      if (o.y < 32 || o.y > ctx.h - 32) o.vy *= -1;
      PlasmaFx.drawSeeker(g, ctx.tint, o.x, o.y, [], false, elapsed / 1000);
      for (const v of victims) {
        if (Phaser.Math.Distance.Between(o.x, o.y, v.x, v.y) > 20) continue;
        o.live = false;
        fx.discharge(o.x, o.y, 30, 6, PLASMA.blush, 250, 9);
        float(ctx, v.x, v.y - 36, '🌀 10', '#ffaaff', 11);
        break;
      }
    }
  });
}

// ══ CLICK — Plasma Burst ══════════════════════════════════════════════

export const plasmaBurst: PreviewScript = {
  duration: 4600,
  scale: 0.9,
  caption: 'Click — 3 blasts of 4 in 42px, 0.2s apart; each one that misses costs you 2',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    dummy(ctx, ctx.tx, ctx.ty);

    /** One cast: the chain to the cursor, then three staggered blasts. */
    const cast = (delay: number, mx: number, my: number, hits: boolean): void => ctx.at(delay, () => {
      av.play('punch', Math.atan2(my - ctx.cy, mx - ctx.cx));
      fx.bolt(ctx.cx, ctx.cy, mx, my, PLASMA.magenta, 8, 220, 3);
      float(ctx, ctx.cx, ctx.cy - 36, '⚡ Plasma Burst', '#dd66ff', 10);
      for (let i = 0; i < 3; i++) {
        ctx.at(i * 200, () => {
          fx.flash(mx, my, 42 * 0.45, 8, PLASMA.magenta);
          fx.discharge(mx, my, 42, 6, PLASMA.magenta, 260, 8);
          fx.ring(mx, my, 42 * 0.3, 42, PLASMA.orchid, 280, 7, 3);
          fx.bolt(ctx.cx, ctx.cy, mx, my, PLASMA.magenta, 8, 220, 3);
          if (hits) {
            fx.motes(mx, my, 3, { speed: 150, size: 3.6, color: PLASMA.blush, depth: 9 });
            float(ctx, mx, my - 22, '4', '#dd66ff', 12);
          } else {
            // The red bolt snapping back — the whole point of the ability's design.
            fx.bolt(mx, my, ctx.cx, ctx.cy, PLASMA.red, 8, 220, 3);
            fx.discharge(ctx.cx, ctx.cy, 22, 4, PLASMA.red, 220, 9);
            float(ctx, ctx.cx, ctx.cy - 30, '⚡ Missed! −2', '#ff4444', 10);
          }
        });
      }
    });
    cast(400, ctx.tx, ctx.ty, true);
    cast(2400, ctx.tx - 130, ctx.ty - 46, false);
  },
};

export const plasmaBurstUpgraded: PreviewScript = {
  duration: 4200,
  scale: 0.82,
  caption: 'Chain Lightning — each blast leaps between every enemy within 160px of the last',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    // A line of bodies close enough for the chain to walk along.
    const line = [
      { x: ctx.cx + 200, y: ctx.cy - 30 },
      { x: ctx.cx + 330, y: ctx.cy + 20 },
      { x: ctx.cx + 450, y: ctx.cy - 20 },
      { x: ctx.cx + 570, y: ctx.cy + 30 },
    ];
    for (const p of line) dummy(ctx, p.x, p.y);

    ctx.at(500, () => {
      av.play('punch', ctx.aim);
      fx.bolt(ctx.cx, ctx.cy, line[0].x, line[0].y, PLASMA.magenta, 8, 220, 3);
      for (let i = 0; i < 3; i++) {
        ctx.at(i * 200, () => {
          fx.flash(line[0].x, line[0].y, 19, 8, PLASMA.magenta);
          fx.discharge(line[0].x, line[0].y, 42, 6, PLASMA.magenta, 260, 8);
          fx.ring(line[0].x, line[0].y, 13, 42, PLASMA.orchid, 280, 7, 3);
          float(ctx, line[0].x, line[0].y - 22, '4', '#dd66ff', 12);
          // The flood-fill: one hop every 90ms so the chain is readable.
          for (let k = 1; k < line.length; k++) {
            ctx.at(k * 90, () => {
              fx.bolt(line[k - 1].x, line[k - 1].y, line[k].x, line[k].y, PLASMA.magenta, 8, 220, 3);
              float(ctx, line[k].x, line[k].y - 22, '4', '#dd66ff', 12);
            });
          }
        });
      }
    });
  },
};

// ══ E — Unstable Arena ════════════════════════════════════════════════

/** Both zone loops run the real 3-second dwell clock; E+ is the size and the permanence. */
function arenaScript(entrenched: boolean): PreviewScript {
  return {
    duration: 7000,
    scale: 0.75,
    caption: entrenched
      ? 'Entrenched Arenas — 96px, never expiring, and only ever two of them at once'
      : 'E — 3 consecutive seconds inside and the floor goes for 80 in 100px',
    run(ctx) {
      const { fx, av } = stage(ctx, { noDummy: true });
      const radius = entrenched ? 96 : 80;
      const zx = ctx.cx + 220, zy = ctx.cy;
      const victim = { x: zx + 180, y: zy };
      movingDummy(ctx, victim);
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
      let placed = -1;
      let dwell = 0;
      let gone = false;

      ctx.at(400, () => {
        placed = 400;
        av.play('slam', 0);
        fx.bolt(ctx.cx, ctx.cy, zx, zy, PLASMA.magenta, 8, 220, 3);
        fx.ring(zx, zy, 10, radius, PLASMA.purple, 420, 7, 4);
        fx.discharge(zx, zy, radius * 0.9, 8, PLASMA.orchid, 400, 7);
        float(ctx, zx, zy - radius - 16, '⚠️ Unstable Arena!', '#aa22ff', 11);
      });

      ctx.onFrame((dt, elapsed) => {
        g.clear();
        if (placed < 0 || gone) return;
        // They walk in, and the rim sweep counts the 3 seconds out loud.
        if (victim.x > zx) victim.x -= 90 * (dt / 1000);
        const inside = Phaser.Math.Distance.Between(zx, zy, victim.x, victim.y) <= radius;
        dwell = inside ? dwell + dt : 0;
        PlasmaFx.drawZone(g, ctx.tint, zx, zy, radius, Phaser.Math.Clamp(dwell / 3000, 0, 1), elapsed / 1000);
        if (dwell >= 3000) {
          gone = true;
          g.clear();
          fx.boom(zx, zy, radius + 20, { color: PLASMA.purple, bolts: 14, motes: 16, duration: 520 });
          float(ctx, zx, zy - 30, '💥 ARENA EXPLOSION!', '#ff44ff', 12);
          float(ctx, victim.x, victim.y - 24, '80', '#aa22ff', 17);
        }
      });
    },
  };
}

export const unstableArena = arenaScript(false);
export const unstableArenaUpgraded = arenaScript(true);

// ══ R — Plasma Current ════════════════════════════════════════════════

export const plasmaCurrent: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'R — hold to widen from 40 to 120px; the chain cuts for 2 every 0.1s',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const victim = { x: ctx.cx + 320, y: ctx.cy };
    dummy(ctx, victim.x, victim.y);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    const readout = label(ctx, ctx.w * 0.5, 12, '#cc44ff', 11);

    let holding = false;
    let holdStart = 0;
    const cur = { ax: 0, ay: 0, bx: 0, by: 0, live: false, tick: 0, dealt: 0 };

    ctx.at(400, () => { holding = true; holdStart = 400; });
    ctx.onFrame((dt, elapsed) => {
      g.clear();
      if (holding) {
        const held = Math.min(elapsed - holdStart, 1500);
        const spread = 40 + (held / 1500) * 80;
        readout.setText(`held ${(held / 1000).toFixed(1)}s — ${Math.round(spread)}px apart`);
        PlasmaFx.drawCurrent(g, ctx.tint, ctx.cx, ctx.cy - spread, ctx.cx, ctx.cy + spread, false, elapsed / 1000);
        return;
      }
      if (!cur.live) return;
      cur.ax += 320 * (dt / 1000);
      cur.bx += 320 * (dt / 1000);
      PlasmaFx.drawCurrent(g, ctx.tint, cur.ax, cur.ay, cur.bx, cur.by, false, elapsed / 1000);
      // 2 damage every 0.1s to anything within 18px of the line.
      cur.tick += dt;
      if (cur.tick >= 100) {
        cur.tick -= 100;
        const onLine = victim.x >= Math.min(cur.ax, cur.bx) - 18 && victim.x <= Math.max(cur.ax, cur.bx) + 18
          && victim.y >= Math.min(cur.ay, cur.by) && victim.y <= Math.max(cur.ay, cur.by);
        if (onLine) {
          cur.dealt += 2;
          readout.setText(`chain — 2 every 0.1s   (${cur.dealt} so far)`);
          fx.motes(victim.x, victim.y, 1, { speed: 90, size: 3, color: PLASMA.orchid, depth: 9 });
        }
      }
      // Touching a bead collapses the whole thing for 10 in 70px.
      if (Phaser.Math.Distance.Between(cur.ax, cur.ay, victim.x, victim.y) <= 20
        || Phaser.Math.Distance.Between(cur.bx, cur.by, victim.x, victim.y) <= 20) {
        cur.live = false;
        g.clear();
        const mx = (cur.ax + cur.bx) / 2, my = (cur.ay + cur.by) / 2;
        float(ctx, victim.x, victim.y - 36, '💥 Chain Collapse!', '#cc44ff', 11);
        float(ctx, victim.x, victim.y - 20, '10', '#cc44ff', 14);
        fx.boom(mx, my, 70, { color: PLASMA.orchid, bolts: 9, motes: 8 });
      }
    });

    ctx.at(1900, () => {
      holding = false;
      const spread = 40 + (1500 / 1500) * 80;
      av.play('clap', 0);
      fx.flash(ctx.cx, ctx.cy - spread, 16, 9, PLASMA.orchid);
      fx.flash(ctx.cx, ctx.cy + spread, 16, 9, PLASMA.orchid);
      fx.bolt(ctx.cx, ctx.cy - spread, ctx.cx, ctx.cy + spread, PLASMA.white, 9, 260, 3);
      Object.assign(cur, {
        ax: ctx.cx, ay: ctx.cy - spread, bx: ctx.cx, by: ctx.cy + spread, live: true, tick: 0, dealt: 0,
      });
    });
  },
};

export const plasmaCurrentUpgraded: PreviewScript = {
  duration: 8000,
  scale: 0.7,
  caption: 'Volt Points — hold past 2.5s for two 3-charge sockets that relay 8 across the gap',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const victim = { x: ctx.cx + 60, y: ctx.cy + 130 };
    dummy(ctx, victim.x, victim.y);
    const volts: { x: number; y: number; charges: number }[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    const readout = label(ctx, ctx.w * 0.5, 12, '#dd66ff', 11);
    let holding = true;

    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (holding) {
        readout.setText(elapsed < 2500 ? `hold ${(elapsed / 1000).toFixed(1)}s / 2.5s` : 'VOLT MODE — release');
        return;
      }
      readout.setText(volts.length ? `${volts[0].charges} relays left` : '');
      for (const v of volts) PlasmaFx.drawVoltPoint(g, ctx.tint, v.x, v.y, v.charges, elapsed / 1000);
    });

    ctx.at(2800, () => {
      holding = false;
      av.play('clap', 0);
      const ax = ctx.cx, ay = ctx.cy - 96;
      const bx = ctx.cx, by = ctx.cy + 96;
      volts.push({ x: ax, y: ay, charges: 3 }, { x: bx, y: by, charges: 3 });
      fx.flash(ax, ay, 20, 9, PLASMA.magenta);
      fx.flash(bx, by, 20, 9, PLASMA.magenta);
      fx.bolt(ax, ay, bx, by, PLASMA.white, 8, 300, 2.4);
      float(ctx, ctx.cx, ctx.cy - 40, '⚡ VOLT POINTS!', '#dd66ff', 11);

      // Bursts landing near the top volt, relaying down into whoever is near the bottom one.
      for (let i = 0; i < 3; i++) {
        ctx.at(900 + i * 1200, () => {
          if (!volts.length || volts[0].charges <= 0) return;
          const hx = ax + 30, hy = ay + 20;
          fx.discharge(hx, hy, 42, 6, PLASMA.magenta, 260, 8);
          fx.bolt(volts[0].x, volts[0].y, volts[1].x, volts[1].y, PLASMA.magenta, 8, 220, 3);
          volts[0].charges--;
          volts[1].charges--;
          float(ctx, victim.x, victim.y - 36, '⚡ VOLT RELAY', '#dd66ff', 10);
          float(ctx, victim.x, victim.y - 20, '8', '#dd66ff', 13);
        });
      }
    });
  },
};

// ══ F — Chaos Blades ══════════════════════════════════════════════════

/** Both blade loops run the real bounce sim; F+ is six of them a quarter faster. */
function bladesScript(storm: boolean): PreviewScript {
  return {
    duration: 8000,
    scale: 0.62,
    caption: storm
      ? 'Blade Storm — 6 blades at 475 px/s instead of 3 at 380, and they still cut you'
      : 'F — 3 blades, 8 damage, bouncing for 8s; yours cut you after a 2s grace',
    run(ctx) {
      const { fx, av } = stage(ctx, { noDummy: true });
      const victim = { x: ctx.cx + 260, y: ctx.cy - 20 };
      dummy(ctx, victim.x, victim.y);
      const count = storm ? 6 : 3;
      const speed = storm ? 475 : 380;
      const blades: { x: number; y: number; vx: number; vy: number; hitCd: number }[] = [];
      const orbs: Orb[] = [];
      orbLayer(ctx, orbs, fx, [{ x: ctx.cx, y: ctx.cy }, victim]);
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));

      ctx.at(400, () => {
        av.play('sweep');
        fx.flash(ctx.cx, ctx.cy, 26, 9, PLASMA.pink);
        fx.discharge(ctx.cx, ctx.cy, 70, count, PLASMA.pink, 360, 8);
        fx.ring(ctx.cx, ctx.cy, 12, 60, PLASMA.blush, 340, 7, 3);
        float(ctx, ctx.cx, ctx.cy - 36, '🔮 Chaos Blades!', '#ff44ff', 11);
        for (let i = 0; i < count; i++) {
          const a = (i * 2 * Math.PI) / count;
          blades.push({ x: ctx.cx, y: ctx.cy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, hitCd: 0 });
        }
        // The Chaos they leave: five orbs boiling out every 5 seconds.
        ctx.at(1200, () => {
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            const s = 80 + Math.random() * 60;
            orbs.push({ x: victim.x + Math.cos(a) * 20, y: victim.y + Math.sin(a) * 20, vx: Math.cos(a) * s, vy: Math.sin(a) * s, live: true });
          }
          fx.ring(victim.x, victim.y, 8, 40, PLASMA.blush, 300, 7, 2);
        });
      });

      ctx.onFrame((dt, elapsed) => {
        g.clear();
        for (const b of blades) {
          b.x += b.vx * (dt / 1000);
          b.y += b.vy * (dt / 1000);
          if (b.x < 32 || b.x > ctx.w - 32) b.vx *= -1;
          if (b.y < 32 || b.y > ctx.h - 32) b.vy *= -1;
          PlasmaFx.drawBlade(g, ctx.tint, b.x, b.y, Math.atan2(b.vy, b.vx), elapsed / 1000);
          // Both fighters are checked; the caster is only spared for the first 2 seconds.
          for (const [f, isCaster] of [[victim, false], [{ x: ctx.cx, y: ctx.cy }, true]] as const) {
            if (isCaster && elapsed < 2400) continue;
            if (Phaser.Math.Distance.Between(b.x, b.y, f.x, f.y) > 20 || elapsed < b.hitCd) continue;
            b.hitCd = elapsed + 400;
            fx.discharge(f.x, f.y, 34, 5, PLASMA.pink, 260, 9);
            fx.motes(f.x, f.y, 4, { speed: 200, size: 4, color: PLASMA.pink, depth: 9 });
            float(ctx, f.x, f.y - 26, isCaster ? '8 (yours)' : '8', isCaster ? '#ff4466' : '#ff44ff', 12);
            float(ctx, f.x, f.y - 42, '🌀 CHAOS', '#ff44ff', 9);
            b.vx += (Math.random() - 0.5) * 60;
            b.vy += (Math.random() - 0.5) * 60;
          }
        }
      });
    },
  };
}

export const chaosBlades = bladesScript(false);
export const chaosBladesUpgraded = bladesScript(true);

// ══ Q — Pure CHAOS! ═══════════════════════════════════════════════════

export const pureChaos: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Q — 20s shell, 5 seekers now and every 5s: 8 each on an enemy, 5 each on YOU if not',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const victim = { x: ctx.cx + 220, y: ctx.cy };
    movingDummy(ctx, victim);
    const seekers: { x: number; y: number; vx: number; vy: number; hostile: boolean; trail: { x: number; y: number }[]; live: boolean }[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff88ff', 11);

    ctx.at(400, () => {
      av.play('raise', -Math.PI / 2, 900);
      fx.flash(ctx.cx, ctx.cy, 44, 10, PLASMA.blush);
      fx.discharge(ctx.cx, ctx.cy, 110, 12, PLASMA.magenta, 460, 9);
      fx.ring(ctx.cx, ctx.cy, 18, 100, PLASMA.white, 450, 9, 4);
      fx.scorch(ctx.cx, ctx.cy, 60, 3);
      float(ctx, ctx.cx, ctx.cy - 44, '⚡ PURE CHAOS!', '#ff88ff', 13);
      const aura = ctx.capture(() => new PlasmaAura(ctx.scene, ctx.tint, 'pure', 30, 4));
      ctx.onFrame((dt) => aura.update(dt, ctx.cx, ctx.cy, 1));

      /** One volley: five orbs, thrown outward at 210 first so they arc back in. */
      const volley = (hostile: boolean): void => {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + Math.random() * 0.4;
          seekers.push({
            x: ctx.cx + Math.cos(a) * 18, y: ctx.cy + Math.sin(a) * 18,
            vx: Math.cos(a) * 210, vy: Math.sin(a) * 210, hostile, trail: [], live: true,
          });
        }
        float(ctx, ctx.cx, ctx.cy - 56, hostile ? '🌀 No target — they want YOU!' : '🌀 Chaos Volley!',
          hostile ? '#ff4466' : '#dd66ff', 10);
      };
      volley(false);
      // The second volley fires with nobody in range, so it turns on the caster.
      ctx.at(3600, () => { victim.x = ctx.w + 200; });
      ctx.at(4000, () => volley(true));
    });

    ctx.onFrame((dt, elapsed) => {
      g.clear();
      readout.setText(elapsed > 400 ? `shell ${Math.max(0, 20 - (elapsed - 400) / 1000).toFixed(0)}s` : '');
      for (let i = seekers.length - 1; i >= 0; i--) {
        const s = seekers[i];
        if (!s.live) { seekers.splice(i, 1); continue; }
        const tgt = s.hostile ? { x: ctx.cx, y: ctx.cy } : victim;
        const a = Math.atan2(tgt.y - s.y, tgt.x - s.x);
        s.vx += Math.cos(a) * 900 * (dt / 1000);
        s.vy += Math.sin(a) * 900 * (dt / 1000);
        const sp = Math.hypot(s.vx, s.vy);
        if (sp > 340) { s.vx = (s.vx / sp) * 340; s.vy = (s.vy / sp) * 340; }
        s.x += s.vx * (dt / 1000);
        s.y += s.vy * (dt / 1000);
        s.trail.push({ x: s.x, y: s.y });
        if (s.trail.length > 10) s.trail.shift();
        PlasmaFx.drawSeeker(g, ctx.tint, s.x, s.y, s.trail, s.hostile, elapsed / 1000);
        if (Phaser.Math.Distance.Between(s.x, s.y, tgt.x, tgt.y) <= 20) {
          s.live = false;
          const col = s.hostile ? PLASMA.blood : PLASMA.magenta;
          fx.flash(tgt.x, tgt.y, 16, 9, col);
          fx.discharge(tgt.x, tgt.y, 32, 5, col, 240, 9);
          float(ctx, tgt.x, tgt.y - 24, s.hostile ? '5' : '8', s.hostile ? '#ff4466' : '#dd66ff', 13);
        }
      }
    });
  },
};

export const pureChaosUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Permanent Chaos — a fighter-sized orb that never expires: 5 within 110px, 25 on touch',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const victim = { x: ctx.cx + 340, y: ctx.cy };
    movingDummy(ctx, victim);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    const orb = { x: 0, y: 0, vx: 0, vy: 0, live: false, born: 0, lastStrike: -9999 };

    ctx.at(400, () => {
      av.play('raise', -Math.PI / 2, 900);
      fx.discharge(ctx.cx, ctx.cy, 110, 12, PLASMA.magenta, 460, 9);
      float(ctx, ctx.cx, ctx.cy - 44, '⚡ PURE CHAOS!', '#ff88ff', 12);
    });

    // When the shell drops, the orb peels off and drifts. It stays inert for 1.5s first.
    ctx.at(2400, () => {
      const a = -0.2;
      Object.assign(orb, {
        x: ctx.cx + Math.cos(a) * 60, y: ctx.cy + Math.sin(a) * 60,
        vx: Math.cos(a) * 55, vy: Math.sin(a) * 55, live: true, born: 2400,
      });
      float(ctx, ctx.cx, ctx.cy - 44, '∞ PERMANENT CHAOS', '#ff88ff', 11);
    });

    ctx.onFrame((dt, elapsed) => {
      g.clear();
      if (!orb.live) return;
      orb.x += orb.vx * (dt / 1000);
      orb.y += orb.vy * (dt / 1000);
      const arming = Phaser.Math.Clamp((elapsed - orb.born) / 1500, 0, 1);
      PlasmaFx.drawPermanentOrb(g, ctx.tint, orb.x, orb.y, 22, 110, arming, elapsed / 1000);
      if (arming < 1) return;
      // They walk into it: a proximity strike at 110px, then the detonation on contact.
      victim.x -= 60 * (dt / 1000);
      const d = Phaser.Math.Distance.Between(orb.x, orb.y, victim.x, victim.y);
      if (d <= 110 && elapsed - orb.lastStrike >= 1000) {
        orb.lastStrike = elapsed;
        fx.bolt(orb.x, orb.y, victim.x, victim.y, PLASMA.magenta, 8, 220, 3);
        float(ctx, victim.x, victim.y - 24, '5', '#dd66ff', 12);
      }
      if (d <= 26) {
        orb.live = false;
        g.clear();
        fx.boom(orb.x, orb.y, 22 * 3.4, { color: PLASMA.blush, bolts: 10, motes: 12 });
        float(ctx, victim.x, victim.y - 40, '💥 CHAOS BURST!', '#ff88ff', 11);
        float(ctx, victim.x, victim.y - 22, '25', '#ff88ff', 16);
      }
    });
  },
};

// ══ Passives ══════════════════════════════════════════════════════════

export const passiveItHitsYouToo: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Every zone, blade, current and orb the element makes checks you as well as them',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const zx = ctx.cx, zy = ctx.cy;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    let dwell = 0;
    let gone = false;

    ctx.at(400, () => {
      av.play('slam', 0);
      fx.ring(zx, zy, 10, 80, PLASMA.purple, 420, 7, 4);
      fx.discharge(zx, zy, 72, 8, PLASMA.orchid, 400, 7);
      float(ctx, zx, zy - 96, '⚠️ your own Unstable Arena', '#aa22ff', 10);
    });
    // The caster is standing in it, and the zone does not care.
    ctx.onFrame((dt, elapsed) => {
      g.clear();
      if (elapsed < 400 || gone) return;
      dwell += dt;
      PlasmaFx.drawZone(g, ctx.tint, zx, zy, 80, Phaser.Math.Clamp(dwell / 3000, 0, 1), elapsed / 1000);
      if (dwell >= 3000) {
        gone = true;
        g.clear();
        fx.boom(zx, zy, 100, { color: PLASMA.purple, bolts: 14, motes: 16, duration: 520 });
        float(ctx, ctx.cx, ctx.cy - 30, '80 — to YOU', '#ff4466', 16);
      }
    });
    // And the missed click, which is the same rule in miniature.
    ctx.at(4800, () => {
      const mx = ctx.cx + 200, my = ctx.cy - 40;
      av.play('punch', Math.atan2(my - ctx.cy, mx - ctx.cx));
      fx.bolt(ctx.cx, ctx.cy, mx, my, PLASMA.magenta, 8, 220, 3);
      for (let i = 0; i < 3; i++) {
        ctx.at(i * 200, () => {
          fx.discharge(mx, my, 42, 6, PLASMA.magenta, 260, 8);
          fx.bolt(mx, my, ctx.cx, ctx.cy, PLASMA.red, 8, 220, 3);
          fx.discharge(ctx.cx, ctx.cy, 22, 4, PLASMA.red, 220, 9);
          float(ctx, ctx.cx, ctx.cy - 30, '−2', '#ff4444', 11);
        });
      }
    });
  },
};

export const passiveChaos: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Chaos — 15s, releasing 5 orbs every 5s; any of them is 10 to whoever touches it',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    const carrier = { x: ctx.cx + 200, y: ctx.cy };
    movingDummy(ctx, carrier);
    const orbs: Orb[] = [];
    orbLayer(ctx, orbs, fx, [carrier, { x: ctx.cx, y: ctx.cy }]);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff44ff', 11);

    ctx.at(400, () => {
      fx.discharge(carrier.x, carrier.y, 28, 5, PLASMA.pink, 300, 8);
      float(ctx, carrier.x, carrier.y - 36, '🌀 CHAOS', '#ff44ff', 12);
      const aura = ctx.capture(() => new PlasmaAura(ctx.scene, ctx.tint, 'chaos', 26, 4));
      ctx.onFrame((dt, elapsed) => {
        aura.update(dt, carrier.x, carrier.y, 1);
        readout.setText(`${Math.max(0, 15 - (elapsed - 400) / 1000).toFixed(0)}s of Chaos   —   ${orbs.length} orbs loose`);
        carrier.x = Math.max(ctx.cx + 80, carrier.x - 34 * (dt / 1000));
      });
      // Three releases at the real 5s cadence, compressed only by the loop length.
      for (let r = 0; r < 2; r++) {
        ctx.at(r * 4000, () => {
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            const s = 80 + Math.random() * 60;
            orbs.push({
              x: carrier.x + Math.cos(a) * 20, y: carrier.y + Math.sin(a) * 20,
              vx: Math.cos(a) * s, vy: Math.sin(a) * s, live: true,
            });
          }
          fx.ring(carrier.x, carrier.y, 8, 40, PLASMA.blush, 300, 7, 2);
        });
      }
    });
  },
};

// ══ Perk — Solar ══════════════════════════════════════════════════════

export const perkSolar: PreviewScript = {
  duration: 9000,
  scale: 0.7,
  caption: 'Solar — recast R to freeze a current: a 20s wall, then 15 at each end',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    const cur = { ax: ctx.cx, ay: ctx.cy - 90, bx: ctx.cx, by: ctx.cy + 90, live: false, stopped: false };
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff2f8f', 11);

    ctx.at(400, () => {
      av.play('clap', 0);
      fx.flash(cur.ax, cur.ay, 16, 9, PLASMA.orchid);
      fx.flash(cur.bx, cur.by, 16, 9, PLASMA.orchid);
      fx.bolt(cur.ax, cur.ay, cur.bx, cur.by, PLASMA.white, 9, 260, 3);
      cur.live = true;
    });
    ctx.at(2000, () => {
      cur.stopped = true;
      float(ctx, cur.ax, cur.ay - 24, '⏸ STOPPED', '#cc44ff', 11);
    });
    ctx.onFrame((dt, elapsed) => {
      g.clear();
      if (!cur.live) return;
      if (!cur.stopped) { cur.ax += 320 * (dt / 1000); cur.bx += 320 * (dt / 1000); }
      else readout.setText('frozen — still cutting for 2 every 0.1s');
      PlasmaFx.drawCurrent(g, ctx.tint, cur.ax, cur.ay, cur.bx, cur.by, cur.stopped, elapsed / 1000);
    });
    // The 20s timer, compressed to the end of the loop: both ends go for 15 in 60px.
    ctx.at(7400, () => {
      cur.live = false;
      g.clear();
      readout.setText('');
      for (const p of [{ x: cur.ax, y: cur.ay }, { x: cur.bx, y: cur.by }]) {
        fx.boom(p.x, p.y, 60, { color: PLASMA.orchid, bolts: 8, motes: 8 });
        float(ctx, p.x, p.y - 24, '15', '#cc44ff', 13);
      }
    });
  },
};

// ══ Mastery ═══════════════════════════════════════════════════════════

export const masteryChaosStorm: PreviewScript = {
  duration: 9000,
  scale: 0.88,
  caption: 'Chaos Storm — the arena shrinks to a 160px square over 120s, and the edge is 5/s',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    av.setMastered(true);
    const victim = { x: ctx.w - 70, y: ctx.cy };
    movingDummy(ctx, victim);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff2f8f', 11);
    let strike = 0;

    ctx.onFrame((dt, elapsed) => {
      // The full 120s close, run at 15× so a loop shows the whole shape of it.
      const ratio = Phaser.Math.Clamp((elapsed * 15) / 120000, 0, 1);
      const cx = ctx.w / 2, cy = ctx.h / 2;
      const halfW = Phaser.Math.Linear((ctx.w - 64) / 2, 80, ratio);
      const halfH = Phaser.Math.Linear((ctx.h - 64) / 2, 80, ratio);
      const b = { left: cx - halfW, right: cx + halfW, top: cy - halfH, bottom: cy + halfH, ratio };
      g.clear();
      PlasmaFx.drawStorm(g, ctx.tint, ctx.w, ctx.h, b, elapsed / 1000);
      readout.setText(`${Math.round(ratio * 120)}s in — walls at ${Math.round(halfW * 2)}px`);
      // Anybody outside the live edge takes 5 once a second until they get back in.
      const out = victim.x > b.right || victim.x < b.left || victim.y > b.bottom || victim.y < b.top;
      if (out) {
        victim.x -= 80 * (dt / 1000);
        strike += dt;
        if (strike >= 1000) {
          strike -= 1000;
          fx.bolt(victim.x, 0, victim.x, victim.y, PLASMA.hot, 9, 240, 3);
          float(ctx, victim.x, victim.y - 24, '5', '#ff2f8f', 12);
        }
      } else strike = 0;
    });
  },
};

export const masteryUnstableOrbital: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Unstable Orbital — closes 9px/s onto you for 50; every damage you deal pushes it 1.6px out',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    av.setMastered(true);
    const victim = { x: ctx.cx + 150, y: ctx.cy };
    dummy(ctx, victim.x, victim.y);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff2f8f', 11);
    const orb = { r: 190, angle: 0, live: false, lastHit: -9999 };

    ctx.at(400, () => {
      orb.live = true;
      fx.charge(ctx.cx, ctx.cy, 190, 400, PLASMA.hot, 7);
      float(ctx, ctx.cx, ctx.cy - 44, '⚛️ UNSTABLE ORBITAL', '#ff2f8f', 11);
    });

    ctx.onFrame((dt, elapsed) => {
      g.clear();
      if (!orb.live) return;
      orb.angle += 2.5 * (dt / 1000);
      orb.r = Math.max(0, orb.r - 9 * (dt / 1000));
      const tilt = elapsed / 3000;
      const px = Math.cos(orb.angle) * orb.r, py = Math.sin(orb.angle) * orb.r * 0.42;
      const ox = ctx.cx + px * Math.cos(tilt) - py * Math.sin(tilt);
      const oy = ctx.cy + px * Math.sin(tilt) + py * Math.cos(tilt);
      const closeness = Phaser.Math.Clamp(1 - orb.r / 190, 0, 1);
      PlasmaFx.drawOrbital(g, ctx.tint, ctx.cx, ctx.cy, ox, oy, orb.r, orb.angle, tilt, closeness, elapsed / 1000);
      readout.setText(`${Math.round(orb.r)}px out — detonates on you at 26`);

      // What it sweeps through: 20 damage on a 1.2s per-target cooldown.
      if (Phaser.Math.Distance.Between(ox, oy, victim.x, victim.y) <= 24 && elapsed - orb.lastHit >= 1200) {
        orb.lastHit = elapsed;
        fx.discharge(victim.x, victim.y, 34, 6, PLASMA.hot, 260, 9);
        float(ctx, victim.x, victim.y - 26, '20', '#ff2f8f', 13);
        // …and every point you deal shoves it 1.6px back out, capped at the 190 it started on.
        orb.r = Math.min(190, orb.r + 20 * 1.6);
        float(ctx, ctx.cx, ctx.cy - 34, '+32px pushed back', '#ff88cc', 10);
      }
      if (orb.r <= 26) {
        orb.live = false;
        g.clear();
        fx.boom(ctx.cx, ctx.cy, 70, { color: PLASMA.hot, bolts: 10, motes: 12 });
        float(ctx, ctx.cx, ctx.cy - 30, '50 — to YOU', '#ff4466', 16);
      }
    });
  },
};
