import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, mixC, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { FANG_LIT, MUD_DARK, VENIN_EYE, VENOM, VENOM_LIT } from '../palette';
import { alive, arcPoint, clamp, dist, stepDt, wrapAngle } from '../util';

/**
 * The Long Swallow — Feeder Osgood Lurch, in the King's telling the man who kept the pit-yard's
 * great python fed, and fed it whoever the Dosekeeper's book passed over.
 *
 * The python is the whole yard long. Its head glides after the rats Lurch tosses — always at your
 * feet — and when it reaches one it rears and gapes (a ring opens round the rat), then gulps
 * everything inside. Whoever it gulps rides down the length of it as a bulge, held and
 * digesting, and is spat out of the tail end hurt. Its coils lie across the yard and stop every
 * shot that meets them, both ways.
 *
 * The exploit: a rat is only a rat. Strike one and it is kicked away from you, wherever you
 * like — under the Feeder's boots. And a full python can be squeezed: strike the bulge and
 * whoever is in it is crushed out early, hard. Halfway down the python wakes properly: it glides
 * quicker and Lurch throws two rats at a time.
 */

const ID = fallenId('fang', 'swallow');
/** Spacing of body points along the head's path, and how many there are. */
const SEG = 13;
const N = 30;
const SUB = 3;
const TURN = 2.6;
const GAPE_MS = 760;
const GULP_R = 58;
const CARRY_MS = 2300;
const DIGEST = 4;
const SPIT = 6;
const SQUEEZE = 14;
const KICK = 170;
const RAT_LIFE = 9000;

/** Python skin: tan with dark saddles. */
const PY = 0xa48a52;
const PY_SADDLE = 0x4a3a20;
const PY_BELLY = 0xd8c89a;
const RAT = 0x7a6e64;
const RAT_PINK = 0xd89a98;

/** A rat in the air or on the ground. */
interface Rat { x: number; y: number; fx: number; fy: number; at: number; flyMs: number; landed: boolean; landAt: number; target: StrikeTarget | null; seed: number }
/** A fighter riding down the python. */
interface Meal { f: Fighter; at: number; nextStun: number; target: StrikeTarget | null; done: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const rats: Rat[] = [];
  const meals: Meal[] = [];
  const path: Pt[] = [];
  let hx = W / 2 - (N * SEG) / 2, hy = H - 80, ha = Math.PI;
  for (let i = 0; i <= N * SUB; i++) path.push({ x: hx + i * (SEG / SUB), y: hy });
  let mode: 'hunt' | 'gape' | 'gulp' = 'hunt';
  let modeAt = 0;
  let gx = 0, gy = 0;
  let nextThrow = 0;
  let woke = false;
  const half = (): boolean => npc.hp / npc.maxHp < 0.5;

  const body = (): Pt[] => {
    const out: Pt[] = [];
    for (let i = 0; i < N; i++) out.push(path[Math.min(path.length - 1, i * SUB)]);
    return out;
  };
  const inMeal = (f: Fighter): boolean => meals.some((m) => m.f === f && !m.done);

  function throwRat(time: number, x: number, y: number): void {
    if (rats.length >= 4) return;
    const tx = clamp(x, 60, W - 60), ty = clamp(y, top + 40, H - 40);
    rats.push({ x: tx, y: ty, fx: npc.x, fy: npc.y - 20, at: time, flyMs: 900, landed: false, landAt: 0, target: null, seed: rng() * 10 });
    ctx.sfx('whoosh');
  }

  function land(r: Rat, time: number): void {
    r.landed = true; r.landAt = time;
    r.target = ctx.target({ x: r.x, y: r.y - 6, r: 18, passThrough: true, onStruck: (by) => kick(r, by) });
  }

  function kick(r: Rat, by: 'player' | 'npc'): void {
    if (!r.landed) return;
    const s = by === 'player' ? player : npc;
    const a = dist(s.x, s.y, r.x, r.y) < 4 ? rng() * Math.PI * 2 : Math.atan2(r.y - s.y, r.x - s.x);
    r.target?.remove(); r.target = null;
    r.fx = r.x; r.fy = r.y;
    r.x = clamp(r.x + Math.cos(a) * KICK, 60, W - 60); r.y = clamp(r.y + Math.sin(a) * KICK, top + 40, H - 40);
    r.landed = false; r.at = ctx.scene.time.now; r.flyMs = 450;
    ctx.sfx('boing');
    ctx.float(r.fx, r.fy - 26, 'KICKED', '#e8d8b0');
  }

  function dropRat(r: Rat): void {
    r.target?.remove();
    rats.splice(rats.indexOf(r), 1);
  }

  function swallow(f: Fighter, time: number): void {
    const m: Meal = { f, at: time, nextStun: 0, target: null, done: false };
    m.target = ctx.target({ x: f.x, y: f.y, r: 24, passThrough: true, onStruck: () => release(m, true) });
    meals.push(m);
    ctx.float(f.x, f.y - 46, 'SWALLOWED', '#e8c870');
    ctx.sfx('slime-splat');
  }

  function release(m: Meal, squeezed: boolean): void {
    if (m.done) return;
    m.done = true;
    m.target?.remove(); m.target = null;
    const held = ctx.scene.time.now - m.at;
    const dmg = Math.round((held / 500) * DIGEST) + (squeezed ? SQUEEZE : SPIT);
    const f = m.f;
    // Spat out a little beyond where it was, once the gut lets go of it (airborne lapses).
    tk.schedule(230, () => {
      ctx.hit(f, dmg, f.x, f.y);
      ctx.float(f.x, f.y - 44, squeezed ? 'SQUEEZED OUT' : 'SPAT OUT', '#e8c870');
    });
    ctx.sfx(squeezed ? 'hit-heavy' : 'splash');
    ctx.flash(f.x, f.y, VENOM);
  }

  function steer(tx: number, ty: number, speed: number, dt: number): void {
    const want = Math.atan2(ty - hy, tx - hx);
    ha += clamp(wrapAngle(want - ha), -TURN * dt, TURN * dt);
    hx = clamp(hx + Math.cos(ha) * speed * dt, 50, W - 50);
    hy = clamp(hy + Math.sin(ha) * speed * dt, top + 30, H - 30);
    if (dist(hx, hy, path[0].x, path[0].y) >= SEG / SUB) {
      path.unshift({ x: hx, y: hy });
      if (path.length > N * SUB + 1) path.pop();
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!woke && half()) { woke = true; ctx.banner('The python wakes — two rats at a time', '#e8c870'); ctx.sfx('roar'); }
      const speed = woke ? 150 : 118;
      if (nextThrow === 0) nextThrow = time + 1800;
      if (time >= nextThrow && alive(npc)) {
        const a = rng() * Math.PI * 2, r = 20 + rng() * 50;
        throwRat(time, player.x + Math.cos(a) * r, player.y + Math.sin(a) * r);
        if (woke) throwRat(time, 120 + rng() * (W - 240), top + 60 + rng() * (H - top - 120));
        nextThrow = time + (woke ? 3500 : 4300);
      }
      for (const r of [...rats]) {
        if (!r.landed && time - r.at >= r.flyMs) land(r, time);
        else if (r.landed && time - r.landAt > RAT_LIFE) dropRat(r);
      }

      // The head: hunt the nearest landed rat, gape at it, gulp.
      if (mode === 'hunt') {
        let best: Rat | null = null, bd = Infinity;
        for (const r of rats) { if (!r.landed) continue; const d = dist(r.x, r.y, hx, hy); if (d < bd) { bd = d; best = r; } }
        if (best) {
          steer(best.x, best.y, speed, dt);
          if (bd < 62) { mode = 'gape'; modeAt = time; gx = best.x; gy = best.y; ctx.sfx('screech'); }
        } else {
          const f = dist(player.x, player.y, hx, hy) < dist(npc.x, npc.y, hx, hy) ? player : npc;
          if (dist(f.x, f.y, hx, hy) > 130) steer(f.x, f.y, speed * 0.55, dt);
        }
      } else if (mode === 'gape') {
        ha += clamp(wrapAngle(Math.atan2(gy - hy, gx - hx) - ha), -TURN * dt, TURN * dt);
        if (time - modeAt >= GAPE_MS) {
          for (const r of [...rats]) if (r.landed && dist(r.x, r.y, gx, gy) < GULP_R) dropRat(r);
          for (const f of [player, npc]) {
            if (alive(f) && !inMeal(f) && !ctx.isAirborne(f) && dist(f.x, f.y, gx, gy) < GULP_R) swallow(f, time);
          }
          mode = 'gulp'; modeAt = time;
          ctx.sfx('snap');
        }
      } else if (time - modeAt >= 320) mode = 'hunt';

      // Meals ride down the body to the tail.
      const pts = body();
      for (const m of [...meals]) {
        if (m.done) { meals.splice(meals.indexOf(m), 1); continue; }
        if (!alive(m.f)) { release(m, false); continue; }
        const k = clamp((time - m.at) / CARRY_MS, 0, 1);
        const p = pts[Math.min(N - 1, Math.floor(k * (N - 1)))];
        ctx.airborne(m.f, 160);
        if (time >= m.nextStun) { ctx.stun(m.f, 320); m.nextStun = time + 260; }
        ctx.nudge(m.f, p.x - m.f.x, p.y - m.f.y);
        m.target?.moveTo(p.x, p.y);
        if (k >= 1) release(m, false);
      }

      // The coils stop every shot that meets them.
      for (let i = 2; i < N; i += 3) for (const s of ctx.shotsNear(pts[i].x, pts[i].y, 16)) s.block();
    },

    npcSeek() {
      if (!alive(player)) return null;
      if (mode === 'gape' && dist(npc.x, npc.y, gx, gy) < GULP_R + 40) {
        const a = Math.atan2(npc.y - gy, npc.x - gx);
        return { x: clamp(gx + Math.cos(a) * (GULP_R + 70), 60, W - 60), y: clamp(gy + Math.sin(a) * (GULP_R + 70), top + 40, H - 40) };
      }
      // A rat at your feet with the head still far off: get behind it and kick it onto you.
      for (const r of rats) {
        if (!r.landed || dist(r.x, r.y, player.x, player.y) > 170 || dist(r.x, r.y, hx, hy) < 160) continue;
        const a = Math.atan2(r.y - player.y, r.x - player.x);
        return { x: clamp(r.x + Math.cos(a) * 34, 60, W - 60), y: clamp(r.y + Math.sin(a) * 34, top + 40, H - 40) };
      }
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      let x = player.x + Math.cos(a) * 230, y = player.y + Math.sin(a) * 230;
      for (const r of rats) {
        if (!r.landed) continue;
        const d = dist(r.x, r.y, x, y);
        if (d < 130) { const b = Math.atan2(y - r.y, x - r.x); x = r.x + Math.cos(b) * 135; y = r.y + Math.sin(b) * 135; }
      }
      return { x: clamp(x, 60, W - 60), y: clamp(y, top + 40, H - 40) };
    },

    drawGround(g, time) {
      const pts = body();
      // The python's shadow along the floor.
      for (let i = 0; i < N; i += 2) shadow(g, pts[i].x, pts[i].y + 8, 30 - i * 0.5, 9, 0.22);
      // Rats' landing marks, then landed rats.
      for (const r of rats) {
        if (!r.landed) {
          const k = clamp((time - r.at) / r.flyMs, 0, 1);
          g.fillStyle(0x000000, 0.2 * k); g.fillEllipse(r.x, r.y + 3, 18 + k * 8, 7);
          g.lineStyle(1.5, FANG_LIT, 0.25 + k * 0.4); g.strokeCircle(r.x, r.y, 14 + (1 - k) * 12);
        }
      }
      if (mode === 'gape') {
        const k = clamp((time - modeAt) / GAPE_MS, 0, 1);
        g.fillStyle(MUD_DARK, 0.25); g.fillCircle(gx, gy, GULP_R);
        g.fillStyle(VENOM, 0.1 + k * 0.12);
        g.slice(gx, gy, GULP_R, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.fillPath();
        g.lineStyle(2.5, VENOM_LIT, 0.5 + k * 0.4); g.strokeCircle(gx, gy, GULP_R);
        for (let i = 0; i < 10; i++) {
          // The lower jaw's teeth chalked round the ring.
          const b = (i / 10) * Math.PI * 2 + time / 900;
          g.fillStyle(FANG_LIT, 0.4 + k * 0.4);
          g.fillTriangle(gx + Math.cos(b) * GULP_R, gy + Math.sin(b) * GULP_R, gx + Math.cos(b + 0.08) * GULP_R, gy + Math.sin(b + 0.08) * GULP_R,
            gx + Math.cos(b + 0.04) * (GULP_R - 9), gy + Math.sin(b + 0.04) * (GULP_R - 9));
        }
      }
      for (const r of rats) if (r.landed) drawRat(g, r.x, r.y, r.seed, time, false);
    },

    drawAir(g, time) {
      const pts = body();
      const bulge = meals.filter((m) => !m.done).map((m) => clamp((time - m.at) / CARRY_MS, 0, 1) * (N - 1));
      // Body from tail to head: overlapping discs, tapering, saddled.
      for (let i = N - 1; i >= 0; i--) {
        const p = pts[i];
        const taper = i < 3 ? 11 + i : 14 - (i / N) * 9;
        const swell = bulge.reduce((s, b) => s + Math.max(0, 1 - Math.abs(b - i) / 2.2) * 10, 0);
        const r = taper + swell;
        g.fillStyle(dim(PY, 0.4), 1); g.fillCircle(p.x, p.y + 2, r + 1.5);
        g.fillStyle(PY, 1); g.fillCircle(p.x, p.y, r);
        g.fillStyle(lit(PY, 0.2), 0.6); g.fillCircle(p.x - r * 0.25, p.y - r * 0.35, r * 0.45);
        if (i % 3 === 1 && i > 2) {
          const q = pts[i - 1];
          const a = Math.atan2(q.y - p.y, q.x - p.x) + Math.PI / 2;
          g.fillStyle(PY_SADDLE, 0.9);
          g.fillPoints([
            { x: p.x + Math.cos(a) * r * 0.8, y: p.y + Math.sin(a) * r * 0.8 },
            { x: p.x + Math.cos(a + 1.2) * r * 0.4, y: p.y + Math.sin(a + 1.2) * r * 0.4 },
            { x: p.x - Math.cos(a) * r * 0.8, y: p.y - Math.sin(a) * r * 0.8 },
            { x: p.x + Math.cos(a - 1.9) * r * 0.45, y: p.y + Math.sin(a - 1.9) * r * 0.45 },
          ], true);
          g.fillStyle(PY_BELLY, 0.5); g.fillCircle(p.x, p.y, r * 0.18);
        }
        if (swell > 6) {
          // Something inside, pushing at the skin.
          g.lineStyle(1.5, lit(PY, 0.45), 0.7); g.strokeCircle(p.x, p.y, r - 3);
          g.fillStyle(dim(PY, 0.25), 0.5); g.fillEllipse(p.x, p.y + 2, r * 0.9, r * 1.1);
          g.fillStyle(dim(PY, 0.35), 0.5); g.fillCircle(p.x, p.y - r * 0.5, r * 0.32);
        }
      }
      // Tail tip.
      const t0 = pts[N - 1], t1 = pts[N - 2];
      const ta = Math.atan2(t0.y - t1.y, t0.x - t1.x);
      g.fillStyle(PY, 1); g.fillTriangle(t0.x + Math.cos(ta + 1.6) * 5, t0.y + Math.sin(ta + 1.6) * 5, t0.x + Math.cos(ta - 1.6) * 5, t0.y + Math.sin(ta - 1.6) * 5, t0.x + Math.cos(ta) * 16, t0.y + Math.sin(ta) * 16);
      drawHead(g, time);
      // Rats in flight.
      for (const r of rats) {
        if (r.landed) continue;
        const k = clamp((time - r.at) / r.flyMs, 0, 1);
        const p = arcPoint(r.fx, r.fy, r.x, r.y, r.flyMs > 600 ? 120 : 50, k);
        drawRat(g, p.x, p.y, r.seed, time, true);
      }
    },

    drawHud(g, time) {
      // Bottom-left: the python's length, with any meal shown riding down it.
      const x0 = 24, y0 = H - 26, w = 180;
      g.fillStyle(0x0e140e, 0.7); g.fillRoundedRect(x0 - 10, y0 - 16, w + 44, 30, 8);
      for (let i = 0; i <= 18; i++) {
        const x = x0 + (i / 18) * w, r = 6 - (i / 18) * 3;
        g.fillStyle(i % 3 === 1 ? PY_SADDLE : PY, 1); g.fillCircle(x, y0 + Math.sin(time / 300 + i * 0.6) * 1.5, r);
      }
      g.fillStyle(PY, 1); g.fillEllipse(x0 - 4, y0, 14, 10);
      g.fillStyle(VENIN_EYE, 1); g.fillCircle(x0 - 7, y0 - 2, 1.4);
      for (const m of meals) {
        if (m.done) continue;
        const k = clamp((time - m.at) / CARRY_MS, 0, 1);
        g.fillStyle(m.f === player ? 0x9ad0ff : 0xff9a70, 1); g.fillCircle(x0 + k * w, y0, 7);
        g.lineStyle(1.5, 0xffffff, 0.8); g.strokeCircle(x0 + k * w, y0, 7);
      }
      // Rats waiting on the floor.
      const n = rats.filter((r) => r.landed).length;
      for (let i = 0; i < 4; i++) { g.fillStyle(i < n ? RAT_PINK : 0x2a2a22, 1); g.fillCircle(x0 + w + 18 + (i % 2) * 9, y0 - 5 + Math.floor(i / 2) * 10, 3.5); }
    },
  };

  /** The python's head: a broad wedge with heat-pits and gold eyes; open-jawed while it gapes. */
  function drawHead(g: G, time: number): void {
    const c = Math.cos(ha), s = Math.sin(ha), px = -s, py = c;
    const gape = mode === 'gape' ? clamp((time - modeAt) / GAPE_MS, 0, 1) : mode === 'gulp' ? 1 - clamp((time - modeAt) / 320, 0, 1) : 0;
    const L = 26 + gape * 12, Wd = 12;
    const at = (f: number, side: number): Pt => ({ x: hx + c * f + px * side, y: hy + s * f + py * side });
    if (gape > 0.05) {
      const open = gape * 0.9;
      const jaw = (side: number, col: number): void => {
        const ox = Math.cos(ha + side * open), oy = Math.sin(ha + side * open);
        g.fillStyle(col, 1);
        g.fillTriangle(hx + px * side * Wd * 0.7, hy + py * side * Wd * 0.7, hx - px * side * 3, hy - py * side * 3, hx + ox * L, hy + oy * L);
        for (let i = 1; i <= 4; i++) {
          const k = i / 5, bx = hx + ox * L * k, by = hy + oy * L * k;
          g.fillStyle(FANG_LIT, 1); g.fillTriangle(bx, by, bx + ox * 3, by + oy * 3, bx - side * px * 3 + ox, by - side * py * 3 + oy);
        }
      };
      g.fillStyle(0x6a2028, 1); g.fillCircle(hx + c * L * 0.4, hy + s * L * 0.4, 9 * gape + 3);
      jaw(1, PY); jaw(-1, dim(PY, 0.15));
    } else {
      g.fillStyle(dim(PY, 0.3), 1); g.fillPoints([at(-4, Wd + 1), at(L * 0.7, Wd * 0.8), at(L + 1, 0), at(L * 0.7, -Wd * 0.8), at(-4, -Wd - 1)], true);
      g.fillStyle(PY, 1); g.fillPoints([at(-2, Wd), at(L * 0.68, Wd * 0.75), at(L, 0), at(L * 0.68, -Wd * 0.75), at(-2, -Wd)], true);
      g.fillStyle(PY_SADDLE, 0.8); g.fillPoints([at(2, 3), at(L * 0.55, 1), at(L * 0.55, -1), at(2, -3)], true);
      // Heat pits along the lip.
      for (let i = 0; i < 4; i++) { const p = at(L * (0.5 + i * 0.12), (Wd * 0.7 - i * 2)); const q = at(L * (0.5 + i * 0.12), -(Wd * 0.7 - i * 2)); g.fillStyle(0x1a140a, 0.8); g.fillCircle(p.x, p.y, 1.2); g.fillCircle(q.x, q.y, 1.2); }
      if ((time / 500) % 1 < 0.2) { const m = at(L, 0); g.lineStyle(1.2, 0xd83048, 1); g.lineBetween(m.x, m.y, m.x + c * 9 + px * 2, m.y + s * 9 + py * 2); }
    }
    for (const side of [-1, 1]) {
      const e = at(L * 0.42, side * Wd * 0.62);
      g.fillStyle(VENIN_EYE, 1); g.fillCircle(e.x, e.y, 2.4);
      g.fillStyle(0x101010, 1); g.fillCircle(e.x + c * 0.5, e.y + s * 0.5, 1);
    }
    if (mode === 'gape') glow(g, hx, hy, 34, VENOM, 0.04, 3);
  }

  /** A fat pit-rat: grey body, pointed pink-nosed head, round ears, a long bald tail. */
  function drawRat(g: G, x: number, y: number, seed: number, time: number, flying: boolean): void {
    const a = flying ? time / 90 : Math.sin(time / 700 + seed) * 0.6 + seed;
    const c = Math.cos(a), s = Math.sin(a);
    if (!flying) shadow(g, x, y + 4, 20, 6, 0.3);
    g.lineStyle(1.6, RAT_PINK, 0.9);
    g.beginPath(); g.moveTo(x - c * 8, y - s * 4);
    for (let i = 1; i <= 5; i++) g.lineTo(x - c * (8 + i * 3.5) + Math.sin(time / 150 + i + seed) * 2, y - s * (4 + i * 1.8) + i * 0.6);
    g.strokePath();
    g.fillStyle(dim(RAT, 0.3), 1); g.fillEllipse(x, y + 1, 19, 11);
    g.fillStyle(RAT, 1); g.fillEllipse(x, y, 18, 10);
    g.fillStyle(lit(RAT, 0.2), 0.7); g.fillEllipse(x - 2, y - 2, 9, 4);
    const nx = x + c * 11, ny = y + s * 5;
    g.fillStyle(RAT, 1); g.fillTriangle(x + c * 4 - s * 4, y + s * 2 + c * 3, x + c * 4 + s * 4, y + s * 2 - c * 3, nx, ny);
    g.fillStyle(RAT_PINK, 1); g.fillCircle(nx, ny, 1.4);
    g.fillStyle(mixC(RAT, RAT_PINK, 0.5), 1); g.fillCircle(x + c * 4 - s * 3, y - 4, 2.4); g.fillCircle(x + c * 4 + s * 3, y - 4, 2.4);
    g.fillStyle(0x101010, 1); g.fillCircle(x + c * 7, y - 1 + s * 2, 1);
    if (!flying && (time / 380 + seed) % 1 < 0.3) {
      g.lineStyle(1, 0xf0e8d8, 0.6); g.lineBetween(nx + 3, ny - 5, nx + 6, ny - 8); g.lineBetween(nx + 4, ny - 2, nx + 8, ny - 3);
    }
  }
}

export const FALLEN_SWALLOW: GimmickDef = {
  id: ID,
  rules: 'The python gapes at the rats tossed at your feet and swallows all in the ring. Strike a rat to kick it; strike a bulge to squeeze it out.',
  make,
};
