import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { mixC } from '../../../../../art/IsleArt';
import { HW, alive, clamp, dist, makeClock, termite } from '../palette';

/**
 * Termites — Borer Mandible.
 *
 * The yard is a grid of plank panels nailed over a drop: between them, and through any hole,
 * you see the lesser forest's crowns a long way down. Mandible's termites eat the floor. A
 * column marches in from the nearest wall to the panel under one of you (they take turns — the
 * colony is not picky), and sets to chewing: the panel greys, frays, sags, and gives way. A
 * panel beside two holes is already rotten and goes faster. Fall through and you are hurt, held
 * a moment, and set back where you last stood on sound wood.
 *
 * On a clock, a hammer comes down and a fresh plank is nailed over the oldest hole. The play is
 * the chewing panel itself: it tells you, seconds ahead, where the floor is going — so stand
 * where Mandible has to cross it, or step off a chewed panel just as he steps on.
 */

type State = 'sound' | 'chew' | 'hole' | 'nail';
interface Panel { c: number; r: number; state: State; k: number; at: number; target: Fighter | null }
interface Column { panel: Panel; from: Pt; at: number; arriveMs: number }

export const termitesGimmick: GimmickDef = {
  id: 'heartwood-termites',
  rules: 'Termites march to the plank under one of you and chew it through. Fall in and you are hurt and set back. Fresh planks get nailed on a clock.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard, rng } = ctx;
    const tick = makeClock();
    const COLS = 8, ROWS = 5;
    const PW = W / COLS, PH = (H - top) / ROWS;
    const CHEW_MS = hard ? 1900 : 2300;
    const MARCH_MS = 900;
    const EVERY = hard ? 1500 : 1900;
    const NAIL_EVERY = hard ? 6200 : 5200;
    const NAIL_MS = 900;
    const MAX_HOLES = hard ? 13 : 11;
    const FALL_DMG = hard ? 14 : 12;

    const panels: Panel[] = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) panels.push({ c, r, state: 'sound', k: 0, at: 0, target: null });
    const at = (c: number, r: number): Panel | null => (c < 0 || r < 0 || c >= COLS || r >= ROWS ? null : panels[r * COLS + c]);
    const panelOf = (x: number, y: number): Panel | null => at(Math.floor(x / PW), Math.floor((y - top) / PH));
    const centre = (p: Panel): Pt => ({ x: (p.c + 0.5) * PW, y: top + (p.r + 0.5) * PH });
    const isHole = (p: Panel | null): boolean => !!p && p.state === 'hole';
    const solidAt = (x: number, y: number): boolean => { const p = panelOf(x, y); return !!p && p.state !== 'hole'; };
    const holeNeighbours = (p: Panel): number => [at(p.c - 1, p.r), at(p.c + 1, p.r), at(p.c, p.r - 1), at(p.c, p.r + 1)].filter(isHole).length;

    let columns: Column[] = [];
    let nextColumn = 1600;
    let nextNail = NAIL_EVERY;
    let turn = 0;
    let now = 0;
    const history = new Map<Fighter, { x: number; y: number; t: number }[]>([[ctx.player, []], [ctx.npc, []]]);
    const fellAt = new Map<Fighter, number>([[ctx.player, -9999], [ctx.npc, -9999]]);
    let lastSample = 0;

    const send = (): void => {
      const holes = panels.filter((p) => p.state === 'hole' || p.state === 'nail').length;
      if (holes >= MAX_HOLES) return;
      const victim = turn++ % 2 === 0 ? ctx.player : ctx.npc;
      if (!alive(victim)) return;
      const p = panelOf(victim.x, victim.y);
      if (!p || p.state !== 'sound' || columns.some((q) => q.panel === p)) return;
      const ce = centre(p);
      const edges: Pt[] = [{ x: -10, y: ce.y }, { x: W + 10, y: ce.y }, { x: ce.x, y: H + 10 }];
      const from = edges.reduce((a, b) => (dist(a.x, a.y, ce.x, ce.y) < dist(b.x, b.y, ce.x, ce.y) ? a : b));
      columns.push({ panel: p, from, at: now, arriveMs: MARCH_MS });
      p.target = victim;
      ctx.sfx('status-poison');
    };

    const setBack = (f: Fighter): void => {
      const h = history.get(f) ?? [];
      let spot: Pt | null = null;
      for (let i = h.length - 1; i >= 0; i--) {
        if (now - h[i].t >= 450 && solidAt(h[i].x, h[i].y)) { spot = h[i]; break; }
      }
      if (!spot) {
        const sound = panels.filter((p) => p.state === 'sound' || p.state === 'chew').map(centre);
        spot = sound.reduce<Pt | null>((a, b) => (!a || dist(b.x, b.y, f.x, f.y) < dist(a.x, a.y, f.x, f.y) ? b : a), null);
      }
      if (spot) ctx.nudge(f, spot.x - f.x, spot.y - f.y);
    };

    return {
      update(time: number) {
        const dt = tick(time);
        now = time;
        if (time >= nextColumn) { nextColumn = time + EVERY; send(); }
        for (const col of [...columns]) {
          if (time - col.at < col.arriveMs) continue;
          columns = columns.filter((q) => q !== col);
          if (col.panel.state === 'sound') { col.panel.state = 'chew'; col.panel.at = time; col.panel.k = 0; }
        }
        for (const p of panels) {
          if (p.state === 'chew') {
            const rate = holeNeighbours(p) >= 2 ? 1.5 : 1;
            p.k = Math.min(1, p.k + (dt * 1000 * rate) / CHEW_MS);
            if (p.k >= 1) { p.state = 'hole'; p.at = time; ctx.sfx('stone-slam'); const c = centre(p); ctx.flash(c.x, c.y, HW.plankDark); }
          } else if (p.state === 'nail' && time - p.at >= NAIL_MS) {
            p.state = 'sound'; p.k = 0; p.target = null;
            ctx.sfx('hammer-forge');
          }
        }
        if (time >= nextNail) {
          nextNail = time + NAIL_EVERY;
          const oldest = panels.filter((p) => p.state === 'hole').sort((a, b) => a.at - b.at)[0];
          if (oldest) { oldest.state = 'nail'; oldest.at = time; ctx.sfx('anvil'); }
        }
        if (time - lastSample > 150) {
          lastSample = time;
          for (const [f, h] of history) {
            if (!alive(f) || !solidAt(f.x, f.y)) continue;
            h.push({ x: f.x, y: f.y, t: time });
            while (h.length > 12) h.shift();
          }
        }
        for (const f of [ctx.player, ctx.npc]) {
          if (!alive(f) || time - (fellAt.get(f) ?? 0) < 900) continue;
          const p = panelOf(f.x, f.y);
          if (!p || p.state !== 'hole') continue;
          fellAt.set(f, time);
          ctx.hit(f, FALL_DMG, f.x, f.y);
          ctx.float(f.x, f.y - 50, 'FELL THROUGH', '#c9a26a');
          ctx.sfx('land');
          setBack(f);
          ctx.root(f, 420);
        }
      },

      npcSeek(): Pt | null {
        const n = ctx.npc;
        const p = panelOf(n.x, n.y);
        if (p && (p.state === 'chew' && p.k > 0.35 || p.state === 'hole' || columns.some((c) => c.panel === p))) {
          // Off the doomed plank, to the nearest sound one on the player's side if there is one.
          const sound = panels.filter((q) => q.state === 'sound' && !columns.some((c) => c.panel === q));
          const pl = ctx.player;
          let best: Pt | null = null, bd = Infinity;
          for (const q of sound) {
            const c = centre(q);
            const d = dist(c.x, c.y, n.x, n.y) + dist(c.x, c.y, pl.x, pl.y) * 0.25;
            if (d < bd) { bd = d; best = c; }
          }
          return best;
        }
        return null;
      },

      drawGround(g, time) {
        // The drop: forest crowns far below, under a haze.
        g.fillStyle(HW.canopy, 1); g.fillRect(0, top, W, H - top);
        for (let i = 0; i < 40; i++) {
          const x = (i * 197) % W, y = top + ((i * 131) % (H - top));
          g.fillStyle(mixC(i % 3 ? HW.canopyGold : HW.canopyLit, HW.mist, 0.4), 1); g.fillCircle(x, y, 18 + (i % 4) * 6);
        }
        g.fillStyle(HW.mist, 0.35); g.fillRect(0, top, W, H - top);
        for (const p of panels) {
          const x = p.c * PW, y = top + p.r * PH;
          if (p.state === 'hole') {
            // Ragged edge of the hole, splinters hanging.
            g.lineStyle(3, HW.plankDark, 0.9); g.strokeRect(x + 3, y + 3, PW - 6, PH - 6);
            for (let k = 0; k < 6; k++) {
              g.fillStyle(HW.plank, 1);
              g.fillTriangle(x + 6 + k * 19, y + 3, x + 14 + k * 19, y + 3, x + 10 + k * 19, y + 14 + (k % 3) * 5);
            }
            continue;
          }
          // Planks running across each panel, with the beam beneath showing at its edge.
          const decay = p.state === 'chew' ? p.k : 0;
          const nail = p.state === 'nail' ? (time - p.at) / NAIL_MS : 1;
          const slide = p.state === 'nail' ? (1 - nail) * PW : 0;
          g.fillStyle(HW.plankDark, 1); g.fillRect(x + 1 + slide, y + 1, PW - 2, PH - 2);
          const n = 5;
          for (let k = 0; k < n; k++) {
            const py = y + 3 + k * ((PH - 6) / n);
            const base = mixC(HW.plank, k % 2 ? HW.plankLit : HW.plankDark, 0.25 + ((p.c * 7 + p.r * 3 + k) % 5) * 0.06);
            const c = mixC(p.state === 'nail' ? mixC(HW.sapwood, base, 0.3) : base, 0x8a8478, decay * 0.7);
            const sag = decay * decay * 5 * Math.sin(((k + 0.5) / n) * Math.PI);
            g.fillStyle(c, 1); g.fillRect(x + 3 + slide, py + sag, PW - 6, (PH - 6) / n - 2);
            g.fillStyle(HW.plankLit, 0.3 * (1 - decay)); g.fillRect(x + 3 + slide, py + sag, PW - 6, 2);
            g.fillStyle(HW.iron, 0.9); g.fillCircle(x + 8 + slide, py + 6 + sag, 1.4); g.fillCircle(x + PW - 8 + slide, py + 6 + sag, 1.4);
          }
          if (decay > 0) {
            // Frass and bore-holes, then cracks; the edge flashes as it is about to go.
            for (let k = 0; k < Math.floor(decay * 24); k++) {
              const hx = x + 10 + ((k * 37 + p.c * 11) % (PW - 20)), hy = y + 10 + ((k * 53 + p.r * 17) % (PH - 20));
              g.fillStyle(HW.mark, 0.8); g.fillCircle(hx, hy, 1.8);
              g.fillStyle(0xd8c49a, 0.6); g.fillCircle(hx + 2, hy + 2, 1.2);
            }
            if (decay > 0.5) {
              g.lineStyle(2, HW.mark, (decay - 0.5) * 1.6);
              g.lineBetween(x + PW * 0.2, y + PH * 0.3, x + PW * 0.55, y + PH * 0.55); g.lineBetween(x + PW * 0.55, y + PH * 0.55, x + PW * 0.8, y + PH * 0.4);
            }
            if (decay > 0.75 && Math.sin(time / 60) > 0) { g.lineStyle(3, HW.leafRust, 0.8); g.strokeRect(x + 3, y + 3, PW - 6, PH - 6); }
          }
          if (p.state === 'nail') {
            // The hammer coming down at the panel's corner.
            const hk = Math.abs(Math.sin(nail * Math.PI * 3));
            g.lineStyle(4, HW.plankDark, 1); g.lineBetween(x + PW - 14, y + 12, x + PW - 14 - 26, y + 12 - 18 * hk);
            g.fillStyle(HW.iron, 1); g.fillRect(x + PW - 46, y + 2 - 18 * hk, 16, 10);
          }
        }
      },

      drawAir(g, time) {
        // The columns on the march, and the colony swarming a plank it is chewing.
        for (const col of columns) {
          const c = centre(col.panel);
          const k = clamp((time - col.at) / col.arriveMs, 0, 1);
          const a = Math.atan2(c.y - col.from.y, c.x - col.from.x);
          for (let i = 0; i < 9; i++) {
            const kk = clamp(k - i * 0.04, 0, 1);
            const x = col.from.x + (c.x - col.from.x) * kk + Math.sin(time / 90 + i) * 3, y = col.from.y + (c.y - col.from.y) * kk + Math.cos(time / 110 + i) * 3;
            termite(g, x, y, a, 6, 1);
          }
          g.lineStyle(2, 0xc9a26a, 0.5); g.strokeRect(c.x - PW / 2 + 6, c.y - PH / 2 + 6, PW - 12, PH - 12);
        }
        for (const p of panels) {
          if (p.state !== 'chew') continue;
          const c = centre(p);
          for (let i = 0; i < 10; i++) {
            const a = time / 400 + i * 0.63;
            const r = 14 + (i % 4) * 9;
            termite(g, c.x + Math.cos(a) * r * 1.6, c.y + Math.sin(a) * r, a + Math.PI / 2, 5.5, 0.95);
          }
        }
      },

      drawHud(g) {
        // Holes against the colony's limit — so you know how much floor is left to lose.
        const holes = panels.filter((p) => p.state === 'hole').length;
        const x0 = W / 2 - MAX_HOLES * 5, y = top + 12;
        for (let i = 0; i < MAX_HOLES; i++) {
          g.fillStyle(0x000000, 0.5); g.fillRect(x0 + i * 10 - 1, y - 5, 9, 10);
          g.fillStyle(i < holes ? HW.mark : HW.plank, 1); g.fillRect(x0 + i * 10, y - 4, 7, 8);
        }
      },

      destroy() { columns = []; history.clear(); },
    };
  },
};
