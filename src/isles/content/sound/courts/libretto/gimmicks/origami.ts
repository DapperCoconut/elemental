import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { crane, foldingSheet } from '../art';
import { GILT_LIT, PAPER, PAPER_DARK, PAPER_LIT, RED_LIT } from '../palette';
import { alive, clamp, dist, stepDt, wrapAngle } from '../util';

/**
 * Origami — Folder Crease.
 *
 * Crease folds cranes for the Hour of Matins, a thousand a year, and folds them without hands:
 * he breathes on a sheet and the air does the creasing. Square sheets come fluttering down onto
 * the floor and start folding themselves — corner to corner, the kite, the bird base, the
 * crane — a ring round each one showing how far it has got. Finished, the crane takes off and
 * flies at whichever fighter is *nearest* it at that moment, and bites like a paper cut.
 *
 * Strike a sheet before it is folded and it crumples. Strike a crane in the air and it drops. So
 * the rule is the folder's choice made yours: crumple the sheets beside you, leave the ones
 * beside him to finish, and his own cranes go for him.
 */

const SHEET_R = 22;
const CRANE_R = 16;
const MAX_SHEETS = 6;

interface Sheet {
  x: number; y: number; rot: number;
  /** Drifting down onto the floor until this time; then it starts to fold. */
  landAt: number;
  foldStart: number; foldMs: number;
  crumpledAt: number;
  t: StrikeTarget | null;
  fromY: number;
}

interface Crane {
  x: number; y: number; a: number; speed: number;
  prey: Fighter;
  born: number;
  t: StrikeTarget | null;
  downAt: number;
  hitAt: number;
  color: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const sheets: Sheet[] = [];
  const cranes: Crane[] = [];
  const foldMs = ctx.hard ? 3600 : 4300;
  const spawnEvery = ctx.hard ? 1800 : 2300;
  const bite = ctx.hard ? 11 : 9;
  let nextSheet = 0;
  let started = false;
  let pops: { x: number; y: number; at: number; c: number }[] = [];

  const foldK = (s: Sheet, time: number) => (time < s.landAt ? 0 : clamp((time - s.foldStart) / s.foldMs, 0, 1));
  const nearest = (x: number, y: number): Fighter => {
    const dp = alive(player) ? dist(x, y, player.x, player.y) : Infinity;
    const dn = alive(npc) ? dist(x, y, npc.x, npc.y) : Infinity;
    return dp <= dn ? player : npc;
  };

  function drop(time: number, x?: number, y?: number): void {
    let px = x ?? 0, py = y ?? 0;
    if (x === undefined || y === undefined) {
      for (let tries = 0; tries < 12; tries++) {
        px = 90 + rng() * (W - 180); py = top + 70 + rng() * (H - top - 130);
        if (dist(px, py, player.x, player.y) > 110 && dist(px, py, npc.x, npc.y) > 110 && sheets.every((s) => dist(px, py, s.x, s.y) > 70)) break;
      }
    }
    const s: Sheet = { x: px, y: py, rot: rng() * Math.PI, landAt: time + 500, foldStart: time + 500, foldMs: foldMs * (0.9 + rng() * 0.2), crumpledAt: 0, t: null, fromY: py - 140 };
    s.t = ctx.target({
      x: px, y: py, r: SHEET_R,
      onStruck: (by) => {
        if (s.crumpledAt) return;
        s.crumpledAt = ctx.scene.time.now;
        s.t?.remove(); s.t = null;
        ctx.float(s.x, s.y - 24, by === 'player' ? 'CRUMPLED' : 'CREASE CRUMPLES IT', '#f1e8d2');
        ctx.sfx('snap-back');
      },
    });
    sheets.push(s);
    ctx.sfx('whoosh');
  }

  function launch(s: Sheet, time: number): void {
    const prey = nearest(s.x, s.y);
    const c: Crane = {
      x: s.x, y: s.y - 6, a: Math.atan2(prey.y - s.y, prey.x - s.x), speed: 120, prey, born: time, t: null, downAt: 0, hitAt: 0,
      color: [PAPER_LIT, 0xf8d0d0, 0xd0e0f8, 0xf8ecc0][Math.floor(rng() * 4)],
    };
    c.t = ctx.target({
      x: c.x, y: c.y, r: CRANE_R,
      onStruck: () => {
        if (c.downAt || c.hitAt) return;
        c.downAt = ctx.scene.time.now;
        c.t?.remove(); c.t = null;
        ctx.float(c.x, c.y - 20, 'SWATTED', '#f1e8d2');
      },
    });
    cranes.push(c);
    ctx.float(s.x, s.y - 30, prey === player ? 'A CRANE — FOR YOU' : 'A CRANE — FOR CREASE', prey === player ? '#f05a5a' : '#f4d88a');
    ctx.sfx('wings');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        nextSheet = time + spawnEvery;
        for (let i = 0; i < 3; i++) drop(time);
      }
      if (time >= nextSheet) {
        nextSheet = time + spawnEvery;
        if (sheets.filter((s) => !s.crumpledAt).length < MAX_SHEETS) drop(time);
      }
      for (let i = sheets.length - 1; i >= 0; i--) {
        const s = sheets[i];
        if (s.crumpledAt) { if (time - s.crumpledAt > 1600) sheets.splice(i, 1); continue; }
        if (time >= s.landAt && foldK(s, time) >= 1) {
          s.t?.remove(); s.t = null;
          sheets.splice(i, 1);
          launch(s, time);
        }
      }
      for (let i = cranes.length - 1; i >= 0; i--) {
        const c = cranes[i];
        if (c.downAt || c.hitAt) { if (time - Math.max(c.downAt, c.hitAt) > 700) cranes.splice(i, 1); continue; }
        if (!alive(c.prey)) c.prey = c.prey === player ? npc : player;
        const want = Math.atan2(c.prey.y - c.y, c.prey.x - c.x);
        c.a += clamp(wrapAngle(want - c.a), -2.3 * dt, 2.3 * dt);
        c.speed = Math.min(ctx.hard ? 280 : 250, c.speed + 140 * dt);
        c.x += Math.cos(c.a) * c.speed * dt;
        c.y += Math.sin(c.a) * c.speed * dt;
        c.t?.moveTo(c.x, c.y);
        for (const f of [player, npc]) {
          if (!alive(f) || dist(c.x, c.y, f.x, f.y) > 24) continue;
          c.hitAt = time;
          c.t?.remove(); c.t = null;
          ctx.hit(f, bite, c.x, c.y);
          ctx.nudge(f, Math.cos(c.a) * 36, Math.sin(c.a) * 36);
          ctx.float(f.x, f.y - 44, 'PAPER CUT', '#f05a5a');
          ctx.sfx('slash');
          pops.push({ x: c.x, y: c.y, at: time, c: c.color });
          break;
        }
        if (!c.hitAt && time - c.born > 6000) { c.downAt = time; c.t?.remove(); c.t = null; }
      }
      pops = pops.filter((p) => time - p.at < 600);
    },

    npcSeek() {
      const time = ctx.scene.time.now;
      // Crumple a ripening sheet that would come to him rather than to you.
      let best: Sheet | null = null;
      let bk = 0.35;
      for (const s of sheets) {
        if (s.crumpledAt) continue;
        const k = foldK(s, time);
        if (k > bk && dist(s.x, s.y, npc.x, npc.y) < dist(s.x, s.y, player.x, player.y) && dist(s.x, s.y, npc.x, npc.y) < 320) { bk = k; best = s; }
      }
      if (best) return { x: best.x + (npc.x < best.x ? -20 : 20), y: best.y };
      // Otherwise stand off, keeping the ripest sheet nearer you than him.
      let ripe: Sheet | null = null;
      let rk = -1;
      for (const s of sheets) { const k = foldK(s, time); if (!s.crumpledAt && k > rk) { rk = k; ripe = s; } }
      const a = ripe ? Math.atan2(player.y - ripe.y, player.x - ripe.x) : Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 240, 60, W - 60), y: clamp(player.y + Math.sin(a) * 200, top + 50, H - 40) };
    },

    drawGround(g, time) {
      for (const s of sheets) {
        if (time < s.landAt) continue;
        const k = foldK(s, time);
        // The fold-progress ring, gilt as it nears the last crease.
        if (!s.crumpledAt) {
          g.lineStyle(2, PAPER_DARK, 0.35); g.strokeCircle(s.x, s.y, SHEET_R + 6);
          g.lineStyle(2.5, k > 0.75 ? RED_LIT : GILT_LIT, 0.8);
          g.beginPath(); g.arc(s.x, s.y, SHEET_R + 6, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
          // Who it would fly at, if it folded now.
          const prey = nearest(s.x, s.y);
          if (k > 0.6) {
            const a = Math.atan2(prey.y - s.y, prey.x - s.x);
            g.lineStyle(1.5, prey === player ? RED_LIT : GILT_LIT, (k - 0.6) * 1.6);
            for (let d = 30; d < 90; d += 14) g.lineBetween(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, s.x + Math.cos(a) * (d + 7), s.y + Math.sin(a) * (d + 7));
          }
        }
      }
      // Crane shadows.
      for (const c of cranes) {
        if (c.hitAt) continue;
        const fall = c.downAt ? clamp((time - c.downAt) / 500, 0, 1) : 0;
        g.fillStyle(0x000000, 0.18); g.fillEllipse(c.x, c.y + 22 - fall * 18, 20, 6);
      }
    },

    drawAir(g, time) {
      for (const s of sheets) {
        if (time < s.landAt) {
          // Fluttering down onto the floor.
          const k = 1 - (s.landAt - time) / 500;
          const yy = s.fromY + (s.y - s.fromY) * k;
          foldingSheet(g, s.x + Math.sin(k * 9) * 14, yy, 0.9, 0, s.rot + Math.sin(k * 6) * 0.6);
          continue;
        }
        const k = foldK(s, time);
        foldingSheet(g, s.x, s.y, 0.9, k, s.rot, s.crumpledAt ? clamp((time - s.crumpledAt) / 300, 0, 1) : 0);
        // The air doing the folding: little curls of breath round the sheet.
        if (!s.crumpledAt) {
          for (let i = 0; i < 3; i++) {
            const a = time / 400 + i * 2.1 + s.rot;
            g.lineStyle(1, PAPER, 0.35);
            g.beginPath(); g.arc(s.x + Math.cos(a) * 26, s.y + Math.sin(a) * 18, 6, a, a + 2.4, false); g.strokePath();
          }
        }
      }
      for (const c of cranes) {
        if (c.hitAt) continue;
        if (c.downAt) {
          const fall = clamp((time - c.downAt) / 500, 0, 1);
          crane(g, c.x, c.y + fall * 18, 1.1, c.a + fall * 2, 0, c.color, 1 - fall * 0.6);
          continue;
        }
        const flap = Math.sin(time / 70 + c.born);
        crane(g, c.x, c.y, 1.2, c.a, flap, c.color);
        g.lineStyle(1, c.prey === player ? RED_LIT : GILT_LIT, 0.4); g.strokeCircle(c.x, c.y, CRANE_R);
      }
      for (const p of pops) {
        const k = (time - p.at) / 600;
        for (let i = 0; i < 8; i++) {
          const a = i * 0.8;
          g.fillStyle(p.c, 1 - k);
          g.fillTriangle(p.x + Math.cos(a) * k * 40, p.y + Math.sin(a) * k * 30 + k * k * 20, p.x + Math.cos(a) * k * 40 + 5, p.y + Math.sin(a) * k * 30 + k * k * 20, p.x + Math.cos(a) * k * 40, p.y + Math.sin(a) * k * 30 + k * k * 20 + 5);
        }
      }
    },
  };
}

export const ORIGAMI: GimmickDef = {
  id: 'libretto-origami',
  rules: 'Sheets fold themselves into cranes that fly at whoever is nearest when the last crease takes. Strike a sheet to crumple it, or a crane to swat it.',
  make,
};
