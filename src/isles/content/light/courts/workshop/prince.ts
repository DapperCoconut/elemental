import type { BossBodyState, SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import type { StrikeTarget } from '../../../../IslesTypes';
import { dim, glow, lit, mulberry, type G } from '../../../../art/IsleArt';
import { blueprintSheet, gear, glint, lens, mirrorPane, sunburst } from './art';
import {
  ARTIFEX, ARTIFEX_DARK, ARTIFEX_LENS, ARTIFEX_LIT, BRASS, BRASS_DARK, BRASS_LIT, COPPER, COPPER_DARK, CYAN,
  GLASS_LIT, GOLD, HEAT_WHITE, IRON, IRON_DARK, IRON_LIT, LIME, LIME_DARK, LIME_LIT, MIRROR, MIRROR_DARK, MOLTEN,
  MOLTEN_LIT, OAK_DARK, SOOT, SUN,
} from './palette';
import { clamp, dist, ease, lerp, segDist } from './util';

/**
 * Prince Artifex, the Radiance of the Workshop — the Despot's maker.
 *
 * Artifex has never been unhappy in his life. He loves making things; he loves *the problem*, and
 * the Despot gave him the biggest problem there is: how to hold the sun still. He ground the
 * Heliostat's first mirror himself. Now he is building the Magnum Opus — a walking armature of
 * mirror and brass that will carry the noon into any shadow the Tribunal reports, so that there
 * is nowhere left on Solmara to hide at all. He does not think about the people it is for. He
 * thinks about the gearing.
 *
 * • **Tinkerer** (orbiting): he throws wind-up contraptions — clockwork beetles that march in lines
 *   and pop, spring-mines that leap at you when you come close, and a giant wind-up key flung like a
 *   boomerang that comes back.
 * • **Magnum Opus** (stalking, gilded): he climbs into the half-built armature. It stomps footprints
 *   that send out shockwaves, sweeps a beam from the lens in its chest, and flips its shoulder
 *   mirrors to walk burning sun-dots in on you.
 * • **Prototype Failure** (hard, rushing, hot): the armature comes apart — gears, plates and springs
 *   fly off and burst where they land, the gears rolling on, and the lens beam spins out of control,
 *   lurching back the other way.
 */

const TOP = 96;

// ── Signature: Clockwork Beetles ─────────────────────────────────────
// He winds a handful of brass beetles and tosses them round you. Each lands, then marches in a
// straight line, its key running down; when the key stops it shakes, flashes and pops. Touch one
// and it pops sooner; shoot one to pop it where it stands.

interface Beetle {
  x: number; y: number; a: number;
  fromX: number; fromY: number; landAt: number; thrownAt: number;
  fuseAt: number; popped: boolean; target: StrikeTarget | null; seed: number;
}

const beetles = (tk: BossToolkit): SignatureMove => {
  let bugs: Beetle[] = [];
  const FLY = 550, MARCH = 3000, FUSE = 650, R = 62;
  const fuse = (b: Beetle, ms: number) => { if (!b.popped) b.fuseAt = Math.min(b.fuseAt, tk.now + ms); };
  return {
    durationMs: 1300,
    windupMs: 600,
    gesture: 'sweep',
    tell: 'WIND-UP BEETLES',
    cast(time) {
      for (const b of bugs) b.target?.remove();
      const p = tk.player;
      const n = tk.hard ? 5 : 4;
      const base = Math.random() * Math.PI * 2;
      bugs = [];
      for (let i = 0; i < n; i++) {
        const a = base + (i / n) * Math.PI * 2;
        const x = tk.clampX(p.x + Math.cos(a) * 180), y = tk.clampY(p.y + Math.sin(a) * 150);
        const b: Beetle = {
          x, y, a: Math.atan2(p.y - y, p.x - x) + (Math.random() - 0.5) * 0.5,
          fromX: tk.bossX, fromY: tk.bossY - 20, thrownAt: time + i * 90, landAt: time + i * 90 + FLY,
          fuseAt: time + i * 90 + FLY + tk.warn(MARCH), popped: false, target: null, seed: Math.random() * 6,
        };
        b.target = tk.spawnTarget({ x, y, r: 16, onStruck: () => fuse(b, 220) });
        bugs.push(b);
      }
      tk.sfx('gear-turn');
    },
    update(time, dt) {
      const p = tk.player;
      for (const b of bugs) {
        if (b.popped || time < b.landAt) continue;
        if (time < b.fuseAt) {
          // March on, bouncing off the walls.
          const sp = 78 * Math.min(1, (b.fuseAt - time) / 1200 + 0.3);
          b.x += Math.cos(b.a) * sp * dt; b.y += Math.sin(b.a) * sp * dt;
          if (b.x < 40 || b.x > tk.W - 40) b.a = Math.PI - b.a;
          if (b.y < TOP + 30 || b.y > tk.H - 30) b.a = -b.a;
          b.x = tk.clampX(b.x, 40); b.y = tk.clampY(b.y, 30);
          b.target?.moveTo(b.x, b.y);
          if (p.active && p.hp > 0 && dist(p.x, p.y, b.x, b.y) < 30) fuse(b, 380);
        } else if (time >= b.fuseAt + FUSE) {
          b.popped = true;
          b.target?.remove(); b.target = null;
          tk.explode(b.x, b.y, R, 12, MOLTEN);
          tk.sfx('explosion-small');
        }
      }
    },
    drawGround(g, time) {
      for (const b of bugs) {
        if (b.popped || time < b.landAt) continue;
        if (time >= b.fuseAt) {
          const k = clamp((time - b.fuseAt) / FUSE, 0, 1);
          g.fillStyle(MOLTEN, 0.1 + k * 0.2); g.fillCircle(b.x, b.y, R);
          g.lineStyle(2, MOLTEN_LIT, 0.5 + k * 0.5); g.strokeCircle(b.x, b.y, R * k);
          g.lineStyle(2, MOLTEN, 0.8); g.strokeCircle(b.x, b.y, R);
        } else {
          // A faint scratch-line ahead: where it's marching.
          g.lineStyle(1.5, BRASS, 0.25); g.lineBetween(b.x, b.y, b.x + Math.cos(b.a) * 60, b.y + Math.sin(b.a) * 60);
        }
      }
    },
    drawAir(g, time) {
      for (const b of bugs) {
        if (b.popped || time < b.thrownAt) continue;
        if (time < b.landAt) {
          const k = clamp((time - b.thrownAt) / FLY, 0, 1);
          const x = lerp(b.fromX, b.x, k), y = lerp(b.fromY, b.y, k) - Math.sin(k * Math.PI) * 90;
          drawBeetle(g, x, y, k * 12, 0, 1, time);
          continue;
        }
        const left = clamp((b.fuseAt - time) / 3000, 0, 1);
        const shake = time >= b.fuseAt ? Math.sin(time / 25) * 2 : 0;
        drawBeetle(g, b.x + shake, b.y, b.a, time, left, time);
      }
    },
    onPhaseEnd() { for (const b of bugs) b.target?.remove(); bugs = []; },
  };
};

/** A clockwork beetle: split brass wing-cases, six ticking legs, a wind-up key on its back turning as it runs down. */
function drawBeetle(g: G, x: number, y: number, a: number, walkT: number, keyLeft: number, time: number): void {
  const ca = Math.cos(a), sa = Math.sin(a);
  const P = (fx: number, fy: number) => ({ x: x + ca * fx - sa * fy, y: y + sa * fx + ca * fy });
  g.fillStyle(0x000000, 0.2); g.fillEllipse(x, y + 8, 26, 8);
  // Legs.
  for (let i = 0; i < 3; i++) {
    for (const s of [-1, 1]) {
      const tick = walkT ? Math.sin(walkT / 60 + i * 2 + (s > 0 ? Math.PI : 0)) * 3 : 0;
      const p0 = P(-5 + i * 5, s * 6), p1 = P(-7 + i * 6 + tick, s * 13);
      g.lineStyle(1.5, IRON_DARK, 1); g.lineBetween(p0.x, p0.y, p1.x, p1.y);
    }
  }
  // Body and wing-cases.
  const c = P(0, 0), h = P(11, 0);
  g.fillStyle(IRON_DARK, 1); g.fillCircle(h.x, h.y, 5);
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(c.x, c.y, 11);
  for (const s of [-1, 1]) {
    const w = P(-1, s * 4.5);
    g.fillStyle(s < 0 ? BRASS : lit(BRASS, 0.1), 1); g.fillEllipse(w.x, w.y, 18, 10);
  }
  const seam0 = P(-10, 0), seam1 = P(9, 0);
  g.lineStyle(1, BRASS_DARK, 1); g.lineBetween(seam0.x, seam0.y, seam1.x, seam1.y);
  const hl = P(2, -5);
  g.fillStyle(BRASS_LIT, 0.8); g.fillCircle(hl.x, hl.y, 2);
  // Eyes — two lens chips.
  for (const s of [-1, 1]) { const e = P(13, s * 3); g.fillStyle(ARTIFEX_LENS, 1); g.fillCircle(e.x, e.y, 1.4); }
  // The key on its back, turning slower as it runs down.
  const k = P(-3, 0);
  const rot = time / (90 + (1 - keyLeft) * 600);
  g.lineStyle(2, IRON_LIT, 1); g.lineBetween(k.x, k.y, k.x, k.y - 9);
  g.lineStyle(1.5, BRASS_LIT, 1);
  g.strokeEllipse(k.x + Math.cos(rot) * 4, k.y - 12, Math.abs(Math.cos(rot)) * 7 + 1, 5);
  g.strokeEllipse(k.x - Math.cos(rot) * 4, k.y - 12, Math.abs(Math.cos(rot)) * 7 + 1, 5);
}

// ── Signature: Spring-Mines ──────────────────────────────────────────
// A ring of coiled spring-mines lands round you. Each arms with a clack; come within its reach and
// it leaps at the spot you stood on — a circle marks the landing — and bursts. Shoot one and it
// bursts where it sits.

interface SpringMine {
  x: number; y: number; fromX: number; fromY: number;
  thrownAt: number; armAt: number; dieAt: number;
  state: 'fly' | 'armed' | 'leap' | 'done';
  leapAt: number; sx: number; sy: number; tx: number; ty: number;
  target: StrikeTarget | null;
}

const springMines = (tk: BossToolkit): SignatureMove => {
  let mines: SpringMine[] = [];
  const FLY = 700, ARM = 800, REACH = 105, LEAP = 650, BLAST = 56;
  const burst = (m: SpringMine, x: number, y: number) => {
    m.state = 'done';
    m.target?.remove(); m.target = null;
    tk.explode(x, y, BLAST, 13, BRASS_LIT);
    tk.sfx('explosion-small');
  };
  return {
    durationMs: 1100,
    windupMs: 550,
    gesture: 'clap',
    tell: 'SPRING-MINES',
    cast(time) {
      for (const m of mines) m.target?.remove();
      const p = tk.player;
      const n = Math.min(tk.hard ? 6 : 5, tk.maxMinesOnRing(190));
      const base = Math.random() * Math.PI * 2;
      mines = [];
      for (let i = 0; i < n; i++) {
        const a = base + (i / n) * Math.PI * 2;
        const x = tk.clampX(p.x + Math.cos(a) * 190), y = tk.clampY(p.y + Math.sin(a) * 160);
        const m: SpringMine = {
          x, y, fromX: tk.bossX, fromY: tk.bossY - 20, thrownAt: time + i * 70, armAt: time + i * 70 + FLY + tk.warn(ARM),
          dieAt: time + 9500, state: 'fly', leapAt: 0, sx: x, sy: y, tx: x, ty: y, target: null,
        };
        m.target = tk.spawnTarget({ x, y, r: 16, onStruck: () => { if (m.state === 'armed') burst(m, m.x, m.y); } });
        mines.push(m);
      }
      tk.sfx('trap-set');
    },
    update(time) {
      const p = tk.player;
      for (const m of mines) {
        if (m.state === 'fly' && time >= m.armAt) { m.state = 'armed'; tk.sfx('trap-snap'); }
        else if (m.state === 'armed') {
          if (time >= m.dieAt) { m.state = 'done'; m.target?.remove(); m.target = null; tk.boom(m.x, m.y, 20, BRASS); continue; }
          if (p.active && p.hp > 0 && dist(p.x, p.y, m.x, m.y) < REACH) {
            m.state = 'leap'; m.leapAt = time; m.sx = m.x; m.sy = m.y; m.tx = p.x; m.ty = p.y;
            m.target?.remove(); m.target = null;
            tk.sfx('boing');
          }
        } else if (m.state === 'leap') {
          const k = clamp((time - m.leapAt) / tk.warn(LEAP), 0, 1);
          m.x = lerp(m.sx, m.tx, k); m.y = lerp(m.sy, m.ty, k);
          if (k >= 1) burst(m, m.tx, m.ty);
        }
      }
    },
    drawGround(g, time) {
      for (const m of mines) {
        if (m.state === 'armed') {
          g.lineStyle(1, BRASS, 0.18 + Math.sin(time / 200) * 0.06); g.strokeCircle(m.x, m.y, REACH);
        } else if (m.state === 'leap') {
          const k = clamp((time - m.leapAt) / tk.warn(LEAP), 0, 1);
          g.fillStyle(BRASS_LIT, 0.1 + k * 0.2); g.fillCircle(m.tx, m.ty, BLAST);
          g.lineStyle(2, BRASS_LIT, 0.8); g.strokeCircle(m.tx, m.ty, BLAST);
          g.lineStyle(2, MOLTEN, 0.7); g.strokeCircle(m.tx, m.ty, BLAST * k);
        }
      }
    },
    drawAir(g, time) {
      for (const m of mines) {
        if (m.state === 'done' || time < m.thrownAt) continue;
        let x = m.x, y = m.y, comp = 0;
        if (m.state === 'fly') {
          const k = clamp((time - m.thrownAt) / FLY, 0, 1);
          x = lerp(m.fromX, m.x, k); y = lerp(m.fromY, m.y, k) - Math.sin(k * Math.PI) * 80;
          comp = time > m.thrownAt + FLY ? clamp((time - m.thrownAt - FLY) / tk.warn(ARM), 0, 1) : 0;
        } else if (m.state === 'armed') comp = 1;
        else {
          const k = clamp((time - m.leapAt) / tk.warn(LEAP), 0, 1);
          y -= Math.sin(k * Math.PI) * 110;
          comp = 0;
        }
        g.fillStyle(0x000000, 0.2); g.fillEllipse(m.x, m.y + 8, 24, 7);
        // Base plate, the coil (squashed when armed), and a brass cap with a red tell-tale.
        g.fillStyle(IRON_DARK, 1); g.fillEllipse(x, y + 4, 24, 8);
        const coilH = 18 - comp * 10;
        g.lineStyle(2, IRON_LIT, 1);
        for (let i = 0; i < 5; i++) g.strokeEllipse(x, y + 2 - (i * coilH) / 5, 14, 4);
        g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x, y - coilH, 20, 8);
        g.fillStyle(BRASS, 1); g.fillEllipse(x, y - coilH - 1, 18, 6);
        if (m.state === 'armed') { g.fillStyle(Math.sin(time / 150) > 0 ? 0xff4a2a : 0x6a1a10, 1); g.fillCircle(x, y - coilH - 2, 2.4); }
      }
    },
    onPhaseEnd() { for (const m of mines) m.target?.remove(); mines = []; },
  };
};

// ── Signature: The Mainspring Key ────────────────────────────────────
// He flings a wind-up key as long as a man. It spins out along a line — chalked first — and
// curves back to his hand. It hits going out and coming back.

const mainspringKey = (tk: BossToolkit): SignatureMove => {
  let live = false;
  let at = 0, aim = 0, ox = 0, oy = 0;
  let lastHit = 0;
  let kx = 0, ky = 0;
  const OUT = 900, BACK = 900, LEAD = 450, REACH = 540;
  return {
    durationMs: 900,
    windupMs: 650,
    gesture: 'sweep',
    tell: 'THE MAINSPRING KEY',
    cast(time) {
      live = true; at = time; aim = tk.angleToPlayer(); ox = tk.bossX; oy = tk.bossY - 10; kx = ox; ky = oy;
      tk.sfx('whoosh');
    },
    update(time) {
      if (!live) return;
      const t = time - at - tk.warn(LEAD);
      if (t < 0) return;
      if (t < OUT) {
        const k = ease(t / OUT);
        kx = ox + Math.cos(aim) * REACH * k + Math.sin(k * Math.PI) * Math.cos(aim + Math.PI / 2) * 50;
        ky = oy + Math.sin(aim) * REACH * k + Math.sin(k * Math.PI) * Math.sin(aim + Math.PI / 2) * 50;
      } else if (t < OUT + BACK) {
        const k = ease((t - OUT) / BACK);
        const ex = ox + Math.cos(aim) * REACH, ey = oy + Math.sin(aim) * REACH;
        // Home is wherever he stands now.
        kx = lerp(ex, tk.bossX, k) - Math.sin(k * Math.PI) * Math.cos(aim + Math.PI / 2) * 60;
        ky = lerp(ey, tk.bossY - 10, k) - Math.sin(k * Math.PI) * Math.sin(aim + Math.PI / 2) * 60;
      } else { live = false; return; }
      const p = tk.player;
      if (p.active && p.hp > 0 && dist(p.x, p.y, kx, ky) < 36 && time - lastHit > 600) {
        lastHit = time;
        tk.hitPlayer(14, p.x, p.y);
        tk.sfx('clang');
      }
    },
    drawGround(g, time) {
      if (!live) return;
      const t = time - at;
      if (t < tk.warn(LEAD) + OUT) {
        // The chalked throw-line.
        const a = clamp(1 - t / (tk.warn(LEAD) + OUT), 0.2, 1);
        for (let d = 30; d < REACH; d += 24) {
          const k = d / REACH;
          const x = ox + Math.cos(aim) * d + Math.sin(k * Math.PI) * Math.cos(aim + Math.PI / 2) * 50;
          const y = oy + Math.sin(aim) * d + Math.sin(k * Math.PI) * Math.sin(aim + Math.PI / 2) * 50;
          g.fillStyle(CYAN, 0.6 * a); g.fillRect(x - 5, y - 1, 10, 2);
        }
      }
    },
    drawAir(g, time) {
      if (!live || time - at < tk.warn(LEAD)) return;
      drawKey(g, kx, ky, time / 70, 1.4);
    },
    onPhaseEnd() { live = false; },
  };
};

/** A wind-up key: a figure-eight bow, a shaft, a toothed bit. `rot` spins it. */
function drawKey(g: G, x: number, y: number, rot: number, s: number): void {
  const c = Math.cos(rot), sn = Math.sin(rot);
  const P = (fx: number, fy: number) => ({ x: x + (c * fx - sn * fy) * s, y: y + (sn * fx + c * fy) * s });
  const a = P(-18, 0), b = P(14, 0);
  g.lineStyle(5 * s, BRASS_DARK, 1); g.lineBetween(a.x, a.y, b.x, b.y);
  g.lineStyle(3 * s, BRASS, 1); g.lineBetween(a.x, a.y, b.x, b.y);
  for (const k of [-1, 1]) {
    const lp = P(-24, k * 8);
    g.lineStyle(3.5 * s, BRASS, 1); g.strokeCircle(lp.x, lp.y, 7 * s);
    g.lineStyle(1.2 * s, BRASS_LIT, 1); g.strokeCircle(lp.x - 1, lp.y - 1, 5 * s);
  }
  for (let i = 0; i < 3; i++) {
    const t0 = P(8 + i * 3, 0), t1 = P(8 + i * 3, i % 2 ? 6 : 8);
    g.lineStyle(2.5 * s, BRASS_DARK, 1); g.lineBetween(t0.x, t0.y, t1.x, t1.y);
  }
  const hl = P(-4, -1);
  g.fillStyle(0xffffff, 0.7); g.fillCircle(hl.x, hl.y, 1.5 * s);
}

// ── Signature: Stride ────────────────────────────────────────────────
// The armature strides at you: its great soled feet come down one after another along a line, each
// footprint chalked first, each landing sending a shockwave ring out across the floor.

interface Foot { x: number; y: number; at: number; dealt: boolean; ringHit: boolean; side: number; a: number }

const stride = (tk: BossToolkit): SignatureMove => {
  let feet: Foot[] = [];
  const FW = 92, FH = 52, RING = 160, RING_MS = 460;
  const inFoot = (f: Foot, x: number, y: number) => {
    const dx = x - f.x, dy = y - f.y;
    return (dx * dx) / ((FW / 2) * (FW / 2)) + (dy * dy) / ((FH / 2) * (FH / 2)) < 1.2;
  };
  return {
    durationMs: 2400,
    windupMs: 700,
    gesture: 'slam',
    tell: 'STRIDE',
    cast(time) {
      const p = tk.player;
      const a = tk.angleToPlayer();
      const n = tk.hard ? 4 : 3;
      const step = clamp(dist(tk.bossX, tk.bossY, p.x, p.y) / n, 80, 140);
      feet = [];
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1;
        const d = step * (i + 1);
        feet.push({
          x: tk.clampX(tk.bossX + Math.cos(a) * d + Math.cos(a + Math.PI / 2) * side * 34),
          y: tk.clampY(tk.bossY + Math.sin(a) * d + Math.sin(a + Math.PI / 2) * side * 34),
          at: time + tk.warn(900) + i * 520, dealt: false, ringHit: false, side, a,
        });
      }
      tk.sfx('engine');
    },
    update(time) {
      const p = tk.player;
      const live = p.active && p.hp > 0;
      for (const f of feet) {
        if (!f.dealt && time >= f.at) {
          f.dealt = true;
          tk.sfx('stone-slam');
          if (live && inFoot(f, p.x, p.y)) { tk.hitPlayer(17, p.x, p.y); f.ringHit = true; }
        }
        if (f.dealt && !f.ringHit && time - f.at < RING_MS && live) {
          const r = ((time - f.at) / RING_MS) * RING;
          if (Math.abs(dist(p.x, p.y, f.x, f.y) - r) < 16 && r > 30) { f.ringHit = true; tk.hitPlayer(8, p.x, p.y); tk.slowPlayer(0.7, 500); }
        }
      }
      feet = feet.filter((f) => !f.dealt || time - f.at < 1400);
    },
    drawGround(g, time) {
      for (const f of feet) {
        if (!f.dealt) {
          const k = clamp(1 - (f.at - time) / tk.warn(900), 0, 1);
          drawSole(g, f.x, f.y, f.a, 0.35 + k * 0.5, false);
        } else {
          const age = time - f.at;
          drawSole(g, f.x, f.y, f.a, clamp(1 - age / 1400, 0, 1) * 0.8, true);
          if (age < RING_MS) {
            const r = (age / RING_MS) * RING;
            g.lineStyle(5, BRASS_LIT, 1 - age / RING_MS); g.strokeCircle(f.x, f.y, r);
            g.lineStyle(2, 0xffffff, 0.6 * (1 - age / RING_MS)); g.strokeCircle(f.x, f.y, r - 4);
          }
        }
      }
    },
    drawAir(g, time) {
      // The armature's foot, coming down out of the air.
      for (const f of feet) {
        if (f.dealt) continue;
        const k = clamp(1 - (f.at - time) / 520, 0, 1);
        if (k <= 0) continue;
        const h = (1 - k) * 120;
        g.fillStyle(BRASS_DARK, 0.9); g.fillEllipse(f.x, f.y - h - 6, FW * 0.9, FH * 0.55);
        g.fillStyle(BRASS, 0.9); g.fillEllipse(f.x, f.y - h - 10, FW * 0.85, FH * 0.45);
        g.fillStyle(MIRROR, 0.9); g.fillRect(f.x - 10, f.y - h - 40, 20, 28);
        g.lineStyle(10, BRASS_DARK, 1); g.lineBetween(f.x, f.y - h - 12, f.x - 6, f.y - h - 90);
      }
    },
    onPhaseEnd() { feet = []; },
  };
};

/** A sole-print: an elliptical brass sole with a tread of bars and a hobnailed heel. */
function drawSole(g: G, x: number, y: number, a: number, alpha: number, struck: boolean): void {
  const c = Math.cos(a), s = Math.sin(a);
  g.fillStyle(struck ? SOOT : BRASS, (struck ? 0.35 : 0.18) * alpha * 2);
  g.fillEllipse(x, y, 92, 52);
  g.lineStyle(2, struck ? IRON_DARK : BRASS_LIT, alpha); g.strokeEllipse(x, y, 92, 52);
  for (let i = -2; i <= 2; i++) {
    const cx = x + c * i * 14, cy = y + s * i * 9;
    g.lineStyle(3, struck ? IRON_DARK : BRASS_LIT, alpha * 0.8);
    g.lineBetween(cx - s * 14, cy + c * 9, cx + s * 14, cy - c * 9);
  }
  if (struck) for (let i = 0; i < 6; i++) { g.lineStyle(1.5, IRON_DARK, alpha * 0.8); const b = i * 1.05; g.lineBetween(x + Math.cos(b) * 40, y + Math.sin(b) * 24, x + Math.cos(b) * 62, y + Math.sin(b) * 36); }
}

// ── Signature: Lens Sweep ────────────────────────────────────────────
// The lens in the armature's chest gathers the noon — the sector it will sweep is drawn on the floor
// — then lets go: a white beam sweeps across the sector, scorching the floor behind it.

const lensSweep = (tk: BossToolkit): SignatureMove => {
  let live = false;
  let at = 0, a0 = 0, a1 = 0, lastHit = 0;
  const CHARGE = 1050, SWEEP = 1400, LEN = 900, HALF = 16;
  const scorch: { a: number; t: number }[] = [];
  const angleAt = (time: number) => lerp(a0, a1, ease(clamp((time - at - tk.warn(CHARGE)) / SWEEP, 0, 1)));
  return {
    durationMs: 2700,
    windupMs: 500,
    hold: 'charge',
    tell: 'LENS SWEEP',
    cast(time) {
      live = true; at = time;
      const aim = tk.angleToPlayer();
      const dir = Math.random() < 0.5 ? 1 : -1;
      const span = tk.hard ? 1.9 : 1.7;
      a0 = aim - dir * span / 2; a1 = aim + dir * span / 2;
      scorch.length = 0;
      tk.sfx('beam-charge');
    },
    update(time) {
      if (!live) return;
      const t = time - at - tk.warn(CHARGE);
      if (t < 0) return;
      if (t > SWEEP) { live = false; return; }
      const a = angleAt(time);
      if (scorch.length === 0 || time - scorch[scorch.length - 1].t > 40) scorch.push({ a, t: time });
      if (t < 60) tk.sfx('beam-fire');
      const p = tk.player;
      const bx = tk.bossX, by = tk.bossY - 14;
      if (p.active && p.hp > 0 && time - lastHit > 400 && segDist(p.x, p.y, bx, by, bx + Math.cos(a) * LEN, by + Math.sin(a) * LEN) < HALF + 12) {
        lastHit = time;
        tk.hitPlayer(14, p.x, p.y);
      }
    },
    drawGround(g, time) {
      const bx = tk.bossX, by = tk.bossY - 14;
      // Scorch lines fading behind the sweep.
      for (const s of scorch) {
        const k = clamp(1 - (time - s.t) / 1600, 0, 1);
        if (k <= 0) continue;
        g.lineStyle(3, SOOT, 0.25 * k); g.lineBetween(bx + Math.cos(s.a) * 40, by + Math.sin(s.a) * 40, bx + Math.cos(s.a) * LEN, by + Math.sin(s.a) * LEN);
      }
      if (!live) return;
      const t = time - at;
      if (t < tk.warn(CHARGE)) {
        // The sector, filling in as the lens charges, an arrow showing the direction of sweep.
        const k = t / tk.warn(CHARGE);
        const lo = Math.min(a0, a1), hi = Math.max(a0, a1);
        g.fillStyle(SUN, 0.06 + k * 0.1);
        g.beginPath(); g.moveTo(bx, by); g.arc(bx, by, 520, lo, hi, false); g.closePath(); g.fillPath();
        g.lineStyle(2, SUN, 0.5 + k * 0.4);
        g.lineBetween(bx, by, bx + Math.cos(a0) * 520, by + Math.sin(a0) * 520);
        g.lineStyle(1, SUN, 0.4); g.lineBetween(bx, by, bx + Math.cos(a1) * 520, by + Math.sin(a1) * 520);
        const mid = (a0 + a1) / 2, dir = Math.sign(a1 - a0);
        const ax = bx + Math.cos(mid) * 300, ay = by + Math.sin(mid) * 300;
        const tang = mid + dir * Math.PI / 2;
        g.fillStyle(SUN, 0.5 + k * 0.4);
        g.fillTriangle(ax + Math.cos(tang) * 16, ay + Math.sin(tang) * 16, ax + Math.cos(mid) * 8, ay + Math.sin(mid) * 8, ax - Math.cos(mid) * 8, ay - Math.sin(mid) * 8);
      }
    },
    drawAir(g, time) {
      if (!live) return;
      const t = time - at - tk.warn(CHARGE);
      const bx = tk.bossX, by = tk.bossY - 14;
      if (t < 0) {
        const k = clamp((time - at) / tk.warn(CHARGE), 0, 1);
        glow(g, bx, by, 10 + k * 24, SUN, 0.1, 3);
        return;
      }
      const a = angleAt(time);
      const ex = bx + Math.cos(a) * LEN, ey = by + Math.sin(a) * LEN;
      g.lineStyle(HALF * 2 + 10, SUN, 0.18); g.lineBetween(bx, by, ex, ey);
      g.lineStyle(HALF * 2, 0xfff6d0, 0.55); g.lineBetween(bx, by, ex, ey);
      g.lineStyle(HALF * 0.8, 0xffffff, 0.95); g.lineBetween(bx, by, ex, ey);
      // Caustic sparkles along it.
      for (let i = 0; i < 8; i++) {
        const d = ((time / 3 + i * 97) % LEN);
        glint(g, bx + Math.cos(a) * d, by + Math.sin(a) * d, 0.6, 6);
      }
      glow(g, bx, by, 30, SUN, 0.12, 3);
    },
    onPhaseEnd() { live = false; scorch.length = 0; },
  };
};

// ── Signature: Heliograph ────────────────────────────────────────────
// The armature's shoulder mirrors flip to the sun and throw burning dots onto the floor round you.
// The dots creep in on you, gold to white, then hold — and scorch.

interface SunDot { x: number; y: number; at: number; lockAt: number; fireAt: number; dealt: boolean }

const heliograph = (tk: BossToolkit): SignatureMove => {
  let dots: SunDot[] = [];
  const CREEP = 1300, HOLD = 380, R = 46;
  return {
    durationMs: 1900,
    windupMs: 550,
    gesture: 'raise',
    tell: 'HELIOGRAPH',
    cast(time) {
      const p = tk.player;
      const n = tk.hard ? 5 : 4;
      const base = Math.random() * Math.PI * 2;
      dots = [];
      for (let i = 0; i < n; i++) {
        const a = base + (i / n) * Math.PI * 2;
        const lockAt = time + tk.warn(CREEP) + i * 140;
        dots.push({ x: tk.clampX(p.x + Math.cos(a) * 170), y: tk.clampY(p.y + Math.sin(a) * 150), at: time, lockAt, fireAt: lockAt + tk.warn(HOLD), dealt: false });
      }
      tk.sfx('prism');
    },
    update(time, dt) {
      const p = tk.player;
      for (const d of dots) {
        if (time < d.lockAt && p.active) {
          const a = Math.atan2(p.y - d.y, p.x - d.x);
          const sp = Math.min(72 * dt, dist(d.x, d.y, p.x, p.y));
          d.x += Math.cos(a) * sp; d.y += Math.sin(a) * sp;
        }
        if (!d.dealt && time >= d.fireAt) {
          d.dealt = true;
          tk.sfx('sizzle');
          if (p.active && p.hp > 0 && dist(p.x, p.y, d.x, d.y) < R) tk.hitPlayer(13, p.x, p.y);
        }
      }
      dots = dots.filter((d) => !d.dealt || time - d.fireAt < 500);
    },
    drawGround(g, time) {
      for (const d of dots) {
        if (d.dealt) {
          const k = clamp((time - d.fireAt) / 500, 0, 1);
          g.fillStyle(SOOT, 0.4 * (1 - k)); g.fillCircle(d.x, d.y, R * 0.8);
          g.fillStyle(0xffffff, 0.7 * (1 - k)); g.fillCircle(d.x, d.y, R * (1 + k * 0.3));
          continue;
        }
        const locked = time >= d.lockAt;
        const k = clamp((time - d.at) / (d.fireAt - d.at), 0, 1);
        const c = locked ? 0xffffff : lerpColor(GOLD, 0xfff6e0, k);
        glow(g, d.x, d.y, R * 0.6 + k * 20, c, 0.06 + k * 0.05, 3);
        g.lineStyle(2, c, 0.5 + k * 0.4); g.strokeCircle(d.x, d.y, R);
        g.fillStyle(c, 0.2 + k * 0.4); g.fillCircle(d.x, d.y, R * (0.25 + k * 0.4));
        if (locked) { g.lineStyle(3, 0xffffff, 0.9); g.strokeCircle(d.x, d.y, R * (1 - clamp((time - d.lockAt) / tk.warn(HOLD), 0, 1)) + 4); }
      }
    },
    drawAir(g, time) {
      // The thin bright lines from the shoulder mirrors to each dot.
      for (const d of dots) {
        if (d.dealt) continue;
        const k = clamp((time - d.at) / (d.fireAt - d.at), 0, 1);
        for (const s of [-1, 1]) {
          const mx = tk.bossX + s * 30, my = tk.bossY - 44;
          g.lineStyle(1.2, SUN, 0.25 + k * 0.4); g.lineBetween(mx, my, d.x, d.y);
        }
      }
    },
    onPhaseEnd() { dots = []; },
  };
};

const lerpColor = (a: number, b: number, t: number): number => {
  const r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, t));
  const gg = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t));
  const bb = Math.round(lerp(a & 255, b & 255, t));
  return (r << 16) | (gg << 8) | bb;
};

// ── Signature: Parts Fly Off ─────────────────────────────────────────
// (Prototype Failure.) The armature sheds itself: gears, mirror plates and springs fly off in arcs,
// each landing spot marked with a crosshair, and burst where they land. The gears roll on.

interface Flying { kind: 'gear' | 'plate' | 'spring'; sx: number; sy: number; x: number; y: number; at: number; landAt: number; dealt: boolean; spin: number }

const partsFly = (tk: BossToolkit): SignatureMove => {
  let parts: Flying[] = [];
  const FLY = 1050, R = 50;
  return {
    durationMs: 1500,
    windupMs: 450,
    gesture: 'recoil',
    tell: 'PARTS FLY OFF',
    cast(time) {
      const p = tk.player;
      const n = 7;
      parts = [];
      for (let i = 0; i < n; i++) {
        // Half round the stranger, half anywhere.
        const near = i % 2 === 0;
        const a = Math.random() * Math.PI * 2, d = near ? 40 + Math.random() * 140 : 120 + Math.random() * 260;
        const cx = near ? p.x : tk.bossX, cy = near ? p.y : tk.bossY;
        parts.push({
          kind: (['gear', 'plate', 'spring'] as const)[i % 3], sx: tk.bossX, sy: tk.bossY - 30,
          x: tk.clampX(cx + Math.cos(a) * d), y: tk.clampY(cy + Math.sin(a) * d),
          at: time + i * 110, landAt: time + i * 110 + tk.warn(FLY), dealt: false, spin: Math.random() * 6,
        });
      }
      tk.sfx('explosion-medium');
    },
    update(time) {
      for (const f of parts) {
        if (f.dealt || time < f.landAt) continue;
        f.dealt = true;
        tk.explode(f.x, f.y, R, 12, f.kind === 'plate' ? 0xe6eef4 : BRASS);
        if (f.kind === 'gear') {
          // It hits and rolls on, away from the armature.
          const a = Math.atan2(f.y - tk.bossY, f.x - tk.bossX);
          tk.spawnBullet({ x: f.x, y: f.y, angle: a, speed: 170, damage: 8, r: 11, color: BRASS, lifeMs: 2800 });
        }
        tk.sfx('clang');
      }
      parts = parts.filter((f) => !f.dealt || time - f.landAt < 400);
    },
    drawGround(g, time) {
      for (const f of parts) {
        if (f.dealt || time < f.at) continue;
        const k = clamp((time - f.at) / (f.landAt - f.at), 0, 1);
        // Crosshair and a growing shadow where it will land.
        g.fillStyle(0x000000, 0.1 + k * 0.25); g.fillEllipse(f.x, f.y, R * 2 * k, R * 1.2 * k);
        g.lineStyle(2, MOLTEN, 0.4 + k * 0.5); g.strokeCircle(f.x, f.y, R);
        g.lineBetween(f.x - R - 8, f.y, f.x - R + 10, f.y); g.lineBetween(f.x + R - 10, f.y, f.x + R + 8, f.y);
        g.lineBetween(f.x, f.y - R - 8, f.x, f.y - R + 10); g.lineBetween(f.x, f.y + R - 10, f.x, f.y + R + 8);
      }
    },
    drawAir(g, time) {
      for (const f of parts) {
        if (f.dealt || time < f.at) continue;
        const k = clamp((time - f.at) / (f.landAt - f.at), 0, 1);
        const x = lerp(f.sx, f.x, k), y = lerp(f.sy, f.y, k) - Math.sin(k * Math.PI) * 160;
        const rot = f.spin + k * 14;
        if (f.kind === 'gear') gear(g, x, y, 11, 10, BRASS, 1, rot);
        else if (f.kind === 'plate') {
          const w = 22 * Math.abs(Math.cos(rot)) + 3;
          g.fillStyle(MIRROR_DARK, 1); g.fillRect(x - w / 2, y - 14, w, 28);
          g.fillStyle(MIRROR, 1); g.fillRect(x - w / 2 + 1, y - 13, w - 2, 26);
          if (Math.cos(rot) > 0.8) glint(g, x, y - 4, 0.9, 10);
        } else {
          g.lineStyle(2, IRON_LIT, 1);
          for (let i = 0; i < 5; i++) g.strokeEllipse(x + Math.cos(rot) * (i - 2) * 4, y + Math.sin(rot) * (i - 2) * 4, 10, 6);
        }
        // Smoke trailing behind.
        g.fillStyle(SOOT, 0.25 * (1 - k)); g.fillCircle(lerp(f.sx, f.x, k * 0.9), lerp(f.sy, f.y, k * 0.9) - Math.sin(k * 0.9 * Math.PI) * 160, 6);
      }
    },
    onPhaseEnd() { parts = []; },
  };
};

// ── Signature: Runaway Lens ──────────────────────────────────────────
// (Prototype Failure.) The chest lens jams open and the whole armature spins: the beam wheels round
// the floor — a ghost line shows where it is going — then lurches, flickers red, and reverses.

const runawayLens = (tk: BossToolkit): SignatureMove => {
  let live = false;
  let at = 0, start = 0, dir = 1, lastHit = 0;
  const CHARGE = 750, SPIN = 4200, RATE = 1.5, LEN = 820, HALF = 14;
  const angleAt = (time: number) => {
    const t = clamp(time - at - tk.warn(CHARGE), 0, SPIN) / 1000;
    const flip = SPIN / 2000;
    return t < flip ? start + dir * RATE * t : start + dir * RATE * flip - dir * RATE * (t - flip);
  };
  return {
    durationMs: 4400,
    windupMs: 450,
    locksBody: true,
    hold: 'brace',
    tell: 'THE LENS JAMS',
    cast(time) {
      live = true; at = time; dir = Math.random() < 0.5 ? 1 : -1;
      start = tk.angleToPlayer() + dir * Math.PI / 2;
      tk.sfx('glitch');
    },
    update(time) {
      if (!live) return;
      const t = time - at - tk.warn(CHARGE);
      if (t < 0) return;
      if (t > SPIN) { live = false; return; }
      if (Math.abs(t - SPIN / 2) < 20) tk.sfx('glitch');
      const a = angleAt(time);
      const p = tk.player;
      const bx = tk.bossX, by = tk.bossY - 14;
      if (p.active && p.hp > 0 && time - lastHit > 520 && segDist(p.x, p.y, bx, by, bx + Math.cos(a) * LEN, by + Math.sin(a) * LEN) < HALF + 12) {
        lastHit = time;
        tk.hitPlayer(12, p.x, p.y);
      }
    },
    drawGround(g, time) {
      if (!live) return;
      const bx = tk.bossX, by = tk.bossY - 14;
      const t = time - at - tk.warn(CHARGE);
      const a = angleAt(time);
      // The ghost line: where the beam will be a beat from now (flipped before the lurch).
      const flipIn = SPIN / 2 - t;
      const ahead = t < 0 ? start : flipIn > 0 && flipIn < 450 ? a - dir * 0.45 : a + (t < SPIN / 2 ? dir : -dir) * 0.45;
      g.lineStyle(2, t >= 0 && flipIn > 0 && flipIn < 450 ? 0xff5a3a : SUN, 0.5);
      for (let d = 40; d < LEN; d += 30) g.lineBetween(bx + Math.cos(ahead) * d, by + Math.sin(ahead) * d, bx + Math.cos(ahead) * (d + 14), by + Math.sin(ahead) * (d + 14));
      if (t < 0) {
        const k = clamp((time - at) / tk.warn(CHARGE), 0, 1);
        g.lineStyle(3, SUN, 0.3 + k * 0.5); g.lineBetween(bx, by, bx + Math.cos(start) * LEN, by + Math.sin(start) * LEN);
      }
    },
    drawAir(g, time) {
      if (!live) return;
      const t = time - at - tk.warn(CHARGE);
      if (t < 0) return;
      const bx = tk.bossX, by = tk.bossY - 14;
      const a = angleAt(time);
      const flicker = Math.abs(t - SPIN / 2) < 300 ? (Math.sin(time / 25) > 0 ? 0.4 : 1) : 1;
      const ex = bx + Math.cos(a) * LEN, ey = by + Math.sin(a) * LEN;
      g.lineStyle(HALF * 2 + 8, MOLTEN, 0.18 * flicker); g.lineBetween(bx, by, ex, ey);
      g.lineStyle(HALF * 2, 0xffe8c0, 0.55 * flicker); g.lineBetween(bx, by, ex, ey);
      g.lineStyle(HALF * 0.7, 0xffffff, 0.95 * flicker); g.lineBetween(bx, by, ex, ey);
      for (let i = 0; i < 5; i++) {
        const d = 40 + Math.random() * 60;
        g.fillStyle(MOLTEN_LIT, 0.8); g.fillCircle(bx + Math.cos(a + (Math.random() - 0.5)) * d, by + Math.sin(a + (Math.random() - 0.5)) * d, 1.6);
      }
    },
    onPhaseEnd() { live = false; },
  };
};

// ── The Prince ───────────────────────────────────────────────────────

export const ARTIFEX_BOSS: WorldBossDef = {
  worldId: 'isle:artifex',
  name: 'Prince Artifex',
  title: 'the Radiance of the Workshop',
  color: ARTIFEX,
  colorLit: ARTIFEX_LIT,
  colorDark: ARTIFEX_DARK,
  accent: ARTIFEX_LENS,
  // Tier 3 of the tenth isle.
  damageMult: 1.45,

  intro: [
    'Oh, a visitor! Mind the beetles, they\'re wound. Did you see the armature on the way in? Isn\'t she something?',
    'Every mirror on the Heliostat, I drew first. Now I am drawing the last thing anyone will ever need. Hold this.',
  ],
  banter: [
    'Torque, stranger. Everything is torque. The sun is just a very heavy weight on a very long arm.',
    'Do you know how hard it is to hold a sun still? Nobody asks. Everyone asks about the shadows.',
    'A shadow is a design flaw. I fix design flaws.',
    'The Despot gave me one problem and said "solve it". Twenty-two years! The best years of my life.',
    'I\'ve never broken a thing I didn\'t then improve. You\'re next, I suppose.',
  ],
  defeatLine: 'THE MAGNUM OPUS STOPS',
  resumeLine: 'You again! Good. I\'ve re-tuned the springs. Tell me if you notice.',

  phases: [
    {
      name: 'Tinkerer',
      line: 'Let\'s start small. I always start small. Beetles first — they\'re very good beetles.',
      hp: 590,
      cycle: [
        'sig:beetles', 'volley', 'sig:key', 'sig:mines', 'homing',
        'sig:beetles', 'radial', 'sig:mines', 'sig:key',
      ],
      harass: ['h-snipe', 'h-mines'],
      restMs: 1200,
      harassMs: 3400,
    },
    {
      name: 'Magnum Opus',
      line: 'Enough toys. Stand back — no, further — she has never walked with anyone in her. Let\'s see!',
      hp: 680,
      cycle: [
        'sig:stride', 'sig:sweep', 'sig:helio', 'lanes', 'sig:stride',
        'barrage', 'sig:sweep', 'sig:helio', 'sig:beetles',
      ],
      harass: ['h-flak', 'h-lane'],
      restMs: 1100,
      harassMs: 3000,
    },
  ],

  hard: {
    introLine: 'THE ARMATURE IS NOT FINISHED',
    extraPhase: {
      name: 'Prototype Failure',
      line: 'That noise is the governor going. And that one is the — oh. Oh, that is fascinating. GET DOWN.',
      hp: 510,
      cycle: [
        'sig:parts', 'sig:runaway', 'sig:stride', 'spiral',
        'sig:parts', 'sig:mines', 'sig:runaway', 'sig:helio',
      ],
      harass: ['h-orbs', 'h-flak'],
      restMs: 950,
      harassMs: 2600,
    },
  },

  tuning: {
    volley: { count: 5, speed: 230, spreadRad: 0.5 },
    radial: { count: 14, speed: 190 },
    homing: { count: 3, speed: 170 },
    lanes: { count: 3, warnMs: 900 },
    barrage: { count: 5 },
    spiral: { arms: 4, speed: 175 },
  },

  signatures: {
    beetles,
    mines: springMines,
    key: mainspringKey,
    stride,
    sweep: lensSweep,
    helio: heliograph,
    parts: partsFly,
    runaway: runawayLens,
  },

  look: {
    crest: 'antennae', pattern: 'gears', aura: 'sparks', hands: 'gauntlet',
    torsoR: 34, mouth: 'grate', eyes: 1, eyeColor: ARTIFEX_LENS, arms: 2,
  },
  phaseStyles: [
    { movement: 'orbit', gimmick: 'none' },
    { movement: 'stalk', gimmick: 'none', tint: 'gold', look: { crest: 'stack', aura: 'none', torsoR: 40, arms: 4 } },
    { movement: 'rush', gimmick: 'none', tint: 'hot', look: { crest: 'stack', aura: 'smoke', torsoR: 40, arms: 4, mouth: 'line' } },
  ],

  /**
   * The Radiance's tells. Tinkerer: a brass head with one great lens for an eye under a jeweller's
   * loupe on a swing-arm, goggles pushed up, a tool-belt of wind-up keys and a big key turning in
   * his back. Magnum Opus: he stands in the armature — brass legs with mirror greaves striding under
   * him, a mirror-plated cage round his body, shoulder mirrors on gimbals, the chest lens glowing as
   * he casts. Prototype Failure: the same, coming apart — plates hanging by one bolt, a leg strut
   * snapped, smoke, the chest lens cracked and flickering.
   */
  drawDecor(g, s) {
    const R = s.radius;
    const opus = s.phaseIdx >= 1;
    const failing = s.hard && s.phaseIdx >= 2;
    if (!opus) drawTinkerer(g, s, R);
    else drawArmature(g, s, R, failing);
    if (s.enraged) { g.lineStyle(1.5, ARTIFEX_LIT, 0.35 + Math.sin(s.t / 120) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
  },

  /**
   * The atelier floor: white marble and mirror tiles in a chequer that throws the noon back up, a
   * brass compass rose inlaid at the heart, the Magnum Opus's scaffold and blueprints along the back
   * wall, crates of mirror plates and an orrery down the sides.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0xa7f1e4);
    const T = 48;
    for (let y = 96; y < H; y += T) {
      for (let x = 0; x < W; x += T) {
        const k = ((x / T) + (y / T)) % 2;
        g.fillStyle(k ? 0xd8e4ea : LIME_LIT, 1); g.fillRect(x, y, T, T);
        if (k) { g.fillStyle(0xffffff, 0.35); g.fillTriangle(x + 4, y + T - 8, x + 4, y + 4, x + T * 0.6, y + 4); }
        g.fillStyle(LIME_DARK, 0.3); g.fillRect(x, y + T - 2, T, 2);
      }
    }
    // The compass rose.
    const cx = W / 2, cy = (H + 100) / 2;
    g.lineStyle(4, BRASS_DARK, 0.8); g.strokeCircle(cx, cy, 160);
    g.lineStyle(2, BRASS, 0.9); g.strokeCircle(cx, cy, 154);
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, r = k % 2 ? 90 : 150;
      g.fillStyle(k % 4 === 0 ? BRASS : BRASS_DARK, 0.8);
      g.fillTriangle(cx + Math.cos(a - 0.09) * 20, cy + Math.sin(a - 0.09) * 20, cx + Math.cos(a + 0.09) * 20, cy + Math.sin(a + 0.09) * 20, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    gear(g, cx, cy, 18, 14, BRASS, 1, 0);
    // The back wall: limestone, glass, blueprints of the armature pinned up, the scaffold.
    g.fillStyle(LIME_DARK, 1); g.fillRect(0, 0, W, 110);
    g.fillStyle(LIME, 1); g.fillRect(0, 0, W, 104);
    for (let i = 0; i < 9; i++) blueprintSheet(g, 60 + i * 105, 56, 70, 48, i);
    g.lineStyle(3, OAK_DARK, 1);
    for (let x = 30; x < W; x += 150) g.lineBetween(x, 0, x, 110);
    g.lineBetween(0, 20, W, 20); g.lineBetween(0, 92, W, 92);
    sunburst(g, W / 2, 30, 10);
    g.fillStyle(BRASS_DARK, 1); g.fillRect(0, 104, W, 8);
    // Crates of mirror plates and spare gears down the sides.
    for (let y = 170; y < H - 60; y += 140) {
      for (const x of [34, W - 34]) {
        g.fillStyle(OAK_DARK, 1); g.fillRect(x - 24, y, 48, 40);
        g.fillStyle(0x9a6c3e, 1); g.fillRect(x - 22, y + 2, 44, 36);
        mirrorPane(g, x - 8, y + 4, 12, 26, 0.5); mirrorPane(g, x + 8, y + 4, 12, 22, 0.3);
        gear(g, x, y + 50, 7, 10, rng() < 0.5 ? BRASS : COPPER, 1, rng() * 3);
      }
    }
    // Light thrown back up off the mirror tiles, at the edges.
    for (let i = 0; i < 5; i++) { g.lineStyle(36, 0xfff4c0, 0.035); g.strokeRect(i * 16, 96 + i * 16, W - i * 32, H - 96 - i * 32); }
  },
};

/** Phase 1: the tinkerer himself. */
function drawTinkerer(g: G, s: BossBodyState, R: number): void {
  // Tool-belt of wind-up keys round the waist.
  g.lineStyle(4, COPPER_DARK, 1); g.strokeEllipse(s.x, s.y + R * 0.55, R * 1.8, R * 0.6);
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * 0.15 + (i / 4) * Math.PI * 0.7;
    const kx = s.x + Math.cos(a) * R * 0.9, ky = s.y + R * 0.55 + Math.sin(a) * R * 0.3;
    g.lineStyle(2, BRASS_DARK, 1); g.lineBetween(kx, ky, kx, ky + 9);
    g.lineStyle(1.5, BRASS, 1); g.strokeCircle(kx - 3, ky + 12, 3); g.strokeCircle(kx + 3, ky + 12, 3);
  }
  // The great key turning in his back (seen over his shoulder).
  const kr = s.t / 220;
  g.lineStyle(4, BRASS_DARK, 1); g.lineBetween(s.x - R * 0.5, s.y - R * 0.6, s.x - R * 1.05, s.y - R * 1.15);
  for (const k of [-1, 1]) {
    g.lineStyle(3, BRASS, 1);
    g.strokeEllipse(s.x - R * 1.15 + Math.cos(kr) * k * 7, s.y - R * 1.25, Math.abs(Math.cos(kr)) * 12 + 2, 10);
  }
  // Goggles pushed up on the brow.
  for (const k of [-1, 1]) {
    g.fillStyle(COPPER_DARK, 1); g.fillCircle(s.x + k * 9, s.y - R * 0.85, 7);
    g.fillStyle(ARTIFEX_LENS, 0.8); g.fillCircle(s.x + k * 9, s.y - R * 0.85, 5);
    g.fillStyle(0xffffff, 0.8); g.fillCircle(s.x + k * 9 - 2, s.y - R * 0.85 - 2, 1.5);
  }
  g.lineStyle(2, COPPER_DARK, 1); g.lineBetween(s.x - R * 0.9, s.y - R * 0.75, s.x + R * 0.9, s.y - R * 0.75);
  // The jeweller's loupe on its swing-arm, over the one great eye.
  const arm = Math.sin(s.t / 700) * 0.1;
  const lx = s.x + Math.cos(s.facing) * 6 + 4, ly = s.y - R * 0.15 + arm * 10;
  g.lineStyle(2, BRASS_DARK, 1); g.lineBetween(s.x + R * 0.7, s.y - R * 0.6, lx + 10, ly - 6);
  g.lineStyle(3, BRASS, 1); g.strokeCircle(lx, ly, 11);
  g.fillStyle(ARTIFEX_LENS, 0.18); g.fillCircle(lx, ly, 10);
  g.fillStyle(0xffffff, 0.7); g.fillEllipse(lx - 4, ly - 4, 5, 3);
  // A wind-up beetle in his second hand, ready to throw.
  const h = s.hands[1];
  if (h) drawBeetle(g, h.x, h.y - 14, -Math.PI / 2 + Math.sin(s.t / 400) * 0.3, s.t, 1, s.t);
}

/** Phases 2–3: the armature round him. `failing` breaks it. */
function drawArmature(g: G, s: BossBodyState, R: number, failing: boolean): void {
  const step = Math.sin(s.t / 260);
  // Legs: brass struts with mirror greaves, striding.
  for (const k of [-1, 1]) {
    const hipX = s.x + k * R * 0.6, hipY = s.y + R * 0.6;
    const footX = s.x + k * R * 0.95 + step * k * 6, footY = s.y + R * 1.9 - Math.max(0, step * k) * 8;
    const kneeX = (hipX + footX) / 2 + k * 10, kneeY = (hipY + footY) / 2 - 4;
    const snapped = failing && k > 0;
    g.lineStyle(9, BRASS_DARK, 1); g.lineBetween(hipX, hipY, kneeX, kneeY);
    g.lineStyle(6, BRASS, 1); g.lineBetween(hipX, hipY, kneeX, kneeY);
    if (snapped) {
      // The shin hangs off at an angle, sparking.
      g.lineStyle(6, BRASS_DARK, 1); g.lineBetween(kneeX, kneeY + 4, kneeX + 16, footY - 2);
      if (Math.sin(s.t / 70) > 0.3) { g.fillStyle(MOLTEN_LIT, 1); g.fillCircle(kneeX + 2, kneeY + 2, 2); g.fillCircle(kneeX + 6, kneeY - 3, 1.5); }
    } else {
      g.lineStyle(9, BRASS_DARK, 1); g.lineBetween(kneeX, kneeY, footX, footY);
      g.lineStyle(6, BRASS, 1); g.lineBetween(kneeX, kneeY, footX, footY);
    }
    gear(g, kneeX, kneeY, 6, 8, BRASS, 1, s.t / 300 * k);
    g.fillStyle(MIRROR_DARK, 1); g.fillRect((kneeX + footX) / 2 - 7, (kneeY + footY) / 2 - 9, 14, 18);
    g.fillStyle(MIRROR, 1); g.fillRect((kneeX + footX) / 2 - 6, (kneeY + footY) / 2 - 8, 12, 16);
    g.fillStyle(BRASS_DARK, 1); g.fillEllipse(footX, footY, 26, 9);
  }
  // A cage of mirror plates round the body.
  const plates = 8;
  for (let i = 0; i < plates; i++) {
    const a = -Math.PI / 2 + (i / plates) * Math.PI * 2;
    if (failing && i % 3 === 1) {
      // Hanging by one bolt, swinging.
      const px = s.x + Math.cos(a) * R * 1.15, py = s.y + Math.sin(a) * R * 1.15;
      const sw = Math.sin(s.t / 200 + i) * 0.5;
      g.fillStyle(MIRROR_DARK, 1);
      g.fillPoints([{ x: px, y: py }, { x: px + Math.cos(sw) * 10, y: py + 16 }, { x: px + Math.cos(sw) * 2, y: py + 20 }, { x: px - 6, y: py + 4 }], true);
      continue;
    }
    const px = s.x + Math.cos(a) * R * 1.12, py = s.y + Math.sin(a) * R * 1.12;
    const w = 12, h = 18;
    g.fillStyle(BRASS_DARK, 1); g.fillRect(px - w / 2 - 1, py - h / 2 - 1, w + 2, h + 2);
    g.fillStyle(MIRROR, 1); g.fillRect(px - w / 2, py - h / 2, w, h);
    if (Math.sin(s.t / 500 + i) > 0.85) glint(g, px, py - 3, 0.8, 7);
  }
  g.lineStyle(2, BRASS_DARK, 0.9); g.strokeCircle(s.x, s.y, R * 1.12);
  // Shoulder mirrors on gimbals, tilting to the sun.
  for (const k of [-1, 1]) {
    const mx = s.x + k * R * 0.95, my = s.y - R * 1.3;
    const tilt = Math.sin(s.t / 600 + k) * 0.6 + (s.castGlow * 0.6);
    g.lineStyle(3, BRASS_DARK, 1); g.lineBetween(s.x + k * R * 0.6, s.y - R * 0.7, mx, my + 10);
    g.lineStyle(2, BRASS, 1); g.strokeEllipse(mx, my, 30, 12);
    const w = 26 * Math.abs(Math.cos(tilt)) + 3;
    g.fillStyle(GOLD, 1); g.fillRect(mx - w / 2 - 2, my - 18, w + 4, 24);
    g.fillStyle(failing && k < 0 ? MIRROR_DARK : MIRROR, 1); g.fillRect(mx - w / 2, my - 16, w, 20);
    if (failing && k < 0) { g.lineStyle(1, 0xffffff, 0.9); g.lineBetween(mx - w / 2, my - 14, mx + w / 2, my + 2); g.lineBetween(mx, my - 16, mx - 4, my + 4); }
    else if (Math.cos(tilt) > 0.9) glint(g, mx, my - 6, 1, 14);
  }
  // The chest lens: glowing with every cast; cracked and flickering when failing.
  const lx = s.x, ly = s.y + R * 0.15;
  const flick = failing ? (Math.sin(s.t / 40) > 0 ? 1 : 0.5) : 1;
  glow(g, lx, ly, 14 + s.castGlow * 26, SUN, (0.05 + s.castGlow * 0.12) * flick, 3);
  lens(g, lx, ly, 12, 1, BRASS_DARK);
  if (failing) {
    g.lineStyle(1.2, 0xffffff, 0.9); g.lineBetween(lx - 8, ly - 6, lx + 2, ly + 2); g.lineBetween(lx + 2, ly + 2, lx + 9, ly - 3); g.lineBetween(lx + 2, ly + 2, lx, ly + 10);
    // Smoke from the joints and sparks off the snapped leg.
    for (let i = 0; i < 3; i++) {
      const ph = ((s.t / 900) + i / 3) % 1;
      g.fillStyle(SOOT, 0.3 * (1 - ph)); g.fillCircle(s.x + R * 0.6 + Math.sin(ph * 5 + i) * 6, s.y - R * 0.6 - ph * 50, 5 + ph * 9);
    }
  } else if (s.castGlow > 0.3) {
    g.fillStyle(HEAT_WHITE, s.castGlow * 0.8); g.fillCircle(lx, ly, 5);
  }
  // A blueprint tucked under the frame: he is still drafting it as he goes.
  const h = s.hands[0];
  if (h && !failing) { blueprintSheet(g, h.x - 6, h.y + 10, 22, 16, 2, 0.9); }
}
