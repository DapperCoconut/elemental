import type { EncounterDef, EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../IslesTypes';
import type { Fighter } from '../../../../../entities/Fighter';
import type { StrikeTarget } from '../../../../../boss/framework/StrikeTargets';
import { dim, lit } from '../../../../art/IsleArt';
import {
  CARD_BLACK, CARD_RED, CARD_RED_DEEP, GILT, GILT_DARK, GILT_LIT, INK, IVORY, IVORY_SHADE, MAHOGANY, MAHOGANY_DEEP,
  MAHOGANY_LIT, PIPS, POCKET_GREEN, die, playingCard, suitPip,
} from './art';

/**
 * The House's three wardens — the Croupier-King's floor staff, one at the head of each floor.
 *
 * Each fight is the floor it closes, played at arm's length: the Pit Boss runs the Roulette
 * Floor and the wheel turns under you; Bones Mallory throws the Dice Stair and you can turn his
 * dice over; Quillon the Marker deals the Card Gallery and has marked every ace. Every rule is
 * the House's — and every rule can be played against the dealer by somebody watching closely.
 */

type Who = 'player' | 'npc';
const WHO: Who[] = ['player', 'npc'];
const alive = (f: Fighter): boolean => f.active && f.hp > 0;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
const clampN = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const stepOf = (dt: number): number => clampN(dt, 0, 0.05);
const TAU = Math.PI * 2;
const norm = (a: number): number => ((a % TAU) + TAU) % TAU;
const other = (w: Who): Who => (w === 'player' ? 'npc' : 'player');
const CSS: Record<Who, string> = { player: '#9ad8ff', npc: '#ff9a7a' };
const TINT: Record<Who, number> = { player: 0x8ad8ff, npc: 0xff8a6a };

// ── Warden 1: The Turning Floor ──────────────────────────────────────

/**
 * The Pit Boss's floor is a roulette wheel, and it turns: everyone standing on it is carried
 * round with it. A boulder of an ivory ball runs the rim track the other way and bowls over
 * whoever is on the track (13). Strike the ball and it reverses, faster — and it is yours: it
 * bowls only your foe. When it slows it drops into a pocket and rattles; whoever stands on that
 * wedge when it settles is paid (+10 health, +30% damage for 4.5s). Green zero pays the House.
 */
const turningFloor = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const CX = ctx.W / 2, CY = (top + ctx.H) / 2 + 8;
  const RIM = 264;
  const TRACK = 236;
  const TRACK_HALF = 24;
  const N = 13;
  const STEP = TAU / N;
  const BALL_R = 26;
  const BOWL = ctx.hard ? 16 : 13;
  const PAY_MS = 4500;
  const START_V = 2.3;
  const DROP_V = 0.72;
  const DECEL = ctx.hard ? 0.2 : 0.24;
  const RATTLE = ctx.tk.warn(1500);
  const REST = ctx.hard ? 1700 : 2300;

  let phi = 0;
  let omega = 0.2;
  let state: 'idle' | 'run' | 'rattle' | 'rest' = 'idle';
  let at = 0;
  let ballA = 0, ballV = 0;
  let owner: Who | null = null;
  let pocket = 1;
  let dropRel = 0;
  let paidFlash = 0;
  let paidWho: Who[] = [];
  let lastStruck = 0;
  let ball: StrikeTarget | null = null;
  const trail: { x: number; y: number; t: number }[] = [];
  const bowledAt: Record<Who, number> = { player: 0, npc: 0 };
  const paidUntil: Record<Who, number> = { player: 0, npc: 0 };
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);

  const wedgeAt = (x: number, y: number): number => Math.floor(norm(Math.atan2(y - CY, x - CX) - phi) / STEP) % N;
  const wedgeColor = (i: number): number => (i === 0 ? POCKET_GREEN : i % 2 ? CARD_RED : CARD_BLACK);
  const wedgeName = (i: number): string => (i === 0 ? 'ZERO' : `${i % 2 ? 'RED' : 'BLACK'} ${i * 3 - (i % 3)}`);
  const ballPos = (): Pt => {
    const r = state === 'run' ? TRACK : TRACK - 12;
    return { x: CX + Math.cos(ballA) * r, y: CY + Math.sin(ballA) * r };
  };
  const wedgeCentre = (i: number, r: number): Pt => {
    const a = phi + (i + 0.5) * STEP;
    return { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r };
  };

  const launch = (time: number) => {
    state = 'run';
    owner = null;
    ballA = ctx.rng() * TAU;
    ballV = -START_V;
    ctx.banner('PLACE YOUR BETS', '#ffe08a');
    ctx.sfx('whoosh');
    const p = ballPos();
    if (!ball) {
      ball = ctx.target({
        x: p.x, y: p.y, r: BALL_R + 4,
        onStruck: (by) => {
          const now = ctx.scene.time.now;
          if (state !== 'run' || now - lastStruck < 260) return;
          lastStruck = now;
          ballV = clampN(-ballV * 1.12, -3.1, 3.1);
          if (Math.abs(ballV) < 1.2) ballV = Math.sign(ballV || 1) * 1.2;
          owner = by;
          const q = ballPos();
          ctx.float(q.x, q.y - 40, by === 'player' ? 'YOUR BALL' : 'THE HOUSE\'S BALL', CSS[by]);
          ctx.sfx('clang');
        },
      });
    } else ball.moveTo(p.x, p.y);
    void time;
  };

  const settle = (time: number) => {
    paidWho = [];
    if (pocket === 0) {
      ctx.heal(ctx.npc, 18);
      const c = wedgeCentre(0, 160);
      ctx.float(c.x, c.y - 30, 'ZERO — THE HOUSE WINS', '#7affa8');
      ctx.sfx('money');
    } else {
      for (const w of WHO) {
        const f = fighter(w);
        if (!alive(f) || dist(f.x, f.y, CX, CY) > RIM || wedgeAt(f.x, f.y) !== pocket) continue;
        paidWho.push(w);
        paidUntil[w] = time + PAY_MS;
        ctx.heal(f, 10);
        ctx.float(f.x, f.y - 56, 'PAID', '#ffe08a');
        ctx.flash(f.x, f.y, GILT_LIT);
      }
      const c = wedgeCentre(pocket, 160);
      if (paidWho.length === 0) ctx.float(c.x, c.y - 20, 'NO WINNERS', '#c8b890');
      ctx.sfx(paidWho.length ? 'jackpot' : 'dice');
    }
    paidFlash = time;
    state = 'rest';
    at = time + REST;
    owner = null;
  };

  return {
    update(time, dtRaw) {
      const dt = stepOf(dtRaw);
      if (state === 'idle') { if (at === 0) at = time + 1800; if (time >= at) launch(time); }
      // The wheel turns faster while the ball is flying, and carries everyone on it.
      omega = 0.18 + 0.24 * clampN(Math.abs(ballV) / START_V, 0, 1) * (state === 'run' ? 1 : 0.4);
      phi += omega * dt;
      for (const w of WHO) {
        const f = fighter(w);
        if (!alive(f)) continue;
        const r = dist(f.x, f.y, CX, CY);
        if (r > RIM || r < 30) continue;
        const a = Math.atan2(f.y - CY, f.x - CX);
        const d = omega * r * dt;
        ctx.nudge(f, -Math.sin(a) * d, Math.cos(a) * d);
      }
      if (state === 'run') {
        ballA += ballV * dt;
        const s = Math.max(0, Math.abs(ballV) - DECEL * dt);
        ballV = Math.sign(ballV) * s;
        const b = ballPos();
        ball?.moveTo(b.x, b.y);
        trail.push({ x: b.x, y: b.y, t: time });
        for (const w of WHO) {
          if (owner === w) continue;
          const f = fighter(w);
          if (!alive(f) || time - bowledAt[w] < 800) continue;
          if (dist(f.x, f.y, b.x, b.y) > BALL_R + 20) continue;
          bowledAt[w] = time;
          ctx.hit(f, BOWL, f.x, f.y);
          const ta = ballA + Math.sign(ballV) * Math.PI / 2;
          ctx.nudge(f, Math.cos(ta) * 60 + Math.cos(ballA) * 26, Math.sin(ta) * 60 + Math.sin(ballA) * 26);
          ctx.float(f.x, f.y - 50, 'BOWLED', '#f2e8d0');
          ctx.sfx('hit-heavy');
        }
        if (s <= DROP_V) {
          state = 'rattle';
          at = time + RATTLE;
          pocket = wedgeAt(b.x, b.y);
          dropRel = ballA - phi;
          ctx.banner(`NO MORE BETS — ${wedgeName(pocket)}`, pocket === 0 ? '#7affa8' : '#ffe08a');
          ctx.sfx('dice');
        }
      } else if (state === 'rattle') {
        // It rides in the pocket now, turning with the wheel; a little jitter as it rattles.
        ballA = dropRel + phi + Math.sin(time / 40) * 0.02 * clampN((at - time) / RATTLE, 0, 1);
        const b = ballPos();
        ball?.moveTo(b.x, b.y);
        if (time >= at) settle(time);
      } else if (state === 'rest' && time >= at) launch(time);
      while (trail.length && time - trail[0].t > 260) trail.shift();
    },
    playerTakenMult() { return ctx.scene.time.now < paidUntil.npc ? 1.3 : 1; },
    npcTakenMult() { return ctx.scene.time.now < paidUntil.player ? 1.3 : 1; },
    npcSeek() {
      const n = ctx.npc;
      if (state === 'rattle') return wedgeCentre(pocket, 150);
      if (state !== 'run') return null;
      // The Pit Boss knows the wheel: she reads where the ball will drop from how it is slowing.
      const s = Math.abs(ballV);
      const tLeft = (s - DROP_V) / DECEL;
      if (tLeft < 2.6) {
        const travel = s * tLeft - 0.5 * DECEL * tLeft * tLeft;
        const aDrop = ballA + Math.sign(ballV) * travel;
        const phiDrop = phi + 0.2 * tLeft;
        const i = Math.floor(norm(aDrop - phiDrop) / STEP) % N;
        if (i !== 0) {
          const a = phiDrop + (i + 0.5) * STEP - 0.2 * tLeft;
          return { x: CX + Math.cos(a) * 150, y: CY + Math.sin(a) * 150 };
        }
      }
      const r = dist(n.x, n.y, CX, CY);
      if (Math.abs(r - TRACK) < TRACK_HALF + 30 && owner !== 'npc') {
        const na = Math.atan2(n.y - CY, n.x - CX);
        return { x: CX + Math.cos(na) * 130, y: CY + Math.sin(na) * 130 };
      }
      return null;
    },
    drawGround(g, time) {
      // The bowl and its wedges.
      g.fillStyle(MAHOGANY_DEEP, 0.75); g.fillCircle(CX, CY + 6, RIM + 10);
      g.fillStyle(MAHOGANY, 0.85); g.fillCircle(CX, CY, RIM + 6);
      for (let i = 0; i < N; i++) {
        const a0 = phi + i * STEP, a1 = a0 + STEP;
        let c = wedgeColor(i);
        let alpha = 0.55;
        if (state === 'rattle' && i === pocket) { c = mixGold(c, 0.5 + Math.sin(time / 70) * 0.4); alpha = 0.8; }
        g.fillStyle(c, alpha);
        g.slice(CX, CY, TRACK - TRACK_HALF, a0, a1, false); g.fillPath();
        g.lineStyle(2, IVORY, 0.5);
        g.lineBetween(CX + Math.cos(a0) * 64, CY + Math.sin(a0) * 64, CX + Math.cos(a0) * (TRACK - TRACK_HALF), CY + Math.sin(a0) * (TRACK - TRACK_HALF));
        // The wedge's number plate: an ivory chip with as many notches as its dozen.
        const m = wedgeCentre(i, TRACK - TRACK_HALF - 22);
        g.fillStyle(IVORY, 0.85); g.fillCircle(m.x, m.y, 9);
        g.fillStyle(wedgeColor(i), 1); g.fillCircle(m.x, m.y, 5);
      }
      // The ball track: a polished mahogany ring between gilt rails.
      g.lineStyle(TRACK_HALF * 2, MAHOGANY_LIT, 0.8); g.strokeCircle(CX, CY, TRACK);
      g.lineStyle(3, GILT, 0.9); g.strokeCircle(CX, CY, TRACK - TRACK_HALF); g.strokeCircle(CX, CY, TRACK + TRACK_HALF);
      // Diamonds on the track, the bumpers a real ball clatters over — turning with the bowl's rim.
      for (let k = 0; k < 8; k++) {
        const a = -phi * 0.5 + (k / 8) * TAU;
        const x = CX + Math.cos(a) * (TRACK + 10), y = CY + Math.sin(a) * (TRACK + 10);
        g.fillStyle(GILT_LIT, 0.8); g.fillPoints([{ x, y: y - 5 }, { x: x + 4, y }, { x, y: y + 5 }, { x: x - 4, y }], true, true);
      }
      // The cone and turret in the middle.
      g.fillStyle(MAHOGANY_LIT, 0.95); g.fillCircle(CX, CY, 62);
      g.fillStyle(lit(MAHOGANY_LIT, 0.15), 0.8); g.fillCircle(CX - 8, CY - 8, 40);
      for (let k = 0; k < 4; k++) {
        const a = phi + (k / 4) * TAU;
        g.lineStyle(6, GILT, 1); g.lineBetween(CX, CY, CX + Math.cos(a) * 50, CY + Math.sin(a) * 50);
        g.fillStyle(GILT_LIT, 1); g.fillCircle(CX + Math.cos(a) * 50, CY + Math.sin(a) * 50, 6);
      }
      g.fillStyle(GILT_DARK, 1); g.fillCircle(CX, CY, 12); g.fillStyle(GILT_LIT, 1); g.fillCircle(CX - 3, CY - 3, 4);
      // The way it turns: gilt chevrons painted round the outer rim.
      for (let k = 0; k < 16; k++) {
        const a = phi + (k / 16) * TAU;
        const x = CX + Math.cos(a) * (RIM + 2), y = CY + Math.sin(a) * (RIM + 2);
        const tx = -Math.sin(a), ty = Math.cos(a);
        g.lineStyle(2, GILT, 0.7);
        g.lineBetween(x - tx * 7 + Math.cos(a) * 5, y - ty * 7 + Math.sin(a) * 5, x, y);
        g.lineBetween(x - tx * 7 - Math.cos(a) * 5, y - ty * 7 - Math.sin(a) * 5, x, y);
      }
      // The paid wedge throws up a fountain of gilt.
      const pk = (time - paidFlash) / 700;
      if (paidFlash > 0 && pk < 1 && pocket !== 0) {
        const a0 = phi + pocket * STEP;
        g.fillStyle(GILT_LIT, 0.4 * (1 - pk)); g.slice(CX, CY, TRACK - TRACK_HALF, a0, a0 + STEP, false); g.fillPath();
      }
    },
    drawAir(g, time) {
      if (state === 'idle') return;
      for (let i = 0; i < trail.length; i++) {
        const tr = trail[i];
        g.fillStyle(IVORY, 0.05 + (i / trail.length) * 0.15); g.fillCircle(tr.x, tr.y, BALL_R * (0.6 + 0.4 * (i / trail.length)));
      }
      const b = ballPos();
      g.fillStyle(0x000000, 0.3); g.fillEllipse(b.x + 4, b.y + BALL_R * 0.8, BALL_R * 2, BALL_R * 0.6);
      if (owner) { g.lineStyle(4, TINT[owner], 0.85); g.strokeCircle(b.x, b.y, BALL_R + 5); }
      g.fillStyle(IVORY_SHADE, 1); g.fillCircle(b.x, b.y, BALL_R);
      g.fillStyle(IVORY, 1); g.fillCircle(b.x - 3, b.y - 3, BALL_R - 4);
      // Rolling: two seams turning with its travel.
      const roll = (ballA * TRACK) / BALL_R;
      g.lineStyle(1.5, IVORY_SHADE, 0.9);
      for (const off of [0, Math.PI / 2]) {
        const sx = Math.cos(roll + off) * (BALL_R - 6);
        g.lineBetween(b.x + sx, b.y - BALL_R * 0.8, b.x + sx * 0.6, b.y + BALL_R * 0.8);
      }
      g.fillStyle(0xffffff, 0.8); g.fillCircle(b.x - 9, b.y - 10, 6);
      // Gilt coins geysering over whoever was paid.
      const pk = (time - paidFlash) / 900;
      if (pk >= 0 && pk < 1) {
        for (const w of paidWho) {
          const f = fighter(w);
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * TAU;
            const h = Math.sin(pk * Math.PI) * (50 + (i % 3) * 14);
            g.fillStyle(i % 2 ? GILT : GILT_LIT, 1 - pk);
            g.fillEllipse(f.x + Math.cos(a) * pk * 40, f.y - 20 - h, 8, 5);
          }
        }
      }
      for (const w of WHO) {
        if (ctx.scene.time.now >= paidUntil[w]) continue;
        const f = fighter(w);
        for (let i = 0; i < 3; i++) {
          const a = time / 300 + (i / 3) * TAU;
          g.fillStyle(GILT_LIT, 0.9); g.fillEllipse(f.x + Math.cos(a) * 24, f.y - 36 + Math.sin(a) * 7, 7, 4);
        }
      }
    },
    drawHud(g) {
      if (state !== 'run') return;
      const cx = ctx.W / 2, cy = top + 22;
      const k = clampN((Math.abs(ballV) - DROP_V) / (START_V - DROP_V), 0, 1);
      g.fillStyle(MAHOGANY_DEEP, 0.9); g.fillRoundedRect(cx - 120, cy - 12, 240, 24, 10);
      g.lineStyle(2, GILT, 1); g.strokeRoundedRect(cx - 120, cy - 12, 240, 24, 10);
      g.fillStyle(k < 0.25 ? GILT_LIT : IVORY, 1); g.fillRoundedRect(cx - 112, cy - 5, 224 * k, 10, 4);
      g.fillStyle(IVORY, 1); g.fillCircle(cx - 112 + 224 * k, cy, 7);
    },
    destroy() { ball?.remove(); ball = null; },
  };
};

/** A wedge's colour washed toward gilt (the rattling pocket). */
const mixGold = (c: number, t: number): number => {
  const k = clampN(t, 0, 1);
  const ar = (c >> 16) & 0xff, ag = (c >> 8) & 0xff, ab = c & 0xff;
  return (Math.round(ar + (0xff - ar) * k) << 16) | (Math.round(ag + (0xe0 - ag) * k) << 8) | Math.round(ab + (0x8a - ab) * k);
};

// ── Warden 2: Turn It Over ───────────────────────────────────────────

/**
 * Bones Mallory rolls two dice down the stair on every beat — one at each of you. A tumbling die
 * flattens whoever it rolls over (9). Where it lands it settles on a face, and a moment later it
 * bursts in the pattern of its pips, laid out on the steps around it (13 each). Strike a landed
 * die to turn it over: the opposite face comes up (1↔6, 2↔5, 3↔4) and so does its pattern. Two
 * of a kind is doubles, and doubles burst wider.
 */
const turnItOver = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const BEAT = ctx.hard ? 3000 : 3600;
  const FUSE = ctx.tk.warn(ctx.hard ? 1700 : 2000);
  const ROLL_SPEED = 320;
  const SPREAD = 108;
  const PIP_R = 50;
  const ONE_R = 88;
  const DMG = ctx.hard ? 15 : 13;
  const ROLL_DMG = 9;
  const STAIR = 88;
  const S = 46;

  interface Die {
    roll: number; x: number; y: number; ty: number; face: number; state: 'roll' | 'land' | 'burst';
    fuseEnd: number; burstAt: number; spin: number; lastFlip: number; flipAt: number;
    rolled: Set<Who>; t: StrikeTarget | null;
  }
  let dice: Die[] = [];
  let nextRoll = 0;
  let rollNo = 0;

  const doubles = (d: Die): boolean => dice.some((o) => o !== d && o.roll === d.roll && o.state !== 'roll' && d.state !== 'roll' && o.face === d.face);
  const blasts = (d: Die, face = d.face): { x: number; y: number; r: number }[] => {
    const big = doubles(d) ? 1.25 : 1;
    if (face === 1) return [{ x: d.x, y: d.ty, r: ONE_R * big }];
    return PIPS[face].map(([px, py]) => ({ x: clampN(d.x + px * SPREAD, 30, ctx.W - 30), y: clampN(d.ty + py * SPREAD * 0.8, top + 20, ctx.H - 20), r: PIP_R * big }));
  };
  const inBlast = (d: Die, x: number, y: number, face = d.face, pad = 20): boolean => blasts(d, face).some((b) => dist(x, y, b.x, b.y) < b.r + pad);
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);

  const throwPair = (time: number) => {
    rollNo += 1;
    const lanes: number[] = [];
    for (const w of WHO) {
      const f = fighter(w);
      let x = clampN(f.x + (ctx.rng() - 0.5) * 120, 90, ctx.W - 90);
      if (lanes.length && Math.abs(x - lanes[0]) < 150) x = clampN(lanes[0] + (x < lanes[0] ? -170 : 170), 90, ctx.W - 90);
      lanes.push(x);
      const rows = Math.floor((ctx.H - 110 - (top + 170)) / STAIR);
      const ty = top + 170 + Math.floor(ctx.rng() * (rows + 1)) * STAIR;
      dice.push({
        roll: rollNo, x, y: top + 6, ty, face: 1 + Math.floor(ctx.rng() * 6), state: 'roll', fuseEnd: 0, burstAt: 0,
        spin: ctx.rng() * TAU, lastFlip: 0, flipAt: 0, rolled: new Set(), t: null,
      });
    }
    ctx.sfx('dice');
    void time;
  };

  const land = (d: Die, time: number) => {
    d.state = 'land';
    d.y = d.ty;
    d.face = 1 + Math.floor(ctx.rng() * 6);
    d.fuseEnd = time + FUSE;
    d.t = ctx.target({
      x: d.x, y: d.ty, r: S * 0.62,
      onStruck: () => {
        const now = ctx.scene.time.now;
        if (d.state !== 'land' || now - d.lastFlip < 360) return;
        d.lastFlip = now;
        d.flipAt = now;
        d.face = 7 - d.face;
        d.fuseEnd = Math.max(d.fuseEnd, now + 750);
        ctx.float(d.x, d.ty - 46, `TURNED — ${d.face}`, '#f2e8d0');
        ctx.sfx('dice');
      },
    });
    ctx.sfx('land');
    const mate = dice.find((o) => o !== d && o.roll === d.roll && o.state === 'land');
    if (mate && mate.face === d.face) { ctx.banner(`DOUBLES — ${d.face}s`, '#ffe08a'); ctx.sfx('jackpot'); }
  };

  const burst = (d: Die, time: number) => {
    const zones = blasts(d);
    for (const w of WHO) {
      const f = fighter(w);
      if (!alive(f)) continue;
      if (zones.some((z) => dist(f.x, f.y, z.x, z.y) < z.r + 20)) {
        ctx.hit(f, DMG, f.x, f.y);
        ctx.float(f.x, f.y - 50, d.face === 1 ? 'SNAKE-EYE' : `${d.face}`, '#f2e8d0');
      }
    }
    for (const z of zones) { ctx.tk.boom(z.x, z.y, z.r, d.face === 1 ? CARD_RED : IVORY); }
    ctx.sfx(d.face === 1 || doubles(d) ? 'explosion-medium' : 'explosion-small');
    d.state = 'burst';
    d.burstAt = time;
    d.t?.remove(); d.t = null;
  };

  return {
    update(time, dtRaw) {
      const dt = stepOf(dtRaw);
      if (nextRoll === 0) nextRoll = time + 1600;
      if (time >= nextRoll) { throwPair(time); nextRoll = time + BEAT; }
      for (const d of dice) {
        if (d.state === 'roll') {
          d.y += ROLL_SPEED * dt;
          d.spin += dt * 9;
          if (Math.floor(time / 110) !== Math.floor((time - dt * 1000) / 110)) d.face = 1 + Math.floor(ctx.rng() * 6);
          for (const w of WHO) {
            const f = fighter(w);
            if (d.rolled.has(w) || !alive(f) || dist(f.x, f.y, d.x, d.y) > S * 0.6 + 20) continue;
            d.rolled.add(w);
            ctx.hit(f, ROLL_DMG, f.x, f.y);
            ctx.nudge(f, f.x < d.x ? -56 : 56, 16);
            ctx.float(f.x, f.y - 46, 'FLATTENED', '#f2e8d0');
          }
          if (d.y >= d.ty) land(d, time);
        } else if (d.state === 'land' && time >= d.fuseEnd) burst(d, time);
      }
      dice = dice.filter((d) => d.state !== 'burst' || time - d.burstAt < 500);
    },
    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      const now = ctx.scene.time.now;
      const live = dice.filter((d) => d.state === 'land');
      const danger = (x: number, y: number) => live.some((d) => d.fuseEnd - now < 1600 && inBlast(d, x, y, d.face, 30));
      if (danger(n.x, n.y)) {
        for (let k = 0; k < 16; k++) {
          const r = 120 + (k % 2) * 80;
          const a = (k / 16) * TAU;
          const x = clampN(n.x + Math.cos(a) * r, 50, ctx.W - 50), y = clampN(n.y + Math.sin(a) * r, top + 30, ctx.H - 40);
          if (!danger(x, y)) return { x, y };
        }
        return null;
      }
      // Mallory turns a die over on you, given the chance.
      for (const d of live) {
        if (d.fuseEnd - now < 900) continue;
        if (!inBlast(d, p.x, p.y) && inBlast(d, p.x, p.y, 7 - d.face) && dist(n.x, n.y, d.x, d.ty) < 260) return { x: d.x + (n.x < d.x ? -60 : 60), y: d.ty };
      }
      return null;
    },
    drawGround(g, time) {
      // The stair: treads and risers across the room, a red runner down the middle.
      for (let y = top + 40; y < ctx.H; y += STAIR) {
        g.fillStyle(0x000000, 0.18); g.fillRect(0, y, ctx.W, 10);
        g.fillStyle(IVORY, 0.08); g.fillRect(0, y - 3, ctx.W, 3);
        g.fillStyle(GILT, 0.5); g.fillRect(ctx.W / 2 - 110, y - 2, 220, 3);
      }
      g.fillStyle(CARD_RED_DEEP, 0.25); g.fillRect(ctx.W / 2 - 100, top, 200, ctx.H - top);
      for (const d of dice) {
        if (d.state === 'roll') {
          // Its lane, chalked down the stair, and the step it will stop on.
          g.lineStyle(2, IVORY, 0.18); g.lineBetween(d.x, d.y, d.x, d.ty);
          g.lineStyle(2, IVORY, 0.4); g.strokeRect(d.x - S * 0.6, d.ty - S * 0.6, S * 1.2, S * 1.2);
          continue;
        }
        if (d.state !== 'land') continue;
        const k = clampN(1 - (d.fuseEnd - time) / FUSE, 0, 1);
        // The underside, faint and dotted: what it becomes if somebody turns it.
        for (const b of blasts(d, 7 - d.face)) {
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * TAU;
            g.fillStyle(IVORY, 0.18); g.fillCircle(b.x + Math.cos(a) * b.r, b.y + Math.sin(a) * b.r, 1.6);
          }
        }
        for (const b of blasts(d)) {
          const c = d.face === 1 ? CARD_RED : IVORY;
          g.fillStyle(c, 0.08 + k * 0.16); g.fillCircle(b.x, b.y, b.r);
          g.lineStyle(2, c, 0.5 + k * 0.4); g.strokeCircle(b.x, b.y, b.r);
          g.fillStyle(c, 0.35); g.slice(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + k * TAU, false); g.fillPath();
          g.fillStyle(d.face === 1 ? CARD_RED : CARD_BLACK, 0.6); g.fillCircle(b.x, b.y, 7);
          if (k > 0.8 && Math.floor(time / 90) % 2 === 0) { g.lineStyle(3, CARD_RED, 0.7); g.strokeCircle(b.x, b.y, b.r + 3); }
        }
        if (doubles(d)) {
          const mate = dice.find((o) => o !== d && o.roll === d.roll);
          if (mate) { g.lineStyle(3, GILT_LIT, 0.4 + Math.sin(time / 90) * 0.2); g.lineBetween(d.x, d.ty, mate.x, mate.ty); }
        }
      }
    },
    drawAir(g, time) {
      for (const d of dice) {
        if (d.state === 'burst') {
          const k = (time - d.burstAt) / 500;
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * TAU;
            g.fillStyle(IVORY, 1 - k); g.fillRect(d.x + Math.cos(a) * k * 60 - 3, d.ty + Math.sin(a) * k * 50 - 3, 6, 6);
          }
          continue;
        }
        const bounce = d.state === 'roll' ? Math.abs(Math.sin(d.spin * 0.7)) * 22 : 0;
        const flipK = d.flipAt ? clampN((time - d.flipAt) / 260, 0, 1) : 1;
        const tilt = d.state === 'roll' ? d.spin : (1 - flipK) * Math.PI;
        die(g, d.x, d.y - bounce - S * 0.5, S * (0.8 + 0.2 * Math.abs(Math.cos(tilt))), d.face, d.state === 'roll' ? Math.sin(d.spin) * 0.6 : 0, 1, true);
      }
    },
    drawHud(g, time) {
      // Mallory's cup on the HUD: it rattles as the next throw comes due.
      const left = clampN((nextRoll - time) / BEAT, 0, 1);
      const cx = ctx.W - 80, cy = top + 24;
      const shake = left < 0.25 ? Math.sin(time / 25) * 3 : 0;
      g.fillStyle(MAHOGANY_DEEP, 1); g.fillRoundedRect(cx - 18 + shake, cy - 16, 36, 30, 6);
      g.fillStyle(MAHOGANY, 1); g.fillRoundedRect(cx - 16 + shake, cy - 14, 32, 26, 5);
      g.fillStyle(GILT, 1); g.fillRect(cx - 18 + shake, cy - 16, 36, 4);
      g.fillStyle(GILT_LIT, 1); g.fillRect(cx - 50, cy + 20, 100 * (1 - left), 4);
    },
    destroy() { for (const d of dice) d.t?.remove(); dice = []; },
  };
};

// ── Warden 3: Marked Cards ───────────────────────────────────────────

/**
 * Quillon deals the floor face-down: two dozen cards, a few aces among the blanks. Step on a card
 * to turn it. An ace throws its spade at your foe (16); a blank inks you (silenced 1.5s, 5). He
 * has marked every ace with a nick of ink on the back — read the corners. Strike a face-down card
 * from afar to turn it: an ace still throws at your foe; a blank splashes its ink on whoever is
 * standing near it. When the aces are out, or the hand runs long, he gathers and deals again.
 */
const markedCards = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const COLS = 6, ROWS = 4;
  const CW = 70, CH = 96;
  const ACES = ctx.hard ? 6 : 5;
  const HAND_MS = ctx.hard ? 14000 : 16000;
  const GATHER = 900, DEAL = 800;
  const ACE_DMG = 16;
  const INK_POOL_R = 84;

  interface Card { x: number; y: number; hx: number; hy: number; ace: boolean; marked: boolean; up: boolean; upAt: number; t: StrikeTarget | null }
  interface Blade { x: number; y: number; a: number; by: Who; born: number }
  interface Pool { x: number; y: number; born: number; lastTick: number }
  const cards: Card[] = [];
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const x = 150 + i * 132, y = top + 92 + j * 128;
      cards.push({ x, y, hx: x, hy: y, ace: false, marked: false, up: false, upAt: 0, t: null });
    }
  }
  let blades: Blade[] = [];
  let pools: Pool[] = [];
  let state: 'idle' | 'gather' | 'deal' | 'play' = 'idle';
  let at = 0;
  let dealtAt = 0;
  const inkUntil: Record<Who, number> = { player: 0, npc: 0 };
  const deckX = ctx.W / 2, deckY = top + 30;
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const acesLeft = (): number => cards.filter((c) => c.ace && !c.up).length;

  const shuffle = () => {
    for (const c of cards) { c.ace = false; c.marked = false; c.up = false; }
    const idx = cards.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(ctx.rng() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    for (let k = 0; k < ACES; k++) { cards[idx[k]].ace = true; cards[idx[k]].marked = !(ctx.hard && k === 0); }
  };

  const turn = (c: Card, by: Who, blow: boolean, time: number) => {
    c.up = true;
    c.upAt = time;
    if (c.ace) {
      const foe = fighter(other(by));
      blades.push({ x: c.x, y: c.y, a: Math.atan2(foe.y - c.y, foe.x - c.x), by, born: time });
      ctx.float(c.x, c.y - 60, 'ACE', CSS[by]);
      ctx.sfx('slash');
      return;
    }
    if (blow) {
      pools.push({ x: c.x, y: c.y, born: time, lastTick: 0 });
      ctx.sfx('slime-splat');
    } else {
      const f = fighter(by);
      ctx.silence(f, 1500);
      ctx.hit(f, 5, f.x, f.y);
      inkUntil[by] = time + 1500;
      ctx.float(f.x, f.y - 52, 'INKED', '#8a9ad8');
      ctx.sfx('slime-splat');
    }
  };

  const ensureTargets = () => {
    for (const c of cards) {
      if (c.t) continue;
      c.t = ctx.target({
        x: c.x, y: c.y, r: 34, passThrough: true,
        onStruck: (by) => { if (state === 'play' && !c.up) turn(c, by, true, ctx.scene.time.now); },
      });
    }
  };

  return {
    update(time, dtRaw) {
      const dt = stepOf(dtRaw);
      if (state === 'idle') {
        if (at === 0) { at = time + 1200; shuffle(); for (const c of cards) { c.x = deckX; c.y = deckY; } }
        if (time >= at) { state = 'deal'; at = time + DEAL; ctx.sfx('whoosh'); ensureTargets(); }
      }
      if (state === 'gather' || state === 'deal') {
        const k = clampN(1 - (at - time) / (state === 'gather' ? GATHER : DEAL), 0, 1);
        cards.forEach((c, i) => {
          const kk = clampN(k * 1.4 - (i / cards.length) * 0.4, 0, 1);
          const e = kk * kk * (3 - 2 * kk);
          c.x = state === 'deal' ? deckX + (c.hx - deckX) * e : c.hx + (deckX - c.hx) * e;
          c.y = state === 'deal' ? deckY + (c.hy - deckY) * e : c.hy + (deckY - c.hy) * e;
          c.t?.moveTo(c.x, c.y);
        });
        if (time >= at) {
          if (state === 'gather') { shuffle(); state = 'deal'; at = time + DEAL; ctx.sfx('whoosh'); }
          else { state = 'play'; dealtAt = time; ctx.banner(`THE MARKER DEALS — ${ACES} ACES`, '#c8d0ff'); ctx.sfx('countdown-go'); }
        }
      } else if (state === 'play') {
        for (const c of cards) {
          if (c.up) continue;
          for (const w of WHO) {
            const f = fighter(w);
            if (!alive(f) || Math.abs(f.x - c.x) > CW / 2 + 4 || Math.abs(f.y - c.y) > CH / 2 + 4) continue;
            turn(c, w, false, time);
            break;
          }
        }
        if (acesLeft() === 0 || time - dealtAt > HAND_MS) {
          state = 'gather';
          at = time + GATHER;
          ctx.banner(acesLeft() === 0 ? 'THE ACES ARE OUT — GATHERING' : 'THE HAND RUNS LONG — GATHERING', '#c8d0ff');
          ctx.sfx('whoosh');
        }
      }
      // Spades in flight, bending a little after their mark.
      for (const b of blades) {
        const foe = fighter(other(b.by));
        const want = Math.atan2(foe.y - b.y, foe.x - b.x);
        const d = Math.atan2(Math.sin(want - b.a), Math.cos(want - b.a));
        b.a += clampN(d, -1.5 * dt, 1.5 * dt);
        b.x += Math.cos(b.a) * 330 * dt;
        b.y += Math.sin(b.a) * 330 * dt;
        if (alive(foe) && dist(b.x, b.y, foe.x, foe.y) < 30) {
          ctx.hit(foe, ACE_DMG, foe.x, foe.y);
          ctx.flash(foe.x, foe.y, 0xffffff);
          ctx.sfx('stab');
          b.born = -1;
        }
      }
      blades = blades.filter((b) => b.born >= 0 && time - b.born < 2400 && b.x > -40 && b.x < ctx.W + 40 && b.y > top - 40 && b.y < ctx.H + 40);
      // Ink splashed from a struck blank: it silences whoever stands in it.
      for (const p of pools) {
        if (time - p.lastTick < 800) continue;
        p.lastTick = time;
        for (const w of WHO) {
          const f = fighter(w);
          if (!alive(f) || dist(f.x, f.y, p.x, p.y) > INK_POOL_R) continue;
          ctx.silence(f, 900);
          ctx.hit(f, 4, f.x, f.y);
          inkUntil[w] = time + 900;
          ctx.float(f.x, f.y - 50, 'INKED', '#8a9ad8');
        }
      }
      pools = pools.filter((p) => time - p.born < 2600);
    },
    npcSeek() {
      if (state !== 'play') return null;
      const n = ctx.npc;
      // The Marker knows every ace, marked or not.
      let best: Pt | null = null, bd = 460;
      for (const c of cards) {
        if (!c.ace || c.up) continue;
        const d = dist(n.x, n.y, c.x, c.y);
        if (d < bd) { bd = d; best = { x: c.x, y: c.y }; }
      }
      return best;
    },
    drawGround(g, time) {
      for (const p of pools) {
        const k = (time - p.born) / 2600;
        g.fillStyle(INK, 0.55 * (1 - k * 0.6)); g.fillCircle(p.x, p.y, INK_POOL_R * Math.min(1, k * 6));
        for (let i = 0; i < 7; i++) {
          const a = i * 0.9 + p.x;
          g.fillStyle(INK, 0.6 * (1 - k)); g.fillCircle(p.x + Math.cos(a) * (INK_POOL_R + 8), p.y + Math.sin(a) * (INK_POOL_R + 4), 6 + (i % 3) * 3);
        }
      }
      for (const c of cards) {
        if (state === 'gather' || state === 'deal' || state === 'idle') {
          playingCard(g, c.x, c.y, CW, CH, 0, 'back', state === 'idle' ? 0 : 1);
          continue;
        }
        if (!c.up) {
          playingCard(g, c.x, c.y, CW, CH, 0, 'back');
          if (c.marked) {
            // The nick of ink in the top-right corner, and a drip run down from it.
            const ink = clampN((time - dealtAt) / 500, 0, 1);
            const mx = c.x + CW / 2 - 9, my = c.y - CH / 2 + 9;
            g.fillStyle(INK, 0.95 * ink); g.fillCircle(mx, my, 4.5);
            g.fillStyle(INK, 0.9 * ink); g.fillTriangle(mx - 3, my, mx + 3, my, mx, my + 4 + 8 * ink);
            g.fillStyle(0x8a9ad8, 0.6 * ink); g.fillCircle(mx - 1.5, my - 1.5, 1.4);
          }
          continue;
        }
        const k = clampN((time - c.upAt) / 220, 0, 1);
        const flip = k < 0.5 ? 1 - k * 2 : (k - 0.5) * 2;
        if (k < 0.5) playingCard(g, c.x, c.y, CW, CH, 0, 'back', 1, flip);
        else playingCard(g, c.x, c.y, CW, CH, 0, c.ace ? { suit: 'spade', pips: 1 } : 'blank', 0.92, flip);
        if (!c.ace && k >= 1) {
          g.fillStyle(INK, 0.55); g.fillCircle(c.x + 4, c.y + 6, 16);
          g.fillCircle(c.x - 12, c.y - 14, 7); g.fillCircle(c.x + 16, c.y - 20, 5);
        }
      }
    },
    drawAir(g, time) {
      for (const b of blades) {
        // A black spade, edged in the colour of whoever turned it, point first.
        const ca = Math.cos(b.a), sa = Math.sin(b.a);
        const tip = { x: b.x + ca * 22, y: b.y + sa * 22 };
        const l = { x: b.x - sa * 12 - ca * 4, y: b.y + ca * 12 - sa * 4 };
        const r = { x: b.x + sa * 12 - ca * 4, y: b.y - ca * 12 - sa * 4 };
        g.fillStyle(TINT[b.by], 0.35); g.fillCircle(b.x - ca * 10, b.y - sa * 10, 14);
        g.fillStyle(CARD_BLACK, 1); g.fillTriangle(tip.x, tip.y, l.x, l.y, r.x, r.y);
        g.fillCircle(b.x - ca * 6 - sa * 7, b.y - sa * 6 + ca * 7, 7);
        g.fillCircle(b.x - ca * 6 + sa * 7, b.y - sa * 6 - ca * 7, 7);
        g.fillTriangle(b.x - ca * 8, b.y - sa * 8, b.x - ca * 20 - sa * 6, b.y - sa * 20 + ca * 6, b.x - ca * 20 + sa * 6, b.y - sa * 20 - ca * 6);
        g.lineStyle(1.5, TINT[b.by], 0.9); g.lineBetween(tip.x, tip.y, l.x, l.y); g.lineBetween(tip.x, tip.y, r.x, r.y);
        for (let i = 1; i < 4; i++) { g.fillStyle(CARD_BLACK, 0.25 / i); g.fillCircle(b.x - ca * 14 * i, b.y - sa * 14 * i, 6); }
      }
      // A splash of ink on anyone silenced by it.
      for (const w of WHO) {
        if (ctx.scene.time.now >= inkUntil[w]) continue;
        const f = fighter(w);
        for (let i = 0; i < 4; i++) {
          const ph = ((time / 500) + i / 4) % 1;
          g.fillStyle(INK, 0.8 * (1 - ph)); g.fillCircle(f.x - 10 + i * 7, f.y - 30 + ph * 26, 3);
        }
      }
      if (state === 'gather' || state === 'deal') {
        // The shoe the cards fly to and from.
        g.fillStyle(CARD_BLACK, 1); g.fillRoundedRect(deckX - 30, deckY - 20, 60, 40, 6);
        g.fillStyle(CARD_RED_DEEP, 1); g.fillRect(deckX - 24, deckY - 14, 48, 28);
        g.fillStyle(GILT, 1); g.fillRect(deckX - 30, deckY + 16, 60, 4);
      }
    },
    drawHud(g, time) {
      if (state !== 'play') return;
      const n = ACES;
      const left = acesLeft();
      const x0 = ctx.W / 2 - (n * 26) / 2 + 13, y = top + 22;
      g.fillStyle(MAHOGANY_DEEP, 0.85); g.fillRoundedRect(x0 - 24, y - 16, n * 26 + 22, 32, 8);
      g.lineStyle(2, GILT_DARK, 1); g.strokeRoundedRect(x0 - 24, y - 16, n * 26 + 22, 32, 8);
      for (let i = 0; i < n; i++) suitPip(g, x0 + i * 26, y, 9, 'spade', i < left ? IVORY : dim(IVORY, 0.7), i < left ? 1 : 0.4);
      const k = clampN((time - dealtAt) / HAND_MS, 0, 1);
      g.fillStyle(lit(INK, 0.3), 1); g.fillRect(x0 - 18, y + 12, (n * 26 + 10) * (1 - k), 2);
    },
    destroy() { for (const c of cards) { c.t?.remove(); c.t = null; } },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const HOUSE_GIMMICKS: GimmickDef[] = [
  {
    id: 'house-turning-floor',
    rules: 'The floor is a turning wheel. The ball bowls whoever is on the rim — strike it to reverse it and make it yours. Its pocket pays.',
    make: turningFloor,
  },
  {
    id: 'house-turn-it-over',
    rules: 'Dice tumble down the stair and burst in the pattern of their pips. Strike a landed die to turn it over: 1↔6, 2↔5, 3↔4.',
    make: turnItOver,
  },
  {
    id: 'house-marked-cards',
    rules: 'Step on a card to turn it: an ace throws at your foe, a blank inks you. The aces are marked in the corner. Strike cards from afar.',
    make: markedCards,
  },
];

export const HOUSE_WARDENS: EncounterDef[] = [
  {
    id: 'house-warden-1', court: 'house', name: 'The Turning Floor',
    foeName: 'Pit Boss Ormolu Vane', foeElement: 'tempest', difficulty: 5, hpMult: 1.25,
    gimmick: 'house-turning-floor', at: { x: 1250, y: 1758 }, coins: 160,
    look: { body: 0x2a1a24, accent: GILT, hat: 'visor', traits: ['cane', 'glasses'], size: 1.15, eye: 0xffe08a },
    challenge: [
      'Welcome to the Roulette Floor. Mind the ball. The ball does not mind you.',
      'Forty years I have run this pit, and the wheel has never once stopped turning. Neither have I.',
      'Place your bet, little challenger. Red or black? It is all the same green to the House.',
    ],
    beaten: [
      'You took the ball off my wheel and rolled it back at me. That is not in the rules. ...There are no rules.',
      'Up the stair. Mallory throws the dice up there. He loads them, of course. Everybody here loads everything.',
    ],
  },
  {
    id: 'house-warden-2', court: 'house', name: 'Turn It Over',
    foeName: 'Bones Mallory', foeElement: 'marrow', difficulty: 5, hpMult: 1.3,
    gimmick: 'house-turn-it-over', at: { x: 900, y: 1130 }, coins: 160,
    look: { body: 0xe8dcc0, accent: CARD_RED_DEEP, hat: 'tophat', traits: ['pipe', 'satchel'], size: 1.05, eye: 0xff6a5a },
    challenge: [
      'They call me Bones because I carve the dice myself. Out of what, you do not want to ask.',
      'Every die on this stair is mine. Every face. Every throw. Snake-eyes when I want them.',
      'Here. Have a pair. Watch them come down, and watch where they land.',
    ],
    beaten: [
      'You turned them. You turned my own bones over on me. Nobody looks at the bottom of a die. Nobody but you.',
      'The Gallery is above. Quillon marks the cards. Watch the corners. He forgets other people have eyes.',
    ],
  },
  {
    id: 'house-warden-3', court: 'house', name: 'Marked Cards',
    foeName: 'Quillon the Marker', foeElement: 'ink', difficulty: 5, hpMult: 1.35,
    gimmick: 'house-marked-cards', at: { x: 900, y: 366 }, coins: 160,
    look: { body: 0x22242e, accent: INK, hat: 'visor', traits: ['glasses', 'book'], size: 1.0, eye: 0xa8b8ff },
    challenge: [
      'Every card that has ever been dealt on Lotterhaven passed under my pen first. A little nick. Here.',
      'The King does not cheat. I do it for him. That is what marking is: cheating done ahead of time.',
      'The aces are out there somewhere. I know where. Do you?',
    ],
    beaten: [
      'You read my marks. Nobody reads my marks. They are too small. ...They were never too small, were they.',
      'He is at the High Table, under the Wheel. He will deal you a hand. Strike off every card of it. Every one.',
    ],
  },
];
