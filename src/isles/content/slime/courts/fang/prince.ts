import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, glow, lit, mulberry } from '../../../../art/IsleArt';
import { hangingSkin, markSigil, shedHusk, venomSlick, web } from './art';
import {
  ADDER, BRUISE, COBRA, COBRA_HOOD, FANG, FANG_DARK, FANG_LIT, FEN, FEN_LIT, SLOUGH, THATCH, THATCH_DARK, TIMBER,
  TIMBER_DARK, TIMBER_LIT, VENIN, VENIN_DARK, VENIN_EYE, VENIN_LIT, VENOM, VENOM_DARK, VENOM_LIT, VIPER, WICKER,
  WICKER_DARK, WICKER_LIT,
} from './palette';
import { arcPoint, clamp, dist, segDist } from './util';

/**
 * Prince Venin, the Milk-Fanged — Matriarch Nyxa's eldest broodling, governor of the Fang Court.
 *
 * Venin was the first of her clutch to hatch, and the first she milked. He has been milked every
 * new moon since, like any serpent in the shed, and he is proud of it: his venom is the strongest
 * in the Draught, and he says so. He governs the court as he was raised — every hand yields its
 * measure, or it is not given back. He fights like a snake:
 *
 * • **Fangs** (stalking): he coils — rings tightening under him — and lunges in one long straight
 *   bite, leaving two fang-punctures at the end of it that drip and pool; and he calls up the
 *   court's white fangs out of the floor in two rows that snap shut like a jaw on whatever is
 *   between them.
 * • **Spitting Cobra** (planted, sick tint): the hood flares. He rakes the room with arcs of spit
 *   that land as burning pools, and hoses a long stream of venom across it in a sweep.
 * • **Cold Blood** (hard, blinking, cold tint): he goes utterly still between bursts — come too
 *   close while he basks and he strikes before you see him move — and every lunge leaves a shed
 *   skin behind that repeats it a beat later.
 */

const TOP = 96;

// ── Signature: Coiled Lunge ──────────────────────────────────────────
// He coils — rings of body tightening under him while a line runs out toward you — then lunges in
// one long straight bite past where you stood. Two fang-punctures are left at the end of the bite
// and halfway along it; each drips for a moment, then wells up into a pool of venom.

interface Puncture { x: number; y: number; at: number; pooled: boolean }

const lunge = (tk: BossToolkit): SignatureMove => {
  let coilFrom = 0, coilUntil = 0, arriveAt = 0;
  let line = { x0: 0, y0: 0, x1: 0, y1: 0 };
  let punctures: Puncture[] = [];
  return {
    durationMs: 1700,
    windupMs: 500,
    gesture: 'punch',
    hold: 'reach',
    tell: 'COILED LUNGE',
    cast(time) {
      const p = tk.player;
      const a = tk.angleToPlayer();
      const reach = clamp(dist(tk.bossX, tk.bossY, p.x, p.y) + 110, 260, 560);
      const x1 = tk.clampX(tk.bossX + Math.cos(a) * reach, 90), y1 = tk.clampY(tk.bossY + Math.sin(a) * reach, 90);
      line = { x0: tk.bossX, y0: tk.bossY, x1, y1 };
      const warn = tk.warn(620);
      coilFrom = time; coilUntil = time + warn; arriveAt = time + warn + 300;
      tk.spawnCharge({ toX: x1, toY: y1, warnMs: 620, travelMs: 300, halfW: 32, damage: 16 });
      // Punctures at the middle and the end of the bite, two holes each.
      const nx = -Math.sin(a), ny = Math.cos(a);
      punctures = [];
      for (const k of [0.55, 1]) {
        const cx = line.x0 + (x1 - line.x0) * k, cy = line.y0 + (y1 - line.y0) * k;
        for (const s of [-1, 1]) punctures.push({ x: cx + nx * 16 * s, y: cy + ny * 16 * s, at: arriveAt + (k < 1 ? -120 : 0), pooled: false });
      }
      tk.sfx('whip');
    },
    update(time) {
      for (const pu of punctures) {
        if (pu.pooled || time < pu.at + 650) continue;
        pu.pooled = true;
        tk.spawnPool({ x: pu.x, y: pu.y, radius: 30, lifeMs: 4200, damage: 4, tickMs: 600 });
        tk.sfx('slime-splat');
      }
      if (punctures.length && punctures.every((pu) => pu.pooled)) punctures = [];
    },
    drawGround(g, time) {
      // The coil: rings of scale tightening under him.
      if (time < coilUntil) {
        const k = clamp((time - coilFrom) / (coilUntil - coilFrom), 0, 1);
        for (let i = 0; i < 3; i++) {
          const r = 70 - k * 30 - i * 14;
          g.lineStyle(7 - i * 1.5, i % 2 ? VENIN_LIT : VENIN, 0.5 + k * 0.4);
          g.strokeEllipse(line.x0, line.y0 + 14, r * 2, r * 0.9);
        }
        // The bite line, filling.
        g.lineStyle(20, VENOM, 0.05 + k * 0.1); g.lineBetween(line.x0, line.y0, line.x1, line.y1);
        g.lineStyle(2, VENOM_LIT, 0.4 + k * 0.5);
        g.lineBetween(line.x0, line.y0, line.x0 + (line.x1 - line.x0) * k, line.y0 + (line.y1 - line.y0) * k);
      }
      // Punctures: two black holes ringed in white, dripping green, welling up.
      for (const pu of punctures) {
        if (time < pu.at) continue;
        const k = clamp((time - pu.at) / 650, 0, 1);
        g.fillStyle(0x0a0806, 0.9); g.fillEllipse(pu.x, pu.y, 9, 6);
        g.lineStyle(1.5, FANG_LIT, 0.8); g.strokeEllipse(pu.x, pu.y, 11, 7);
        g.fillStyle(VENOM, 0.5 + k * 0.4); g.fillEllipse(pu.x, pu.y, 8 + k * 46, 5 + k * 28);
      }
    },
    drawAir(g, time) {
      // Two white fangs flash along the bite as it lands.
      if (time >= arriveAt - 300 && time < arriveAt + 200) {
        const k = clamp((time - (arriveAt - 300)) / 300, 0, 1);
        const x = line.x0 + (line.x1 - line.x0) * k, y = line.y0 + (line.y1 - line.y0) * k;
        const a = Math.atan2(line.y1 - line.y0, line.x1 - line.x0);
        const nx = -Math.sin(a), ny = Math.cos(a);
        for (const s of [-1, 1]) {
          const bx = x + nx * 14 * s, by = y + ny * 14 * s;
          g.fillStyle(FANG_LIT, 0.95);
          g.fillTriangle(bx - nx * 4, by - ny * 4, bx + nx * 4, by + ny * 4, bx + Math.cos(a) * 26, by + Math.sin(a) * 26);
        }
      }
      for (const pu of punctures) {
        if (time < pu.at || time > pu.at + 650) continue;
        const ph = ((time - pu.at) / 220) % 1;
        g.fillStyle(VENOM, 0.9); g.fillCircle(pu.x, pu.y - 18 + ph * 16, 2);
      }
    },
    onPhaseEnd() { punctures = []; coilUntil = 0; arriveAt = 0; },
  };
};

// ── Signature: The Jaws ──────────────────────────────────────────────
// Two rows of the court's white fangs break up out of the floor either side of you, a long jaw
// with you on its tongue. After the warning the rows snap shut on the middle. Get outside a row.

const jaws = (tk: BossToolkit): SignatureMove => {
  let horiz = true, c = 0, gap = 125, snapAt = 0, riseAt = 0, dealt = true;
  const SNAP_MS = 200;
  const rowAt = (time: number) => {
    const k = clamp((time - snapAt) / SNAP_MS, 0, 1);
    return gap * (1 - k);
  };
  return {
    durationMs: 1900,
    windupMs: 600,
    gesture: 'clap',
    tell: 'THE JAWS',
    cast(time) {
      const p = tk.player;
      horiz = Math.random() < 0.5;
      gap = tk.hard ? 135 : 125;
      c = horiz ? clamp(p.y, TOP + gap + 10, tk.H - gap - 10) : clamp(p.x, gap + 20, tk.W - gap - 20);
      riseAt = time;
      snapAt = time + tk.warn(1100);
      dealt = false;
      tk.sfx('stone-rise');
    },
    update(time) {
      if (dealt || time < snapAt + SNAP_MS) return;
      dealt = true;
      const p = tk.player;
      const d = Math.abs((horiz ? p.y : p.x) - c);
      tk.sfx('stone-slam');
      if (p.active && p.hp > 0 && d < gap - 4) { tk.hitPlayer(18, p.x, p.y); tk.slowPlayer(0.6, 900); }
    },
    drawGround(g, time) {
      if (time > snapAt + SNAP_MS + 700) return;
      const k = clamp((time - riseAt) / Math.max(1, snapAt - riseAt), 0, 1);
      // The tongue: the danger band between the rows.
      const o = rowAt(time);
      if (time < snapAt + SNAP_MS) {
        g.fillStyle(0x7a2030, 0.08 + k * 0.14);
        if (horiz) g.fillRect(0, c - o, tk.W, o * 2); else g.fillRect(c - o, TOP, o * 2, tk.H - TOP);
      } else {
        // The crack where the jaw shut.
        const f = 1 - clamp((time - snapAt - SNAP_MS) / 700, 0, 1);
        g.lineStyle(4, 0x0a0806, 0.7 * f);
        if (horiz) g.lineBetween(0, c, tk.W, c); else g.lineBetween(c, TOP, c, tk.H);
      }
      // Cracks in the floor where each row is rising.
      for (const s of [-1, 1]) {
        g.lineStyle(3, 0x1a140c, 0.4 + k * 0.4);
        const rc = c + s * o;
        if (horiz) g.lineBetween(0, rc + 6, tk.W, rc + 6); else g.lineBetween(rc, TOP, rc, tk.H);
      }
    },
    drawAir(g, time) {
      if (time > snapAt + SNAP_MS + 500) return;
      const k = clamp((time - riseAt) / Math.max(1, snapAt - riseAt), 0, 1);
      const o = rowAt(time);
      const fade = time > snapAt + SNAP_MS ? 1 - clamp((time - snapAt - SNAP_MS) / 500, 0, 1) : 1;
      const len = horiz ? tk.W : tk.H - TOP;
      for (const s of [-1, 1]) {
        for (let d = 20; d < len; d += 46) {
          const h = (12 + k * 26) * fade;
          const x = horiz ? d : c + s * o, y = horiz ? c + s * o : TOP + d;
          // Each fang points in toward the tongue, curved, white with a yellowed root.
          const tipX = horiz ? x + 6 : x - s * h, tipY = horiz ? y - s * h : y + 6;
          g.fillStyle(FANG_DARK, fade); g.fillTriangle(x - (horiz ? 9 : 0), y - (horiz ? 0 : 9), x + (horiz ? 9 : 0), y + (horiz ? 0 : 9), tipX + 1, tipY + 1);
          g.fillStyle(FANG, fade); g.fillTriangle(x - (horiz ? 8 : 0), y - (horiz ? 0 : 8), x + (horiz ? 7 : 0), y + (horiz ? 0 : 7), tipX, tipY);
          g.fillStyle(FANG_LIT, 0.7 * fade); g.fillTriangle(x - (horiz ? 6 : 0), y - (horiz ? 0 : 6), x - (horiz ? 2 : 0), y - (horiz ? 0 : 2), tipX, tipY);
          if (k > 0.8) { g.fillStyle(VENOM, fade); g.fillCircle(tipX, tipY, 1.6); }
        }
      }
    },
    onPhaseEnd() { dealt = true; snapAt = 0; riseAt = 0; },
  };
};

// ── Signature: Spitting Arc ──────────────────────────────────────────
// Hood flared, he rears and rakes his spit across the room in an arc: globs leave his mouth one
// after another along a sweeping line, each landing as a burning pool. The arc sweeps through you;
// run along it, against the sweep, or out of its distance.

interface Glob { tx: number; ty: number; launch: number; land: number }

const spitArc = (tk: BossToolkit): SignatureMove => {
  let globs: Glob[] = [];
  let mouth = { x: 0, y: 0 };
  return {
    durationMs: 2200,
    windupMs: 700,
    gesture: 'raise',
    hold: 'spray',
    locksBody: true,
    tell: 'SPITTING ARC',
    cast(time) {
      const p = tk.player;
      const a = tk.angleToPlayer();
      const r = clamp(dist(tk.bossX, tk.bossY, p.x, p.y), 160, 420);
      const dir = Math.random() < 0.5 ? 1 : -1;
      const n = tk.hard ? 9 : 7;
      mouth = { x: tk.bossX, y: tk.bossY - 30 };
      globs = [];
      for (let i = 0; i < n; i++) {
        const ang = a + dir * (-0.85 + (1.7 * i) / (n - 1));
        const rr = r + Math.sin(i * 1.7) * 30;
        const tx = tk.clampX(tk.bossX + Math.cos(ang) * rr, 50), ty = tk.clampY(tk.bossY + Math.sin(ang) * rr, 50);
        const warn = 650 + i * 120;
        tk.spawnZone({ x: tx, y: ty, radius: 46, warnMs: warn, damage: 12, poolMs: 3400, poolDamage: 4 });
        const land = time + tk.warn(warn);
        globs.push({ tx, ty, launch: land - 520, land });
      }
      tk.sfx('slime-splat');
    },
    drawAir(g, time) {
      for (const gl of globs) {
        if (time < gl.launch || time > gl.land) continue;
        const k = clamp((time - gl.launch) / (gl.land - gl.launch), 0, 1);
        const p = arcPoint(mouth.x, mouth.y, gl.tx, gl.ty, 120, k);
        const q = arcPoint(mouth.x, mouth.y, gl.tx, gl.ty, 120, Math.max(0, k - 0.07));
        g.lineStyle(5, VENOM_DARK, 0.6); g.lineBetween(q.x, q.y, p.x, p.y);
        g.fillStyle(VENOM, 1); g.fillCircle(p.x, p.y, 7);
        g.fillStyle(VENOM_LIT, 0.9); g.fillCircle(p.x - 2, p.y - 2, 2.4);
      }
    },
    onPhaseEnd() { globs = []; },
  };
};

// ── Signature: Venom Stream ──────────────────────────────────────────
// He opens his jaws and hoses a long jet of venom across the room in a slow sweep — a solid,
// dripping rope of green. Where the sweep ends, three pools are left steaming.

const venomStream = (tk: BossToolkit): SignatureMove => {
  let start = 0, end = 0, a0 = 0, a1 = 0, warnAt = 0;
  let ox = 0, oy = 0;
  let pooled = true;
  const LEN = 720;
  const curA = (time: number) => a0 + (a1 - a0) * clamp((time - start) / Math.max(1, end - start), 0, 1);
  return {
    durationMs: 2900,
    windupMs: 600,
    gesture: 'point',
    hold: 'spray',
    locksBody: true,
    tell: 'VENOM STREAM',
    cast(time) {
      const a = tk.angleToPlayer();
      const dir = Math.random() < 0.5 ? 1 : -1;
      a0 = a - dir * 1.1; a1 = a + dir * 1.1;
      ox = tk.bossX; oy = tk.bossY;
      warnAt = time;
      start = time + tk.warn(900);
      end = start + 1400;
      pooled = false;
      tk.spawnSweep({ ox, oy, a0, a1, warnMs: 900, travelMs: 1400, halfW: 22, damage: 13, length: LEN });
      tk.sfx('water-jet');
    },
    update(time) {
      if (pooled || time < end) return;
      pooled = true;
      for (const k of [0.3, 0.6, 0.9]) {
        const ang = a1 + (a0 - a1) * (k * 0.25);
        const d = 160 + k * 260;
        tk.spawnPool({ x: tk.clampX(ox + Math.cos(ang) * d, 50), y: tk.clampY(oy + Math.sin(ang) * d, 50), radius: 34, lifeMs: 3200, damage: 3 });
      }
    },
    drawAir(g, time) {
      if (time < warnAt || time > end + 150) return;
      if (time < start) {
        // The jaws opening: a glow at the mouth, droplets gathering.
        const k = clamp((time - warnAt) / Math.max(1, start - warnAt), 0, 1);
        glow(g, ox, oy - 26, 16 + k * 10, VENOM, 0.05 + k * 0.05, 3);
        for (let i = 0; i < 5; i++) { const ang = time / 120 + i * 1.26; g.fillStyle(VENOM_LIT, k); g.fillCircle(ox + Math.cos(ang) * 14 * (1 - k), oy - 26 + Math.sin(ang) * 10 * (1 - k), 1.6); }
        return;
      }
      // The rope of venom: a thick wobbling jet with droplets shedding off it.
      const a = curA(time);
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= 14; i++) {
        const d = (i / 14) * LEN;
        const wob = Math.sin(time / 50 + i) * 3 * (i / 14);
        pts.push({ x: ox + Math.cos(a) * d - Math.sin(a) * wob, y: oy - 26 * (1 - i / 14) + Math.sin(a) * d + Math.cos(a) * wob });
      }
      for (let i = 0; i < pts.length - 1; i++) {
        g.lineStyle(16 - i * 0.6, VENOM_DARK, 0.5); g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
        g.lineStyle(9 - i * 0.4, VENOM, 0.85); g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
        g.lineStyle(2.5, VENOM_LIT, 0.7); g.lineBetween(pts[i].x, pts[i].y - 2, pts[i + 1].x, pts[i + 1].y - 2);
      }
      for (let i = 0; i < 10; i++) {
        const ph = ((time / 300) + i / 10) % 1;
        const d = ((i * 71) % 100) / 100 * LEN;
        g.fillStyle(VENOM, 1 - ph); g.fillCircle(ox + Math.cos(a) * d, oy + Math.sin(a) * d + ph * 20, 2);
      }
    },
    onPhaseEnd() { pooled = true; end = 0; start = 0; warnAt = 0; },
  };
};

// ── Signature: Cold Blood (hard) ─────────────────────────────────────
// Three lunges, one after another. Each leaves his shed skin lying at the spot it started from,
// stretched along the bite; a beat later the skin lunges again down the same line.

interface Echo { x0: number; y0: number; x1: number; y1: number; bornAt: number; fireAt: number; dealt: boolean }

const coldLunge = (tk: BossToolkit): SignatureMove => {
  let echoes: Echo[] = [];
  const ECHO_MS = 1000;
  return {
    durationMs: 3300,
    windupMs: 450,
    gesture: 'punch',
    hold: 'reach',
    tell: 'COLD BLOOD',
    cast() {
      echoes = [];
      for (let i = 0; i < 3; i++) {
        tk.schedule(i * 950, () => {
          const p = tk.player;
          const a = tk.angleToPlayer();
          const reach = clamp(dist(tk.bossX, tk.bossY, p.x, p.y) + 90, 240, 520);
          const x0 = tk.bossX, y0 = tk.bossY;
          const x1 = tk.clampX(x0 + Math.cos(a) * reach, 90), y1 = tk.clampY(y0 + Math.sin(a) * reach, 90);
          tk.spawnCharge({ toX: x1, toY: y1, warnMs: 520, travelMs: 260, halfW: 30, damage: 15 });
          const now = tk.now;
          const arrive = now + tk.warn(520) + 260;
          echoes.push({ x0, y0, x1, y1, bornAt: arrive, fireAt: arrive + ECHO_MS, dealt: false });
          tk.sfx('whip');
        });
      }
    },
    update(time) {
      const p = tk.player;
      for (const e of echoes) {
        if (e.dealt || time < e.fireAt) continue;
        e.dealt = true;
        tk.sfx('slash');
        if (p.active && p.hp > 0 && segDist(p.x, p.y, e.x0, e.y0, e.x1, e.y1) < 34) tk.hitPlayer(13, p.x, p.y);
      }
      echoes = echoes.filter((e) => time < e.fireAt + 600);
    },
    drawGround(g, time) {
      for (const e of echoes) {
        if (time < e.bornAt) continue;
        const k = clamp((time - e.bornAt) / ECHO_MS, 0, 1);
        if (!e.dealt) {
          g.lineStyle(22, 0xbfe0ff, 0.05 + k * 0.12); g.lineBetween(e.x0, e.y0, e.x1, e.y1);
          g.lineStyle(2, 0xe8f6ff, 0.3 + k * 0.6); g.lineBetween(e.x0, e.y0, e.x0 + (e.x1 - e.x0) * k, e.y0 + (e.y1 - e.y0) * k);
        }
      }
    },
    drawAir(g, time) {
      for (const e of echoes) {
        if (time < e.bornAt) continue;
        if (!e.dealt) {
          // The skin, lying stretched where he started, swelling as it gathers to strike.
          shedHusk(g, e.x0, e.y0, 0xbfe0ff, 0.9, time, 0);
          continue;
        }
        // The skin's lunge: a pale ghost of him down the line, crumbling as it goes.
        const k = clamp((time - e.fireAt) / 300, 0, 1);
        const x = e.x0 + (e.x1 - e.x0) * k, y = e.y0 + (e.y1 - e.y0) * k;
        shedHusk(g, x, y, 0xbfe0ff, 1 - clamp((time - e.fireAt - 300) / 300, 0, 1), time, clamp((time - e.fireAt - 200) / 400, 0, 1));
      }
    },
    onPhaseEnd() { echoes = []; },
  };
};

// ── Signature: Basking (hard) ────────────────────────────────────────
// He goes utterly still, scales frosting, and his body hardly takes a blow. A ring shows how far
// his patience reaches: step inside it and he strikes before you see him move. Keep out of the
// ring and hit him from range — or wait; at the end he spits three cold darts and wakes.

const basking = (tk: BossToolkit): SignatureMove => {
  let from = 0, until = 0, struck = false;
  const R = 230;
  return {
    durationMs: 2800,
    windupMs: 300,
    gesture: 'flex',
    locksBody: true,
    tell: 'BASKING',
    cast(time) {
      from = time; until = time + 2600; struck = false;
      tk.sfx('status-freeze');
    },
    update(time) {
      if (time < from || time > until) return;
      const p = tk.player;
      if (!struck && p.active && p.hp > 0 && dist(p.x, p.y, tk.bossX, tk.bossY) < R) {
        struck = true;
        until = time;
        tk.spawnCharge({ toX: p.x, toY: p.y, warnMs: 220, travelMs: 180, halfW: 30, damage: 17 });
        tk.sfx('stab');
        return;
      }
      if (time >= until - 20 && !struck) {
        struck = true;
        const a = tk.angleToPlayer();
        for (const k of [-0.18, 0, 0.18]) tk.spawnBullet({ x: tk.bossX, y: tk.bossY - 20, angle: a + k, speed: 300, damage: 9, r: 5, color: 0xbfe0ff });
        tk.sfx('ice-shard');
      }
    },
    takenMult() { return tk.now >= from && tk.now < until ? 0.5 : 1; },
    drawGround(g, time) {
      if (time < from || time > until) return;
      const k = clamp((time - from) / 400, 0, 1);
      g.lineStyle(2, 0xbfe0ff, 0.35 * k + Math.sin(time / 160) * 0.08); g.strokeCircle(tk.bossX, tk.bossY, R);
      g.fillStyle(0xbfe0ff, 0.04 * k); g.fillCircle(tk.bossX, tk.bossY, R);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + time / 4000;
        g.fillStyle(0xe8f6ff, 0.4 * k); g.fillCircle(tk.bossX + Math.cos(a) * R, tk.bossY + Math.sin(a) * R, 2);
      }
    },
    drawAir(g, time) {
      if (time < from || time > until) return;
      // Frost on the scales: slow breath and a rime of white motes.
      for (let i = 0; i < 6; i++) {
        const ph = ((time / 1400) + i / 6) % 1;
        g.fillStyle(0xe8f6ff, 0.3 * (1 - ph)); g.fillCircle(tk.bossX + 8 + ph * 10, tk.bossY - 34 - ph * 26, 3 + ph * 6);
      }
    },
    onPhaseEnd() { until = 0; },
  };
};

// ── The prince ───────────────────────────────────────────────────────

export const VENIN_BOSS: WorldBossDef = {
  worldId: 'isle:venin',
  name: 'Prince Venin',
  title: 'the Milk-Fanged',
  color: VENIN,
  colorLit: VENIN_LIT,
  colorDark: VENIN_DARK,
  accent: VENIN_EYE,
  // Tier 1 of the seventh isle.
  damageMult: 1.15,

  intro: [
    'Mother milked me first. Before any of them. The first drop of the Draught you ever drank was mine.',
    'You owe me your life, then — every moon of it. Shall I take it back in one bite?',
  ],
  banter: [
    'Thirty jars a hand. I give sixty. Every new moon. Do you hear me complain?',
    'The grey ones were short. Short of skins, short of silk, short of loyalty. It is all the same shortness.',
    'Mother says I am her strongest. The Draught House says so too. They weigh it.',
    'Hold still. A clean bite heals. A ragged one goes grey.',
    'Every snake in the shed is milked. I was milked. Why should a man be different?',
  ],
  defeatLine: 'THE FANG IS DRAWN',
  resumeLine: 'You again. You have a strong arm for someone so short of Draught.',

  phases: [
    {
      name: 'Fangs',
      line: 'Watch the coil, not the head. Nobody watches the coil.',
      hp: 470,
      cycle: [
        'sig:lunge', 'volley', 'sig:jaws', 'hazard', 'sig:lunge',
        'radial', 'sig:jaws', 'sig:lunge', 'homing',
      ],
      harass: ['h-snipe', 'h-flak'],
      restMs: 1200,
      harassMs: 3400,
    },
    {
      name: 'Spitting Cobra',
      line: 'Enough. You want the venom? Have ALL of it. I make more than the whole shed.',
      hp: 550,
      cycle: [
        'sig:spit', 'sig:stream', 'barrage', 'sig:spit',
        'lanes', 'sig:stream', 'spiral', 'sig:spit', 'sig:lunge',
      ],
      harass: ['h-orbs', 'h-lane'],
      restMs: 1100,
      harassMs: 3000,
    },
  ],

  hard: {
    introLine: 'THE COLD-BLOODED WAIT',
    extraPhase: {
      name: 'Cold Blood',
      line: 'Mother taught me this one last. Be still. Be cold. Let them come to you.',
      hp: 400,
      cycle: [
        'sig:bask', 'sig:cold', 'sweep', 'sig:bask',
        'sig:cold', 'sig:spit', 'sig:bask', 'homing',
      ],
      harass: ['h-mines', 'h-snipe'],
      restMs: 1000,
      harassMs: 2800,
    },
  },

  tuning: {
    volley: { count: 5, speed: 230, spreadRad: 0.42 },
    radial: { count: 14, speed: 185 },
    hazard: { radius: 58 },
    spiral: { arms: 3, speed: 170 },
    barrage: { count: 6 },
  },

  signatures: {
    lunge,
    jaws,
    spit: spitArc,
    stream: venomStream,
    cold: coldLunge,
    bask: basking,
  },

  look: {
    crest: 'none', pattern: 'scales', aura: 'none', hands: 'claw',
    torsoR: 34, mouth: 'maw', eyes: 2, eyeColor: VENIN_EYE,
  },
  phaseStyles: [
    { movement: 'stalk', gimmick: 'none' },
    { movement: 'anchor', gimmick: 'none', tint: 'sick', look: { aura: 'bubbles', mouth: 'maw' } },
    { movement: 'blink', gimmick: 'none', tint: 'cold', look: { aura: 'frost', mouth: 'line', hands: 'blade' } },
  ],

  /**
   * The Milk-Fanged's tells. A long tail curls out from under him and lashes behind, banded black
   * and green; two white fangs hang below his jaw, a bead of venom on each; a forked tongue
   * flickers; a circlet of little milk-teeth sits on his brow. In the Spitting Cobra his hood
   * flares out either side of his head — great ribbed lobes with the spectacle mark — and the fangs
   * drip steadily. In Cold Blood his scales go pale and rimed, his tail lies still, and a shed skin
   * trails from his shoulders like a cloak.
   */
  drawDecor(g, s) {
    const R = s.radius;
    const hood = s.phaseIdx === 1;
    const cold = s.hard && s.phaseIdx >= 2;
    const body = cold ? lit(VENIN, 0.45) : VENIN;
    const band = cold ? 0xd8eef8 : VENIN_LIT;
    // The tail: an S curling out behind him, lashing (still, in Cold Blood).
    const away = s.facing + Math.PI;
    const lash = cold ? 0 : Math.sin(s.t / 260) * 0.6;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= 12; i++) {
      const k = i / 12;
      const a = away + Math.sin(k * Math.PI * 1.5 + s.t / 400) * 0.5 * k + lash * k;
      pts.push({ x: s.x + Math.cos(a) * R * (0.7 + k * 1.6), y: s.y + R * 0.6 + Math.sin(a) * R * (0.4 + k * 0.9) });
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const w = (1 - i / 12) * 14 + 3;
      g.lineStyle(w + 2, dim(body, 0.4), 1); g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
      g.lineStyle(w, i % 2 ? body : band, 1); g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    }
    if (cold) {
      // The shed skin trailing from his shoulders.
      for (const k of [-1, 1]) {
        g.fillStyle(SLOUGH, 0.35); g.fillTriangle(s.x + k * R * 0.6, s.y - R * 0.3, s.x + k * R * 1.4, s.y + R * 1.2, s.x + k * R * 0.3, s.y + R * 1.3);
        g.lineStyle(1, lit(SLOUGH, 0.3), 0.6); g.lineBetween(s.x + k * R * 0.6, s.y - R * 0.3, s.x + k * R * 1.4, s.y + R * 1.2);
      }
      for (let i = 0; i < 6; i++) { const a = s.t / 900 + i; g.fillStyle(0xe8f6ff, 0.5); g.fillCircle(s.x + Math.cos(a) * R * 1.2, s.y + Math.sin(a) * R * 0.9, 1.5); }
    }
    if (hood) {
      // The hood: ribbed lobes either side of the head, the spectacle mark on each.
      const flare = 1 + s.castGlow * 0.15;
      for (const k of [-1, 1]) {
        const hx = s.x + k * R * 1.05 * flare, hy = s.y - R * 0.35;
        g.fillStyle(dim(COBRA, 0.3), 1); g.fillEllipse(hx, hy + 2, R * 1.0, R * 1.6);
        g.fillStyle(VENIN, 1); g.fillEllipse(hx, hy, R * 0.92, R * 1.5);
        g.fillStyle(COBRA_HOOD, 0.85); g.fillEllipse(hx - k * R * 0.12, hy + R * 0.1, R * 0.5, R * 0.9);
        for (let i = -2; i <= 2; i++) { g.lineStyle(1.5, VENIN_DARK, 0.6); g.lineBetween(hx - k * R * 0.4, hy, hx + k * R * 0.1 + i * 3, hy + R * (i * 0.25)); }
        g.lineStyle(3, VENIN_DARK, 0.9); g.strokeCircle(hx - k * R * 0.1, hy - R * 0.1, R * 0.16);
      }
    }
    // The circlet of milk-teeth on his brow.
    for (let i = -3; i <= 3; i++) {
      const a = -Math.PI / 2 + i * 0.26;
      const bx = s.x + Math.cos(a) * R * 0.92, by = s.y + Math.sin(a) * R * 0.92;
      g.fillStyle(cold ? 0xe8f6ff : FANG_LIT, 1);
      g.fillTriangle(bx - 3, by, bx + 3, by, bx + Math.cos(a) * 9, by + Math.sin(a) * 9);
    }
    g.lineStyle(2, BRUISE, 1); g.beginPath(); g.arc(s.x, s.y, R * 0.92, -Math.PI / 2 - 0.85, -Math.PI / 2 + 0.85, false); g.strokePath();
    markSigil(g, s.x, s.y - R * 0.62, 2.6, BRUISE, 1);
    // Two fangs below the jaw, dripping; the tongue flicking.
    const fy = s.y + R * 0.42;
    for (const k of [-1, 1]) {
      const fx = s.x + k * R * 0.26;
      g.fillStyle(FANG_DARK, 1); g.fillTriangle(fx - 4, fy, fx + 4, fy, fx + k * 1, fy + 14 + s.castGlow * 4);
      g.fillStyle(FANG_LIT, 1); g.fillTriangle(fx - 3, fy, fx + 2, fy, fx + k * 1, fy + 13 + s.castGlow * 4);
      const ph = ((s.t / (hood ? 400 : 900)) + (k > 0 ? 0.5 : 0)) % 1;
      g.fillStyle(cold ? 0xbfe0ff : VENOM, 1); g.fillCircle(fx + k, fy + 15 + ph * (hood ? 18 : 8), 2);
    }
    if (!cold && (s.t / 700) % 1 < 0.18) {
      const tx = s.x + Math.cos(s.facing) * R * 0.4, ty = fy + 4;
      const ex = tx + Math.cos(s.facing) * 16, ey = ty + Math.sin(s.facing) * 8;
      g.lineStyle(1.5, 0xd83048, 1); g.lineBetween(tx, ty, ex, ey);
      g.lineBetween(ex, ey, ex + Math.cos(s.facing - 0.5) * 5, ey + Math.sin(s.facing - 0.5) * 5);
      g.lineBetween(ex, ey, ex + Math.cos(s.facing + 0.5) * 5, ey + Math.sin(s.facing + 0.5) * 5);
    }
    if (s.enraged) { g.lineStyle(1.5, VENOM_LIT, 0.35 + Math.sin(s.t / 120) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
  },

  /**
   * Inside the Milking Hall: dark plank floor on piles, slits of fen showing between the boards;
   * the round milking pit at the heart, rimmed in white fang-stone, with the venom trough running
   * round it; serpent racks and skins down both walls; and across the back, under the HUD, the
   * inside of the hood — the great painted spectacle over the Prince's own yoke.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x5e1f7a);
    // Planks, with fen showing in the gaps.
    g.fillStyle(FEN, 1); g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 30) {
      const c = rng() < 0.3 ? TIMBER_LIT : rng() < 0.5 ? dim(TIMBER, 0.15) : TIMBER;
      g.fillStyle(dim(c, 0.25), 1); g.fillRect(x, 100, 28, H - 100);
      g.fillStyle(c, 1); g.fillRect(x + 1, 100, 26, H - 100);
      for (let y = 120 + rng() * 80; y < H; y += 120 + rng() * 80) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + 1, y, 26, 2); g.fillStyle(0x2a2a2a, 1); g.fillCircle(x + 5, y + 6, 1); g.fillCircle(x + 22, y + 6, 1); }
      g.lineStyle(1, FEN_LIT, 0.2); g.lineBetween(x + 28.5, 100, x + 28.5, H);
    }
    // Racks down both walls, skins hung between them.
    for (const x0 of [0, W - 46]) {
      g.fillStyle(WICKER_DARK, 1); g.fillRect(x0, 100, 46, H - 100);
      for (let y = 104; y < H; y += 6) { g.fillStyle((y / 6) % 2 ? WICKER : WICKER_LIT, 0.8); g.fillRect(x0 + 2, y, 42, 3.5); }
      for (let y = 160; y < H - 30; y += 110) {
        const c = [ADDER, VIPER, COBRA][Math.floor(y / 110) % 3];
        const cx = x0 + 23;
        g.fillStyle(TIMBER_DARK, 1); g.fillRect(cx - 18, y - 4, 36, 6);
        g.fillStyle(c, 1); g.fillEllipse(cx, y + 8, 10, 12);
        g.fillStyle(VENIN_EYE, 1); g.fillCircle(cx - 2.5, y + 6, 1); g.fillCircle(cx + 2.5, y + 6, 1);
        g.lineStyle(1.5, VENOM, 0.7); g.lineBetween(cx, y + 14, cx, y + 40);
        hangingSkin(g, cx + (x0 ? -30 : 30), y + 30, 34, y);
      }
    }
    // The milking pit at the heart: fang-stone rim, the trough ring, the dark well.
    const cx = W / 2, cy = (H + 100) / 2 + 10;
    g.fillStyle(FANG_DARK, 1); g.fillEllipse(cx, cy + 4, 300, 180);
    g.fillStyle(FANG, 1); g.fillEllipse(cx, cy, 296, 172);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      g.lineStyle(1.5, FANG_DARK, 0.6); g.lineBetween(cx + Math.cos(a) * 128, cy + Math.sin(a) * 72, cx + Math.cos(a) * 148, cy + Math.sin(a) * 86);
    }
    g.fillStyle(VENOM_DARK, 1); g.fillEllipse(cx, cy, 250, 140);
    g.fillStyle(VENOM, 0.6); g.fillEllipse(cx, cy, 250, 140);
    g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(cx, cy, 214, 116);
    g.fillStyle(TIMBER, 1); g.fillEllipse(cx, cy, 206, 110);
    for (let i = -90; i < 100; i += 16) {
      const h = Math.sqrt(Math.max(0, 1 - (i / 103) ** 2)) * 55;
      g.lineStyle(1, TIMBER_DARK, 0.6); g.lineBetween(cx + i, cy - h, cx + i, cy + h);
    }
    markSigil(g, cx, cy, 20, BRUISE, 0.5);
    glow(g, cx, cy, 160, VENOM, 0.02, 3);
    // The back wall: the inside of the hood, painted, over the Prince's own yoke.
    g.fillStyle(THATCH_DARK, 1); g.fillRect(0, 0, W, 104);
    for (let i = 0; i < W / 9; i++) { g.lineStyle(1.5, i % 2 ? THATCH : THATCH_DARK, 0.8); g.lineBetween(i * 9, 0, i * 9 + 3, 104); }
    g.fillStyle(COBRA_HOOD, 0.85); g.fillEllipse(W / 2, 60, 300, 120);
    g.fillStyle(VENIN, 1); g.fillEllipse(W / 2, 66, 240, 100);
    g.lineStyle(10, COBRA_HOOD, 0.9); g.strokeCircle(W / 2 - 50, 52, 22); g.strokeCircle(W / 2 + 50, 52, 22);
    g.lineStyle(8, COBRA_HOOD, 0.9); g.beginPath(); g.arc(W / 2, 64, 50, 0.3, Math.PI - 0.3, false); g.strokePath();
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(W / 2 - 40, 80, 8, 24); g.fillRect(W / 2 + 32, 80, 8, 24);
    g.fillStyle(TIMBER_LIT, 1); g.fillRect(W / 2 - 46, 82, 92, 7);
    for (const k of [-1, 1]) {
      const bx = W / 2 + k * 260;
      g.fillStyle(0x2a2a26, 1); g.fillRect(bx - 3, 50, 6, 50);
      g.fillStyle(VENOM, 1); g.fillTriangle(bx - 9, 52, bx + 9, 52, bx, 22);
      g.fillStyle(VENOM_LIT, 1); g.fillTriangle(bx - 4, 52, bx + 4, 52, bx, 36);
      glow(g, bx, 40, 40, VENOM, 0.04, 3);
    }
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(0, 98, W, 8);
    for (let i = 0; i < 3; i++) web(g, 80 + i * 400, 24, 18, 0.35);
    // Old spills on the planks.
    for (let i = 0; i < 6; i++) venomSlick(g, 80 + rng() * (W - 160), 150 + rng() * (H - 200), 18 + rng() * 14, 0.4, 0, rng() * 6);
  },
};
