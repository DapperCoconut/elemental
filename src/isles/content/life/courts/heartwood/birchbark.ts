import Phaser from 'phaser';
import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { mixC } from '../../../../art/IsleArt';
import { HW, amberBlock, angDiff, clamp, leaf, lenticel, sapDrop, segDist, wasp } from './palette';

/**
 * Prince Birchbark, the Still Prince — the Empress's child who took root. He is a birch ent:
 * a round pale trunk of a body barred black, eye-scars for eyes, twig hands, and a crown of
 * turned leaves he has not shed in forty years. He governs the Heartwood from the Heartroom
 * in its west burl, and when a household is pruned it is his bark that grows shut over their
 * door. He fears exactly one thing in the world: the sawmill at the foot of his tree.
 *
 * Phase one, *Rooted*: he is planted and will not move. Roots burst up out of the floor along
 * winding lines that seek you; a bough swings round the room on his shoulder; cuts in his bark
 * weep sap that he flicks across the room in globs that set to amber where they land. Phase
 * two, *Timber!*: he tears himself up and walks. Trees around the edge of the room are felled
 * across it, one after another; he shakes his crown and winged seeds spiral down and sprout
 * into thorny saplings where they land. Hard mode, *Heartrot*: he is hollow. Wasps pour out of
 * the rot in him in clouds that follow you, and the rot spreads out across the floor.
 */

const BODY = 0xe2dbcb;
const BODY_LIT = 0xfaf7ef;
const BODY_DARK = 0x6b6152;
const FIELD_TOP = 96;

// ── Signature: Root Burst (phase 1) ──────────────────────────────────
// Three roots heave out from under him and snake toward you, bulging the floor along their
// paths; then, from his end outward, they erupt into spikes. Step off a root's line.

const roots = (tk: BossToolkit): SignatureMove => {
  interface Root { pts: { x: number; y: number }[]; bornAt: number; fireAt: number; done: boolean[] }
  const STEP = 34;
  const HIT_R = 26;
  let list: Root[] = [];
  return {
    durationMs: 3000,
    windupMs: 600,
    gesture: 'slam',
    tell: 'ROOT BURST',
    cast(time) {
      tk.sfx('stone-rise');
      list = [];
      const n = tk.hard ? 4 : 3;
      const base = tk.angleToPlayer();
      for (let i = 0; i < n; i++) {
        let a = base + (i - (n - 1) / 2) * 0.5;
        let x = tk.bossX, y = tk.bossY;
        const pts: { x: number; y: number }[] = [];
        for (let k = 0; k < 22; k++) {
          // Each root seeks the player but wanders, the way roots do.
          const want = Math.atan2(tk.player.y - y, tk.player.x - x);
          a += clamp(angDiff(want, a), -0.18, 0.18) + Math.sin(k * 0.9 + i * 2) * 0.12;
          x += Math.cos(a) * STEP; y += Math.sin(a) * STEP;
          if (x < 30 || x > tk.W - 30 || y < FIELD_TOP + 20 || y > tk.H - 20) break;
          pts.push({ x, y });
        }
        list.push({ pts, bornAt: time, fireAt: time + tk.warn(1150), done: pts.map(() => false) });
      }
    },
    update(time) {
      const p = tk.player;
      for (const r of list) {
        if (time < r.fireAt) continue;
        r.pts.forEach((pt, i) => {
          if (r.done[i] || time < r.fireAt + i * 45) return;
          r.done[i] = true;
          if (i % 4 === 0) tk.sfx('thorn');
          if (Math.hypot(p.x - pt.x, p.y - pt.y) < HIT_R) { tk.hitPlayer(15, p.x, p.y); r.done.fill(true); }
        });
      }
      list = list.filter((r) => time < r.fireAt + r.pts.length * 45 + 700);
    },
    drawGround(g, time) {
      for (const r of list) {
        const k = clamp((time - r.bornAt) / (r.fireAt - r.bornAt), 0, 1);
        r.pts.forEach((pt, i) => {
          const fired = time >= r.fireAt + i * 45;
          if (!fired) {
            // The floor heaving as the root runs under it.
            const show = clamp(k * r.pts.length * 1.3 - i, 0, 1);
            if (show <= 0) return;
            g.fillStyle(HW.barkDark, 0.25 + 0.35 * show); g.fillEllipse(pt.x, pt.y, 30, 16);
            g.lineStyle(1.5, HW.heartDeep, 0.5 * show); g.lineBetween(pt.x - 12, pt.y, pt.x + 12, pt.y + Math.sin(i) * 3);
          } else {
            const since = time - (r.fireAt + i * 45);
            const up = Math.min(1, since / 120) * Math.max(0, 1 - Math.max(0, since - 400) / 300);
            if (up <= 0) return;
            g.fillStyle(HW.soil, 0.7 * up); g.fillEllipse(pt.x, pt.y + 4, 34, 14);
            for (const s of [-1, 0, 1]) {
              const h = (22 + Math.abs(s) * -6) * up;
              g.fillStyle(HW.barkShade, up); g.fillTriangle(pt.x + s * 9 - 5, pt.y + 2, pt.x + s * 9 + 5, pt.y + 2, pt.x + s * 11, pt.y - h);
              g.fillStyle(HW.bark, up); g.fillTriangle(pt.x + s * 9 - 2, pt.y, pt.x + s * 9 + 3, pt.y, pt.x + s * 11, pt.y - h + 3);
            }
          }
        });
      }
    },
    onPhaseEnd() { list = []; },
  };
};

// ── Signature: Bough Sweep (phase 1 + 2) ─────────────────────────────
// A great bough of gold leaves rises off his shoulder and sweeps round him through a wide arc.
// It cannot reach under its own crook: hug him, or get beyond its tip.

const bough = (tk: BossToolkit): SignatureMove => {
  const LEN = 360, INNER = 70, HALF = 30;
  const ARC = 2.4;
  let ox = 0, oy = 0, a0 = 0, dirSign = 1, startAt = 0, endAt = 0, bornAt = 0;
  let active = false, hit = false;
  const angleAt = (time: number): number => a0 + dirSign * ARC * clamp((time - startAt) / (endAt - startAt), 0, 1);
  return {
    durationMs: 2600,
    windupMs: 550,
    hold: 'reach',
    tell: 'BOUGH SWEEP',
    cast(time) {
      tk.sfx('whoosh');
      ox = tk.bossX; oy = tk.bossY;
      dirSign = Math.random() < 0.5 ? 1 : -1;
      a0 = tk.angleToPlayer() - dirSign * ARC * 0.5;
      bornAt = time; startAt = time + tk.warn(1000); endAt = startAt + 900;
      active = true; hit = false;
    },
    update(time) {
      if (!active) return;
      ox = tk.bossX; oy = tk.bossY;
      if (time > endAt + 300) { active = false; return; }
      if (hit || time < startAt || time > endAt) return;
      const a = angleAt(time);
      const p = tk.player;
      const d = Math.hypot(p.x - ox, p.y - oy);
      if (d < INNER || d > LEN + 20) return;
      if (segDist(p.x, p.y, ox + Math.cos(a) * INNER, oy + Math.sin(a) * INNER, ox + Math.cos(a) * LEN, oy + Math.sin(a) * LEN) < HALF + 14) {
        hit = true;
        tk.hitPlayer(18, p.x, p.y);
        tk.sfx('hit-heavy');
      }
    },
    drawGround(g, time) {
      if (!active || time >= startAt) return;
      const k = (time - bornAt) / (startAt - bornAt);
      // The arc it will sweep, shaded on the floor, with the safe ring round his feet left clear.
      const pts: Phaser.Geom.Point[] = [];
      for (let i = 0; i <= 16; i++) { const a = a0 + dirSign * ARC * (i / 16); pts.push(new Phaser.Geom.Point(ox + Math.cos(a) * LEN, oy + Math.sin(a) * LEN)); }
      for (let i = 16; i >= 0; i--) { const a = a0 + dirSign * ARC * (i / 16); pts.push(new Phaser.Geom.Point(ox + Math.cos(a) * INNER, oy + Math.sin(a) * INNER)); }
      g.fillStyle(HW.leafRust, 0.08 + k * 0.16); g.fillPoints(pts, true, true);
      g.lineStyle(2, HW.leafGold, 0.4 + k * 0.4); g.strokePoints(pts, true, true);
      const a = a0;
      g.lineStyle(3, HW.whitewash, 0.6); g.lineBetween(ox + Math.cos(a) * INNER, oy + Math.sin(a) * INNER, ox + Math.cos(a) * LEN, oy + Math.sin(a) * LEN);
    },
    drawAir(g, time) {
      if (!active || time < startAt - 200) return;
      const a = time < startAt ? a0 : angleAt(time);
      const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
      // The bough: pale limb, side twigs, a fringe of leaves along it.
      g.lineStyle(22, BODY_DARK, 1); g.lineBetween(ox + ux * 30, oy + uy * 30, ox + ux * LEN, oy + uy * LEN);
      g.lineStyle(16, BODY, 1); g.lineBetween(ox + ux * 30, oy + uy * 30, ox + ux * LEN, oy + uy * LEN);
      for (let d = 60; d < LEN; d += 34) lenticel(g, ox + ux * d, oy + uy * d, 10, 0.9);
      for (let d = 80; d <= LEN; d += 26) {
        for (const s of [-1, 1]) {
          const bx = ox + ux * d, by = oy + uy * d;
          const tx = bx + nx * s * 26 + ux * 10, ty = by + ny * s * 26 + uy * 10;
          g.lineStyle(3, BODY_DARK, 1); g.lineBetween(bx, by, tx, ty);
          leaf(g, tx, ty, a + s * 0.6, 14, (d / 26) % 2 ? HW.leafGold : HW.leafRust, 1);
        }
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: Weeping Sap (phase 1) ─────────────────────────────────
// He tears his own bark and flicks the sap across the room: gold globs lob high and land in
// pools that set as amber. Stand in one as it sets and you are stuck in it.

const sapBleed = (tk: BossToolkit): SignatureMove => {
  interface Glob { fx: number; fy: number; x: number; y: number; bornAt: number; landAt: number; setAt: number; dieAt: number; landed: boolean; caught: boolean }
  const R = 64;
  let globs: Glob[] = [];
  return {
    durationMs: 2800,
    windupMs: 500,
    gesture: 'sweep',
    tell: 'WEEPING SAP',
    cast(time) {
      tk.sfx('slime-splat');
      globs = [];
      const n = tk.hard ? 6 : 5;
      for (let i = 0; i < n; i++) {
        const p = tk.player;
        const a = (i / n) * Math.PI * 2 + Math.random();
        const d = i === 0 ? 0 : 90 + Math.random() * 120;
        const x = tk.clampX(p.x + Math.cos(a) * d, 70), y = tk.clampY(p.y + Math.sin(a) * d, 70);
        const landAt = time + 700 + i * 120;
        globs.push({ fx: tk.bossX, fy: tk.bossY - 30, x, y, bornAt: time, landAt, setAt: landAt + tk.warn(900), dieAt: landAt + tk.warn(900) + 2600, landed: false, caught: false });
      }
    },
    update(time) {
      const p = tk.player;
      for (const gb of globs) {
        if (!gb.landed && time >= gb.landAt) { gb.landed = true; tk.sfx('splash'); if (Math.hypot(p.x - gb.x, p.y - gb.y) < R * 0.6) tk.hitPlayer(8, p.x, p.y); }
        if (gb.landed && !gb.caught && time >= gb.setAt && time < gb.setAt + 120 && Math.hypot(p.x - gb.x, p.y - gb.y) < R) {
          gb.caught = true;
          tk.hitPlayer(10, p.x, p.y);
          tk.slowPlayer(0.3, 1300);
          tk.host.showFloatingText(p.x, p.y - 46, 'SET IN AMBER', '#f0a024');
          tk.sfx('status-freeze');
        }
        if (gb.landed && time >= gb.setAt && time < gb.dieAt && Math.hypot(p.x - gb.x, p.y - gb.y) < R) tk.slowPlayer(0.7, 200);
      }
      globs = globs.filter((gb) => time < gb.dieAt);
    },
    drawGround(g, time) {
      for (const gb of globs) {
        if (!gb.landed) {
          const k = clamp((time - gb.bornAt) / (gb.landAt - gb.bornAt), 0, 1);
          g.lineStyle(1.5, HW.amber, 0.3 + k * 0.5); g.strokeEllipse(gb.x, gb.y, R * 1.2 * k, R * 0.7 * k);
          continue;
        }
        const setting = clamp((time - gb.landAt) / (gb.setAt - gb.landAt), 0, 1);
        const fade = clamp((gb.dieAt - time) / 500, 0, 1);
        g.fillStyle(mixC(HW.sap, HW.amberDeep, setting * 0.6), (0.4 + setting * 0.35) * fade); g.fillEllipse(gb.x, gb.y, R * 2, R * 1.2);
        g.lineStyle(2, HW.amberLit, (0.4 + setting * 0.5) * fade); g.strokeEllipse(gb.x, gb.y, R * 2, R * 1.2);
        if (setting < 1) { g.lineStyle(2, HW.amberHot, 0.8); g.beginPath(); g.arc(gb.x, gb.y, R * 0.4, -Math.PI / 2, -Math.PI / 2 + setting * Math.PI * 2); g.strokePath(); }
        else {
          g.fillStyle(HW.amberHot, 0.5 * fade); g.fillTriangle(gb.x - 20, gb.y - 6, gb.x - 8, gb.y - 14, gb.x - 4, gb.y - 2);
        }
      }
    },
    drawAir(g, time) {
      for (const gb of globs) {
        if (gb.landed) continue;
        const k = clamp((time - gb.bornAt) / (gb.landAt - gb.bornAt), 0, 1);
        const x = gb.fx + (gb.x - gb.fx) * k, y = gb.fy + (gb.y - gb.fy) * k - Math.sin(k * Math.PI) * 160;
        sapDrop(g, x, y, 8, 1);
      }
      const p = tk.player;
      for (const gb of globs) if (gb.caught && time < gb.setAt + 1300) amberBlock(g, p.x, p.y, 30, 1, time / 1000);
    },
    onPhaseEnd() { globs = []; },
  };
};

// ── Signature: Timber! (phase 2) ─────────────────────────────────────
// Birches stand round the walls of his hall. He kicks their roots out one by one, and each
// tips and crashes across the room — its shadow lengthening across the floor as it falls.

const timber = (tk: BossToolkit): SignatureMove => {
  interface Fall { bx: number; by: number; a: number; len: number; bornAt: number; landAt: number; hit: boolean }
  const HALF = 34;
  let falls: Fall[] = [];
  return {
    durationMs: 3600,
    windupMs: 600,
    gesture: 'punch',
    tell: 'TIMBER!',
    cast(time) {
      tk.sfx('roar');
      falls = [];
      const n = tk.hard ? 4 : 3;
      for (let i = 0; i < n; i++) {
        tk.schedule(i * 700, () => {
          const p = tk.player;
          // A tree at a wall, falling so its length crosses where the player is now.
          const side = Math.floor(Math.random() * 4);
          let bx: number, by: number;
          if (side === 0) { bx = tk.clampX(p.x + (Math.random() - 0.5) * 300, 40); by = FIELD_TOP + 6; }
          else if (side === 1) { bx = tk.clampX(p.x + (Math.random() - 0.5) * 300, 40); by = tk.H - 8; }
          else if (side === 2) { bx = 10; by = tk.clampY(p.y + (Math.random() - 0.5) * 240, 40); }
          else { bx = tk.W - 10; by = tk.clampY(p.y + (Math.random() - 0.5) * 240, 40); }
          const a = Math.atan2(p.y - by, p.x - bx);
          falls.push({ bx, by, a, len: 720, bornAt: tk.now, landAt: tk.now + tk.warn(1250), hit: false });
          tk.sfx('wings');
        });
      }
    },
    update(time) {
      const p = tk.player;
      for (const f of falls) {
        if (f.hit || time < f.landAt) continue;
        f.hit = true;
        tk.sfx('stone-slam');
        if (segDist(p.x, p.y, f.bx, f.by, f.bx + Math.cos(f.a) * f.len, f.by + Math.sin(f.a) * f.len) < HALF + 16) {
          tk.hitPlayer(22, p.x, p.y);
        }
      }
      falls = falls.filter((f) => time < f.landAt + 1100);
    },
    drawGround(g, time) {
      for (const f of falls) {
        const k = clamp((time - f.bornAt) / (f.landAt - f.bornAt), 0, 1);
        const ux = Math.cos(f.a), uy = Math.sin(f.a), nx = -uy, ny = ux;
        if (time < f.landAt) {
          // The shadow of the falling tree, stretching out across the floor as it tips.
          const L = f.len * (0.25 + k * 0.75);
          const pts = [
            new Phaser.Geom.Point(f.bx + nx * HALF, f.by + ny * HALF), new Phaser.Geom.Point(f.bx - nx * HALF, f.by - ny * HALF),
            new Phaser.Geom.Point(f.bx - nx * HALF + ux * L, f.by - ny * HALF + uy * L), new Phaser.Geom.Point(f.bx + nx * HALF + ux * L, f.by + ny * HALF + uy * L),
          ];
          g.fillStyle(0x000000, 0.12 + k * 0.25); g.fillPoints(pts, true, true);
          g.lineStyle(2, HW.leafRust, 0.4 + k * 0.5); g.strokePoints(pts, true, true);
          // The crown's shadow at the far end.
          g.fillStyle(0x000000, 0.1 + k * 0.2); g.fillCircle(f.bx + ux * L, f.by + uy * L, 60 * k);
        } else {
          // The felled trunk lying across the room, then gone (rolled away by the court's foresters).
          const fade = 1 - clamp((time - f.landAt - 600) / 500, 0, 1);
          const ex = f.bx + ux * f.len, ey = f.by + uy * f.len;
          g.lineStyle(HALF * 2, BODY_DARK, fade); g.lineBetween(f.bx, f.by, ex, ey);
          g.lineStyle(HALF * 2 - 10, BODY, fade); g.lineBetween(f.bx, f.by, ex, ey);
          for (let d = 30; d < f.len; d += 40) lenticel(g, f.bx + ux * d + nx * (d % 3 - 1) * 10, f.by + uy * d + ny * (d % 3 - 1) * 10, 16, fade);
          const since = time - f.landAt;
          if (since < 300) {
            for (let i = 0; i < 10; i++) {
              const t = i / 10;
              g.fillStyle(HW.soilMid, 0.6 * (1 - since / 300));
              g.fillCircle(f.bx + ux * f.len * t + nx * (HALF + since * 0.1), f.by + uy * f.len * t + ny * (HALF + since * 0.1), 6);
              g.fillCircle(f.bx + ux * f.len * t - nx * (HALF + since * 0.1), f.by + uy * f.len * t - ny * (HALF + since * 0.1), 6);
            }
          }
        }
      }
    },
    drawAir(g, time) {
      for (const f of falls) {
        if (time >= f.landAt) continue;
        // The tree at its wall, tilting.
        const k = clamp((time - f.bornAt) / (f.landAt - f.bornAt), 0, 1);
        const tilt = k * k;
        const ux = Math.cos(f.a), uy = Math.sin(f.a);
        const h = 150 * (1 - tilt);
        const tx = f.bx + ux * 150 * tilt, ty = f.by + uy * 150 * tilt - h;
        g.lineStyle(14, BODY_DARK, 1); g.lineBetween(f.bx, f.by, tx, ty);
        g.lineStyle(10, BODY, 1); g.lineBetween(f.bx, f.by, tx, ty);
        g.fillStyle(HW.leafGold, 0.95); g.fillCircle(tx, ty, 26);
        g.fillStyle(HW.leafRust, 0.9); g.fillCircle(tx + 8, ty + 6, 16);
        g.fillStyle(HW.leafButter, 0.9); g.fillCircle(tx - 8, ty - 8, 12);
      }
    },
    onPhaseEnd() { falls = []; },
  };
};

// ── Signature: Seed Rain (phase 2) ───────────────────────────────────
// He shakes his crown and birch seeds come down — little winged samaras spiralling round and
// round as they fall. Where each lands, a ring of earth shows; then a thorned sapling bursts up.

const seedRain = (tk: BossToolkit): SignatureMove => {
  interface Seed { x: number; y: number; bornAt: number; landAt: number; sproutAt: number; done: boolean }
  const R = 46;
  let seeds: Seed[] = [];
  return {
    durationMs: 3000,
    windupMs: 500,
    hold: 'conduct',
    tell: 'SEED RAIN',
    cast(time) {
      tk.sfx('spore');
      seeds = [];
      const n = tk.hard ? 12 : 10;
      for (let i = 0; i < n; i++) {
        const p = tk.player;
        const near = i < 3;
        const x = near ? tk.clampX(p.x + (Math.random() - 0.5) * 140, 60) : 70 + Math.random() * (tk.W - 140);
        const y = near ? tk.clampY(p.y + (Math.random() - 0.5) * 120, 60) : FIELD_TOP + 50 + Math.random() * (tk.H - FIELD_TOP - 100);
        const landAt = time + 600 + i * 140;
        seeds.push({ x, y, bornAt: time, landAt, sproutAt: landAt + tk.warn(800), done: false });
      }
    },
    update(time) {
      const p = tk.player;
      for (const s of seeds) {
        if (s.done || time < s.sproutAt) continue;
        s.done = true;
        tk.sfx('thorn');
        if (Math.hypot(p.x - s.x, p.y - s.y) < R) { tk.hitPlayer(13, p.x, p.y); tk.slowPlayer(0.6, 600); }
      }
      seeds = seeds.filter((s) => time < s.sproutAt + 900);
    },
    drawGround(g, time) {
      for (const s of seeds) {
        if (time < s.landAt) { const k = (time - s.bornAt) / (s.landAt - s.bornAt); g.fillStyle(0x000000, 0.08 + k * 0.15); g.fillCircle(s.x, s.y, 6 + k * 6); continue; }
        if (time < s.sproutAt) {
          const k = (time - s.landAt) / (s.sproutAt - s.landAt);
          g.fillStyle(HW.soil, 0.25 + k * 0.4); g.fillEllipse(s.x, s.y, R * 2 * (0.4 + k * 0.6), R * 1.1 * (0.4 + k * 0.6));
          g.lineStyle(2, HW.leafGreen, 0.5 + k * 0.4); g.strokeEllipse(s.x, s.y, R * 2, R * 1.1);
          g.lineStyle(2, HW.leafGreen, 1); g.lineBetween(s.x, s.y, s.x, s.y - 6 * k);
        }
      }
    },
    drawAir(g, time) {
      for (const s of seeds) {
        if (time < s.landAt) {
          // A samara: two papery wings round a seed, spinning as it comes down.
          const k = (time - s.bornAt) / (s.landAt - s.bornAt);
          const spin = time / 60 + s.x;
          const x = s.x + Math.cos(spin) * 14 * (1 - k), y = s.y - (1 - k) * 220;
          for (const w of [0, Math.PI]) {
            const a = spin + w;
            g.fillStyle(HW.sapwood, 0.9); g.fillEllipse(x + Math.cos(a) * 6, y + Math.sin(a) * 2, 12, 5);
          }
          g.fillStyle(HW.plankDark, 1); g.fillCircle(x, y, 2.2);
          continue;
        }
        if (time >= s.sproutAt) {
          const since = time - s.sproutAt;
          const up = Math.min(1, since / 140) * (1 - clamp((since - 500) / 400, 0, 1));
          if (up <= 0) continue;
          // The sapling bursts up, thorny, and withers back.
          g.lineStyle(4, HW.barkShade, up); g.lineBetween(s.x, s.y, s.x, s.y - 40 * up);
          for (let i = 0; i < 6; i++) {
            const a = -Math.PI / 2 + (i - 2.5) * 0.45;
            g.lineStyle(2, HW.barkDark, up); g.lineBetween(s.x, s.y - 14 * up, s.x + Math.cos(a) * R * 0.8 * up, s.y - 14 * up + Math.sin(a) * R * 0.5 * up);
            leaf(g, s.x + Math.cos(a) * R * 0.8 * up, s.y - 14 * up + Math.sin(a) * R * 0.5 * up, a, 9, HW.leafGreen, up);
          }
        }
      }
    },
    onPhaseEnd() { seeds = []; },
  };
};

// ── Signature: The Swarm (hard) ──────────────────────────────────────
// The rot has hollowed him; something lives in there now. He splits along a seam and wasps
// boil out in three clouds that follow you, slowly — each a knot of buzzing you can outrun,
// but not out-wait. They sting whatever they reach, then disperse.

const swarm = (tk: BossToolkit): SignatureMove => {
  interface Cloud { x: number; y: number; vx: number; vy: number; bornAt: number; dieAt: number; seed: number }
  let clouds: Cloud[] = [];
  let lastSting = 0;
  return {
    durationMs: 3200,
    windupMs: 650,
    hold: 'brace',
    tell: 'THE SWARM',
    cast(time) {
      tk.sfx('drone-buzz');
      clouds = [];
      const n = 3;
      for (let i = 0; i < n; i++) {
        const a = tk.angleToPlayer() + (i - 1) * 1.1;
        clouds.push({ x: tk.bossX + Math.cos(a) * 30, y: tk.bossY + Math.sin(a) * 30, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, bornAt: time + i * 250, dieAt: time + 5200 + i * 250, seed: i * 7 });
      }
    },
    update(time, dt) {
      const p = tk.player;
      const s = dt > 1 ? dt / 1000 : dt;
      for (const c of clouds) {
        if (time < c.bornAt) continue;
        const a = Math.atan2(p.y - c.y, p.x - c.x);
        c.vx += (Math.cos(a) * 125 - c.vx) * Math.min(1, s * 1.6);
        c.vy += (Math.sin(a) * 125 - c.vy) * Math.min(1, s * 1.6);
        c.x = clamp(c.x + c.vx * s, 30, tk.W - 30); c.y = clamp(c.y + c.vy * s, FIELD_TOP + 10, tk.H - 20);
        if (Math.hypot(p.x - c.x, p.y - c.y) < 34 && time - lastSting > 500) {
          lastSting = time;
          tk.hitPlayer(9, p.x, p.y);
          tk.sfx('stab');
          c.dieAt = Math.min(c.dieAt, time + 400);
        }
      }
      clouds = clouds.filter((c) => time < c.dieAt);
    },
    drawAir(g, time) {
      const t = time / 1000;
      for (const c of clouds) {
        if (time < c.bornAt) continue;
        const fade = clamp((c.dieAt - time) / 400, 0, 1);
        g.fillStyle(HW.waspDark, 0.12 * fade); g.fillCircle(c.x, c.y, 34);
        for (let i = 0; i < 12; i++) {
          const a = t * (5 + (i % 3)) + i * 0.52 + c.seed;
          const r = 8 + ((i * 7) % 22);
          wasp(g, c.x + Math.cos(a) * r, c.y + Math.sin(a * 1.3) * r * 0.7, a + Math.PI / 2, 5, t + i, fade);
        }
      }
    },
    onPhaseEnd() { clouds = []; },
  };
};

// ── Signature: Heartrot (hard) ───────────────────────────────────────
// Dark rot runs out from his roots across the floor in creeping fingers, and where it has run
// it stays a while, soft and stinking. Standing on it eats at you.

const rot = (tk: BossToolkit): SignatureMove => {
  interface Patch { x: number; y: number; r: number; bornAt: number; liveAt: number; dieAt: number }
  let patches: Patch[] = [];
  let lastTick = 0;
  return {
    durationMs: 2200,
    windupMs: 600,
    gesture: 'slam',
    tell: 'HEARTROT',
    cast(time) {
      tk.sfx('curse-cast');
      patches = patches.filter((p) => p.dieAt > time);
      const fingers = 4;
      const base = tk.angleToPlayer();
      for (let f = 0; f < fingers; f++) {
        const a = base + (f - 1.5) * 0.7;
        for (let k = 1; k <= 5; k++) {
          const x = tk.clampX(tk.bossX + Math.cos(a + Math.sin(k) * 0.2) * k * 70, 50), y = tk.clampY(tk.bossY + Math.sin(a + Math.sin(k) * 0.2) * k * 70, 50);
          patches.push({ x, y, r: 40 - k * 2, bornAt: time + k * 140, liveAt: time + k * 140 + tk.warn(700), dieAt: time + k * 140 + 6500 });
        }
      }
    },
    update(time) {
      if (time - lastTick < 450) return;
      const p = tk.player;
      const on = patches.some((q) => time >= q.liveAt && time < q.dieAt && Math.hypot(p.x - q.x, p.y - q.y) < q.r);
      if (on) { lastTick = time; tk.hitPlayer(5, p.x, p.y); tk.slowPlayer(0.75, 450); }
      patches = patches.filter((q) => time < q.dieAt);
    },
    drawGround(g, time) {
      for (const q of patches) {
        if (time < q.bornAt) continue;
        const grow = clamp((time - q.bornAt) / 400, 0, 1);
        const live = time >= q.liveAt;
        const fade = clamp((q.dieAt - time) / 600, 0, 1);
        g.fillStyle(HW.rot, (live ? 0.75 : 0.3) * fade); g.fillCircle(q.x, q.y, q.r * grow);
        g.fillStyle(HW.rotLit, (live ? 0.5 : 0.2) * fade); g.fillCircle(q.x - q.r * 0.25, q.y - q.r * 0.2, q.r * 0.4 * grow);
        if (live) {
          // Little pale fungus fruiting on the rot.
          for (let i = 0; i < 3; i++) {
            const a = i * 2.1 + q.x;
            g.fillStyle(HW.lichen, 0.7 * fade); g.fillEllipse(q.x + Math.cos(a) * q.r * 0.6, q.y + Math.sin(a) * q.r * 0.5, 7, 4);
          }
        } else {
          g.lineStyle(1.5, HW.rotLit, 0.7); g.strokeCircle(q.x, q.y, q.r);
        }
      }
    },
    onPhaseEnd() { patches = []; },
  };
};

// ── The def ──────────────────────────────────────────────────────────

export const BIRCHBARK_BOSS: WorldBossDef = {
  worldId: 'isle:birchbark',
  name: 'Prince Birchbark',
  title: 'the Still Prince',
  color: BODY,
  colorLit: BODY_LIT,
  colorDark: BODY_DARK,
  accent: HW.amber,
  damageMult: 1.25,

  intro: [
    'You have walked up my tree without asking. I felt every step.',
    'Forty years I have not moved. Do you know how much patience that takes? You are about to.',
  ],
  banter: [
    'Mother tends the garden. I only keep the bark tidy.',
    'Every knot I grew shut is a household that did not give. The tree does not forget. Nor do I.',
    'Do you hear the mill? No. Nobody does. Keep it that way.',
    'My brothers and sisters fell to you. They were never rooted. Of course they fell.',
    'Sap is the tree\'s blood. Tithe is the city\'s. Both run to the crown.',
    'Twenty-two doors healed over. I could not tell you one name behind them.',
    'Stand still. Everything is easier, standing still.',
  ],
  defeatLine: 'THE STILL PRINCE FALLS',
  resumeLine: 'Another one climbing. The bark remembers the last.',

  phases: [
    {
      name: 'Rooted',
      line: 'I do not need to come to you. The tree will.',
      hp: 480,
      cycle: [
        'sig:roots', 'volley', 'sig:bough', 'sig:sapbleed',
        'sig:roots', 'quake', 'sig:sapbleed', 'sig:bough', 'barrage',
      ],
      harass: ['h-snipe', 'h-rune', 'h-flak'],
      restMs: 1100,
      harassMs: 3300,
    },
    {
      name: 'Timber!',
      line: 'Then I will pull myself up by the roots. Look what you made me do.',
      hp: 570,
      cycle: [
        'sig:timber', 'sig:seedrain', 'charge', 'sig:bough',
        'sig:timber', 'slamchain', 'sig:seedrain', 'lanes', 'sig:bough', 'charge',
      ],
      harass: ['h-snipe', 'h-lane', 'h-mines', 'h-flak'],
      restMs: 950,
      harassMs: 2800,
    },
  ],

  hard: {
    introLine: 'THE STILL PRINCE IS HOLLOW',
    extraPhase: {
      name: 'Heartrot',
      line: 'There is nothing left in me but rot. And what lives in rot.',
      hp: 410,
      cycle: [
        'sig:swarm', 'sig:rot', 'sig:timber', 'sig:swarm',
        'sig:roots', 'sig:rot', 'spiral', 'sig:seedrain', 'sig:swarm',
      ],
      harass: ['h-orbs', 'h-snipe', 'h-rune', 'h-mines'],
      restMs: 820,
      harassMs: 2400,
    },
  },

  tuning: {
    volley: { count: 6, spreadRad: 0.18, speed: 210 },
    quake: { rings: 3, gapHalf: 0.55 },
    barrage: { count: 6 },
    charge: { halfW: 50 },
    slamchain: { count: 5 },
    lanes: { halfW: 30 },
    spiral: { arms: 3, speed: 160 },
  },

  signatures: {
    roots,
    bough,
    sapbleed: sapBleed,
    timber,
    seedrain: seedRain,
    swarm,
    rot,
  },

  /**
   * The Heartroom, inside the west burl: a floor of the tree's own heartwood, dark red, the grain
   * running in long flowing lines round knots; a crescent of pale living columns round the
   * walls; amber knot-windows in the top wall; and at the foot of the room, set into the floor
   * like a threat, the iron plate of the sawmill's arbor that his mother had bolted there.
   */
  drawArena(g, W, H) {
    g.fillStyle(HW.heartDeep, 1); g.fillRect(0, 0, W, H);
    g.fillStyle(HW.heart, 1); g.fillRect(20, FIELD_TOP, W - 40, H - FIELD_TOP - 10);
    // Grain: long lines that bend round knots.
    const knots = [{ x: W * 0.3, y: FIELD_TOP + 160 }, { x: W * 0.68, y: H - 170 }, { x: W * 0.82, y: FIELD_TOP + 120 }];
    for (let row = FIELD_TOP + 10; row < H; row += 13) {
      g.lineStyle(row % 39 === 0 ? 2 : 1, row % 26 === 0 ? HW.heartLit : HW.heartDeep, 0.55);
      g.beginPath();
      for (let x = 20; x <= W - 20; x += 16) {
        let y = row + Math.sin(x * 0.006 + row * 0.02) * 6;
        for (const k of knots) {
          const d = Math.hypot(x - k.x, y - k.y);
          if (d < 90) y += ((y < k.y ? -1 : 1) * (90 - d)) * 0.35;
        }
        if (x === 20) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.strokePath();
    }
    for (const k of knots) {
      g.fillStyle(HW.heartDeep, 1); g.fillEllipse(k.x, k.y, 46, 30);
      for (let r = 6; r < 22; r += 5) { g.lineStyle(1.5, HW.heartLit, 0.6); g.strokeEllipse(k.x, k.y, r * 2, r * 1.3); }
      g.fillStyle(HW.mark, 1); g.fillCircle(k.x, k.y, 4);
    }
    // Living birch columns round the walls.
    for (let x = 30; x < W; x += 112) {
      for (const y of [FIELD_TOP + 4, H - 4]) {
        g.fillStyle(BODY_DARK, 1); g.fillCircle(x, y, 22);
        g.fillStyle(BODY, 1); g.fillCircle(x - 2, y - 2, 18);
        g.fillStyle(HW.mark, 0.8); g.fillEllipse(x - 2, y - 4, 16, 3);
      }
    }
    // Amber knot-windows along the top wall.
    for (let i = 0; i < 4; i++) {
      const x = W * (0.2 + i * 0.2), y = FIELD_TOP - 30;
      g.fillStyle(HW.heartDeep, 1); g.fillCircle(x, y, 24);
      g.fillStyle(HW.amber, 0.9); g.fillCircle(x, y, 18);
      g.fillStyle(HW.amberHot, 0.6); g.fillCircle(x - 5, y - 5, 6);
      g.fillStyle(HW.amber, 0.05); g.fillCircle(x, y + 40, 80);
    }
    // The mill's arbor plate, bolted into his floor.
    const px = W / 2, py = H - 50;
    g.fillStyle(HW.iron, 1); g.fillCircle(px, py, 30);
    g.fillStyle(HW.ironLit, 1); g.fillCircle(px - 3, py - 3, 24);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.fillStyle(HW.rust, 1); g.fillCircle(px + Math.cos(a) * 20, py + Math.sin(a) * 20, 3); }
    g.fillStyle(HW.iron, 1); g.fillCircle(px, py, 7);
  },

  look: { crest: 'tendrils', pattern: 'cracks', aura: 'leaves', hands: 'claw', torsoR: 42, mouth: 'line', eyes: 2, eyeColor: 0xf0a024 },

  /**
   * The birch ent: black lenticels barred across his pale round body, two great almond
   * eye-scars over his real eyes, a crown of turned leaves on twigs, and roots trailing into the
   * floor. Rooted, the roots fan out and dig in. Uprooted, they curl up under him and drag.
   * Hollow, a black split runs down his front with wasps crawling at its lips.
   */
  drawDecor(g, s) {
    const t = s.t / 1000;
    const r = s.radius;
    const rooted = s.phaseIdx === 0;
    const hollow = s.hard && s.phaseIdx >= 2;
    // Roots.
    const nRoots = 7;
    for (let i = 0; i < nRoots; i++) {
      const a = Math.PI * (0.15 + (i / (nRoots - 1)) * 0.7);
      const len = rooted ? r * (0.9 + (i % 3) * 0.25) : r * 0.45;
      const sx = s.x + Math.cos(a) * r * 0.8, sy = s.y + Math.sin(a) * r * 0.8;
      const curl = rooted ? 0 : Math.sin(t * 6 + i) * 0.5;
      const ex = sx + Math.cos(a + curl) * len, ey = sy + Math.sin(a + curl) * len * 0.6;
      g.lineStyle(6, BODY_DARK, 1); g.lineBetween(sx, sy, ex, ey);
      g.lineStyle(3.5, BODY, 1); g.lineBetween(sx, sy, ex, ey);
      if (rooted) { g.fillStyle(HW.soil, 0.6); g.fillEllipse(ex, ey + 2, 12, 5); }
    }
    // Lenticels across the body.
    for (let i = 0; i < 6; i++) {
      const yy = s.y - r * 0.6 + i * r * 0.24;
      const half = Math.sqrt(Math.max(0, r * r - (yy - s.y) ** 2));
      lenticel(g, s.x + ((i * 37) % 9 - 4) * r * 0.06, yy, half * (0.6 + (i % 2) * 0.3), 0.85);
    }
    // The eye-scars, brows above the real eyes.
    for (const side of [-1, 1]) {
      const ex = s.x + side * r * 0.38, ey = s.y - r * 0.32;
      g.lineStyle(3, HW.mark, 0.95);
      g.lineBetween(ex - side * r * 0.12, ey - r * 0.05, ex + side * r * 0.3, ey - r * 0.32);
      g.lineBetween(ex - side * r * 0.12, ey - r * 0.05, ex - side * r * 0.32, ey - r * 0.26);
    }
    // The crown of leaves.
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * (0.15 + (i / 8) * 0.7);
      const tx = s.x + Math.cos(a) * r * 1.25, ty = s.y + Math.sin(a) * r * 1.3;
      g.lineStyle(2.5, BODY_DARK, 1); g.lineBetween(s.x + Math.cos(a) * r * 0.85, s.y + Math.sin(a) * r * 0.85, tx, ty);
      const c = hollow ? (i % 2 ? HW.rotLit : HW.leafRed) : [HW.leafGold, HW.leafButter, HW.leafRust][i % 3];
      leaf(g, tx, ty, a + Math.sin(t * 1.5 + i) * 0.2, 13 + s.castGlow * 4, c, 1);
      leaf(g, tx + Math.cos(a + 0.6) * 8, ty + Math.sin(a + 0.6) * 8, a + 0.7, 10, c, 0.9);
    }
    if (hollow) {
      // The split: a black seam down his front, wasps crawling at its lips.
      g.fillStyle(HW.waspDark, 1);
      g.fillTriangle(s.x - r * 0.12, s.y - r * 0.1, s.x + r * 0.12, s.y - r * 0.1, s.x, s.y + r * 0.85);
      g.fillTriangle(s.x - r * 0.12, s.y - r * 0.1, s.x + r * 0.12, s.y - r * 0.1, s.x, s.y - r * 0.4);
      for (let i = 0; i < 4; i++) {
        const k = (t * 0.6 + i * 0.25) % 1;
        wasp(g, s.x + Math.sin(t * 3 + i) * r * 0.14, s.y - r * 0.3 + k * r * 1.1, Math.PI / 2, 4, t + i, 0.9);
      }
    }
    if (s.hurt) { g.fillStyle(HW.sap, 0.3); g.fillCircle(s.x, s.y, r * 0.9); }
  },

  phaseStyles: [
    { movement: 'anchor', gimmick: 'tremor' },
    { movement: 'stalk', gimmick: 'none', tint: 'hot', look: { aura: 'leaves', pattern: 'plates', hands: 'gauntlet', mouth: 'grate' } },
    { movement: 'hover', gimmick: 'stalkers', tint: 'sick', look: { aura: 'dust', pattern: 'drip', hands: 'wisp', eyeColor: 0xf2c21a } },
  ],
};
