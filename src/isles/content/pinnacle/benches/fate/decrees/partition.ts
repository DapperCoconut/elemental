import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { OBS, crackPath, seam } from '../../../../../art/PinnacleArt';
import { glow, mulberry } from '../../../../../art/IsleArt';
import { CSS_LOT, CSS_NPC, CSS_PLAYER, FELT, FELT_DEEP, FELT_LIT, IVORY, IVORY_DIM, ROUGE, SIDE_NPC, SIDE_PLAYER } from '../palette';
import { type Who, alive, clamp, dist, other } from '../util';

/**
 * Seat of the Levy — Councilor Ordo Marchmont, who wrote the conscription: the drawn go to the
 * War Court, and the map is redrawn with them.
 *
 * DECREE OF THE PARTITION. The floor is the war-table's map: eight provinces of felt under the
 * glass, inked borders, a flag in each. Stand alone in a province for a moment and you annex it —
 * your flag goes up. Every ten seconds the Levy is called: every province raises its men and each
 * one fires a volley at its owner's enemy from its flag, and the capital (the crown, which moves
 * after every Levy) fires three. The House starts with two provinces to your one. The councilor
 * builds empires for a living; it will take the map if you let it. Take it back — and stand
 * where your own volleys will not be in your way.
 */

const COLS = 4, ROWS = 2;
const pal = (w: Who | null) => (w === 'player' ? SIDE_PLAYER : w === 'npc' ? SIDE_NPC : IVORY_DIM);

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const PW = ctx.W / COLS, PH = (ctx.H - ctx.top) / ROWS;
  const CLAIM_S = 1.6;
  const LEVY_MS = ctx.hard ? 9000 : 10000;
  const WARN_MS = 1400;
  const DMG = 8;
  const SPEED = 280;

  interface Prov { x: number; y: number; cx: number; cy: number; owner: Who | null; prog: number; by: Who | null }
  const prov: Prov[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const x = c * PW, y = ctx.top + r * PH;
    prov.push({ x, y, cx: x + PW / 2, cy: y + PH / 2 + 10, owner: null, prog: 0, by: null });
  }
  prov[0].owner = 'player';
  prov[3].owner = 'npc'; prov[7].owner = 'npc';
  let capital = 1 + Math.floor(ctx.rng() * 2) + (ctx.rng() < 0.5 ? 0 : 4);
  let levyAt = 0;
  let firedAt = -9999;

  // The inked borders and the map's hills, fixed for the fight.
  const mr = mulberry(Math.floor(ctx.rng() * 1e9));
  const borders: Pt[][] = [];
  for (let c = 1; c < COLS; c++) borders.push(crackPath({ x: c * PW, y: ctx.top }, { x: c * PW, y: ctx.H }, mr, 14, 10));
  for (let r = 1; r < ROWS; r++) borders.push(crackPath({ x: 0, y: ctx.top + r * PH }, { x: ctx.W, y: ctx.top + r * PH }, mr, 12, 14));
  const hills: [number, number, number][] = [];
  for (let i = 0; i < 26; i++) hills.push([20 + mr() * (ctx.W - 40), ctx.top + 20 + mr() * (ctx.H - ctx.top - 40), 5 + mr() * 6]);
  const rivers: Pt[][] = [crackPath({ x: ctx.W * 0.1, y: ctx.H - 20 }, { x: ctx.W * 0.62, y: ctx.top + 30 }, mr, 26, 9)];

  const inside = (p: Prov, x: number, y: number) => x >= p.x && x < p.x + PW && y >= p.y && y < p.y + PH;
  const fighter = (w: Who) => (w === 'player' ? ctx.player : ctx.npc);

  const levy = (time: number): void => {
    firedAt = time;
    ctx.sfx('mortar-launch');
    const shots: Record<Who, number> = { player: 0, npc: 0 };
    prov.forEach((p, i) => {
      if (!p.owner) return;
      const foe = fighter(other(p.owner));
      if (!alive(foe)) return;
      const n = i === capital ? 3 : 1;
      const a0 = Math.atan2(foe.y - p.cy, foe.x - p.cx);
      for (let k = 0; k < n; k++) {
        const a = a0 + (k - (n - 1) / 2) * 0.2;
        ctx.tk.spawnBullet({
          x: p.cx, y: p.cy - 30, angle: a, speed: SPEED, damage: DMG, r: 7, lifeMs: 4000,
          color: pal(p.owner), hits: p.owner === 'player' ? [ctx.npc] : [ctx.player],
        });
      }
      shots[p.owner] += n;
    });
    ctx.banner(`THE LEVY — YOUR PROVINCES FIRE ${shots.player}, THE HOUSE'S FIRE ${shots.npc}`, CSS_LOT);
    // The crown moves to another province.
    let next = capital;
    while (next === capital) next = Math.floor(ctx.rng() * prov.length);
    capital = next;
  };

  return {
    update(time, dt) {
      if (!alive(ctx.player) || !alive(ctx.npc)) return;
      if (levyAt === 0) { levyAt = time + LEVY_MS; ctx.banner('STAND ALONE IN A PROVINCE TO ANNEX IT. THE LEVY FIRES FROM EVERY FLAG', CSS_LOT); }
      for (const p of prov) {
        const pin = inside(p, ctx.player.x, ctx.player.y), nin = inside(p, ctx.npc.x, ctx.npc.y);
        const who: Who | null = pin && !nin ? 'player' : nin && !pin ? 'npc' : null;
        if (who && p.owner !== who) {
          if (p.by !== who) { p.by = who; p.prog = 0; }
          p.prog += dt / CLAIM_S;
          if (p.prog >= 1) {
            p.owner = who; p.prog = 0; p.by = null;
            ctx.float(p.cx, p.cy - 70, 'ANNEXED', who === 'player' ? CSS_PLAYER : CSS_NPC);
            ctx.sfx('drum-hit');
          }
        } else p.prog = Math.max(0, p.prog - dt * 0.8);
      }
      if (time >= levyAt) { levy(time); levyAt = time + LEVY_MS; }
    },
    npcSeek() {
      const n = ctx.npc;
      // The crown first, then the nearest land that is not yet the House's.
      if (prov[capital].owner !== 'npc') return { x: prov[capital].cx, y: prov[capital].cy };
      let best: Prov | null = null, bd = Infinity;
      for (const p of prov) {
        if (p.owner === 'npc') continue;
        const d = dist(n.x, n.y, p.cx, p.cy) + (p.owner === 'player' ? -60 : 0);
        if (d < bd) { bd = d; best = p; }
      }
      return best ? { x: best.cx + (n.x < best.cx ? -30 : 30), y: best.cy } : null;
    },
    drawGround(g, time) {
      const t = time / 1000;
      // The map: felt provinces, each a little different, tinted by their owner.
      prov.forEach((p, i) => {
        g.fillStyle((i + Math.floor(i / COLS)) % 2 ? FELT : FELT_DEEP, 0.55);
        g.fillRect(p.x, p.y, PW, PH);
        if (p.owner) { g.fillStyle(pal(p.owner), 0.08); g.fillRect(p.x, p.y, PW, PH); }
      });
      for (const r of rivers) {
        g.lineStyle(5, OBS.glass, 0.6); g.beginPath(); g.moveTo(r[0].x, r[0].y); for (const q of r) g.lineTo(q.x, q.y); g.strokePath();
        g.lineStyle(1.5, OBS.edge, 0.3); g.beginPath(); g.moveTo(r[0].x, r[0].y); for (const q of r) g.lineTo(q.x, q.y); g.strokePath();
      }
      for (const [hx, hy, s] of hills) {
        g.fillStyle(FELT_LIT, 0.4); g.fillTriangle(hx - s, hy + s * 0.6, hx + s, hy + s * 0.6, hx, hy - s * 0.8);
        g.lineStyle(1, OBS.glass, 0.5); g.lineBetween(hx, hy - s * 0.8, hx + s, hy + s * 0.6);
      }
      for (const b of borders) seam(g, b, 1.3, 0.55, 0.1, OBS.seam);
      for (const b of borders) {
        g.lineStyle(2, OBS.glass, 0.7); g.beginPath(); g.moveTo(b[0].x, b[0].y); for (const q of b) g.lineTo(q.x, q.y); g.strokePath();
      }
      // The capital's crown, inked large on its province.
      const c = prov[capital];
      const cy = c.cy + 44;
      g.lineStyle(2, IVORY, 0.45 + 0.15 * Math.sin(t * 3));
      g.strokeCircle(c.cx, cy, 34);
      g.beginPath();
      g.moveTo(c.cx - 20, cy + 10); g.lineTo(c.cx - 20, cy - 8); g.lineTo(c.cx - 10, cy + 2); g.lineTo(c.cx, cy - 14);
      g.lineTo(c.cx + 10, cy + 2); g.lineTo(c.cx + 20, cy - 8); g.lineTo(c.cx + 20, cy + 10); g.closePath(); g.strokePath();
      // Claims in progress: a ring filling round the flag's foot.
      for (const p of prov) {
        if (p.prog <= 0 || !p.by) continue;
        g.lineStyle(4, pal(p.by), 0.85);
        g.beginPath(); g.arc(p.cx, p.cy, 26, -Math.PI / 2, -Math.PI / 2 + p.prog * Math.PI * 2, false); g.strokePath();
      }
    },
    drawAir(g, time) {
      const t = time / 1000;
      const warn = clamp(1 - (levyAt - time) / WARN_MS, 0, 1);
      const fired = clamp((time - firedAt) / 500, 0, 1);
      prov.forEach((p, i) => {
        const col = pal(p.owner);
        const raise = p.owner ? warn * 14 : 0;
        const top = p.cy - 52 - raise;
        // The flag: an obsidian pole, a pennant in its owner's colour, cracking in the draught.
        g.fillStyle(0x000000, 0.35); g.fillEllipse(p.cx + 3, p.cy + 4, 20, 6);
        g.lineStyle(3, OBS.facet, 1); g.lineBetween(p.cx, p.cy, p.cx, top);
        g.lineStyle(1, OBS.edge, 0.7); g.lineBetween(p.cx - 1, p.cy, p.cx - 1, top);
        const wave = Math.sin(t * 6 + i) * 3;
        g.fillStyle(p.owner === 'npc' ? ROUGE : p.owner === 'player' ? FELT : OBS.facet, 1);
        g.fillTriangle(p.cx, top, p.cx + 30, top + 7 + wave, p.cx, top + 16);
        g.fillStyle(col, 0.8);
        g.fillTriangle(p.cx, top + 2, p.cx + 22, top + 7 + wave * 0.8, p.cx, top + 12);
        g.fillStyle(OBS.edge, 1); g.fillCircle(p.cx, top - 2, 2.5);
        if (i === capital) {
          g.fillStyle(IVORY, 0.9);
          g.fillTriangle(p.cx - 6, top - 6, p.cx + 6, top - 6, p.cx, top - 14);
          g.fillRect(p.cx - 6, top - 7, 12, 3);
        }
        // The levy's warning: men raised, a line to whoever they will fire at.
        if (p.owner && warn > 0 && levyAt > time) {
          const foe = fighter(other(p.owner));
          glow(g, p.cx, top + 8, 20, col, 0.04 * warn, 3);
          g.lineStyle(1, col, 0.35 * warn); g.lineBetween(p.cx, p.cy - 30, foe.x, foe.y);
          for (let k = 0; k < (i === capital ? 5 : 3); k++) {
            const mx = p.cx - 16 + k * 8, my = p.cy - 4;
            g.fillStyle(OBS.sheen, 1); g.fillRect(mx - 2, my - 8 - warn * 3, 4, 8);
            g.fillStyle(col, 0.9); g.fillCircle(mx, my - 10 - warn * 3, 2);
          }
        }
        if (p.owner && fired < 1) {
          g.fillStyle(IVORY, 0.5 * (1 - fired)); g.fillCircle(p.cx, p.cy - 30, 8 + fired * 22);
        }
      });
    },
    drawHud(g, time) {
      // The map in miniature: eight squares in their owners' colours, and the Levy's clock.
      const cx = ctx.W / 2, y = ctx.top + 6;
      g.fillStyle(0x07060d, 0.85); g.fillRoundedRect(cx - 82, y, 164, 40, 8);
      g.lineStyle(1.2, OBS.edge, 0.6); g.strokeRoundedRect(cx - 82, y, 164, 40, 8);
      prov.forEach((p, i) => {
        const x = cx - 70 + (i % COLS) * 36, yy = y + 6 + Math.floor(i / COLS) * 14;
        g.fillStyle(p.owner === 'npc' ? ROUGE : p.owner === 'player' ? FELT : OBS.facet, 1); g.fillRect(x, yy, 32, 12);
        if (i === capital) { g.lineStyle(1.5, IVORY, 0.9); g.strokeRect(x, yy, 32, 12); }
      });
      const k = clamp(1 - (levyAt - time) / LEVY_MS, 0, 1);
      g.fillStyle(levyAt - time < WARN_MS ? SIDE_NPC : IVORY_DIM, 0.85); g.fillRect(cx - 70, y + 34, 140 * k, 3);
    },
  };
};

export const DECREE_PARTITION: GimmickDef = {
  id: 'bench-fate-partition',
  rules: 'Stand alone in a province to annex it. At every Levy each province fires on its owner\'s foe; the crowned capital fires three.',
  make,
};
