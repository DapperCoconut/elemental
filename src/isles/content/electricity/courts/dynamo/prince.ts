import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import type { Pt } from '../../../../IslesTypes';
import { dim, glow, lit, mulberry } from '../../../../art/IsleArt';
import { bolt, cablePoints, leydenBank, poly, pylon, sparks } from './art';
import {
  ARC, ARC_CORE, ARC_VIOLET, BASALT, BASALT_DARK, BASALT_LIT, BRICK, BRICK_DARK, COPPER, COPPER_DARK, COPPER_LIT, FOIL,
  GLASS, GLASS_LIT, INSULATOR, INSULATOR_LIT, IRON, IRON_DARK, IRON_LIT, RIVET, SPARK, VOLT, VOLT_DARK, VOLT_LIT, BRASS, BRASS_LIT,
} from './palette';
import { clamp, dist, segDist } from './util';

/**
 * Prince Volt, the Live Wire — Empress Ohmrine's son, governor of the Dynamo Court.
 *
 * Volt has never once stood still. He was a boy frightened of the dark, and his mother told him:
 * then never let it be dark. So he runs — down from the hall to watch the Bell every night, up and
 * down the race, round the treadwheels faster than the cranks — and he governs the court the same
 * way, as a race he cannot believe anybody loses except by being slow. He fights like current:
 *
 * • **Live Wire** (rushing): he dashes pylon to pylon, planting a little lattice pylon at every stop
 *   and stringing live cable behind him, then closes the loop; raises a Jacob's ladder either side
 *   of you, an arc climbing between the horns; and drops Leyden jars that charge and jump.
 * • **Generator** (anchored, cold): he plants himself in the great dynamo and spins it up — spokes
 *   of arc sweeping round the hall, speeding, stalling, and reversing — between jars and ladders.
 * • **Blackout** (hard, blinking, in the dark): the hall's power fails. Only his crackle shows, and
 *   the forks of lightning he calls down one after another on wherever you are going to be.
 */

const TOP = 96;

/** The phase the rig was last drawn in — read by the moves that change with the phase. */
let phaseNow = 0;

const hitTick = (tk: BossToolkit, n: number, slow?: number) => { const p = tk.player; tk.hitPlayer(n, p.x, p.y); if (slow) tk.slowPlayer(slow, 600); };
const playerLive = (tk: BossToolkit) => tk.player.active && tk.player.hp > 0;

// ── Signature: Live Wire ─────────────────────────────────────────────
// He dashes from point to point round the hall, the last leg straight at you. Wherever he stops
// he plants a pylon, and the cable strung behind him from the last pylon goes live for a few
// seconds; when the last pylon is planted the loop closes. Never cross a live cable.

interface Cable { a: Pt; b: Pt; liveAt: number; until: number }

const liveWire = (tk: BossToolkit): SignatureMove => {
  const legs = () => (tk.hard ? 5 : 4);
  const legMs = () => tk.warn(380) + 240 + 90;
  let pylons: { x: number; y: number; at: number }[] = [];
  let cables: Cable[] = [];
  let tickAt = 0;
  let pending: Pt[] = [];
  const clampPt = (x: number, y: number): Pt => ({ x: clamp(x, 90, tk.W - 90), y: clamp(y, TOP + 90, tk.H - 90) });

  function plant(p: Pt, last: boolean): void {
    const now = tk.now;
    const prev = pylons[pylons.length - 1];
    pylons.push({ ...p, at: now });
    tk.sfx('stone-rise');
    if (prev) cables.push({ a: { x: prev.x, y: prev.y }, b: p, liveAt: now + 160, until: now + 3400 });
    if (last && pylons.length > 2) {
      const first = pylons[0];
      cables.push({ a: p, b: { x: first.x, y: first.y }, liveAt: now + 300, until: now + 2600 });
      tk.sfx('plasma-arc');
    }
  }

  return {
    get durationMs() { return legs() * legMs() + 400; },
    windupMs: 500,
    gesture: 'point',
    hold: 'reach',
    locksBody: true,
    tell: 'LIVE WIRE',
    cast() {
      pylons = []; cables = [];
      const cx = tk.W / 2, cy = (TOP + tk.H) / 2;
      const n = legs();
      const a0 = Math.atan2(tk.bossY - cy, tk.bossX - cx);
      const dir = Math.random() < 0.5 ? 1 : -1;
      // The boss's own spot is the first pylon.
      plant(clampPt(tk.bossX, tk.bossY), false);
      pending = [];
      for (let i = 1; i <= n; i++) {
        const a = a0 + dir * (i / (n + 1)) * Math.PI * 2;
        pending.push(clampPt(cx + Math.cos(a) * 320, cy + Math.sin(a) * 170));
      }
      for (let i = 0; i < n; i++) {
        tk.schedule(i * legMs(), () => {
          // The last leg goes straight at you.
          const last = i === n - 1;
          const to = last && playerLive(tk) ? clampPt(tk.player.x, tk.player.y) : pending[i];
          tk.spawnCharge({ toX: to.x, toY: to.y, warnMs: 380, travelMs: 240, halfW: 26, damage: 10 });
          tk.schedule(tk.warn(380) + 240, () => plant(to, last));
        });
      }
    },
    update(time) {
      if (!cables.length) return;
      const p = tk.player;
      if (playerLive(tk) && time - tickAt > 450) {
        for (const c of cables) {
          if (time < c.liveAt || time > c.until) continue;
          if (segDist(p.x, p.y, c.a.x, c.a.y, c.b.x, c.b.y) < 26) { tickAt = time; hitTick(tk, 6, 0.6); tk.sfx('zap'); break; }
        }
      }
      cables = cables.filter((c) => time < c.until + 400);
      if (!cables.length) pylons = [];
    },
    drawGround(g, time) {
      for (const c of cables) {
        if (time > c.until) continue;
        const live = time >= c.liveAt;
        // The cable's shadow on the floor, and the ground it owns.
        g.lineStyle(26, live ? ARC : COPPER, live ? 0.07 : 0.04); g.lineBetween(c.a.x, c.a.y, c.b.x, c.b.y);
      }
      for (const p of pylons) { g.fillStyle(0x000000, 0.3); g.fillEllipse(p.x, p.y + 4, 46, 12); }
    },
    drawAir(g, time) {
      for (const p of pylons) {
        const k = clamp((time - p.at) / 200, 0, 1);
        pylon(g, p.x, p.y + 6, 56 * k);
      }
      for (const c of cables) {
        if (time > c.until + 400) continue;
        const fade = time > c.until ? 1 - (time - c.until) / 400 : 1;
        const a = { x: c.a.x, y: c.a.y - 40 }, b = { x: c.b.x, y: c.b.y - 40 };
        const pts = cablePoints(a, b, 18, 14);
        g.lineStyle(3, 0x101114, fade); g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const q of pts) g.lineTo(q.x, q.y); g.strokePath();
        g.lineStyle(1.5, COPPER_LIT, fade); g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const q of pts) g.lineTo(q.x, q.y); g.strokePath();
        if (time >= c.liveAt && time <= c.until) {
          // Live: arcs writhing along it, and a fat spark racing end to end.
          for (let i = 0; i < pts.length - 2; i += 3) bolt(g, pts[i].x, pts[i].y, pts[i + 2].x, pts[i + 2].y, Math.floor(time / 50) + i, 1.4, ARC, 0.8, 5, false);
          const ph = ((time - c.liveAt) / 400) % 1;
          const q = pts[Math.floor(ph * (pts.length - 1))];
          glow(g, q.x, q.y, 14, ARC, 0.15, 2);
          // And a drop-line to the floor so you can read where the cable is.
          g.lineStyle(1, ARC, 0.25); g.lineBetween(q.x, q.y, q.x, q.y + 40);
        }
      }
    },
    onPhaseEnd() { pylons = []; cables = []; pending = []; },
  };
};

// ── Signature: Jacob's Ladder ────────────────────────────────────────
// Two copper horns spring up either side of you, the full height of the hall. An arc strikes
// between their feet and climbs up between them; at the top it breaks off in a spray of sparks.
// Get out from between the horns, or time your step over the arc. From the Generator on, it
// climbs back down again.

interface Ladder { l: number; r: number; at: number; climbAt: number; climbMs: number; double: boolean; hitUp: boolean; hitDown: boolean; popped: boolean }

const jacobsLadder = (tk: BossToolkit): SignatureMove => {
  let ladders: Ladder[] = [];
  const BOT = () => tk.H - 34, TOPY = TOP + 26;
  const arcY = (L: Ladder, time: number) => {
    const k = (time - L.climbAt) / L.climbMs;
    if (k < 0) return BOT();
    const u = L.double ? (k < 1 ? k : 2 - k) : Math.min(1, k);
    return BOT() + (TOPY - BOT()) * clamp(u, 0, 1);
  };
  return {
    durationMs: 1300,
    windupMs: 550,
    gesture: 'raise',
    hold: 'conduct',
    tell: 'JACOB\'S LADDER',
    cast(time) {
      const px = clamp(tk.player.x, 150, tk.W - 150);
      const mk = (x: number, delay: number): Ladder => ({
        l: x - 120, r: x + 120, at: time + delay, climbAt: time + delay + tk.warn(900), climbMs: 1500,
        double: phaseNow >= 1, hitUp: false, hitDown: false, popped: false,
      });
      ladders = [mk(px, 0)];
      if (tk.hard || phaseNow >= 2) ladders.push(mk(px < tk.W / 2 ? clamp(px + 360, 150, tk.W - 150) : clamp(px - 360, 150, tk.W - 150), 500));
      tk.sfx('beam-charge');
    },
    update(time) {
      const p = tk.player;
      for (const L of ladders) {
        if (time < L.climbAt) continue;
        const k = (time - L.climbAt) / L.climbMs;
        const y = arcY(L, time);
        const between = p.x > L.l + 6 && p.x < L.r - 6;
        if (playerLive(tk) && between && Math.abs(p.y - y) < 30) {
          if (k < 1 && !L.hitUp) { L.hitUp = true; hitTick(tk, 14, 0.6); tk.sfx('plasma-arc'); }
          else if (k >= 1 && L.double && !L.hitDown) { L.hitDown = true; hitTick(tk, 14, 0.6); tk.sfx('plasma-arc'); }
        }
        // At the top it breaks off as a spray of sparks.
        if (!L.popped && k >= 1) {
          L.popped = true;
          const cx = (L.l + L.r) / 2;
          for (let i = 0; i < 6; i++) tk.spawnBullet({ x: cx, y: TOPY + 6, angle: Math.PI * (0.2 + (i / 5) * 0.6), speed: 170, damage: 6, r: 4, lifeMs: 3600, color: ARC });
          tk.sfx('zap');
        }
      }
      ladders = ladders.filter((L) => time < L.climbAt + L.climbMs * (L.double ? 2 : 1) + 300);
    },
    drawGround(g, time) {
      for (const L of ladders) {
        if (time < L.at) continue;
        const rise = clamp((time - L.at) / Math.max(1, L.climbAt - L.at), 0, 1);
        g.fillStyle(ARC, 0.05 + rise * 0.06); g.fillRect(L.l, TOP, L.r - L.l, tk.H - TOP);
        for (const x of [L.l, L.r]) { g.fillStyle(COPPER_DARK, 1); g.fillEllipse(x, BOT() + 6, 30, 10); g.fillStyle(COPPER, 1); g.fillEllipse(x, BOT() + 4, 22, 7); }
        if (time >= L.climbAt) { const y = arcY(L, time); g.lineStyle(10, ARC, 0.15); g.lineBetween(L.l, y + 16, L.r, y + 16); }
      }
    },
    drawAir(g, time) {
      for (const L of ladders) {
        if (time < L.at) continue;
        const rise = clamp((time - L.at) / Math.max(1, L.climbAt - L.at), 0, 1);
        const topY = BOT() + (TOPY - BOT()) * rise;
        // The horns: leaning very slightly apart toward the top, as a real ladder's do.
        for (const [x, s] of [[L.l, -1], [L.r, 1]] as [number, number][]) {
          const tx = x + s * 14 * rise;
          g.lineStyle(7, COPPER_DARK, 1); g.lineBetween(x, BOT(), tx, topY);
          g.lineStyle(2.5, COPPER_LIT, 1); g.lineBetween(x - s, BOT(), tx - s, topY);
          g.fillStyle(INSULATOR, 1); g.fillEllipse(x, BOT() - 10, 16, 7);
          g.fillStyle(INSULATOR_LIT, 0.6); g.fillEllipse(x - 3, BOT() - 11, 6, 2);
          g.fillStyle(COPPER_LIT, 1); g.fillCircle(tx, topY, 4);
        }
        if (time < L.climbAt) { if (rise > 0.6) sparks(g, L.l, BOT() - 4, 14, time, 4, ARC); continue; }
        const y = arcY(L, time);
        const f = (BOT() - y) / (BOT() - TOPY);
        const xl = L.l - 14 * f, xr = L.r + 14 * f;
        bolt(g, xl, y, xr, y, Math.floor(time / 40), 4, ARC_VIOLET, 1, 16);
        bolt(g, xl, y + 4, xr, y - 3, Math.floor(time / 55) + 9, 2, ARC, 0.8, 22, false);
        glow(g, (xl + xr) / 2, y, 60, ARC_VIOLET, 0.05, 3);
      }
    },
    onPhaseEnd() { ladders = []; },
  };
};

// ── Signature: Spin Up ───────────────────────────────────────────────
// Planted in the dynamo, he spins it up: spokes of arc out of the hub, drawn first as ghosts,
// then live — turning slowly, faster, stalling, and spinning back the other way. Run with the gap.

const spinUp = (tk: BossToolkit): SignatureMove => {
  let at = -1, liveAt = 0, reverseAt = 0, endAt = 0;
  let cx = 0, cy = 0, angle = 0, dir = 1, n = 4, stall = 0;
  const hitAt = { t: 0 };
  const LEN = 640, LIVE_MS = 3600;
  return {
    get durationMs() { return tk.warn(1000) + LIVE_MS + 200; },
    windupMs: 600,
    gesture: 'flex',
    hold: 'brace',
    locksBody: true,
    tell: 'SPIN UP',
    cast(time) {
      at = time; liveAt = time + tk.warn(1000); reverseAt = liveAt + LIVE_MS * 0.5; endAt = liveAt + LIVE_MS;
      cx = tk.bossX; cy = tk.bossY; n = tk.hard ? 5 : 4; dir = Math.random() < 0.5 ? 1 : -1;
      // Start with a gap facing you.
      angle = tk.angleToPlayer(cx, cy) + Math.PI / n;
      stall = 0;
      tk.sfx('engine');
    },
    update(time, dt) {
      if (at < 0) return;
      if (time > endAt) { at = -1; return; }
      // Speed: a slow ramp, a stall and a flip at the half, then a faster ramp.
      let w: number;
      if (time < liveAt) w = 0.25;
      else if (time < reverseAt - 450) w = 0.3 + ((time - liveAt) / (reverseAt - liveAt)) * 0.25;
      else if (time < reverseAt) w = 0;
      else w = 0.35 + ((time - reverseAt) / (endAt - reverseAt)) * 0.25;
      if (time >= reverseAt && stall === 0) { stall = 1; dir = -dir; tk.sfx('clang'); }
      angle += w * dir * dt;
      if (time < liveAt || !playerLive(tk)) return;
      const p = tk.player;
      if (time - hitAt.t < 500) return;
      for (let k = 0; k < n; k++) {
        const a = angle + (k / n) * Math.PI * 2;
        if (segDist(p.x, p.y, cx + Math.cos(a) * 40, cy + Math.sin(a) * 40, cx + Math.cos(a) * LEN, cy + Math.sin(a) * LEN) < 28) {
          hitAt.t = time; hitTick(tk, 9); tk.sfx('zap'); break;
        }
      }
    },
    drawGround(g, time) {
      if (at < 0) return;
      for (let k = 0; k < n; k++) {
        const a = angle + (k / n) * Math.PI * 2;
        const ex = cx + Math.cos(a) * LEN, ey = cy + Math.sin(a) * LEN;
        if (time < liveAt) {
          const kk = (time - at) / Math.max(1, liveAt - at);
          g.lineStyle(2, ARC, 0.2 + kk * 0.4);
          for (let d = 50; d < LEN; d += 30) g.lineBetween(cx + Math.cos(a) * d, cy + Math.sin(a) * d, cx + Math.cos(a) * (d + 14), cy + Math.sin(a) * (d + 14));
        } else {
          g.lineStyle(40, ARC, 0.08); g.lineBetween(cx, cy, ex, ey);
        }
      }
      // The commutator under him.
      g.lineStyle(10, COPPER_DARK, 0.9); g.strokeCircle(cx, cy, 46);
      for (let k = 0; k < 12; k++) {
        const a = angle * 2 + (k / 12) * Math.PI * 2;
        g.lineStyle(10, k % 2 ? COPPER : COPPER_LIT, 1);
        g.beginPath(); g.arc(cx, cy, 46, a, a + 0.36, false); g.strokePath();
      }
    },
    drawAir(g, time) {
      if (at < 0 || time < liveAt) return;
      const stalled = time > reverseAt - 450 && time < reverseAt;
      for (let k = 0; k < n; k++) {
        const a = angle + (k / n) * Math.PI * 2;
        const ex = cx + Math.cos(a) * LEN, ey = cy + Math.sin(a) * LEN;
        if (stalled && Math.floor(time / 70) % 2) continue;
        bolt(g, cx + Math.cos(a) * 40, cy + Math.sin(a) * 40, ex, ey, Math.floor(time / 45) + k * 7, 3.5, ARC, 0.95, 18);
      }
      glow(g, cx, cy, 70, ARC, 0.07, 3);
    },
    onPhaseEnd() { at = -1; },
  };
};

// ── Signature: Leyden Battery ────────────────────────────────────────
// Leyden jars drop round you, one after another. Each shows its reach as it charges; full, it
// discharges into you if you are in reach, and then jumps to the next jar — the arc between them
// live for a moment. Stand where no jar reaches, off the lines between them.

interface Jar { x: number; y: number; dropAt: number; landAt: number; fireAt: number; fired: boolean; linkUntil: number; next: Jar | null }

const leydenBattery = (tk: BossToolkit): SignatureMove => {
  let jars: Jar[] = [];
  const REACH = 130;
  let linkHitAt = 0;
  const paintJars = (g: Phaser.GameObjects.Graphics, time: number): void => {
    for (const j of jars) {
      if (time < j.dropAt) continue;
      if (time < j.landAt) {
        const k = (time - j.dropAt) / (j.landAt - j.dropAt);
        g.fillStyle(0x000000, 0.15 + k * 0.25); g.fillEllipse(j.x, j.y, 30 * k + 8, 10 * k + 3);
        continue;
      }
      if (!j.fired) {
        const k = clamp((time - j.landAt) / Math.max(1, j.fireAt - j.landAt), 0, 1);
        g.fillStyle(ARC, 0.04 + k * 0.1); g.fillCircle(j.x, j.y - 20, REACH);
        g.lineStyle(2, ARC, 0.3 + k * 0.6); g.strokeCircle(j.x, j.y - 20, REACH);
        // The sweep hand of its charge.
        g.lineStyle(3, ARC_CORE, 0.6); g.beginPath(); g.arc(j.x, j.y - 20, REACH, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        // Faint line to the next jar: the arc will jump along it.
        const nx = j.next;
        if (nx && dist(j.x, j.y, nx.x, nx.y) < 320) { g.lineStyle(1.5, ARC_VIOLET, 0.15 + k * 0.25); g.lineBetween(j.x, j.y, nx.x, nx.y); }
      }
    }
  };
  return {
    durationMs: 1500,
    windupMs: 550,
    gesture: 'slam',
    hold: 'draw',
    tell: 'LEYDEN BATTERY',
    cast(time) {
      const p = tk.player;
      const n = tk.hard ? 6 : 5;
      jars = [];
      const a0 = Math.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        let x = 0, y = 0;
        for (let t = 0; t < 12; t++) {
          const a = a0 + (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
          const d = 150 + Math.random() * 120;
          x = clamp(p.x + Math.cos(a) * d, 70, tk.W - 70); y = clamp(p.y + Math.sin(a) * d * 0.8, TOP + 70, tk.H - 50);
          if (jars.every((j) => dist(j.x, j.y, x, y) > 120)) break;
        }
        const dropAt = time + i * 140;
        jars.push({ x, y, dropAt, landAt: dropAt + 420, fireAt: dropAt + 420 + tk.warn(1300) + i * 230, fired: false, linkUntil: 0, next: null });
      }
      // Each jar jumps to the next one dropped (the last to none).
      jars.forEach((j, i) => { j.next = jars[i + 1] ?? null; });
      tk.sfx('crystal-chime');
    },
    update(time) {
      const p = tk.player;
      for (const j of jars) {
        if (j.fired || time < j.fireAt) continue;
        j.fired = true;
        j.linkUntil = time + 380;
        tk.sfx('zap');
        if (playerLive(tk) && dist(p.x, p.y, j.x, j.y - 20) < REACH) hitTick(tk, 12, 0.55);
      }
      // Live links between a just-fired jar and the next.
      if (playerLive(tk) && time - linkHitAt > 400) {
        for (const j of jars) {
          if (time > j.linkUntil) continue;
          const nx = j.next;
          if (!nx || dist(j.x, j.y, nx.x, nx.y) > 320) continue;
          if (segDist(p.x, p.y, j.x, j.y - 30, nx.x, nx.y - 30) < 24) { linkHitAt = time; hitTick(tk, 8); break; }
        }
      }
      jars = jars.filter((j) => !j.fired || time < j.fireAt + 700);
    },
    drawGround(g, time) { if (!tk.dark) paintJars(g, time); },
    drawAir(g, time) {
      // In the Blackout the charge rings paint above the dark.
      if (tk.dark) paintJars(g, time);
      const p = tk.player;
      for (const j of jars) {
        if (time < j.dropAt) continue;
        const fall = clamp((time - j.dropAt) / (j.landAt - j.dropAt), 0, 1);
        const y = j.y - (1 - fall) * (1 - fall) * 360;
        const k = time < j.landAt ? 0 : clamp((time - j.landAt) / Math.max(1, j.fireAt - j.landAt), 0, 1);
        if (j.fired && time > j.fireAt + 300) {
          // Shattered: shards of glass and foil.
          const s = (time - j.fireAt - 300) / 400;
          for (let i = 0; i < 6; i++) { g.fillStyle(i % 2 ? GLASS_LIT : FOIL, 1 - s); g.fillTriangle(j.x + i * 5 - 14, j.y - 4 - s * 10, j.x + i * 5 - 10, j.y - 12, j.x + i * 5 - 6, j.y - 2); }
          continue;
        }
        // The jar.
        g.fillStyle(GLASS, 0.3); g.fillRoundedRect(j.x - 14, y - 52, 28, 52, 7);
        g.fillStyle(FOIL, 0.95); g.fillRoundedRect(j.x - 13, y - 28, 26, 28, 6);
        g.fillStyle(lit(FOIL, 0.3), 0.6); g.fillRect(j.x - 9, y - 26, 3, 24);
        g.fillStyle(ARC, 0.15 + k * 0.5); g.fillRoundedRect(j.x - 12, y - 50, 24, 22, 6);
        g.lineStyle(1.5, GLASS_LIT, 0.6); g.strokeRoundedRect(j.x - 14, y - 52, 28, 52, 7);
        g.fillStyle(0x2a1a10, 1); g.fillRect(j.x - 8, y - 57, 16, 6);
        g.lineStyle(2, BRASS, 1); g.lineBetween(j.x, y - 57, j.x, y - 72);
        g.fillStyle(BRASS_LIT, 1); g.fillCircle(j.x, y - 74, 5);
        if (k > 0.6) sparks(g, j.x, y - 74, 12, time, 4, ARC);
        if (j.fired && time < j.fireAt + 300) {
          const fk = (time - j.fireAt) / 300;
          if (dist(p.x, p.y, j.x, j.y - 20) < REACH + 40) bolt(g, j.x, j.y - 74, p.x, p.y - 10, Math.floor(time / 40), 4 * (1 - fk) + 1, ARC, 1 - fk, 14);
          const nx = j.next;
          if (nx && dist(j.x, j.y, nx.x, nx.y) < 320 && time < j.linkUntil) bolt(g, j.x, j.y - 30, nx.x, nx.y - 30, Math.floor(time / 45) + 3, 2.5, ARC_VIOLET, 1, 16);
          glow(g, j.x, j.y - 40, 50, ARC, 0.1 * (1 - fk), 3);
        }
      }
    },
    onPhaseEnd() { jars = []; },
  };
};

// ── Signature: Brownout Strike ───────────────────────────────────────
// In the dark he calls the storm down: one fork after another, each on where you are heading,
// marked by a crackling ring on the floor before it lands. Where a fork lands the floor crawls
// with arcs for a moment.

interface Fork { x: number; y: number; at: number; fireAt: number; fired: boolean; crawlUntil: number }

const brownoutStrike = (tk: BossToolkit): SignatureMove => {
  let forks: Fork[] = [];
  const R = 54;
  let lastP: Pt = { x: 0, y: 0 };
  let vel: Pt = { x: 0, y: 0 };
  let lastT = 0;
  let crawlAt = 0;
  const paintForks = (g: Phaser.GameObjects.Graphics, time: number): void => {
    for (const f of forks) {
      if (!f.fired) {
        const k = clamp((time - f.at) / Math.max(1, f.fireAt - f.at), 0, 1);
        const flick = Math.floor(time / 60) % 2 ? 1 : 0.6;
        g.lineStyle(2, ARC, (0.3 + k * 0.6) * flick); g.strokeCircle(f.x, f.y, R);
        g.fillStyle(ARC, 0.05 + k * 0.12); g.fillCircle(f.x, f.y, R * k);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + time / 300;
          g.lineStyle(1.5, ARC_VIOLET, 0.5 * k); g.lineBetween(f.x + Math.cos(a) * R, f.y + Math.sin(a) * R, f.x + Math.cos(a) * (R - 12), f.y + Math.sin(a) * (R - 12));
        }
      } else {
        const fade = clamp((f.crawlUntil - time) / 1200, 0, 1);
        g.fillStyle(BASALT_DARK, 0.4 * fade); g.fillEllipse(f.x, f.y, R * 1.6, R * 0.7);
        for (let i = 0; i < 4; i++) {
          const a = i * 1.7 + Math.floor(time / 80);
          bolt(g, f.x, f.y, f.x + Math.cos(a) * R * 0.8, f.y + Math.sin(a) * R * 0.4, Math.floor(time / 60) + i, 1.2, ARC, fade, 6, false);
        }
      }
    }
  };
  return {
    durationMs: 1700,
    windupMs: 500,
    gesture: 'raise',
    hold: 'conduct',
    tell: 'BROWNOUT STRIKE',
    cast() {
      forks = [];
      const n = tk.hard ? 7 : 6;
      for (let i = 0; i < n; i++) {
        tk.schedule(i * 360, () => {
          const p = tk.player;
          // Lead your movement by half a second.
          const x = clamp(p.x + vel.x * 0.5, 50, tk.W - 50), y = clamp(p.y + vel.y * 0.5, TOP + 40, tk.H - 40);
          const now = tk.now;
          forks.push({ x, y, at: now, fireAt: now + tk.warn(720), fired: false, crawlUntil: 0 });
          tk.sfx('electric-charge');
        });
      }
    },
    update(time) {
      const p = tk.player;
      // Track the player's velocity for the lead.
      if (lastT > 0 && time > lastT) {
        const k = (time - lastT) / 1000;
        if (k > 0) vel = { x: vel.x * 0.8 + ((p.x - lastP.x) / k) * 0.2, y: vel.y * 0.8 + ((p.y - lastP.y) / k) * 0.2 };
      }
      lastP = { x: p.x, y: p.y }; lastT = time;
      for (const f of forks) {
        if (f.fired || time < f.fireAt) continue;
        f.fired = true; f.crawlUntil = time + 1200;
        tk.sfx('thunder');
        if (playerLive(tk) && dist(p.x, p.y, f.x, f.y) < R + 14) hitTick(tk, 12);
      }
      if (playerLive(tk) && time - crawlAt > 400 && forks.some((f) => f.fired && time < f.crawlUntil && dist(p.x, p.y, f.x, f.y) < R * 0.8)) {
        crawlAt = time; hitTick(tk, 3, 0.7);
      }
      forks = forks.filter((f) => !f.fired || time < f.crawlUntil);
    },
    drawGround(g, time) { if (!tk.dark) paintForks(g, time); },
    drawAir(g, time) {
      // In the Blackout the rings paint above the dark: his telegraphs are what you can see.
      if (tk.dark) paintForks(g, time);
      for (const f of forks) {
        if (!f.fired || time > f.fireAt + 260) continue;
        const k = (time - f.fireAt) / 260;
        bolt(g, f.x + 30, TOP - 10, f.x, f.y, Math.floor(time / 40), 6 * (1 - k) + 1, ARC, 1 - k, 28);
        glow(g, f.x, f.y, 80, ARC, 0.12 * (1 - k), 3);
      }
    },
    onPhaseEnd() { forks = []; },
  };
};

// ── The prince ───────────────────────────────────────────────────────

export const VOLT_BOSS: WorldBossDef = {
  worldId: 'isle:volt',
  name: 'Prince Volt',
  title: 'the Live Wire',
  color: VOLT,
  colorLit: VOLT_LIT,
  colorDark: VOLT_DARK,
  accent: SPARK,
  // Tier 1 of the sixth isle.
  damageMult: 1.1,

  intro: [
    'You beat all five! In a WEEK! That\'s quick. I like quick. Nobody on this isle is quick but me.',
    'Mother says the slow ones are switched off because they choose to be slow. Keep up, and you won\'t be.',
  ],
  banter: [
    'Faster! Everybody is so SLOW.',
    'The Bell\'s in an hour. I\'m always there for the Bell. I like to see the lights go. All at once.',
    'Stand still and you go dark. That\'s just physics. Mother told me.',
    'I\'ve never sat down. Not once. Why would I? It\'s dark when you sit.',
    'Every crank in this court turns for me. And I turn faster than all of them.',
  ],
  defeatLine: 'THE WIRE GOES SLACK',
  resumeLine: 'Back! Good! You were gone ages. Ages is about four seconds.',

  phases: [
    {
      name: 'Live Wire',
      line: 'Catch me! Nobody catches me. Mind the wire — it\'s on.',
      hp: 440,
      cycle: [
        'sig:wire', 'volley', 'sig:ladder', 'stream', 'sig:jars',
        'sig:wire', 'homing', 'sig:ladder', 'radial', 'sig:jars',
      ],
      harass: ['h-snipe', 'h-lane'],
      restMs: 1150,
      harassMs: 3400,
    },
    {
      name: 'Generator',
      line: 'Fine. FINE. I\'ll stand still. In the dynamo. Watch what standing still looks like when I do it.',
      hp: 520,
      cycle: [
        'sig:spokes', 'sig:jars', 'spiral', 'sig:ladder', 'radial',
        'sig:spokes', 'barrage', 'sig:jars', 'sig:ladder',
      ],
      harass: ['h-orbs', 'h-flak'],
      restMs: 1050,
      harassMs: 3000,
    },
  ],

  hard: {
    introLine: 'THE POWER FAILS',
    extraPhase: {
      name: 'Blackout',
      line: 'No. No no no. The lights. Who turned off the — where ARE you? I can hear you breathing.',
      hp: 380,
      cycle: [
        'sig:strike', 'sig:wire', 'sig:jars', 'homing',
        'sig:strike', 'sig:spokes', 'sweep', 'sig:ladder',
      ],
      harass: ['h-mines', 'h-snipe'],
      restMs: 950,
      harassMs: 2700,
    },
  },

  tuning: {
    volley: { count: 5, speed: 240, spreadRad: 0.5 },
    radial: { count: 16, speed: 190 },
    spiral: { arms: 4, speed: 175 },
    stream: { count: 8, speed: 260 },
  },

  signatures: {
    wire: liveWire,
    ladder: jacobsLadder,
    spokes: spinUp,
    jars: leydenBattery,
    strike: brownoutStrike,
  },

  look: {
    crest: 'none', pattern: 'static', aura: 'sparks', hands: 'orb',
    torsoR: 32, mouth: 'grin', eyes: 2, eyeColor: SPARK,
  },
  phaseStyles: [
    { movement: 'rush', gimmick: 'none' },
    { movement: 'anchor', gimmick: 'none', tint: 'cold', look: { aura: 'glitch', hands: 'gauntlet', pattern: 'rings' } },
    { movement: 'blink', gimmick: 'gloom', tint: 'void', look: { aura: 'smoke', hands: 'wisp', mouth: 'line' } },
  ],

  /**
   * The Live Wire's tells. His hair stands straight up off his head in a crackling shock, tipped
   * with sparks; a coil of copper wire wraps his brow like a circlet with a green glass insulator
   * set in it; a collar of insulator skirts sits at his throat; and a live cable loops over his
   * shoulder to the plug he holds, spitting. In the Generator the great commutator ring turns
   * round him and his hair burns white. In the Blackout he is only a dark shape, two eyes, and
   * arcs crawling round his outline.
   */
  drawDecor(g, s) {
    phaseNow = s.phaseIdx;
    const R = s.radius;
    const gen = s.phaseIdx === 1;
    const dark = s.inGloom;
    const t = s.t;
    if (gen) {
      // The commutator ring: copper and mica segments whirling, two carbon brushes sparking.
      const rr = R * 1.75;
      for (let k = 0; k < 20; k++) {
        const a = t / 140 + (k / 20) * Math.PI * 2;
        g.lineStyle(9, k % 2 ? COPPER : 0x2a2018, 0.95);
        g.beginPath(); g.arc(s.x, s.y, rr, a, a + Math.PI / 10 - 0.04, false); g.strokePath();
      }
      g.lineStyle(2, COPPER_LIT, 0.8); g.strokeCircle(s.x, s.y, rr + 6); g.strokeCircle(s.x, s.y, rr - 6);
      for (const k of [-1, 1]) {
        const bx = s.x + k * (rr + 12), by = s.y;
        g.fillStyle(0x1a1a1a, 1); g.fillRect(bx - 5, by - 8, 10, 16);
        sparks(g, bx - k * 8, by, 12, t, 5, SPARK);
      }
    }
    if (dark) {
      // Only a shape in the dark (seen in your lantern); his crackle and eyes are `drawLit`.
      g.fillStyle(0x020306, 0.86); g.fillCircle(s.x, s.y, R * 1.15);
      return;
    }
    // Static-shock hair.
    const spikes = 11;
    for (let i = 0; i < spikes; i++) {
      const a = -Math.PI / 2 + (i - (spikes - 1) / 2) * 0.16;
      const flick = Math.sin(t / 70 + i * 2.1) * 0.12 + Math.sin(t / 23 + i) * 0.06;
      const len = R * ((gen ? 0.95 : 0.7) + flick + (i % 2 ? 0.12 : 0) + s.castGlow * 0.2);
      const bx = s.x + Math.cos(a) * R * 0.78, by = s.y + Math.sin(a) * R * 0.78;
      const tx = s.x + Math.cos(a) * (R * 0.78 + len), ty = s.y + Math.sin(a) * (R * 0.78 + len);
      const nx = -Math.sin(a) * 5, ny = Math.cos(a) * 5;
      const mx = (bx + tx) / 2 + nx * (i % 2 ? 0.8 : -0.8), my = (by + ty) / 2 + ny * (i % 2 ? 0.8 : -0.8);
      poly(g, [{ x: bx - nx, y: by - ny }, { x: mx, y: my }, { x: tx, y: ty }, { x: mx + nx * 0.3, y: my + ny * 0.3 }, { x: bx + nx, y: by + ny }], gen ? VOLT_LIT : lit(VOLT, 0.25), 1);
      g.lineStyle(1, gen ? ARC_CORE : VOLT_LIT, 0.8); g.lineBetween(bx, by, tx, ty);
      if (i % 3 === 0) sparks(g, tx, ty, 6, t + i * 50, 2, SPARK);
    }
    if (gen) glow(g, s.x, s.y - R * 1.4, R, ARC, 0.05, 3);
    // Copper coil circlet with its insulator.
    const cy = s.y - R * 0.5;
    g.lineStyle(4, COPPER_DARK, 1); g.strokeEllipse(s.x, cy, R * 1.7, R * 0.5);
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      const px = s.x + Math.cos(a) * R * 0.85, py = cy + Math.sin(a) * R * 0.25;
      if (Math.sin(a) < -0.2) continue;
      g.lineStyle(1.5, COPPER_LIT, 1); g.lineBetween(px - 2, py - 3, px + 2, py + 3);
    }
    g.fillStyle(INSULATOR, 1); g.fillEllipse(s.x, cy + R * 0.22, 10, 8);
    g.fillStyle(INSULATOR_LIT, 0.8); g.fillEllipse(s.x - 2, cy + R * 0.2, 3, 2);
    // Insulator collar.
    for (let k = -3; k <= 3; k++) {
      const px = s.x + k * R * 0.26, py = s.y + R * 0.86 - Math.abs(k) * 2;
      g.fillStyle(dim(INSULATOR, 0.3), 1); g.fillEllipse(px, py + 2, 10, 6);
      g.fillStyle(INSULATOR, 1); g.fillEllipse(px, py, 9, 5);
    }
    // The live cable: a coil over the shoulder, run down to the plug in his first hand.
    const h = s.hands[0];
    if (h) {
      const sx = s.x - R * 0.8, sy = s.y - R * 0.2;
      for (let k = 0; k < 3; k++) { g.lineStyle(2.5, 0x101114, 1); g.strokeEllipse(sx - k * 2, sy + k * 4, 18, 26); g.lineStyle(1, COPPER, 0.8); g.strokeEllipse(sx - k * 2, sy + k * 4, 16, 24); }
      const trail = s.phaseIdx === 0 ? Math.sin(t / 120) * 8 : 0;
      g.lineStyle(2.5, 0x101114, 1); g.lineBetween(sx, sy + 12, h.x + trail, h.y);
      g.fillStyle(IRON_DARK, 1); g.fillRect(h.x - 5, h.y - 4, 10, 8);
      g.lineStyle(2, BRASS_LIT, 1); g.lineBetween(h.x + 5, h.y - 2, h.x + 11, h.y - 2); g.lineBetween(h.x + 5, h.y + 2, h.x + 11, h.y + 2);
      sparks(g, h.x + 12, h.y, 10, t, 4, SPARK);
    }
    if (s.enraged) {
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i - 1) * 0.7;
        bolt(g, s.x, s.y - R, s.x + Math.cos(a) * R * 2.4, s.y + Math.sin(a) * R * 2.4, Math.floor(t / 60) + i, 1.5, ARC, 0.6, 10, false);
      }
    }
  },

  /** Above the gloom: in the Blackout all that shows of him is the crackle round his outline and two eyes. */
  drawLit(g, s) {
    if (!s.inGloom) return;
    const R = s.radius;
    const t = s.t;
    for (let i = 0; i < 5; i++) {
      const a = i * 1.26 + Math.floor(t / 90) * 0.7;
      const b = a + 0.8;
      bolt(g, s.x + Math.cos(a) * R * 1.1, s.y + Math.sin(a) * R * 1.1, s.x + Math.cos(b) * R * 1.1, s.y + Math.sin(b) * R * 1.1, Math.floor(t / 60) + i, 1.4, ARC, 0.8, 6, false);
    }
    for (const k of [-1, 1]) { glow(g, s.x + k * R * 0.32, s.y - R * 0.2, 9, SPARK, 0.12, 2); g.fillStyle(SPARK, 1); g.fillCircle(s.x + k * R * 0.32, s.y - R * 0.2, 2.6); }
    if (s.castGlow > 0.2) sparks(g, s.x, s.y - R, 30, t, 8, ARC);
  },

  /**
   * The generator hall floor: riveted iron deck plates, cable trenches running in from the walls
   * to the great dynamo's pit (its copper commutator ring inlaid in the floor, under where he
   * plants himself), Leyden banks down both walls, and along the back wall under the HUD the
   * dynamo's casing — field magnets, brass gauges, and the tall windows full of storm.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x7017a9);
    const P = 64;
    // Deck plates.
    g.fillStyle(IRON_DARK, 1); g.fillRect(0, 0, W, H);
    for (let y = 100; y < H; y += P) {
      for (let x = 0; x < W; x += P) {
        g.fillStyle(rng() < 0.5 ? IRON : dim(IRON, 0.08), 1); g.fillRect(x + 1, y + 1, P - 2, P - 2);
        // Diamond tread.
        for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
          if ((i + j) % 2) continue;
          g.fillStyle(IRON_LIT, 0.18); g.fillRect(x + 6 + i * 9, y + 6 + j * 9, 4, 2);
        }
        for (const [rx, ry] of [[4, 4], [P - 4, 4], [4, P - 4], [P - 4, P - 4]]) { g.fillStyle(RIVET, 0.8); g.fillCircle(x + rx, y + ry, 1.6); }
      }
    }
    // Puddles of rain blown in through the windows.
    for (let i = 0; i < 9; i++) {
      const x = 60 + rng() * (W - 120), y = 150 + rng() * (H - 200);
      g.fillStyle(BASALT_DARK, 0.5); g.fillEllipse(x, y, 40 + rng() * 50, 12 + rng() * 10);
      g.lineStyle(1, ARC, 0.25); g.lineBetween(x - 14, y - 2, x + 10, y - 3);
    }
    // The dynamo pit, where he anchors.
    const cx = W / 2, cy = H * 0.34;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      g.lineStyle(18, 0x101114, 1); g.lineBetween(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120, cx + Math.cos(a) * 900, cy + Math.sin(a) * 900);
      g.lineStyle(4, COPPER_DARK, 0.9); g.lineBetween(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120, cx + Math.cos(a) * 900, cy + Math.sin(a) * 900);
    }
    g.fillStyle(0x0a0b0e, 1); g.fillCircle(cx, cy, 120);
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      g.lineStyle(16, k % 2 ? COPPER : COPPER_DARK, 1);
      g.beginPath(); g.arc(cx, cy, 100, a, a + Math.PI / 12 - 0.04, false); g.strokePath();
    }
    g.lineStyle(3, IRON_LIT, 0.8); g.strokeCircle(cx, cy, 120); g.strokeCircle(cx, cy, 82);
    g.fillStyle(IRON, 1); g.fillCircle(cx, cy, 70);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.fillStyle(RIVET, 1); g.fillCircle(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60, 3); }
    g.fillStyle(ARC, 0.06); g.fillCircle(cx, cy, 160);
    // Hazard striping round the pit.
    for (let k = 0; k < 36; k++) {
      const a = (k / 36) * Math.PI * 2;
      g.lineStyle(6, k % 2 ? 0xe8c838 : 0x1a1a1a, 0.7);
      g.beginPath(); g.arc(cx, cy, 128, a, a + Math.PI / 18, false); g.strokePath();
    }
    // The back wall: brick, tall storm windows, the dynamo's casing and field magnets.
    g.fillStyle(BRICK_DARK, 1); g.fillRect(0, 0, W, 100);
    for (let y = 2; y < 100; y += 8) for (let x = (y / 8) % 2 ? 0 : 9; x < W; x += 18) { g.fillStyle(rng() < 0.5 ? BRICK : BRICK_DARK, 1); g.fillRect(x, y, 17, 7); }
    for (let x = 40; x < W; x += 120) {
      g.fillStyle(0x0b1420, 1); g.fillRect(x, 10, 50, 80);
      g.fillStyle(dim(ARC, 0.55), 1); g.fillRect(x + 3, 13, 44, 74);
      for (let k = 0; k < 3; k++) { const bx = x + 8 + rng() * 34; g.lineStyle(1.5, ARC, 0.5); g.lineBetween(bx, 14, bx + (rng() - 0.5) * 20, 60); }
      g.lineStyle(2, 0x1a2a3a, 1); g.lineBetween(x + 25, 10, x + 25, 90); g.lineBetween(x, 50, x + 50, 50);
    }
    // Field magnets: two great copper-wound shoes either side of the hall's centre.
    for (const s of [-1, 1]) {
      const mx = cx + s * 220;
      g.fillStyle(IRON_DARK, 1); g.fillRect(mx - 36, 20, 72, 84);
      for (let k = 0; k < 10; k++) { g.fillStyle(k % 2 ? COPPER : COPPER_DARK, 1); g.fillRect(mx - 32, 26 + k * 7, 64, 5); }
      g.fillStyle(IRON, 1); g.fillRect(mx - 40, 96, 80, 10);
    }
    // Brass gauges on the casing between them.
    for (let k = 0; k < 4; k++) {
      const gx = cx - 90 + k * 60;
      g.fillStyle(BRASS, 1); g.fillCircle(gx, 58, 14); g.fillStyle(0xeee6cc, 1); g.fillCircle(gx, 58, 11);
      g.lineStyle(2, 0x1a1a1a, 1); g.lineBetween(gx, 58, gx + Math.cos(-0.5 - k * 0.5) * 9, 58 + Math.sin(-0.5 - k * 0.5) * 9);
    }
    g.fillStyle(BASALT, 1); g.fillRect(0, 98, W, 8); g.fillStyle(BASALT_LIT, 1); g.fillRect(0, 98, W, 2);
    // Leyden banks down both walls.
    for (let y = 230; y < H - 40; y += 170) { leydenBank(g, 46, y, 2, 0.3); leydenBank(g, W - 46, y + 80, 2, 0.3); }
    // A cool storm-light grade at the edges.
    for (let i = 0; i < 5; i++) { g.lineStyle(36, ARC, 0.025); g.strokeRect(i * 16, 100 + i * 16, W - i * 32, H - 100 - i * 32); }
  },
};
