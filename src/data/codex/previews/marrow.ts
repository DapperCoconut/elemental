import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  CELL_TINT, CellKind, MRW, MarrowAvatar, MarrowFx, antibody, bcell, boneShaft, cellGlyph,
  cytokine, dendrite, killerT, macrophage, mastCell, netWeb, neutrophil, tcell,
} from '../../../elements/kits/MarrowVisuals';

/**
 * Marrow's showcases.
 *
 * There is no `proj-marrow` — the antibodies, the cells, the tentacles and the webs are all
 * Graphics the kit repaints every frame — so these loops keep the same little records the kit
 * keeps and paint with the real painters: `antibody` for the click, `macrophage`, `neutrophil`
 * and `tcell` for the three summons, `mastCell` with its live fuse channel, `netWeb`, and
 * `boneShaft` + `cellGlyph` for the HUD the passive loop reproduces. One-shots go through a real
 * `MarrowFx` with a sticky sink.
 */

// ── Staging ───────────────────────────────────────────────────────────

function fxOf(ctx: PreviewCtx): MarrowFx {
  return ctx.capture(() => new MarrowFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

function dummyAt(
  ctx: PreviewCtx, at: { x: number; y: number }, depth = 5, alive: () => boolean = () => true,
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(depth));
  ctx.onFrame(() => {
    g.clear();
    if (!alive()) return;
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(at.x, at.y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(at.x - 5, at.y - 4, 3.2); g.fillCircle(at.x + 5, at.y - 4, 3.2);
    g.fillStyle(0x11131b, 1); g.fillCircle(at.x - 5.6, at.y - 4, 1.6); g.fillCircle(at.x + 4.4, at.y - 4, 1.6);
  });
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, color: string, size = 11): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(24));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

function label(ctx: PreviewCtx, x: number, y: number, color: string, size = 11): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(24));
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** The host rig, or null when a skin has replaced the character. */
function host(av: unknown): MarrowAvatar | null {
  return av instanceof MarrowAvatar ? av : null;
}

/** A walking cell, in the shape the kit keeps them. */
interface Cell {
  kind: Exclude<CellKind, 'mast'>;
  x: number; y: number; ang: number; hp: number; maxHp: number;
  seed: number; anim: number; next: number; buffed: boolean; reach: number;
}

function makeCell(kind: Exclude<CellKind, 'mast'>, x: number, y: number): Cell {
  const maxHp = kind === 'macrophage' ? 85 : kind === 'neutrophil' ? 30 : 50;
  return {
    kind, x, y, ang: 0, hp: maxHp, maxHp,
    seed: Math.random() * 999, anim: 0, next: 0, buffed: false, reach: 0,
  };
}

function drawCell(ctx: PreviewCtx, g: Phaser.GameObjects.Graphics, c: Cell, t: number,
  to: { x: number; y: number } | null = null): void {
  if (c.kind === 'macrophage') {
    macrophage(g, ctx.tint, c.x, c.y, c.ang, 1, { t, seed: c.seed, chew: c.anim });
  } else if (c.kind === 'neutrophil') {
    neutrophil(g, ctx.tint, c.x, c.y, c.ang, 1, { t, seed: c.seed, dash: 0.4 + c.anim * 0.6 });
  } else {
    tcell(g, ctx.tint, c.x, c.y, c.ang, 1, { t, seed: c.seed, reach: c.reach, to });
  }
  if (c.buffed) {
    g.lineStyle(1.6, ctx.tint(MRW.tcellLit), 0.6 + 0.25 * Math.sin(t * 4 + c.seed));
    g.strokeCircle(c.x, c.y, c.kind === 'macrophage' ? 20 : 14);
  }
  const ratio = Phaser.Math.Clamp(c.hp / c.maxHp, 0, 1);
  if (ratio >= 0.999) return;
  const y = c.y - (c.kind === 'macrophage' ? 24 : 18);
  g.fillStyle(ctx.tint(MRW.ink), 0.7);
  g.fillRect(c.x - 11, y - 1, 22, 4);
  g.fillStyle(ctx.tint(CELL_TINT[c.kind]), 0.95);
  g.fillRect(c.x - 10, y, 20 * ratio, 2);
}

/** Walk a cell toward a point at `speed`, exactly the way the kit does. */
function step(c: Cell, tx: number, ty: number, speed: number, dt: number): number {
  const want = Math.atan2(ty - c.y, tx - c.x);
  c.ang = Phaser.Math.Angle.RotateTo(c.ang, want, 6 * dt);
  const d = Phaser.Math.Distance.Between(c.x, c.y, tx, ty);
  c.x += Math.cos(c.ang) * speed * dt;
  c.y += Math.sin(c.ang) * speed * dt;
  return d;
}

// ══ CLICK — Anti-Body Blast ═══════════════════════════════════════════

export const antiBodyBlast: PreviewScript = {
  duration: 17000,
  scale: 0.8,
  caption: 'Click — 12 damage, and then it stays. Every one of them makes your cells bite harder.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MarrowAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 210, y: ctx.cy - 6 };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#f1e7d0', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 16, '#f5788c', 10);

    const shots: { x: number; y: number; vx: number; vy: number; ang: number; seed: number }[] = [];
    const stuck: { slot: number; seed: number }[] = [];
    /** The second half of the loop: what a coated body is actually worth to the board. */
    let cell: Cell | null = null;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(10));

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const t = elapsed / 1000;
      g.clear();

      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (Phaser.Math.Distance.Between(s.x, s.y, victim.x, victim.y) <= 26) {
          shots.splice(i, 1);
          float(ctx, victim.x, victim.y - 24, '12', '#ffb3aa', 13);
          if (stuck.length < 10) {
            stuck.push({ slot: stuck.length, seed: Math.random() * 999 });
            ctx.capture(() => fx.latch(victim.x, victim.y));
            if (stuck.length === 10) float(ctx, victim.x, victim.y - 42, '🦴 COATED ×10', hex(MRW.bone), 12);
          }
          continue;
        }
        if (s.x > ctx.w + 20) { shots.splice(i, 1); continue; }
        antibody(g, ctx.tint, s.x, s.y, s.ang, 1, { size: 1.15, seed: s.seed, hot: 0.5 });
      }

      // The coat: ten fixed slots ringing the body, exactly as the kit places them.
      for (const a of stuck) {
        const ang = (a.slot / 10) * Math.PI * 2 + t * 0.35;
        const r = 15 + (a.slot % 3) * 3.5;
        antibody(g, ctx.tint, victim.x + Math.cos(ang) * r, victim.y + Math.sin(ang) * r * 0.85,
          ang, 0.95, { size: 0.85, seed: a.seed });
      }

      // A macrophage walks in and eats the mark, at the rate the coat has bought.
      if (cell) {
        cell.anim = Math.max(0, cell.anim - dt * 2.6);
        const d = step(cell, victim.x, victim.y, 76, dt);
        if (d <= 30 && elapsed >= cell.next) {
          cell.next = elapsed + 1100;
          cell.anim = 1;
          const dmg = Math.round(15 * (1 + 0.1 * stuck.length));
          const feed = 5 + 2 * stuck.length;
          float(ctx, victim.x, victim.y - 30, `${dmg}`, '#ffb3aa', 14);
          float(ctx, ctx.cx, ctx.cy - 46, `💉 +${feed}`, hex(MRW.serum), 12);
          ctx.capture(() => fx.bite(victim.x, victim.y, cell!.ang));
        }
        drawCell(ctx, g, cell, t);
      }

      const mult = 1 + 0.1 * stuck.length;
      gauge.setText(cell
        ? `${stuck.length}/10 stuck   ·   bites ×${mult.toFixed(1)} — 15 becomes ${Math.round(15 * mult)}   ·   the feed is ${5 + 2 * stuck.length}, not 5`
        : `${stuck.length}/10 stuck   ·   ${stuck.length * 12} damage delivered   ·   none of them expire`);
    });

    // Eleven presses, so the loop shows the eleventh finding no slot.
    for (let i = 0; i < 11; i++) {
      ctx.at(900 + i * 780, () => {
        const a = Math.atan2(victim.y - ctx.cy, victim.x - ctx.cx);
        shots.push({
          x: ctx.cx + Math.cos(a) * 20, y: ctx.cy + Math.sin(a) * 20,
          vx: Math.cos(a) * 720, vy: Math.sin(a) * 720, ang: a, seed: Math.random() * 999,
        });
        av.play('punch', a);
      });
    }
    ctx.at(300, () => readout.setText('440ms between shots — hold the button and it fires itself'));
    ctx.at(3400, () => readout.setText('each one deals 12 and then latches on. They do not fade.'));
    ctx.at(7600, () => readout.setText('ten to a body is the cap'));
    ctx.at(9800, () => readout.setText('the eleventh still deals its 12 — it just finds no slot to hold'));
    ctx.at(11200, () => {
      cell = makeCell('macrophage', ctx.cx + 70, ctx.cy + 74);
      cell.next = 11200;
      readout.setText('and this is what the coat was for');
    });
    ctx.at(13000, () => readout.setText('+10% a bite from every antibody — a full coat is double, from every cell you own'));
    ctx.at(15200, () => readout.setText('and +2 HP a bite to the macrophage and to you, per antibody'));
  },
};

// ══ CLICK+ — B-Cascade ════════════════════════════════════════════════

export const antiBodyBlastUpgraded: PreviewScript = {
  duration: 16000,
  scale: 0.85,
  caption: 'Click+ — with a T-cell out, the click stops throwing antibodies and starts making cells',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MarrowAvatar(ctx.scene, ctx.tint));
    const rig = host(av);
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 236, y: ctx.cy - 4 };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ffd98a', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 16, '#f1e7d0', 10);

    /** The condition: the click is only a B-cell while a T-cell is standing there. */
    let helper: Cell | null = null;
    const cells: { x: number; y: number; ang: number; hp: number; seed: number; next: number }[] = [];
    const shots: { x: number; y: number; ang: number; seed: number }[] = [];
    const stuck: { slot: number; seed: number }[] = [];
    let ready = 0;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(10));

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const t = elapsed / 1000;
      g.clear();

      if (helper) {
        helper.x += Math.cos(t * 0.7) * 8 * dt;
        drawCell(ctx, g, helper, t);
      }

      // The homing half: antibodies that steer, and latch exactly like a thrown one.
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        const want = Math.atan2(victim.y - s.y, victim.x - s.x);
        s.ang = Phaser.Math.Angle.RotateTo(s.ang, want, 5 * dt);
        s.x += Math.cos(s.ang) * 720 * dt;
        s.y += Math.sin(s.ang) * 720 * dt;
        if (Phaser.Math.Distance.Between(s.x, s.y, victim.x, victim.y) <= 26) {
          shots.splice(i, 1);
          float(ctx, victim.x, victim.y - 24, '12', '#ffb3aa', 12);
          if (stuck.length < 10) {
            stuck.push({ slot: stuck.length, seed: Math.random() * 999 });
            ctx.capture(() => fx.latch(victim.x, victim.y));
          }
          continue;
        }
        antibody(g, ctx.tint, s.x, s.y, s.ang, 1, { size: 1, seed: s.seed, hot: 0.5 });
      }
      for (const a of stuck) {
        const ang = (a.slot / 10) * Math.PI * 2 + t * 0.35;
        antibody(g, ctx.tint, victim.x + Math.cos(ang) * 16, victim.y + Math.sin(ang) * 14,
          ang, 0.95, { size: 0.85, seed: a.seed });
      }

      for (let i = cells.length - 1; i >= 0; i--) {
        const b = cells[i];
        // 46 px/s. It crawls, and it never comes back.
        b.x += Math.cos(b.ang) * 46 * dt;
        b.y += Math.sin(b.ang) * 46 * dt;
        if (Phaser.Math.Distance.Between(b.x, b.y, victim.x, victim.y) <= 24) {
          cells.splice(i, 1);
          float(ctx, victim.x, victim.y - 34, '25', '#ffb3aa', 16);
          ctx.capture(() => fx.lyse(b.x, b.y, MRW.bcell, 14));
          continue;
        }
        if (elapsed >= b.next) {
          b.next = elapsed + 3000;
          for (let k = 0; k < 2; k++) {
            const a = Math.atan2(victim.y - b.y, victim.x - b.x) + (k - 0.5) * 0.4;
            shots.push({ x: b.x + Math.cos(a) * 12, y: b.y + Math.sin(a) * 12, ang: a, seed: Math.random() * 999 });
          }
          ctx.capture(() => fx.latch(b.x, b.y));
        }
        const charge = Phaser.Math.Clamp(1 - (b.next - elapsed) / 700, 0, 1);
        bcell(g, ctx.tint, b.x, b.y, b.ang, 1, { t, seed: b.seed, charge });
      }

      ready = Math.max(0, ready - delta);
      rig?.setBrood(helper ? 0.2 : 0);
      gauge.setText(helper
        ? `T-cell out → click is a B-cell   ·   ${cells.length} crawling   ·   `
          + `${ready > 0 ? `${(ready / 1000).toFixed(1)}s` : 'READY'}   ·   ${stuck.length} antibodies stuck`
        : 'no T-cell — the click is an ordinary antibody');
    });

    ctx.at(300, () => readout.setText('the condition is a T-cell. Without one this is the ordinary click.'));
    ctx.at(1400, () => {
      helper = makeCell('tcell', ctx.cx + 34, ctx.cy + 44);
      av.play('flex');
      ctx.capture(() => fx.serum(ctx.cx, ctx.cy, 5, 20, 520));
      readout.setText('with one, every press pushes out a B-cell instead — and it takes no socket');
    });
    const release = (at: number): void => ctx.at(at, () => {
      const a = Math.atan2(victim.y - ctx.cy, victim.x - ctx.cx) + (Math.random() - 0.5) * 0.5;
      cells.push({
        x: ctx.cx + Math.cos(a) * 22, y: ctx.cy + Math.sin(a) * 22, ang: a,
        hp: 45, seed: Math.random() * 999, next: at + 3000,
      });
      ready = 5000;
      av.play('punch', a);
      ctx.capture(() => fx.serum(ctx.cx, ctx.cy, 5, 20, 520));
      float(ctx, ctx.cx, ctx.cy - 46, '🟡 B-CELL', hex(MRW.bcellLit), 12);
    });
    release(2400);
    ctx.at(3600, () => readout.setText('45 HP, 46 px/s, and five seconds between presses instead of 440ms'));
    ctx.at(5800, () => readout.setText('every 3 seconds it throws two homing antibodies at the nearest enemy'));
    release(7600);
    ctx.at(9600, () => readout.setText('they are real antibodies — 12 damage, and they latch on and stay'));
    ctx.at(12400, () => readout.setText('and the cell itself is 25 to the first body it crawls into'));
  },
};

// ══ E — Macrosma ══════════════════════════════════════════════════════

export const macrosma: PreviewScript = {
  duration: 15000,
  scale: 0.9,
  caption: 'E — 85 HP, 15 a bite, 5 HP back to both of you, and it eats structures whole',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MarrowAvatar(ctx.scene, ctx.tint));
    const rig = host(av);
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 230, y: ctx.cy + 4 };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#a9a0f2', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 16, '#f1e7d0', 10);

    let cell: Cell | null = null;
    /** A stand-in enemy structure, so the devour half has something to eat. */
    const turret = { x: ctx.cx + 120, y: ctx.cy + 58, alive: false };
    let hostHp = 300;
    let fever = 0;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const t = elapsed / 1000;
      g.clear();

      if (turret.alive) {
        g.fillStyle(ctx.tint(0x4a5568), 1);
        g.fillRect(turret.x - 11, turret.y - 6, 22, 14);
        g.fillStyle(ctx.tint(0x8e97ad), 1);
        g.fillRect(turret.x - 7, turret.y - 13, 14, 8);
        g.fillStyle(ctx.tint(0xc23a2e), 1);
        g.fillCircle(turret.x, turret.y - 9, 2.4);
      }

      if (cell) {
        cell.anim = Math.max(0, cell.anim - dt * 2.6);
        // 76 px/s, and it never gets anywhere fast. That is the whole character of the cell.
        const goal = turret.alive ? turret : victim;
        const d = step(cell, goal.x, goal.y, 76, dt);
        if (turret.alive && d < 46) {
          turret.alive = false;
          cell.anim = 1;
          hostHp = Math.min(400, hostHp + 25);
          ctx.capture(() => { fx.bite(turret.x, turret.y, cell!.ang, 30); fx.serum(ctx.cx, ctx.cy, 6, 22, 560); });
          float(ctx, turret.x, turret.y - 26, '🍽️ +25', hex(MRW.macroLit), 13);
        } else if (!turret.alive && d < 30 && elapsed >= cell.next) {
          cell.next = elapsed + 1100;
          cell.anim = 1;
          hostHp = Math.min(400, hostHp + 5);
          cell.hp = Math.min(cell.maxHp, cell.hp + 5);
          ctx.capture(() => fx.bite(victim.x, victim.y, cell!.ang));
          float(ctx, victim.x, victim.y - 24, '15', '#ffb3aa', 13);
          float(ctx, ctx.cx, ctx.cy - 34, '+5', hex(MRW.serum), 11);
        }
        // +2 inflammation a second against the bar's 2 a second drain: it pays for itself.
        fever = Phaser.Math.Clamp(fever + (2 - 2) * dt + 2 * dt, 0, 100);
        drawCell(ctx, g, cell, t);
        rig?.setBrood(0.2);
        rig?.setInflammation(fever / 100);
      }
      gauge.setText(cell
        ? `macrophage ${Math.round(cell.hp)}/85   ·   host ${Math.round(hostHp)}/400   ·   inflammation ${Math.round(fever)}`
        : 'no cells out');
    });

    ctx.at(300, () => readout.setText('E — one socket, 85 HP, 76 px/s. The slowest thing in the game.'));
    ctx.at(700, () => {
      cell = makeCell('macrophage', ctx.cx + 26, ctx.cy + 14);
      av.play('flex');
      ctx.capture(() => fx.serum(ctx.cx, ctx.cy, 5, 20, 520));
    });
    ctx.at(1400, () => { turret.alive = true; readout.setText('anything the enemy has *built* is eaten whole, not attacked'); });
    ctx.at(5200, () => readout.setText('25 HP to you and 25 to the cell, per object devoured'));
    ctx.at(7600, () => readout.setText('then it goes back to biting: 15 damage, 5 HP to it and 5 to you'));
    ctx.at(11000, () => readout.setText('and it pays +2 inflammation a second the whole time it is alive'));
  },
};

// ══ E+ — Cell Janitor ═════════════════════════════════════════════════

export const macrosmaUpgraded: PreviewScript = {
  duration: 16000,
  scale: 0.9,
  caption: 'E+ — red macrophages that clean up after your dead, and grow every time',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MarrowAvatar(ctx.scene, ctx.tint));
    const rig = host(av);
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 232, y: ctx.cy + 4 };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff8a6b', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 16, '#f1e7d0', 10);

    const janitor = { x: ctx.cx + 40, y: ctx.cy + 16, ang: 0, hp: 40, seed: 11, anim: 0, next: 0, sizes: 0 };
    /** The doomed cells: each one dying is what feeds the janitor. */
    const fodder: Cell[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const t = elapsed / 1000;
      g.clear();

      for (const c of fodder) {
        step(c, victim.x, victim.y, 168, dt);
        drawCell(ctx, g, c, t);
      }

      janitor.anim = Math.max(0, janitor.anim - dt * 2.6);
      const size = 1 + 0.09 * janitor.sizes;
      const reach = 30 + 3 * janitor.sizes;
      const want = Math.atan2(victim.y - janitor.y, victim.x - janitor.x);
      janitor.ang = Phaser.Math.Angle.RotateTo(janitor.ang, want, 6 * dt);
      const d = Phaser.Math.Distance.Between(janitor.x, janitor.y, victim.x, victim.y);
      if (d > reach) {
        janitor.x += Math.cos(janitor.ang) * 76 * dt;
        janitor.y += Math.sin(janitor.ang) * 76 * dt;
      } else if (elapsed >= janitor.next) {
        janitor.next = elapsed + 1100;
        janitor.anim = 1;
        const dmg = Math.round(15 * (1 + 0.12 * janitor.sizes));
        const feed = 5 + 2 * janitor.sizes;
        float(ctx, victim.x, victim.y - 26, `${dmg}`, '#ffb3aa', 14);
        float(ctx, ctx.cx, ctx.cy - 40, `💉 +${feed}`, hex(MRW.serum), 12);
        ctx.capture(() => fx.bite(victim.x, victim.y, janitor.ang, 22 * size));
      }

      // Red, and larger with every funeral. Both are the same one flag in the kit.
      g.fillStyle(ctx.tint(MRW.ink), 0.3);
      g.fillEllipse(janitor.x, janitor.y + 15 * size, 26 * size, 7);
      macrophage(g, ctx.tint, janitor.x, janitor.y, janitor.ang, 1,
        { t, seed: janitor.seed, chew: janitor.anim, size, red: 1 });
      const ratio = Phaser.Math.Clamp(janitor.hp / 85, 0, 1);
      if (ratio < 0.999) {
        const by = janitor.y - 24 * size;
        g.fillStyle(ctx.tint(MRW.ink), 0.7);
        g.fillRect(janitor.x - 11, by - 1, 22, 4);
        g.fillStyle(ctx.tint(MRW.inflame), 0.95);
        g.fillRect(janitor.x - 10, by, 20 * ratio, 2);
      }

      rig?.setBrood((1 + fodder.length) / 5);
      gauge.setText(`macrophage ${Math.round(janitor.hp)}/85   ·   size ${janitor.sizes}/5   ·   `
        + `bite ${Math.round(15 * (1 + 0.12 * janitor.sizes))}   ·   feed ${5 + 2 * janitor.sizes} HP each`);
    });

    /** A cell of yours dying — the only input the upgrade has. */
    const funeral = (at: number): void => ctx.at(at, () => {
      const c = fodder.shift();
      if (!c) return;
      ctx.capture(() => { fx.lyse(c.x, c.y, MRW.neut, 14); fx.serum(janitor.x, janitor.y, 4, 16, 460); });
      janitor.hp = 85;
      janitor.sizes = Math.min(5, janitor.sizes + 1);
      float(ctx, ctx.cx, ctx.cy - 52, '🧹 CELL JANITOR', hex(MRW.inflameLit), 12);
      float(ctx, janitor.x, janitor.y - 34, `+1 SIZE · FULL HP`, hex(MRW.inflame), 11);
    });

    ctx.at(300, () => readout.setText('the macrophage comes out red, and it is wounded — 40 of its 85'));
    ctx.at(1600, () => {
      for (let i = 0; i < 3; i++) fodder.push(makeCell('neutrophil', ctx.cx + 20 + i * 26, ctx.cy - 40 + i * 12));
      readout.setText('three neutrophils of your own, which are all going to die. That is the input.');
    });
    funeral(3400);
    ctx.at(4200, () => readout.setText('a full heal and a permanent size: +12% bite, +2 HP a bite to it and to you'));
    funeral(6400);
    funeral(9000);
    ctx.at(10200, () => readout.setText('three sizes in, the bite is 21 and each one feeds you 11 instead of 5'));
    ctx.at(13000, () => readout.setText('to a maximum of five — and a Mastacre going off is five funerals in five seconds'));
  },
};

// ══ R — Neutralize ════════════════════════════════════════════════════

export const neutralize: PreviewScript = {
  duration: 14000,
  scale: 0.9,
  caption: 'R — 30 HP and 25 a hit, and when it dies the web is the real ability',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MarrowAvatar(ctx.scene, ctx.tint));
    const rig = host(av);
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 250, y: ctx.cy };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#8ef0cd', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 16, '#d9e86b', 10);

    let cell: Cell | null = null;
    let web: { x: number; y: number; born: number; seed: number } | null = null;
    let tick = 0;
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const t = elapsed / 1000;
      g.clear();
      ground.clear();

      if (web) {
        const left = Phaser.Math.Clamp(1 - (elapsed - web.born) / 6000, 0, 1);
        if (left <= 0) { web = null; } else {
          netWeb(ground, ctx.tint, web.x, web.y, 130, 0.35 + left * 0.5, { t, seed: web.seed });
          tick += delta;
          while (tick >= 250) {
            tick -= 250;
            if (Phaser.Math.Distance.Between(web.x, web.y, victim.x, victim.y) <= 130) {
              float(ctx, victim.x + (Math.random() - 0.5) * 20, victim.y - 20, '1.25', '#d9e86b', 9);
            }
          }
          gauge.setText(`NET · 130px · ${left.toFixed(1)}s left · 5 dmg/s · 45% slower inside it`);
        }
      }

      if (cell) {
        cell.anim = Math.max(0, cell.anim - dt * 2.6);
        const d = step(cell, victim.x, victim.y, 168, dt);
        if (d < 26 && elapsed >= cell.next) {
          cell.next = elapsed + 1500;
          cell.anim = 1;
          ctx.capture(() => fx.spray(victim.x, victim.y, MRW.neut, 7, 24));
          float(ctx, victim.x, victim.y - 24, '25', '#ffb3aa', 15);
        }
        drawCell(ctx, g, cell, t);
        if (!web) gauge.setText(`neutrophil ${Math.round(cell.hp)}/30 HP   ·   168 px/s   ·   25 a hit`);
      }
    });

    ctx.at(300, () => readout.setText('R — one socket, 30 HP, and it hits harder than anything else you own'));
    ctx.at(600, () => {
      cell = makeCell('neutrophil', ctx.cx + 24, ctx.cy + 8);
      av.play('flex');
      rig?.setBrood(0.2);
      ctx.capture(() => fx.serum(ctx.cx, ctx.cy, 5, 20, 520));
    });
    ctx.at(5000, () => readout.setText('thirty hit points. It is supposed to lose them.'));
    // Shot down, on purpose — the web is what the ability was for.
    ctx.at(6600, () => {
      if (!cell) return;
      const c = cell;
      cell = null;
      web = { x: c.x, y: c.y, born: 6600, seed: Math.random() * 999 };
      tick = 0;
      rig?.setBrood(0);
      ctx.capture(() => { fx.lyse(c.x, c.y, MRW.neut, 14); fx.netSnap(c.x, c.y, 130); });
      float(ctx, c.x, c.y - 26, '🕸️ NET', hex(MRW.net), 13);
      readout.setText('killing it turns it inside out: 130px of spiked protein for 6 seconds');
    });
    ctx.at(9200, () => readout.setText('5 damage a second in ticks of 1.25, and 45% slower for as long as you stand in it'));
    ctx.at(12000, () => readout.setText('ignore it and it hits for 25. Shoot it and you own hostile floor instead.'));
  },
};

// ══ R+ — Cytokine Storm ═══════════════════════════════════════════════

export const neutralizeUpgraded: PreviewScript = {
  duration: 15000,
  scale: 0.9,
  caption: 'R+ — seven pellets a spray, 4 damage each, and +10% damage taken per pellet that lands',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MarrowAvatar(ctx.scene, ctx.tint));
    const rig = host(av);
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 210, y: ctx.cy };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#8ef0cd', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 16, '#8ef0cd', 10);

    let cell: Cell | null = null;
    let biter: Cell | null = null;
    const pellets: { x: number; y: number; vx: number; vy: number; seed: number; born: number }[] = [];
    let stacks = 0;
    let markUntil = 0;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const t = elapsed / 1000;
      g.clear();
      if (elapsed > markUntil) stacks = 0;

      for (let i = pellets.length - 1; i >= 0; i--) {
        const p = pellets[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (Phaser.Math.Distance.Between(p.x, p.y, victim.x, victim.y) <= 26) {
          pellets.splice(i, 1);
          stacks = Math.min(5, stacks + 1);
          markUntil = elapsed + 4000;
          float(ctx, victim.x + (Math.random() - 0.5) * 26, victim.y - 16, '4', '#a8f0e4', 10);
          continue;
        }
        if (elapsed - p.born > 620) { pellets.splice(i, 1); continue; }
        cytokine(g, ctx.tint, p.x, p.y, Math.atan2(p.vy, p.vx), 1, { seed: p.seed, t });
      }

      // The mark itself: a green ring that tightens as the four seconds run out.
      if (stacks > 0) {
        const left = Phaser.Math.Clamp((markUntil - elapsed) / 4000, 0, 1);
        g.lineStyle(1.4 + stacks * 0.5, ctx.tint(MRW.neut), 0.25 + left * 0.4);
        g.strokeCircle(victim.x, victim.y, 24 + (1 - left) * 6);
      }

      if (cell) {
        cell.anim = Math.max(0, cell.anim - dt * 2.6);
        const d = step(cell, victim.x, victim.y, 168, dt);
        if (d < 26 && elapsed >= cell.next) {
          cell.next = elapsed + 1500;
          cell.anim = 1;
          ctx.capture(() => fx.spray(victim.x, victim.y, MRW.neut, 7, 24));
          float(ctx, victim.x, victim.y - 30, `${Math.round(25 * (1 + 0.1 * stacks))}`, '#ffb3aa', 15);
        }
        drawCell(ctx, g, cell, t);
      }
      if (biter) {
        biter.anim = Math.max(0, biter.anim - dt * 2.6);
        const d = step(biter, victim.x, victim.y, 76, dt);
        if (d < 30 && elapsed >= biter.next) {
          biter.next = elapsed + 1100;
          biter.anim = 1;
          ctx.capture(() => fx.bite(victim.x, victim.y, biter!.ang));
          float(ctx, victim.x, victim.y - 44, `${Math.round(15 * (1 + 0.1 * stacks))}`, '#ffb3aa', 14);
        }
        drawCell(ctx, g, biter, t);
      }

      rig?.setBrood((cell ? 0.2 : 0) + (biter ? 0.2 : 0));
      gauge.setText(stacks > 0
        ? `🧪 ${stacks}/5 cytokines   ·   +${stacks * 10}% damage taken   ·   `
          + `${((markUntil - elapsed) / 1000).toFixed(1)}s left — any fresh pellet restarts it`
        : 'no mark — 4 damage a pellet is almost nothing on its own');
    });

    /** One spray: seven pellets in a 46° cone along the cell's own facing. */
    const spray = (at: number): void => ctx.at(at, () => {
      if (!cell) return;
      const c = cell;
      for (let i = 0; i < 7; i++) {
        const a = c.ang + ((i / 6) - 0.5) * 0.8;
        const s = 250 * (0.85 + Math.random() * 0.3);
        pellets.push({
          x: c.x + Math.cos(a) * 10, y: c.y + Math.sin(a) * 10,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s, seed: Math.random() * 999, born: at,
        });
      }
      ctx.capture(() => fx.cytoBlast(c.x, c.y, c.ang));
    });

    ctx.at(300, () => readout.setText('R+ — the neutrophil starts screaming chemically as well as stabbing'));
    ctx.at(700, () => {
      cell = makeCell('neutrophil', ctx.cx + 30, ctx.cy + 20);
      av.play('flex');
      ctx.capture(() => fx.serum(ctx.cx, ctx.cy, 5, 20, 520));
    });
    spray(2600);
    ctx.at(3000, () => readout.setText('seven pellets in a 46° cone along its facing — a spray, not a volley'));
    spray(5200);
    ctx.at(5600, () => readout.setText('each pellet that lands stacks +10% damage taken, up to +50% for 4 seconds'));
    ctx.at(7600, () => {
      biter = makeCell('macrophage', ctx.cx + 10, ctx.cy - 54);
      biter.next = 7600;
      readout.setText('and the mark is on the body, not on the pellet');
    });
    spray(7800);
    spray(10400);
    ctx.at(11000, () => readout.setText('so everything you own is hitting a target that is 50% softer'));
  },
};

// ══ F — Dendricles ════════════════════════════════════════════════════

export const dendricles: PreviewScript = {
  duration: 16000,
  scale: 0.9,
  caption: 'F — 5 tentacles at 5 each; land 4 on one body and the next cast is a T-cell',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MarrowAvatar(ctx.scene, ctx.tint));
    const rig = host(av);
    av.setFacing(ctx.aim);
    const near = { x: ctx.cx + 96, y: ctx.cy - 4 };
    dummyAt(ctx, near);
    const readout = label(ctx, ctx.w * 0.5, 12, '#b2ecff', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 16, '#f5788c', 10);

    const lashes: {
      x0: number; y0: number; x1: number; y1: number; showAt: number; born: number;
      seed: number; hit: boolean; a: number; i: number;
    }[] = [];
    let armed = false;
    const cells: Cell[] = [];
    let helper: Cell | null = null;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(10));
    let nowMs = 0;
    let tally = 0;

    /**
     * One press of the unarmed ability, aimed at (ax, ay). Every tentacle goes to that same
     * point and is only nudged sideways off the aim line, so where the cursor is decides the
     * hit count. It is whipped out a tentacle at a time — `showAt` is when each one leaves.
     */
    const lash = (ax: number, ay: number): number => {
      const aim = Math.atan2(ay - ctx.cy, ax - ctx.cx);
      const range = Math.min(150, Math.max(52, Phaser.Math.Distance.Between(ctx.cx, ctx.cy, ax, ay)));
      let hits = 0;
      for (let i = 0; i < 5; i++) {
        const off = (i - 2) * 11;
        const ex = ctx.cx + Math.cos(aim) * range - Math.sin(aim) * off;
        const ey = ctx.cy + Math.sin(aim) * range + Math.cos(aim) * off;
        const struck = Phaser.Math.Distance.Between(ex, ey, near.x, near.y) <= 26 + 8;
        if (struck) hits++;
        lashes.push({
          x0: ctx.cx, y0: ctx.cy, x1: ex, y1: ey, showAt: nowMs + i * 90, born: 0,
          seed: Math.random() * 999, hit: struck, a: Math.atan2(ey - ctx.cy, ex - ctx.cx), i,
        });
      }
      return hits;
    };

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const t = elapsed / 1000;
      nowMs = elapsed;
      g.clear();

      for (let i = lashes.length - 1; i >= 0; i--) {
        const l = lashes[i];
        if (elapsed < l.showAt) continue;
        if (l.born === 0) {
          l.born = elapsed;
          av.play('sweep', l.a);
          if (l.hit) float(ctx, near.x + (l.i - 2) * 9, near.y - 18, '5', '#ffb3aa', 11);
        }
        const k = Phaser.Math.Clamp(1 - (elapsed - l.born) / 260, 0, 1);
        if (k <= 0) { lashes.splice(i, 1); continue; }
        dendrite(g, ctx.tint, l.x0, l.y0, l.x1, l.y1, 0.3 + k * 0.7,
          { seed: l.seed, grip: 0.5 + k * 0.5, hit: l.hit });
      }

      // The T-cell, once it exists: it walks to the patient and hands things over.
      if (helper) {
        const p = cells.find((c) => c !== helper);
        if (p) {
          const d = Phaser.Math.Distance.Between(helper.x, helper.y, p.x, p.y);
          if (d > 34) { helper.reach = Math.max(0, helper.reach - dt * 3); step(helper, p.x, p.y, 122, dt); } else {
            helper.ang = Math.atan2(p.y - helper.y, p.x - helper.x);
            helper.reach = Math.min(1, helper.reach + dt * 4);
            if (helper.reach >= 1 && elapsed >= helper.next) {
              helper.next = elapsed + 1600;
              if (!p.buffed) {
                p.buffed = true;
                float(ctx, p.x, p.y - 28, '🧬 +25% SPD  +50% DMG', hex(MRW.tcellLit), 10);
              } else {
                const heal = Math.max(3, Math.round(25 * 0.6 ** Math.max(0, Math.round((elapsed - 11000) / 1600))));
                p.hp = Math.min(p.maxHp, p.hp + heal);
                float(ctx, p.x, p.y - 18, `💚 +${heal}`, hex(MRW.serum), 11);
              }
              ctx.capture(() => fx.serum(p.x, p.y, 6, 20, 520));
            }
          }
        }
      }

      for (const c of cells) {
        if (c === helper) continue;
        step(c, near.x, near.y, 168 * (c.buffed ? 1.25 : 1), dt);
        drawCell(ctx, g, c, t);
      }
      if (helper) {
        const p = cells.find((c) => c !== helper);
        drawCell(ctx, g, helper, t, p ? { x: p.x, y: p.y } : null);
      }
      gauge.setText(armed
        ? 'ARMED — the next F is a 50 HP T-cell and takes a socket'
        : 'unarmed — 5 damage a tentacle, 150px maximum reach');
    });

    ctx.at(300, () => readout.setText('one tentacle at a time, all five at the cursor — let it sit off the body and the far side misses'));
    ctx.at(900, () => { tally = lash(ctx.cx + 80, ctx.cy - 32); });
    // 90ms a tentacle, so the count is only true once the fifth one has been out.
    ctx.at(1400, () => float(ctx, ctx.cx, ctx.cy - 46, `${tally}/5`, '#f5788c', 13));
    ctx.at(3000, () => readout.setText('cursor on them and the whole bundle lands — and four on one body transforms the ability'));
    ctx.at(3800, () => { tally = lash(near.x, near.y); });
    ctx.at(4300, () => {
      float(ctx, ctx.cx, ctx.cy - 46, `${tally}/5`, hex(MRW.tcellLit), 15);
      if (tally >= 4) {
        armed = true;
        ctx.capture(() => fx.serum(ctx.cx, ctx.cy - 10, 8, 26, 700));
        float(ctx, ctx.cx, ctx.cy - 62, '🧬 T-CELL READY', hex(MRW.tcellLit), 12);
      }
    });
    ctx.at(6000, () => {
      cells.push(makeCell('neutrophil', ctx.cx + 40, ctx.cy + 46));
      cells[0].hp = 14;
      readout.setText('a wounded cell of your own, for the T-cell to find');
    });
    ctx.at(8000, () => {
      armed = false;
      helper = makeCell('tcell', ctx.cx + 20, ctx.cy - 40);
      cells.push(helper);
      av.play('flex');
      rig?.setBrood(0.4);
      ctx.capture(() => fx.serum(ctx.cx, ctx.cy, 5, 20, 520));
      readout.setText('the T-cell never fights — it walks to whoever needs it and extends a tentacle');
    });
    ctx.at(11000, () => readout.setText('+25% speed and +50% damage, once, permanently'));
    ctx.at(13000, () => readout.setText('and 25 HP on top, then 15, then 9, then 5 — every 1.6 seconds'));
  },
};

// ══ F+ — Killer T ═════════════════════════════════════════════════════

export const dendriclesUpgraded: PreviewScript = {
  duration: 16000,
  scale: 0.9,
  caption: 'F+ — press F again inside 2.5s and the medic you just made turns killer',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MarrowAvatar(ctx.scene, ctx.tint));
    const rig = host(av);
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 250, y: ctx.cy - 6 };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#7fd2ee', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 16, '#7fd2ee', 10);

    const cell = {
      x: ctx.cx + 30, y: ctx.cy + 30, ang: 0, hp: 50, max: 50, seed: 7,
      killer: false, out: false, anim: 0, dash: 0, next: 0, nextDash: 0, buffed: false,
    };
    let windowUntil = 0;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(10));

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const t = elapsed / 1000;
      g.clear();
      if (!cell.out) { gauge.setText('no cell out'); return; }

      cell.anim = Math.max(0, cell.anim - dt * 2.6);
      cell.dash = Math.max(0, cell.dash - dt * 3);
      const speed = (cell.killer ? 138 : 122) * (cell.buffed ? 1.25 : 1);
      const reach = cell.killer ? 62 : 34;
      const want = Math.atan2(victim.y - cell.y, victim.x - cell.x);
      cell.ang = Phaser.Math.Angle.RotateTo(cell.ang, want, 6 * dt);
      const d = Phaser.Math.Distance.Between(cell.x, cell.y, victim.x, victim.y);

      if (!cell.killer) {
        // The medic simply drifts: it has nothing to nurse and it never fights.
        cell.x += Math.cos(t * 0.9) * 14 * dt;
        cell.y += Math.sin(t * 0.9) * 10 * dt;
      } else if (d > reach) {
        cell.x += Math.cos(cell.ang) * speed * dt;
        cell.y += Math.sin(cell.ang) * speed * dt;
      } else {
        if (elapsed >= cell.next) {
          cell.next = elapsed + 1250;
          cell.anim = 1;
          float(ctx, victim.x, victim.y - 26, `${Math.round(28 * (cell.buffed ? 1.5 : 1))}`, '#ffb3aa', 15);
          ctx.capture(() => fx.spray(victim.x, victim.y, MRW.killerLit, 8, 26));
        }
        if (elapsed >= cell.nextDash) {
          cell.nextDash = elapsed + 5000;
          cell.dash = 1;
          const x0 = cell.x;
          const y0 = cell.y;
          cell.x += Math.cos(cell.ang) * 190;
          cell.y += Math.sin(cell.ang) * 190;
          float(ctx, victim.x, victim.y - 44, '22', hex(MRW.killerLit), 14);
          ctx.capture(() => fx.lunge(x0, y0, cell.x, cell.y));
        }
      }

      g.fillStyle(ctx.tint(MRW.ink), 0.3);
      g.fillEllipse(cell.x, cell.y + 13, 20, 6);
      if (cell.killer) {
        killerT(g, ctx.tint, cell.x, cell.y, cell.ang, 1,
          { t, seed: cell.seed, strike: cell.anim, dash: cell.dash });
      } else {
        tcell(g, ctx.tint, cell.x, cell.y, cell.ang, 1, { t, seed: cell.seed });
      }
      if (cell.buffed) {
        g.lineStyle(1.6, ctx.tint(MRW.tcellLit), 0.6 + 0.25 * Math.sin(t * 4));
        g.strokeCircle(cell.x, cell.y, 16);
      }

      const left = Math.max(0, windowUntil - elapsed);
      gauge.setText(left > 0
        ? `⚔️ F HANDED BACK — ${(left / 1000).toFixed(1)}s to press it again`
        : cell.killer
          ? `killer T ${cell.hp}/125 HP   ·   28 a strike at 62px   ·   lunge every 5s for 22`
          : 'T-cell 50/50 HP — it will never attack anything');
    });

    ctx.at(300, () => readout.setText('the armed F still summons an ordinary 50 HP T-cell'));
    ctx.at(1000, () => {
      cell.out = true;
      windowUntil = 3500;
      av.play('flex');
      rig?.setBrood(0.2);
      ctx.capture(() => fx.serum(ctx.cx, ctx.cy, 5, 20, 520));
      float(ctx, cell.x, cell.y - 30, '⚔️ F AGAIN — KILLER T', hex(MRW.killerLit), 11);
      readout.setText('but the cooldown is handed straight back for 2.5 seconds');
    });
    ctx.at(2800, () => {
      windowUntil = 0;
      cell.killer = true;
      cell.hp = 125;
      cell.max = 125;
      cell.nextDash = 5600;
      ctx.capture(() => { fx.lyse(cell.x, cell.y, MRW.killerLit, 18); fx.serum(cell.x, cell.y, 8, 26, 620); });
      float(ctx, cell.x, cell.y - 30, '⚔️ KILLER T', hex(MRW.killerLit), 14);
      readout.setText('press it again and the medic turns: 125 HP, and it goes for them instead');
    });
    ctx.at(5000, () => readout.setText('28 a strike at 62px — medium range, not melee'));
    ctx.at(7200, () => readout.setText('and every 5 seconds it lunges 190px clean through them for 22 more'));
    ctx.at(10000, () => {
      cell.buffed = true;
      float(ctx, cell.x, cell.y - 30, '🧬 +25% SPD  +50% DMG', hex(MRW.tcellLit), 10);
      readout.setText('it is still a cell — another T-cell buffs it like anything else');
    });
    ctx.at(13000, () => readout.setText('let the window lapse instead and F simply goes back on its 6.5 seconds'));
  },
};

// ══ Q — Mastacre ══════════════════════════════════════════════════════

export const mastacre: PreviewScript = {
  duration: 13000,
  scale: 0.8,
  caption: 'Q — 5 homing bombs, 25 damage each inside 120px, and +100 inflammation',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MarrowAvatar(ctx.scene, ctx.tint));
    const rig = host(av);
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 300, y: ctx.cy + 10 };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ffb3d8', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 16, '#ff8a6b', 10);

    const masts: { x: number; y: number; born: number; seed: number }[] = [];
    let fever = 0;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const t = elapsed / 1000;
      g.clear();
      fever = Math.max(0, fever - 2 * dt);

      for (let i = masts.length - 1; i >= 0; i--) {
        const m = masts[i];
        const fuse = Phaser.Math.Clamp(1 - (elapsed - m.born) / 5000, 0, 1);
        if (fuse <= 0) {
          masts.splice(i, 1);
          fever = Phaser.Math.Clamp(fever + 20, 0, 100);
          ctx.capture(() => fx.degranulate(m.x, m.y, 120));
          if (Phaser.Math.Distance.Between(m.x, m.y, victim.x, victim.y) <= 120) {
            float(ctx, victim.x + (Math.random() - 0.5) * 24, victim.y - 24, '25', '#ffb3aa', 15);
          }
          float(ctx, m.x, m.y - 30, '🔥 +20', hex(MRW.inflameLit), 12);
          continue;
        }
        const a = Math.atan2(victim.y - m.y, victim.x - m.x);
        m.x += Math.cos(a) * 108 * dt;
        m.y += Math.sin(a) * 108 * dt;
        mastCell(g, ctx.tint, m.x, m.y, 1, { t, seed: m.seed, fuse });
      }

      rig?.setInflammation(fever / 100);
      gauge.setText(`${masts.length} on the fuse   ·   inflammation ${Math.round(fever)}/100`
        + `   ·   +${(4 * fever / 100).toFixed(1)} HP/s   ·   SPD ×${(1 + 0.3 * fever / 100).toFixed(2)}`);
    });

    ctx.at(300, () => readout.setText('Q — five mast cells, and none of them take a socket'));
    ctx.at(900, () => {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        masts.push({ x: ctx.cx + Math.cos(a) * 26, y: ctx.cy + Math.sin(a) * 26, born: 900, seed: Math.random() * 999 });
      }
      av.play('raise');
      ctx.capture(() => fx.serum(ctx.cx, ctx.cy, 12, 40, 800));
      float(ctx, ctx.cx, ctx.cy - 54, '💥 MASTACRE', hex(MRW.mastLit), 14);
    });
    ctx.at(2600, () => readout.setText('108 px/s, homing, and they glow hotter as the five seconds run out'));
    ctx.at(5200, () => readout.setText('25 damage each inside 120px — 125 to anything all five reach'));
    ctx.at(6600, () => readout.setText('and 20 inflammation per detonation: the whole bar, from empty'));
    ctx.at(9000, () => readout.setText('a full bar is 4 HP a second and +30% speed for the next fifty seconds'));
  },
};

// ══ Q+ — Autoimmunity ═════════════════════════════════════════════════

export const mastacreUpgraded: PreviewScript = {
  duration: 17000,
  scale: 0.85,
  caption: 'Q+ — cast it above 50 inflammation and the overflow turns your own board red',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MarrowAvatar(ctx.scene, ctx.tint));
    const rig = host(av);
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 240, y: ctx.cy + 6, alive: true };
    dummyAt(ctx, victim, 5, () => victim.alive);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff3b3b', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 16, '#ff8a6b', 10);

    const cells = [makeCell('macrophage', ctx.cx + 46, ctx.cy + 34), makeCell('neutrophil', ctx.cx + 20, ctx.cy - 40)];
    const masts: { x: number; y: number; born: number; seed: number }[] = [];
    let fever = 60;
    let autoUntil = 0;
    let hostHp = 400;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const t = elapsed / 1000;
      g.clear();
      const auto = elapsed < autoUntil;
      // Pinned at 100 for the ten seconds; an ordinary bar the rest of the time.
      fever = auto ? 100 : Math.max(0, fever - 2 * dt);
      const red = auto ? 1 : 0;

      for (let i = masts.length - 1; i >= 0; i--) {
        const m = masts[i];
        const fuse = Phaser.Math.Clamp(1 - (elapsed - m.born) / 5000, 0, 1);
        if (fuse <= 0) {
          masts.splice(i, 1);
          ctx.capture(() => fx.degranulate(m.x, m.y, 120));
          if (victim.alive && Phaser.Math.Distance.Between(m.x, m.y, victim.x, victim.y) <= 120) {
            float(ctx, victim.x, victim.y - 24, `${auto ? 50 : 25}`, '#ffb3aa', 15);
          }
          continue;
        }
        const goal = victim.alive ? victim : { x: ctx.cx, y: ctx.cy };
        const a = Math.atan2(goal.y - m.y, goal.x - m.x);
        m.x += Math.cos(a) * 108 * dt;
        m.y += Math.sin(a) * 108 * dt;
        mastCell(g, ctx.tint, m.x, m.y, 1, { t, seed: m.seed, fuse, red });
      }

      for (const c of cells) {
        c.anim = Math.max(0, c.anim - dt * 2.6);
        // The warning label: with nothing left alive to fight, a red cell walks at you.
        const goal = victim.alive ? victim : { x: ctx.cx, y: ctx.cy };
        const reach = c.kind === 'macrophage' ? 30 : 26;
        const d = step(c, goal.x, goal.y, (c.kind === 'macrophage' ? 76 : 168) * (auto ? 1.3 : 1), dt);
        if (d <= reach && elapsed >= c.next) {
          c.next = elapsed + (c.kind === 'macrophage' ? 1100 : 1500) * (auto ? 0.7 : 1);
          c.anim = 1;
          const dmg = (c.kind === 'macrophage' ? 15 : 25) * (auto ? 2 : 1);
          float(ctx, goal.x, goal.y - 26, `${dmg}`, victim.alive ? '#ffb3aa' : '#ff3b3b', 14);
          if (!victim.alive) hostHp = Math.max(1, hostHp - dmg);
          ctx.capture(() => fx.spray(goal.x, goal.y, auto ? MRW.inflame : MRW.neut, 6, 22));
          // And half of every red strike splashes onto whatever of yours is standing in it.
          if (auto && victim.alive) {
            const other = cells.find((o) => o !== c);
            if (other && Phaser.Math.Distance.Between(c.x, c.y, other.x, other.y) <= reach + 12) {
              other.hp = Math.max(1, other.hp - dmg * 0.5);
              float(ctx, other.x, other.y - 16, `${dmg * 0.5}`, hex(MRW.inflame), 10);
            }
          }
        }
        if (c.kind === 'macrophage') {
          g.fillStyle(ctx.tint(MRW.ink), 0.3);
          g.fillEllipse(c.x, c.y + 15, 26, 7);
          macrophage(g, ctx.tint, c.x, c.y, c.ang, 1, { t, seed: c.seed, chew: c.anim, red });
        } else {
          neutrophil(g, ctx.tint, c.x, c.y, c.ang, 1, { t, seed: c.seed, dash: 0.4 + c.anim * 0.6, red });
        }
      }

      rig?.setInflammation(fever / 100);
      rig?.setBrood(cells.length / 5);
      av.setIntensity(auto ? 1.4 : 1);
      gauge.setText(auto
        ? `🩸 AUTOIMMUNE ${((autoUntil - elapsed) / 1000).toFixed(1)}s   ·   inflammation PINNED 100/100`
          + `   ·   cells ×2 damage, ×1.3 speed   ·   host ${Math.round(hostHp)}/400`
        : `inflammation ${Math.round(fever)}/100   ·   50 or more is what arms it`);
    });

    ctx.at(300, () => readout.setText('the bar is at 60 — and five detonations are worth 100'));
    ctx.at(1800, () => readout.setText('60 + 100 is 150 on a meter that stops at 100. The overflow has to go somewhere.'));
    ctx.at(3200, () => {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        masts.push({ x: ctx.cx + Math.cos(a) * 26, y: ctx.cy + Math.sin(a) * 26, born: 3200, seed: Math.random() * 999 });
      }
      autoUntil = 13200;
      av.play('raise');
      ctx.capture(() => { fx.inflame(ctx.cx, ctx.cy, 46); fx.degranulate(ctx.cx, ctx.cy, 90); });
      float(ctx, ctx.cx, ctx.cy - 66, '🩸 AUTOIMMUNITY', hex(MRW.inflame), 15);
      readout.setText('10 seconds: every cell red, ×2 damage, 30% faster, swinging 30% sooner');
    });
    ctx.at(6000, () => readout.setText('and half of every strike splashes onto your own cells and onto you'));
    ctx.at(9200, () => {
      victim.alive = false;
      readout.setText('with nothing left alive to fight, they come for you on purpose');
    });
    ctx.at(13400, () => readout.setText('then the bar unpins at a full 100 and starts draining again'));
  },
};

// ══ PASSIVE — The Bone Bar ════════════════════════════════════════════

export const theBoneBar: PreviewScript = {
  duration: 15000,
  scale: 0.9,
  caption: 'Five sockets, three kinds of cell, and a sixth cast that is simply refused',
  run(ctx) {
    const av = ctx.useAvatar(() => new MarrowAvatar(ctx.scene, ctx.tint));
    const rig = host(av);
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#f1e7d0', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 16, '#c3b596', 10);

    const filled: { kind: Exclude<CellKind, 'mast'>; hp: number; max: number; buffed: boolean }[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(22));

    ctx.onFrame((_delta, elapsed) => {
      const t = elapsed / 1000;
      g.clear();

      // The real HUD, at the real proportions: a length of bone with five sockets drilled in it.
      const W = 206;
      const H = 22;
      const x = ctx.w * 0.5 - W / 2;
      const y = 34;
      boneShaft(g, ctx.tint, x, y, W, H, 1);
      for (let i = 0; i < 5; i++) {
        const sx = x + 21 + i * ((W - 42) / 4);
        const sy = y + H / 2;
        const c = filled[i];
        g.fillStyle(ctx.tint(MRW.boneDeep), 0.95);
        g.fillCircle(sx, sy, 9.5);
        g.fillStyle(ctx.tint(MRW.deep), 1);
        g.fillCircle(sx, sy, 8);
        if (!c) {
          g.lineStyle(1, ctx.tint(MRW.boneShade), 0.5);
          g.strokeCircle(sx, sy, 5.5);
          continue;
        }
        cellGlyph(g, ctx.tint, c.kind, sx, sy, 6.4, 1, { t: t + i });
        g.lineStyle(2, ctx.tint(CELL_TINT[c.kind]), 0.9);
        g.beginPath();
        g.arc(sx, sy, 9.5, -Math.PI / 2, -Math.PI / 2 + (c.hp / c.max) * Math.PI * 2, false);
        g.strokePath();
        if (c.buffed) {
          g.lineStyle(1, ctx.tint(MRW.tcellLit), 0.85);
          g.strokeCircle(sx, sy, 11.5);
        }
      }

      // The same three cells, drawn full size underneath, so the glyphs are legible as cells.
      const kinds: Exclude<CellKind, 'mast'>[] = ['macrophage', 'neutrophil', 'tcell'];
      for (let i = 0; i < 3; i++) {
        const px = ctx.w * 0.5 + (i - 1) * 84;
        const py = ctx.cy + 54;
        const a = Math.sin(t * 1.2 + i) * 0.6;
        if (kinds[i] === 'macrophage') macrophage(g, ctx.tint, px, py, a, 1, { t, seed: i * 31 });
        else if (kinds[i] === 'neutrophil') neutrophil(g, ctx.tint, px, py, a, 1, { t, seed: i * 31, dash: 0.5 });
        else tcell(g, ctx.tint, px, py, a, 1, { t, seed: i * 31 });
      }

      rig?.setBrood(filled.length / 5);
      gauge.setText(`${filled.length}/5 sockets   ·   macrophage 85 HP   ·   neutrophil 30 HP   ·   T-cell 50 HP`);
    });

    const fill = (at: number, kind: Exclude<CellKind, 'mast'>, hp = 1): void => ctx.at(at, () => {
      if (filled.length >= 5) {
        float(ctx, ctx.cx, ctx.cy - 40, '🦴 BONE BAR FULL', hex(MRW.boneShade), 13);
        return;
      }
      const max = kind === 'macrophage' ? 85 : kind === 'neutrophil' ? 30 : 50;
      filled.push({ kind, hp: max * hp, max, buffed: false });
      av.play('flex');
    });

    ctx.at(300, () => readout.setText('five sockets, and each holds exactly one cell'));
    fill(900, 'macrophage');
    fill(1900, 'neutrophil');
    fill(2900, 'neutrophil', 0.4);
    ctx.at(3800, () => readout.setText('the ring around each socket is that cell\'s own health'));
    fill(4600, 'tcell');
    ctx.at(5800, () => {
      for (const c of filled) if (c.kind === 'neutrophil') c.buffed = true;
      readout.setText('a cyan collar means a T-cell has already buffed it — once each, permanently');
    });
    fill(7600, 'macrophage');
    ctx.at(8800, () => readout.setText('full. From here every summon cast is refused and refunded, not queued.'));
    fill(9800, 'neutrophil');
    fill(11400, 'macrophage');
    ctx.at(12800, () => readout.setText('which makes the last socket the most expensive thing you own'));
  },
};

// ══ PASSIVE — Inflammation ════════════════════════════════════════════

export const inflammation: PreviewScript = {
  duration: 16000,
  scale: 0.9,
  caption: 'The only bar in the game that fills because you are losing — and it heals you for it',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MarrowAvatar(ctx.scene, ctx.tint));
    const rig = host(av);
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff8a6b', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 16, '#f1e7d0', 10);

    let fever = 0;
    let macros = 0;
    let hp = 250;
    let accum = 0;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(22));

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const t = elapsed / 1000;
      g.clear();

      fever = Phaser.Math.Clamp(fever + (macros * 2 - 2) * dt, 0, 100);
      const k = fever / 100;
      accum += 4 * k * dt;
      while (accum >= 1) { accum -= 1; hp = Math.min(400, hp + 1); }

      // The red bar, at the proportions the HUD actually uses.
      const W = 206;
      const bh = 10;
      const x = ctx.w * 0.5 - W / 2;
      const y = 40;
      g.fillStyle(ctx.tint(MRW.ink), 0.85);
      g.fillRoundedRect(x - 3, y - 3, W + 6, bh + 6, 4);
      g.lineStyle(1.4, ctx.tint(k > 0.66 ? MRW.inflame : MRW.marrowDeep), 0.75);
      g.strokeRoundedRect(x - 3, y - 3, W + 6, bh + 6, 4);
      g.fillStyle(ctx.tint(MRW.deep), 1);
      g.fillRect(x, y, W, bh);
      g.fillStyle(ctx.tint(MRW.marrow), 1);
      g.fillRect(x, y, W * k, bh);
      g.fillStyle(ctx.tint(MRW.inflame), 0.55 + 0.35 * Math.sin(t * 6) * k);
      g.fillRect(x, y, W * k, bh * 0.45);
      g.lineStyle(1, ctx.tint(MRW.ink), 0.6);
      for (let i = 1; i < 4; i++) g.lineBetween(x + (W * i) / 4, y, x + (W * i) / 4, y + bh);

      for (let i = 0; i < macros; i++) {
        const a = t * 0.6 + (i / Math.max(1, macros)) * Math.PI * 2;
        macrophage(g, ctx.tint, ctx.cx + Math.cos(a) * 66, ctx.cy + Math.sin(a) * 40, a, 1,
          { t, seed: i * 17 });
      }

      rig?.setInflammation(k);
      rig?.setBrood(macros / 5);
      av.setIntensity(k > 0.6 ? 1.3 : 1);
      gauge.setText(`inflammation ${Math.round(fever)}/100   ·   host ${Math.round(hp)}/400 `
        + `(+${(4 * k).toFixed(1)}/s)   ·   cells +${(3 * k).toFixed(1)}/s   ·   SPD ×${(1 + 0.3 * k).toFixed(2)}`);
    });

    /** A hit landing on the host: 20 damage is worth 5 points of fever. */
    const hit = (at: number): void => ctx.at(at, () => {
      hp = Math.max(1, hp - 20);
      fever = Phaser.Math.Clamp(fever + 5, 0, 100);
      ctx.capture(() => { fx.inflame(ctx.cx, ctx.cy, 28); fx.spray(ctx.cx, ctx.cy, MRW.marrow, 5, 18); });
      float(ctx, ctx.cx, ctx.cy - 52, '🔥 +5', hex(MRW.inflameLit), 12);
    });

    ctx.at(300, () => readout.setText('it drains 2 a second, always. Doing nothing empties it.'));
    for (let i = 0; i < 6; i++) hit(1200 + i * 520);
    ctx.at(1200, () => readout.setText('every 20 damage you take is worth 5 — counted before your own armour'));
    ctx.at(4800, () => {
      macros = 2;
      readout.setText('two macrophages pay +2 a second each, which beats the drain on its own');
    });
    for (let i = 0; i < 8; i++) hit(6200 + i * 420);
    ctx.at(9800, () => readout.setText('at a full bar: 4 HP a second on you, 3 on every cell, and +30% speed'));
    ctx.at(12500, () => { macros = 0; readout.setText('and fifty seconds of it left once the macrophages are gone'); });
  },
};
