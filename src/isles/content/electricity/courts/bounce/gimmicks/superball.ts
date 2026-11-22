import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, Striker } from '../../../../../IslesTypes';
import { glow, lit } from '../../../../../art/IsleArt';
import { superball } from '../art';
import { LATEX_LIT, TOY_BLUE, TOY_RED, TOY_VIOLET, TOY_YELLOW } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Superball — Pitcher Ricochet.
 *
 * One superball, and the whole court is its wall. It never slows: every wall it strikes sends
 * it back faster. Strike it and you *send* it — straight on, away from you, and it is yours
 * (it wears your colour). Walk into it and it only bounces off you. A ball that is somebody else's and moving fast enough bowls you over:
 * the faster it is going, the harder it hits, and it comes off you slower but still theirs.
 *
 * So the game is angles. Get behind the ball, send it off a wall so it comes round to him.
 * Ricochet is a gravity man: every so often he presses a *dimple* into the floor — a well the
 * ball curves into as it passes — to bend his shots round to you. The dimple bends yours too.
 */

const BALL_R = 14;
const BASE_SPEED = 260;
const LIVE_SPEED = 300;
const KICK_SPEED = 430;
const WELL_R = 210;

type Owner = 'none' | 'p' | 'n';
interface Well { x: number; y: number; warnAt: number; liveAt: number; until: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const X0 = 36, X1 = W - 36, Y0 = top + 26, Y1 = H - 30;
  const cap = ctx.hard ? 860 : 760;
  const a0 = rng() * Math.PI * 2;
  const ball = { x: W / 2, y: (top + H) / 2, vx: Math.cos(a0) * BASE_SPEED, vy: Math.sin(a0) * BASE_SPEED, owner: 'none' as Owner, spin: 0 };
  const trail: Pt[] = [];
  const touchCd = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let wells: Well[] = [];
  const wellEvery = ctx.hard ? 6200 : 8000;
  let nextWell = 0;
  let wallFx: { x: number; y: number; at: number }[] = [];
  let started = false;

  const speed = () => Math.hypot(ball.vx, ball.vy);
  const setSpeed = (s: number) => { const k = s / (speed() || 1); ball.vx *= k; ball.vy *= k; };
  const ownerOf = (f: Fighter): Owner => (f === player ? 'p' : 'n');
  const colorOf = (o: Owner) => (o === 'p' ? TOY_BLUE : o === 'n' ? TOY_RED : TOY_YELLOW);
  const dangerTo = (f: Fighter) => ball.owner !== 'none' && ball.owner !== ownerOf(f) && speed() >= LIVE_SPEED;

  /** Struck: sent straight on from the striker, faster, and now theirs. */
  const sendCd = new Map<Striker, number>([['player', 0], ['npc', 0]]);
  function send(by: Striker): void {
    const f = by === 'player' ? player : npc;
    const time = ctx.scene.time.now;
    if (!alive(f) || time < (sendCd.get(by) ?? 0)) return;
    sendCd.set(by, time + 250);
    const d = dist(f.x, f.y, ball.x, ball.y);
    const prev = speed();
    ball.vx = (ball.x - f.x) / (d || 1); ball.vy = (ball.y - f.y) / (d || 1);
    setSpeed(Math.max(KICK_SPEED, Math.min(cap, prev * 1.05)));
    ball.owner = ownerOf(f);
    ctx.float(ball.x, ball.y - 30, 'SENT', f === player ? '#9ad0ff' : '#ffa0a0');
    ctx.sfx('whoosh');
  }
  const hitBox = ctx.target({ x: ball.x, y: ball.y, r: BALL_R + 4, onStruck: send });

  function wallHit(x: number, y: number, time: number): void {
    setSpeed(Math.min(cap, speed() * 1.12));
    wallFx.push({ x, y, at: time });
    ctx.sfx('boing');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextWell = time + 4000; }

      // Ricochet's dimple.
      if (time >= nextWell && alive(player) && alive(npc)) {
        nextWell = time + wellEvery;
        const x = clamp((ball.x + player.x) / 2 + (rng() - 0.5) * 80, 120, W - 120);
        const y = clamp((ball.y + player.y) / 2 + (rng() - 0.5) * 80, top + 100, H - 80);
        wells.push({ x, y, warnAt: time, liveAt: time + 900, until: time + 900 + (ctx.hard ? 4800 : 4000) });
        ctx.banner('RICOCHET PRESSES A DIMPLE', '#d0b0ff');
        ctx.sfx('gravity-slam');
      }
      wells = wells.filter((w) => time < w.until);
      for (const w of wells) {
        if (time < w.liveAt) continue;
        const d = dist(ball.x, ball.y, w.x, w.y);
        if (d < WELL_R && d > 8) {
          const pull = 1500 * (1 - d / WELL_R);
          ball.vx += ((w.x - ball.x) / d) * pull * dt;
          ball.vy += ((w.y - ball.y) / d) * pull * dt;
        }
        for (const f of [player, npc]) {
          const fd = dist(f.x, f.y, w.x, w.y);
          if (alive(f) && fd < WELL_R * 0.6 && fd > 10) ctx.nudge(f, ((w.x - f.x) / fd) * 40 * dt, ((w.y - f.y) / fd) * 40 * dt);
        }
      }
      if (speed() > cap) setSpeed(cap);
      if (speed() < BASE_SPEED * 0.8) setSpeed(BASE_SPEED * 0.8);

      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      ball.spin += speed() * dt * 0.03;
      if (ball.x < X0 + BALL_R) { ball.x = X0 + BALL_R; ball.vx = Math.abs(ball.vx); wallHit(X0, ball.y, time); }
      if (ball.x > X1 - BALL_R) { ball.x = X1 - BALL_R; ball.vx = -Math.abs(ball.vx); wallHit(X1, ball.y, time); }
      if (ball.y < Y0 + BALL_R) { ball.y = Y0 + BALL_R; ball.vy = Math.abs(ball.vy); wallHit(ball.x, Y0, time); }
      if (ball.y > Y1 - BALL_R) { ball.y = Y1 - BALL_R; ball.vy = -Math.abs(ball.vy); wallHit(ball.x, Y1, time); }
      hitBox.moveTo(ball.x, ball.y);
      trail.unshift({ x: ball.x, y: ball.y });
      if (trail.length > 10) trail.pop();

      for (const f of [player, npc]) {
        if (!alive(f) || time < (touchCd.get(f) ?? 0)) continue;
        const d = dist(f.x, f.y, ball.x, ball.y);
        if (d > BALL_R + 20) continue;
        touchCd.set(f, time + 380);
        const nx = (ball.x - f.x) / (d || 1), ny = (ball.y - f.y) / (d || 1);
        if (dangerTo(f)) {
          const s = speed();
          const dmg = Math.round(5 + (s - LIVE_SPEED) / 45) + (ctx.hard ? 2 : 0);
          ctx.hit(f, dmg, f.x, f.y);
          const ka = Math.atan2(ball.vy, ball.vx);
          ctx.nudge(f, Math.cos(ka) * (50 + s * 0.12), Math.sin(ka) * (50 + s * 0.12));
          if (s > 600) ctx.stun(f, 320);
          ctx.float(f.x, f.y - 46, s > 600 ? 'BOWLED OVER' : 'THWACK', '#ffd080');
          ctx.sfx('hit-heavy');
          // It comes off you slower, still theirs.
          const dot = ball.vx * -nx + ball.vy * -ny;
          ball.vx -= 2 * dot * -nx; ball.vy -= 2 * dot * -ny;
          setSpeed(Math.max(BASE_SPEED, s * 0.65));
          ball.x = f.x + nx * (BALL_R + 22); ball.y = f.y + ny * (BALL_R + 22);
        } else {
          // Walked into: it only bounces off you, nobody's change of hands.
          const dot = ball.vx * nx + ball.vy * ny;
          if (dot < 0) { ball.vx -= 2 * dot * nx; ball.vy -= 2 * dot * ny; }
          ball.x = f.x + nx * (BALL_R + 22); ball.y = f.y + ny * (BALL_R + 22);
          ctx.sfx('boing');
        }
      }
      wallFx = wallFx.filter((w) => time - w.at < 400);
    },

    npcSeek() {
      const live = dangerTo(npc);
      if (live) {
        // Out of its path: step sideways off the ball's line.
        const a = Math.atan2(ball.vy, ball.vx);
        const side = ((npc.x - ball.x) * -Math.sin(a) + (npc.y - ball.y) * Math.cos(a)) >= 0 ? 1 : -1;
        return { x: clamp(npc.x - Math.sin(a) * side * 120, 60, W - 60), y: clamp(npc.y + Math.cos(a) * side * 120, top + 50, H - 40) };
      }
      if (ball.owner === 'n' && speed() >= LIVE_SPEED) return { x: clamp(player.x + 140, 60, W - 60), y: clamp(player.y, top + 50, H - 40) };
      // Behind the ball from you, in reach to strike it your way.
      const a = Math.atan2(player.y - ball.y, player.x - ball.x);
      return { x: clamp(ball.x - Math.cos(a) * (BALL_R + 32), 50, W - 50), y: clamp(ball.y - Math.sin(a) * (BALL_R + 32), top + 40, H - 30) };
    },

    drawGround(g, time) {
      // The court: painted lines.
      g.lineStyle(3, LATEX_LIT, 0.25);
      g.strokeRect(X0, Y0, X1 - X0, Y1 - Y0);
      g.lineBetween(W / 2, Y0, W / 2, Y1);
      g.strokeCircle(W / 2, (Y0 + Y1) / 2, 60);
      for (const w of wells) {
        const k = clamp((time - w.warnAt) / (w.liveAt - w.warnAt), 0, 1);
        const live = time >= w.liveAt;
        const fade = clamp((w.until - time) / 500, 0, 1);
        for (let r = 1; r <= 5; r++) {
          const rr = (WELL_R * r) / 5 * (live ? 1 : k);
          const spin = live ? ((time / 900 + r * 0.2) % 1) : 0;
          g.lineStyle(2, TOY_VIOLET, (0.15 + (5 - r) * 0.08) * fade);
          g.strokeEllipse(w.x, w.y, rr * 2 * (1 - spin * 0.15), rr * 1.3 * (1 - spin * 0.15));
        }
        g.fillStyle(0x1a0a2a, 0.35 * fade); g.fillCircle(w.x, w.y, 26);
        g.fillStyle(TOY_VIOLET, 0.25 * fade); g.fillCircle(w.x, w.y, 12);
      }
      // The ball's shadow.
      g.fillStyle(0x000000, 0.3); g.fillEllipse(ball.x + 4, ball.y + BALL_R + 4, BALL_R * 2, BALL_R * 0.7);
      for (const w of wallFx) {
        const k = (time - w.at) / 400;
        g.lineStyle(4 * (1 - k), LATEX_LIT, 1 - k); g.strokeCircle(w.x, w.y, 10 + k * 30);
      }
    },

    drawAir(g) {
      const s = speed();
      const c = colorOf(ball.owner);
      const hot = s >= LIVE_SPEED && ball.owner !== 'none';
      trail.forEach((p, i) => {
        const k = 1 - i / trail.length;
        g.fillStyle(c, (hot ? 0.35 : 0.15) * k); g.fillCircle(p.x, p.y, BALL_R * (0.4 + k * 0.6));
      });
      if (hot) glow(g, ball.x, ball.y, BALL_R + 14 + (s - LIVE_SPEED) / 30, lit(c, 0.3), 0.06, 3);
      superball(g, ball.x, ball.y, BALL_R, c, ball.spin);
      if (s > 600) { g.lineStyle(2, 0xffffff, 0.7); g.strokeCircle(ball.x, ball.y, BALL_R + 4); }
    },

    drawHud(g) {
      // The ball's speed, in pips.
      const s = speed();
      const n = 10;
      const k = clamp((s - BASE_SPEED * 0.8) / (cap - BASE_SPEED * 0.8), 0, 1);
      const x0 = W / 2 - n * 11, y = top + 12;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x0 - 8, y - 8, n * 22 + 14, 18, 6);
      for (let i = 0; i < n; i++) {
        const on = k * n > i;
        g.fillStyle(on ? colorOf(ball.owner) : 0x3a3a48, 1); g.fillCircle(x0 + i * 22 + 4, y + 1, on ? 6 : 4);
      }
    },
  };
}

export const SUPERBALL: GimmickDef = {
  id: 'bounce-superball',
  rules: 'A superball speeds up off every wall. Strike it to send it — it becomes yours. Someone else\'s fast ball bowls you over. Ricochet\'s dimples bend it.',
  make,
};
