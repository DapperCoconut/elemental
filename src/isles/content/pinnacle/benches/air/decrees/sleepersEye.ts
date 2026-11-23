import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { CLOUD, CLOUD_LIT, CLOUD_SHADE, GALE, GALE_CSS, GALE_LIT, OBS, hudPlate } from '../art';
import { type Who, WHO, alive, clampN, dist, fighterOf, stepOf } from './util';

/**
 * SEAT OF THE LONG SLEEP — Councilor Lethe Morrow (dream). *Decree of the Sleeper's Eye.*
 *
 * Highspire's debtors were laid down to sleep until others breathed their debt away. Over this
 * span the Sleeper dreams — a vast lidded eye in the cloud above the north rail. Its lashes
 * flutter (1.3s), then it OPENS for two seconds. Whatever moves under the open eye is counted
 * awake: 5 damage every 0.35s it keeps moving, and the eye's mark on it. Whoever keeps perfectly
 * still through a whole gaze is let rest: +6.
 *
 * Three pillow-clouds drift across the deck. Inside one you are under the covers — the eye cannot
 * see you move. A perfected sandman puts you to sleep (a sleeper does not move, so a sleeper is
 * safe) and runs for the covers on the flutter. The turn: moving is not a choice — anything that
 * knocks the councilor out of its cloud, or makes it dash, under the open eye, is a waking it pays for.
 */
const sleepersEye = (ctx: GimmickCtx): EncounterGimmick => {
  const CLOSED = ctx.hard ? 4600 : 5600;
  const FLUTTER = ctx.hard ? 1100 : 1300;
  const OPEN = 2000;
  const TICK = 350;
  const DMG = ctx.hard ? 6 : 5;
  const MOVE = 34;
  const PILLOW_R = 62;

  const top = ctx.top;
  const eye = { x: ctx.W / 2, y: top + 36 };
  let state: 'closed' | 'flutter' | 'open' = 'closed';
  let at = 0;
  const lastPos: Record<Who, Pt | null> = { player: null, npc: null };
  const speed: Record<Who, number> = { player: 0, npc: 0 };
  const nextTick: Record<Who, number> = { player: 0, npc: 0 };
  const stillAll: Record<Who, boolean> = { player: true, npc: true };
  const seenUntil: Record<Who, number> = { player: 0, npc: 0 };
  const pillows = [0, 1, 2].map((i) => ({ x: 180 + i * 300, y: top + 160 + (i % 2) * 220, vx: (i % 2 ? -1 : 1) * 22, vy: (i === 1 ? -1 : 1) * 14 }));

  const covered = (f: { x: number; y: number }): boolean => pillows.some((p) => dist(f.x, f.y, p.x, p.y) < PILLOW_R);
  const moving = (w: Who): boolean => speed[w] > MOVE || ctx.dashing(fighterOf(ctx, w));

  return {
    update(time, dt) {
      const d = stepOf(dt);
      if (at === 0) { at = time + 3200; ctx.banner('WHEN THE EYE OPENS, LIE STILL', GALE_CSS); }
      // Motion: a smoothed speed per fighter, read from where they were last frame.
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        const p = lastPos[w];
        if (p && d > 0) speed[w] = speed[w] * 0.6 + (dist(p.x, p.y, f.x, f.y) / d) * 0.4;
        lastPos[w] = { x: f.x, y: f.y };
      }
      // The pillows drift, bouncing off the edges of the span.
      for (const p of pillows) {
        p.x += p.vx * d; p.y += p.vy * d;
        if (p.x < 90 || p.x > ctx.W - 90) p.vx *= -1;
        if (p.y < top + 110 || p.y > ctx.H - 80) p.vy *= -1;
        p.x = clampN(p.x, 90, ctx.W - 90); p.y = clampN(p.y, top + 110, ctx.H - 80);
      }
      if (state === 'closed' && time >= at) { state = 'flutter'; at = time + ctx.tk.warn(FLUTTER); ctx.sfx('heartbeat'); }
      else if (state === 'flutter' && time >= at) {
        state = 'open'; at = time + OPEN;
        stillAll.player = true; stillAll.npc = true;
        nextTick.player = time; nextTick.npc = time;
        ctx.sfx('curse-cast');
      } else if (state === 'open') {
        for (const w of WHO) {
          const f = fighterOf(ctx, w);
          if (!alive(f) || covered(f)) continue;
          if (!moving(w)) continue;
          stillAll[w] = false;
          if (time >= nextTick[w]) {
            nextTick[w] = time + TICK;
            seenUntil[w] = time + 600;
            ctx.hit(f, DMG, f.x, f.y);
            if (time - (at - OPEN) < 500 || ctx.rng() < 0.3) ctx.float(f.x, f.y - 50, 'SEEN AWAKE', w === 'player' ? '#ff9a8a' : GALE_CSS);
          }
        }
        if (time >= at) {
          for (const w of WHO) {
            const f = fighterOf(ctx, w);
            if (alive(f) && stillAll[w]) { ctx.heal(f, 6); ctx.float(f.x, f.y - 50, 'RESTED', w === 'player' ? GALE_CSS : '#c9b0ff'); }
          }
          state = 'closed'; at = time + CLOSED;
          ctx.sfx('hush');
        }
      }
    },
    npcSeek() {
      if (state === 'closed' && at - ctx.scene.time.now > 1400) return null;
      const n = ctx.npc;
      // Under the covers before the lid lifts — or, once it is open, hold still where it stands.
      let best: Pt | null = null, bd = Infinity;
      for (const p of pillows) {
        const dd = dist(n.x, n.y, p.x, p.y);
        if (dd < bd) { bd = dd; best = { x: p.x, y: p.y }; }
      }
      if (state === 'open' && bd > PILLOW_R) return { x: n.x, y: n.y };
      return best;
    },
    drawGround(g, time) {
      // The pillow-clouds: soft billows on the deck, a sleepy glow under each.
      for (const p of pillows) {
        g.fillStyle(0x000000, 0.25); g.fillEllipse(p.x, p.y + 10, PILLOW_R * 2.1, PILLOW_R * 0.9);
        g.fillStyle(GALE, 0.06); g.fillCircle(p.x, p.y, PILLOW_R);
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2 + time / 4000;
          const r = PILLOW_R * 0.62 + Math.sin(time / 600 + i) * 3;
          g.fillStyle(CLOUD_SHADE, 0.55); g.fillCircle(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.7 + 6, 22);
        }
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2 + time / 4000;
          const r = PILLOW_R * 0.58 + Math.sin(time / 600 + i) * 3;
          g.fillStyle(CLOUD, 0.6); g.fillCircle(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.7, 19);
        }
        g.fillStyle(CLOUD_LIT, 0.4); g.fillCircle(p.x - 14, p.y - 12, 22);
        g.lineStyle(1.5, GALE, state === 'open' ? 0.7 : 0.3); g.strokeCircle(p.x, p.y, PILLOW_R);
        // A little "z" rising off it.
        const ph = (time / 1600 + p.x) % 1;
        g.lineStyle(1.5, GALE_LIT, 0.6 * (1 - ph));
        const zx = p.x + 20 + ph * 10, zy = p.y - 30 - ph * 30;
        g.lineBetween(zx, zy, zx + 8, zy); g.lineBetween(zx + 8, zy, zx, zy + 8); g.lineBetween(zx, zy + 8, zx + 8, zy + 8);
      }
      // The gaze: a cold wash over everything the open eye can see.
      if (state === 'open') {
        g.fillStyle(OBS.seam, 0.07); g.fillRect(0, top, ctx.W, ctx.H - top);
        for (let i = 0; i < 7; i++) {
          const a = Math.PI * (0.18 + i * 0.107);
          g.lineStyle(26, OBS.seamLit, 0.035);
          g.lineBetween(eye.x, eye.y, eye.x + Math.cos(a) * 900, eye.y + Math.sin(a) * 900);
        }
      }
    },
    drawAir(g, time) {
      // The Sleeper's eye, hung in the cloud over the north rail: lashes, a lid, an iris of the
      // King's violet — closed, trembling, then wide.
      const open = state === 'open' ? 1 : state === 'flutter' ? 0.12 + Math.abs(Math.sin(time / 70)) * 0.2 : 0;
      const ex = eye.x, ey = eye.y, rw = 150, rh = 46;
      for (let i = 0; i < 6; i++) {
        g.fillStyle(CLOUD_SHADE, 0.5); g.fillCircle(ex - rw - 10 + i * ((rw * 2 + 20) / 5), ey - 16 + Math.sin(i * 1.7) * 6, 28);
      }
      g.fillStyle(CLOUD, 0.55); g.fillEllipse(ex, ey - 6, rw * 2.4, rh * 1.6);
      if (open > 0.02) {
        g.fillStyle(0xe8ecff, 0.95); g.fillEllipse(ex, ey, rw * 2, rh * 2 * open);
        const look = state === 'open' ? clampN((ctx.player.x - ex) / 600, -1, 1) * rw * 0.45 : 0;
        const ir = Math.min(rh * open * 0.95, 40);
        g.fillStyle(OBS.seam, 1); g.fillCircle(ex + look, ey, ir);
        g.fillStyle(OBS.seamLit, 0.8); g.fillCircle(ex + look, ey, ir * 0.7);
        g.fillStyle(OBS.glass, 1); g.fillCircle(ex + look, ey, ir * 0.38);
        g.fillStyle(0xffffff, 0.9); g.fillCircle(ex + look - ir * 0.3, ey - ir * 0.3, ir * 0.16);
        g.lineStyle(3, OBS.glass, 1); g.strokeEllipse(ex, ey, rw * 2, rh * 2 * open);
      }
      // The lid's line and its lashes, curling down when shut, up when open.
      g.lineStyle(4, OBS.glass, 1);
      g.beginPath(); g.arc(ex, ey - rh * open * 0.2 - rh, rw * 1.04, Math.PI * 0.27, Math.PI * 0.73, false); g.strokePath();
      for (let i = 0; i < 9; i++) {
        const f = (i + 0.5) / 9;
        const lx = ex - rw + f * rw * 2;
        const ly = ey + (open > 0.05 ? -rh * open : 0) * Math.sin(f * Math.PI);
        const dirY = open > 0.05 ? -1 : 1;
        g.lineStyle(2.5, OBS.glass, 1);
        g.lineBetween(lx, ly, lx + (f - 0.5) * 16, ly + dirY * 14);
      }
      // People counted awake: the eye's violet mark over them.
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        if (!alive(f) || time > seenUntil[w]) continue;
        g.lineStyle(2, OBS.seamLit, 0.9); g.strokeEllipse(f.x, f.y - 46, 22, 10);
        g.fillStyle(OBS.seam, 1); g.fillCircle(f.x, f.y - 46, 4);
      }
      // People under the covers: a quilted hush over them.
      if (state !== 'closed') {
        for (const w of WHO) {
          const f = fighterOf(ctx, w);
          if (alive(f) && covered(f)) { g.fillStyle(GALE_LIT, 0.18); g.fillEllipse(f.x, f.y - 14, 50, 30); }
        }
      }
    },
    drawHud(g, time) {
      const cx = ctx.W / 2, cy = ctx.top + 20;
      if (state === 'closed' && at - time > 2400) return;
      hudPlate(g, cx, cy, 200, 24);
      const k = state === 'open' ? clampN((at - time) / OPEN, 0, 1) : state === 'flutter' ? clampN((at - time) / ctx.tk.warn(FLUTTER), 0, 1) : clampN((at - time) / 2400, 0, 1);
      const col = state === 'open' ? OBS.seamLit : state === 'flutter' ? 0xffffff : GALE;
      g.fillStyle(col, 1); g.fillRoundedRect(cx - 84, cy - 4, 168 * k, 8, 4);
      g.lineStyle(2, col, 1); g.strokeEllipse(cx - 92, cy, 10, state === 'open' ? 8 : 2);
    },
  };
};

export const SLEEPERS_EYE: GimmickDef = {
  id: 'bench-air-sleepers-eye',
  rules: 'Whatever moves beneath the Sleeper\'s open eye is counted awake and taxed; the still are let rest. The pillow-clouds hide you.',
  make: sleepersEye,
};
