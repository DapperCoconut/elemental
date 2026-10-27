import Phaser from 'phaser';
import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, lit, mulberry } from '../../../../art/IsleArt';
import { R, drawGlint, drawIcicle, jit, segDist } from './util';

/**
 * PRINCE HOARFROST — the Queen's fourth child, master of the Rimefast Court.
 *
 * When the fishing fleet tried to sail out from under the Dry Tithe, Queen Maresa sent Hoarfrost to
 * stop them, and he stopped the sea. Rimefast's harbour has been frozen solid ever since, every
 * hull locked where it lay. Nothing moves without his leave: a household pays the *Thaw Tithe* to
 * have its door, its fishing hole or its boat cut free, and a house that cannot pay is simply left
 * frozen in. He finds warmth vulgar and noise worse. What he loves is a held moment.
 *
 * Phase one, *Rime*, he glides and works the room with precision — ice lances laid on you one by
 * one, a lattice of frost that sets under alternate squares, a stamp that splits the floor into
 * spokes. Phase two, *The Long Winter*, he comes after you in armour of ice (the three wards are
 * its plates — break them and he staggers): a whiteout you can barely see through, the frozen
 * anchor of an iced-in ship dragged round him on its chain, avalanches off the palace roof. On
 * hard, *Absolute Zero*: he stands still and so, very nearly, does everything else — shards stop
 * dead in the air, the room's last warmth is put out circle by circle, and the frost closes in.
 *
 * His silhouette is the icicle fringe hanging from his circlet: it snaps away icicle by icicle as
 * his health goes. In the Long Winter it is plate armour cracking; at Absolute Zero he is sealed
 * in a clear block of ice.
 */

const ICE = 0x8fc8e8;
const ICE_LIT = 0xe6f8ff;
const ICE_DARK = 0x24506e;
const ACCENT = 0x6fe6ff;

const FIELD_TOP = 96;

// ── Signature: Ice Lances ────────────────────────────────────────────
// Lances of clear ice form one by one in a crescent behind him. Each one fixes its aim on you at
// the moment it forms and paints a frost line down that aim; a second later it flies down the
// line. Step off each line as it is drawn — they come in the order they formed.

interface Lance { ox: number; oy: number; a: number; formAt: number; fireAt: number; hit: boolean }

const LANCE_SPEED = 1500;

const lances = (tk: BossToolkit): SignatureMove => {
  let ls: Lance[] = [];
  return {
    durationMs: 2600,
    windupMs: 650,
    tell: 'ICE LANCES',
    gesture: 'raise',
    cast(time: number) {
      ls = [];
      const n = tk.hard ? 7 : 5;
      const back = tk.angleToPlayer() + Math.PI;
      for (let i = 0; i < n; i++) {
        const formAt = time + i * 190;
        tk.schedule(i * 190, () => {
          const off = (i / (n - 1) - 0.5) * 2.2;
          const ox = tk.clampX(tk.bossX + Math.cos(back + off) * 58, 30);
          const oy = Phaser.Math.Clamp(tk.bossY + Math.sin(back + off) * 46 - 20, FIELD_TOP + 10, tk.H - 20);
          const a = Math.atan2(tk.player.y - oy, tk.player.x - ox);
          ls.push({ ox, oy, a, formAt, fireAt: tk.now + tk.warn(1050), hit: false });
          tk.sfx('crystal-chime');
        });
      }
    },
    update(time: number) {
      const p = tk.player;
      for (const l of ls) {
        if (l.hit || time < l.fireAt) continue;
        const run = ((time - l.fireAt) / 1000) * LANCE_SPEED;
        if (run > 1300) continue;
        const tx = l.ox + Math.cos(l.a) * run, ty = l.oy + Math.sin(l.a) * run;
        const bx = l.ox + Math.cos(l.a) * Math.max(0, run - 110), by = l.oy + Math.sin(l.a) * Math.max(0, run - 110);
        if (segDist(p.x, p.y, bx, by, tx, ty) < 20) {
          l.hit = true;
          tk.hitPlayer(16, p.x, p.y);
          tk.slowPlayer(0.75, 500);
          tk.sfx('ice-shard');
        }
      }
      ls = ls.filter((l) => time < l.fireAt + 1100);
    },
    drawGround(g, time) {
      for (const l of ls) {
        if (time >= l.fireAt + 120) continue;
        const k = Phaser.Math.Clamp((time - l.formAt) / (l.fireAt - l.formAt), 0, 1);
        const ex = l.ox + Math.cos(l.a) * 1300, ey = l.oy + Math.sin(l.a) * 1300;
        // The frost line: a dotted rime trail that fills in as the lance draws back.
        g.lineStyle(10 + k * 8, ACCENT, 0.05 + k * 0.08); g.lineBetween(l.ox, l.oy, ex, ey);
        for (let d = 30; d < 1300; d += 26) {
          if (d / 1300 > k * 1.4) break;
          const x = l.ox + Math.cos(l.a) * d, y = l.oy + Math.sin(l.a) * d;
          g.fillStyle(ICE_LIT, 0.55); g.fillCircle(x, y, 2);
        }
      }
    },
    drawAir(g, time) {
      for (const l of ls) {
        const fired = time >= l.fireAt;
        const run = fired ? ((time - l.fireAt) / 1000) * LANCE_SPEED : -18 * Math.min(1, (time - l.formAt) / 500);
        if (run > 1300) continue;
        const c = Math.cos(l.a), s = Math.sin(l.a);
        const tx = l.ox + c * (run + 46), ty = l.oy + s * (run + 46);
        const bx = l.ox + c * (run - 46), by = l.oy + s * (run - 46);
        const nx = -s * 6, ny = c * 6;
        // A long faceted spear: a dark core, a clear body, one lit edge, a hard white point.
        g.fillStyle(ICE_DARK, 0.6); g.fillTriangle(bx + nx * 1.2, by + ny * 1.2, bx - nx * 1.2, by - ny * 1.2, tx + c * 4, ty + s * 4);
        g.fillStyle(ICE, 0.92); g.fillTriangle(bx + nx, by + ny, bx - nx, by - ny, tx, ty);
        g.fillStyle(ICE_LIT, 0.95); g.fillTriangle(bx + nx, by + ny, bx, by, tx, ty);
        g.fillStyle(0xffffff, 1); g.fillCircle(tx, ty, 2);
        if (fired) { g.lineStyle(3, ICE_LIT, 0.3); g.lineBetween(bx, by, bx - c * 80, by - s * 80); }
        else drawGlint(g, tx, ty, 5, 0.5 + Math.sin(time / 60) * 0.4);
      }
    },
    onPhaseEnd() { ls = []; },
  };
};

// ── Signature: Hoarfrost Lattice ─────────────────────────────────────
// The floor is a chequerboard of flagstones. Frost ferns grow over every *light* square, then
// set with a crack of cold — then the dark squares do the same. One square sideways is always
// enough; the ferns show you which squares are next.

const CELL = 96;

const lattice = (tk: BossToolkit): SignatureMove => {
  let waves: { parity: number; at: number; setAt: number; dealt: boolean }[] = [];
  return {
    durationMs: 3200,
    windupMs: 700,
    tell: 'HOARFROST LATTICE',
    hold: 'conduct',
    cast(time: number) {
      waves = [];
      const first = Math.random() < 0.5 ? 0 : 1;
      const count = tk.hard ? 3 : 2;
      for (let i = 0; i < count; i++) {
        const at = time + i * 1250;
        waves.push({ parity: (first + i) % 2, at, setAt: at + tk.warn(1000), dealt: false });
      }
      tk.sfx('frost-blast');
    },
    update(time: number) {
      const p = tk.player;
      for (const w of waves) {
        if (w.dealt || time < w.setAt) continue;
        w.dealt = true;
        tk.sfx('ice-shatter');
        const cx = Math.floor(p.x / CELL), cy = Math.floor((p.y - FIELD_TOP) / CELL);
        if ((((cx + cy) % 2) + 2) % 2 === w.parity) {
          tk.hitPlayer(15, p.x, p.y);
          tk.slowPlayer(0.6, 900);
        }
      }
      waves = waves.filter((w) => time < w.setAt + 600);
    },
    drawGround(g, time) {
      for (const w of waves) {
        const k = Phaser.Math.Clamp((time - w.at) / (w.setAt - w.at), 0, 1);
        const after = time - w.setAt;
        for (let cy = 0; cy * CELL + FIELD_TOP < tk.H; cy++) {
          for (let cx = 0; cx * CELL < tk.W; cx++) {
            if ((cx + cy) % 2 !== w.parity) continue;
            const x = cx * CELL, y = FIELD_TOP + cy * CELL;
            if (after > 0) {
              // Set: a white flash fading to a glassy skin.
              const f = 1 - after / 600;
              g.fillStyle(ICE_LIT, 0.55 * f); g.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
              continue;
            }
            g.fillStyle(ICE, 0.06 + k * 0.16); g.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
            g.lineStyle(1.5, ICE_LIT, 0.25 + k * 0.5); g.strokeRect(x + 3, y + 3, CELL - 6, CELL - 6);
            // Frost ferns creeping in from each corner: fronds along the diagonal.
            const reach = CELL * 0.5 * k;
            for (const [ox, oy, dx, dy] of [[x + 4, y + 4, 1, 1], [x + CELL - 4, y + CELL - 4, -1, -1], [x + CELL - 4, y + 4, -1, 1], [x + 4, y + CELL - 4, 1, -1]] as const) {
              g.lineStyle(1.2, ICE_LIT, 0.5 + k * 0.3);
              g.lineBetween(ox, oy, ox + dx * reach, oy + dy * reach);
              for (let s = 8; s < reach; s += 9) {
                const bx = ox + dx * s, by = oy + dy * s;
                g.lineBetween(bx, by, bx + dx * 5, by - dy * 1);
                g.lineBetween(bx, by, bx - dx * 1, by + dy * 5);
              }
            }
          }
        }
      }
    },
    onPhaseEnd() { waves = []; },
  };
};

// ── Signature: Shatterstamp ──────────────────────────────────────────
// He stamps and the ice splits in spokes running out from his feet. A moment after a crack runs
// past a point, a ridge of ice spikes bursts up along it. Stand between the spokes — the wedge
// widens the further out you are.

interface Spoke { a: number; at: number; burstAt: number; dealt: boolean; ox: number; oy: number }

const SPOKE_RUN = 760;
const SPOKE_LEN = 1100;

const shatter = (tk: BossToolkit): SignatureMove => {
  let spokes: Spoke[] = [];
  /** One ridge per beat: spokes are close together near him, and a run across them is one hit. */
  let lastHit = 0;
  return {
    durationMs: 2700,
    windupMs: 800,
    tell: 'SHATTERSTAMP',
    gesture: 'slam',
    cast(time: number) {
      spokes = [];
      tk.sfx('quake');
      const sets = tk.hard ? 2 : 1;
      const n = tk.hard ? 9 : 7;
      const rot = Math.random() * Math.PI * 2;
      for (let s = 0; s < sets; s++) {
        const delay = s * 950;
        tk.schedule(delay, () => {
          tk.sfx('ice-shatter');
          for (let i = 0; i < n; i++) {
            const a = rot + (i / n) * Math.PI * 2 + (s * Math.PI) / n;
            spokes.push({ a, at: tk.now, burstAt: tk.now + tk.warn(800), dealt: false, ox: tk.bossX, oy: tk.bossY + 10 });
          }
        });
      }
    },
    update(time: number) {
      const p = tk.player;
      for (const sp of spokes) {
        if (sp.dealt || time < sp.burstAt) continue;
        // The ridge rises behind the running crack-front, so it bursts in a wave along the spoke.
        const front = ((time - sp.burstAt) / 1000) * SPOKE_RUN;
        const ex = sp.ox + Math.cos(sp.a) * Math.min(SPOKE_LEN, front);
        const ey = sp.oy + Math.sin(sp.a) * Math.min(SPOKE_LEN, front);
        if (segDist(p.x, p.y, sp.ox, sp.oy, ex, ey) < 22 && time - lastHit > 900) {
          sp.dealt = true;
          lastHit = time;
          tk.hitPlayer(18, p.x, p.y);
          tk.sfx('stone-rise');
        }
        if (front > SPOKE_LEN) sp.dealt = true;
      }
      spokes = spokes.filter((s) => time < s.burstAt + 2200);
    },
    drawGround(g, time) {
      for (const sp of spokes) {
        const c = Math.cos(sp.a), s = Math.sin(sp.a);
        const crack = Math.min(SPOKE_LEN, ((time - sp.at) / 1000) * SPOKE_RUN * 1.6);
        // The crack: a jagged dark line with a pale edge.
        let px = sp.ox, py = sp.oy;
        for (let d = 24; d < crack; d += 24) {
          const j = (jit(sp.a * 10, d) - 0.5) * 8;
          const nx = sp.ox + c * d - s * j, ny = sp.oy + s * d + c * j;
          g.lineStyle(3, ICE_DARK, 0.75); g.lineBetween(px, py, nx, ny);
          g.lineStyle(1, ICE_LIT, 0.6); g.lineBetween(px + 1, py - 1, nx + 1, ny - 1);
          px = nx; py = ny;
        }
        if (time < sp.burstAt) {
          const k = 1 - (sp.burstAt - time) / (sp.burstAt - sp.at);
          g.lineStyle(26, ACCENT, 0.05 + k * 0.1); g.lineBetween(sp.ox, sp.oy, sp.ox + c * crack, sp.oy + s * crack);
        }
      }
    },
    drawAir(g, time) {
      for (const sp of spokes) {
        if (time < sp.burstAt) continue;
        const c = Math.cos(sp.a), s = Math.sin(sp.a);
        const front = Math.min(SPOKE_LEN, ((time - sp.burstAt) / 1000) * SPOKE_RUN);
        const fade = Phaser.Math.Clamp(1 - (time - sp.burstAt - 900) / 900, 0, 1);
        for (let d = 40; d < front; d += 30) {
          // Spikes stand tallest just behind the front, then sink.
          const behind = (front - d) / 260;
          const h = (behind < 1 ? 10 + behind * 20 : 30 - Math.min(20, (behind - 1) * 12)) * fade;
          if (h <= 1) continue;
          const x = sp.ox + c * d, y = sp.oy + s * d;
          const w = 7;
          g.fillStyle(ICE_DARK, 0.8); g.fillTriangle(x - w - 1, y + 2, x + w + 1, y + 2, x, y - h - 2);
          g.fillStyle(ICE, 0.95); g.fillTriangle(x - w, y, x + w, y, x, y - h);
          g.fillStyle(ICE_LIT, 1); g.fillTriangle(x - w, y, x - 1, y, x, y - h);
        }
      }
    },
    onPhaseEnd() { spokes = []; },
  };
};

// ── Signature: Whiteout ──────────────────────────────────────────────
// A blizzard swallows the room: you can see a ring round yourself and nothing else but his eyes.
// The wind drives rows of sleet across the room from one side, each row with a gap in it near
// your height. The gap drifts one notch at most per row — follow it.

interface Pellet { x: number; y: number; vx: number; alive: boolean }

const whiteout = (tk: BossToolkit): SignatureMove => {
  let until = 0;
  let from = 0;
  let dir = 1;
  let pellets: Pellet[] = [];
  let gapRow = 0;
  const ROW = 44;
  return {
    durationMs: 6800,
    windupMs: 900,
    tell: 'WHITEOUT',
    hold: 'brace',
    cast(time: number) {
      from = time;
      until = time + 6800;
      dir = Math.random() < 0.5 ? 1 : -1;
      pellets = [];
      tk.sfx('tornado');
      const rows = Math.floor((tk.H - FIELD_TOP - 20) / ROW);
      gapRow = Phaser.Math.Clamp(Math.floor((tk.player.y - FIELD_TOP) / ROW), 0, rows - 2);
      const volleys = tk.hard ? 8 : 6;
      for (let v = 0; v < volleys; v++) {
        tk.schedule(1100 + v * tk.warn(720), () => {
          tk.sfx('gust');
          gapRow = Phaser.Math.Clamp(gapRow + (Math.floor(Math.random() * 3) - 1), 0, rows - 2);
          for (let r = 0; r < rows; r++) {
            if (r === gapRow || r === gapRow + 1) continue;
            pellets.push({ x: dir > 0 ? -10 : tk.W + 10, y: FIELD_TOP + 20 + r * ROW + ROW / 2, vx: dir * 300, alive: true });
          }
        });
      }
    },
    update(time: number, dt: number) {
      if (!pellets.length) return;
      const p = tk.player;
      const step = Math.min(0.05, dt > 5 ? dt / 1000 : dt);
      for (const pe of pellets) {
        if (!pe.alive) continue;
        pe.x += pe.vx * step;
        if (pe.x < -30 || pe.x > tk.W + 30) { pe.alive = false; continue; }
        if (Math.hypot(pe.x - p.x, pe.y - p.y) < 17) {
          pe.alive = false;
          tk.hitPlayer(8, p.x, p.y);
          tk.slowPlayer(0.8, 450);
        }
      }
      pellets = pellets.filter((pe) => pe.alive);
      if (time > until) pellets = [];
    },
    drawAir(g, time) {
      if (time > until + 600) return;
      const fadeIn = Phaser.Math.Clamp((time - from) / 900, 0, 1);
      const fadeOut = Phaser.Math.Clamp((until + 600 - time) / 600, 0, 1);
      const a = Math.min(fadeIn, fadeOut);
      const p = tk.player;
      const clear = 165;
      // The fog: soft white discs on a grid, thinning toward the clear ring round you.
      for (let y = FIELD_TOP + 10; y < tk.H + 30; y += 46) {
        for (let x = (y / 46) % 2 ? 0 : 23; x < tk.W + 30; x += 46) {
          const d = Math.hypot(x - p.x, y - p.y);
          if (d < clear * 0.75) continue;
          const k = Phaser.Math.Clamp((d - clear * 0.75) / (clear * 0.6), 0, 1);
          g.fillStyle(0xf4fbff, 0.78 * k * a); g.fillCircle(x + Math.sin(time / 700 + y) * 6, y, 34);
        }
      }
      // Streaks of driven snow.
      for (let i = 0; i < 40; i++) {
        const y = FIELD_TOP + jit(5, i) * (tk.H - FIELD_TOP);
        const x = ((jit(6, i) * tk.W + dir * time * 0.9) % tk.W + tk.W) % tk.W;
        g.lineStyle(1.5, 0xffffff, 0.6 * a); g.lineBetween(x, y, x - dir * 18, y + 2);
      }
      // His eyes, through it.
      g.fillStyle(ACCENT, 0.9 * a); g.fillCircle(tk.bossX - 8, tk.bossY - 6, 3); g.fillCircle(tk.bossX + 8, tk.bossY - 6, 3);
      // The sleet itself is drawn over the fog so it is always readable.
      for (const pe of pellets) {
        g.lineStyle(3, ICE_DARK, 0.5); g.lineBetween(pe.x, pe.y, pe.x - Math.sign(pe.vx) * 22, pe.y);
        g.fillStyle(ICE_DARK, 0.9); g.fillCircle(pe.x, pe.y, 6.5);
        g.fillStyle(0xffffff, 1); g.fillCircle(pe.x - 1, pe.y - 1, 4);
      }
      // Wind arrows at the upwind edge so you know which way it blows.
      for (let y = FIELD_TOP + 40; y < tk.H; y += 110) {
        const x = dir > 0 ? 24 : tk.W - 24;
        g.lineStyle(2, ICE_DARK, 0.6 * a);
        g.lineBetween(x - dir * 10, y - 8, x, y); g.lineBetween(x - dir * 10, y + 8, x, y);
      }
    },
    onPhaseEnd() { pellets = []; until = 0; },
  };
};

// ── Signature: The Anchor Chain ──────────────────────────────────────
// He tears the frozen anchor out of a locked-in hull and swings it round himself on its chain.
// The rime ring shows its reach. Get outside the ring — or tuck in close, under the chain,
// where it lifts off the floor to his fist.

const anchor = (tk: BossToolkit): SignatureMove => {
  let startAt = 0, endAt = 0, a0 = 0, turns = 1.25, dirn = 1, lastHit = 0, live = false;
  const REACH = 230;
  const SAFE_IN = 70;
  return {
    durationMs: 3600,
    windupMs: 900,
    tell: 'THE ANCHOR CHAIN',
    hold: 'reach',
    locksBody: true,
    cast(time: number) {
      live = true;
      a0 = tk.angleToPlayer() + Math.PI * 0.8;
      dirn = Math.random() < 0.5 ? 1 : -1;
      turns = tk.hard ? 1.6 : 1.25;
      startAt = time + tk.warn(1100);
      endAt = startAt + 2300;
      lastHit = 0;
      tk.sfx('chain');
    },
    update(time: number) {
      if (!live) return;
      if (time > endAt + 300) { live = false; return; }
      if (time < startAt || time > endAt) return;
      const a = a0 + dirn * ((time - startAt) / (endAt - startAt)) * turns * Math.PI * 2;
      const p = tk.player;
      const hx = tk.bossX + Math.cos(a) * REACH, hy = tk.bossY + Math.sin(a) * REACH * 0.82;
      const ix = tk.bossX + Math.cos(a) * SAFE_IN, iy = tk.bossY + Math.sin(a) * SAFE_IN * 0.82;
      const onChain = segDist(p.x, p.y, ix, iy, hx, hy) < 16;
      const onHead = Math.hypot(p.x - hx, p.y - hy) < 30;
      if ((onChain || onHead) && time - lastHit > 500) {
        lastHit = time;
        tk.hitPlayer(onHead ? 22 : 15, p.x, p.y);
        tk.sfx('clang');
      }
      if (Math.floor(time / 300) !== Math.floor((time - 16) / 300)) tk.sfx('whoosh');
    },
    drawGround(g, time) {
      if (!live) return;
      const k = Phaser.Math.Clamp(1 - (startAt - time) / 1100, 0, 1);
      // The reach: a rime ring, and the safe hollow round his feet.
      g.fillStyle(ACCENT, 0.05 + 0.06 * k); g.fillEllipse(tk.bossX, tk.bossY, REACH * 2, REACH * 1.64);
      g.fillStyle(0x000000, 0.12); g.fillEllipse(tk.bossX, tk.bossY, SAFE_IN * 2, SAFE_IN * 1.64);
      g.lineStyle(3, ICE_LIT, 0.4 + 0.4 * k); g.strokeEllipse(tk.bossX, tk.bossY, REACH * 2 + 20, REACH * 1.64 + 16);
      g.lineStyle(1.5, ICE_LIT, 0.5); g.strokeEllipse(tk.bossX, tk.bossY, SAFE_IN * 2, SAFE_IN * 1.64);
      // Scour marks where the anchor has dragged.
      if (time > startAt) {
        const t1 = Math.min(time, endAt);
        const a1 = a0 + dirn * ((t1 - startAt) / (endAt - startAt)) * turns * Math.PI * 2;
        g.lineStyle(6, ICE_DARK, 0.3);
        g.beginPath();
        g.arc(tk.bossX, tk.bossY, REACH, Math.min(a0, a1), Math.max(a0, a1), false);
        g.strokePath();
      }
    },
    drawAir(g, time) {
      if (!live || time > endAt + 200) return;
      let a = a0;
      if (time >= startAt) a = a0 + dirn * ((Math.min(time, endAt) - startAt) / (endAt - startAt)) * turns * Math.PI * 2;
      const lift = time < startAt ? (1 - Phaser.Math.Clamp((startAt - time) / 1100, 0, 1)) : 1;
      const r = SAFE_IN + (REACH - SAFE_IN) * lift;
      const hx = tk.bossX + Math.cos(a) * r, hy = tk.bossY + Math.sin(a) * r * 0.82;
      // Chain links from his fist to the shank.
      const links = 14;
      for (let i = 0; i <= links; i++) {
        const t = i / links;
        const x = tk.bossX + (hx - tk.bossX) * t, y = tk.bossY - 18 * (1 - t) + (hy - tk.bossY) * t;
        g.lineStyle(3, R.iron, 1); g.strokeEllipse(x, y, i % 2 ? 9 : 5, i % 2 ? 5 : 9);
        g.fillStyle(ICE_LIT, 0.7); g.fillCircle(x - 1, y - 2, 1.2);
      }
      // The anchor: iron shank, stock, two flukes, crusted in ice and dripping icicles.
      const c = Math.cos(a), s = Math.sin(a);
      const ax = hx + c * 18, ay = hy + s * 15;
      g.lineStyle(7, R.iron, 1); g.lineBetween(hx, hy, ax, ay);
      g.lineStyle(5, R.iron, 1); g.lineBetween(hx - s * 14, hy + c * 14, hx + s * 14, hy - c * 14);
      g.lineStyle(6, R.iron, 1);
      g.lineBetween(ax, ay, ax - s * 16 - c * 8, ay + c * 16 - s * 8);
      g.lineBetween(ax, ay, ax + s * 16 - c * 8, ay - c * 16 - s * 8);
      g.fillStyle(ICE, 0.75); g.fillCircle(ax, ay, 9); g.fillCircle(hx, hy, 6);
      drawIcicle(g, ax - 4, ay + 4, 10, 4, 0.9); drawIcicle(g, ax + 5, ay + 3, 8, 3, 0.9);
      if (time > startAt) {
        // Spray of ice off the ground where the head scrapes.
        for (let i = 0; i < 4; i++) {
          const ph = ((time / 120 + i * 0.25) % 1);
          g.fillStyle(ICE_LIT, 0.8 * (1 - ph)); g.fillCircle(ax - c * ph * 26 + (i - 1.5) * 5, ay - s * ph * 20 - ph * 12, 2.4);
        }
      }
    },
    onPhaseEnd() { live = false; },
  };
};

// ── Signature: Avalanche ─────────────────────────────────────────────
// The cornices on the palace roof give way. Each one that cracks shows its column; a moment
// later a slide of snow pours down it from top to bottom, and leaves a deep drift at the foot.
// One column always falls on you, so watch the cornice cracking over your head.

interface Slide { x: number; at: number; fallAt: number; hit: boolean; driftUntil: number }

const SLIDE_HALF = 56;
const SLIDE_SPEED = 720;

const avalanche = (tk: BossToolkit): SignatureMove => {
  let slides: Slide[] = [];
  return {
    durationMs: 3000,
    windupMs: 700,
    tell: 'AVALANCHE',
    gesture: 'clap',
    cast(time: number) {
      slides = [];
      const n = tk.hard ? 5 : 4;
      const xs: number[] = [Phaser.Math.Clamp(tk.player.x, 70, tk.W - 70)];
      let guard = 0;
      while (xs.length < n && guard++ < 60) {
        const x = 70 + Math.random() * (tk.W - 140);
        if (xs.every((o) => Math.abs(o - x) > SLIDE_HALF * 2 + 30)) xs.push(x);
      }
      xs.forEach((x, i) => {
        const at = time + i * 330;
        slides.push({ x, at, fallAt: at + tk.warn(1050), hit: false, driftUntil: at + tk.warn(1050) + 4800 });
      });
      tk.sfx('quake');
    },
    update(time: number) {
      const p = tk.player;
      for (const s of slides) {
        if (time < s.fallAt) continue;
        const front = FIELD_TOP + ((time - s.fallAt) / 1000) * SLIDE_SPEED;
        if (!s.hit && Math.abs(p.x - s.x) < SLIDE_HALF + 8 && p.y < front && p.y > front - 220) {
          s.hit = true;
          tk.hitPlayer(18, p.x, p.y);
          tk.slowPlayer(0.5, 1100);
          tk.sfx('stone-slam');
        }
        // The drift at the foot of the column clogs your legs.
        if (front > tk.H && time < s.driftUntil && Math.abs(p.x - s.x) < SLIDE_HALF && p.y > tk.H - 150) tk.slowPlayer(0.6, 200);
      }
      slides = slides.filter((s) => time < s.driftUntil);
    },
    drawGround(g, time) {
      for (const s of slides) {
        if (time < s.fallAt) {
          const k = Phaser.Math.Clamp((time - s.at) / (s.fallAt - s.at), 0, 1);
          // The column's shadow lengthening down the floor.
          g.fillStyle(0x0a2030, 0.08 + k * 0.14); g.fillRect(s.x - SLIDE_HALF, FIELD_TOP, SLIDE_HALF * 2, (tk.H - FIELD_TOP) * k);
          g.lineStyle(2, ICE_LIT, 0.3 + k * 0.4);
          g.lineBetween(s.x - SLIDE_HALF, FIELD_TOP, s.x - SLIDE_HALF, tk.H); g.lineBetween(s.x + SLIDE_HALF, FIELD_TOP, s.x + SLIDE_HALF, tk.H);
          continue;
        }
        const front = Math.min(tk.H + 40, FIELD_TOP + ((time - s.fallAt) / 1000) * SLIDE_SPEED);
        // Packed snow left in the slide's track, and the drift heaped at the bottom.
        g.fillStyle(R.snowShade, 0.5); g.fillRect(s.x - SLIDE_HALF, FIELD_TOP, SLIDE_HALF * 2, front - FIELD_TOP);
        if (front >= tk.H) {
          const fade = Phaser.Math.Clamp((s.driftUntil - time) / 800, 0, 1);
          g.fillStyle(R.snowBlue, 0.8 * fade); g.fillEllipse(s.x + 4, tk.H - 50, SLIDE_HALF * 2.6, 110);
          g.fillStyle(R.snow, 0.95 * fade); g.fillEllipse(s.x, tk.H - 58, SLIDE_HALF * 2.3, 96);
        }
      }
    },
    drawAir(g, time) {
      for (const s of slides) {
        // The cornice at the top edge, cracking.
        const k = Phaser.Math.Clamp((time - s.at) / Math.max(1, s.fallAt - s.at), 0, 1);
        if (time < s.fallAt + 200) {
          const shake = time > s.fallAt - 400 ? Math.sin(time / 20) * 2 : 0;
          g.fillStyle(R.snow, 1); g.fillEllipse(s.x + shake, FIELD_TOP + 6, SLIDE_HALF * 2.4, 30);
          g.fillStyle(R.snowBlue, 1); g.fillEllipse(s.x + shake, FIELD_TOP + 16, SLIDE_HALF * 2.2, 12);
          for (let i = 0; i < 5; i++) drawIcicle(g, s.x - SLIDE_HALF + 10 + i * 22 + shake, FIELD_TOP + 18, 10 + jit(s.x, i) * 10, 5);
          g.lineStyle(2, ICE_DARK, k); g.lineBetween(s.x - 20, FIELD_TOP - 4, s.x - 6, FIELD_TOP + 14); g.lineBetween(s.x + 4, FIELD_TOP - 2, s.x + 18, FIELD_TOP + 16);
        }
        if (time < s.fallAt) continue;
        const front = FIELD_TOP + ((time - s.fallAt) / 1000) * SLIDE_SPEED;
        if (front > tk.H + 120) continue;
        // The slide: a tumbling white mass with blocks rolling in its face.
        for (let i = 0; i < 9; i++) {
          const y = front - i * 24;
          if (y < FIELD_TOP) break;
          const w = SLIDE_HALF * (1 - i * 0.06);
          g.fillStyle(i % 2 ? R.snow : lit(R.snowShade, 0.4), 0.95 - i * 0.07);
          g.fillEllipse(s.x + Math.sin(time / 60 + i) * 6, y, w * 2, 30);
        }
        for (let i = 0; i < 5; i++) {
          const ph = ((time / 180 + i * 0.2) % 1);
          const bx = s.x + (jit(s.x, i + 30) - 0.5) * SLIDE_HALF * 1.6, by = front - ph * 60;
          g.fillStyle(R.snowBlue, 1); g.fillRect(bx - 6, by - 6, 12, 12);
          g.fillStyle(R.snow, 1); g.fillRect(bx - 6, by - 8, 12, 5);
        }
      }
    },
    onPhaseEnd() { slides = []; },
  };
};

// ── Signature: Frozen Moment (hard) ──────────────────────────────────
// A ring of shards bursts off him — then stops dead in the air and hangs there, each one drawing
// a faint line down the way it will go. After a held breath they all move again at once. The ring
// has one wide gap, and the further out you stand, the wider apart the shards are.

interface Shard { a: number; x: number; y: number; moving: 'out' | 'held' | 'go'; alive: boolean }

const moment = (tk: BossToolkit): SignatureMove => {
  let shards: Shard[] = [];
  let heldAt = 0, goAt = 0, ox = 0, oy = 0;
  const OUT_SPEED = 330, GO_SPEED = 360;
  return {
    durationMs: 3300,
    windupMs: 800,
    tell: 'FROZEN MOMENT',
    hold: 'charge',
    cast(time: number) {
      shards = [];
      ox = tk.bossX; oy = tk.bossY;
      const n = tk.hard ? 26 : 20;
      const gap = tk.angleToPlayer() + (Math.random() - 0.5) * 1.6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        // The gap: three shards left out, somewhere near you.
        let d = a - gap;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        if (Math.abs(d) < (Math.PI * 2 * 1.6) / n) continue;
        shards.push({ a, x: ox, y: oy, moving: 'out', alive: true });
      }
      heldAt = time + 460;
      goAt = heldAt + tk.warn(1700);
      tk.sfx('ice-shard');
      tk.schedule(460, () => tk.sfx('time-warp'));
      tk.schedule(goAt - time, () => tk.sfx('crystal-shatter'));
    },
    update(time: number, dt: number) {
      if (!shards.length) return;
      const step = Math.min(0.05, dt > 5 ? dt / 1000 : dt);
      const p = tk.player;
      const holding = time >= heldAt && time < goAt;
      if (holding) tk.slowPlayer(0.75, 120);
      for (const s of shards) {
        if (!s.alive) continue;
        const sp = time < heldAt ? OUT_SPEED : time < goAt ? 0 : GO_SPEED;
        s.x += Math.cos(s.a) * sp * step;
        s.y += Math.sin(s.a) * sp * step;
        if (s.x < -20 || s.x > tk.W + 20 || s.y < FIELD_TOP - 20 || s.y > tk.H + 20) { s.alive = false; continue; }
        if (Math.hypot(s.x - p.x, s.y - p.y) < 18) {
          s.alive = false;
          tk.hitPlayer(12, p.x, p.y);
        }
      }
      shards = shards.filter((s) => s.alive);
    },
    drawGround(g, time) {
      if (!shards.length || time >= goAt) return;
      if (time < heldAt) return;
      // While held: the path each shard will take, faint, so you can find the gap.
      for (const s of shards) {
        g.lineStyle(1, ACCENT, 0.3); g.lineBetween(s.x, s.y, s.x + Math.cos(s.a) * 340, s.y + Math.sin(s.a) * 340);
      }
      // A held breath: a still ring of frost round where it all began.
      g.lineStyle(2, ICE_LIT, 0.35); g.strokeCircle(ox, oy, 0.46 * OUT_SPEED);
    },
    drawAir(g, time) {
      const holding = time >= heldAt && time < goAt;
      for (const s of shards) {
        const c = Math.cos(s.a), sn = Math.sin(s.a);
        const L = 12, w = 4;
        g.fillStyle(ICE_DARK, 0.7); g.fillTriangle(s.x - c * L - sn * w, s.y - sn * L + c * w, s.x - c * L + sn * w, s.y - sn * L - c * w, s.x + c * L, s.y + sn * L);
        g.fillStyle(holding ? ICE_LIT : ICE, 1); g.fillTriangle(s.x - c * L * 0.8 - sn * w * 0.7, s.y - sn * L * 0.8 + c * w * 0.7, s.x - c * L * 0.8 + sn * w * 0.7, s.y - sn * L * 0.8 - c * w * 0.7, s.x + c * L * 0.9, s.y + sn * L * 0.9);
        if (holding && Math.floor((time + s.a * 300) / 150) % 4 === 0) drawGlint(g, s.x, s.y, 5, 0.8);
      }
      if (holding) {
        // The countdown: a frost ring at his feet closing as the moment runs out.
        const k = (goAt - time) / (goAt - heldAt);
        g.lineStyle(3, ACCENT, 0.7);
        g.beginPath(); g.arc(ox, oy, 44, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.strokePath();
      }
    },
    onPhaseEnd() { shards = []; },
  };
};

// ── Signature: Absolute Zero (hard) ──────────────────────────────────
// He draws the last warmth out of the room. Three warm circles remain — the ghosts of the
// braziers he licensed — and outside them the frost bites and your legs stiffen. Then he puts
// the circles out one at a time, farthest from you first. Keep to the one that will last.

interface Warm { x: number; y: number; r: number; outAt: number }

const zero = (tk: BossToolkit): SignatureMove => {
  let warms: Warm[] = [];
  let bitesAt = 0, endAt = 0, lastTick = 0;
  return {
    durationMs: 4600,
    windupMs: 900,
    tell: 'ABSOLUTE ZERO',
    hold: 'conduct',
    cast(time: number) {
      warms = [];
      const p = tk.player;
      const pts: { x: number; y: number }[] = [];
      // One a short run from you, two more about the room, never on top of each other.
      const near = tk.angleToPlayer(tk.W / 2, (tk.H + FIELD_TOP) / 2) + Math.PI + (Math.random() - 0.5) * 1.4;
      pts.push({ x: tk.clampX(p.x + Math.cos(near) * 190, 110), y: tk.clampY(p.y + Math.sin(near) * 150, 110) });
      let guard = 0;
      while (pts.length < 3 && guard++ < 80) {
        const x = 110 + Math.random() * (tk.W - 220), y = FIELD_TOP + 100 + Math.random() * (tk.H - FIELD_TOP - 200);
        if (pts.every((q) => Math.hypot(q.x - x, q.y - y) > 240)) pts.push({ x, y });
      }
      bitesAt = time + tk.warn(1700);
      endAt = bitesAt + 2800;
      // Out in order, farthest from you first — the last one standing is the one nearest you now.
      const sorted = pts.slice().sort((a, b) => Math.hypot(b.x - p.x, b.y - p.y) - Math.hypot(a.x - p.x, a.y - p.y));
      sorted.forEach((q, i) => warms.push({ x: q.x, y: q.y, r: 74, outAt: i < 2 ? bitesAt + 600 + i * 900 : endAt + 400 }));
      lastTick = 0;
      tk.sfx('frost-blast');
    },
    update(time: number) {
      if (!warms.length) return;
      if (time > endAt + 400) { warms = []; return; }
      if (time < bitesAt) return;
      const p = tk.player;
      const safe = warms.some((w) => time < w.outAt && Math.hypot(p.x - w.x, p.y - w.y) < w.r);
      if (!safe) {
        tk.slowPlayer(0.55, 220);
        if (time - lastTick > 500) { lastTick = time; tk.hitPlayer(9, p.x, p.y); tk.sfx('status-freeze'); }
      }
    },
    drawGround(g, time) {
      if (!warms.length) return;
      const k = Phaser.Math.Clamp((time - (bitesAt - 1700)) / 1700, 0, 1);
      // Frost creeping in from the walls over the whole floor.
      g.fillStyle(ICE_LIT, 0.08 + k * 0.18); g.fillRect(0, FIELD_TOP, tk.W, tk.H - FIELD_TOP);
      for (let i = 0; i < 30; i++) {
        const x = jit(11, i) * tk.W, y = FIELD_TOP + jit(12, i) * (tk.H - FIELD_TOP);
        g.lineStyle(1, 0xffffff, 0.3 * k); g.lineBetween(x, y, x + 14, y - 8); g.lineBetween(x, y, x + 12, y + 9);
      }
      for (const w of warms) {
        if (time > w.outAt + 300) continue;
        const dying = time > w.outAt - 700;
        const f = dying ? Phaser.Math.Clamp((w.outAt - time) / 700, 0, 1) : 1;
        // The warm circle: wet stone, an ember ring, the ghost of a brazier in the middle.
        g.fillStyle(0x3a2a24, 0.5 * f); g.fillCircle(w.x, w.y, w.r * (0.4 + 0.6 * f));
        g.fillStyle(R.ember, 0.12 * f); g.fillCircle(w.x, w.y, w.r * f);
        g.lineStyle(3, dying && Math.floor(time / 90) % 2 ? ICE_LIT : R.ember, 0.8); g.strokeCircle(w.x, w.y, w.r * (0.4 + 0.6 * f));
        g.lineStyle(2, R.iron, 0.4 * f);
        g.lineBetween(w.x - 8, w.y + 6, w.x - 5, w.y - 8); g.lineBetween(w.x + 8, w.y + 6, w.x + 5, w.y - 8);
        g.fillStyle(R.emberHot, 0.6 * f); g.fillEllipse(w.x, w.y - 10, 18, 7);
      }
    },
    drawAir(g, time) {
      for (const w of warms) {
        if (time > w.outAt) {
          // A curl of smoke where it went out.
          const s = 1 - (time - w.outAt) / 900;
          if (s > 0) for (let i = 0; i < 3; i++) { g.fillStyle(0x8a8a90, 0.35 * s); g.fillCircle(w.x + Math.sin(time / 200 + i) * 6, w.y - 20 - (1 - s) * 50 - i * 10, 6 + i * 3); }
          continue;
        }
        const f = 0.85 + Math.sin(time / 100 + w.x) * 0.15;
        g.fillStyle(R.flame, 0.85); g.fillTriangle(w.x - 6, w.y - 12, w.x + 6, w.y - 12, w.x, w.y - 12 - 16 * f);
        g.fillStyle(R.emberHot, 1); g.fillTriangle(w.x - 3, w.y - 12, w.x + 3, w.y - 12, w.x, w.y - 20 - 4 * f);
      }
    },
    onPhaseEnd() { warms = []; },
  };
};

// ── The def ──────────────────────────────────────────────────────────

export const HOARFROST_BOSS: WorldBossDef = {
  worldId: 'isle:hoarfrost',
  name: 'Prince Hoarfrost',
  title: 'Master of the Rimefast Court',
  color: ICE,
  colorLit: ICE_LIT,
  colorDark: ICE_DARK,
  accent: ACCENT,
  damageMult: 1.1,

  intro: [
    'Be still.',
    'Mother asked me to stop the fleet. I stopped the sea. Nothing in Rimefast moves unless it pays me first.',
  ],
  banter: [
    'You are so loud. Everything warm is loud.',
    'A held breath is the most honest thing a body ever does.',
    'The Thaw Tithe is a coin a head. I would have taken less. Mother would not.',
    'Every ship in my harbour is exactly where I left it. Do you know how rare that is?',
    'Rime is only the air, made to stop and think.',
    'Mother keeps the drowned asleep. I keep the living still. We are a careful family.',
    'Run if you like. Running is just heat leaving you faster.',
  ],
  defeatLine: 'THE HARBOUR CREAKS',
  resumeLine: 'Back again, and still so warm. Let us try that once more, more slowly.',

  phases: [
    {
      name: 'Rime',
      line: 'Mind the floor. I have laid it out in squares for you.',
      hp: 420,
      cycle: ['sig:lances', 'volley', 'sig:lattice', 'lanes', 'sig:shatter', 'radial', 'sig:lances', 'homing'],
      harass: ['h-snipe', 'h-lane', 'h-flak'],
      restMs: 1150,
      harassMs: 3300,
    },
    {
      name: 'The Long Winter',
      line: 'You cracked the rime. Then have the winter — all of it, at once.',
      hp: 500,
      cycle: ['sig:whiteout', 'sig:anchor', 'barrage', 'sig:avalanche', 'spiral', 'sig:lances', 'sig:anchor', 'quake'],
      harass: ['h-orbs', 'h-snipe', 'h-mines'],
      restMs: 1000,
      harassMs: 2900,
    },
  ],

  hard: {
    introLine: 'NOTHING MOVES',
    extraPhase: {
      name: 'Absolute Zero',
      line: 'Enough motion. Let us all be very, very still.',
      hp: 360,
      cycle: ['sig:moment', 'sig:zero', 'sig:lattice', 'sig:moment', 'sweep', 'sig:shatter', 'sig:zero', 'sanctuary'],
      harass: ['h-rune', 'h-orbs', 'h-lane'],
      restMs: 850,
      harassMs: 2500,
    },
  },

  tuning: {
    lanes: { halfW: 26 },
    radial: { speed: 210 },
    sweep: { halfW: 22 },
  },

  signatures: { lances, lattice, shatter, whiteout, anchor, avalanche, moment, zero },

  look: { crest: 'spires', pattern: 'facets', aura: 'frost', hands: 'blade', torsoR: 36, eyes: 2, eyeColor: 0xdaf6ff, mouth: 'line' },

  phaseStyles: [
    { movement: 'hover', gimmick: 'none' },
    { movement: 'stalk', gimmick: 'wards', tint: 'pale', look: { pattern: 'cracks', mouth: 'grate', hands: 'gauntlet' } },
    { movement: 'anchor', gimmick: 'shrink', tint: 'cold', look: { crest: 'halo', pattern: 'smooth', aura: 'none', eyes: 1, mouth: 'none' } },
  ],

  /**
   * The circlet and its fringe. A thin silver circlet sits on the brow with a fringe of icicles
   * hanging over the eyes, one snapping away for every ninth of his health. A white fur collar,
   * and the Queen's sea-green ribbon with a frozen pearl. In the Long Winter, cracked ice plates
   * over the body and snow whirling round him; at Absolute Zero he stands sealed in a clear block.
   */
  drawDecor(g, s) {
    const Rr = s.radius;
    // Fur collar: white tufts in an arc round the top of the body.
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      const x = s.x + Math.cos(a) * Rr * 0.86, y = s.y + Math.sin(a) * Rr * 0.55 + Rr * 0.32;
      g.fillStyle(R.snowShade, 1); g.fillCircle(x, y + 1, 6.5);
      g.fillStyle(R.snow, 1); g.fillCircle(x, y, 5.5);
    }
    // The Queen's ribbon and the pearl medallion, rimed over.
    g.lineStyle(4, R.livery, 1); g.lineBetween(s.x - Rr * 0.6, s.y - Rr * 0.1, s.x, s.y + Rr * 0.45); g.lineBetween(s.x + Rr * 0.6, s.y - Rr * 0.1, s.x, s.y + Rr * 0.45);
    g.fillStyle(R.kelp, 1); g.fillCircle(s.x, s.y + Rr * 0.48, 6);
    g.fillStyle(0xf4f0ea, 1); g.fillCircle(s.x, s.y + Rr * 0.48, 4);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(s.x - 1.2, s.y + Rr * 0.48 - 1.2, 1.4);

    if (s.phaseIdx === 1) {
      // Ice plate armour: faceted pauldrons and a breastplate, cracking as he weakens.
      for (const side of [-1, 1]) {
        const px = s.x + side * Rr * 0.78, py = s.y - Rr * 0.3;
        g.fillStyle(dim(ICE, 0.25), 0.9); g.fillTriangle(px - 14, py + 10, px + 14, py + 10, px + side * 6, py - 16);
        g.fillStyle(ICE_LIT, 0.8); g.fillTriangle(px - 10, py + 8, px + 2, py + 8, px + side * 6, py - 12);
      }
      g.fillStyle(ICE, 0.45);
      g.fillPoints([{ x: s.x - Rr * 0.5, y: s.y - Rr * 0.2 }, { x: s.x + Rr * 0.5, y: s.y - Rr * 0.2 }, { x: s.x + Rr * 0.35, y: s.y + Rr * 0.4 }, { x: s.x, y: s.y + Rr * 0.6 }, { x: s.x - Rr * 0.35, y: s.y + Rr * 0.4 }], true);
      const cracks = Math.floor((1 - s.hpRatio) * 7);
      for (let i = 0; i < cracks; i++) {
        const x0 = s.x + (jit(3, i) - 0.5) * Rr * 0.9, y0 = s.y + (jit(4, i) - 0.4) * Rr * 0.7;
        g.lineStyle(1.5, ICE_DARK, 0.9);
        g.lineBetween(x0, y0, x0 + (jit(5, i) - 0.5) * 18, y0 + jit(6, i) * 14);
        g.lineBetween(x0, y0, x0 + (jit(7, i) - 0.5) * 14, y0 - jit(8, i) * 10);
      }
      // Snow whirling round him.
      for (let i = 0; i < 10; i++) {
        const a = s.t / 500 + i * 0.63;
        const r = Rr + 14 + (i % 3) * 9;
        g.fillStyle(0xffffff, 0.8); g.fillCircle(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r * 0.6, 1.8);
      }
    }

    if (s.phaseIdx >= 2) {
      // Sealed in a clear block of ice: a cube outline with a lit face, and snow hanging still.
      const B = Rr + 16;
      g.fillStyle(R.glass, 0.18); g.fillRect(s.x - B, s.y - B - 10, B * 2, B * 2 + 10);
      g.lineStyle(2, ICE_LIT, 0.85); g.strokeRect(s.x - B, s.y - B - 10, B * 2, B * 2 + 10);
      g.lineStyle(1.5, ICE_LIT, 0.5);
      g.lineBetween(s.x - B, s.y - B - 10, s.x - B + 12, s.y - B - 22); g.lineBetween(s.x + B, s.y - B - 10, s.x + B + 12, s.y - B - 22);
      g.lineBetween(s.x - B + 12, s.y - B - 22, s.x + B + 12, s.y - B - 22); g.lineBetween(s.x + B + 12, s.y - B - 22, s.x + B + 12, s.y + B - 12);
      g.fillStyle(0xffffff, 0.35); g.fillTriangle(s.x - B + 4, s.y - B - 6, s.x - B + 26, s.y - B - 6, s.x - B + 4, s.y);
      for (let i = 0; i < 8; i++) {
        drawGlint(g, s.x + (jit(21, i) - 0.5) * B * 2.6, s.y + (jit(22, i) - 0.5) * B * 2.2, 3, 0.5 + 0.4 * Math.sin(s.t / 900 + i));
      }
    }

    // The circlet and its icicle fringe (worn in every phase; at Absolute Zero it is frozen into
    // the block with him).
    const cy = s.y - Rr * 0.62;
    g.lineStyle(3, 0xd8e2ea, 1);
    g.beginPath(); g.arc(s.x, cy + Rr * 0.5, Rr * 0.72, Math.PI * 1.18, Math.PI * 1.82, false); g.strokePath();
    g.fillStyle(ACCENT, 1); g.fillCircle(s.x, cy - Rr * 0.2, 3.5);
    const fringe = 9;
    const left = s.phaseIdx >= 2 ? fringe : Math.max(1, Math.ceil(s.hpRatio * fringe));
    for (let i = 0; i < fringe; i++) {
      if (i >= left) continue;
      const a = Math.PI * 1.22 + (i / (fringe - 1)) * Math.PI * 0.56;
      const x = s.x + Math.cos(a) * Rr * 0.72, y = cy + Rr * 0.5 + Math.sin(a) * Rr * 0.72;
      const len = 7 + (i % 3) * 4 + (i === 4 ? 5 : 0);
      drawIcicle(g, x, y, len, 4, 0.95, s.enraged ? Math.sin(s.t / 40 + i) * 1.2 : 0);
    }
    // Frozen breath curling from where his mouth would be.
    if (s.phaseIdx < 2) {
      for (let i = 0; i < 3; i++) {
        const ph = ((s.t / 1400 + i / 3) % 1);
        g.fillStyle(0xffffff, 0.35 * (1 - ph));
        g.fillCircle(s.x + Math.cos(s.facing) * (12 + ph * 26), s.y + 4 + Math.sin(s.facing) * (8 + ph * 18) - ph * 10, 3 + ph * 7);
      }
    }
    // While casting, frost sparkles gather at the blades of his hands.
    if (s.castGlow > 0.3) for (const h of s.hands) drawGlint(g, h.x, h.y - 6, 5 * s.castGlow, 0.9);
  },

  /**
   * The Rime Hall under the icicle palace: a disc of polished black ice laid in a floor of snow-
   * white flagstones. Pale shapes show faintly through the black — hands and faces, the last of
   * the people who could not pay, waiting for the Undertow. A compass of frost ferns radiates
   * from the middle; four ice pillars stand at the corners with icicles off their capitals.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x1ce5);
    g.fillStyle(0xd8e6f0, 1); g.fillRect(0, 0, W, H);
    // Flagstones of packed snow, the joints blue with shadow.
    for (let y = FIELD_TOP - 30; y < H; y += 58) {
      const off = ((y / 58) % 2) * 40;
      for (let x = -off; x < W; x += 80) {
        g.fillStyle(rng() < 0.5 ? 0xe4eef5 : 0xdbe7ef, 1); g.fillRect(x + 2, y + 2, 76, 54);
        g.fillStyle(0xffffff, 0.5); g.fillRect(x + 2, y + 2, 76, 3);
      }
    }
    // The black-ice disc.
    const cx = W / 2, cy = FIELD_TOP + (H - FIELD_TOP) * 0.52;
    const RX = 330, RY = 220;
    g.fillStyle(0x9fb8c8, 1); g.fillEllipse(cx, cy, RX * 2 + 24, RY * 2 + 18);
    g.fillStyle(0x0e2232, 1); g.fillEllipse(cx, cy, RX * 2, RY * 2);
    g.fillStyle(0x163246, 1); g.fillEllipse(cx - 20, cy - 16, RX * 1.6, RY * 1.4);
    // What is under it: pale faces and open hands, very faint.
    for (let i = 0; i < 9; i++) {
      const a = rng() * Math.PI * 2, d = rng() * 0.75;
      const x = cx + Math.cos(a) * RX * d, y = cy + Math.sin(a) * RY * d;
      g.fillStyle(0x8fb0c4, 0.16); g.fillEllipse(x, y, 22, 26);
      g.fillStyle(0x0e2232, 0.5); g.fillCircle(x - 4, y - 2, 2); g.fillCircle(x + 4, y - 2, 2);
      g.fillStyle(0x8fb0c4, 0.12);
      for (let k = 0; k < 4; k++) g.fillRect(x - 22 + k * 4 + (rng() < 0.5 ? 0 : 30), y + 10 - k, 2.5, 10);
    }
    // Frost-fern compass from the middle.
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const len = i % 2 ? 0.55 : 0.92;
      const ex = cx + Math.cos(a) * RX * len, ey = cy + Math.sin(a) * RY * len;
      g.lineStyle(i % 4 === 0 ? 2.5 : 1.2, 0xd6efff, 0.55); g.lineBetween(cx, cy, ex, ey);
      for (let k = 1; k < 7; k++) {
        const t = k / 7;
        const bx = cx + (ex - cx) * t, by = cy + (ey - cy) * t;
        const fl = 10 * (1 - t) + 4;
        g.lineStyle(1, 0xd6efff, 0.4);
        g.lineBetween(bx, by, bx + Math.cos(a + 0.7) * fl, by + Math.sin(a + 0.7) * fl);
        g.lineBetween(bx, by, bx + Math.cos(a - 0.7) * fl, by + Math.sin(a - 0.7) * fl);
      }
    }
    g.lineStyle(3, 0xd6efff, 0.7); g.strokeEllipse(cx, cy, RX * 2 - 10, RY * 2 - 8);
    g.fillStyle(0xeafaff, 0.8); g.fillCircle(cx, cy, 10);
    g.fillStyle(0x1f6a70, 1); g.fillCircle(cx, cy, 5);
    // Glints across the polish.
    for (let i = 0; i < 24; i++) {
      const a = rng() * Math.PI * 2, d = rng();
      g.fillStyle(0xffffff, 0.3 + rng() * 0.4); g.fillRect(cx + Math.cos(a) * RX * d, cy + Math.sin(a) * RY * d, 3, 1);
    }
    // Ice pillars in the corners, icicles off their capitals.
    for (const [px, py] of [[70, FIELD_TOP + 70], [W - 70, FIELD_TOP + 70], [70, H - 60], [W - 70, H - 60]]) {
      g.fillStyle(0x000000, 0.18); g.fillEllipse(px + 6, py + 6, 64, 20);
      g.fillStyle(0x7fb2cc, 1); g.fillRect(px - 20, py - 70, 40, 74);
      g.fillStyle(0xbfe3f0, 1); g.fillRect(px - 16, py - 70, 26, 74);
      g.fillStyle(0xeafaff, 0.9); g.fillRect(px - 14, py - 70, 6, 74);
      g.fillStyle(0xeafaff, 1); g.fillRect(px - 28, py - 80, 56, 12);
      for (let k = 0; k < 6; k++) drawIcicle(g, px - 24 + k * 9.5, py - 68, 8 + ((k * 7) % 9), 4);
    }
    // Snow drifted against the walls.
    for (let x = 0; x < W; x += 60) {
      g.fillStyle(0xffffff, 0.9); g.fillEllipse(x + rng() * 20, FIELD_TOP + 2, 90, 22);
      g.fillStyle(0xc8d6e3, 0.8); g.fillEllipse(x + rng() * 20, H - 6, 90, 20);
      g.fillStyle(0xffffff, 0.9); g.fillEllipse(x + rng() * 20, H - 10, 80, 16);
    }
  },
};
