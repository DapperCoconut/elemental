import type { BossBodyState, SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import type { Pt, StrikeTarget } from '../../../../IslesTypes';
import type { G } from '../../../../art/IsleArt';
import { dim, lit, mixC, mulberry } from '../../../../art/IsleArt';
import {
  BONE, BRUISE, BRUISE_DEEP, COPPER, EYE, GOLD, NYXA, NYXA_DARK, NYXA_LIT, SKIN, SKIN_DARK, SKIN_DEEP, SKIN_LIT,
  VENOM, VENOM_DEEP, VENOM_LIT, cornerWeb, draughtStill, draughtVial, fangRock, markSigil, scaleField, wigglePath,
} from './art';

/**
 * Matriarch Nyxa Coilborne, half serpent, Mother of Fangmire — the Venom Isle's monarch and finale.
 *
 * She lies in the skull of her own cast skin, coiled round the still the Draught is brewed in. Every
 * soul on the isle carries her bite; she is the only cure for it, and she rations it. The fight is
 * her body, in four movements, and (on hard) the ring she makes of it:
 *
 *   I   The Draught   — her venom builds on you, a ring round your feet filling. She sets ration vials
 *                       on the floor and sends her tail for them: reach one first and it eases you;
 *                       if the tail gets there, she drinks it. She bites (two fang-marks at a time,
 *                       each a dose), and the still boils over in rings that part toward a vial.
 *   II  Constrictor   — she uncoils. Bands of her body slide round the room and close in, one gap
 *                       each to slip through; she throws loops round you and cinches them; she
 *                       slithers across the floor in a wave.
 *   III Hood          — she rises, hood spread. Her gaze sweeps the room: face it and you are held
 *                       (look away — the mouse — and it slides off you); the eye-spots on her hood
 *                       spin out spirals; she rears and strikes, and spits where she lands.
 *   IV  Moult         — she sheds. The empty skin stands where she left it and fights on, mirroring
 *                       the Hood: two gazes, two strikes, two hoods spinning. Strike the skin to tear it.
 *   V   Ouroboros (hard) — she swallows her own tail: the arena is the ring of her body, turning,
 *                       the venom rising in the middle and her head snapping inward as it comes round.
 *
 * Every signature is bespoke and none look like an earlier sovereign's.
 */

// ── Palette ──────────────────────────────────────────────────────────

const N_MAIN = NYXA;
const N_LIT = NYXA_LIT;
const N_DARK = NYXA_DARK;

const FT = 96;
const CX = 480;
const CY = (FT + 640) / 2;
const PLAYER_R = 20;
/** The still stands behind her post (the `anchor` phase holds W/2, H×0.34). */
const STILL = { x: 480, y: 168 };

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
const clampN = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const float = (tk: BossToolkit, x: number, y: number, text: string, color: string): void =>
  tk.host.showFloatingText(x, y, text, color);
const live = (tk: BossToolkit): boolean => tk.player.active && tk.player.hp > 0;

/** Where the player is looking (toward the mouse), or null where there is no pointer. */
const playerFacing = (tk: BossToolkit): number | null => {
  const ptr = tk.scene.input?.activePointer;
  if (!ptr) return null;
  return Math.atan2(ptr.worldY - tk.player.y, ptr.worldX - tk.player.x);
};

/** A tapering chain of scale-discs from `pts[0]` (thick) to the last point (thin) — her tail. */
function tailChain(g: G, pts: Pt[], r0: number, r1: number, main = N_MAIN, belly = GOLD, alpha = 1): void {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const r = r0 + (r1 - r0) * (i / Math.max(1, n - 1));
    g.fillStyle(dim(main, 0.5), alpha); g.fillCircle(p.x, p.y + 2, r);
    g.fillStyle(main, alpha); g.fillCircle(p.x, p.y, r);
    g.fillStyle(lit(main, 0.25), alpha * 0.8); g.fillCircle(p.x - r * 0.3, p.y - r * 0.35, r * 0.4);
    if (i % 2 === 0) { g.fillStyle(belly, alpha * 0.6); g.fillCircle(p.x, p.y + r * 0.5, r * 0.3); }
  }
}

/** A serpent's head seen from above at (x,y) facing `a`: eyes, nostrils and (optionally) gaping fangs. */
function serpentHead(g: G, x: number, y: number, a: number, r: number, gape: number, main = N_MAIN, alpha = 1): void {
  const c = Math.cos(a), s = Math.sin(a);
  g.fillStyle(dim(main, 0.4), alpha); g.fillEllipse(x + 1, y + 2, r * 2.4, r * 1.9);
  g.fillStyle(main, alpha); g.fillEllipse(x, y, r * 2.4, r * 1.8);
  g.fillStyle(lit(main, 0.2), alpha); g.fillEllipse(x - c * r * 0.2, y - s * r * 0.2 - r * 0.2, r * 1.2, r * 0.7);
  for (const side of [-1, 1]) {
    const ex = x + c * r * 0.45 - s * side * r * 0.55, ey = y + s * r * 0.45 + c * side * r * 0.55;
    g.fillStyle(EYE, alpha); g.fillCircle(ex, ey, r * 0.24);
    g.fillStyle(0x000000, alpha); g.fillEllipse(ex, ey, r * 0.08, r * 0.36);
  }
  if (gape > 0) {
    const mx = x + c * r * 1.1, my = y + s * r * 1.1;
    g.fillStyle(0x5a1020, alpha); g.fillEllipse(mx, my, r * (0.8 + gape), r * (0.5 + gape * 0.8));
    g.fillStyle(BONE, alpha);
    for (const side of [-1, 1]) {
      const fx = mx - s * side * r * 0.35, fy = my + c * side * r * 0.35;
      g.fillTriangle(fx - c * 3, fy - s * 3, fx + s * side * 3, fy - c * side * 3, fx + c * r * (0.5 + gape * 0.5), fy + s * r * (0.5 + gape * 0.5));
    }
  }
}

// ── Shared fight state (one per toolkit = one per fight) ─────────────

interface Vial { x: number; y: number; born: number; gone: boolean }
interface Husk { x: number; y: number; born: number; hits: number; target: StrikeTarget | null; tornAt: number }
interface NyxaState {
  /** Phase I: the venom ring round the player's feet, 0–1. */
  venom: number;
  venomOn: boolean;
  burnAt: number;
  vials: Vial[];
  /** Phase IV: the shed skin standing beside her. */
  husk: Husk | null;
}
const STATES = new WeakMap<BossToolkit, NyxaState>();
const stateOf = (tk: BossToolkit): NyxaState => {
  let s = STATES.get(tk);
  if (!s) { s = { venom: 0, venomOn: false, burnAt: -9999, vials: [], husk: null }; STATES.set(tk, s); }
  return s;
};
const addVenom = (tk: BossToolkit, amt: number): void => {
  const st = stateOf(tk);
  // Only while the Draught phase runs the ring; a bite in the Ouroboros is just a bite.
  if (st.venomOn) st.venom = Math.min(1, st.venom + amt);
};
const huskAlive = (tk: BossToolkit): Husk | null => {
  const h = stateOf(tk).husk;
  return h && h.target && h.tornAt < 0 ? h : null;
};

// ── I. The Ration ────────────────────────────────────────────────────
// She sets three vials of the Draught down on the floor and sends her tail for them. Reach one and
// it eases the venom in you; if the tail reaches it first she drinks it and heals. Strike the tail's
// tip and it recoils, stung, back to her. This move also owns the venom ring for the whole phase:
// it fills while the Draught phase runs, and when it is full the Mark burns.

const ration = (tk: BossToolkit): SignatureMove => {
  const VIAL_LIFE = 7500;
  const TAIL_SPEED = tk.hard ? 165 : 140;
  const FILL = tk.hard ? 0.075 : 0.06;
  const st = stateOf(tk);
  let tip: Pt = { x: CX, y: CY };
  let tailOut = false;
  let stungUntil = 0;
  let tipTarget: StrikeTarget | null = null;
  let lastSeen = 0;

  const retract = () => {
    tailOut = false;
    tipTarget?.remove();
    tipTarget = null;
  };
  return {
    durationMs: 3400,
    windupMs: 700,
    gesture: 'raise',
    tell: 'THE RATION',
    locksBody: true,
    cast(time) {
      st.venomOn = true;
      // Three vials, spread round the room, none on top of the player.
      const p = tk.player;
      const base = Math.random() * Math.PI * 2;
      for (let i = 0; i < 3; i++) {
        const a = base + (i / 3) * Math.PI * 2;
        const r = 210 + Math.random() * 130;
        const x = tk.clampX(tk.bossX + Math.cos(a) * r, 70);
        const y = clampN(tk.bossY + Math.sin(a) * r * 0.8 + 120, FT + 60, tk.H - 50);
        if (dist(x, y, p.x, p.y) < 90) continue;
        st.vials.push({ x, y, born: time, gone: false });
      }
      tip = { x: tk.bossX, y: tk.bossY + 20 };
      tailOut = true;
      stungUntil = 0;
      tipTarget?.remove();
      tipTarget = tk.spawnTarget({
        x: tip.x, y: tip.y, r: 18,
        onStruck: () => {
          if (!tailOut) return;
          tip = { x: tk.bossX, y: tk.bossY + 20 };
          tipTarget?.moveTo(tip.x, tip.y);
          stungUntil = tk.now + 1200;
          float(tk, tk.bossX, tk.bossY - 60, 'STUNG', '#d8ff8a');
          tk.sfx('hit-medium');
        },
      });
      tk.sfx('bubble');
    },
    update(time, dt) {
      const step = clampN(dt, 0, 0.05);
      const p = tk.player;
      lastSeen = time;
      // The venom ring.
      if (st.venomOn && live(tk)) {
        st.venom = Math.min(1, st.venom + FILL * step);
        if (st.venom >= 1) {
          st.venom = 0.25;
          st.burnAt = time;
          tk.hitPlayer(20, p.x, p.y);
          tk.slowPlayer(0.6, 1500);
          float(tk, p.x, p.y - 56, 'THE MARK BURNS', '#d8ff8a');
          tk.sfx('status-poison');
        }
      }
      // Vials: the player drinks on touch; the tail drinks if it gets there.
      for (const v of st.vials) {
        if (v.gone) continue;
        if (time - v.born > VIAL_LIFE) { v.gone = true; continue; }
        if (live(tk) && dist(p.x, p.y, v.x, v.y) < PLAYER_R + 14) {
          v.gone = true;
          st.venom = Math.max(0, st.venom - 0.55);
          float(tk, v.x, v.y - 40, 'DOSED', '#c8f07a');
          tk.sfx('heal');
        }
      }
      if (tailOut) {
        const open = st.vials.filter((v) => !v.gone);
        if (!open.length) { retract(); }
        else if (time >= stungUntil) {
          let best = open[0], bd = Infinity;
          for (const v of open) { const d = dist(tip.x, tip.y, v.x, v.y); if (d < bd) { bd = d; best = v; } }
          const a = Math.atan2(best.y - tip.y, best.x - tip.x);
          tip = { x: tip.x + Math.cos(a) * TAIL_SPEED * step, y: tip.y + Math.sin(a) * TAIL_SPEED * step };
          tipTarget?.moveTo(tip.x, tip.y);
          if (bd < 16) {
            best.gone = true;
            tk.healBoss(16, tk.bossX, tk.bossY);
            float(tk, best.x, best.y - 40, 'SHE DRINKS', '#a8c8a0');
            tk.sfx('slime-splat');
          }
        }
      }
      st.vials = st.vials.filter((v) => !v.gone || time - v.born < VIAL_LIFE + 400);
    },
    drawGround(g, time) {
      for (const v of st.vials) {
        if (v.gone) continue;
        const k = clampN((time - v.born) / VIAL_LIFE, 0, 1);
        g.fillStyle(VENOM, 0.08 + Math.sin(time / 140) * 0.04); g.fillCircle(v.x, v.y, 30);
        g.lineStyle(2, VENOM_LIT, 0.5); g.beginPath(); g.arc(v.x, v.y, 30, -Math.PI / 2, -Math.PI / 2 + (1 - k) * Math.PI * 2, false); g.strokePath();
        draughtVial(g, v.x, v.y + 8, 1.1, 1);
        markSigil(g, v.x, v.y + 20, 5, BRUISE, 0.7);
      }
      if (tailOut) {
        // Her tail, laid out across the floor from her coils to the tip.
        const pts = wigglePath(tk.bossX, tk.bossY + 26, tip.x, tip.y, 22, 16, time / 220, 2);
        tailChain(g, pts, 13, 4);
        if (time < stungUntil) { g.lineStyle(2, VENOM_LIT, 0.8); g.strokeCircle(tip.x, tip.y, 14 + Math.sin(time / 50) * 3); }
        // The rattle-less tip, flicking.
        g.fillStyle(GOLD, 1); g.fillCircle(tip.x + Math.sin(time / 70) * 3, tip.y, 3);
      }
    },
    drawAir(g, time) {
      if (!st.venomOn || !live(tk) || time - lastSeen > 200) return;
      // The venom ring round the player's feet: the Mark at its centre, filling green.
      const p = tk.player;
      const v = st.venom;
      g.lineStyle(5, BRUISE_DEEP, 0.6); g.strokeCircle(p.x, p.y + 6, 30);
      g.lineStyle(4, v > 0.8 ? VENOM_LIT : VENOM, 0.85);
      g.beginPath(); g.arc(p.x, p.y + 6, 30, -Math.PI / 2, -Math.PI / 2 + v * Math.PI * 2, false); g.strokePath();
      if (v > 0.8 && Math.floor(time / 110) % 2 === 0) markSigil(g, p.x, p.y - 44, 8, VENOM_LIT, 0.9);
      if (time - st.burnAt < 500) {
        const f = (time - st.burnAt) / 500;
        g.lineStyle(6, VENOM_LIT, 1 - f); g.strokeCircle(p.x, p.y, 24 + f * 40);
      }
    },
    onPhaseEnd() {
      retract();
      st.vials = [];
      st.venomOn = false;
      st.venom = 0;
    },
  };
};

// ── I. The Mark ──────────────────────────────────────────────────────
// She bites: two white fangs come down out of the dark, side by side, where you are standing —
// three bites, each following you. A bite that lands is a dose of venom into the ring as well as a
// wound. Step out from between the fangs.

const theMark = (tk: BossToolkit): SignatureMove => {
  const R = 24;
  const GAP = 36;
  interface Bite { x: number; y: number; a: number; born: number; at: number; done: boolean }
  let bites: Bite[] = [];
  const bite = (time: number) => {
    const p = tk.player;
    bites.push({ x: p.x, y: p.y, a: tk.angleToPlayer() + Math.PI / 2, born: time, at: time + tk.warn(800), done: false });
    tk.sfx('hush');
  };
  const points = (b: Bite): Pt[] => [
    { x: b.x + Math.cos(b.a) * GAP / 2, y: b.y + Math.sin(b.a) * GAP / 2 },
    { x: b.x - Math.cos(b.a) * GAP / 2, y: b.y - Math.sin(b.a) * GAP / 2 },
  ];
  return {
    durationMs: 2700,
    windupMs: 600,
    gesture: 'punch',
    tell: 'THE MARK',
    cast(time) {
      bite(time);
      tk.schedule(650, () => bite(tk.now));
      tk.schedule(1300, () => bite(tk.now));
    },
    update(time) {
      const p = tk.player;
      for (const b of bites) {
        if (b.done || time < b.at) continue;
        b.done = true;
        tk.sfx('stab');
        if (live(tk) && points(b).some((q) => dist(p.x, p.y, q.x, q.y) < R + PLAYER_R * 0.8)) {
          tk.hitPlayer(10, p.x, p.y);
          addVenom(tk, 0.3);
          float(tk, p.x, p.y - 48, 'BITTEN', '#d8ff8a');
        }
      }
      bites = bites.filter((b) => time < b.at + 700);
    },
    drawGround(g, time) {
      for (const b of bites) {
        const k = clampN((time - b.born) / Math.max(1, b.at - b.born), 0, 1);
        for (const q of points(b)) {
          if (!b.done) {
            g.fillStyle(BRUISE_DEEP, 0.2 + k * 0.3); g.fillCircle(q.x, q.y, R);
            g.lineStyle(2, BONE, 0.3 + k * 0.5); g.strokeCircle(q.x, q.y, R * (1.6 - k * 0.6));
          } else {
            // The two punctures it leaves, weeping.
            const f = clampN((time - b.at) / 700, 0, 1);
            g.fillStyle(0x3a0a14, 0.8 * (1 - f)); g.fillEllipse(q.x, q.y, 10, 16);
            g.fillStyle(VENOM, 0.7 * (1 - f)); g.fillCircle(q.x, q.y + 8 + f * 6, 3);
          }
        }
      }
    },
    drawAir(g, time) {
      for (const b of bites) {
        if (b.done && time > b.at + 160) continue;
        const k = clampN((time - b.born) / Math.max(1, b.at - b.born), 0, 1);
        // Two great curved fangs, descending out of the dark above.
        for (const q of points(b)) {
          const drop = b.done ? 0 : (1 - k * k) * 180;
          const tipX = q.x, tipY = q.y - drop;
          g.fillStyle(dim(BONE, 0.3), 0.4 + k * 0.6);
          g.fillTriangle(tipX - 13, tipY - 70, tipX + 9, tipY - 74, tipX + 1, tipY + 2);
          g.fillStyle(BONE, 0.4 + k * 0.6);
          g.fillTriangle(tipX - 11, tipY - 70, tipX + 5, tipY - 72, tipX, tipY);
          g.fillStyle(VENOM_LIT, 0.4 + k * 0.6); g.fillCircle(tipX, tipY + 2, 2.5);
        }
      }
    },
    onPhaseEnd() { bites = []; },
  };
};

// ── I. The Still Boils Over ──────────────────────────────────────────
// The still behind her rattles its lid, the gauge climbs, and it boils over: three rings of
// scalding Draught roll out across the floor. They all part the same way — toward the nearest vial
// still lying there, if there is one. Follow the gap to the dose.

const boilOver = (tk: BossToolkit): SignatureMove => {
  let castAt = -9999;
  let gapA = 0;
  return {
    durationMs: 3300,
    windupMs: 900,
    gesture: 'clap',
    tell: 'THE STILL BOILS OVER',
    cast(time) {
      castAt = time;
      const st = stateOf(tk);
      const open = st.vials.filter((v) => !v.gone);
      const p = tk.player;
      let target: Pt = { x: p.x + 80, y: p.y };
      if (open.length) {
        let bd = Infinity;
        for (const v of open) { const d = dist(v.x, v.y, p.x, p.y); if (d < bd) { bd = d; target = v; } }
      }
      gapA = Math.atan2(target.y - STILL.y, target.x - STILL.x);
      for (let i = 0; i < 3; i++) {
        tk.spawnRing({ cx: STILL.x, cy: STILL.y, delayMs: 900 + i * 650, speed: 310, gapCentre: gapA, gapHalf: 0.5, band: 18, damage: 12 });
      }
      tk.sfx('beam-charge');
      tk.schedule(900, () => tk.sfx('geyser'));
    },
    drawGround(g, time) {
      const since = time - castAt;
      if (since < 0 || since > 2400) return;
      // The way the rings will part, chalked in steam on the floor.
      g.lineStyle(10, VENOM_LIT, 0.12 * (1 - since / 2400));
      g.lineBetween(STILL.x, STILL.y, STILL.x + Math.cos(gapA) * 700, STILL.y + Math.sin(gapA) * 700);
      g.lineStyle(2, VENOM_LIT, 0.4 * (1 - since / 2400));
      g.lineBetween(STILL.x, STILL.y, STILL.x + Math.cos(gapA) * 700, STILL.y + Math.sin(gapA) * 700);
    },
    drawAir(g, time) {
      const since = time - castAt;
      if (since < 0 || since > 2600) return;
      // The still's gauge needle climbing, the lid rattling, steam jetting.
      const k = clampN(since / 900, 0, 1);
      const gx = STILL.x - 70, gy = STILL.y - 96;
      g.fillStyle(0x1a1410, 0.9); g.fillCircle(gx, gy, 16);
      g.lineStyle(2, COPPER, 1); g.strokeCircle(gx, gy, 16);
      g.lineStyle(1, BONE, 0.6); g.beginPath(); g.arc(gx, gy, 12, Math.PI * 0.75, Math.PI * 2.25, false); g.strokePath();
      const na = Math.PI * 0.75 + k * Math.PI * 1.45 + (k >= 1 ? Math.sin(time / 30) * 0.08 : 0);
      g.lineStyle(2, 0xff5a3a, 1); g.lineBetween(gx, gy, gx + Math.cos(na) * 12, gy + Math.sin(na) * 12);
      for (let i = 0; i < 8; i++) {
        const f = ((time / 500) + i / 8) % 1;
        g.fillStyle(0xd8f0c0, (0.4 + k * 0.3) * (1 - f));
        g.fillCircle(STILL.x + Math.sin(i * 2.3 + time / 200) * 14, STILL.y - 110 - f * 70, 6 + f * 18);
      }
    },
  };
};

// ── II. Coils ────────────────────────────────────────────────────────
// Two bands of her body, laid round the room, slide inward at once — scales grinding — each with
// one gap where her head does not quite meet her tail, and the gap creeps round. Slip through each
// before it closes on you.

const coils = (tk: BossToolkit): SignatureMove => {
  const SPEED = tk.hard ? 112 : 96;
  const HALF = 22;
  const GAP = 0.44;
  interface Band { r: number; gap: number; spin: number; startAt: number; lastHit: number }
  let bands: Band[] = [];
  return {
    durationMs: 4400,
    windupMs: 700,
    gesture: 'sweep',
    tell: 'CONSTRICTOR',
    cast(time) {
      const g0 = tk.angleToPlayer(CX, CY) + (Math.random() - 0.5) * 1.2;
      const spin = Math.random() < 0.5 ? 0.32 : -0.32;
      bands.push({ r: 560, gap: g0, spin, startAt: time + tk.warn(600), lastHit: -9999 });
      bands.push({ r: 560, gap: g0 + Math.PI * 0.75, spin: -spin, startAt: time + tk.warn(600) + 1700, lastHit: -9999 });
      tk.sfx('chain');
    },
    update(time, dt) {
      const step = clampN(dt, 0, 0.05);
      const p = tk.player;
      for (const b of bands) {
        if (time < b.startAt) continue;
        b.r -= SPEED * step;
        b.gap += b.spin * step;
        if (!live(tk) || time - b.lastHit < 650) continue;
        const d = dist(p.x, p.y, CX, CY);
        if (Math.abs(d - b.r) > HALF + PLAYER_R * 0.7) continue;
        const off = Math.abs(wrap(Math.atan2(p.y - CY, p.x - CX) - b.gap));
        if (off < GAP) continue;
        b.lastHit = time;
        tk.hitPlayer(14, p.x, p.y);
        tk.slowPlayer(0.7, 600);
        float(tk, p.x, p.y - 48, 'CRUSHED', '#8ae0a8');
        tk.sfx('hit-heavy');
      }
      bands = bands.filter((b) => b.r > 60);
    },
    drawGround(g, time) {
      for (const b of bands) {
        if (time < b.startAt) {
          // Before it moves: the line it will close along, and the gap marked in gold.
          const k = 1 - (b.startAt - time) / tk.warn(600);
          g.lineStyle(2, GOLD, 0.2 + k * 0.4);
          g.beginPath(); g.arc(CX, CY, 300, b.gap - GAP, b.gap + GAP, false); g.strokePath();
          g.lineBetween(CX, CY, CX + Math.cos(b.gap) * 560, CY + Math.sin(b.gap) * 560);
          continue;
        }
        // The band: her body, a chain of scaled coils round the ring, skipping the gap.
        const steps = Math.max(24, Math.floor((b.r * Math.PI * 2) / 15));
        for (let i = 0; i < steps; i++) {
          const a = (i / steps) * Math.PI * 2;
          if (Math.abs(wrap(a - b.gap)) < GAP) continue;
          const x = CX + Math.cos(a) * b.r, y = CY + Math.sin(a) * b.r;
          if (x < -30 || x > tk.W + 30 || y < FT - 30 || y > tk.H + 30) continue;
          g.fillStyle(N_DARK, 1); g.fillCircle(x, y + 2, HALF);
          g.fillStyle((i + Math.floor(time / 120)) % 3 === 0 ? lit(N_MAIN, 0.12) : N_MAIN, 1); g.fillCircle(x, y, HALF - 2);
          if (i % 2 === 0) { g.fillStyle(GOLD, 0.55); g.fillCircle(x + Math.cos(a) * (HALF - 6), y + Math.sin(a) * (HALF - 6), 3); }
        }
        // Head on one side of the gap, tail tip on the other.
        const ha = b.gap - GAP, ta = b.gap + GAP;
        serpentHead(g, CX + Math.cos(ha) * b.r, CY + Math.sin(ha) * b.r, ha + Math.PI / 2 * Math.sign(b.spin || 1), 14, 0.3);
        g.fillStyle(GOLD, 1); g.fillCircle(CX + Math.cos(ta) * b.r, CY + Math.sin(ta) * b.r, 5);
      }
    },
    onPhaseEnd() { bands = []; },
  };
};

// ── II. The Squeeze ──────────────────────────────────────────────────
// She throws a loop of herself round where you stand, and it draws you in while it cinches —
// three loops, one after another. Walk out of each before it closes.

const squeeze = (tk: BossToolkit): SignatureMove => {
  const R = 96;
  interface Loop { x: number; y: number; born: number; at: number; done: boolean }
  let loops: Loop[] = [];
  const thrown = (time: number) => {
    const p = tk.player;
    const warn = tk.warn(1100);
    loops.push({ x: p.x, y: p.y, born: time, at: time + warn, done: false });
    tk.pull(p.x, p.y, 55, warn);
    tk.sfx('whip');
  };
  return {
    durationMs: 3200,
    windupMs: 600,
    gesture: 'flex',
    tell: 'THE SQUEEZE',
    cast(time) {
      thrown(time);
      tk.schedule(800, () => thrown(tk.now));
      tk.schedule(1600, () => thrown(tk.now));
    },
    update(time) {
      const p = tk.player;
      for (const l of loops) {
        if (l.done || time < l.at) continue;
        l.done = true;
        tk.sfx('hit-heavy');
        if (live(tk) && dist(p.x, p.y, l.x, l.y) < R) {
          tk.hitPlayer(17, p.x, p.y);
          float(tk, p.x, p.y - 50, 'SQUEEZED', '#8ae0a8');
        }
      }
      loops = loops.filter((l) => time < l.at + 500);
    },
    drawGround(g, time) {
      for (const l of loops) {
        const k = clampN((time - l.born) / Math.max(1, l.at - l.born), 0, 1);
        const r = l.done ? R * Math.max(0.25, 1 - (time - l.at) / 160) : R + (1 - k) * 40;
        g.fillStyle(N_DARK, 0.12 + k * 0.18); g.fillCircle(l.x, l.y, R);
        // The loop: coils of her round the spot, the overlap where she grips herself.
        const steps = 30;
        for (let i = 0; i < steps; i++) {
          const a = (i / steps) * Math.PI * 2 + k * 1.4;
          const x = l.x + Math.cos(a) * r, y = l.y + Math.sin(a) * r;
          g.fillStyle(N_DARK, 1); g.fillCircle(x, y + 2, 11);
          g.fillStyle(i % 4 === 0 ? GOLD : N_MAIN, 1); g.fillCircle(x, y, i % 4 === 0 ? 6 : 10);
        }
        if (!l.done && k > 0.75 && Math.floor(time / 90) % 2 === 0) { g.lineStyle(3, VENOM_LIT, 0.8); g.strokeCircle(l.x, l.y, R); }
      }
    },
    onPhaseEnd() { loops = []; },
  };
};

// ── II. She Slithers ─────────────────────────────────────────────────
// Her whole length crosses the floor in a wave — the track shows first, a wavering line. Twice:
// once along your row, then back from the far side along another. Stand in a trough of the wave.

const slither = (tk: BossToolkit): SignatureMove => {
  const AMP = 74;
  const K = 0.012;
  const SPEED = 560;
  const LEN = 1000;
  const HALF = 22;
  interface Pass { y0: number; dir: 1 | -1; ph: number; born: number; go: number; hit: boolean }
  let passes: Pass[] = [];
  const yAt = (p: Pass, x: number): number => p.y0 + Math.sin(x * K + p.ph) * AMP;
  /** The head's x at `time` (it enters from off the edge). */
  const headX = (p: Pass, time: number): number => {
    const run = (time - p.go) / 1000 * SPEED;
    return p.dir > 0 ? -60 + run : tk.W + 60 - run;
  };
  const lay = (time: number, y0: number, dir: 1 | -1) => {
    passes.push({ y0: clampN(y0, FT + 90, tk.H - 90), dir, ph: Math.random() * Math.PI * 2, born: time, go: time + tk.warn(1100), hit: false });
  };
  return {
    durationMs: 3800,
    windupMs: 800,
    gesture: 'sweep',
    tell: 'SHE SLITHERS',
    cast(time) {
      const p = tk.player;
      const dir: 1 | -1 = p.x > tk.W / 2 ? -1 : 1;
      lay(time, p.y, dir);
      tk.schedule(1000, () => lay(tk.now, tk.player.y + (Math.random() < 0.5 ? -120 : 120), dir > 0 ? -1 : 1));
      tk.sfx('whoosh');
    },
    update(time) {
      const pl = tk.player;
      for (const p of passes) {
        if (p.hit || time < p.go || !live(tk)) continue;
        const hx = headX(p, time);
        const tailX = hx - p.dir * LEN;
        const covers = p.dir > 0 ? pl.x <= hx && pl.x >= tailX : pl.x >= hx && pl.x <= tailX;
        if (covers && Math.abs(pl.y - yAt(p, pl.x)) < HALF + PLAYER_R) {
          p.hit = true;
          tk.hitPlayer(15, pl.x, pl.y);
          float(tk, pl.x, pl.y - 48, 'RUN OVER', '#8ae0a8');
          tk.sfx('hit-medium');
        }
      }
      passes = passes.filter((p) => time < p.go + ((tk.W + LEN + 200) / SPEED) * 1000);
    },
    drawGround(g, time) {
      for (const p of passes) {
        if (time < p.go) {
          const k = 1 - (p.go - time) / tk.warn(1100);
          g.lineStyle(HALF * 2, N_DARK, 0.08 + k * 0.14);
          g.beginPath();
          for (let x = 0; x <= tk.W; x += 16) { if (x === 0) g.moveTo(x, yAt(p, x)); else g.lineTo(x, yAt(p, x)); }
          g.strokePath();
          g.lineStyle(2, GOLD, 0.3 + k * 0.5);
          for (let x = 0; x < tk.W; x += 28) g.lineBetween(x, yAt(p, x), x + 12, yAt(p, x + 12));
          continue;
        }
        const hx = headX(p, time);
        const pts: Pt[] = [];
        for (let i = 0; i <= 60; i++) {
          const x = hx - p.dir * (i / 60) * LEN;
          if (x < -40 || x > tk.W + 40) continue;
          pts.push({ x, y: yAt(p, x) });
        }
        if (pts.length > 1) tailChain(g, pts, HALF, HALF * 0.3);
        if (hx > -40 && hx < tk.W + 40) {
          const a = Math.atan2(yAt(p, hx + p.dir * 4) - yAt(p, hx), p.dir * 4);
          serpentHead(g, hx, yAt(p, hx), a, 16, 0.4);
        }
      }
    },
    onPhaseEnd() { passes = []; },
  };
};

// ── III/IV. The Gaze ─────────────────────────────────────────────────
// Her hood spreads and her eyes go round and round. A cone of the gaze sweeps the room from her;
// if it finds you *facing her* you are held — slowed to nothing, drawn in, and hurt while it holds.
// Look away (the mouse) and it slides off you. In the Moult, the empty skin's sockets do it too.

interface Sweep { ox: number; oy: number; a0: number; a1: number; born: number; start: number; end: number; tick: number }
const GAZE_HALF = 0.36;
const GAZE_LEN = 780;
const SWEEP_MS = 2600;

const gazeAngle = (s: Sweep, time: number): number => {
  if (time < s.start) return s.a0;
  const f = clampN((time - s.start) / (s.end - s.start), 0, 1);
  return s.a0 + (s.a1 - s.a0) * (0.5 - Math.cos(f * Math.PI) / 2);
};
const makeSweep = (tk: BossToolkit, ox: number, oy: number, time: number, dir: 1 | -1): Sweep => {
  const toP = Math.atan2(tk.player.y - oy, tk.player.x - ox);
  const start = time + tk.warn(800);
  return { ox, oy, a0: toP - dir * 1.1, a1: toP + dir * 1.1, born: time, start, end: start + SWEEP_MS, tick: 0 };
};
const updateSweeps = (tk: BossToolkit, sweeps: Sweep[], time: number): void => {
  const p = tk.player;
  if (!live(tk)) return;
  for (const s of sweeps) {
    if (time < s.start || time > s.end) continue;
    const a = gazeAngle(s, time);
    const toP = Math.atan2(p.y - s.oy, p.x - s.ox);
    if (dist(p.x, p.y, s.ox, s.oy) > GAZE_LEN || Math.abs(wrap(toP - a)) > GAZE_HALF) continue;
    // In the cone. Facing her? (Toward the origin, within ~65°.)
    const f = playerFacing(tk);
    const facing = f === null ? true : Math.abs(wrap(f - (toP + Math.PI))) < 1.15;
    if (!facing) continue;
    tk.slowPlayer(0.25, 260);
    tk.pull(s.ox, s.oy, 70, 240);
    if (time >= s.tick) {
      s.tick = time + 450;
      tk.hitPlayer(5, p.x, p.y);
      float(tk, p.x, p.y - 48, 'HELD', '#ffe060');
    }
  }
};
const drawSweeps = (g: G, sweeps: Sweep[], time: number): void => {
  for (const s of sweeps) {
    if (time > s.end) continue;
    const a = gazeAngle(s, time);
    const warm = time < s.start ? clampN((time - s.born) / Math.max(1, s.start - s.born), 0, 1) : 1;
    // The cone, banded in rings that crawl outward — the hypnotic bit.
    g.fillStyle(EYE, time < s.start ? 0.05 + warm * 0.06 : 0.14);
    g.slice(s.ox, s.oy, GAZE_LEN, a - GAZE_HALF, a + GAZE_HALF, false); g.fillPath();
    if (time >= s.start) {
      for (let i = 0; i < 9; i++) {
        const r = ((time / 4 + i * 90) % 800);
        g.lineStyle(3, i % 2 ? EYE : BRUISE, 0.35 * (1 - r / 800));
        g.beginPath(); g.arc(s.ox, s.oy, r, a - GAZE_HALF, a + GAZE_HALF, false); g.strokePath();
      }
    }
    g.lineStyle(2, EYE, 0.3 + warm * 0.4);
    g.lineBetween(s.ox, s.oy, s.ox + Math.cos(a - GAZE_HALF) * GAZE_LEN, s.oy + Math.sin(a - GAZE_HALF) * GAZE_LEN);
    g.lineBetween(s.ox, s.oy, s.ox + Math.cos(a + GAZE_HALF) * GAZE_LEN, s.oy + Math.sin(a + GAZE_HALF) * GAZE_LEN);
    // The eyes at the origin, spiralling.
    for (const side of [-1, 1]) {
      const ex = s.ox + side * 9, ey = s.oy - 4;
      g.fillStyle(EYE, 0.9); g.fillCircle(ex, ey, 6);
      g.lineStyle(1.5, 0x000000, 0.9);
      g.beginPath();
      for (let k = 0; k <= 16; k++) {
        const t = k / 16;
        const ang = t * Math.PI * 4 + time / 120 * side;
        const x = ex + Math.cos(ang) * t * 5, y = ey + Math.sin(ang) * t * 5;
        if (k === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.strokePath();
    }
  }
};

const theGaze = (tk: BossToolkit): SignatureMove => {
  let sweeps: Sweep[] = [];
  return {
    durationMs: 3800,
    windupMs: 900,
    gesture: 'raise',
    tell: 'LOOK AT ME',
    locksBody: true,
    cast(time) {
      sweeps.push(makeSweep(tk, tk.bossX, tk.bossY - 30, time, Math.random() < 0.5 ? 1 : -1));
      tk.sfx('hush');
    },
    update(time) { updateSweeps(tk, sweeps, time); sweeps = sweeps.filter((s) => time < s.end + 100); },
    drawAir(g, time) { drawSweeps(g, sweeps, time); },
    onPhaseEnd() { sweeps = []; },
  };
};

// ── III. The Eye-Spots ───────────────────────────────────────────────
// The two great eye-spots on the back of her hood open and spin: each pours a slow spiral of
// bruise-dark venom, one turning each way. In the Moult the skin's hood spins too.

const eyeSpots = (tk: BossToolkit): SignatureMove => {
  let firingUntil = 0;
  const pour = (ox: number, oy: number, spinDir: number, base: number) => {
    for (let i = 0; i < 14; i++) {
      tk.schedule(i * 100, () => {
        for (const k of [0, Math.PI]) {
          tk.spawnBullet({ x: ox, y: oy, angle: base + spinDir * i * 0.42 + k, speed: 165, damage: 9, r: 7, color: BRUISE, lifeMs: 5000 });
        }
      });
    }
  };
  return {
    durationMs: 2800,
    windupMs: 700,
    gesture: 'flex',
    tell: 'THE HOOD SPREADS',
    cast(time) {
      firingUntil = time + 1500;
      const base = Math.random() * Math.PI * 2;
      pour(tk.bossX - 40, tk.bossY - 26, 1, base);
      pour(tk.bossX + 40, tk.bossY - 26, -1, base + 0.2);
      const h = huskAlive(tk);
      if (h) { pour(h.x - 40, h.y - 26, -1, base + 0.6); pour(h.x + 40, h.y - 26, 1, base + 0.8); }
      tk.sfx('chaos');
    },
    drawAir(g, time) {
      if (time > firingUntil) return;
      const spots: Pt[] = [{ x: tk.bossX - 40, y: tk.bossY - 26 }, { x: tk.bossX + 40, y: tk.bossY - 26 }];
      const h = huskAlive(tk);
      if (h) spots.push({ x: h.x - 40, y: h.y - 26 }, { x: h.x + 40, y: h.y - 26 });
      spots.forEach((s, i) => {
        const spin = time / 90 * (i % 2 ? -1 : 1);
        g.fillStyle(BRUISE_DEEP, 0.8); g.fillCircle(s.x, s.y, 14);
        g.lineStyle(3, EYE, 0.9); g.strokeCircle(s.x, s.y, 12);
        for (let k = 0; k < 4; k++) {
          const a = spin + (k / 4) * Math.PI * 2;
          g.lineStyle(2, BRUISE, 0.9); g.lineBetween(s.x, s.y, s.x + Math.cos(a) * 12, s.y + Math.sin(a) * 12);
        }
        g.fillStyle(EYE, 1); g.fillCircle(s.x, s.y, 4);
      });
    },
  };
};

// ── III. The Strike ──────────────────────────────────────────────────
// She rears back, hood wide — the line she will strike along shows — and lunges the length of
// herself at you. Where she lands she spits: a pool of venom on the floor for a while.

const theStrike = (tk: BossToolkit): SignatureMove => {
  let rearUntil = 0;
  return {
    durationMs: 2700,
    windupMs: 900,
    gesture: 'recoil',
    tell: 'THE STRIKE',
    cast(time) {
      const p = tk.player;
      const a = tk.angleToPlayer();
      const toX = tk.clampX(p.x + Math.cos(a) * 60, 50), toY = tk.clampY(p.y + Math.sin(a) * 60, 50);
      const warn = tk.warn(900);
      rearUntil = time + warn;
      tk.spawnCharge({ toX, toY, warnMs: warn, travelMs: 260, halfW: 34, damage: 18 });
      tk.schedule(warn + 300, () => {
        const q = tk.player;
        tk.spawnZone({ x: q.x, y: q.y, radius: 70, warnMs: tk.warn(700), damage: 10, poolMs: 2600, poolDamage: 5 });
        tk.sfx('slime-splat');
      });
      tk.sfx('screech');
    },
    drawAir(g, time) {
      if (time > rearUntil) return;
      // Reared: the hood flared wide behind her head and the fangs out.
      const k = 1 - clampN((rearUntil - time) / 900, 0, 1);
      const x = tk.bossX, y = tk.bossY - 40 - k * 12;
      g.fillStyle(N_DARK, 0.85); g.fillEllipse(x, y, 90 + k * 30, 70 + k * 16);
      g.fillStyle(N_MAIN, 0.9); g.fillEllipse(x, y, 80 + k * 28, 60 + k * 14);
      g.fillStyle(GOLD, 0.8); g.fillCircle(x - 24, y - 4, 7); g.fillCircle(x + 24, y - 4, 7);
      g.fillStyle(BRUISE_DEEP, 1); g.fillCircle(x - 24, y - 4, 3); g.fillCircle(x + 24, y - 4, 3);
      serpentHead(g, x, y + 10, tk.angleToPlayer(x, y + 10), 13, 0.4 + k * 0.6);
    },
  };
};

// ── IV. The Moult ────────────────────────────────────────────────────
// She sheds: the whole cast skin peels off her and stands where she was, empty-eyed, and fights on
// beside her. If it is already standing, she sheds again and it lashes out at you from where it
// stood. Strike the skin five times and it tears.

const theMoult = (tk: BossToolkit): SignatureMove => {
  const st = stateOf(tk);
  const HITS = 5;
  let peelAt = -9999;
  const spawnHusk = (time: number) => {
    const h: Husk = { x: tk.bossX, y: tk.bossY, born: time, hits: 0, target: null, tornAt: -1 };
    h.target = tk.spawnTarget({
      x: h.x, y: h.y, r: 32,
      onStruck: () => {
        if (h.tornAt >= 0) return;
        h.hits++;
        float(tk, h.x, h.y - 60, h.hits >= HITS ? 'THE SKIN TEARS' : `${HITS - h.hits}`, '#e8e2c0');
        if (h.hits >= HITS) { h.tornAt = tk.now; h.target?.remove(); h.target = null; tk.sfx('ice-shatter'); }
      },
    });
    st.husk = h;
  };
  return {
    durationMs: 2300,
    windupMs: 900,
    gesture: 'flex',
    tell: 'SHE MOULTS',
    cast(time) {
      peelAt = time;
      const h = huskAlive(tk);
      if (!h) {
        st.husk?.target?.remove();
        spawnHusk(time);
        tk.sfx('whoosh');
        return;
      }
      // Already standing: it whips its empty length at you.
      const a = Math.atan2(tk.player.y - h.y, tk.player.x - h.x);
      tk.spawnSweep({ ox: h.x, oy: h.y, a0: a - 0.9, a1: a + 0.9, warnMs: tk.warn(800), travelMs: 520, halfW: 22, damage: 14, length: 420 });
      tk.sfx('whip');
    },
    drawGround(g, time) {
      const h = st.husk;
      if (!h) return;
      if (h.tornAt >= 0) {
        // Torn: the rags of it on the floor, fading.
        const f = clampN((time - h.tornAt) / 2500, 0, 1);
        if (f >= 1) return;
        for (let i = 0; i < 8; i++) {
          const a = i * 0.8;
          g.fillStyle(i % 2 ? SKIN : SKIN_DARK, 0.7 * (1 - f));
          g.fillEllipse(h.x + Math.cos(a) * (20 + f * 30), h.y + 10 + Math.sin(a) * (10 + f * 14), 24, 8);
        }
        return;
      }
      // The empty skin, standing: a pale translucent copy of her, sockets dark.
      const t = time / 1000;
      g.fillStyle(0x000000, 0.25); g.fillEllipse(h.x, h.y + 30, 90, 24);
      for (let i = 0; i < 10; i++) {
        const a = Math.PI * (0.1 + i * 0.09);
        g.fillStyle(i % 2 ? SKIN : SKIN_DARK, 0.6);
        g.fillCircle(h.x + Math.cos(a) * 44, h.y + 16 + Math.sin(a) * 18, 12);
      }
      g.fillStyle(SKIN, 0.45); g.fillEllipse(h.x, h.y, 70, 80);
      g.lineStyle(2, SKIN_LIT, 0.6); g.strokeEllipse(h.x, h.y, 70, 80);
      for (let row = 0; row < 5; row++) {
        g.lineStyle(1, SKIN_DARK, 0.5);
        for (let k = -2; k <= 2; k++) { g.beginPath(); g.arc(h.x + k * 12 + (row % 2) * 6, h.y - 24 + row * 12, 6, 0.2, Math.PI - 0.2, false); g.strokePath(); }
      }
      g.fillStyle(SKIN_LIT, 0.55); g.fillEllipse(h.x, h.y - 46, 40, 30);
      g.fillStyle(0x060404, 0.9); g.fillEllipse(h.x - 9, h.y - 48, 9, 6); g.fillEllipse(h.x + 9, h.y - 48, 9, 6);
      g.fillStyle(EYE, 0.25 + Math.sin(t * 3) * 0.15); g.fillCircle(h.x - 9, h.y - 48, 2); g.fillCircle(h.x + 9, h.y - 48, 2);
      // Hits it has taken: splits in the hide.
      for (let i = 0; i < h.hits; i++) { g.lineStyle(2, SKIN_DEEP, 0.9); g.lineBetween(h.x - 20 + i * 10, h.y - 20 + i * 7, h.x - 12 + i * 10, h.y - 2 + i * 7); }
    },
    drawAir(g, time) {
      const since = time - peelAt;
      if (since < 0 || since > 900) return;
      // Flakes of old skin peeling off her as she sheds.
      const f = since / 900;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const r = 40 + f * 70;
        g.fillStyle(i % 2 ? SKIN_LIT : SKIN, 1 - f);
        g.fillEllipse(tk.bossX + Math.cos(a) * r, tk.bossY + Math.sin(a) * r - f * 20, 10, 5);
      }
    },
    onPhaseEnd() { st.husk?.target?.remove(); st.husk = null; },
  };
};

// ── IV. Twin Gaze ────────────────────────────────────────────────────
// She and her skin both spread their hoods and both gazes sweep — in opposite directions, so they
// cross. Turn away from whichever one is on you.

const twinGaze = (tk: BossToolkit): SignatureMove => {
  let sweeps: Sweep[] = [];
  return {
    durationMs: 3900,
    windupMs: 900,
    gesture: 'raise',
    tell: 'LOOK AT US',
    locksBody: true,
    cast(time) {
      const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      sweeps.push(makeSweep(tk, tk.bossX, tk.bossY - 30, time, dir));
      const h = huskAlive(tk);
      if (h) sweeps.push(makeSweep(tk, h.x, h.y - 48, time + 300, dir > 0 ? -1 : 1));
      tk.sfx('hush');
    },
    update(time) { updateSweeps(tk, sweeps, time); sweeps = sweeps.filter((s) => time < s.end + 100); },
    drawAir(g, time) { drawSweeps(g, sweeps, time); },
    onPhaseEnd() { sweeps = []; },
  };
};

// ── IV. Twin Strike ──────────────────────────────────────────────────
// She lunges, and the empty skin lunges from where it stands — two lines converging on you, the
// skin's a beat after hers. Sidestep twice.

const twinStrike = (tk: BossToolkit): SignatureMove => {
  let neck: { x: number; y: number; tx: number; ty: number; at: number } | null = null;
  return {
    durationMs: 2900,
    windupMs: 800,
    gesture: 'recoil',
    tell: 'TWO STRIKES',
    cast(time) {
      const p = tk.player;
      const warn = tk.warn(850);
      tk.spawnCharge({ toX: tk.clampX(p.x, 50), toY: tk.clampY(p.y, 50), warnMs: warn, travelMs: 260, halfW: 32, damage: 16 });
      const h = huskAlive(tk);
      if (h) {
        tk.schedule(450, () => {
          const q = tk.player;
          const a = Math.atan2(q.y - h.y, q.x - h.x);
          tk.spawnLane({ x: h.x, y: h.y, angle: a, halfW: 28, warnMs: tk.warn(900), damage: 16 });
          neck = { x: h.x, y: h.y - 30, tx: h.x + Math.cos(a) * 560, ty: h.y + Math.sin(a) * 560, at: tk.now + tk.warn(900) };
        });
      }
      tk.sfx('screech');
    },
    drawAir(g, time) {
      if (!neck) return;
      const since = time - neck.at;
      if (since < 0 || since > 420) return;
      // The skin's empty neck shooting out along its lane, and snapping back.
      const f = since < 200 ? since / 200 : 1 - (since - 200) / 220;
      const ex = neck.x + (neck.tx - neck.x) * f, ey = neck.y + (neck.ty - neck.y) * f;
      const pts = wigglePath(ex, ey, neck.x, neck.y, 18, 6, time / 60, 2);
      tailChain(g, pts, 12, 16, SKIN, SKIN_LIT, 0.8);
      serpentHead(g, ex, ey, Math.atan2(neck.ty - neck.y, neck.tx - neck.x), 13, 0.8, SKIN, 0.85);
    },
    onPhaseEnd() { neck = null; },
  };
};

// ── V. Ouroboros (hard) ──────────────────────────────────────────────
// She takes her own tail in her mouth and the arena *is* her: a ring of her body round the room,
// turning. Outside the ring she crushes you; inside it the venom rises from the middle. And her
// head, coming round, snaps inward. Keep to the ring of floor between.

const RX = 410;
const RY = 236;
const ellR = (x: number, y: number): number => Math.hypot((x - CX) / RX, (y - CY) / RY);

const ouroboros = (tk: BossToolkit): SignatureMove => {
  const RUN = 6200;
  const POOL_MAX = 0.52;
  let at = -9999;
  let until = -9999;
  let headA = 0;
  let snapAt = 0;
  let tick = 0;
  const poolR = (time: number): number => {
    const f = clampN((time - at) / (RUN * 0.7), 0, 1);
    const fade = time > until - 800 ? clampN((until - time) / 800, 0, 1) : 1;
    return POOL_MAX * f * fade;
  };
  return {
    durationMs: 6400,
    windupMs: 900,
    gesture: 'raise',
    tell: 'OUROBOROS',
    cast(time) {
      at = time;
      until = time + RUN;
      headA = Math.random() * Math.PI * 2;
      snapAt = time + 1600;
      tick = 0;
      tk.sfx('boss-phase');
    },
    update(time, dt) {
      if (time > until) return;
      const step = clampN(dt, 0, 0.05);
      headA += 0.85 * step;
      const p = tk.player;
      if (time >= snapAt) {
        snapAt = time + 1150;
        const hx = CX + Math.cos(headA + 0.6) * RX, hy = CY + Math.sin(headA + 0.6) * RY;
        tk.spawnLane({ x: hx, y: hy, angle: Math.atan2(CY - hy, CX - hx), halfW: 26, warnMs: tk.warn(750), damage: 14 });
        tk.sfx('stab');
      }
      // A beat's grace while the ring closes round the room.
      if (!live(tk) || time < tick || time - at < 900) return;
      const e = ellR(p.x, p.y);
      if (e > 0.96) {
        tick = time + 500;
        tk.hitPlayer(8, p.x, p.y);
        tk.pull(CX, CY, 120, 500);
        float(tk, p.x, p.y - 48, 'COILED', '#8ae0a8');
      } else if (e < poolR(time)) {
        tick = time + 500;
        tk.hitPlayer(6, p.x, p.y);
        float(tk, p.x, p.y - 48, 'VENOM', '#d8ff8a');
      }
    },
    drawGround(g, time) {
      if (time > until + 300) return;
      const fadeIn = clampN((time - at) / 500, 0, 1);
      // Outside the ring: her coils packed against the walls.
      g.lineStyle(300, N_DARK, 0.4 * fadeIn);
      g.strokeEllipse(CX, CY, RX * 2 + 300, RY * 2 + 300);
      // The rising venom in the middle.
      const pr = poolR(time);
      if (pr > 0.01) {
        g.fillStyle(VENOM_DEEP, 0.75); g.fillEllipse(CX, CY, RX * 2 * pr, RY * 2 * pr);
        g.fillStyle(VENOM, 0.45); g.fillEllipse(CX, CY, RX * 2 * pr * 0.85, RY * 2 * pr * 0.85);
        for (let i = 0; i < 10; i++) {
          const a = i * 0.63 + time / 900;
          const f = ((time / 700) + i / 10) % 1;
          g.fillStyle(VENOM_LIT, 0.6 * (1 - f));
          g.fillCircle(CX + Math.cos(a) * RX * pr * 0.6, CY + Math.sin(a) * RY * pr * 0.6, 3 + f * 6);
        }
      }
      // Clear floor inside the ring: lighten it so the safe band reads.
      g.lineStyle(3, GOLD, 0.25 * fadeIn); g.strokeEllipse(CX, CY, RX * 2 * 0.96, RY * 2 * 0.96);
    },
    drawAir(g, time) {
      if (time > until + 300) return;
      const a0 = clampN((time - at) / 500, 0, 1) * (time > until ? clampN(1 - (time - until) / 300, 0, 1) : 1);
      // Her body all the way round, the scales turning with her.
      const steps = 96;
      for (let i = 0; i < steps; i++) {
        const a = headA + 0.6 + (i / steps) * Math.PI * 2;
        const x = CX + Math.cos(a) * RX * 1.03, y = CY + Math.sin(a) * RY * 1.03;
        const r = 26 - (i / steps) * 10;
        g.fillStyle(N_DARK, a0); g.fillCircle(x, y + 3, r);
        g.fillStyle((i + Math.floor(time / 90)) % 4 === 0 ? lit(N_MAIN, 0.15) : N_MAIN, a0); g.fillCircle(x, y, r - 2);
        if (i % 3 === 0) { g.fillStyle(GOLD, a0 * 0.6); g.fillCircle(x, y - r * 0.4, 3); }
      }
      // Head biting tail.
      const ha = headA + 0.6;
      const hx = CX + Math.cos(ha) * RX * 1.03, hy = CY + Math.sin(ha) * RY * 1.03;
      serpentHead(g, hx, hy, ha - Math.PI / 2, 22, 0.6, N_MAIN, a0);
    },
    onPhaseEnd() { until = -9999; },
  };
};

// ── V. Tail-Bite ─────────────────────────────────────────────────────
// She bites down on her tail and the ring she makes jerks tight: three rings of her rush inward from
// the walls, all parting the same way. Meet the gap.

const tailBite = (tk: BossToolkit): SignatureMove => {
  let gap = 0;
  let castAt = -9999;
  return {
    durationMs: 3100,
    windupMs: 700,
    gesture: 'clap',
    tell: 'SHE BITES HER TAIL',
    cast(time) {
      castAt = time;
      gap = Math.atan2(tk.player.y - CY, tk.player.x - CX) + (Math.random() - 0.5) * 0.6;
      for (let i = 0; i < 3; i++) {
        tk.spawnRing({ cx: CX, cy: CY, delayMs: 700 + i * 600, speed: -270, gapCentre: gap, gapHalf: 0.55, band: 18, damage: 13, startRadius: 540 });
      }
      tk.sfx('chain');
    },
    drawGround(g, time) {
      const since = time - castAt;
      if (since < 0 || since > 2600) return;
      g.lineStyle(14, GOLD, 0.12 * (1 - since / 2600));
      g.lineBetween(CX, CY, CX + Math.cos(gap) * 560, CY + Math.sin(gap) * 560);
      g.lineStyle(2, GOLD, 0.5 * (1 - since / 2600));
      g.lineBetween(CX, CY, CX + Math.cos(gap) * 560, CY + Math.sin(gap) * 560);
    },
  };
};

// ── Her body ─────────────────────────────────────────────────────────

/**
 * The Matriarch on the rig: below the waist a great serpent's tail coiled round under her, gold-edged
 * emerald; a diadem of milk-white fangs; a Draught vial on a cord at her breast. In the Hood a cobra's
 * hood flares behind her with two eye-spots; in the Moult her edges peel; and in the Ouroboros her
 * tail rises all the way round her and into her own mouth.
 */
function drawNyxa(g: G, s: BossBodyState): void {
  const r = s.radius;
  const t = s.t;
  const ph = s.phaseIdx;
  // The hood, behind/beside the head (phases III–V).
  if (ph >= 2) {
    const flare = ph === 2 ? 1 : 0.8;
    for (const side of [-1, 1]) {
      const hx = s.x + side * r * 1.05, hy = s.y - r * 0.5;
      g.fillStyle(N_DARK, 0.95); g.fillEllipse(hx, hy, r * 0.9 * flare, r * 1.5);
      g.fillStyle(s.palette.main, 0.95); g.fillEllipse(hx + side * 2, hy, r * 0.75 * flare, r * 1.35);
      g.fillStyle(GOLD, 0.9); g.fillCircle(hx, hy - r * 0.15, r * 0.18);
      g.fillStyle(BRUISE_DEEP, 1); g.fillCircle(hx, hy - r * 0.15, r * 0.08);
      g.lineStyle(1.5, s.palette.lit, 0.5);
      for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(hx, hy + r * 0.2 + k * r * 0.18, r * 0.25, 0.3, Math.PI - 0.3, false); g.strokePath(); }
    }
  }
  // The tail: coils under and round her lower half, sliding slowly.
  const pts: Pt[] = [];
  const turns = ph === 4 ? 1.0 : 0.75;
  for (let i = 0; i < 26; i++) {
    const f = i / 25;
    const a = Math.PI * 0.15 + f * Math.PI * 2 * turns + Math.sin(t / 900) * 0.1;
    const rr = r * (1.25 - f * 0.25);
    pts.push({ x: s.x + Math.cos(a) * rr, y: s.y + r * 0.35 + Math.sin(a) * rr * 0.55 });
  }
  if (ph !== 4) {
    // Only the part of the coil in front (lower half) is drawn over the rig.
    tailChain(g, pts.filter((p) => p.y > s.y + r * 0.2), r * 0.42, r * 0.16, s.palette.main, GOLD, 1);
  } else {
    // Ouroboros: the tail goes all the way round and into her mouth.
    const ring: Pt[] = [];
    for (let i = 0; i < 40; i++) {
      const a = Math.PI * 0.5 + (i / 39) * Math.PI * 1.9;
      ring.push({ x: s.x + Math.cos(a) * r * 1.3, y: s.y + Math.sin(a) * r * 1.3 });
    }
    tailChain(g, ring, r * 0.36, r * 0.12, s.palette.main, GOLD, 1);
  }
  // Diadem of fangs.
  for (let k = -3; k <= 3; k++) {
    const a = -Math.PI / 2 + k * 0.24;
    const bx = s.x + Math.cos(a) * r * 0.92, by = s.y + Math.sin(a) * r * 0.92;
    const h = r * (k === 0 ? 0.55 : 0.38 - Math.abs(k) * 0.04);
    g.fillStyle(BONE, 1);
    g.fillTriangle(bx - 3.5, by, bx + 3.5, by, bx + Math.cos(a) * h, by + Math.sin(a) * h);
    g.fillStyle(VENOM_LIT, 0.9); g.fillCircle(bx + Math.cos(a) * h, by + Math.sin(a) * h, 1.6);
  }
  g.fillStyle(GOLD, 1); g.fillRect(s.x - r * 0.55, s.y - r * 0.92, r * 1.1, 3);
  // A vial of the Draught on a cord at her breast.
  g.lineStyle(1.5, GOLD, 0.9);
  g.lineBetween(s.x - r * 0.4, s.y - r * 0.55, s.x, s.y + r * 0.05); g.lineBetween(s.x + r * 0.4, s.y - r * 0.55, s.x, s.y + r * 0.05);
  draughtVial(g, s.x, s.y + r * 0.42, 0.75, 0.5 + 0.5 * s.hpRatio);
  // Fang-tips at the corners of her mouth.
  g.fillStyle(BONE, 1);
  g.fillTriangle(s.x - r * 0.22, s.y - r * 0.08, s.x - r * 0.14, s.y - r * 0.08, s.x - r * 0.18, s.y + r * 0.14);
  g.fillTriangle(s.x + r * 0.14, s.y - r * 0.08, s.x + r * 0.22, s.y - r * 0.08, s.x + r * 0.18, s.y + r * 0.14);
  // The Moult: her edges flake and peel.
  if (ph === 3) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + t / 2400;
      const f = ((t / 1600) + i / 10) % 1;
      g.fillStyle(SKIN_LIT, 0.8 * (1 - f));
      g.fillEllipse(s.x + Math.cos(a) * (r + f * 22), s.y + Math.sin(a) * (r + f * 22) - f * 10, 9, 4);
    }
  }
  // Venom dripping from the chin, always.
  const dph = (t / 700) % 1;
  g.fillStyle(VENOM_LIT, 1 - dph); g.fillCircle(s.x - r * 0.18, s.y + r * 0.2 + dph * r * 0.5, 2);
}

/**
 * The nest in the skull: the floor is the inside of the cast skull — the palate's ridged roof seen
 * from below laid out as the floor's head end, the great eye-sockets of the cast letting green
 * marsh-light through on either side, a fringe of upper fangs hanging over the head of the room,
 * the copper still behind her post, and a nest of shed skins coiled round it all.
 */
function drawNest(g: G, W: number, H: number): void {
  const rng = mulberry(0x5e1a7);
  // The palate ridges, arching across the head end.
  for (let k = 0; k < 6; k++) {
    g.lineStyle(10, SKIN_DARK, 0.5);
    g.beginPath(); g.arc(W / 2, FT - 40 + k * 26, 380 - k * 20, Math.PI * 0.15, Math.PI * 0.85, false); g.strokePath();
    g.lineStyle(3, SKIN_LIT, 0.25);
    g.beginPath(); g.arc(W / 2, FT - 42 + k * 26, 380 - k * 20, Math.PI * 0.2, Math.PI * 0.8, false); g.strokePath();
  }
  // Eye-sockets: two great lenses of thin skin, green light pouring in.
  for (const side of [-1, 1]) {
    const ex = W / 2 + side * 360, ey = FT + 70;
    g.fillStyle(0x0a1206, 0.8); g.fillEllipse(ex, ey, 170, 110);
    g.fillStyle(0x4a7a2a, 0.35); g.fillEllipse(ex, ey, 150, 94);
    g.fillStyle(0xa8d870, 0.18); g.fillEllipse(ex - side * 10, ey - 6, 90, 50);
    g.lineStyle(4, SKIN_LIT, 0.6); g.strokeEllipse(ex, ey, 160, 102);
    // The light falling across the floor from it.
    g.fillStyle(0xa8d870, 0.05);
    g.fillTriangle(ex - 60, ey + 30, ex + 60, ey + 30, ex - side * 160, H);
    g.fillTriangle(ex - 40, ey + 30, ex + 40, ey + 30, ex - side * 120, H);
    cornerWeb(g, ex + side * 80, FT, 70, side < 0 ? Math.PI / 2 : 0, 0.35);
  }
  // The fringe of upper fangs hanging from the head of the room.
  for (let x = 40; x < W; x += 52 + rng() * 22) {
    const h = 26 + rng() * 26;
    g.fillStyle(dim(BONE, 0.3), 1); g.fillTriangle(x - 9, FT, x + 9, FT, x + 2, FT + h + 2);
    g.fillStyle(BONE, 1); g.fillTriangle(x - 8, FT, x + 6, FT, x, FT + h);
    g.fillStyle(VENOM_LIT, 0.8); g.fillCircle(x, FT + h + 3, 1.6);
  }
  // A nest of shed skins in a ring round the room.
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2;
    const x = CX + Math.cos(a) * (RX + 40 + rng() * 20), y = CY + Math.sin(a) * (RY + 26 + rng() * 14);
    if (y < FT + 20) continue;
    g.fillStyle(rng() < 0.5 ? SKIN : SKIN_DARK, 0.55);
    g.fillEllipse(x, y, 40 + rng() * 30, 10 + rng() * 6);
    g.lineStyle(1, SKIN_LIT, 0.35); g.strokeEllipse(x, y, 30, 7);
  }
  // Two white fangs of the isle under the skin, at the far corners.
  fangRock(g, 70, H - 40, 60, 0.25); fangRock(g, W - 70, H - 40, 60, -0.25);
  // The Mark, scratched at the heart of the nest.
  markSigil(g, CX, CY + 40, 54, mixC(BRUISE, N_DARK, 0.4), 0.55);
  // A patch of the belly worn through to raw scale at the foot of the room.
  scaleField(g, CX - 60, H - 40, 120, 40, SKIN_DARK, rng, 18);
  // The still, behind her post.
  draughtStill(g, STILL.x - 40, STILL.y + 30, 0.75, 0);
}

// ── The def ──────────────────────────────────────────────────────────

export const NYXA_BOSS: WorldBossDef = {
  worldId: 'isle:nyxa',
  name: 'Matriarch Nyxa',
  title: 'Coilborne, Mother of Fangmire',
  color: N_MAIN,
  colorLit: N_LIT,
  colorDark: N_DARK,
  accent: VENOM,
  damageMult: 1.5,

  intro: [
    'Come in, child. Show me your wrist. ...Yes. There they are. I gave you those.',
    'Six of my brood in the ground and my wardens on their backs, and you walk into my skull to — what?',
    'Kill me, and in a month the whole isle goes grey. Who else knows the Draught? Come. Let me ration you.',
  ],
  banter: [
    'A mother feeds her young. I feed mine one spoonful at a time. That is all love is: a ration.',
    'They call it tyranny. They call it that between doses.',
    'I bit every one of them, and every one of them came back to me for more.',
    'The Grave Court is full of people who thought they did not need me.',
    'Mortis buried them. Fetter chained them. Whisper named them. I only ever kept them alive.',
    'Drink, then. Go on. It is the last dose you will have from me.',
    'I have shed eleven skins on this isle. You are walking about inside one.',
    'Hold still, little one. It only stings the first time.',
  ],
  defeatLine: 'THE DRAUGHT HOUSES OPEN',
  resumeLine: 'Back, and still Marked. They always come back to me. Sit. Open your mouth.',

  phases: [
    {
      name: 'The Draught',
      line: 'Here is your ration. Be quick — I am thirsty too.',
      hp: 620,
      cycle: ['sig:ration', 'volley', 'sig:mark', 'sig:boilover', 'radial', 'sig:ration', 'sig:mark', 'barrage', 'sig:boilover', 'homing'],
      harass: ['h-snipe', 'h-orbs'],
      restMs: 1100,
      harassMs: 3200,
    },
    {
      name: 'Constrictor',
      line: 'Then I shall hold you instead. A mother holds. Closer. Closer.',
      hp: 680,
      cycle: ['sig:coils', 'sig:squeeze', 'lanes', 'sig:slither', 'sig:coils', 'spiral', 'sig:squeeze', 'sig:slither', 'slamchain'],
      harass: ['h-flak', 'h-lane'],
      restMs: 1000,
      harassMs: 3000,
    },
    {
      name: 'Hood',
      line: 'Look at me. LOOK at me. No one on this isle has ever looked away.',
      hp: 730,
      cycle: ['sig:gaze', 'sig:eyespots', 'sig:strike', 'volley', 'sig:gaze', 'sig:strike', 'sig:eyespots', 'sweep', 'hazard'],
      harass: ['h-rune', 'h-snipe'],
      restMs: 950,
      harassMs: 2800,
    },
    {
      name: 'Moult',
      line: 'Enough of this skin. It has your marks all over it. I shall leave it to finish you.',
      hp: 780,
      cycle: ['sig:moult', 'sig:twingaze', 'sig:twinstrike', 'radial', 'sig:moult', 'sig:twinstrike', 'sig:eyespots', 'sig:twingaze', 'barrage'],
      harass: ['h-orbs', 'h-mines'],
      restMs: 900,
      harassMs: 2600,
    },
  ],

  hard: {
    introLine: 'THE SERPENT THAT EATS ITSELF',
    extraPhase: {
      name: 'Ouroboros',
      line: 'Then I end where I began. Mouth to tail. The whole isle inside me. Drink.',
      hp: 620,
      cycle: ['sig:ouroboros', 'sig:tailbite', 'sig:mark', 'spiral', 'sig:ouroboros', 'sig:tailbite', 'homing', 'sig:squeeze'],
      harass: ['h-lane', 'h-flak'],
      restMs: 880,
      harassMs: 2500,
    },
  },

  tuning: {
    volley: { count: 7, spreadRad: 0.14 },
    radial: { count: 20 },
    lanes: { halfW: 30 },
  },

  signatures: {
    ration,
    mark: theMark,
    boilover: boilOver,
    coils,
    squeeze,
    slither,
    gaze: theGaze,
    eyespots: eyeSpots,
    strike: theStrike,
    moult: theMoult,
    twingaze: twinGaze,
    twinstrike: twinStrike,
    ouroboros,
    tailbite: tailBite,
  },

  look: { crest: 'none', pattern: 'scales', aura: 'smoke', hands: 'claw', torsoR: 42, mouth: 'line', eyes: 2, eyeColor: EYE },
  phaseStyles: [
    { movement: 'anchor', gimmick: 'none' },
    { movement: 'orbit', gimmick: 'none', look: { aura: 'bubbles', hands: 'ball' } },
    { movement: 'hover', gimmick: 'none', tint: 'void', look: { pattern: 'rings', aura: 'smoke', mouth: 'maw' } },
    { movement: 'stalk', gimmick: 'none', tint: 'pale', look: { pattern: 'drip', aura: 'dust', mouth: 'grin' } },
    { movement: 'hover', gimmick: 'none', tint: 'sick', look: { pattern: 'scales', aura: 'bubbles', eyes: 3, hands: 'wisp' } },
  ],

  drawDecor: drawNyxa,
  drawArena: drawNest,
};
