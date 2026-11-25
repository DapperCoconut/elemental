import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, Rect, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { fallenId } from '../../../../meteor/spec';
import { Clock, S, alive, clamp, dist, drawCloud, drawRainSheet, jit } from '../util';

/**
 * POSTED AT DAWN — Hester Vane, Forecast-Crier (fate).
 *
 * "Today's forecast is posted at dawn. The forecast is not an opinion." In the star's telling the
 * crier who chalks it up on the board is the one who makes the weather keep to it. Here she posts
 * a forecast every few seconds, chalking it stroke by stroke on the slate board in the corner, and
 * then the yard is fined for every breach of it, by the sky:
 *
 * - FLAT CALM — none to stir: anyone who moves while it holds is struck.
 * - A QUIET NIGHT — no thunder: anyone who casts while it holds is struck and silenced.
 * - SQUALLS — keep under cover: rain hammers everyone not under one of the striped awnings.
 * - GALE FROM THE WEST / EAST: everyone is driven downwind; pinned on the lee wall, you are battered.
 *
 * The forecast binds both fighters, and Hester cannot stop her own hands casting under a quiet
 * night. The exploit: STRIKE the board while she is still chalking and you smudge it — the forecast
 * then binds only your foe. Past half the Prince revises: two forecasts posted at once.
 */

type Side = 'player' | 'npc';
type Kind = 'calm' | 'quiet' | 'squall' | 'gale';

interface Posting {
  kinds: Kind[];
  postAt: number; holdAt: number; endAt: number;
  exempt: Side | null;
  awnings: Rect[];
  dir: 1 | -1;
}

const CALL: Record<Kind, string> = {
  calm: 'FLAT CALM — none to stir',
  quiet: 'A QUIET NIGHT — no thunder',
  squall: 'SQUALLS — keep under cover',
  gale: 'GALE',
};

export const FALLEN_FORECAST: GimmickDef = {
  id: fallenId('stormeye', 'forecast'),
  rules: 'The crier posts a forecast — calm, quiet, squalls or gale — and the sky fines whoever breaks it. Strike her board mid-chalk to bind only your foe.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, rng } = ctx;
    const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
    const BOARD = { x: 96, y: top + 96 };
    const AWNING_SPOTS: Pt[] = [
      { x: 300, y: top + 150 }, { x: W / 2, y: top + 260 }, { x: W - 220, y: top + 140 },
      { x: 260, y: H - 120 }, { x: W - 260, y: H - 130 }, { x: W / 2 + 40, y: H - 90 },
    ];
    const postMs = ctx.tk.warn(2300);
    const holdMs = 3600;
    let now = 0;
    let posting: Posting | null = null;
    let nextPost = -1;
    let revised = false;
    let tickAt = 0;
    const lastPos: Record<Side, Pt> = { player: { x: 0, y: 0 }, npc: { x: 0, y: 0 } };
    const lastFine: Record<Side, number> = { player: -9999, npc: -9999 };

    const holding = (p: Posting | null, time: number): p is Posting => !!p && time >= p.holdAt && time < p.endAt;
    const has = (k: Kind): boolean => !!posting && posting.kinds.includes(k);
    const bound = (side: Side): boolean => !!posting && posting.exempt !== side;
    const covered = (f: Fighter): boolean => !!posting && posting.awnings.some((r) => f.x > r.x && f.x < r.x + r.w && f.y > r.y && f.y < r.y + r.h);
    const fine = (side: Side, dmg: number, color: number): void => {
      const f = fighterOf(side);
      ctx.hit(f, dmg, f.x, f.y);
      ctx.flash(f.x, f.y - 20, color);
      lastFine[side] = now;
    };

    const board: StrikeTarget = ctx.target({
      x: BOARD.x, y: BOARD.y - 40, r: 32,
      onStruck: (by) => {
        if (!posting || now >= posting.holdAt || posting.exempt) return;
        posting.exempt = by;
        ctx.sfx('whoosh');
        ctx.float(BOARD.x, BOARD.y - 100, by === 'player' ? 'SMUDGED' : 'SHE REWRITES IT', by === 'player' ? '#a8f0b0' : '#ff6a5a');
      },
    });

    const post = (time: number): void => {
      const pool: Kind[] = ['calm', 'quiet', 'squall', 'gale'];
      const first = pool[Math.floor(rng() * pool.length)];
      const kinds: Kind[] = [first];
      if (revised) {
        const rest = pool.filter((k) => k !== first && !(first === 'calm' && k === 'gale') && !(first === 'gale' && k === 'calm'));
        kinds.push(rest[Math.floor(rng() * rest.length)]);
      }
      const spots = AWNING_SPOTS.slice().sort(() => rng() - 0.5).slice(0, 3);
      const dir: 1 | -1 = rng() < 0.5 ? 1 : -1;
      posting = {
        kinds, postAt: time, holdAt: time + postMs, endAt: time + postMs + holdMs, exempt: null, dir,
        awnings: spots.map((p) => ({ x: p.x - 80, y: p.y - 50, w: 160, h: 100 })),
      };
      const words = kinds.map((k) => (k === 'gale' ? `GALE FROM THE ${dir > 0 ? 'WEST' : 'EAST'}` : CALL[k])).join('  ·  ');
      ctx.banner(words, '#e4e8f0');
      ctx.sfx('countdown-tick');
    };

    const onCast = (side: Side): void => {
      if (!holding(posting, now) || !has('quiet') || !bound(side)) return;
      if (now - lastFine[side] < 450) return;
      fine(side, 7, S.boltGlow);
      ctx.silence(fighterOf(side), 1200);
      ctx.sfx('hush');
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        now = time;
        if (nextPost < 0) { nextPost = time + 1500; tickAt = time; }
        if (dt === 0) return;
        if (!revised && ctx.npc.hp < ctx.npc.maxHp * 0.5) { revised = true; ctx.banner('The Prince revises the forecast', '#ffd77a'); ctx.sfx('judgement'); }
        if (time >= nextPost && (!posting || time >= posting.endAt)) { post(time); nextPost = time + postMs + holdMs + (revised ? 900 : 1600); }
        if (posting && time >= posting.holdAt && time - posting.holdAt < 30) { ctx.sfx('countdown-go'); for (const s of ['player', 'npc'] as Side[]) lastPos[s] = { x: fighterOf(s).x, y: fighterOf(s).y }; }
        if (!holding(posting, time)) return;
        const p = posting;

        if (p.kinds.includes('gale')) {
          for (const side of ['player', 'npc'] as Side[]) if (bound(side) && alive(fighterOf(side))) ctx.nudge(fighterOf(side), p.dir * 150 * dt, 0);
        }
        if (time < tickAt) return;
        tickAt = time + 500;
        for (const side of ['player', 'npc'] as Side[]) {
          const f = fighterOf(side);
          if (!alive(f) || !bound(side)) { lastPos[side] = { x: f.x, y: f.y }; continue; }
          if (p.kinds.includes('calm') && dist(f.x, f.y, lastPos[side].x, lastPos[side].y) > 26) { fine(side, 6, S.bolt); ctx.sfx('zap'); }
          if (p.kinds.includes('squall') && !covered(f)) {
            fine(side, 4, S.rain);
            if (side === 'player') ctx.tk.slowPlayer(0.75, 600);
          }
          if (p.kinds.includes('gale') && (p.dir > 0 ? f.x > W - 80 : f.x < 80)) { fine(side, 5, S.cloudLit); ctx.sfx('gust'); }
          lastPos[side] = { x: f.x, y: f.y };
        }
      },

      onPlayerCast() { onCast('player'); },
      onNpcCast() { onCast('npc'); },

      npcSeek(): Pt | null {
        const p = posting;
        if (!p || now >= p.endAt || p.exempt === 'npc') return null;
        const n = ctx.npc;
        if (p.kinds.includes('squall')) {
          let best: Rect | null = null;
          for (const r of p.awnings) if (!best || dist(r.x + r.w / 2, r.y + r.h / 2, n.x, n.y) < dist(best.x + best.w / 2, best.y + best.h / 2, n.x, n.y)) best = r;
          if (best) return { x: best.x + best.w / 2, y: best.y + best.h / 2 };
        }
        if (p.kinds.includes('gale')) return { x: p.dir > 0 ? 180 : W - 180, y: clamp(n.y, top + 60, H - 60) };
        if (p.kinds.includes('calm') && now >= p.holdAt - 300) return { x: n.x, y: n.y };
        return null;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        const p = posting;
        if (!p || time >= p.endAt) return;
        const live = time >= p.holdAt;
        // Awnings throw their dry shadows (marked out in chalk while she is still posting).
        if (p.kinds.includes('squall')) {
          for (const r of p.awnings) {
            g.fillStyle(0x000000, live ? 0.28 : 0.12); g.fillRect(r.x, r.y + 10, r.w, r.h - 10);
            g.lineStyle(2, 0xf4f4f0, live ? 0.25 : 0.6); g.strokeRect(r.x, r.y, r.w, r.h);
          }
        }
        // The calm: a chalk ring round each bound fighter's feet — where they must stay.
        if (p.kinds.includes('calm') && live) {
          for (const side of ['player', 'npc'] as Side[]) {
            if (!bound(side)) continue;
            const q = lastPos[side];
            g.lineStyle(2, 0xf4f4f0, 0.7); g.strokeCircle(q.x, q.y, 26);
            for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.lineBetween(q.x + Math.cos(a) * 26, q.y + Math.sin(a) * 26, q.x + Math.cos(a) * 32, q.y + Math.sin(a) * 32); }
          }
        }
        // The gale's lee wall, glowing where it batters.
        if (p.kinds.includes('gale')) {
          const x = p.dir > 0 ? W - 80 : 0;
          g.fillStyle(S.galeLit, live ? 0.22 : 0.1); g.fillRect(x, top, 80, H - top);
          if (live) for (let i = 0; i < 26; i++) {
            const y = top + jit(71, i) * (H - top);
            const xx = (jit(72, i) * W + time * 0.6 * p.dir * (0.7 + jit(73, i))) % W;
            const xw = xx < 0 ? xx + W : xx;
            g.lineStyle(1.5, S.cloudLit, 0.4); g.lineBetween(xw, y, xw + p.dir * 34, y + 2);
          }
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        const p = posting;
        // The board: a slate on two legs with a timber frame, a brass plate, the crier's chalk-tray —
        // and today's weather chalked on it as pictures, a stroke at a time.
        const bx = BOARD.x, by = BOARD.y;
        g.fillStyle(0x000000, 0.3); g.fillEllipse(bx, by + 2, 80, 14);
        g.fillStyle(S.timber, 1); g.fillRect(bx - 34, by - 70, 5, 70); g.fillRect(bx + 29, by - 70, 5, 70);
        g.fillStyle(S.timberLit, 1); g.fillRect(bx - 42, by - 100, 84, 64);
        g.fillStyle(0x1c2026, 1); g.fillRect(bx - 38, by - 96, 76, 56);
        g.fillStyle(S.brass, 1); g.fillRect(bx - 20, by - 108, 40, 9);
        g.fillStyle(S.brassDark, 1); g.fillRect(bx - 16, by - 105, 32, 2);
        g.fillStyle(S.timberLit, 1); g.fillRect(bx - 40, by - 38, 80, 5);
        g.fillStyle(0xf4f4f0, 1); g.fillRect(bx + 14, by - 40, 9, 3);
        if (p && time < p.endAt) {
          const reveal = clamp((time - p.postAt) / (p.holdAt - p.postAt), 0, 1);
          const n = p.kinds.length;
          p.kinds.forEach((k, i) => {
            const cx = bx + (n === 1 ? 0 : (i - 0.5) * 36), cy = by - 68;
            const sc = n === 1 ? 1 : 0.72;
            drawIcon(g, k, cx, cy, sc, reveal, p.dir, time);
          });
          if (p.exempt) {
            // The smudge: a grey thumb-smear dragged through the chalk.
            for (let i = 0; i < 5; i++) { g.fillStyle(0x9aa0a8, 0.4); g.fillEllipse(bx - 26 + i * 13, by - 70 + Math.sin(i) * 6, 22, 9); }
          }
          // The countdown bead along the frame's foot.
          const total = p.endAt - p.postAt;
          const at = clamp((time - p.postAt) / total, 0, 1);
          g.fillStyle(time < p.holdAt ? 0xf4f4f0 : S.red, 1); g.fillCircle(bx - 40 + 80 * at, by - 36, 3);
        }

        if (!p || time < p.holdAt || time >= p.endAt) return;
        // The squall: rain over the yard, and the striped oilskin awnings overhead.
        if (p.kinds.includes('squall')) {
          drawRainSheet(g, 0, top, W, H - top, time / 1000, 1.4, 0.45, 0.3, 11);
          for (const r of p.awnings) {
            const ay = r.y - 30;
            g.fillStyle(S.timber, 1); g.fillRect(r.x + 4, ay, 4, r.h + 30); g.fillRect(r.x + r.w - 8, ay, 4, r.h + 30);
            for (let s = 0; s < 8; s++) {
              g.fillStyle(s % 2 ? S.oilskin : S.oilskinDark, 0.92);
              g.fillRect(r.x + (s * r.w) / 8, ay, r.w / 8 + 0.5, 34);
            }
            for (let s = 0; s < 8; s++) { g.fillStyle(s % 2 ? S.oilskin : S.oilskinDark, 0.92); g.fillTriangle(r.x + (s * r.w) / 8, ay + 34, r.x + ((s + 1) * r.w) / 8, ay + 34, r.x + ((s + 0.5) * r.w) / 8, ay + 42); }
            g.fillStyle(0xffffff, 0.25); g.fillRect(r.x, ay, r.w, 3);
            for (let i = 0; i < 6; i++) { const ph = (time / 500 + i / 6) % 1; g.fillStyle(S.rain, 0.7 * (1 - ph)); g.fillCircle(r.x + 10 + i * 28, ay + 42 + ph * 22, 2); }
          }
        }
        // A quiet night: a crossed bell hung over each bound head.
        if (p.kinds.includes('quiet')) {
          for (const side of ['player', 'npc'] as Side[]) {
            if (!bound(side)) continue;
            const f = fighterOf(side);
            drawIcon(g, 'quiet', f.x, f.y - 70, 0.5, 1, 1, time);
          }
        }
        if (p.kinds.includes('calm')) {
          drawCloud(g, W / 2, top + 30, 70, 0.25, S.cloudLit, 4);
        }
      },

      drawHud(g: Phaser.GameObjects.Graphics, time: number) {
        const p = posting;
        if (!p || time >= p.endAt) return;
        const cx = W / 2, y = H - 24;
        g.fillStyle(0x000000, 0.45); g.fillRoundedRect(cx - 90, y - 16, 180, 32, 8);
        p.kinds.forEach((k, i) => drawIcon(g, k, cx - 66 + i * 26, y + 8, 0.42, 1, p.dir, time));
        const live = time >= p.holdAt;
        const k = live ? 1 - (time - p.holdAt) / (p.endAt - p.holdAt) : (time - p.postAt) / (p.holdAt - p.postAt);
        g.fillStyle(S.slateDark, 1); g.fillRect(cx - 20, y - 4, 96, 8);
        g.fillStyle(live ? S.red : 0xf4f4f0, 1); g.fillRect(cx - 20, y - 4, 96 * clamp(k, 0, 1), 8);
        if (p.exempt) { g.fillStyle(p.exempt === 'player' ? 0xa8f0b0 : S.red, 1); g.fillCircle(cx + 84, y, 4); }
        if (revised) { g.fillStyle(S.brass, 1); g.fillRect(cx - 86, y - 14, 6, 6); }
      },

      destroy() { board.remove(); },
    };
  },
};

/**
 * One forecast in chalk, as a picture: a limp pennant on a still pole (calm), a bell struck through
 * (quiet), a cloud raining on a roof (squalls), three streaming wind-arrows (gale). `reveal` 0–1
 * is how much of it has been chalked; `x,y` is its centre.
 */
function drawIcon(g: Phaser.GameObjects.Graphics, k: Kind, x: number, y: number, s: number, reveal: number, dir: 1 | -1, time: number): void {
  const a = 0.25 + 0.75 * reveal;
  const chalk = 0xf4f4f0;
  g.lineStyle(2 * Math.max(0.6, s), chalk, a);
  if (k === 'calm') {
    g.lineBetween(x - 8 * s, y + 16 * s, x - 8 * s, y - 16 * s);
    if (reveal > 0.3) g.strokeTriangle(x - 8 * s, y - 16 * s, x - 8 * s, y - 2 * s, x - 2 * s, y - 6 * s);
    if (reveal > 0.6) g.lineBetween(x - 16 * s, y + 16 * s, x + 16 * s, y + 16 * s);
  } else if (k === 'quiet') {
    g.beginPath(); g.arc(x, y - 2 * s, 10 * s, Math.PI, 0, false); g.strokePath();
    g.lineBetween(x - 10 * s, y - 2 * s, x - 13 * s, y + 9 * s); g.lineBetween(x + 10 * s, y - 2 * s, x + 13 * s, y + 9 * s);
    g.lineBetween(x - 14 * s, y + 9 * s, x + 14 * s, y + 9 * s);
    g.fillStyle(chalk, a); g.fillCircle(x, y + 12 * s, 2.5 * s);
    if (reveal > 0.6) { g.lineStyle(2.5 * Math.max(0.6, s), 0xff6a5a, a); g.lineBetween(x - 15 * s, y - 14 * s, x + 15 * s, y + 16 * s); }
  } else if (k === 'squall') {
    g.strokeEllipse(x - 5 * s, y - 10 * s, 18 * s, 12 * s); g.strokeEllipse(x + 6 * s, y - 12 * s, 16 * s, 12 * s);
    if (reveal > 0.3) for (let i = 0; i < 4; i++) { const ox = x - 10 * s + i * 7 * s; const ph = (time / 300 + i * 0.3) % 1; g.lineBetween(ox, y - 2 * s + ph * 4 * s, ox - 3 * s, y + 6 * s + ph * 4 * s); }
    if (reveal > 0.6) { g.lineBetween(x - 14 * s, y + 18 * s, x, y + 10 * s); g.lineBetween(x, y + 10 * s, x + 14 * s, y + 18 * s); }
  } else {
    for (let i = 0; i < 3; i++) {
      if (reveal < i * 0.3) break;
      const yy = y - 10 * s + i * 10 * s;
      const x0 = x - dir * 15 * s, x1 = x + dir * 13 * s;
      g.lineBetween(x0, yy, x1, yy);
      g.lineBetween(x1, yy, x1 - dir * 5 * s, yy - 4 * s); g.lineBetween(x1, yy, x1 - dir * 5 * s, yy + 4 * s);
    }
  }
}
