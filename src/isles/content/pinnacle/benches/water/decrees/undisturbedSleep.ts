import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { OBS, councilMask } from '../../../../../art/PinnacleArt';
import { sleeper } from '../art';
import { TIDE, TIDE_LIT, TIDE_PALE } from '../palette';
import { type Who, WHO, alive, clamp, dist, fighterOf, stepDt } from './util';

/**
 * DECREE OF THE UNDISTURBED SLEEP — Councilor Benthe Lowe, Seat of the Trench (depths).
 *
 * Lowe drafted the Ballast Clause: the drowned are not dead, they are *kept*, asleep, and nobody
 * is to wake them. Sleepers drift over the floor in their bubbles, sinking slowly toward whoever has
 * kept stillest. Move near one and it STIRS — its eyes start to open. Freeze, and it settles. Still
 * be moving when its eyes come open and it has seen you: WITNESSED — marked in light so you cannot
 * hide (not even in the deep's own fade), and every blow on you lands harder.
 *
 * Lowe is perfected depths, and depths wins by standing still — so the sleepers gather round her.
 * Make her move.
 */

const SLEEP_R = 26;
const STIR_R = 120;
const DASH_STIR_R = 210;
const STIR_MS = 650;
const MOVING = 55;

interface Sleeper {
  x: number; y: number; vx: number; vy: number; seed: number;
  state: 'asleep' | 'stirring' | 'awake' | 'drowsy';
  until: number; by: Who | null;
}

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const { W, H, top, rng } = ctx;
  const COUNT = ctx.hard ? 5 : 4;
  const WITNESS_MS = ctx.hard ? 5500 : 5000;
  const TAKEN = 1.3;
  const DRIFT = ctx.hard ? 28 : 22;

  const sleepers: Sleeper[] = [];
  const last: Record<Who, { x: number; y: number }> = { player: { x: 0, y: 0 }, npc: { x: 0, y: 0 } };
  const speed: Record<Who, number> = { player: 0, npc: 0 };
  const stillFor: Record<Who, number> = { player: 0, npc: 0 };
  const witnessUntil: Record<Who, number> = { player: 0, npc: 0 };
  let started = false;
  const now = () => ctx.scene.time.now;

  const moving = (w: Who) => speed[w] > MOVING || ctx.dashing(fighterOf(ctx, w));

  const witness = (sl: Sleeper, w: Who, time: number) => {
    sl.state = 'awake'; sl.until = time + WITNESS_MS; sl.by = w;
    witnessUntil[w] = Math.max(witnessUntil[w], time + WITNESS_MS);
    const f = fighterOf(ctx, w);
    ctx.sfx('curse-cast');
    ctx.flash(f.x, f.y, TIDE_PALE);
    ctx.float(f.x, f.y - 52, 'WITNESSED', '#9ad8ff');
  };

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        for (const w of WHO) { const f = fighterOf(ctx, w); last[w] = { x: f.x, y: f.y }; }
        for (let i = 0; i < COUNT; i++) {
          sleepers.push({
            x: W * (0.18 + (i / Math.max(1, COUNT - 1)) * 0.64) + (rng() - 0.5) * 60,
            y: top + 110 + rng() * (H - top - 220), vx: 0, vy: 0, seed: rng() * 10, state: 'asleep', until: 0, by: null,
          });
        }
        ctx.banner('THE UNDISTURBED SLEEP: MOVE NEAR A SLEEPER AND IT WAKES', '#9ad8ff');
      }
      // How each fighter is moving, and how long they have kept still.
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        const d = dist(f.x, f.y, last[w].x, last[w].y);
        speed[w] = dt > 0 ? speed[w] * 0.6 + (d / dt) * 0.4 : speed[w];
        last[w] = { x: f.x, y: f.y };
        stillFor[w] = speed[w] < 25 ? stillFor[w] + dt : 0;
      }
      // The ballast sinks toward the stillest.
      const still: Who | null = stillFor.npc > 0.6 || stillFor.player > 0.6 ? (stillFor.npc >= stillFor.player ? 'npc' : 'player') : null;
      for (const sl of sleepers) {
        let ax = Math.sin(time / 2300 + sl.seed) * 8, ay = Math.cos(time / 2900 + sl.seed) * 8;
        if (still) {
          const f = fighterOf(ctx, still);
          const d = dist(f.x, f.y, sl.x, sl.y);
          if (d > 90) { ax += ((f.x - sl.x) / d) * DRIFT; ay += ((f.y - sl.y) / d) * DRIFT; }
        }
        for (const o of sleepers) {
          if (o === sl) continue;
          const d = dist(o.x, o.y, sl.x, sl.y);
          if (d < 110 && d > 0) { ax += ((sl.x - o.x) / d) * 30; ay += ((sl.y - o.y) / d) * 30; }
        }
        sl.vx += (ax - sl.vx) * Math.min(1, dt * 1.5);
        sl.vy += (ay - sl.vy) * Math.min(1, dt * 1.5);
        sl.x = clamp(sl.x + sl.vx * dt, 50, W - 50);
        sl.y = clamp(sl.y + sl.vy * dt, top + 50, H - 50);

        if (sl.state === 'asleep') {
          for (const w of WHO) {
            const f = fighterOf(ctx, w);
            if (!alive(f)) continue;
            const d = dist(f.x, f.y, sl.x, sl.y);
            if ((ctx.dashing(f) && d < DASH_STIR_R) || (speed[w] > MOVING && d < STIR_R)) {
              sl.state = 'stirring'; sl.until = time + STIR_MS; sl.by = w;
              ctx.sfx('heartbeat');
              break;
            }
          }
        } else if (sl.state === 'stirring' && time >= sl.until) {
          // Its eyes come open: is whoever stirred it still moving, close by?
          const w = sl.by ?? 'player';
          const f = fighterOf(ctx, w);
          if (alive(f) && moving(w) && dist(f.x, f.y, sl.x, sl.y) < STIR_R + 50) witness(sl, w, time);
          else { sl.state = 'drowsy'; sl.until = time + 1400; ctx.sfx('hush'); }
        } else if (sl.state === 'awake' && time >= sl.until) { sl.state = 'drowsy'; sl.until = time + 3000; }
        else if (sl.state === 'drowsy' && time >= sl.until) { sl.state = 'asleep'; sl.by = null; }
      }
    },
    playerTakenMult() { return now() < witnessUntil.player ? TAKEN : 1; },
    npcTakenMult() { return now() < witnessUntil.npc ? TAKEN : 1; },
    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      // One of them is stirring at her: freeze where she stands.
      if (sleepers.some((s) => s.state === 'stirring' && s.by === 'npc')) return { x: n.x, y: n.y };
      // Otherwise: somewhere near you that is well clear of every sleeper.
      let best = { x: p.x, y: p.y }, bs = -1;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const cx = clamp(p.x + Math.cos(a) * 230, 60, W - 60), cy = clamp(p.y + Math.sin(a) * 200, top + 60, H - 60);
        const clear = sleepers.reduce((m, s) => Math.min(m, dist(s.x, s.y, cx, cy)), 999);
        const score = Math.min(clear, 260) - dist(n.x, n.y, cx, cy) * 0.15;
        if (score > bs) { bs = score; best = { x: cx, y: cy }; }
      }
      return best;
    },
    drawGround(g, time) {
      for (const sl of sleepers) {
        // A shadow cast down through the water, and the ring that wakes it.
        g.fillStyle(0x000000, 0.3); g.fillEllipse(sl.x, sl.y + SLEEP_R + 14, SLEEP_R * 1.8, 10);
        const k = sl.state === 'stirring' ? 1 - (sl.until - time) / STIR_MS : 0;
        const col = sl.state === 'awake' ? TIDE_PALE : TIDE;
        g.lineStyle(sl.state === 'stirring' ? 2.5 : 1, col, sl.state === 'asleep' ? 0.16 : 0.3 + k * 0.5);
        g.strokeCircle(sl.x, sl.y, STIR_R);
        if (sl.state === 'stirring') { g.fillStyle(TIDE, 0.06 + k * 0.1); g.fillCircle(sl.x, sl.y, STIR_R * (1 - k * 0.3)); }
      }
    },
    drawAir(g, time) {
      const t = time / 1000;
      for (const sl of sleepers) {
        const eyes = sl.state === 'asleep' ? 0 : sl.state === 'stirring' ? clamp(1 - (sl.until - time) / STIR_MS, 0, 1) * 0.6 : sl.state === 'awake' ? 1 : 0.25;
        const bob = Math.sin(t * 1.2 + sl.seed) * 4;
        sleeper(g, sl.x, sl.y + bob, SLEEP_R, t + sl.seed, { eyes, tint: sl.state === 'awake' ? TIDE_PALE : TIDE });
        if (sl.state === 'stirring' && Math.floor(time / 90) % 2 === 0) { g.lineStyle(2, TIDE_PALE, 0.8); g.strokeCircle(sl.x, sl.y + bob, SLEEP_R + 5); }
        // An awake sleeper stares: a line of pale light from its eyes to the witness.
        if (sl.state === 'awake' && sl.by) {
          const f = fighterOf(ctx, sl.by);
          if (alive(f)) drawGaze(g, sl.x - 4, sl.y + bob - 6, f.x, f.y - 6, time);
        }
      }
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        if (!alive(f) || now() >= witnessUntil[w]) continue;
        // The mark: a ring of light round the body (it shows through any fade) and an eye over it.
        const pulse = 0.5 + 0.5 * Math.sin(time / 120);
        g.lineStyle(3, TIDE_PALE, 0.55 + pulse * 0.35); g.strokeCircle(f.x, f.y, 26);
        g.lineStyle(1.5, TIDE, 0.5); g.strokeCircle(f.x, f.y, 32 + pulse * 3);
        const ex = f.x, ey = f.y - 46;
        g.fillStyle(OBS.glass, 0.85); g.fillEllipse(ex, ey, 26, 14);
        g.fillStyle(0xffffff, 0.95); g.fillEllipse(ex, ey, 20, 10);
        g.fillStyle(TIDE, 1); g.fillCircle(ex, ey, 4.4);
        g.fillStyle(0x000000, 1); g.fillCircle(ex, ey, 2);
        g.lineStyle(1.4, OBS.edge, 0.8); g.strokeEllipse(ex, ey, 26, 14);
      }
    },
    drawHud(g) {
      // The two of you as masks, each with the sleepers' count of eyes on them.
      const y = top + 20;
      for (const [w, x] of [['player', 34], ['npc', W - 34]] as [Who, number][]) {
        const on = now() < witnessUntil[w];
        councilMask(g, x, y, 11, { slit: on ? TIDE_PALE : OBS.seam, glow: on ? 1 : 0 });
        const eyes = sleepers.filter((s) => s.state === 'awake' && s.by === w).length;
        for (let i = 0; i < eyes; i++) { g.fillStyle(TIDE_PALE, 1); g.fillCircle(x + (w === 'player' ? 20 : -20) + (w === 'player' ? i : -i) * 9, y, 3); }
      }
    },
  };

  function drawGaze(g: Phaser.GameObjects.Graphics, x0: number, y0: number, x1: number, y1: number, time: number): void {
    g.lineStyle(6, TIDE, 0.08); g.lineBetween(x0, y0, x1, y1);
    g.lineStyle(1.5, TIDE_LIT, 0.45); g.lineBetween(x0, y0, x1, y1);
    const d = dist(x0, y0, x1, y1);
    for (let i = 0; i < Math.floor(d / 40); i++) {
      const k = ((time / 600) + i / Math.max(1, Math.floor(d / 40))) % 1;
      g.fillStyle(TIDE_PALE, 0.7 * Math.sin(k * Math.PI)); g.fillCircle(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, 2);
    }
  }
};

export const UNDISTURBED_SLEEP: GimmickDef = {
  id: 'bench-water-undisturbed-sleep',
  rules: 'The drowned sleep, sinking toward the stillest. Move near one and it stirs; be moving when it wakes and you are witnessed: marked, +30% taken.',
  make,
};
